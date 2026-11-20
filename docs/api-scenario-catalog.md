# Juice Shop API Scenario Catalogue

The API project currently contains 19 deterministic scenarios. It covers stable, user-relevant API behavior and avoids intentionally exploiting Juice Shop vulnerabilities in ordinary functional regression.

| Area | Coverage |
| --- | --- |
| Product collection | Success status, JSON content type, non-empty collection, Zod schema validation |
| Product detail | Request chaining from list response ID to detail response, contract and field consistency |
| Product search | Full and partial terms, no-match behavior, empty and omitted query, long-query boundary |
| Pagination | Characterizes the local target: `offset` skips records, while `limit` is ignored and does not cap page size |
| Authentication | Invalid and missing credentials, valid login response schema, token and basket-ID chaining into an authenticated request |
| Authorization | Basket endpoint rejects requests without a bearer token |
| Account lifecycle | Register unique customer, reject duplicate email, authenticate and read the current profile |
| Basket lifecycle | Reject over-stock quantity, add/update/read/delete a basket item, and verify the basket is empty afterward |
| Checkout lifecycle | Create synthetic address and payment data, place an order, and confirm it in the user's order history |
| Request validation | Empty required user registration credentials and login without a password are rejected |
| Reference data | Security question and delivery method JSON responses |
| Headers and timing | JSON content-type checks and a 5-second local product-list response budget |

## Pagination note

The local Juice Shop target accepts `offset` and skips records, but the API test run showed that `limit` does not restrict the result count. This is only partial pagination: callers can skip ahead but cannot request a bounded page size. The API test captures that observed behavior rather than claiming complete pagination. If the application later supports a page-size parameter, add page-size, offset, ordering, invalid-boundary, and total-count assertions.

## Interview explanation

Playwright's `APIRequestContext` sends HTTP requests without launching a browser. The suite checks status codes and headers, parses response bodies with Zod schemas, chains IDs and bearer tokens from one response into the next call, and validates positive, negative, and end-to-end service paths. Read-only checks use a seeded training account; write workflows generate unique customers and synthetic payment data. Juice Shop does not expose a safe user-delete API, so generated test accounts remain in the local disposable target. The response-time check is a lightweight local smoke budget, not a load or performance test.

## Later API coverage

- Contract snapshots or OpenAPI validation if an authoritative API specification becomes available.
- Broader authorization matrix across customer, accounting, and admin roles.
- Rate limiting and exploit-oriented security testing in a separate controlled security phase.
- Resilience checks for timeouts, malformed upstream responses, and service unavailability where the target supports deterministic fault injection.
