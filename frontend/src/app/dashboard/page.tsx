import { FileStatus } from "@prisma/client";
import { AnimatedDashboard } from "@/components/dashboard/animated-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const ownerFilter = user.role === "ADMIN" ? {} : { userId: user.id };

  const [total, pending, malicious, suspicious, recentFiles] = await Promise.all([
    prisma.file.count({ where: ownerFilter }),
    prisma.file.count({
      where: {
        ...ownerFilter,
        status: {
          in: [FileStatus.UPLOADED, FileStatus.QUEUED, FileStatus.SCANNING],
        },
      },
    }),
    prisma.file.count({ where: { ...ownerFilter, status: FileStatus.MALICIOUS } }),
    prisma.file.count({ where: { ...ownerFilter, status: FileStatus.SUSPICIOUS } }),
    prisma.file.findMany({
      where: ownerFilter,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { scanResult: true },
    }),
  ]);

  return (
    <AppShell user={user}>
      <AnimatedDashboard
        total={total}
        pending={pending}
        malicious={malicious}
        suspicious={suspicious}
        recentFiles={recentFiles.map((file) => ({
          id: file.id,
          originalFilename: file.originalFilename,
          sha256: file.sha256,
          fileSize: file.fileSize,
          status: file.status,
          riskScore: file.scanResult?.riskScore ?? null,
        }))}
      />
    </AppShell>
  );
}
