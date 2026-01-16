import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserRepository } from "./user.repository";

export interface AuthPayload {
  userId: string;
  email: string;
}

// Simple in-memory blacklist for invalidated tokens
const tokenBlacklist = new Set<string>();

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || "your-secret-key";

  constructor(private userRepository?: UserRepository) {}

  async register(
    email: string,
    password: string,
    name: string
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
    password: string
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
      expiresIn: "24h",
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
}
