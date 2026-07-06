import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createStoredFilename,
  getQuarantineRoot,
  quarantinePathFor,
  writeQuarantineFile,
} from "@/lib/services/storage/quarantine-storage";
import { ServiceError } from "@/lib/services/errors";

let tempRoot: string | null = null;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
  delete process.env.MALVIZ_QUARANTINE_DIR;
});

describe("quarantine storage", () => {
  it("uses an external configured quarantine root", async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "malviz-test-"));
    process.env.MALVIZ_QUARANTINE_DIR = tempRoot;

    expect(getQuarantineRoot()).toBe(tempRoot);
  });

  it("writes uploaded bytes under a UUID filename", async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "malviz-test-"));
    process.env.MALVIZ_QUARANTINE_DIR = tempRoot;

    const stored = await writeQuarantineFile(".txt", Buffer.from("sample"));

    expect(stored.storedFilename).toMatch(/^[0-9a-f-]{36}\.txt$/);
    expect(stored.storagePath.startsWith(tempRoot)).toBe(true);
    await expect(readFile(stored.storagePath, "utf8")).resolves.toBe("sample");
  });

  it("rejects path traversal filenames", () => {
    expect(() => quarantinePathFor("../evil.txt")).toThrow(ServiceError);
  });

  it("normalizes unsafe extensions to bin", () => {
    expect(createStoredFilename("../exe")).toMatch(/\.bin$/);
  });
});
