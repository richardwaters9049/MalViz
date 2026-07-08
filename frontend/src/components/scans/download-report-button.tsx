"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DownloadReportButton({ fileId }: { fileId: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function downloadReport() {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/scans/${fileId}/report.pdf`);

      if (!response.ok) {
        throw new Error("PDF report could not be generated.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filenameFromDisposition(response.headers.get("content-disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF report downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF report could not be downloaded.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" type="button" onClick={downloadReport} disabled={isDownloading}>
      {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      {isDownloading ? "Preparing PDF" : "Download PDF"}
    </Button>
  );
}

function filenameFromDisposition(disposition: string | null) {
  const fallback = "malviz-report.pdf";
  if (!disposition) return fallback;

  const match = /filename="([^"]+)"/.exec(disposition);
  return match?.[1] ?? fallback;
}
