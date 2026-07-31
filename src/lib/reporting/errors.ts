/** Typed failures the reporting pipeline can raise. */
export type ReportErrorCode =
  | "template_not_found"
  | "template_invalid"
  | "format_unsupported"
  | "format_not_implemented"
  | "dataset_missing"
  | "render_failed"
  | "storage_failed"
  | "not_found"
  | "forbidden"
  | "expired"
  | "invalid_request";

export class ReportingError extends Error {
  readonly code: ReportErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ReportErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ReportingError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isReportingError(value: unknown): value is ReportingError {
  return value instanceof ReportingError;
}

export function toReportingError(error: unknown): ReportingError {
  if (isReportingError(error)) return error;
  const message = error instanceof Error ? error.message : "Unexpected reporting failure.";
  return new ReportingError("render_failed", message, 500);
}
