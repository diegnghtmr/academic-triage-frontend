import { expect, test } from '@playwright/test';

test.describe('public home critical path', () => {
  test('allows navigating to login from public home', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Academic Triage' })).toBeVisible();

    await page.getByRole('link', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('register page reveals field errors on invalid submit (UV-1 AC1)', async ({ page }) => {
    await page.goto('/auth/register');

    const submitButton = page.getByRole('button', { name: 'Registrarme' });
    // UV-1 AC1: submit is NOT disabled on form.invalid — user must be able to click
    // and have markAllAsTouched() surface the validation errors.
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    // After click on empty form, required inputs should be marked invalid.
    // Locate by stable ID (REGISTER_CONTROL_IDS) instead of label/role —
    // FormField+PasswordField composition and the ValidationChecklist
    // aria-labels make getByLabel/getByRole ambiguous.
    const usernameInput = page.locator('#reg-username');
    await expect(usernameInput).toHaveAttribute('aria-invalid', 'true');

    const suffix = Date.now();
    await usernameInput.fill(`qa-user-${suffix}`);
    await page.locator('#reg-email').fill(`qa-user-${suffix}@example.com`);
    await page.locator('#reg-password').fill('TestPassw0rd!');
    await page.locator('#reg-first').fill('QA');
    await page.locator('#reg-last').fill('Automation');
    await page.locator('#reg-id').fill(`ID-${suffix}`);

    await expect(submitButton).toBeEnabled();
  });
});
