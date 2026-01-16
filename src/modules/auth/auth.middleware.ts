import { Request, Response, NextFunction } from "express";
import { AuthService, AuthPayload } from "./auth.service.js";

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function createAuthMiddleware(authService: AuthService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = authService.extractToken(req.headers.authorization);

      if (!token) {
        return res.status(401).json({
          error: "Missing or invalid authorization header",
        });
      }

      const payload = authService.verifyToken(token);

      if (!payload) {
        return res.status(401).json({
          error: "Invalid or expired token",
        });
      }

      req.user = payload;
      next();
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  };
}
