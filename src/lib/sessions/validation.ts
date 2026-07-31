import type { SessionPriority, SessionStatus } from "./types";
import { SESSION_PRIORITIES, SESSION_STATUSES, PARTICIPANT_ROLES } from "./types";
import { SessionErrors } from "./status";

/** Input validation for the session API surface. Fails fast with 400s. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value.trim())) {
    throw SessionErrors.validation(`${field} must be a valid identifier.`);
  }
  return value.trim();
}

export function optionalUuid(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  return requireUuid(value, field);
}

export function requireText(value: unknown, field: string, max = 200): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw SessionErrors.validation(`${field} is required.`);
  if (text.length > max) throw SessionErrors.validation(`${field} must be ${max} characters or fewer.`);
  return text;
}

export function optionalText(value: unknown, field: string, max = 2000): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return "";
  if (typeof value !== "string") throw SessionErrors.validation(`${field} must be text.`);
  const text = value.trim();
  if (text.length > max) throw SessionErrors.validation(`${field} must be ${max} characters or fewer.`);
  return text;
}

export function optionalPriority(value: unknown): SessionPriority | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (!SESSION_PRIORITIES.includes(value as SessionPriority)) {
    throw SessionErrors.validation("Priority must be low, medium, high or critical.");
  }
  return value as SessionPriority;
}

export function optionalIsoDate(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw SessionErrors.validation(`${field} must be a valid date.`);
  }
  return new Date(value).toISOString();
}

export function optionalTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw SessionErrors.validation("Tags must be a list.");
  const tags = [...new Set(value.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
  if (tags.length > 20) throw SessionErrors.validation("A session may carry at most 20 tags.");
  if (tags.some((tag) => tag.length > 40)) {
    throw SessionErrors.validation("Each tag must be 40 characters or fewer.");
  }
  return tags;
}

export function parseStatuses(value: unknown): SessionStatus[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const statuses = raw
    .map((entry) => String(entry).trim())
    .filter((entry) => SESSION_STATUSES.includes(entry as SessionStatus)) as SessionStatus[];
  return statuses.length ? statuses : undefined;
}

export function parseUserIds(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw SessionErrors.validation(`${field} must be a list of users.`);
  return [...new Set(value.map((id) => requireUuid(id, field)))];
}

export function requireParticipantRole(value: unknown) {
  if (!PARTICIPANT_ROLES.includes(value as never)) {
    throw SessionErrors.validation("Role must be owner, reviewer, contributor or observer.");
  }
  return value as (typeof PARTICIPANT_ROLES)[number];
}
