import { PrismaClient } from "../database/prisma.js";
import { User, UserRepository } from "./user.repository.js";

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  private mapUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      createdAt: user.createdAt,
      roles: Array.isArray(user.role)
        ? user.role.map((r: any) => r.role?.name).filter(Boolean)
        : [],
    };
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: { role: true },
        },
      },
    });
    return user ? this.mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: { role: true },
        },
      },
    });
    return user ? this.mapUser(user) : null;
  }

  async create(email: string, password: string, name: string): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        name: name,
        role: {
          create: [
            {
              role: {
                connectOrCreate: {
                  where: { name: "USER" },
                  create: { name: "USER" },
                },
              },
            },
          ],
        },
      },
      include: {
        role: {
          include: { role: true },
        },
      },
    });
    return this.mapUser(user);
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
