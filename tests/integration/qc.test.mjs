import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const report = JSON.parse(await readFile(resolve(import.meta.dirname, "../../tests/fixtures/generated/renders/master-qc.json"), "utf8")); if (report.status !== "passed" || report.issues.length) throw new Error("QC report is not passed"); console.log("QC report check passed");
