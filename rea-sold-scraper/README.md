# REA sold scraper

The extension remains available for interactive runs. For unattended collection, use the headless runner from the repository root:

```powershell
corepack pnpm scrape:rea -- --plan collection-plan.json
```

The runner uses a persistent Chromium profile, so authentication or consent can be established once with a headed run:

```powershell
corepack pnpm scrape:rea -- --plan collection-plan.json --headed
```

Each slice resumes from `outputDirectory/<slice-id>.state.json` and appends records to `outputDirectory/<slice-id>.jsonl`. A completed slice is skipped on later runs; use `--restart true` to start that slice again.

If headless Chromium receives HTTP 429 while the normal extension session works, use `--headed` with the same persistent profile. The runner does not attempt to bypass a site challenge; it honors `Retry-After` when supplied, backs off for 30/60/120 seconds, and leaves the slice paused if the limit persists.

Rate-limit controls are deliberately conservative:

- one browser page and one in-flight request by default;
- at most 45 records/second budget, reserving a 50-record page slot;
- the plan's 5-second page delay is jittered by ±20%;
- transient failures retry with exponential backoff, while bot/rate-limit challenge pages pause the slice and preserve the checkpoint.

Useful overrides include `--delay 8000`, `--recordsPerSecond 30`, `--maxPages 20`, and `--output <directory>`. Do not increase concurrency or the request budget without confirming the site's current terms and limits.
