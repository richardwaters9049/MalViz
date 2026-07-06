"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const activeStatuses = new Set(["UPLOADED", "QUEUED", "SCANNING"]);

export function ScanPoller({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!activeStatuses.has(status)) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 3_000);

    return () => window.clearInterval(interval);
  }, [router, status]);

  return null;
}
