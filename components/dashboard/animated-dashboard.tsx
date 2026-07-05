"use client";

import Link from "next/link";
import { Activity, FileWarning, ShieldAlert, ShieldCheck, Timer, UploadCloud } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusTone } from "@/lib/scans/status";
import { formatBytes, titleCase } from "@/lib/utils";

type RecentFile = {
  id: string;
  originalFilename: string;
  sha256: string;
  fileSize: number;
  status: string;
  riskScore: number | null;
};

type AnimatedDashboardProps = {
  total: number;
  pending: number;
  malicious: number;
  suspicious: number;
  recentFiles: RecentFile[];
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: easeOut } },
};

export function AnimatedDashboard({
  total,
  pending,
  malicious,
  suspicious,
  recentFiles,
}: AnimatedDashboardProps) {
  const completed = Math.max(0, total - pending);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const signalCount = malicious + suspicious;

  return (
    <motion.div className="grid min-w-0 gap-6" variants={container} initial="hidden" animate="visible">
      <motion.div
        className="min-w-0 overflow-hidden rounded-lg border border-(--app-hero-border) bg-(--app-hero) text-white shadow-lg"
        variants={item}
      >
        <div className="grid min-w-0 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:p-8">
          <div className="min-w-0">
            <motion.div
              className="mb-5 inline-flex items-center gap-2 rounded-md border border-(--app-accent-border) bg-(--app-accent-soft) px-3 py-1 text-xs font-medium text-cyan-200"
              variants={item}
            >
              <Activity className="h-3.5 w-3.5" aria-hidden />
              Analysis workspace
            </motion.div>
            <motion.h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl" variants={item}>
              Track suspicious files from upload to verdict.
            </motion.h1>
            <motion.p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300" variants={item}>
              MalViz keeps samples quarantined, separates worker analysis from the web app, and turns static signals into clear analyst actions.
            </motion.p>
            <motion.div className="mt-6 grid gap-3 sm:inline-grid sm:grid-flow-col sm:auto-cols-max" variants={item}>
              <Button asChild className="bg-(--app-accent) text-zinc-950 hover:bg-violet-600 hover:text-white">
                <Link href="/upload">
                  <UploadCloud className="h-4 w-4" aria-hidden />
                  Upload files
                </Link>
              </Button>
              <Button variant="outline" asChild className="border-(--app-hero-border) bg-(--app-hero-soft) text-white hover:bg-violet-600">
                <Link href="/results">Review results</Link>
              </Button>
            </motion.div>
          </div>
          <motion.div className="min-w-0 rounded-lg border border-(--app-hero-border) bg-(--app-hero-soft) p-4 sm:p-5" variants={item}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="text-sm font-medium text-zinc-300">Scan completion</p>
              <span className="text-2xl font-semibold text-white">{completionRate}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-(--app-accent)"
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.75, ease: easeOut, delay: 0.25 }}
              />
            </div>
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-3 text-center">
              <HeroStat label="Completed" value={completed} />
              <HeroStat label="Pending" value={pending} />
              <HeroStat label="Signals" value={signalCount} />
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" variants={container}>
        <MetricCard title="Total files" value={total} icon={<ShieldCheck className="h-5 w-5" />} tone="cyan" />
        <MetricCard title="Pending scans" value={pending} icon={<Timer className="h-5 w-5" />} tone="zinc" />
        <MetricCard title="Malicious" value={malicious} icon={<ShieldAlert className="h-5 w-5" />} tone="red" />
        <MetricCard title="Suspicious" value={suspicious} icon={<FileWarning className="h-5 w-5" />} tone="amber" />
      </motion.div>

      <motion.div className="min-w-0" variants={item}>
        <Card className="min-w-0 border(--app-border) bg-(--app-surface)]">
          <CardHeader className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <CardTitle>Recent uploads</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/results">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentFiles.length === 0 ? (
              <div className="rounded-md border border-dashed border-(--app-border) bg-(--app-surface-muted) p-8 text-center">
                <p className="text-sm font-medium text-(--app-fg)">No uploads yet.</p>
                <p className="mt-1 text-sm text-(--app-muted)">
                  Start with a clean text fixture or suspicious sample-like file.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-(--app-border)">
                <table className="hidden w-full table-fixed text-left text-sm md:table">
                  <thead className="bg-(--app-table-head) text-xs uppercase text-(--app-muted)">
                    <tr>
                      <th className="w-[52%] px-4 py-3">File</th>
                      <th className="w-[16%] px-4 py-3">Size</th>
                      <th className="w-[18%] px-4 py-3">Status</th>
                      <th className="w-[14%] px-4 py-3">Score</th>
                    </tr>
                  </thead>
                  <motion.tbody className="divide-y divide-(--app-border) bg-(--app-surface)" variants={container}>
                    {recentFiles.map((file) => (
                      <motion.tr key={file.id} variants={item}>
                        <td className="px-4 py-3">
                          <Link
                            className="block truncate font-medium text-(--app-fg) hover:text-cyan-700"
                            href={`/results/${file.id}`}
                          >
                            {file.originalFilename}
                          </Link>
                          <p className="mt-1 max-w-lg truncate text-xs text-(--app-muted)">{file.sha256}</p>
                        </td>
                        <td className="px-4 py-3 text-(--app-muted)">{formatBytes(file.fileSize)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(file.status as never)}>{titleCase(file.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-(--app-muted)">{file.riskScore ?? "-"}</td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
                <motion.div className="grid gap-3 p-3 md:hidden" variants={container}>
                  {recentFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      className="grid min-w-0 gap-3 rounded-md border border-(--app-border) bg-(--app-surface-muted) p-3"
                      variants={item}
                    >
                      <div className="min-w-0">
                        <Link
                          className="block truncate font-medium text-(--app-fg) hover:text-cyan-700"
                          href={`/results/${file.id}`}
                        >
                          {file.originalFilename}
                        </Link>
                        <p className="mt-1 truncate text-xs text-(--app-muted)">{file.sha256}</p>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2 text-sm">
                        <div>
                          <p className="text-xs text-(--app-muted)">Size</p>
                          <p className="font-medium text-(--app-fg)">{formatBytes(file.fileSize)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-(--app-muted)">Status</p>
                          <Badge tone={statusTone(file.status as never)}>{titleCase(file.status)}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-(--app-muted)">Score</p>
                          <p className="font-medium text-(--app-fg)">{file.riskScore ?? "-"}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <motion.div
      className="grid min-h-20 min-w-0 place-items-center rounded-md border border-(--app-hero-border) bg-(--app-hero)/80 p-3 text-center"
      variants={item}
    >
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none text-white">{value}</p>
        <p className="mt-2 truncate text-xs text-zinc-400">{label}</p>
      </div>
    </motion.div>
  );
}

const metricTones = {
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  red: "border-red-200 bg-red-50 text-red-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: keyof typeof metricTones;
}) {
  return (
    <motion.div className="min-w-0" variants={item}>
      <Card className="overflow-hidden border-(--app-border) bg-(--app-surface) transition-colors hover:border-cyan-200 hover:shadow-md">
        <div className={`h-1 ${tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-400" : tone === "cyan" ? "bg-cyan-400" : "bg-zinc-300"}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-(--app-muted)">{title}</CardTitle>
          <div className={`rounded-md border p-2 ${metricTones[tone]}`}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-(--app-fg)">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
