import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/scans/status";
import { titleCase } from "@/lib/utils";

export function VerdictBadge({ verdict }: { verdict?: string | null }) {
  if (!verdict) return <Badge>Pending</Badge>;

  return <Badge tone={statusTone(verdict as never)}>{titleCase(verdict)}</Badge>;
}
