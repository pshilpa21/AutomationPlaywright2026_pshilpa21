# Performance testing with k6

This profile uses k6 to send HTTP traffic to the local Juice Shop container. Docker Compose runs k6 on the same private network as the target, so it can reach Juice Shop by its Compose service name. You do not need to install k6 on your computer.

## Run a profile

```powershell
npm run test:perf:smoke
npm run test:perf:load
npm run test:perf:stress
npm run test:perf:spike
npm run test:perf:soak
```

`npm run test:perf` is an alias for smoke. The launcher starts Docker Desktop when available, brings up Juice Shop, runs k6, and saves both a visual HTML report and the raw JSON summary under `artifacts/performance/`. Each filename includes the profile and run timestamp, so later runs do not overwrite earlier results.

## Profiles included

- **Smoke:** one virtual user for 10 seconds to check that the script and target work.
- **Load:** five virtual users with a short ramp up, steady period, and ramp down.
- **Stress:** gradually increases to 15 virtual users to observe behavior as load rises.
- **Spike:** quickly jumps to 20 virtual users, holds briefly, then returns to zero.
- **Soak:** three virtual users for two minutes as a short starter endurance run.

Each profile requests `GET /api/Products`, checks for HTTP 200 and JSON, and applies starter thresholds of fewer than 1% failed requests and a 95th percentile response time below one second. The HTML report presents request rate, latency percentiles, failed-request rate, checks, virtual users, and threshold outcomes. These are practice thresholds, not production service objectives. Set thresholds from agreed non-functional requirements before using results as a release gate.

Run performance tests only against the local training target or an environment specifically approved for load testing. Stress, spike, and soak profiles intentionally send more traffic than smoke.
