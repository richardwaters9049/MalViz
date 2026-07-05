import { describe, expect, it } from "vitest";
import { inspectUpload, safeOriginalFilename } from "@/lib/validation/upload";

describe("upload validation", () => {
  it("sanitizes original filenames without using path segments", () => {
    expect(safeOriginalFilename("../../evil sample?.exe")).toBe("evil sample_.exe");
  });

  it("calculates sha256 and detects safe text uploads", async () => {
    const file = new File(["hello from malviz"], "note.txt", {
      type: "text/plain",
    });
    const inspection = await inspectUpload(file, Buffer.from(await file.arrayBuffer()));

    expect(inspection.originalFilename).toBe("note.txt");
    expect(inspection.extension).toBe(".txt");
    expect(inspection.sha256).toHaveLength(64);
    expect(inspection.warnings).toEqual([]);
  });

  it("warns when extension and magic bytes disagree", async () => {
    const file = new File(["%PDF-1.7 suspicious"], "payload.exe", {
      type: "application/octet-stream",
    });
    const inspection = await inspectUpload(file, Buffer.from(await file.arrayBuffer()));

    expect(inspection.warnings[0]).toContain("does not match detected type");
  });

  it("rejects unsupported extensions", async () => {
    const file = new File(["hello"], "sample.xyznotallowed", {
      type: "text/plain",
    });

    await expect(inspectUpload(file, Buffer.from(await file.arrayBuffer()))).rejects.toThrow(
      "not allowed",
    );
  });
});
