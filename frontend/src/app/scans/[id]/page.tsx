import { notFound } from "next/navigation";
import { ScanReportPage } from "@/components/scans/scan-report-page";
import { requireUser } from "@/lib/auth/session";
import { ServiceError } from "@/lib/services/errors";
import { getScanDetail } from "@/lib/services/scans/scan-service";

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
  return <ScanReportPage user={user} file={file} />;
}
