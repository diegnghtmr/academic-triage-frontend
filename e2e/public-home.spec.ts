import { expect, test } from '@playwright/test';

test.describe('public home critical path', () => {
  test('allows navigating to login from public home', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Academic Triage' })).toBeVisible();

    await page.getByRole('link', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('register page keeps submit disabled until form is valid', async ({ page }) => {
    await page.goto('/auth/register');

    const submitButton = page.getByRole('button', { name: 'Registrarme' });
    await expect(submitButton).toBeDisabled();

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
