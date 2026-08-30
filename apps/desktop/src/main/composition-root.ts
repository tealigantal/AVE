import { createEventBus } from "../../../../packages/platform/project-api/src/public.js";
import { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";
import type { dialog } from "electron";
import type { DesktopContext } from "./types.js";
import { ProjectSessionManager } from "./project-session-manager.js";
import { registerIpc } from "./ipc/register-ipc.js";
import { createDeepSeekProvider, createQwenProvider, type ModelProvider } from "../../../../packages/platform/model-gateway/src/public.js";

function configuredModelProvider(): { provider?: ModelProvider; name?: string; model?: string } {
  const name = (process.env.AVE_MODEL_PROVIDER ?? "").toLowerCase();
  const apiKey = process.env.AVE_MODEL_API_KEY ?? (name === "deepseek" ? process.env.DEEPSEEK_API_KEY : process.env.QWEN_API_KEY);
  if (!apiKey || (name !== "qwen" && name !== "deepseek")) return {};
  const model = process.env.AVE_MODEL_NAME ?? (name === "deepseek" ? "deepseek-chat" : "qwen-plus");
  const baseUrl = process.env.AVE_MODEL_BASE_URL;
  const provider = name === "deepseek" ? createDeepSeekProvider({ api_key: apiKey, model_snapshot: process.env.AVE_MODEL_SNAPSHOT, ...(baseUrl ? { base_url: baseUrl } : {}) }) : createQwenProvider({ api_key: apiKey, model_snapshot: process.env.AVE_MODEL_SNAPSHOT, ...(baseUrl ? { base_url: baseUrl } : {}) });
  return { provider, name, model };
}

export function createCompositionRoot(dialogService: typeof dialog): DesktopContext {
  const model = configuredModelProvider();
  const stage2ReviewCredential = Object.freeze({ channel: "desktop-main" });
  const host = new ProjectHostSession({ modelProvider: model.provider, provider: model.name, model: model.model, stage2HumanReviewChannels: [{ credential: stage2ReviewCredential, actor_id: "desktop-user" }] });
  const sessions = new ProjectSessionManager(host);
  const events = createEventBus();
  return { host, sessions, events, dialog: dialogService, stage2ReviewCredential };
}

export function registerCompositionRoot(context: DesktopContext): void { registerIpc(context); }
