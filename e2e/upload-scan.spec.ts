import { expect, test } from "@playwright/test";
import { signInAs, startScanAndWaitForReport, uploadTextSample } from "./helpers";

test("uploads a sample, starts analysis, and shows the generated report", async ({ page }) => {
  await signInAs(page, "Demo Analyst");

  const filename = `e2e-clean-${Date.now()}.txt`;
  await uploadTextSample(page, {
    name: filename,
    body: "Hello from the MalViz Playwright smoke test.\n",
  });

  await startScanAndWaitForReport(page);
  await expect(page.getByRole("heading", { name: "MalViz analysis report" })).toBeVisible();
  await expect(page.getByText("File metadata")).toBeVisible();

  await page.goto("/scans");
  await expect(page.getByRole("link", { name: filename })).toBeVisible();
});
