import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { FeedbackForm } from "@/components/admin/feedback-form";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import { VerdictBadge } from "@/components/scans/verdict-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/lib/utils";

type ReviewFile = {
  id: string;
  originalFilename: string;
  status: string;
  user: { name: string; email: string };
  scanResult: { verdict: string; riskScore: number; summary: string } | null;
  feedback: Array<{
    id: string;
    label: string;
    comment: string | null;
    user: { name: string };
  }>;
};

export function AdminReviewPanel({ files }: { files: ReviewFile[] }) {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm font-medium text-(--app-fg)">No files need admin review.</p>
          <p className="mt-1 text-sm text-(--app-muted)">Higher-risk or failed scans will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {files.map((file) => {
        const verdict = file.scanResult?.verdict;
        const showVerdictBadge = !verdict || verdict.toLowerCase() !== file.status.toLowerCase();

        return (
          <Card key={file.id} data-testid={`admin-review-file-${file.id}`}>
            <CardHeader className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <CardTitle className="break-all">{file.originalFilename}</CardTitle>
                <p className="mt-1 text-sm text-(--app-muted)">
                  Uploaded by {file.user.name} · {file.user.email}
                </p>
              </div>
              <div className="flex gap-2">
                <ScanStatusBadge status={file.status} />
                {showVerdictBadge ? <VerdictBadge verdict={verdict} /> : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <p className="text-sm leading-6 text-(--app-muted)">
                  {file.scanResult?.summary ?? "No scan summary has been written yet."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/scans/${file.id}`}>Open report</Link>
                  </Button>
                  <span className="inline-flex items-center gap-2 text-sm text-(--app-muted)">
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    {file.feedback.length} recent note(s)
                  </span>
                </div>
                {file.feedback.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {file.feedback.map((item) => (
                      <div key={item.id} className="rounded-md border border-(--app-border) bg-(--app-surface-muted) p-3 text-sm">
                        <p className="font-medium text-(--app-fg)">{titleCase(item.label)}</p>
                        {item.comment ? <p className="mt-1 text-(--app-muted)">{item.comment}</p> : null}
                        <p className="mt-1 text-xs text-(--app-muted)">By {item.user.name}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <FeedbackForm fileId={file.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
