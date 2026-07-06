import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, FileText, Hash } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ReportSections } from "@/components/scans/report-sections";
import { RiskScoreCard } from "@/components/scans/risk-score-card";
import { ScanPoller } from "@/components/scans/scan-poller";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import { VerdictBadge } from "@/components/scans/verdict-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { verdictCopy } from "@/lib/scans/status";
import { ServiceError } from "@/lib/services/errors";
import { getScanDetail } from "@/lib/services/scans/scan-service";
import { formatBytes, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const file = await getScanDetail(user, id).catch((error) => {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  });
  const verdict = file.scanResult?.verdict ?? null;

  return (
    <AppShell user={user}>
      <ScanPoller status={file.status} />
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/scans">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to scans
          </Link>
        </Button>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="break-all text-2xl font-semibold text-(--app-fg)">{file.originalFilename}</h1>
            <p className="mt-1 text-sm text-(--app-muted)">{verdictCopy(verdict)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ScanStatusBadge status={file.status} />
            <VerdictBadge verdict={verdict} />
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RiskScoreCard score={file.scanResult?.riskScore} />
        <Fact icon={<FileText className="h-4 w-4" />} label="MIME type" value={file.mimeType} />
        <Fact icon={<Clock className="h-4 w-4" />} label="Uploaded" value={file.createdAt.toLocaleString()} />
        <Fact icon={<Hash className="h-4 w-4" />} label="Size" value={formatBytes(file.fileSize)} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>File metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Metadata label="SHA-256" value={file.sha256} mono />
          <Metadata label="SHA-1" value={file.sha1 ?? "Pending"} mono />
          <Metadata label="MD5" value={file.md5 ?? "Pending"} mono />
          <Metadata label="Stored filename" value={file.storedFilename} mono />
          <Metadata label="Owner" value={`${file.user.name} (${file.user.email})`} />
          <Metadata label="Latest job" value={file.scanJobs[0]?.status ? titleCase(file.scanJobs[0].status) : "No job"} />
        </CardContent>
      </Card>

      <ReportSections result={file.scanResult} indicators={file.indicators} />
    </AppShell>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex h-full items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--app-surface-muted)] text-(--app-muted)">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-(--app-muted)">{label}</p>
          <p className="truncate text-sm font-medium text-(--app-fg)">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metadata({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-(--app-border) bg-(--app-surface-muted) p-3">
      <p className="text-xs font-medium uppercase text-(--app-muted)">{label}</p>
      <p className={`mt-1 break-all text-(--app-fg) ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}
