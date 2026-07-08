import { FileStatus } from "@prisma/client";
import { AnimatedDashboard } from "@/components/dashboard/animated-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type PlatformPrisma = {
  artefact?: { count(args: unknown): Promise<number> };
  analysisRequest?: { count(args: unknown): Promise<number> };
  indicator?: { findMany(args: unknown): Promise<Array<{ type: string; value: string }>> };
};

export default async function DashboardPage() {
  const user = await requireUser();
  const ownerFilter = user.role === "ADMIN" ? {} : { userId: user.id };
  const indicatorOwnerFilter =
    user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { file: { userId: user.id } },
            { artefact: { userId: user.id } },
            { analysisRequest: { submittedById: user.id } },
          ],
        };
  const platformPrisma = prisma as unknown as PlatformPrisma;

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

  const [totalArtefacts, analysisRequests, recentIndicators] =
    platformPrisma.artefact && platformPrisma.analysisRequest && platformPrisma.indicator
      ? await Promise.all([
          platformPrisma.artefact.count({ where: ownerFilter }),
          platformPrisma.analysisRequest.count({
            where: user.role === "ADMIN" ? {} : { submittedById: user.id },
          }),
          platformPrisma.indicator.findMany({
            where: indicatorOwnerFilter,
            orderBy: { createdAt: "desc" },
            take: 200,
            select: { type: true, value: true },
          }),
        ])
      : [total, 0, []];
  const topIndicators = topIndicatorCounts(recentIndicators);

  return (
    <AppShell user={user}>
      <AnimatedDashboard
        total={total}
        pending={pending}
        malicious={malicious}
        suspicious={suspicious}
        totalArtefacts={totalArtefacts}
        analysisRequests={analysisRequests}
        topIndicators={topIndicators}
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

function topIndicatorCounts(indicators: Array<{ type: string; value: string }>) {
  const counts = new Map<string, { type: string; value: string; count: number }>();

  for (const indicator of indicators) {
    const key = `${indicator.type}:${indicator.value}`;
    const existing = counts.get(key);
    counts.set(key, {
      type: indicator.type,
      value: indicator.value,
      count: (existing?.count ?? 0) + 1,
    });
  }

  return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, 6);
}
