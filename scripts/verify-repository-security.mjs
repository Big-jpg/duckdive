import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const trackedFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: rootDir, encoding: "utf8" },
).split(/\r?\n/).filter(Boolean);

const prohibitedFiles = [
  {
    label: "environment file",
    pattern: /(^|\/)\.env(?:\.|$)/i,
    allow: (filename) => filename === ".env.example",
  },
  { label: "private key file", pattern: /\.(?:pem|key|p12|pfx)$/i },
  { label: "raw collection", pattern: /^(?:rea-collections|\.vehicle-market-evidence)\//i },
];

const sensitivePatterns = [
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "GitHub token", pattern: /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})/ },
  { label: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { label: "OpenAI-style secret", pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/ },
  { label: "Slack token", pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  {
    label: "credentialed database URL",
    pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^/\s]+/i,
    allow: (value) => /\/\/(?:user|username):(?:password|pass)@(?:host|example\.com)$/i.test(value),
  },
  {
    label: "private MotherDuck share",
    pattern: /md:_share\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]{16,}/i,
    allow: (value) => value.includes("replace-with-share-id"),
  },
  { label: "private ChatGPT share", pattern: /chatgpt\.com\/share\/[A-Za-z0-9-]{12,}/i },
  { label: "Windows user path", pattern: /[A-Za-z]:\\Users\\[^\\/\s]+\\/ },
  { label: "POSIX user path", pattern: /\/(?:Users|home)\/[^/\s]+\// },
];

const failures = [];
for (const relativeFile of trackedFiles) {
  const normalized = relativeFile.replaceAll("\\", "/");
  for (const rule of prohibitedFiles) {
    if (rule.pattern.test(normalized) && !rule.allow?.(normalized)) {
      failures.push(`${relativeFile}: ${rule.label}`);
    }
  }

  const buffer = await readFile(path.join(rootDir, relativeFile));
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  for (const rule of sensitivePatterns) {
    const match = text.match(rule.pattern)?.[0];
    if (match && !rule.allow?.(match)) failures.push(`${relativeFile}: ${rule.label}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Tracked-file safety scan failed:\n${failures.join("\n")}`);
}

console.log(`Tracked-file safety verified: ${trackedFiles.length} files, no high-confidence secret or private-path pattern.`);
