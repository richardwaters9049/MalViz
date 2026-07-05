"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";

type UploadResponse = {
  uploads: Array<{
    fileId: string;
    scanJobId: string;
    originalFilename: string;
    status: string;
    warnings: string[];
  }>;
  failures: Array<{
    filename: string;
    error: string;
  }>;
};

export function UploadDropzone({ maxBytes }: { maxBytes: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setFiles(Array.from(fileList));
  }

  async function uploadFiles() {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setIsUploading(true);
    setProgress(20);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      setProgress(85);

      const payload = (await response.json()) as UploadResponse;

      if (!response.ok) {
        throw new Error(payload.failures?.[0]?.error ?? "Upload failed.");
      }

      if (payload.failures.length > 0) {
        toast.warning(`${payload.failures.length} file(s) were rejected.`);
      }

      if (payload.uploads.length > 0) {
        toast.success(`${payload.uploads.length} file(s) queued for analysis.`);
        const firstUpload = payload.uploads[0];
        router.push(`/results/${firstUpload.fileId}`);
      }

      setProgress(100);
      setFiles([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-linear-135 from-cyan-500 to-green-600 p-8 text-center transition-colors hover:border-cyan-300 gap-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud className="h-15 w-15 text-white" aria-hidden />
        <h2 className="mt-4 text-3xl font-semibold text-zinc-950">Drop suspicious files here</h2>
        <p className="mt-2 max-w-xl text-lg text-white">
          Files are renamed, written to local quarantine storage, and never exposed through public routes.
        </p>
        <p className="mt-2 max-w-xl text-lg text-white">
          Maximum size is {formatBytes(maxBytes)} per file.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.currentTarget.files)}
        />
        <Button className="mt-5" variant="outline" onClick={() => inputRef.current?.click()}>
          <FileUp className="h-4 w-4" aria-hidden />
          Select files
        </Button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <p className="text-sm text-red-700">
            Treat uploaded files as hostile. Do not upload sensitive personal data, and do not execute samples outside an isolated lab.
          </p>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-medium text-zinc-950">{files.length} selected file(s)</p>
            <Button onClick={uploadFiles} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UploadCloud className="h-4 w-4" aria-hidden />}
              Queue analysis
            </Button>
          </div>
          <ul className="divide-y divide-zinc-100">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="truncate font-medium text-zinc-800">{file.name}</span>
                <span className="shrink-0 text-zinc-500">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
          {progress > 0 ? <Progress value={progress} className="rounded-none" /> : null}
        </div>
      ) : null}
    </div>
  );
}
