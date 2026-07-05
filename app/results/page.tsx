import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { statusTone } from "@/lib/scans/status";
import { formatBytes, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const user = await requireUser();
  const files = await prisma.file.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      scanResult: true,
      scanJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <AppShell user={user}>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950">Results</h1>
          <p className="mt-1 text-sm text-zinc-500">Review scan status, verdicts, and analysis history.</p>
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
          {files.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
              <p className="text-sm font-medium text-zinc-700">No scans yet.</p>
              <p className="mt-1 text-sm text-zinc-500">Uploaded files will appear here.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td className="px-4 py-3">
                        <Link className="font-medium text-zinc-950 hover:text-cyan-700" href={`/results/${file.id}`}>
                          {file.originalFilename}
                        </Link>
                        <p className="mt-1 max-w-sm truncate font-mono text-xs text-zinc-500">{file.sha256}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{file.user.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{formatBytes(file.fileSize)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(file.status)}>{titleCase(file.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{file.scanResult?.riskScore ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
