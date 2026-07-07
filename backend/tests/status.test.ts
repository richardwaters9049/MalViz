import { describe, expect, it } from "vitest";
import { statusTone, verdictCopy } from "@/lib/scans/status";

describe("scan status helpers", () => {
  it("maps risky statuses to alert tones", () => {
    expect(statusTone("MALICIOUS")).toBe("danger");
    expect(statusTone("SUSPICIOUS")).toBe("warning");
    expect(statusTone("CLEAN")).toBe("success");
  });

  it("explains missing verdicts", () => {
    expect(verdictCopy(null)).toContain("not produced");
  });
});
