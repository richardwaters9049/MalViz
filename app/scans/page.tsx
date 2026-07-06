import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ScanHistoryTable } from "@/components/scans/scan-history-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { listScans } from "@/lib/services/scans/scan-service";

export const dynamic = "force-dynamic";

export default async function ScansPage() {
  const user = await requireUser();
  const scans = await listScans(user);

  return (
    <AppShell user={user}>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-(--app-fg)">Scans</h1>
          <p className="mt-1 text-sm text-(--app-muted)">Review scan status, verdicts, and analysis history.</p>
        </div>
        <Button asChild>
          <Link href="/upload">Upload files</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
        </CardHeader>
        <CardContent>
          <ScanHistoryTable scans={scans} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
