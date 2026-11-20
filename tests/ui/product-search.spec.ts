import { test } from '../../src/fixtures/test.js';
import { productSearchCases } from '../data/product-search.data.js';

test.describe('Product search @ui @regression', () => {
  test(productSearchCases.exactName.title, async ({ storePage }) => {
    await storePage.open();
    await storePage.searchFor(productSearchCases.exactName.searchTerm);
    await storePage.expectSearchResultsFor(
      productSearchCases.exactName.searchTerm,
      productSearchCases.exactName.expectedProductName,
    );
  });

  test(productSearchCases.partialName.title, async ({ storePage }) => {
    await storePage.open();
    await storePage.searchFor(productSearchCases.partialName.searchTerm);
    await storePage.expectSearchResultsFor(
      productSearchCases.partialName.searchTerm,
      productSearchCases.partialName.expectedProductName,
    );
  });

  test(productSearchCases.mixedCase.title, async ({ storePage }) => {
    await storePage.open();
    await storePage.searchFor(productSearchCases.mixedCase.searchTerm);
    await storePage.expectSearchResultsFor(
      productSearchCases.mixedCase.searchTerm,
      productSearchCases.mixedCase.expectedProductName,
    );
  });

  test(productSearchCases.paddedTerm.title, async ({ storePage }) => {
    await storePage.open();
    await storePage.searchFor(productSearchCases.paddedTerm.searchTerm);
    await storePage.expectSearchResultsFor(
      productSearchCases.paddedTerm.searchTerm,
      productSearchCases.paddedTerm.expectedProductName,
    );
  });

  test(productSearchCases.noMatch.title, async ({ storePage }) => {
    await storePage.open();
    await storePage.searchFor(productSearchCases.noMatch.searchTerm);
    await storePage.expectNoSearchResultsFor(productSearchCases.noMatch.searchTerm);
  });

  test('returns to the full catalog when the search is cleared', async ({ storePage }) => {
    await storePage.open();
    await storePage.searchFor(productSearchCases.exactName.searchTerm);
    await storePage.expectSearchResultsFor(
      productSearchCases.exactName.searchTerm,
      productSearchCases.exactName.expectedProductName,
    );

    await storePage.searchFor('');
    await storePage.expectCatalogResults();
  });
});
