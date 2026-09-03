import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { UserRepository } from "./user.repository.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../shared/errors.js";
import { PrismaClient } from "../database/prisma.js";

export interface AuthPayload {
  userId: string;
  email: string;
  roles: string[];
}

interface ResetToken {
  email: string;
  expiresAt: Date;
}

// Fallback in-memory stores used when no Prisma client is injected (tests)
const tokenBlacklist = new Set<string>();
const resetTokens = new Map<string, ResetToken>();

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || "your-secret-key";

  constructor(
    private userRepository?: UserRepository,
    private prisma?: PrismaClient,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ userId: string; email: string; roles: string[] }> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userRepository.create(email, hashedPassword, name);

    return { userId: user.id, email: user.email, roles: user.roles };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{
    token: string;
    userId: string;
    email: string;
    roles: string[];
  }> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.isBanned) {
      throw new ForbiddenError("This account has been banned");
    }

    const token = this.generateToken(user.id, user.email, user.roles);
    return { token, userId: user.id, email: user.email, roles: user.roles };
  }

  async logout(token: string): Promise<void> {
    if (this.prisma) {
      await this.prisma.invalidatedToken.create({ data: { token } });
    } else {
      tokenBlacklist.add(token);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (this.prisma) {
      const result = await this.prisma.invalidatedToken.findUnique({
        where: { token },
      });
      return !!result;
    }
    return tokenBlacklist.has(token);
  }

  generateToken(userId: string, email: string, roles: string[]): string {
    return jwt.sign({ userId, email, roles }, this.jwtSecret, {
      expiresIn: "7d",
    });
  }

  async verifyToken(token: string): Promise<AuthPayload | null> {
    try {
      if (await this.isTokenBlacklisted(token)) {
        return null;
      }
      const decoded = jwt.verify(token, this.jwtSecret) as Partial<AuthPayload>;
      if (!decoded.userId || !decoded.email) {
        return null;
      }
      return {
        userId: decoded.userId,
        email: decoded.email,
        roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      };
    } catch (error) {
      return null;
    }
  }

  extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedError("Old password is incorrect");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashedNewPassword);
  }

  async forgotPassword(email: string): Promise<void> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists
      return;
    }

    // Generate a random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    if (this.prisma) {
      // Delete any existing reset token for this email before creating a new one
      await this.prisma.passwordResetToken.deleteMany({
        where: { email: user.email },
      });
      await this.prisma.passwordResetToken.create({
        data: { token: resetToken, email: user.email, expiresAt },
      });
    } else {
      resetTokens.set(resetToken, { email: user.email, expiresAt });
    }

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    let tokenEmail: string;
    let tokenExpiresAt: Date;

    if (this.prisma) {
      const tokenData = await this.prisma.passwordResetToken.findUnique({
        where: { token: resetToken },
      });

      if (!tokenData) {
        throw new ValidationError("Invalid or expired reset token");
      }

      tokenEmail = tokenData.email;
      tokenExpiresAt = tokenData.expiresAt;
    } else {
      const tokenData = resetTokens.get(resetToken);
      if (!tokenData) {
        throw new ValidationError("Invalid or expired reset token");
      }
      tokenEmail = tokenData.email;
      tokenExpiresAt = tokenData.expiresAt;
    }

    if (new Date() > tokenExpiresAt) {
      if (this.prisma) {
        await this.prisma.passwordResetToken.delete({
          where: { token: resetToken },
        });
      } else {
        resetTokens.delete(resetToken);
      }
      throw new ValidationError("Reset token has expired");
    }

    const user = await this.userRepository.findByEmail(tokenEmail);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(user.id, hashedPassword);

    if (this.prisma) {
      await this.prisma.passwordResetToken.delete({
        where: { token: resetToken },
      });
    } else {
      resetTokens.delete(resetToken);
    }
  }
}
