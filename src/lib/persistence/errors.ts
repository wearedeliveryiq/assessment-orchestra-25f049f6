/**
 * Persistence error taxonomy.
 *
 * Every storage failure is translated into a stable, user-safe error with an
 * HTTP status, while the technical diagnostic is logged server-side only.
 */

export type PersistenceErrorCode =
  | "not_found"
  | "duplicate"
  | "constraint_violation"
  | "missing_relationship"
  | "concurrency_conflict"
  | "validation_failed"
  | "tenant_violation"
  | "transaction_failed"
  | "unavailable"
  | "internal_error";

const STATUS: Record<PersistenceErrorCode, number> = {
  not_found: 404,
  duplicate: 409,
  constraint_violation: 422,
  missing_relationship: 422,
  concurrency_conflict: 409,
  validation_failed: 422,
  tenant_violation: 403,
  transaction_failed: 500,
  unavailable: 503,
  internal_error: 500,
};

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly status: number;
  readonly detail?: unknown;
  readonly fields?: Record<string, string>;

  constructor(
    code: PersistenceErrorCode,
    message: string,
    options: { detail?: unknown; fields?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
    this.status = STATUS[code];
    this.detail = options.detail;
    this.fields = options.fields;
  }
}

export const PersistenceErrors = {
  notFound: (entity: string) =>
    new PersistenceError("not_found", `That ${entity} could not be found.`),
  duplicate: (entity: string, detail?: unknown) =>
    new PersistenceError("duplicate", `That ${entity} already exists.`, { detail }),
  concurrency: (entity: string, expected: number, actual: number) =>
    new PersistenceError(
      "concurrency_conflict",
      `This ${entity} was changed by someone else. Reload and try again.`,
      { detail: { expected, actual } },
    ),
  validation: (message: string, fields?: Record<string, string>) =>
    new PersistenceError("validation_failed", message, { fields }),
  tenant: () =>
    new PersistenceError("tenant_violation", "You do not have access to this data."),
  transaction: (detail?: unknown) =>
    new PersistenceError("transaction_failed", "The operation could not be completed.", { detail }),
  internal: (detail?: unknown) =>
    new PersistenceError("internal_error", "Something went wrong. Please try again.", { detail }),
};

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Maps PostgreSQL / PostgREST failures onto the taxonomy above.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function translateStorageError(entity: string, error: unknown): PersistenceError {
  if (error instanceof PersistenceError) return error;

  const pg = (error ?? {}) as PostgrestLikeError;
  const code = pg.code ?? "";

  switch (code) {
    case "23505":
      return new PersistenceError("duplicate", `That ${entity} already exists.`, { detail: pg });
    case "23503":
      return new PersistenceError(
        "missing_relationship",
        `A related record required by this ${entity} does not exist.`,
        { detail: pg },
      );
    case "23502":
    case "23514":
    case "22001":
      return new PersistenceError(
        "constraint_violation",
        `Some values for this ${entity} are not valid.`,
        { detail: pg },
      );
    case "42501":
    case "PGRST301":
      return new PersistenceError("tenant_violation", "You do not have access to this data.", {
        detail: pg,
      });
    case "PGRST116":
      return new PersistenceError("not_found", `That ${entity} could not be found.`);
    case "08000":
    case "08003":
    case "08006":
    case "57P01":
      return new PersistenceError("unavailable", "The service is busy. Please try again.", {
        detail: pg,
      });
    default:
      return new PersistenceError("internal_error", "Something went wrong. Please try again.", {
        detail: pg,
      });
  }
}

/** Single place where technical diagnostics are logged. */
export function failStorage(entity: string, operation: string, error: unknown): never {
  const translated = translateStorageError(entity, error);
  if (translated.status >= 500) {
    console.error(`[persistence] ${entity}.${operation}`, translated.detail ?? error);
  }
  throw translated;
}
