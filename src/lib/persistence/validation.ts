import { PersistenceErrors } from "./errors";

/**
 * Entity validation. Runs *before* persistence so constraint violations are
 * the exception, not the control flow. Declarative and reusable: each
 * repository owns a small schema describing its writable surface, which also
 * doubles as the mass-assignment allow-list.
 */

export type FieldType = "string" | "number" | "boolean" | "uuid" | "iso-date" | "json" | "array";

export interface FieldRule {
  type: FieldType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: readonly string[];
  pattern?: RegExp;
  nullable?: boolean;
  /** Column name when it differs from the domain property. */
  column?: string;
}

export type EntitySchema = Record<string, FieldRule>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function requireUuid(value: unknown, label = "identifier"): string {
  if (!isUuid(value)) throw PersistenceErrors.validation(`A valid ${label} is required.`);
  return value;
}

function checkField(name: string, rule: FieldRule, value: unknown): string | null {
  if (value === null || value === undefined) {
    if (rule.required) return `${name} is required.`;
    if (value === null && rule.nullable === false) return `${name} cannot be empty.`;
    return null;
  }

  switch (rule.type) {
    case "string": {
      if (typeof value !== "string") return `${name} must be text.`;
      if (rule.required && value.trim() === "") return `${name} is required.`;
      if (rule.minLength !== undefined && value.length < rule.minLength)
        return `${name} must be at least ${rule.minLength} characters.`;
      if (rule.maxLength !== undefined && value.length > rule.maxLength)
        return `${name} must be ${rule.maxLength} characters or fewer.`;
      if (rule.enum && !rule.enum.includes(value)) return `${name} is not a supported value.`;
      if (rule.pattern && !rule.pattern.test(value)) return `${name} has an invalid format.`;
      return null;
    }
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) return `${name} must be a number.`;
      if (rule.min !== undefined && value < rule.min) return `${name} must be at least ${rule.min}.`;
      if (rule.max !== undefined && value > rule.max) return `${name} must be at most ${rule.max}.`;
      return null;
    }
    case "boolean":
      return typeof value === "boolean" ? null : `${name} must be true or false.`;
    case "uuid":
      return isUuid(value) ? null : `${name} must be a valid identifier.`;
    case "iso-date":
      return typeof value === "string" && !Number.isNaN(Date.parse(value))
        ? null
        : `${name} must be a valid date.`;
    case "array":
      return Array.isArray(value) ? null : `${name} must be a list.`;
    case "json":
      return typeof value === "object" ? null : `${name} must be an object.`;
    default:
      return null;
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateEntity(
  schema: EntitySchema,
  input: Record<string, unknown>,
  mode: "create" | "update" = "create",
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [name, rule] of Object.entries(schema)) {
    const present = Object.prototype.hasOwnProperty.call(input, name);
    if (mode === "update" && !present) continue;
    if (mode === "create" && !present && !rule.required) continue;
    const error = checkField(name, rule, present ? input[name] : undefined);
    if (error) errors[name] = error;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function assertValid(
  entity: string,
  schema: EntitySchema,
  input: Record<string, unknown>,
  mode: "create" | "update" = "create",
): void {
  const result = validateEntity(schema, input, mode);
  if (!result.valid) {
    const first = Object.values(result.errors)[0];
    throw PersistenceErrors.validation(first ?? `The ${entity} is not valid.`, result.errors);
  }
}

/**
 * Mass-assignment guard: strips anything the schema does not declare and maps
 * domain property names onto their storage columns.
 */
export function toColumns(schema: EntitySchema, input: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [name, rule] of Object.entries(schema)) {
    if (!Object.prototype.hasOwnProperty.call(input, name)) continue;
    row[rule.column ?? snake(name)] = input[name];
  }
  return row;
}

export function snake(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

export function camel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}
