/**
 * Typed domain errors shared across all feature modules.
 *
 * Services throw these instead of plain `Error`s. Each subclass carries the
 * HTTP status code that describes it, so the controller layer can translate a
 * thrown error into a response by type (via `sendError`) instead of matching
 * on the error message text.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    // Use the concrete subclass name (ValidationError, NotFoundError, ...)
    // so logs and `error.name` identify the exact type.
    this.name = new.target.name;
  }
}

/** 400 — invalid input or a violated business rule. */
export class ValidationError extends AppError {
  readonly statusCode = 400;
}

/** 401 — the caller is not authenticated (bad credentials, invalid token). */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
}

/** 403 — authenticated but not allowed to perform this action. */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

/** 409 — the request conflicts with the current state (duplicate, etc.). */
export class ConflictError extends AppError {
  readonly statusCode = 409;
}
