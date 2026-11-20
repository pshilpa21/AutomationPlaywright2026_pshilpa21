# AI First Automation for OWASP Juice Shop

This repository is a TypeScript and Playwright automation framework for OWASP Juice Shop. It includes separate UI and API projects, Docker Compose for a local target, Allure reporting, and an optional AI layer for test planning and failure analysis.

## What AI First means here

AI is part of the framework's test-design and feedback loops, not the authority that decides whether a test passed.

1. `npm run ai:plan -- "..."` turns a plain-language requirement into a schema-validated JSON test draft.
2. A person reviews the draft and turns approved scenarios into maintained Playwright tests.
3. Playwright executes deterministic assertions and records traces, screenshots, video-on-failure, and Allure results.
4. `npm run ai:triage` can analyze a sanitized summary of the latest run and save suggestions for review.

Generated test plans are not executed automatically, AI cannot change source files, and AI triage is opt-in. This keeps model output reviewable and prevents probabilistic text from becoming a pass/fail signal.

The AI adapter uses an OpenAI-compatible Chat Completions endpoint. Configure it in a local `.env`; do not commit keys or test data. The UI and API suites do not require AI credentials.

## Prerequisites

- Node.js 22 or later and npm
- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Git

On Windows, enable Docker Desktop's setting to start Docker when you sign in. The `test:ui` and `test:api` launchers can start Desktop if needed, wait for the engine, bring up Juice Shop, wait until its local web page responds, run the selected project, and generate the Allure report.

## First-time setup

```powershell
cd juiceshop-ai-ui-automation
Copy-Item .env.example .env
npm ci
npm run setup
```

The sample target is published only on `127.0.0.1:3001` by default; it is an intentionally vulnerable training application. Keep it local and do not expose it to a public or production network. If port 3001 is already occupied, set both `JUICE_SHOP_PORT` and `BASE_URL` to another free local port in `.env` (for example, `3002`).

## Run the UI suite

```powershell
npm run test:ui
```

The launcher checks Docker, starts Juice Shop if needed, waits for its HTTP page to respond, clears stale run outputs, executes Playwright, and generates both Playwright's HTML report and the Allure report. It leaves the target container running for quick reruns.

## Run the API suite

```powershell
npm run test:api
```

The API project uses Playwright's API request fixture, runtime response schemas, request chaining, negative validation, access-control checks, and a local response-time budget. It runs independently from UI tests and produces the same HTML and Allure reports.

## Run UI and API tests in parallel

```powershell
npm run test:parallel
```

The Playwright config enables test-level parallel execution with two workers by default. UI tests receive an isolated browser context per test, API tests receive an isolated request context, and scenarios that create users use unique synthetic data. The `accessibility` and `compatibility` projects use the same worker setting when run. Set `PLAYWRIGHT_WORKERS` to a positive integer to tune concurrency, or use `--workers=1` to diagnose a failure serially. Increase workers only when the machine and local app can handle the extra load.

The API suite checks the target's observed pagination behavior: `offset` skips products, but `limit` does not cap the response. Product-page navigation remains covered by the UI suite.

Run a single API spec or case:

```powershell
npm run test:api -- tests/api/products.spec.ts
npm run test:api -- tests/api/products.spec.ts -g "searches by full product name"
```

## Run automated accessibility checks

```powershell
npm run test:a11y
npm run test:a11y:headed
```

This separate Playwright project scans representative storefront states with axe and attaches detailed JSON findings to the reports. A clean automated scan is not WCAG conformance; read the [accessibility testing guide](docs/accessibility-testing-guide.md) for manual checks and team responsibilities.

## Run compatibility checks

```powershell
npm run setup:compat:browsers
npm run test:compat
```

The compatibility suite runs representative catalog, search, and basket journeys in Chromium, Firefox, and WebKit at a desktop viewport, plus Chromium with a mobile viewport and touch enabled. It also checks that the first product card fits within the configured viewport. Browser binaries are a one-time install; the normal `test:compat` launcher starts the local Juice Shop target and generates the reports.

## Run performance checks

