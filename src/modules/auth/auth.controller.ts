import { Router, Request, Response, RequestHandler } from "express";
import { AuthService } from "./auth.service.js";
import { AuthenticatedRequest } from "./auth.middleware.js";

export function createAuthRouter(
  authService: AuthService,
  authMiddleware?: RequestHandler,
): Router {
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
        expiresIn: "7d",
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
        expiresIn: "7d",
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

  // Change password - requires authentication
  const changePasswordHandler = async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const userId = req.user?.userId;
      const { oldPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          error: "Missing required fields: oldPassword, newPassword",
        });
      }

      await authService.changePassword(userId, oldPassword, newPassword);

      res.status(200).json({
        message: "Password changed successfully",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("incorrect")) {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  };

  if (authMiddleware) {
    router.post("/change-password", authMiddleware, changePasswordHandler);
  } else {
    router.post("/change-password", changePasswordHandler);
  }

  // Forgot password - generates a reset token and sends email
  router.post("/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: "Email is required",
        });
      }

      await authService.forgotPassword(email);

      res.status(200).json({
        message: "If this email exists, a reset link has been sent",
      });
    } catch (error) {
      // Always return success to prevent email enumeration
      res.status(200).json({
        message: "If this email exists, a reset link has been sent",
      });
    }
  });

  // Reset password - uses reset token to set new password
  router.post("/reset-password", async (req: Request, res: Response) => {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        return res.status(400).json({
          error: "Missing required fields: resetToken, newPassword",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters",
        });
      }

      await authService.resetPassword(resetToken, newPassword);

      res.status(200).json({
        message: "Password reset successfully",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Invalid") || error.message.includes("expired"))
      ) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal error",
      });
    }
  });

  return router;
}
