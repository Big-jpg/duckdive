# Review the Price Frontier evidence

This gallery presents nine review-safe derivatives from the 11 August 2026 Price Frontier session. It shows the progression from an ordinary report to a generalized price-mileage frontier without requiring live MotherDuck access.

The original 52 screenshots remain outside Git. Every derivative is re-encoded without source metadata, and table identity columns are masked or excluded. Assets 04, 05, 07, 08, and 09 combine observed screenshot fragments; they are editorial composites, not reconstructed report output.

## 1. Start with a conventional scatterplot

![Conventional used-vehicle scatterplot with make and model selectors and advertised asking price plotted against odometer](./01-conventional-scatterplot.png)

Observed screenshot. A conventional make-and-model scatterplot compares advertised asking price with odometer without making a valuation claim.

## 2. Change presentation without changing semantics

![Version 8 Market Atlas with Corporate Memphis cards, charts, decorative shapes, and the report summary panel](./02-corporate-memphis-restyle.png)

Observed screenshot. Version 8 applies Corporate Memphis styling while retaining current-market measures and charts.

## 3. Parameterize make and model

![Version 12 Ford Ranger Atlas with independent Ford make and Ranger model selectors, cohort counts, and price and odometer distributions](./03-parameterized-ford-ranger.png)

Observed screenshot. Version 12 scopes the report to Ford Ranger and exposes make and model as separate selectors.

## 4. Add a cohort-relative candidate rule

![Redacted version 13 low-asking-price table beside the saved change panel that confirms same-model year-window cohorts and a minimum cohort size](./04-cohort-relative-price-filter.png)

Composite of observed screenshots. Version 13 adds cohort-relative candidate filtering and records its saved validation state; source listing identifiers are redacted.

## 5. Add mileage context without estimating value

![Redacted version 14 table that adds odometer cohort size, median odometer, and distance from the median beside its validation panel](./05-mileage-aware-investigation.png)

Composite of observed screenshots. Version 14 adds cohort-relative odometer context while the validation panel rejects a valuation model.

## 6. Reduce the first review set

![Redacted version 15 five-row first-pass shortlist with review-order controls, explicit limitations, and the saved change panel](./06-first-pass-shortlist.png)

Observed screenshot with redaction. Version 15 reduces the default review set to five and labels it as data-only triage, not a recommendation.

## 7. Apply the strict price-mileage frontier

![Version 16 Ford Ranger Atlas above frontier rows showing asking price, odometer, local cohort measures, comparable counts, and plain-language survival reasons](./07-price-mileage-frontier.png)

Composite of observed screenshots. Version 16 applies strict two-dimensional dominance and explains why each surviving row remains without weighting price against mileage.

## 8. Change controls to test generalization

![Four-state grid showing Hyundai Getz, Land Rover all models, all makes and models, and Land Rover Range Rover Evoque with different counts and distributions](./08-generalization-grid.png)

Composite of observed screenshots. Independent make and model controls expand and contract the display while each state retains its own counts and distributions.

## 9. Reveal the analytical boundaries

![Three contract panels defining asking price, odometer, cohort position, validation caveats, strict frontier rules, and prohibited valuation and sales claims](./09-contract-and-refusal-boundaries.png)

Composite of observed screenshots. The contract defines measures and cohort rules, states validation caveats, and prohibits valuation, suitability, and sale claims.

## Verify the published assets

Run the credential-free asset check:

```bash
corepack pnpm review:assets
```

The check verifies the derivative set, dimensions, SHA-256 hashes, source-hash records, gallery links, alt text, and absence of Portable Network Graphics (PNG) ancillary metadata. Visual privacy review remains a human gate because listing identifiers can exist as pixels.
