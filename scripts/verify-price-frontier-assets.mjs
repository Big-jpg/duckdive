import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.resolve(scriptDir, "../docs/assets/price-frontier");
const manifestPath = path.join(assetDir, "manifest.json");
const galleryPath = path.join(assetDir, "README.md");
const expectedNames = [
  "01-conventional-scatterplot.png",
  "02-corporate-memphis-restyle.png",
  "03-parameterized-ford-ranger.png",
  "04-cohort-relative-price-filter.png",
  "05-mileage-aware-investigation.png",
  "06-first-pass-shortlist.png",
  "07-price-mileage-frontier.png",
  "08-generalization-grid.png",
  "09-contract-and-refusal-boundaries.png",
];

const fail = (message) => {
  throw new Error(message);
};

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const readPng = (buffer, filename) => {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    fail(`${filename}: invalid PNG signature`);
  }

  const chunks = [];
  let width;
  let height;
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const end = offset + length + 12;
    if (end > buffer.length) fail(`${filename}: truncated ${type} chunk`);
    chunks.push(type);
    if (type === "IHDR") {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
    }
    offset = end;
    if (type === "IEND") break;
  }

  const allowedChunks = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);
  const ancillary = chunks.filter((chunk) => !allowedChunks.has(chunk));
  if (ancillary.length > 0) {
    fail(`${filename}: unexpected metadata chunks ${ancillary.join(", ")}`);
  }
  return { width, height };
};

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const gallery = await readFile(galleryPath, "utf8");
const publishedNames = (await readdir(assetDir))
  .filter((name) => name.endsWith(".png"))
  .sort();

if (JSON.stringify(publishedNames) !== JSON.stringify(expectedNames)) {
  fail("published PNG set does not match the nine required derivatives");
}
if (manifest.schemaVersion !== 1) fail("unsupported manifest schema");
if (manifest.sourceSet.suppliedFileCount !== 52) fail("source file count must be 52");
if (manifest.sourceSet.uniqueSha256Count !== 51) fail("unique source hash count must be 51");
if (manifest.sourceSet.sourcesTrackedInGit !== false) fail("source set must remain outside Git");
if (manifest.sourceSet.duplicateGroups.length !== 1) fail("expected one duplicate source group");
if (manifest.derivatives.length !== expectedNames.length) fail("manifest must account for nine derivatives");

const duplicateGroup = manifest.sourceSet.duplicateGroups[0];
if (duplicateGroup.duplicateFilenames.length !== 1) fail("duplicate group must name one duplicate file");

const manifestNames = manifest.derivatives.map((asset) => asset.filename).sort();
if (JSON.stringify(manifestNames) !== JSON.stringify(expectedNames)) {
  fail("manifest filenames do not match the published set");
}

const derivativeHashes = new Set();
const referencedSources = [];
for (const asset of manifest.derivatives) {
  const buffer = await readFile(path.join(assetDir, asset.filename));
  const actualHash = sha256(buffer);
  if (asset.sha256 !== actualHash) fail(`${asset.filename}: SHA-256 mismatch`);
  if (derivativeHashes.has(actualHash)) fail(`${asset.filename}: duplicate derivative hash`);
  derivativeHashes.add(actualHash);

  const dimensions = readPng(buffer, asset.filename);
  if (dimensions.width !== asset.width || dimensions.height !== asset.height) {
    fail(`${asset.filename}: dimensions do not match manifest`);
  }
  if (asset.observationDate !== manifest.sourceSet.observationDate) {
    fail(`${asset.filename}: observation date does not match source set`);
  }
  if (!asset.alt || !asset.caption || !asset.cropNotes) {
    fail(`${asset.filename}: alt text, caption, and crop notes are required`);
  }
  if (!asset.caption.startsWith("Observed screenshot") &&
      !asset.caption.startsWith("Composite of observed screenshots")) {
    fail(`${asset.filename}: caption must identify observed or composite evidence`);
  }

  const markdownImage = `![${asset.alt}](./${asset.filename})`;
  if (!gallery.includes(markdownImage)) fail(`${asset.filename}: gallery image or alt text is missing`);

  for (const source of asset.sourceFiles) {
    if (!/^[a-f0-9]{64}$/.test(source.sha256)) fail(`${asset.filename}: invalid source hash`);
    if (path.basename(source.filename) !== source.filename) fail(`${asset.filename}: source must be a basename`);
    referencedSources.push(source.filename);
  }
}

if (referencedSources.includes(duplicateGroup.duplicateFilenames[0])) {
  fail("byte-identical duplicate must not be represented as a second source");
}
if (!referencedSources.includes(duplicateGroup.canonicalFilename)) {
  fail("canonical file for the duplicate pair is not represented");
}

const publicText = `${JSON.stringify(manifest)}\n${gallery}`;
const prohibitedPatterns = [
  /[A-Za-z]:\\/,
  /\/Users\//,
  /\/home\//,
  /chatgpt\.com\/share\//,
  /https?:\/\/[^\s)]+/,
];
for (const pattern of prohibitedPatterns) {
  if (pattern.test(publicText)) fail(`public asset text matches prohibited pattern ${pattern}`);
}

console.log("Price Frontier assets verified: 9 derivatives, 51 unique source hashes, no PNG metadata.");
