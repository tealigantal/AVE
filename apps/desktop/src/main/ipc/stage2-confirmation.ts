export function assertStage2DialogResponse(response: number): void {
  if (response !== 1) throw new Error("PRODUCT_HUMAN_REVIEW_CANCELLED");
}

export function assertStage2PreConfirmationAvailable(action: string, workspace: Readonly<{ approved_plans?: readonly Readonly<{ status?: string }>[] }>): void {
  if (action === "story.approve" && workspace.approved_plans?.some((item) => item.status === "approved")) throw new Error("PRODUCT_STORY_CANDIDATE_SET_ALREADY_APPROVED");
}

export async function afterStage2HumanConfirmation<T>(confirm: () => Promise<void>, perform: () => Promise<T> | T): Promise<T> {
  await confirm();
  return perform();
}
