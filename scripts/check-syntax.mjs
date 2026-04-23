import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const roots = ["src", "tests", "scripts"];

async function collectJavaScriptFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJavaScriptFiles(target)));
      continue;
    }

    if (entry.isFile() && target.endsWith(".js")) {
      files.push(target);
    }
  }

  return files;
}

const targets = [];
for (const root of roots) {
  if (!existsSync(root)) {
    continue;
  }

  targets.push(...(await collectJavaScriptFiles(root)));
}

for (const target of targets) {
  execFileSync("node", ["--check", target], { stdio: "inherit" });
}

console.log(`Checked ${targets.length} JavaScript files.`);
