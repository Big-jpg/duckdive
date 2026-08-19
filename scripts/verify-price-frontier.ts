import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DuckDBInstance } from "@duckdb/node-api";

type NullableNumber = number | null;

type Listing = {
  listingId: string;
  make: string;
  model: string;
  manufacturerYear: number;
  advertisedAskingPrice: NullableNumber;
  odometerKm: NullableNumber;
};

type ListingSeed = Omit<Listing, "make" | "model" | "manufacturerYear"> & {
  make?: string;
  model?: string;
  manufacturerYear?: number;
};

type FillerSpec = {
  count: number;
  advertisedAskingPriceStart: number;
  advertisedAskingPriceStep: number;
  odometerKmStart: number;
  odometerKmStep: number;
  manufacturerYear?: number;
};

type FixtureGroup = {
  id: string;
  make: string;
  model: string;
  manufacturerYear: number;
  listings: ListingSeed[];
  fillers?: FillerSpec;
};

type EvaluationStatus =
  | "WITHHELD_COHORT_BELOW_MINIMUM"
  | "NOT_BELOW_COHORT_P25"
  | "REMOVED_STRICT_DOMINATOR"
  | "SURVIVES_FRONTIER";

type SurvivalReason =
  | "NO_CHEAPER_PEER"
  | "NO_LOWER_MILEAGE_PEER"
  | "CHEAPER_AND_LOWER_MILEAGE_ARE_DIFFERENT_LISTINGS";

type EvaluationRow = Omit<Listing, "advertisedAskingPrice" | "odometerKm"> & {
  advertisedAskingPrice: number;
  odometerKm: number;
  cohortSize: number;
  cohortPriceP25: NullableNumber;
  priceGap: NullableNumber;
  candidateEligible: boolean;
  cheaperPeerCount: NullableNumber;
  lowerMileagePeerCount: NullableNumber;
  strictDominatorCount: NullableNumber;
  evaluationStatus: EvaluationStatus;
  survivalReason: SurvivalReason | null;
};

type FrontierRow = Omit<
  EvaluationRow,
  "candidateEligible" | "strictDominatorCount" | "evaluationStatus"
>;

type EvaluationScenario = {
  id: string;
  kind: "evaluation";
  listingId: string;
  expected: Partial<EvaluationRow>;
};

type AbsentScenario = {
  id: string;
  kind: "absent";
  listingId: string;
};

type IgnoredDominatorScenario = {
  id: string;
  kind: "ignored-strict-dominator";
  listingId: string;
  peerListingId: string;
};

type DisplayScenario = {
  id: string;
  make: string | null;
  model: string | null;
  expectedListingIds?: string[];
  expectedIncludedListingIds?: string[];
};

