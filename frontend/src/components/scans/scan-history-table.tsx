import Link from "next/link";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import { VerdictBadge } from "@/components/scans/verdict-badge";
import { formatBytes } from "@/lib/utils";

type ScanRow = {
  id: string;
  originalFilename: string;
  sha256: string;
  fileSize: number;
  status: string;
  user: { name: string };
  scanResult: { verdict: string; riskScore: number } | null;
};

export function ScanHistoryTable({ scans }: { scans: ScanRow[] }) {
  if (scans.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-(--app-border) p-8 text-center">
        <p className="text-sm font-medium text-(--app-fg)">No scans yet.</p>
        <p className="mt-1 text-sm text-(--app-muted)">Uploaded files will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-(--app-border)">
      <table className="w-full text-left text-sm">
        <thead className="bg-(--app-table-head) text-xs uppercase text-(--app-muted)">
          <tr>
            <th className="px-4 py-3">File</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Size</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Verdict</th>
            <th className="px-4 py-3">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--app-border)">
          {scans.map((scan) => (
            <tr key={scan.id}>
              <td className="px-4 py-3">
                <Link className="font-medium text-(--app-fg) hover:text-cyan-700" href={`/scans/${scan.id}`}>
                  {scan.originalFilename}
                </Link>
                <p className="mt-1 max-w-sm truncate font-mono text-xs text-(--app-muted)">{scan.sha256}</p>
              </td>
              <td className="px-4 py-3 text-(--app-muted)">{scan.user.name}</td>
              <td className="px-4 py-3 text-(--app-muted)">{formatBytes(scan.fileSize)}</td>
              <td className="px-4 py-3">
                <ScanStatusBadge status={scan.status} />
              </td>
              <td className="px-4 py-3">
                <VerdictBadge verdict={scan.scanResult?.verdict} />
              </td>
              <td className="px-4 py-3 text-(--app-muted)">{scan.scanResult?.riskScore ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
