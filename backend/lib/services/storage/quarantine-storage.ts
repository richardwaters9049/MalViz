import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ServiceError } from "@/lib/services/errors";
import type { StoredQuarantineFile } from "@/lib/services/storage/storage-types";

const fallbackQuarantineRoot = "/tmp/malviz-quarantine";

export function getQuarantineRoot() {
  const configured = process.env.MALVIZ_QUARANTINE_DIR?.trim();
  return configured && path.isAbsolute(configured) ? configured : fallbackQuarantineRoot;
}

export async function ensureQuarantineRoot() {
  const root = getQuarantineRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  return root;
}

export function createStoredFilename(extension: string) {
  const safeExtension = extension && /^\.[a-z0-9]+$/i.test(extension) ? extension.toLowerCase() : ".bin";
  return `${randomUUID()}${safeExtension}`;
}

export function quarantinePathFor(storedFilename: string) {
  if (path.basename(storedFilename) !== storedFilename) {
    throw new ServiceError("STORAGE_FAILED", "Invalid quarantine filename.");
  }

  return path.join(getQuarantineRoot(), storedFilename);
}

export async function writeQuarantineFile(
  extension: string,
  bytes: Buffer,
): Promise<StoredQuarantineFile> {
  const root = await ensureQuarantineRoot();
  const storedFilename = createStoredFilename(extension);
  const storagePath = path.join(root, storedFilename);

  try {
    // Quarantine paths are generated from UUIDs only; user filenames never reach the filesystem.
    await writeFile(storagePath, bytes, { mode: 0o600 });
    return { storedFilename, storagePath };
  } catch (error) {
    throw new ServiceError("STORAGE_FAILED", "Could not write file to quarantine storage.", {
      cause: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function removeQuarantineFile(storagePath: string) {
  try {
    await unlink(storagePath);
    return true;
  } catch {
    return false;
  }
}
