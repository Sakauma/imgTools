import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const roots = [
  ".github",
  "scripts",
  "src",
  "styles",
  "tests",
];
const rootFiles = [
  "AGENTS.md",
  "README.md",
  "index.html",
  "package.json",
  "playwright.config.js",
  "playwright.perf.config.js",
  "styles.css",
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".yml",
  ".yaml",
]);

async function collectTextFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTextFiles(target)));
      continue;
    }

    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      files.push(target);
    }
  }

  return files;
}

function checkFile(file, content) {
  const failures = [];
  if (content.includes("\r")) {
    failures.push("uses CRLF line endings");
  }

  if (!content.endsWith("\n")) {
    failures.push("is missing a final newline");
  }

  content.split("\n").forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      failures.push(`has trailing whitespace on line ${index + 1}`);
    }

    if (line.includes("\t")) {
      failures.push(`contains a tab on line ${index + 1}`);
    }
  });

  return failures.map((failure) => `${file}: ${failure}`);
}

const files = [];
for (const root of roots) {
  if (existsSync(root)) {
    files.push(...(await collectTextFiles(root)));
  }
}

for (const file of rootFiles) {
  if (existsSync(file)) {
    files.push(file);
  }
}

const uniqueFiles = [...new Set(files)].sort();
const failures = [];
for (const file of uniqueFiles) {
  const content = await readFile(file, "utf8");
  failures.push(...checkFile(file, content));
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Linted ${uniqueFiles.length} text files.`);
