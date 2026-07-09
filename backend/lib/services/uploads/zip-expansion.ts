import path from "node:path";
import { unzipSync, type UnzipFileInfo } from "fflate";
import { maxUploadBytes, safeOriginalFilename } from "@/lib/security/file-validation";
import type { UploadFailure } from "@/lib/services/uploads/upload-types";

export type ZipUploadEntry = {
  filename: string;
  archivePath: string;
  bytes: Buffer;
};

export type ZipExpansionResult = {
  entries: ZipUploadEntry[];
  failures: UploadFailure[];
};

const maxZipEntries = 50;
const maxZipExpandedBytes = Math.min(maxUploadBytes * 4, 100 * 1024 * 1024);

export function expandZipUpload(archiveFilename: string, bytes: Buffer): ZipExpansionResult {
  const failures: UploadFailure[] = [];
  let acceptedEntries = 0;
  let totalExpandedBytes = 0;

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes, {
      filter: (entry) => {
        const decision = shouldExtractEntry(entry, archiveFilename, acceptedEntries, totalExpandedBytes);
        if (!decision.extract) {
          if (decision.failure) failures.push(decision.failure);
          return false;
        }

        acceptedEntries += 1;
        totalExpandedBytes += entry.originalSize;
        return true;
      },
    });
  } catch (error) {
    return {
      entries: [],
      failures: [
        {
          filename: archiveFilename,
          error: error instanceof Error ? `ZIP could not be unpacked: ${error.message}` : "ZIP could not be unpacked.",
        },
      ],
    };
  }

  const entries: ZipUploadEntry[] = [];
  for (const [archivePath, entryBytes] of Object.entries(unzipped)) {
    const normalized = normalizeArchivePath(archivePath);
    const basename = normalized ? path.posix.basename(normalized) : archivePath;
    const validationError = archivePathError(normalized);

    if (validationError) {
      failures.push({
        filename: `${archiveFilename}:${archivePath}`,
        error: validationError,
      });
      continue;
    }

    entries.push({
      filename: safeOriginalFilename(basename),
      archivePath,
      bytes: Buffer.from(entryBytes),
    });
  }

  if (entries.length === 0 && failures.length === 0) {
    failures.push({
      filename: archiveFilename,
      error: "ZIP did not contain any files that can be scanned.",
    });
  }

  return { entries, failures };
}

function shouldExtractEntry(
  entry: UnzipFileInfo,
  archiveFilename: string,
  acceptedEntries: number,
  totalExpandedBytes: number,
): { extract: true } | { extract: false; failure?: UploadFailure } {
  const normalized = normalizeArchivePath(entry.name);
  if (!normalized || isIgnoredArchiveEntry(normalized)) {
    return { extract: false };
  }

  const scopedFilename = `${archiveFilename}:${entry.name}`;
  const validationError = archivePathError(normalized);
  if (validationError) {
    return {
      extract: false,
      failure: { filename: scopedFilename, error: validationError },
    };
  }

  if (acceptedEntries >= maxZipEntries) {
    return {
      extract: false,
      failure: { filename: scopedFilename, error: `ZIP archives can contain at most ${maxZipEntries} scannable files.` },
    };
  }

  if (entry.originalSize > maxUploadBytes) {
    return {
      extract: false,
      failure: { filename: scopedFilename, error: `Expanded file exceeds the ${maxUploadBytes} byte upload limit.` },
    };
  }

  if (totalExpandedBytes + entry.originalSize > maxZipExpandedBytes) {
    return {
      extract: false,
      failure: {
        filename: scopedFilename,
        error: `Expanded ZIP contents exceed the ${maxZipExpandedBytes} byte archive limit.`,
      },
    };
  }

  return { extract: true };
}

function normalizeArchivePath(name: string) {
  return name.replace(/\\/g, "/");
}

function archivePathError(name: string) {
  if (!name || name.endsWith("/")) return "ZIP entry is not a file.";
  if (name.startsWith("/")) return "ZIP entry uses an absolute path.";
  if (/^[a-zA-Z]:/.test(name)) return "ZIP entry uses an absolute path.";

  const segments = name.split("/");
  if (segments.some((segment) => segment === "..")) {
    return "ZIP entry path traversal is not allowed.";
  }

  const basename = segments.at(-1);
  if (!basename || safeOriginalFilename(basename) === "unnamed") {
    return "ZIP entry filename is not valid.";
  }

  return null;
}

function isIgnoredArchiveEntry(name: string) {
  if (name.endsWith("/")) return true;

  const basename = path.posix.basename(name);
  return name.startsWith("__MACOSX/") || basename === ".DS_Store";
}
