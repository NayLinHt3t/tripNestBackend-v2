import cron from "node-cron";
import { PrismaClient } from "../database/prisma.js";

export function startTokenCleanupJob(prisma: PrismaClient): void {
  // Run daily at 2 AM — delete InvalidatedTokens whose JWT has expired.
  // JWTs expire after 7 days, so tokens older than 7 days are safe to remove.
  cron.schedule("0 2 * * *", async () => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count } = await prisma.invalidatedToken.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      console.log(`[token-cleanup] Removed ${count} expired invalidated tokens`);
    }
  });
}
