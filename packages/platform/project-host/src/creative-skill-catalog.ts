import { assertCreativeSkillDefinitionV1 } from "../../contract-runtime/src/public.js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseCreativeSkillCatalog, parseCreativeSkillCatalogRules } from "../../../core/editorial-core/src/public.js";

// Version 1 pins the exact user-supplied bytes; no updates, network or model calls.
export const catalogSourceDigest = "2f677a23de67c2ea5b340d6ef4cbdfc11599f474128a7721afc78031661d8721";
export const catalogSource = readFileSync(new URL("../../../core/editorial-core/src/knowledge/skill/catalog-source.md", import.meta.url), "utf8");
if (createHash("sha256").update(catalogSource).digest("hex") !== catalogSourceDigest) throw new Error("CREATIVE_SKILL_SOURCE_DIGEST_INVALID");
export const creativeSkillCatalog = parseCreativeSkillCatalog(catalogSource, JSON.parse(readFileSync(new URL("../../../core/editorial-core/src/knowledge/skill/catalog.v1.json", import.meta.url), "utf8")));
export const creativeSkillCatalogRules = parseCreativeSkillCatalogRules(catalogSource);

creativeSkillCatalog.forEach(assertCreativeSkillDefinitionV1);
