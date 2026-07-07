import { createHash } from "node:crypto";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

const defaultMaxBytes = 25 * 1024 * 1024;

export const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? "25");

const configuredMaxUploadBytes = process.env.MAX_UPLOAD_BYTES
  ? Number(process.env.MAX_UPLOAD_BYTES)
  : maxUploadSizeMb * 1024 * 1024;

export const maxUploadBytes = Number.isFinite(configuredMaxUploadBytes)
  ? configuredMaxUploadBytes
  : defaultMaxBytes;

const allowedExtensions = new Set([
  ".txt",
  ".log",
  ".csv",
  ".json",
  ".xml",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".7z",
  ".rar",
  ".gz",
  ".tar",
  ".exe",
  ".dll",
  ".scr",
  ".ps1",
  ".bat",
  ".cmd",
  ".js",
  ".vbs",
  ".jar",
  ".apk",
  ".bin",
]);

const extensionMimeHints: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".zip": ["application/zip", "application/x-zip-compressed"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
  ],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
  ],
  ".exe": ["application/x-msdownload", "application/vnd.microsoft.portable-executable"],
  ".dll": ["application/x-msdownload", "application/vnd.microsoft.portable-executable"],
};

export type UploadInspection = {
  originalFilename: string;
  extension: string;
  detectedMime: string;
  md5: string;
  sha1: string;
  sha256: string;
  warnings: string[];
};

export function safeOriginalFilename(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ()[\]]/g, "_");
  return base.slice(0, 180) || "unnamed";
}

export async function inspectUpload(
  file: File,
  bytes: Buffer,
): Promise<UploadInspection> {
  const originalFilename = safeOriginalFilename(file.name);
  const extension = path.extname(originalFilename).toLowerCase();
  const detectedType = await fileTypeFromBuffer(bytes);
  const detectedMime =
    detectedType?.mime || file.type || "application/octet-stream";
  const warnings: string[] = [];

  if (file.size <= 0) {
    throw new Error("Empty files cannot be scanned.");
  }

  if (file.size > maxUploadBytes) {
    throw new Error(`File exceeds the ${maxUploadBytes} byte upload limit.`);
  }

  if (!extension || !allowedExtensions.has(extension)) {
    throw new Error(`File extension ${extension || "(none)"} is not allowed.`);
  }

  const mimeHints = extensionMimeHints[extension];
  if (mimeHints && detectedType?.mime && !mimeHints.includes(detectedType.mime)) {
    warnings.push(
      `Extension ${extension} does not match detected type ${detectedType.mime}.`,
    );
  }

  return {
    originalFilename,
    extension,
    detectedMime,
    md5: createHash("md5").update(bytes).digest("hex"),
    sha1: createHash("sha1").update(bytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    warnings,
  };
}
