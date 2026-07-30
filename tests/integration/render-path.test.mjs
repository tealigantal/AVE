import { access } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."); for (const file of ["tests/fixtures/generated/renders/preview.mp4", "tests/fixtures/generated/renders/master.mp4"]) await access(resolve(root, file)); console.log("render path outputs exist");
