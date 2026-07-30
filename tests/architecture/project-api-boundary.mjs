import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."); const source = await readFile(resolve(root, "packages/platform/project-api/src/public.ts"), "utf8"); for (const required of ["QueryEnvelope", "CommandEnvelope", "ProjectApi", "subscribe"]) if (!source.includes(required)) throw new Error(`Project API missing ${required}`); if (source.includes("sqlite") || source.includes("child_process")) throw new Error("Project API crosses an infrastructure boundary"); console.log("project api boundary check passed");
