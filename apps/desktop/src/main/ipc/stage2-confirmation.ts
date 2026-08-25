import type { EditorialIntentExecutionReview } from "../../../../../packages/platform/project-host/src/public.js";

export function assertStage2DialogResponse(response: number): void {
  if (response !== 1) throw new Error("PRODUCT_HUMAN_REVIEW_CANCELLED");
}

export function assertStage2PreConfirmationAvailable(action: string, workspace: Readonly<{ approved_plans?: readonly Readonly<{ status?: string }>[] }>): void {
  if (action === "story.approve" && workspace.approved_plans?.some((item) => item.status === "approved")) throw new Error("PRODUCT_STORY_CANDIDATE_SET_ALREADY_APPROVED");
}

export function stage2ExecutionReviewLines(review: EditorialIntentExecutionReview | undefined): string[] {
  if (!review) return [];
  return [`精确效果：${review.effect_digest}`, `编译效果：${review.compiled_effect_digest}`, `源身份：${review.source_identity_digest}`, `Timeline：v${review.base_timeline_version} → v${review.expected_final_timeline_version}`, `语义图：${review.semantic_graph_hash}`];
}

export async function afterStage2HumanConfirmation<T, Confirmed = void>(confirm: () => Promise<Confirmed>, perform: (confirmed: Confirmed) => Promise<T> | T): Promise<T> {
  const confirmed = await confirm();
  return perform(confirmed);
}
