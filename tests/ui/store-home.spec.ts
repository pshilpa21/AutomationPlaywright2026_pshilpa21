import { test, expect } from '../../src/fixtures/test.js';

test.describe('Juice Shop storefront @ui @smoke', () => {
  test('loads the store and displays its product catalog', async ({ storePage, page }) => {
    await storePage.open();
    await storePage.expectStoreLoaded();
    await expect(page.locator('mat-card')).not.toHaveCount(0);
  });
});
