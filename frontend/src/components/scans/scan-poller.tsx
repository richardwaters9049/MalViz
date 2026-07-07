"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const activeStatuses = new Set(["QUEUED", "SCANNING"]);

export function ScanPoller({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!activeStatuses.has(status)) return;
    let cancelled = false;

    const poll = window.setTimeout(() => {
      if (cancelled) return;
      router.refresh();
    }, 2_500);

    return () => {
      cancelled = true;
      window.clearTimeout(poll);
    };
  }, [router, status]);

  return null;
}
