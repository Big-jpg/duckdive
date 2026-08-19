-- Evidence class: reference reconstruction.
--
-- Input contract: governed_current_listings contains one current listing per
-- listing_id. Asking prices are advertised amounts, not transactions or
-- valuations. The display filter is deliberately absent from these views:
-- callers apply make/model controls only after local candidate and dominance
-- semantics have been evaluated.

CREATE OR REPLACE VIEW price_mileage_frontier_evaluation AS
WITH price_cohorts AS (
  SELECT
    candidate.listing_id,
    candidate.make,
    candidate.model,
    candidate.manufacturer_year,
    candidate.advertised_asking_price,
    candidate.odometer_km,
    CAST(COUNT(price_peer.listing_id) AS INTEGER) AS cohort_size,
    CASE
      WHEN COUNT(price_peer.listing_id) >= 10
        THEN quantile_cont(price_peer.advertised_asking_price, 0.25)
      ELSE NULL
    END AS cohort_price_p25
  FROM governed_current_listings AS candidate
  JOIN governed_current_listings AS price_peer
    ON price_peer.make = candidate.make
   AND price_peer.model = candidate.model
   AND abs(price_peer.manufacturer_year - candidate.manufacturer_year) <= 2
   AND price_peer.advertised_asking_price IS NOT NULL
  WHERE candidate.advertised_asking_price IS NOT NULL
    AND candidate.odometer_km IS NOT NULL
  GROUP BY
    candidate.listing_id,
    candidate.make,
    candidate.model,
    candidate.manufacturer_year,
    candidate.advertised_asking_price,
    candidate.odometer_km
),
candidate_evaluations AS (
  SELECT
    *,
    cohort_price_p25 - advertised_asking_price AS price_gap,
    cohort_size >= 10
      AND advertised_asking_price < cohort_price_p25 AS candidate_eligible
  FROM price_cohorts
),
peer_counts AS (
  SELECT
    candidate.listing_id,
    candidate.make,
    candidate.model,
    candidate.manufacturer_year,
    candidate.advertised_asking_price,
    candidate.odometer_km,
    candidate.cohort_size,
    candidate.cohort_price_p25,
    candidate.price_gap,
    candidate.candidate_eligible,
    CASE WHEN candidate.candidate_eligible THEN CAST(COUNT(peer.listing_id)
      FILTER (WHERE peer.advertised_asking_price < candidate.advertised_asking_price) AS INTEGER)
      ELSE NULL END AS cheaper_peer_count,
    CASE WHEN candidate.candidate_eligible THEN CAST(COUNT(peer.listing_id)
      FILTER (WHERE peer.odometer_km < candidate.odometer_km) AS INTEGER)
      ELSE NULL END AS lower_mileage_peer_count,
    CASE WHEN candidate.candidate_eligible THEN CAST(COUNT(peer.listing_id)
      FILTER (
        WHERE peer.advertised_asking_price < candidate.advertised_asking_price
          AND peer.odometer_km < candidate.odometer_km
      ) AS INTEGER)
      ELSE NULL END AS strict_dominator_count
  FROM candidate_evaluations AS candidate
  LEFT JOIN governed_current_listings AS peer
    ON candidate.candidate_eligible
   AND peer.listing_id <> candidate.listing_id
   AND peer.make = candidate.make
   AND peer.model = candidate.model
   AND abs(peer.manufacturer_year - candidate.manufacturer_year) <= 2
   AND peer.advertised_asking_price IS NOT NULL
   AND peer.odometer_km IS NOT NULL
  GROUP BY
    candidate.listing_id,
    candidate.make,
    candidate.model,
    candidate.manufacturer_year,
    candidate.advertised_asking_price,
    candidate.odometer_km,
    candidate.cohort_size,
    candidate.cohort_price_p25,
    candidate.price_gap,
    candidate.candidate_eligible
)
SELECT
  listing_id,
  make,
  model,
  manufacturer_year,
  advertised_asking_price,
  odometer_km,
  cohort_size,
  cohort_price_p25,
  price_gap,
  candidate_eligible,
  cheaper_peer_count,
  lower_mileage_peer_count,
  strict_dominator_count,
  CASE
    WHEN cohort_size < 10 THEN 'WITHHELD_COHORT_BELOW_MINIMUM'
    WHEN NOT candidate_eligible THEN 'NOT_BELOW_COHORT_P25'
    WHEN strict_dominator_count > 0 THEN 'REMOVED_STRICT_DOMINATOR'
    ELSE 'SURVIVES_FRONTIER'
  END AS evaluation_status,
  CASE
    WHEN candidate_eligible AND strict_dominator_count = 0 AND cheaper_peer_count = 0
      THEN 'NO_CHEAPER_PEER'
    WHEN candidate_eligible AND strict_dominator_count = 0 AND lower_mileage_peer_count = 0
      THEN 'NO_LOWER_MILEAGE_PEER'
    WHEN candidate_eligible AND strict_dominator_count = 0
      THEN 'CHEAPER_AND_LOWER_MILEAGE_ARE_DIFFERENT_LISTINGS'
    ELSE NULL
  END AS survival_reason
FROM peer_counts;

CREATE OR REPLACE VIEW price_mileage_frontier_reference AS
SELECT
  listing_id,
  make,
  model,
  manufacturer_year,
  advertised_asking_price,
  odometer_km,
  cohort_size,
  cohort_price_p25,
  price_gap,
  cheaper_peer_count,
  lower_mileage_peer_count,
  survival_reason
FROM price_mileage_frontier_evaluation
WHERE evaluation_status = 'SURVIVES_FRONTIER';
