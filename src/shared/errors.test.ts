import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "./errors.js";
import { sendError } from "./http.js";
import type { Response } from "express";

// Minimal Response stub capturing status + json calls.
const makeRes = () => {
  const captured: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, captured };
};

describe("shared errors", () => {
  it("each error type carries its HTTP status code and message", () => {
    const cases: Array<[AppError, number]> = [
      [new ValidationError("bad"), 400],
      [new UnauthorizedError("nope"), 401],
      [new ForbiddenError("stop"), 403],
      [new NotFoundError("gone"), 404],
      [new ConflictError("dupe"), 409],
    ];
    for (const [error, status] of cases) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(status);
      expect(error.name).toBe(error.constructor.name);
    }
  });

  describe("sendError", () => {
    it("maps a domain error to its status code and message", () => {
      const { res, captured } = makeRes();
      sendError(res, new NotFoundError("Booking not found"));
      expect(captured.status).toBe(404);
      expect(captured.body).toEqual({ error: "Booking not found" });
    });

    it("maps an unknown error to 500 without leaking details", () => {
      const { res, captured } = makeRes();
      sendError(res, new Error("stack trace with secrets"));
      expect(captured.status).toBe(500);
      expect(captured.body).toEqual({ error: "Internal error" });
    });
  });
});