type Fixture = {
  schemaVersion: number;
  evidenceClass: string;
  description: string;
  groups: FixtureGroup[];
  evaluationScenarios: Array<
    EvaluationScenario | AbsentScenario | IgnoredDominatorScenario
  >;
  displayScenarios: DisplayScenario[];
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const fixturePath = path.join(
  rootDirectory,
  "fixtures/case-studies/price-mileage-frontier.json",
);
const sqlPath = path.join(
  rootDirectory,
  "db/case-studies/price-mileage-frontier.sql",
);

const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
const referenceSql = await readFile(sqlPath, "utf8");

assert.equal(fixture.schemaVersion, 1, "unsupported fixture schema");
assert.equal(fixture.evidenceClass, "reference reconstruction");
assert.ok(fixture.description.includes("Synthetic"));
assert.ok(referenceSql.includes("Evidence class: reference reconstruction"));

const requiredScenarioIds = new Set([
  "strict-dominator-removes-candidate",
  "equal-asking-price-does-not-dominate",
  "equal-odometer-does-not-dominate",
  "separate-cheaper-and-lower-mileage-peers-do-not-dominate",
  "different-model-cannot-dominate",
  "same-model-outside-year-window-cannot-dominate",
  "cohort-below-ten-withholds-candidate-rule",
  "null-price-cannot-enter-frontier",
  "null-odometer-cannot-enter-frontier",
  "cross-model-strictly-lower-listing-cannot-dominate",
  "make-all-unions-model-local-frontiers",
  "all-all-preserves-model-local-frontiers",
]);
const actualScenarioIds = new Set([
  ...fixture.evaluationScenarios.map((scenario) => scenario.id),
  ...fixture.displayScenarios.map((scenario) => scenario.id),
]);
assert.deepEqual(actualScenarioIds, requiredScenarioIds, "fixture scenario set changed");

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const assertListing = (listing: Listing) => {
  assert.match(listing.listingId, /^[a-z0-9-]+$/);
  assert.ok(listing.make.length > 0);
  assert.ok(listing.model.length > 0);
  assert.ok(Number.isInteger(listing.manufacturerYear));
  assert.ok(
    listing.advertisedAskingPrice === null ||
      isFiniteNumber(listing.advertisedAskingPrice),
  );
  assert.ok(listing.odometerKm === null || isFiniteNumber(listing.odometerKm));
};

const expandFixture = (groups: FixtureGroup[]): Listing[] => {
  const listings: Listing[] = [];
  for (const group of groups) {
    assert.match(group.id, /^[a-z0-9-]+$/);
    assert.ok(group.make.length > 0 && group.model.length > 0);
    assert.ok(Number.isInteger(group.manufacturerYear));

    for (const seed of group.listings) {
      listings.push({
        listingId: seed.listingId,
        make: seed.make ?? group.make,
        model: seed.model ?? group.model,
        manufacturerYear: seed.manufacturerYear ?? group.manufacturerYear,
        advertisedAskingPrice: seed.advertisedAskingPrice,
        odometerKm: seed.odometerKm,
      });
    }

    if (group.fillers) {
      const filler = group.fillers;
      assert.ok(Number.isInteger(filler.count) && filler.count >= 0);
      for (let index = 0; index < filler.count; index += 1) {
        listings.push({
          listingId: `${group.id}-filler-${index + 1}`,
          make: group.make,
          model: group.model,
          manufacturerYear: filler.manufacturerYear ?? group.manufacturerYear,
          advertisedAskingPrice:
            filler.advertisedAskingPriceStart +
            filler.advertisedAskingPriceStep * index,
          odometerKm: filler.odometerKmStart + filler.odometerKmStep * index,
        });
      }
    }
  }

  const ids = new Set<string>();
  for (const listing of listings) {
    assertListing(listing);
    assert.ok(!ids.has(listing.listingId), `duplicate listing ${listing.listingId}`);
    ids.add(listing.listingId);
  }
  return listings;
};

const isComparable = (candidate: Listing, peer: Listing) =>
  candidate.make === peer.make &&
  candidate.model === peer.model &&
  Math.abs(candidate.manufacturerYear - peer.manufacturerYear) <= 2;

const quantileContinuous = (input: number[], quantile: number) => {
  assert.ok(input.length > 0);
  const values = [...input].sort((left, right) => left - right);
  const position = (values.length - 1) * quantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = values[lowerIndex];
  const upper = values[upperIndex];
  assert.ok(lower !== undefined && upper !== undefined);
  return lower + (upper - lower) * (position - lowerIndex);
};

const evaluateInTypeScript = (listings: Listing[]): EvaluationRow[] => {
  const twoDimensionalListings = listings.filter(
    (listing): listing is Listing & {
      advertisedAskingPrice: number;
      odometerKm: number;
    } =>
      listing.advertisedAskingPrice !== null && listing.odometerKm !== null,
  );

  return twoDimensionalListings
    .map((candidate): EvaluationRow => {
      const pricedCohort = listings.filter(
        (peer) =>
          isComparable(candidate, peer) && peer.advertisedAskingPrice !== null,
      );
      const cohortSize = pricedCohort.length;
      const cohortPriceP25 =
        cohortSize >= 10
          ? quantileContinuous(
              pricedCohort.map((peer) => peer.advertisedAskingPrice as number),
              0.25,
            )
          : null;
      const priceGap =
        cohortPriceP25 === null
          ? null
          : cohortPriceP25 - candidate.advertisedAskingPrice;
      const candidateEligible =
        cohortPriceP25 !== null &&
        candidate.advertisedAskingPrice < cohortPriceP25;
      const comparablePeers = candidateEligible
        ? twoDimensionalListings.filter(
            (peer) =>
              peer.listingId !== candidate.listingId &&
              isComparable(candidate, peer),
          )
        : [];
      const cheaperPeerCount = candidateEligible
        ? comparablePeers.filter(
            (peer) =>
              peer.advertisedAskingPrice < candidate.advertisedAskingPrice,
          ).length
        : null;
      const lowerMileagePeerCount = candidateEligible
        ? comparablePeers.filter(
            (peer) => peer.odometerKm < candidate.odometerKm,
          ).length
        : null;
      const strictDominatorCount = candidateEligible
        ? comparablePeers.filter(
            (peer) =>
              peer.advertisedAskingPrice < candidate.advertisedAskingPrice &&
              peer.odometerKm < candidate.odometerKm,
          ).length
        : null;

      let evaluationStatus: EvaluationStatus;
      if (cohortSize < 10) {
        evaluationStatus = "WITHHELD_COHORT_BELOW_MINIMUM";
      } else if (!candidateEligible) {
        evaluationStatus = "NOT_BELOW_COHORT_P25";
      } else if ((strictDominatorCount ?? 0) > 0) {
        evaluationStatus = "REMOVED_STRICT_DOMINATOR";
      } else {
        evaluationStatus = "SURVIVES_FRONTIER";
      }

      let survivalReason: SurvivalReason | null = null;
      if (evaluationStatus === "SURVIVES_FRONTIER") {
        if (cheaperPeerCount === 0) {
          survivalReason = "NO_CHEAPER_PEER";
        } else if (lowerMileagePeerCount === 0) {
          survivalReason = "NO_LOWER_MILEAGE_PEER";
        } else {
          survivalReason = "CHEAPER_AND_LOWER_MILEAGE_ARE_DIFFERENT_LISTINGS";
        }
      }

      return {
        ...candidate,
        cohortSize,
        cohortPriceP25,
        priceGap,
        candidateEligible,
        cheaperPeerCount,
        lowerMileagePeerCount,
        strictDominatorCount,
        evaluationStatus,
        survivalReason,
      };
    })
    .sort((left, right) => left.listingId.localeCompare(right.listingId));
};

const toFrontierRow = (row: EvaluationRow): FrontierRow => ({
  listingId: row.listingId,
  make: row.make,
  model: row.model,
  manufacturerYear: row.manufacturerYear,
  advertisedAskingPrice: row.advertisedAskingPrice,
  odometerKm: row.odometerKm,
  cohortSize: row.cohortSize,
  cohortPriceP25: row.cohortPriceP25,
  priceGap: row.priceGap,
  cheaperPeerCount: row.cheaperPeerCount,
  lowerMileagePeerCount: row.lowerMileagePeerCount,
  survivalReason: row.survivalReason,
});

const filterDisplay = <Row extends { make: string; model: string }>(
  rows: Row[],
  make: string | null,
  model: string | null,
) =>
  rows.filter(
    (row) => (make === null || row.make === make) && (model === null || row.model === model),
  );

const quoteSqlString = (value: string) => `'${value.replaceAll("'", "''")}'`;
const sqlNumber = (value: NullableNumber) =>
  value === null ? "NULL" : String(value);

const createFixtureTableSql = (listings: Listing[]) => {
  const values = listings.map(
    (listing) =>
      `(${quoteSqlString(listing.listingId)}, ${quoteSqlString(listing.make)}, ` +
      `${quoteSqlString(listing.model)}, ${listing.manufacturerYear}, ` +
      `${sqlNumber(listing.advertisedAskingPrice)}, ${sqlNumber(listing.odometerKm)})`,
  );
  return `
    CREATE TABLE governed_current_listings (
      listing_id VARCHAR PRIMARY KEY,
      make VARCHAR NOT NULL,
      model VARCHAR NOT NULL,
      manufacturer_year INTEGER NOT NULL,
      advertised_asking_price DOUBLE,
      odometer_km DOUBLE
    );
    INSERT INTO governed_current_listings VALUES ${values.join(",\n")};
  `;
};

type SqlRow = Record<string, unknown>;

const requiredValue = (row: SqlRow, key: string) => {
  const value = row[key];
  assert.notEqual(value, undefined, `SQL result is missing ${key}`);
  return value;
};

const numberValue = (row: SqlRow, key: string) => {
  const value = requiredValue(row, key);
  assert.ok(typeof value === "number" || typeof value === "bigint", `${key} is not numeric`);
  return Number(value);
};

const nullableNumberValue = (row: SqlRow, key: string) => {
  const value = requiredValue(row, key);
  if (value === null) return null;
  assert.ok(typeof value === "number" || typeof value === "bigint", `${key} is not numeric`);
  return Number(value);
};

const stringValue = (row: SqlRow, key: string) => {
  const value = requiredValue(row, key);
  if (typeof value !== "string") throw new TypeError(`${key} is not text`);
  return value;
};

const nullableStringValue = (row: SqlRow, key: string) => {
  const value = requiredValue(row, key);
  if (value === null) return null;
  if (typeof value !== "string") throw new TypeError(`${key} is not text`);
  return value;
};

const booleanValue = (row: SqlRow, key: string) => {
  const value = requiredValue(row, key);
  if (typeof value !== "boolean") throw new TypeError(`${key} is not boolean`);
  return value;
};

const normalizeSqlEvaluation = (row: SqlRow): EvaluationRow => ({
  listingId: stringValue(row, "listing_id"),
  make: stringValue(row, "make"),
  model: stringValue(row, "model"),
  manufacturerYear: numberValue(row, "manufacturer_year"),
  advertisedAskingPrice: numberValue(row, "advertised_asking_price"),
  odometerKm: numberValue(row, "odometer_km"),
  cohortSize: numberValue(row, "cohort_size"),
  cohortPriceP25: nullableNumberValue(row, "cohort_price_p25"),
  priceGap: nullableNumberValue(row, "price_gap"),
  candidateEligible: booleanValue(row, "candidate_eligible"),
  cheaperPeerCount: nullableNumberValue(row, "cheaper_peer_count"),
  lowerMileagePeerCount: nullableNumberValue(row, "lower_mileage_peer_count"),
  strictDominatorCount: nullableNumberValue(row, "strict_dominator_count"),
  evaluationStatus: stringValue(row, "evaluation_status") as EvaluationStatus,
  survivalReason: nullableStringValue(row, "survival_reason") as SurvivalReason | null,
});

const normalizeSqlFrontier = (row: SqlRow): FrontierRow => ({
  listingId: stringValue(row, "listing_id"),
  make: stringValue(row, "make"),
  model: stringValue(row, "model"),
  manufacturerYear: numberValue(row, "manufacturer_year"),
  advertisedAskingPrice: numberValue(row, "advertised_asking_price"),
  odometerKm: numberValue(row, "odometer_km"),
  cohortSize: numberValue(row, "cohort_size"),
  cohortPriceP25: nullableNumberValue(row, "cohort_price_p25"),
  priceGap: nullableNumberValue(row, "price_gap"),
  cheaperPeerCount: nullableNumberValue(row, "cheaper_peer_count"),
  lowerMileagePeerCount: nullableNumberValue(row, "lower_mileage_peer_count"),
  survivalReason: nullableStringValue(row, "survival_reason") as SurvivalReason | null,
});

const listings = expandFixture(fixture.groups);
const listingById = new Map(listings.map((listing) => [listing.listingId, listing]));
const typeScriptEvaluations = evaluateInTypeScript(listings);
const typeScriptEvaluationById = new Map(
  typeScriptEvaluations.map((row) => [row.listingId, row]),
);
const typeScriptFrontier = typeScriptEvaluations
  .filter((row) => row.evaluationStatus === "SURVIVES_FRONTIER")
  .map(toFrontierRow);

const instance = await DuckDBInstance.create(":memory:", {
  enable_external_access: "false",
  autoinstall_known_extensions: "false",
  autoload_known_extensions: "false",
});
const connection = await instance.connect();

try {
  await connection.run(createFixtureTableSql(listings));
  const statements = referenceSql
    .split(/;\s*(?=CREATE OR REPLACE VIEW)/i)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) await connection.run(statement);

  const sqlEvaluationResult = await connection.runAndReadAll(
    "SELECT * FROM price_mileage_frontier_evaluation ORDER BY listing_id",
  );
  const sqlEvaluations = sqlEvaluationResult
    .getRowObjects()
    .map((row: unknown) => normalizeSqlEvaluation(row as SqlRow));
  assert.deepEqual(
    sqlEvaluations,
    typeScriptEvaluations,
    "DuckDB SQL and TypeScript evaluation rows differ",
  );

  const sqlFrontierResult = await connection.runAndReadAll(
    "SELECT * FROM price_mileage_frontier_reference ORDER BY listing_id",
  );
  const sqlFrontier = sqlFrontierResult
    .getRowObjects()
    .map((row: unknown) => normalizeSqlFrontier(row as SqlRow));
  assert.deepEqual(
    sqlFrontier,
    typeScriptFrontier,
    "DuckDB SQL and TypeScript frontier rows differ",
  );

  for (const scenario of fixture.evaluationScenarios) {
    const actual = typeScriptEvaluationById.get(scenario.listingId);
    if (scenario.kind === "absent") {
      assert.equal(actual, undefined, `${scenario.id}: listing entered the evaluation`);
      continue;
    }

    assert.ok(actual, `${scenario.id}: listing is missing from the evaluation`);
    if (scenario.kind === "evaluation") {
      for (const [key, expected] of Object.entries(scenario.expected)) {
        assert.deepEqual(
          actual[key as keyof EvaluationRow],
          expected,
          `${scenario.id}: ${key} differs`,
        );
      }
      continue;
    }

    const candidate = listingById.get(scenario.listingId);
    const peer = listingById.get(scenario.peerListingId);
    assert.ok(candidate && peer, `${scenario.id}: candidate or peer is missing`);
    assert.ok(
      candidate.advertisedAskingPrice !== null &&
        candidate.odometerKm !== null &&
        peer.advertisedAskingPrice !== null &&
        peer.odometerKm !== null,
      `${scenario.id}: both listings must have two dimensions`,
    );
    assert.ok(
      peer.advertisedAskingPrice < candidate.advertisedAskingPrice &&
        peer.odometerKm < candidate.odometerKm,
      `${scenario.id}: fixture peer is not a strict two-measure dominator`,
    );
    assert.equal(isComparable(candidate, peer), false, `${scenario.id}: peer is comparable`);
    assert.equal(actual.evaluationStatus, "SURVIVES_FRONTIER");
  }

  for (const scenario of fixture.displayScenarios) {
    const typeScriptDisplay = filterDisplay(
      typeScriptFrontier,
      scenario.make,
      scenario.model,
    );
    const predicates = [
      scenario.make === null ? null : `make = ${quoteSqlString(scenario.make)}`,
      scenario.model === null ? null : `model = ${quoteSqlString(scenario.model)}`,
    ].filter((predicate): predicate is string => predicate !== null);
    const where = predicates.length > 0 ? ` WHERE ${predicates.join(" AND ")}` : "";
    const sqlDisplayResult = await connection.runAndReadAll(
      `SELECT * FROM price_mileage_frontier_reference${where} ORDER BY listing_id`,
    );
    const sqlDisplay = sqlDisplayResult
      .getRowObjects()
      .map((row: unknown) => normalizeSqlFrontier(row as SqlRow));
    assert.deepEqual(sqlDisplay, typeScriptDisplay, `${scenario.id}: display rows differ`);

    const actualIds = typeScriptDisplay.map((row) => row.listingId).sort();
    if (scenario.expectedListingIds) {
      assert.deepEqual(actualIds, [...scenario.expectedListingIds].sort(), scenario.id);
    }
    for (const expectedId of scenario.expectedIncludedListingIds ?? []) {
      assert.ok(actualIds.includes(expectedId), `${scenario.id}: missing ${expectedId}`);
    }
  }
} finally {
  connection.closeSync();
}

const scenarioCount =
  fixture.evaluationScenarios.length + fixture.displayScenarios.length;
console.log(
  `Reference reconstruction verified: ${scenarioCount} synthetic scenarios passed; ` +
    `DuckDB SQL and TypeScript agree on ${typeScriptEvaluations.length} evaluation rows ` +
    `and ${typeScriptFrontier.length} frontier survivors.`,
);
console.log(
  "The verifier used an in-memory database with external access disabled; no credentials or .env.local were used.",
);
