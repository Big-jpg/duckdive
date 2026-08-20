import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const fail = (message) => {
  throw new Error(`Review readiness failed: ${message}`);
};

const requiredFiles = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "LICENSE_STATUS.md",
  "docs/PROVENANCE.md",
  "docs/REPOSITORY_MAP.md",
  ".github/workflows/ci.yml",
];
for (const filename of requiredFiles) {
  await access(path.join(rootDir, filename)).catch(() => fail(`missing ${filename}`));
}

const repositoryFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: rootDir, encoding: "utf8" },
).split(/\r?\n/).filter(Boolean);
const topLevelDirectories = new Set(
  repositoryFiles
    .map((filename) => filename.replaceAll("\\", "/").split("/"))
    .filter((parts) => parts.length > 1)
    .map((parts) => parts[0]),
);

const repositoryMap = await readFile(path.join(rootDir, "docs/REPOSITORY_MAP.md"), "utf8");
const mappedDirectories = new Set(
  [...repositoryMap.matchAll(/^\| `([^`]+)\/` \|/gm)].map((match) => match[1]),
);
const missingDirectories = [...topLevelDirectories].filter((name) => !mappedDirectories.has(name));
const staleDirectories = [...mappedDirectories].filter((name) => !topLevelDirectories.has(name));
if (missingDirectories.length > 0 || staleDirectories.length > 0) {
  fail(`repository map mismatch; missing: ${missingDirectories.join(", ") || "none"}; stale: ${staleDirectories.join(", ") || "none"}`);
}

const readme = await readFile(path.join(rootDir, "README.md"), "utf8");
const requiredHeadings = [
  "Why DuckDive exists",
  "The product thesis",
  "The case study: one question became a reusable analytical method",
  "What this could make practical",
  "Responsibility-based architecture",
  "What the experiment discovered",
  "How the agent is bounded",
  "What comes next",
  "90-second reviewer walkthrough",
  "Evidence map",
  "Credential-free validation",
  "Current boundaries",
];
for (const heading of requiredHeadings) {
  if (!readme.includes(`## ${heading}`)) fail(`README is missing ${heading}`);
}

const requiredReadmeLinks = [
  "docs/case-studies/price-mileage-frontier.md",
  "docs/architecture.md",
  "docs/agent-control-loop.md",
  "docs/REPOSITORY_MAP.md",
  "docs/PROVENANCE.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "LICENSE_STATUS.md",
];
for (const link of requiredReadmeLinks) {
  if (!readme.includes(`](${link})`)) fail(`README is missing link to ${link}`);
}

if (!readme.includes("```mermaid")) fail("README is missing its architecture diagram");
if (!readme.includes("Semantic request classification remains model-mediated")) {
  fail("README does not distinguish model-mediated classification");
}
if (!readme.includes("No live MotherDuck, Neon, Blob, Vercel, or deployment state is claimed")) {
  fail("README does not state the unavailable live-state boundary");
}
if (!readme.includes("Status: ongoing experiment")) fail("README does not state its experimental status");
if (!readme.includes("BYO Dataset is a planned experiment")) {
  fail("README does not distinguish planned BYO Dataset work from current capability");
}
if (!readme.includes("No license is currently granted")) fail("README does not state license status");
if (/production[- ]ready/i.test(readme)) fail("README implies production readiness");

const badgeTargets = [...readme.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)].map((match) => match[1]);
if (badgeTargets.length !== 1 || !badgeTargets[0].endsWith("/actions/workflows/ci.yml/badge.svg")) {
  fail("README must contain only the continuous-integration badge");
}

const workflow = await readFile(path.join(rootDir, ".github/workflows/ci.yml"), "utf8");
const requiredScripts = [
  "pnpm install --frozen-lockfile",
  "pnpm test",
  "pnpm lint",
  "pnpm typecheck",
  "pnpm build",
  "pnpm review:replay",
  "pnpm review:verify",
  "pnpm review:architecture",
  "pnpm review:case-study",
  "pnpm review:assets",
  "pnpm review:links",
  "pnpm review:security",
  "pnpm review:readiness",
  "git diff --exit-code",
  "git status --porcelain --untracked-files=all",
];
for (const command of requiredScripts) {
  if (!workflow.includes(command)) fail(`CI is missing ${command}`);
}

const requiredActionVersions = [
  "actions/checkout@v7",
  "actions/setup-node@v7",
  "pnpm/action-setup@v6",
];
for (const action of requiredActionVersions) {
  if (!workflow.includes(action)) fail(`CI is missing Node 24 action runtime ${action}`);
}

console.log(`Review readiness verified: ${topLevelDirectories.size} mapped directories, public narrative, provenance, and CI baseline.`);
