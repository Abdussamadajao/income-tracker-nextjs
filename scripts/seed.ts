import { seedSystemCategories } from "@/server/seed-categories";
import { logger } from "@/server/log";
import { prisma } from "@/server/prisma";

async function main() {
  logger.info("Starting seed...");

  await seedSystemCategories();

  logger.info("Seed complete");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
