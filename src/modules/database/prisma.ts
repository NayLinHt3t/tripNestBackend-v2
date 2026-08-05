import { PrismaClient } from "../../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { parse as parsePgConnectionString } from "pg-connection-string";

let prismaInstance: PrismaClient | null = null;

export function createPrismaClient(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // pg's ConnectionParameters re-parses `connectionString` and lets that
  // overwrite any `ssl` option passed alongside it, so we parse here and
  // pass discrete fields instead. Supabase's pooler chains to a private
  // root CA that isn't in the system trust store, so sslmode=require (which
  // only enables TLS, not verification skipping) fails with
  // "self-signed certificate in certificate chain" unless we relax it.
  const parsed = parsePgConnectionString(connectionString);
  const ssl: pg.PoolConfig["ssl"] = connectionString.includes(
    "sslmode=require",
  )
    ? { rejectUnauthorized: false }
    : (parsed.ssl as pg.PoolConfig["ssl"]);
  const pool = new pg.Pool({
    ...parsed,
    host: parsed.host ?? undefined,
    database: parsed.database ?? undefined,
    port: parsed.port ? Number(parsed.port) : undefined,
    ssl,
  });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });

  return prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

export { PrismaClient };
