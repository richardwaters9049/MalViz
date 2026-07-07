"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScanNowButtonProps = {
  fileId: string;
  status: string;
};

const activeStatuses = new Set(["QUEUED", "SCANNING"]);
const scanableStatuses = new Set(["UPLOADED", "FAILED"]);

function initialProgress(status: string, isStarting: boolean) {
  if (isStarting) return 18;
  if (status === "QUEUED") return 38;
  if (status === "SCANNING") return 68;
  return 0;
}

function actionLabel(status: string, isStarting: boolean) {
  if (isStarting) return "Starting";
  if (status === "QUEUED") return "Resume scan";
  if (status === "SCANNING") return "Check scan";
  if (status === "FAILED") return "Retry scan";
  return "Scan now";
}

export function ScanNowButton({ fileId, status }: ScanNowButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [visualProgress, setVisualProgress] = useState(() => initialProgress(status, false));
  const isActive = isStarting || activeStatuses.has(status);
  const canStart = !isStarting && (scanableStatuses.has(status) || activeStatuses.has(status));
  const progressValue = isActive ? Math.max(visualProgress, initialProgress(status, isStarting)) : 0;

  useEffect(() => {
    if (!isStarting && !activeStatuses.has(status)) return;

    const interval = window.setInterval(() => {
      setVisualProgress((value) => Math.min(94, value + (value < 70 ? 5 : 1)));
    }, 800);

    return () => window.clearInterval(interval);
  }, [isStarting, status]);

  async function startScan() {
    if (!canStart) return;

    setIsStarting(true);
    setVisualProgress(18);

    try {
      const response = await fetch(`/api/scans/${fileId}`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Scan could not be started.");
      }

      const warnings = Array.isArray(payload.data?.scan?.warnings)
        ? payload.data.scan.warnings.filter((warning: unknown): warning is string => typeof warning === "string")
        : [];

      toast.success(status === "QUEUED" || status === "SCANNING"
        ? "Scan worker kicked. This page will keep checking for the report."
        : "Scan started. The report will appear here automatically.");
      for (const warning of warnings) {
        toast.warning(warning);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan could not be started.");
    } finally {
      setIsStarting(false);
    }
  }

  if (!scanableStatuses.has(status) && !activeStatuses.has(status)) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-cyan-400/40 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,var(--app-surface),var(--app-surface-muted))] p-4 shadow-[0_16px_45px_rgba(8,145,178,0.14)]">
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-cyan-300/50 opacity-30 transition-transform duration-700",
          isActive && "scale-125 animate-ping",
        )}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-600">
            <div
              className={cn(
                "absolute inset-1 rounded-full border border-cyan-400/50 border-t-transparent transition-transform duration-500",
                isActive && "animate-spin",
              )}
            />
            <Radar className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-(--app-fg)">
              {isActive ? "Scan in progress" : "Ready to generate report"}
            </p>
            <p className="mt-1 text-sm text-(--app-muted)">
              {isActive
                ? "MalViz is processing the quarantined file. This page refreshes until the report is ready."
                : "Start static analysis when you are ready to create the report."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={startScan}
          disabled={!canStart}
          className={cn(
            "relative min-w-36 overflow-hidden bg-cyan-600 text-white hover:bg-cyan-700",
            isActive && "bg-cyan-700",
          )}
        >
          <span
            className={cn(
              "absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-18deg] bg-white/25 transition-transform duration-700",
              isActive && "translate-x-[320%]",
            )}
          />
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className={cn("h-4 w-4", isActive && "animate-pulse")} aria-hidden />
          )}
          {actionLabel(status, isStarting)}
        </Button>
      </div>

      {isActive ? (
        <div className="relative mt-4 overflow-hidden rounded-full bg-cyan-950/10" aria-label="Scan progress">
          <div
            className="h-2 rounded-full bg-linear-to-r from-cyan-500 via-emerald-400 to-cyan-300 transition-[width] duration-700 ease-out"
            style={{ width: `${progressValue}%` }}
          />
          <div className="absolute inset-0 -translate-x-full animate-[scan-progress-sheen_1.8s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/40 to-transparent" />
          <style jsx>{`
            @keyframes scan-progress-sheen {
              to {
                transform: translateX(100%);
              }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}
