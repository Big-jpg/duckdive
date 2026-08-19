import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const caseStudyPath = path.join(rootDir, "docs/case-studies/price-mileage-frontier.md");
const caseStudy = await readFile(caseStudyPath, "utf8");
const relativeCaseStudyPath = path.relative(rootDir, caseStudyPath).replaceAll("\\", "/");

const fail = (message) => {
  throw new Error(`${relativeCaseStudyPath}: ${message}`);
};

const slugifyHeading = (heading) => heading
  .trim()
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, "")
  .replace(/\s+/g, "-");

const requiredPhrases = [
  "11 August 2026",
  "Version 12",
  "Version 13",
  "Version 14",
  "Version 15",
  "Version 16",
  "Display scope",
  "Candidate rule",
  "Dominance scope",
  "Equal asking price is not cheaper",
  "equal odometer is not lower-mileage",
  "No comparable peer is cheaper",
  "No comparable peer has lower mileage",
  "they are different listings",
  "original version 16 Dive source is not preserved",
  "no analytical result has been reconstructed",
  "Estimate fair value",
  "Tell the reader which vehicle to buy",
  "Identify vehicles that sold",
];
for (const phrase of requiredPhrases) {
  if (!caseStudy.toLowerCase().includes(phrase.toLowerCase())) {
    fail(`missing required statement: ${phrase}`);
  }
}

if (caseStudy.includes("14,737")) fail("contains the excluded later-observation listing count");
if (!caseStudy.includes("14,747 listings") ||
    !caseStudy.includes("$28,988 median asking price") ||
    !caseStudy.includes("88,138 km median odometer")) {
  fail("missing the dated All/All observation values");
}

const prohibitedDescriptions = [
  /frontier\s+is\s+(?:a\s+)?valuation/i,
  /frontier[^.\n]*bargain score/i,
  /frontier[^.\n]*recommendation engine/i,
];
for (const pattern of prohibitedDescriptions) {
  if (pattern.test(caseStudy)) fail(`contains prohibited frontier description ${pattern}`);
}

const expectedImages = Array.from({ length: 9 }, (_, index) =>
  `${String(index + 1).padStart(2, "0")}-`);
for (const prefix of expectedImages) {
  const imagePattern = new RegExp(`!\\[[^\\]]+\\]\\([^\\n)]*${prefix}[^\\n)]*\\)`);
  if (!imagePattern.test(caseStudy)) fail(`missing case-study image ${prefix}`);
}

const links = [...caseStudy.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
for (const link of links) {
  if (/^[a-z]+:/i.test(link)) fail(`remote or URI link is not allowed: ${link}`);
  const [target, anchor] = link.split("#", 2);
  const resolved = path.resolve(path.dirname(caseStudyPath), target || path.basename(caseStudyPath));
  await access(resolved).catch(() => fail(`link target does not exist: ${link}`));

  if (anchor) {
    const targetText = await readFile(resolved, "utf8");
    const anchors = new Set(
      [...targetText.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slugifyHeading(match[1])),
    );
    if (!anchors.has(anchor)) fail(`heading anchor does not exist: ${link}`);
  }
}

console.log("Price Frontier case study verified: 9 images, dated claims, scope semantics, and local links.");
