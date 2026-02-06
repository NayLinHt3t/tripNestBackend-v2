import { PrismaClient } from "../database/prisma.js";
import { User, UserRepository } from "./user.repository.js";

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(email: string, password: string, name: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        password,
        name: name,
      },
    });
  }
  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id },
      data: { password: newPassword },
    });
    return result.count > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.user.deleteMany({
      where: { id },
    });
    return result.count > 0;
  }
}
