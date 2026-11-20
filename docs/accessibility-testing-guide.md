# Accessibility Testing Guide for QA Interviews

## What accessibility testing checks

Accessibility testing checks whether people with disabilities can perceive, understand, navigate, and operate a digital product. It is a quality attribute of the user interface, and it should be considered in requirements, design, implementation, and testing.

A useful way to remember the Web Content Accessibility Guidelines (WCAG) principles is **POUR**:

| Principle | Meaning | Example check |
| --- | --- | --- |
| Perceivable | Users can perceive the information | Text and controls have adequate contrast; meaningful images have text alternatives |
| Operable | Users can operate the interface | Main actions work from a keyboard and focus is visible |
| Understandable | Users can understand the interface | Labels, instructions, navigation, and validation messages are clear |
| Robust | Assistive technology can interpret the interface | Controls expose appropriate names, roles, and states |

WCAG 2.2 is a W3C Recommendation. An organization chooses the exact conformance target and scope based on product commitments and applicable requirements; WCAG 2.2 AA is a common target, but the automation in this project does **not** establish WCAG conformance. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Why teams test accessibility

Accessibility checks find barriers that can prevent people from using important journeys, such as searching for a product, signing in, editing a form, or completing checkout. They help teams include more customers and catch problems earlier, when they are easier to fix. Accessibility testing also supports a product's agreed standards and customer or regulatory requirements; QA should not assume that one standard or legal requirement applies to every organization.

## Who is responsible

Accessibility is shared across the product team. QA helps provide evidence and repeatable checks; QA is not the only owner.

| Role | Typical responsibility |
| --- | --- |
| Product owner / accessibility lead | Defines the target, product scope, and how issues are prioritized |
| Designer | Designs readable contrast, clear focus, understandable labels, and accessible interaction patterns |
| Developer | Implements semantic markup, names, roles, states, keyboard support, and accessible error handling |
| QA / automation engineer | Tests key journeys, runs automated scans, performs keyboard checks, records evidence, and verifies fixes |
| Accessibility specialist | Advises on complex WCAG criteria, assistive technology, and formal evaluation |
| Users with disabilities | Give the team real-world feedback through inclusive usability sessions |

## What the automation can cover

The project uses `@axe-core/playwright` to scan rendered browser states against selected WCAG A and AA rule tags. The automated scenarios scan:

1. Storefront and product catalog.
2. Search results.
3. Product details dialog.
4. Basket.
5. Login page.

Depending on the markup and state, axe can flag issues such as missing accessible names, some label and ARIA errors, duplicate IDs, and some contrast problems. Every scan attaches a JSON result to the test report, including the rule, impact, guidance link, affected elements, passes, and checks that need review.

Automated testing only finds a subset of accessibility problems. It cannot decide whether instructions make sense, whether focus order is logical, whether a screen-reader announcement is useful, or whether a disabled person can complete a journey comfortably. W3C and Playwright both recommend combining automated checks with manual evaluation and user testing. [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) · [W3C evaluation tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/)

## Manual checks QA should add

Use a short, repeatable manual checklist on the highest-risk flows:

- **Keyboard only:** Tab through the flow, confirm a visible focus indicator, use Enter and Space on controls, and check that focus is not trapped or lost.
- **Screen reader:** With the team's supported screen reader and browser, verify page title, headings, landmarks, field labels, required state, error association, dialog name, and status announcements.
- **Zoom and reflow:** Increase zoom and text size; check that content remains readable and actions do not disappear or require unnecessary horizontal scrolling.
- **Color and non-color cues:** Confirm text and controls are distinguishable and meaning is not conveyed by color alone.
- **Forms and errors:** Submit invalid data and verify users can identify the affected field and understand how to correct it.
- **Journey completion:** Complete search, login, basket, and checkout with keyboard and assistive technology; a page scan alone does not verify the whole process.

These checks need judgment. A tester can be trained to perform many of them, but formal conformance assessments may require an accessibility specialist and representative user testing.

## How this project is organized

Accessibility runs as a separate **Playwright project** named `accessibility`, similar in purpose to a Maven profile: it selects a focused set of tests and can run them separately. It is not a new application or a guarantee of compliance. The tests use the same local Juice Shop app, browser automation framework, Docker startup, and Allure reporting as the other projects.

Test source: `tests/accessibility/storefront-accessibility.spec.ts`  
Project configuration: `playwright.config.ts`  
Test command: `npm run test:a11y`

The accessibility project defaults to headless execution, like a CI job. To see Chromium running, use:

```powershell
npm run test:a11y:headed
```

To run one scenario:

```powershell
npm run test:a11y -- tests/accessibility/storefront-accessibility.spec.ts -g "search results"
```

Open `allure-report` or the Playwright HTML report after the run to inspect results. If a test fails, open its axe JSON attachment, identify the rule and affected element, reproduce the state in the headed browser, and file or fix the issue with the developer/product team. Do not silence a rule merely to turn the run green; confirm a false positive or an approved exception and document its scope and owner.

## Reading a finding

An axe violation includes:

- **Rule ID and help:** What was detected and the rule's remediation guidance.
- **Impact:** Axe's estimate of impact (for example, critical, serious, moderate, or minor); this helps prioritize but is not the team's full risk assessment.
- **Affected elements:** CSS/DOM targets and a failure explanation.
- **Help URL:** Further explanation of the rule.

An axe result marked **incomplete** needs human review; it is neither a confirmed pass nor a confirmed violation. The report attachment includes these checks so they are not mistaken for a clean result.

## Important limits

- This suite checks selected pages and states, not every page, route, state, or WCAG success criterion.
- A passing axe scan means no violations were found by the selected rules in that scanned state; it does not mean the application is accessible or WCAG-conformant.
- Existing Juice Shop issues may cause failures. Treat them as findings to inspect, not as timing flakiness. Agree on any baseline with the team before suppressing issues.
- The automated scan is not a load test, security assessment, native mobile screen-reader test, or substitute for manual keyboard and assistive-technology testing.

## Interview answer to memorize

> “I treat accessibility as a shared quality responsibility. I align testing to the product's agreed WCAG target, scan important UI states with axe in Playwright, and attach rule-level results to the report. I also manually test keyboard operation, focus order, zoom/reflow, and screen-reader behavior on key user journeys. Automated checks catch common issues, but a clean scan alone does not establish accessibility or WCAG conformance, so I work with developers, designers, accessibility specialists, and users with disabilities.”
