import { juiceShopProducts } from './products.js';

export const productSearchCases = {
  exactName: {
    title: 'returns a matching product for a valid product name',
    searchTerm: juiceShopProducts.appleJuice.searchTerm,
    expectedProductName: juiceShopProducts.appleJuice.name,
  },
  partialName: {
    title: 'finds a product when the shopper enters only part of its name',
    searchTerm: 'Apple',
    expectedProductName: juiceShopProducts.appleJuice.name,
  },
  mixedCase: {
    title: 'search is case-insensitive',
    searchTerm: 'aPpLe jUiCe',
    expectedProductName: juiceShopProducts.appleJuice.name,
  },
  paddedTerm: {
    title: 'ignores leading and trailing spaces in the search term',
    searchTerm: '  Apple Juice  ',
    expectedProductName: juiceShopProducts.appleJuice.name,
  },
  noMatch: {
    title: 'shows a clear empty state when no product matches',
    searchTerm: 'product-name-that-does-not-exist',
  },
} as const;
