import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test.js';
import { juiceShopProducts } from '../data/products.js';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scanAccessibility(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const report = {
    url: page.url(),
    wcagTags,
    violations: results.violations.map(({ id, impact, help, helpUrl, nodes }) => ({
      id,
      impact,
      help,
      helpUrl,
      affectedElements: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
    passes: results.passes.length,
    incomplete: results.incomplete.map(({ id, impact, help, helpUrl }) => ({ id, impact, help, helpUrl })),
  };

  await testInfo.attach('axe-accessibility-results', {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: 'application/json',
  });

  expect(
    report.violations,
    `Axe found accessibility violations. Review the axe-accessibility-results attachment for affected elements and remediation guidance.\n${JSON.stringify(report.violations, null, 2)}`,
  ).toEqual([]);
}

test.describe('Automated accessibility checks @a11y @regression', () => {
  test('storefront has no automatically detectable WCAG A/AA violations', async ({ storePage, page }, testInfo) => {
    await storePage.open();
    await storePage.expectStoreLoaded();
    await scanAccessibility(page, testInfo);
  });

  test('product search results have no automatically detectable WCAG A/AA violations', async ({ storePage, page }, testInfo) => {
    await storePage.open();
    await storePage.searchFor('Apple');
    await storePage.expectSearchResultsFor('Apple', juiceShopProducts.appleJuice.name);
    await scanAccessibility(page, testInfo);
  });

  test('product details dialog has no automatically detectable WCAG A/AA violations', async ({ storePage, productDetailsPage, page }, testInfo) => {
    await storePage.open();
    await storePage.openProductDetails(juiceShopProducts.appleJuice.name);
    await productDetailsPage.expectProductDetails(
      juiceShopProducts.appleJuice.name,
      juiceShopProducts.appleJuice.priceText,
    );
    await scanAccessibility(page, testInfo);
  });

  test('basket has no automatically detectable WCAG A/AA violations', async ({ storePage, basketPage, page }, testInfo) => {
    await storePage.open();
    await storePage.addProductToBasket(juiceShopProducts.appleJuice.name);
    await storePage.openBasket();
    await basketPage.expectProductQuantity(juiceShopProducts.appleJuice.name, 1);
    await scanAccessibility(page, testInfo);
  });

  test('login page has no automatically detectable WCAG A/AA violations', async ({ storePage, accountPage, page }, testInfo) => {
    await storePage.open();
    await accountPage.openLoginFromHeader();
    await scanAccessibility(page, testInfo);
  });
});
