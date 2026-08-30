import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function files(root, directory) {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => entry.isDirectory() ? files(root, `${directory}/${entry.name}`) : [`${directory}/${entry.name}`]));
  return nested.flat();
}

export async function assertCurrentInterfaces(root = process.cwd()) {
  const schemas = (await files(root, "contracts/schemas")).filter((file) => file.endsWith(".schema.json"));
  const families = new Map();
  const identities = new Set();
  for (const file of schemas) {
    const match = file.match(/^contracts\/schemas\/(.*)\.v(\d+)\.schema\.json$/);
    if (!match) continue;
    const [, family, major] = match;
    const majors = families.get(family) ?? new Set();
    majors.add(major); families.set(family, majors); identities.add(`${family}.v${major}`);
  }
  for (const [family, majors] of families) if (majors.size !== 1) throw new Error(`multiple current Contract majors: ${family}`);
  const roots = ["AGENTS.md", "README.md", "docs/product", "docs/architecture", "docs/program", "contracts/README.md"];
  const references = [];
  for (const item of roots) {
    const candidates = item.endsWith(".md") ? [item] : (await files(root, item)).filter((file) => file.endsWith(".md") || file.endsWith(".yaml"));
    for (const file of candidates) {
      const text = await readFile(resolve(root, file), "utf8");
      for (const match of text.matchAll(/contracts\/schemas\/([^\s`"')]+\.v\d+)\.schema\.json/g)) {
        if (!identities.has(match[1])) references.push(`${file}:${match[1]}`);
      }
    }
  }
  if (references.length) throw new Error(`current authority references deleted Contract interface: ${references.sort().join(", ")}`);
}
