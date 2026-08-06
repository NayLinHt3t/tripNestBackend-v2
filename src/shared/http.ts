import { Request, Response } from "express";
import { AppError, UnauthorizedError } from "./errors.js";

/**
 * Translate any thrown value into an HTTP error response.
 *
 * Known domain errors (`AppError` subclasses) map to their own status code and
 * message. Anything else is an unexpected failure: respond 500 without leaking
 * internal details or a stack trace (see CODING_STANDARDS §8).
 */
export function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "Internal error" });
}

/**
 * Wrap an async route handler so any thrown error is routed through
 * `sendError`. Removes the repeated per-handler try/catch and message matching.
 *
 * The factory-closure controller style is preserved — this only wraps the
 * async function passed to `router.get/post/...`.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response) => Promise<unknown>,
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req as Req, res);
    } catch (error) {
      sendError(res, error);
    }
  };
}

/**
 * Read the authenticated user's id, throwing `UnauthorizedError` when absent.
 * Replaces the repeated `if (!userId) return res.status(401)...` blocks.
 */
export function getUserId(req: Request): string {
  const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
  if (!userId) {
    throw new UnauthorizedError("Unauthorized");
  }
  return userId;
}
