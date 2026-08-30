import { loadProgramModel, writeTextFiles } from "../../../scripts/docs/program-model.mjs";

const [root, mode, rawIndex = "0"] = process.argv.slice(2);
if (!root || !mode) throw new Error("root and transaction child mode are required");
const requestedIndex = Number(rawIndex);
const onEvent = (event) => {
  if (mode === "crash-publish" && event.phase === "afterPublish" && event.index === requestedIndex) process.exit(86);
  if (mode === "crash-commit" && event.phase === "afterCommit") process.exit(87);
  if (mode === "crash-recovery" && event.phase === "afterRecoveryStep" && event.index === requestedIndex) process.exit(88);
  if (mode === "crash-before-commit" && event.phase === "beforeCommit") process.exit(89);
};

if (mode === "crash-recovery" || mode === "recover") await loadProgramModel(root, { onEvent });
else await writeTextFiles(root, [
  ["transaction-a.txt", "new-a\n"],
  ["transaction-b.txt", "new-b\n"],
  ["transaction-c.txt", "new-c\n"],
], { onEvent });
