import { Router, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest } from "./auth.middleware";

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  // Register endpoint - creates a new user
  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Missing required fields: email, password",
        });
      }

      const user = await authService.register(email, password, name);
      const token = authService.generateToken(user.userId, user.email);

      res.status(201).json({
        token,
        userId: user.userId,
        email: user.email,
        expiresIn: "24h",
        message: "Registration successful",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Login endpoint - returns a JWT token
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Missing required fields: email, password",
        });
      }

      const result = await authService.login(email, password);

      res.status(200).json({
        token: result.token,
        userId: result.userId,
        email: result.email,
        expiresIn: "24h",
        message: "Login successful",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid")) {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  // Logout endpoint - invalidates the token
  router.post("/logout", (req: Request, res: Response) => {
    try {
      const token = authService.extractToken(req.headers.authorization);

      if (!token) {
        return res.status(400).json({
          error: "No token provided",
        });
      }

      authService.logout(token);

      res.status(200).json({
        message: "Logout successful",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  return router;
}
