import type { CreationConfirmationOptions } from "../../../apps/desktop/src/main/ipc/creation-confirmation.js";

/** Engineering fixture only. Exact options and one reserved response, never general approval. */
export function creationFixtureDialog(mode: string) {
  let expected: CreationConfirmationOptions | null = null;
  const confirmations: CreationConfirmationOptions[] = [];
  const saveResponses: Array<{ expected: unknown; response: Readonly<{ canceled: boolean; filePath?: string }> }> = [];
  const saves: Array<{ options: unknown; response: Readonly<{ canceled: boolean; filePath?: string }> }> = [];
  return {
    confirmations,
    saves,
    arm(options: CreationConfirmationOptions) {
      if (mode !== "engineering" || expected !== null) throw new Error("Electron fixture confirmation cannot be armed");
      expected = structuredClone(options);
    },
    async show(...args: unknown[]) {
      const options = args.at(-1) as CreationConfirmationOptions | undefined;
      const differences = mode === "engineering" && expected && options ? Object.keys(expected).filter(key => JSON.stringify(options[key as keyof CreationConfirmationOptions]) !== JSON.stringify(expected![key as keyof CreationConfirmationOptions])).map(key => ({ field:key, expected:expected![key as keyof CreationConfirmationOptions], actual:options[key as keyof CreationConfirmationOptions] })) : [];
      if (mode !== "engineering" || !expected || !options || options.type !== "warning" || options.defaultId !== 0 || options.cancelId !== 0 || options.noLink !== true || options.buttons?.length !== 2 || options.buttons[0] !== "取消" || Object.keys(options).sort().join(",") !== Object.keys(expected).sort().join(",") || differences.length) throw new Error(`Electron fixture refused a non-exact or unarmed native confirmation: ${JSON.stringify(differences)}`);
      const accepted = expected; expected = null; confirmations.push(accepted);
      return { response: 1, checkboxChecked: false };
    },
    armSave(options: unknown, response: Readonly<{ canceled: boolean; filePath?: string }>) {
      if (mode !== "engineering") throw new Error("Electron fixture save dialog cannot be armed");
      saveResponses.push({ expected: structuredClone(options), response: structuredClone(response) });
    },
    async save(...args: unknown[]) {
      const current = saveResponses.shift(), options = args.at(-1);
      if (mode !== "engineering" || !current || JSON.stringify(options) !== JSON.stringify(current.expected)) {
        throw new Error(`Electron fixture refused a non-exact or unarmed export dialog: ${JSON.stringify({ expected: current?.expected, actual: options })}`);
      }
      saves.push({ options: structuredClone(options), response: structuredClone(current.response) });
      return current.response;
    },
  };
}
