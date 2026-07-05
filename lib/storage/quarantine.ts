import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function getQuarantineRoot() {
  return path.join(process.cwd(), "storage", "quarantine");
}

export async function ensureQuarantineRoot() {
  const root = getQuarantineRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  return root;
}

export function quarantinePathFor(storedFilename: string) {
  return path.join(getQuarantineRoot(), storedFilename);
}

export async function writeQuarantineFile(
  storedFilename: string,
  bytes: Buffer,
) {
  const root = await ensureQuarantineRoot();
  const storagePath = path.join(root, storedFilename);
  await writeFile(storagePath, bytes, { mode: 0o600 });
  return storagePath;
}
