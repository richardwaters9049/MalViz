import { expect, type Page } from "@playwright/test";

export async function signInAs(page: Page, name: "Demo Analyst" | "Demo Admin") {
  await page.context().clearCookies();
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(name, "i") }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function uploadTextSample(
  page: Page,
  sample: { name: string; body: string; mimeType?: string },
) {
  await page.goto("/upload");

  const fileChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /select files/i }).click();
  await (await fileChooser).setFiles({
    name: sample.name,
    mimeType: sample.mimeType ?? "text/plain",
    buffer: Buffer.from(sample.body),
  });

  await expect(page.getByText(sample.name)).toBeVisible();
  await page.getByRole("button", { name: /upload to quarantine/i }).click();
  await expect(page).toHaveURL(/\/scans\/[^/]+$/);
  await expect(page.getByText(sample.name)).toBeVisible();

  return page.url().split("/").pop() ?? "";
}

export async function startScanAndWaitForReport(page: Page) {
  await page.getByRole("button", { name: /scan now|retry scan|resume scan/i }).click();
  await expect(page.getByText(/scan in progress|report generated/i)).toBeVisible();
  await expect(page.getByText("Report generated")).toBeVisible({ timeout: 60_000 });
}

export async function openMobileNavigation(page: Page) {
  const menuButton = page.locator("button[aria-controls='mobile-navigation']");

  await expect(async () => {
    if ((await menuButton.getAttribute("aria-expanded")) !== "true") {
      await menuButton.click();
    }

    await expect(menuButton).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });

  await expect(page.getByRole("dialog")).toBeVisible();
}
