import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RiskScoreCard({ score, completed = false }: { score?: number | null; completed?: boolean }) {
  const value = score ?? 0;
  const width = score == null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <Card className={cn(completed && "scan-score-complete")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-(--app-muted)">Risk score</p>
            <p className="mt-1 text-3xl font-semibold text-(--app-fg)">
              {score == null ? "-" : value}
              <span className="text-base text-(--app-muted)">/100</span>
            </p>
          </div>
          {completed ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden />
          ) : (
            <ShieldAlert className="h-8 w-8 text-(--app-muted)" aria-hidden />
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
          <div
            className={cn(
              "h-full rounded-full bg-cyan-500 transition-[width] duration-700 ease-out",
              completed && "scan-score-fill",
            )}
            style={{ "--score-width": `${width}%`, width: completed ? undefined : `${width}%` } as React.CSSProperties}
          />
        </div>
      </CardContent>
    </Card>
  );
}
