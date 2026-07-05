import Link from "next/link";
import { FileWarning, MessageSquare, ShieldAlert, XCircle } from "lucide-react";
import { FileStatus } from "@prisma/client";
import { FeedbackForm } from "@/components/admin/feedback-form";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { statusTone } from "@/lib/scans/status";
import { titleCase } from "@/lib/utils";

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
        <h1 className="text-2xl font-semibold text-zinc-950">Admin review</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review suspicious, malicious, unknown, and failed scans. Verdict override can be added after the MVP pipeline is stable.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric title="Suspicious" value={suspicious} icon={<FileWarning className="h-5 w-5" />} />
        <AdminMetric title="Malicious" value={malicious} icon={<ShieldAlert className="h-5 w-5" />} />
        <AdminMetric title="Failed" value={failed} icon={<XCircle className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4">
        {reviewFiles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm font-medium text-zinc-700">No files need admin review.</p>
              <p className="mt-1 text-sm text-zinc-500">Higher-risk or failed scans will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          reviewFiles.map((file) => (
            <Card key={file.id}>
              <CardHeader className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <CardTitle className="break-all">{file.originalFilename}</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    Uploaded by {file.user.name} · {file.user.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone={statusTone(file.status)}>{titleCase(file.status)}</Badge>
                  <Badge tone={statusTone(file.scanResult?.verdict ?? file.status)}>
                    Score {file.scanResult?.riskScore ?? "-"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div>
                  <p className="text-sm leading-6 text-zinc-600">
                    {file.scanResult?.summary ?? "No scan summary has been written yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/results/${file.id}`}>Open report</Link>
                    </Button>
                    <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
                      <MessageSquare className="h-4 w-4" aria-hidden />
                      {file.feedback.length} recent note(s)
                    </span>
                  </div>
                  {file.feedback.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {file.feedback.map((item) => (
                        <div key={item.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                          <p className="font-medium text-zinc-800">{titleCase(item.label)}</p>
                          {item.comment ? <p className="mt-1 text-zinc-600">{item.comment}</p> : null}
                          <p className="mt-1 text-xs text-zinc-500">By {item.user.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <FeedbackForm fileId={file.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}

function AdminMetric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-md text-white">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="text-white">{icon}</div>
      </CardContent>
    </Card>
  );
}
