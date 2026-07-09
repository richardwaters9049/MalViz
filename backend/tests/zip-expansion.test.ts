import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { expandZipUpload } from "@/lib/services/uploads/zip-expansion";

describe("ZIP upload expansion", () => {
  it("extracts scannable files from nested archives without preserving paths", () => {
    const archive = zipSync({
      "clean-note.txt": strToU8("hello from a zip"),
      "nested/suspicious-script.ps1": strToU8("powershell http://example.test/a"),
    });

    const expanded = expandZipUpload("samples.zip", Buffer.from(archive));

    expect(expanded.failures).toEqual([]);
    expect(expanded.entries).toHaveLength(2);
    expect(expanded.entries.map((entry) => entry.filename).sort()).toEqual([
      "clean-note.txt",
      "suspicious-script.ps1",
    ]);
    expect(expanded.entries[1].archivePath).toBe("nested/suspicious-script.ps1");
  });

  it("rejects archive traversal and absolute paths", () => {
    const archive = zipSync({
      "../evil.txt": strToU8("bad path"),
      "/tmp/evil.txt": strToU8("absolute path"),
      "safe.txt": strToU8("safe path"),
    });

    const expanded = expandZipUpload("paths.zip", Buffer.from(archive));

    expect(expanded.entries).toHaveLength(1);
    expect(expanded.entries[0].filename).toBe("safe.txt");
    expect(expanded.failures.map((failure) => failure.error)).toEqual([
      "ZIP entry path traversal is not allowed.",
      "ZIP entry uses an absolute path.",
    ]);
  });

  it("rejects invalid ZIP payloads", () => {
    const expanded = expandZipUpload("not-a-zip.zip", Buffer.from("not a zip"));

    expect(expanded.entries).toEqual([]);
    expect(expanded.failures[0].error).toContain("ZIP could not be unpacked");
  });
});
