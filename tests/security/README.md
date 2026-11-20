# Security testing

The security profile combines dynamic application security testing (DAST) of the local Juice Shop container with a dependency audit of this automation project.

## Run the complete profile

```powershell
npm run test:security
```

This starts the local target if needed, then runs the scans below. Reports include a timestamp so later runs keep earlier results in `artifacts/security/`.

## Run an individual scan

```powershell
npm run test:security:baseline
npm run test:security:full
npm run test:security:dependencies
```

- **ZAP baseline:** spiders the local site and checks responses passively. It does not send attack payloads. The run is time-limited and produces HTML and JSON reports.
- **ZAP full:** spiders the local site and runs active scan rules. Active scans send attack-like requests and can change application state; this command is hard-wired to the local Juice Shop Compose service and should not be pointed at public or production sites.
- **Dependency audit:** checks the framework's npm dependency lockfile for known advisories at high severity or above. It audits the automation project dependencies, not Juice Shop's container dependencies.

ZAP's packaged scans report findings as warnings by default. The runner keeps those warnings in the reports without treating them as a clean bill of health. Review finding severity, confidence, affected URL, and evidence; verify suspected issues manually before calling them confirmed vulnerabilities. A completed scan only means the scanner ran.

The ZAP scan is unauthenticated, so routes behind login may not be discovered. This is automated DAST coverage, not a penetration test or a replacement for code review, SAST, threat modeling, or manual security testing. Juice Shop is intentionally vulnerable; findings are expected. The local-only target and Compose network keep the active scan scoped to this training project.
