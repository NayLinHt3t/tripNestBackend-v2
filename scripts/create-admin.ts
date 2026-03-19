import "dotenv/config";
import { RoleType } from "../generated/prisma/client.js";
import { createPrismaClient } from "../src/modules/database/prisma.js";

const prisma = createPrismaClient();

async function main() {
  const username = process.argv[2];
  const emailArg = process.argv[3];

  if (!username) {
    console.error("Usage: npx tsx scripts/create-admin.ts <username> [email]");
    process.exit(1);
  }

  const email =
    emailArg ??
    (username.includes("@") ? username : `${username}@tripnest.local`);

  // Ensure roles exist
  const [userRole, adminRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleType.USER },
      update: {},
      create: { name: RoleType.USER },
    }),
    prisma.role.upsert({
      where: { name: RoleType.ADMIN },
      update: {},
      create: { name: RoleType.ADMIN },
    }),
  ]);

  // Find existing user only (do not create, do not update password)
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `User not found for email "${email}". Create/register user first so original password stays unchanged.`,
    );
    process.exit(1);
  }

  // Attach USER + ADMIN roles
  await Promise.all([
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: userRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: userRole.id,
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: adminRole.id,
      },
    }),
  ]);

  const withRoles = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      role: {
        include: { role: true },
      },
    },
  });

  const roles = withRoles?.role.map((item) => item.role.name).join(", ") ?? "";

  console.log("Admin role granted");
  console.log(`id: ${user.id}`);
  console.log(`email: ${user.email}`);
  console.log(`name: ${user.name}`);
  console.log(`roles: ${roles}`);
}

main()
  .catch((error) => {
    console.error("Failed to grant admin role:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
