import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const markdownFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md"],
  { cwd: rootDir, encoding: "utf8" },
).split(/\r?\n/).filter(Boolean);

const failures = [];
let checkedLinks = 0;

const slugify = (heading) => heading
  .trim()
  .toLowerCase()
  .replace(/<[^>]+>/g, "")
  .replace(/[^\p{L}\p{N}\s-]/gu, "")
  .replace(/\s+/g, "-");

const headingsFor = async (filename) => {
  const text = await readFile(filename, "utf8");
  return new Set(
    [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slugify(match[1])),
  );
};

for (const relativeFile of markdownFiles) {
  const filename = path.join(rootDir, relativeFile);
  const markdown = (await readFile(filename, "utf8"))
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");
  const links = [...markdown.matchAll(/!?\[[^\]]*\]\((<?[^)\s>]+>?)\)/g)];

  for (const match of links) {
    const rawTarget = match[1].replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(rawTarget)) continue;

    checkedLinks += 1;
    const hashIndex = rawTarget.indexOf("#");
    const rawPath = hashIndex >= 0 ? rawTarget.slice(0, hashIndex) : rawTarget;
    const anchor = hashIndex >= 0 ? decodeURIComponent(rawTarget.slice(hashIndex + 1)) : "";
    const decodedPath = decodeURIComponent(rawPath);
    const resolved = path.resolve(
      path.dirname(filename),
      decodedPath || path.basename(filename),
    );

    try {
      await access(resolved);
    } catch {
      failures.push(`${relativeFile}: missing target ${rawTarget}`);
      continue;
    }

    if (anchor && path.extname(resolved).toLowerCase() === ".md") {
      const headings = await headingsFor(resolved);
      if (!headings.has(anchor.toLowerCase())) {
        failures.push(`${relativeFile}: missing heading ${rawTarget}`);
      }
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Markdown link verification failed:\n${failures.join("\n")}`);
}

console.log(`Markdown links verified: ${checkedLinks} local targets across ${markdownFiles.length} files.`);
