import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function RiskScoreCard({ score }: { score?: number | null }) {
  const value = score ?? 0;
  const width = score == null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-(--app-muted)">Risk score</p>
            <p className="mt-1 text-3xl font-semibold text-(--app-fg)">
              {score == null ? "-" : value}
              <span className="text-base text-(--app-muted)">/100</span>
            </p>
          </div>
          <ShieldAlert className="h-8 w-8 text-(--app-muted)" aria-hidden />
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${width}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
