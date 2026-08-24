export function assertStage2DialogResponse(response: number): void {
  if (response !== 1) throw new Error("PRODUCT_HUMAN_REVIEW_CANCELLED");
}

export async function afterStage2HumanConfirmation<T>(confirm: () => Promise<void>, perform: () => Promise<T> | T): Promise<T> {
  await confirm();
  return perform();
}
