import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, FileText, Hash, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ReportSections } from "@/components/scans/report-sections";
import { ScanPoller } from "@/components/scans/scan-poller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { statusTone, verdictCopy } from "@/lib/scans/status";
import { formatBytes, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const file = await prisma.file.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
    include: {
      user: { select: { name: true, email: true } },
      scanJobs: { orderBy: { createdAt: "desc" } },
      scanResult: true,
      indicators: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!file) {
    notFound();
  }

  const verdict = file.scanResult?.verdict ?? null;

  return (
    <AppShell user={user}>
      <ScanPoller status={file.status} />
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/results">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to results
          </Link>
        </Button>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="break-all text-2xl font-semibold text-zinc-950">{file.originalFilename}</h1>
            <p className="mt-1 text-sm text-zinc-500">{verdictCopy(verdict)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(file.status)}>{titleCase(file.status)}</Badge>
            {verdict ? <Badge tone={statusTone(verdict)}>{titleCase(verdict)}</Badge> : null}
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={<ShieldAlert className="h-4 w-4" />} label="Risk score" value={String(file.scanResult?.riskScore ?? "-")} />
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
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="truncate text-sm font-medium text-zinc-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metadata({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
      <p className={`mt-1 break-all text-zinc-800 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}
