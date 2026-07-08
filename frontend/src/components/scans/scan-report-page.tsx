import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, FileText, Hash } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DownloadReportButton } from "@/components/scans/download-report-button";
import { ReportSections } from "@/components/scans/report-sections";
import { RiskScoreCard } from "@/components/scans/risk-score-card";
import { ScanNowButton } from "@/components/scans/scan-now-button";
import { ScanPoller } from "@/components/scans/scan-poller";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import { VerdictBadge } from "@/components/scans/verdict-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionUser } from "@/lib/auth/session";
import { verdictCopy } from "@/lib/scans/status";
import type { getScanDetail } from "@/lib/services/scans/scan-service";
import { formatBytes, titleCase } from "@/lib/utils";

type ScanDetail = Awaited<ReturnType<typeof getScanDetail>>;

export function ScanReportPage({ user, file }: { user: SessionUser; file: ScanDetail }) {
  const verdict = file.scanResult?.verdict ?? null;
  const hasReport = Boolean(file.scanResult);

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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-600">Scan report</p>
            <h1 className="mt-1 text-2xl font-semibold text-(--app-fg)">MalViz analysis report</h1>
            <p className="mt-2 break-all text-sm text-(--app-muted)">
              File: <span className="font-medium text-(--app-fg)">{file.originalFilename}</span>
            </p>
            <p className="mt-1 text-sm text-(--app-muted)">{verdictCopy(verdict)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasReport ? <DownloadReportButton fileId={file.id} /> : null}
            {verdict ? <VerdictBadge verdict={verdict} /> : <ScanStatusBadge status={file.status} />}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <ScanNowButton fileId={file.id} status={file.status} />
      </div>

      {hasReport ? (
        <div className="mb-4 overflow-hidden rounded-lg border border-cyan-400/35 bg-[radial-gradient(circle_at_12%_20%,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,var(--app-surface),var(--app-surface-muted))] p-4 shadow-[0_18px_50px_rgba(8,145,178,0.12)] scan-complete-reveal">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <span className="absolute inset-0 rounded-full border border-emerald-400/40 scan-complete-ring" />
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-(--app-fg)">Report generated</p>
              <p className="text-sm text-(--app-muted)">The analysis is complete and the result is ready to review.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 scan-result-grid">
        <RiskScoreCard score={file.scanResult?.riskScore} completed={hasReport} />
        <Fact icon={<FileText className="h-4 w-4" />} label="MIME type" value={file.mimeType} />
        <Fact icon={<Clock className="h-4 w-4" />} label="Uploaded" value={file.createdAt.toLocaleString()} />
        <Fact icon={<Hash className="h-4 w-4" />} label="Size" value={formatBytes(file.fileSize)} />
      </div>

      <Card className="mb-4 scan-result-card">
        <CardHeader>
          <CardTitle>File metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Metadata label="SHA-256" value={file.sha256} mono />
          <Metadata label="SHA-1" value={file.sha1 ?? "Pending"} mono />
          <Metadata label="MD5" value={file.md5 ?? "Pending"} mono />
          <Metadata label="Stored filename" value={file.storedFilename} mono />
          <Metadata label="Owner" value={`${file.user.name} (${file.user.email})`} />
          <Metadata label="Latest job" value={file.scanJobs[0]?.status ? titleCase(file.scanJobs[0].status) : "Not started"} />
        </CardContent>
      </Card>

      <div className="scan-result-card">
        <ReportSections result={file.scanResult} indicators={file.indicators} />
      </div>
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
