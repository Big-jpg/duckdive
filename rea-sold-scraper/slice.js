// Shared deterministic slice helpers for the extension service worker.
(() => {
  "use strict";

  const canonicalSlice = (job) => ({
    suburb: String(job.suburb || "").trim().toUpperCase(),
    stateAbbr: String(job.stateAbbr || "").trim().toUpperCase(),
    postcode: String(job.postcode || "").trim(),
    propertyType: job.propertyType || null,
    includeSurrounding: job.includeSurrounding === true,
    bedroomsMin: job.bedroomsMin ?? null,
    bedroomsMax: job.bedroomsMax ?? null,
    priceMin: job.priceMin ?? null,
    priceMax: job.priceMax ?? null,
    maxSoldAge: job.maxSoldAge || null,
    soldDateFrom: job.soldDateFrom || null,
    soldDateTo: job.soldDateTo || null
  });

  const stableHash = (value) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  };

  const makeSliceId = (job) => stableHash(JSON.stringify(canonicalSlice(job)));

  const buildUrl = (job, page) => {
    if (!Number.isInteger(page) || page < 1 || page > 80) throw new Error("Page must be between 1 and 80");
    const suburbSlug = job.suburb.toLowerCase().replace(/\s+/g, "+");
    const stateSlug = job.stateAbbr.toLowerCase();
    let descriptor = `property-${job.propertyType}`;
    if (job.bedroomsMin != null) descriptor += `-with-${job.bedroomsMin}-bedrooms`;
    if (job.priceMin != null || job.priceMax != null) {
      descriptor += `-between-${job.priceMin ?? 0}-${job.priceMax ?? "any"}`;
    }
    const url = new URL(`https://www.realestate.com.au/sold/${descriptor}-in-${suburbSlug},+${stateSlug}+${job.postcode}/list-${page}`);
    url.searchParams.set("includeSurrounding", String(job.includeSurrounding === true));
    url.searchParams.set("activeSort", "solddate");
    if (job.bedroomsMax != null) url.searchParams.set("maxBeds", String(job.bedroomsMax));
    if (job.maxSoldAge) url.searchParams.set("maxSoldAge", job.maxSoldAge);
    return url.href;
  };

  const recordInDateRange = (record, job) => {
    if (!job.soldDateFrom && !job.soldDateTo) return true;
    if (!record.soldDateISO) return false;
    return (!job.soldDateFrom || record.soldDateISO >= job.soldDateFrom)
      && (!job.soldDateTo || record.soldDateISO <= job.soldDateTo);
  };

  globalThis.ReaSlice = Object.freeze({ canonicalSlice, makeSliceId, buildUrl, recordInDateRange });
})();
