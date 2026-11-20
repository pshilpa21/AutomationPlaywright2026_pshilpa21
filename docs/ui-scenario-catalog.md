# Juice Shop UI Scenario Catalogue

The UI phase now contains a broad, risk-based suite of 20 scenarios across storefront, search, basket, account access, and checkout. The aim is to protect key user journeys and common boundaries; every possible input permutation is unbounded and belongs in targeted data-driven cases where risk justifies it.

## Implemented scenarios

| Area | Scenario |
| --- | --- |
| Store | Storefront opens and catalog is displayed |
| Search | Full name, partial name, mixed case, padded spaces, no matches, and clear search |
| Product details | Open a product detail dialog; check name, price, reviews section, close back to catalog |
| Catalog | Move to the next page and return; render products at a narrow mobile viewport |
| Basket | Add product; increase/decrease quantity; remove final product and check empty state; keep different products on separate lines; recalculate total; retain guest basket after reload |
| Account | Prevent submitting an empty login form |
| Guest checkout | Redirect to login while retaining basket destination; reject invalid credentials |
| Signed-in checkout | Register a unique user, add an address and synthetic payment card, complete purchase, and verify confirmation |

## Next UI additions

- Registration required-field and duplicate-account validation.
- Valid and invalid login, logout, and session-state coverage.
- Address and payment validation boundaries, order history, and totals across checkout steps.
- Automated axe scans of the storefront, search results, product detail dialog, basket, and login page (separate accessibility project).
- Manual keyboard navigation, focus order, screen-reader behavior, zoom, and reflow checks on critical journeys.
- Browser compatibility projects once the single-browser suite is stable.
- Additional mobile viewport checks for basket and checkout layouts.

## Separate testing phases

- Implemented API coverage is tracked in [api-scenario-catalog.md](api-scenario-catalog.md).
- Security testing should use a dedicated, safe profile against the local Juice Shop training target.
- Performance tests need an isolated target and workload; browser test duration is not a performance metric.
- Native mobile testing requires a device or emulator runner. Playwright responsive browser checks are not native app tests.

## Interview explanation

Describe this as a risk-based UI regression suite. Test data is separate from test logic, page objects keep UI operations reusable, and Playwright's auto-waiting assertions avoid fixed sleeps. Playwright creates an isolated browser context per test; the Juice Shop server and its database remain shared, so tests that create accounts or orders use unique data and the local run uses one worker. AI scenario drafting and failure triage assist the engineer, while deterministic Playwright assertions decide pass or fail.
