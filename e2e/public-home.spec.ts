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
    // Use getByRole('textbox') to disambiguate from ValidationChecklist
    // list items that share the field name via aria-label.
    const usuarioInput = page.getByRole('textbox', { name: 'Usuario', exact: true });
    await expect(usuarioInput).toHaveAttribute('aria-invalid', 'true');

    const suffix = Date.now();
    await usuarioInput.fill(`qa-user-${suffix}`);
    await page.getByRole('textbox', { name: /Correo/i }).fill(`qa-user-${suffix}@example.com`);
    await page.getByLabel('Contraseña', { exact: true }).fill('TestPassw0rd!');
    await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('QA');
    await page.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Automation');
    await page.getByRole('textbox', { name: 'Identificación', exact: true }).fill(`ID-${suffix}`);

    await expect(submitButton).toBeEnabled();
  });
});
