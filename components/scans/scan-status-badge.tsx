import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/scans/status";
import { titleCase } from "@/lib/utils";

export function ScanStatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status as never)}>{titleCase(status)}</Badge>;
}
