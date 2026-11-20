import { test } from '../../src/fixtures/test.js';

test.describe('Account access @ui @regression', () => {
  test('does not allow an empty login form to be submitted', async ({ storePage, accountPage }) => {
    await storePage.open();
    await accountPage.openLoginFromHeader();
    await accountPage.expectEmptyLoginFormCannotSubmit();
  });
});
