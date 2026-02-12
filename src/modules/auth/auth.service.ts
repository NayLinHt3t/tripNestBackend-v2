import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { UserRepository } from "./user.repository.js";
import { sendPasswordResetEmail } from "../utils/email.js";

export interface AuthPayload {
  userId: string;
  email: string;
}

interface ResetToken {
  email: string;
  expiresAt: Date;
}

// Simple in-memory blacklist for invalidated tokens
const tokenBlacklist = new Set<string>();

// In-memory storage for password reset tokens (use database in production)
const resetTokens = new Map<string, ResetToken>();

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || "your-secret-key";

  constructor(private userRepository?: UserRepository) {}

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ userId: string; email: string }> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userRepository.create(email, hashedPassword, name);

    return { userId: user.id, email: user.email };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; userId: string; email: string }> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const token = this.generateToken(user.id, user.email);
    return { token, userId: user.id, email: user.email };
  }

  logout(token: string): void {
    tokenBlacklist.add(token);
  }

  isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, this.jwtSecret, {
      expiresIn: "7d",
    });
  }

  verifyToken(token: string): AuthPayload | null {
    try {
      if (this.isTokenBlacklisted(token)) {
        return null;
      }
      const decoded = jwt.verify(token, this.jwtSecret) as AuthPayload;
      return decoded;
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
      throw new Error("User not found");
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new Error("Old password is incorrect");
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
      // Don't reveal if email exists or not for security
      throw new Error("If this email exists, a reset link has been sent");
    }

    // Generate a random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store the token
    resetTokens.set(resetToken, {
      email: user.email,
      expiresAt,
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    if (!this.userRepository) {
      throw new Error("User repository not configured");
    }

    const tokenData = resetTokens.get(resetToken);

    if (!tokenData) {
      throw new Error("Invalid or expired reset token");
    }

    if (new Date() > tokenData.expiresAt) {
      resetTokens.delete(resetToken);
      throw new Error("Reset token has expired");
    }

    const user = await this.userRepository.findByEmail(tokenData.email);
    if (!user) {
      throw new Error("User not found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(user.id, hashedPassword);

    // Remove the used token
    resetTokens.delete(resetToken);
  }
}
