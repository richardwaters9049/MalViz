import { expect, test } from "@playwright/test";
import { openMobileNavigation, signInAs } from "./helpers";

test("opens the mobile drawer and navigates between core sections", async ({ page }) => {
  await signInAs(page, "Demo Admin");

  await openMobileNavigation(page);
  let drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("link", { name: "Admin", exact: true })).toBeVisible();

  await drawer.getByRole("link", { name: "Upload", exact: true }).click();
  await expect(page).toHaveURL(/\/upload$/);
  await expect(page.getByRole("heading", { name: "Upload files" })).toBeVisible();

  await openMobileNavigation(page);
  drawer = page.getByRole("dialog");
  await drawer.getByRole("link", { name: "Scans", exact: true }).click();
  await expect(page).toHaveURL(/\/scans$/);
  await expect(page.getByRole("heading", { name: "Scans" })).toBeVisible();
});
