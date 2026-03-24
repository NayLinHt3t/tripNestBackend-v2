import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./auth.service.js";
import type { UserRepository, User } from "./user.repository.js";

vi.mock("../utils/email.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides?: Partial<User>): User => ({
  id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  password: "hashed",
  roles: ["USER"],
  createdAt: new Date(),
  ...overrides,
});

const makeRepo = (overrides?: Partial<UserRepository>): UserRepository => ({
  findById: vi.fn().mockResolvedValue(null),
  findByEmail: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue(makeUser()),
  updatePassword: vi.fn().mockResolvedValue(true),
  delete: vi.fn().mockResolvedValue(true),
  ...overrides,
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  let repo: UserRepository;
  let service: AuthService;

  beforeEach(() => {
    repo = makeRepo();
    service = new AuthService(repo);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe("register", () => {
    it("creates a user and returns credentials", async () => {
      const result = await service.register("alice@example.com", "pass123", "Alice");

      expect(result.userId).toBe("user-1");
      expect(result.email).toBe("alice@example.com");
      expect(result.roles).toEqual(["USER"]);
    });

    it("stores a bcrypt hash, not the plain-text password", async () => {
      await service.register("alice@example.com", "plain", "Alice");

      const [, stored] = vi.mocked(repo.create).mock.calls[0];
      expect(stored).not.toBe("plain");
      expect(stored).toMatch(/^\$2b\$/);
    });

    it("throws when email is already taken", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(makeUser());

      await expect(
        service.register("alice@example.com", "pass", "Alice"),
      ).rejects.toThrow("User with this email already exists");
    });

    it("throws when repository is not configured", async () => {
      const bare = new AuthService();

      await expect(bare.register("a@b.com", "pass", "Name")).rejects.toThrow(
        "User repository not configured",
      );
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("returns token and user info on valid credentials", async () => {
      const bcrypt = await import("bcrypt");
      const hash = await bcrypt.hash("correct", 10);
      vi.mocked(repo.findByEmail).mockResolvedValue(makeUser({ password: hash }));

      const result = await service.login("alice@example.com", "correct");

      expect(result.token).toBeDefined();
      expect(result.userId).toBe("user-1");
      expect(result.email).toBe("alice@example.com");
    });

    it("throws for an unknown email", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(null);

      await expect(service.login("ghost@example.com", "pass")).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("throws for a wrong password", async () => {
      const bcrypt = await import("bcrypt");
      const hash = await bcrypt.hash("correct", 10);
      vi.mocked(repo.findByEmail).mockResolvedValue(makeUser({ password: hash }));

      await expect(service.login("alice@example.com", "wrong")).rejects.toThrow(
        "Invalid email or password",
      );
    });
  });

  // ── token management ────────────────────────────────────────────────────────

  describe("generateToken / verifyToken", () => {
    it("generates a verifiable JWT with correct payload", () => {
      const token = service.generateToken("user-1", "a@b.com", ["USER"]);
      const payload = service.verifyToken(token);

      expect(payload?.userId).toBe("user-1");
      expect(payload?.email).toBe("a@b.com");
      expect(payload?.roles).toEqual(["USER"]);
    });

    it("returns null for a garbage token", () => {
      expect(service.verifyToken("not.a.real.token")).toBeNull();
    });

    it("returns null for a blacklisted token", () => {
      const token = service.generateToken("user-1", "a@b.com", []);
      service.logout(token);

      expect(service.verifyToken(token)).toBeNull();
    });
  });

  describe("logout / isTokenBlacklisted", () => {
    it("token is not blacklisted before logout", () => {
      // Use a unique id so this token cannot collide with one blacklisted in another test
      const token = service.generateToken("fresh-user", "fresh@example.com", []);

      expect(service.isTokenBlacklisted(token)).toBe(false);
    });

    it("token is blacklisted after logout", () => {
      const token = service.generateToken("logout-user", "logout@example.com", []);
      service.logout(token);

      expect(service.isTokenBlacklisted(token)).toBe(true);
    });
  });

  // ── extractToken ────────────────────────────────────────────────────────────

  describe("extractToken", () => {
    it("returns the token from a valid Bearer header", () => {
      expect(service.extractToken("Bearer abc123")).toBe("abc123");
    });

    it("returns null for an undefined header", () => {
      expect(service.extractToken(undefined)).toBeNull();
    });

    it("returns null when the scheme is not Bearer", () => {
      expect(service.extractToken("Basic credentials")).toBeNull();
    });

    it("returns null when there is no space between scheme and token", () => {
      expect(service.extractToken("BearerNoSpace")).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(service.extractToken("")).toBeNull();
    });
  });

  // ── changePassword ──────────────────────────────────────────────────────────

  describe("changePassword", () => {
    it("updates password when old password is correct", async () => {
      const bcrypt = await import("bcrypt");
      const hash = await bcrypt.hash("oldpass", 10);
      vi.mocked(repo.findById).mockResolvedValue(makeUser({ password: hash }));

      await expect(
        service.changePassword("user-1", "oldpass", "newpass"),
      ).resolves.toBeUndefined();

      expect(repo.updatePassword).toHaveBeenCalledWith("user-1", expect.any(String));
    });

    it("throws when the old password is wrong", async () => {
      const bcrypt = await import("bcrypt");
      const hash = await bcrypt.hash("correct", 10);
      vi.mocked(repo.findById).mockResolvedValue(makeUser({ password: hash }));

      await expect(
        service.changePassword("user-1", "wrong", "newpass"),
      ).rejects.toThrow("Old password is incorrect");
    });

    it("throws when user is not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(
        service.changePassword("ghost", "any", "new"),
      ).rejects.toThrow("User not found");
    });
  });

  // ── forgotPassword / resetPassword ──────────────────────────────────────────

  describe("forgotPassword", () => {
    it("sends a reset email when the user exists", async () => {
      const { sendPasswordResetEmail } = await import("../utils/email.js");
      vi.mocked(repo.findByEmail).mockResolvedValue(makeUser());

      await service.forgotPassword("alice@example.com");

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        "alice@example.com",
        expect.any(String),
      );
    });

    it("throws (without revealing existence) when user is not found", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(null);

      await expect(service.forgotPassword("ghost@example.com")).rejects.toThrow(
        "If this email exists, a reset link has been sent",
      );
    });
  });

  describe("resetPassword", () => {
    it("throws for an invalid or unknown token", async () => {
      await expect(
        service.resetPassword("bad-token-xyz", "newpass"),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("resets password successfully with a valid token", async () => {
      // Capture the generated token from the email mock
      const { sendPasswordResetEmail } = await import("../utils/email.js");
      let capturedToken = "";
      vi.mocked(sendPasswordResetEmail).mockImplementation(
        async (_email: string, token: string) => {
          capturedToken = token;
        },
      );

      vi.mocked(repo.findByEmail).mockResolvedValue(makeUser());
      vi.mocked(repo.findById).mockResolvedValue(makeUser());

      await service.forgotPassword("alice@example.com");
      await service.resetPassword(capturedToken, "brandnewpass");

      expect(repo.updatePassword).toHaveBeenCalledWith("user-1", expect.any(String));
    });

    it("throws after the token has been used once (single-use)", async () => {
      const { sendPasswordResetEmail } = await import("../utils/email.js");
      let capturedToken = "";
      vi.mocked(sendPasswordResetEmail).mockImplementation(
        async (_email: string, token: string) => {
          capturedToken = token;
        },
      );

      vi.mocked(repo.findByEmail).mockResolvedValue(makeUser());
      vi.mocked(repo.findById).mockResolvedValue(makeUser());

      await service.forgotPassword("alice@example.com");
      await service.resetPassword(capturedToken, "first");

      await expect(service.resetPassword(capturedToken, "second")).rejects.toThrow(
        "Invalid or expired reset token",
      );
    });
  });
});
