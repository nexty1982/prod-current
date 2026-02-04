import { test, expect } from '@playwright/test';

const RECORD_TYPES = [
  {
    name: 'baptism',
    listUrl: '/apps/records/baptism',
    apiBase: '/api/baptism-records',
    requiredFields: {
      firstName: 'E2ETest',
      lastName: 'Baptism',
      dateOfBaptism: '2024-06-15',
    },
    editField: { key: 'lastName', value: 'BaptismEdited' },
  },
  {
    name: 'marriage',
    listUrl: '/apps/records/marriage',
    apiBase: '/api/marriage-records',
    requiredFields: {
      groomFirstName: 'E2EGroom',
      groomLastName: 'Test',
      brideFirstName: 'E2EBride',
      brideLastName: 'Test',
      dateOfMarriage: '2024-07-20',
    },
    editField: { key: 'groomLastName', value: 'TestEdited' },
  },
  {
    name: 'funeral',
    listUrl: '/apps/records/funeral',
    apiBase: '/api/funeral-records',
    requiredFields: {
      firstName: 'E2ETest',
      lastName: 'Funeral',
      dateOfDeath: '2024-08-10',
      dateOfFuneral: '2024-08-13',
    },
    editField: { key: 'lastName', value: 'FuneralEdited' },
  },
] as const;

for (const record of RECORD_TYPES) {
  test.describe(`${record.name} records CRUD`, () => {
    let createdId: string | undefined;

    test('list page renders table', async ({ page }) => {
      await page.goto(record.listUrl);
      // Table or data grid should be visible
      await expect(
        page.locator('table, [role="grid"], .MuiDataGrid-root').first(),
      ).toBeVisible({ timeout: 15_000 });
    });

    test('create record', async ({ page }) => {
      await page.goto(record.listUrl);

      // Intercept POST to capture created ID
      const postPromise = page.waitForResponse(
        (res) =>
          res.url().includes(record.apiBase) &&
          res.request().method() === 'POST' &&
          res.status() < 400,
      );

      // Click "Add Record" button
      await page.getByRole('button', { name: /add record/i }).click();

      // Wait for dialog / form
      await expect(
        page.locator('[role="dialog"], form').first(),
      ).toBeVisible();

      // Fill required fields
      for (const [field, value] of Object.entries(record.requiredFields)) {
        const input = page.locator(
          `input[name="${field}"], #${field}, [data-testid="${field}"]`,
        );
        if (await input.isVisible()) {
          await input.fill(String(value));
        }
      }

      // Submit
      await page.getByRole('button', { name: /save|submit|add/i }).click();

      const postResponse = await postPromise;
      const body = await postResponse.json();
      createdId = body?.data?.id ?? body?.id ?? body?.insertId;

      expect(postResponse.ok()).toBeTruthy();
    });

    test('edit record', async ({ page }) => {
      test.skip(!createdId, 'No record was created to edit');

      await page.goto(record.listUrl);

      // Intercept PUT
      const putPromise = page.waitForResponse(
        (res) =>
          res.url().includes(record.apiBase) &&
          res.request().method() === 'PUT' &&
          res.status() < 400,
      );

      // Click the first edit button/icon in the table
      await page
        .locator(
          'button:has([data-testid="EditIcon"]), button[aria-label="edit"], [data-testid="edit-button"]',
        )
        .first()
        .click();

      // Wait for edit form
      await expect(
        page.locator('[role="dialog"], form').first(),
      ).toBeVisible();

      // Modify the target field
      const editInput = page.locator(
        `input[name="${record.editField.key}"], #${record.editField.key}`,
      );
      if (await editInput.isVisible()) {
        await editInput.clear();
        await editInput.fill(record.editField.value);
      }

      // Save
      await page.getByRole('button', { name: /save|update|submit/i }).click();

      const putResponse = await putPromise;
      expect(putResponse.ok()).toBeTruthy();
    });

    test('delete record', async ({ page }) => {
      test.skip(!createdId, 'No record was created to delete');

      await page.goto(record.listUrl);

      // Intercept DELETE
      const deletePromise = page.waitForResponse(
        (res) =>
          res.url().includes(record.apiBase) &&
          res.request().method() === 'DELETE' &&
          res.status() < 400,
      );

      // Click the first delete button/icon
      await page
        .locator(
          'button:has([data-testid="DeleteIcon"]), button[aria-label="delete"], [data-testid="delete-button"]',
        )
        .first()
        .click();

      // Confirm deletion if a confirmation dialog appears
      const confirmBtn = page.getByRole('button', {
        name: /confirm|yes|delete/i,
      });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      const deleteResponse = await deletePromise;
      expect(deleteResponse.ok()).toBeTruthy();
    });
  });
}
