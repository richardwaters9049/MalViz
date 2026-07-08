import { afterEach, describe, expect, it } from "vitest";
import { parseFileStatus } from "@/lib/services/scans/scan-service";
import { triggerWorkerOnce } from "@/lib/services/worker/worker-trigger";

const originalAutoTrigger = process.env.MALVIZ_AUTO_TRIGGER_WORKER;

describe("scan service helpers", () => {
  afterEach(() => {
    if (originalAutoTrigger === undefined) {
      delete process.env.MALVIZ_AUTO_TRIGGER_WORKER;
      return;
    }

    process.env.MALVIZ_AUTO_TRIGGER_WORKER = originalAutoTrigger;
  });

  it("parses status filters case-insensitively", () => {
    expect(parseFileStatus("suspicious")).toBe("SUSPICIOUS");
  });

  it("rejects unknown status filters", () => {
    expect(() => parseFileStatus("maybe")).toThrow("Unknown scan status");
  });

  it("skips local worker spawning when production polling is enabled", () => {
    process.env.MALVIZ_AUTO_TRIGGER_WORKER = "false";

    expect(triggerWorkerOnce()).toEqual({ triggered: true });
  });
});
