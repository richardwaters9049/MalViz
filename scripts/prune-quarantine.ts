import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/db/client";

const retentionDays = Number(process.env.MALVIZ_DELETED_FILE_RETENTION_DAYS ?? "7");
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
const dryRun = process.env.DRY_RUN === "1";

async function main() {
  const files = await prisma.file.findMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoff,
      },
      storagePath: {
        not: "",
      },
    },
    select: {
      id: true,
      storagePath: true,
    },
    take: 500,
  });

  for (const file of files) {
    if (!dryRun) {
      // Retention only touches soft-deleted records; active samples remain quarantined.
      await unlink(file.storagePath).catch(() => undefined);
      await prisma.file.update({
        where: { id: file.id },
        data: { storagePath: "" },
      });
    }
  }

  console.log(`${dryRun ? "Would prune" : "Pruned"} ${files.length} quarantined file(s).`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
