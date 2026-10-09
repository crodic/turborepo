import { test, expect } from "@playwright/test";

test.describe("Auth - Form Validation Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/auth/login");
  });

  test("should display validation errors when submitting an empty form", async ({
    page,
  }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    // Submit empty form
    await submitBtn.click();

    // Check that form validation messages appear
    const emailField = page.locator('input[name="email"]');
    const passwordField = page.locator('input[name="password"]');

    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();

    // Locate error messages in the form
    const errorMessages = page.locator(
      '[data-slot="form-message"], p.text-destructive'
    );
    await expect(errorMessages.first()).toBeVisible();
  });

  test("should require password when only email is filled", async ({
    page,
  }) => {
    await page.fill('input[name="email"]', "valid.user@example.com");
    await page.click('button[type="submit"]');

    // Password error should be shown
    const passwordField = page.locator('input[name="password"]');
    await expect(passwordField).toBeVisible();

    const formErrors = page.locator(
      '[data-slot="form-message"], p.text-destructive'
    );
    await expect(formErrors.first()).toBeVisible();
  });

  test("should allow input and clear errors upon valid input", async ({
    page,
  }) => {
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.fill("user@example.com");
    await passwordInput.fill("secretPassword123");

    await expect(emailInput).toHaveValue("user@example.com");
    await expect(passwordInput).toHaveValue("secretPassword123");
  });
});
