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
    await expect(page.getByLabel('Usuario')).toHaveAttribute('aria-invalid', 'true');

    const suffix = Date.now();
    await page.getByLabel('Usuario').fill(`qa-user-${suffix}`);
    await page.getByLabel('Correo').fill(`qa-user-${suffix}@example.com`);
    await page.getByLabel('Contraseña').fill('TestPassw0rd!');
    await page.getByLabel('Nombre').fill('QA');
    await page.getByLabel('Apellido').fill('Automation');
    await page.getByLabel('Identificación').fill(`ID-${suffix}`);

    await expect(submitButton).toBeEnabled();
  });
});