```powershell
npm run test:perf:smoke
npm run test:perf:load
npm run test:perf:stress
npm run test:perf:spike
npm run test:perf:soak
```

These k6 profiles run in Docker against Juice Shop's product API flow. Docker Compose manages the private connection between k6 and the target, and each run saves a timestamped visual HTML report and raw JSON summary under `artifacts/performance/`. Start with smoke; the other profiles send more traffic. See [the k6 performance guide](tests/performance/README.md) for a brief description of each profile and its starter thresholds.

After a run, use the printed report filename or sort `artifacts/performance/` by Date modified and open the newest `*-report.html` in VS Code or your browser. Previous reports are retained.

## Run security checks

```powershell
npm run test:security
```

The security profile runs a ZAP passive baseline scan, a ZAP active full scan, and an npm dependency audit. ZAP reports are written as timestamped HTML and JSON files under `artifacts/security/`; the dependency audit is saved as timestamped JSON. Use the baseline scan alone for passive findings, the full scan for active checks, or the dependency command independently. Read [the security testing guide](tests/security/README.md) before using the active scan.

Useful commands:

```powershell
npm run test:ui:headed
npm run test:api:raw
npm run env:status
npm run env:logs
npm run env:stop
npm run allure:open
npm run typecheck
```

To run AI failure analysis after a failing test run, configure `AI_BASE_URL` and `AI_MODEL` in `.env`, then use:

```powershell
npm run test:ui:ai
```

To analyze the latest run separately:

```powershell
npm run ai:triage
```

To create a reviewable scenario draft:

```powershell
npm run ai:plan -- "As a shopper, I can find a product and verify that it appears in the catalog"
```

AI analysis may send failure summaries to the configured model provider. Review the provider and data-handling policy before enabling it for private applications.

## Framework layout

```text
compose.yaml                 Local Juice Shop target and optional k6 runner
playwright.config.ts         Browser, timeouts, artifacts, reporters
tests/ui/                    Deterministic UI checks
tests/api/                   API contract, validation, auth, and behavior checks
tests/accessibility/         Automated axe scans of key rendered UI states
tests/compatibility/         Cross-browser and responsive UI checks
tests/performance/           k6 HTTP workloads and profile guide
tests/security/              ZAP DAST and dependency scan guide
src/fixtures/                Shared Playwright test fixtures
src/pages/                   Page objects for business-facing UI concepts
src/api/                     Typed API clients and runtime response schemas
src/ai/                      AI provider, validated scenario planner, failure triage
src/reporting/               Structured run summary for optional AI analysis
scripts/run-ui.ts             Docker bootstrap, test execution, Allure generation
scripts/run-performance.ts    Docker bootstrap and k6 profile execution
scripts/run-security.ts       Local ZAP scans and dependency audit
generated-drafts/             AI scenario drafts (git-ignored)
allure-results/               Raw Allure data (git-ignored)
allure-report/                Generated Allure site (git-ignored)
```

## Why UI first, and what comes next

Starting with one UI vertical slice is a reasonable learning path. Keep the foundation small and prove the test target, local bootstrap, artifacts, and reporting before adding abstractions for test types that do not exist yet.

Suggested order:

1. Continue learning the UI, API, accessibility, and compatibility profiles already in the framework.
2. Learn k6 fundamentals and refine the performance scenarios and thresholds against documented service objectives.
3. Add database assertions and data lifecycle helpers for reliable test setup.
4. Add native mobile coverage with a dedicated Appium runner.
5. Add security scans and review workflows, followed by usability activities that combine automation with human evaluation.
6. Integrate Jenkins after local commands, configuration, secrets, and reports are stable. CI should start an isolated target environment and always archive reports and failure evidence.

Security tests against Juice Shop must remain in this local, authorized training environment. Performance workloads should be conservative unless the target is a dedicated test deployment.

## Current scope

Implemented now: browser UI checks, API checks, automated accessibility scans, browser/viewport compatibility checks, starter k6 performance profiles, and automated security scans. Manual accessibility evaluation, native mobile, usability, database checks, Jenkins, and repository publishing remain follow-on phases.
