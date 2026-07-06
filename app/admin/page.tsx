import { FileWarning, ShieldAlert, XCircle } from "lucide-react";
import { FileStatus } from "@prisma/client";
import { AdminReviewPanel } from "@/components/admin/admin-review-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdmin();
  const [suspicious, malicious, failed, reviewFiles] = await Promise.all([
    prisma.file.count({ where: { status: FileStatus.SUSPICIOUS } }),
    prisma.file.count({ where: { status: FileStatus.MALICIOUS } }),
    prisma.file.count({ where: { status: FileStatus.FAILED } }),
    prisma.file.findMany({
      where: {
        status: { in: [FileStatus.SUSPICIOUS, FileStatus.MALICIOUS, FileStatus.FAILED, FileStatus.UNKNOWN] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, email: true } },
        scanResult: true,
        feedback: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { user: { select: { name: true } } },
        },
      },
    }),
  ]);

  return (
    <AppShell user={user}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-(--app-fg)">Admin review</h1>
        <p className="mt-1 text-sm text-(--app-muted)">
          Review suspicious, malicious, unknown, and failed scans. Verdict override can be added after the MVP pipeline is stable.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric title="Suspicious" value={suspicious} icon={<FileWarning className="h-5 w-5" />} />
        <AdminMetric title="Malicious" value={malicious} icon={<ShieldAlert className="h-5 w-5" />} />
        <AdminMetric title="Failed" value={failed} icon={<XCircle className="h-5 w-5" />} />
      </div>

      <AdminReviewPanel files={reviewFiles} />
    </AppShell>
  );
}

function AdminMetric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          {/* Metric cards inherit the page surface, so use theme tokens instead of fixed white text. */}
          <p className="text-md text-(--app-muted)">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-(--app-fg)">{value}</p>
        </div>
        <div className="text-(--app-muted)">{icon}</div>
      </CardContent>
    </Card>
  );
}
