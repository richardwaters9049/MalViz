import { describe, expect, it } from "vitest";
import { parseFileStatus } from "@/lib/services/scans/scan-service";

describe("scan service helpers", () => {
  it("parses status filters case-insensitively", () => {
    expect(parseFileStatus("suspicious")).toBe("SUSPICIOUS");
  });

  it("rejects unknown status filters", () => {
    expect(() => parseFileStatus("maybe")).toThrow("Unknown scan status");
  });
});
