import { resolve } from "node:path";
import { createEventBus } from "../../../../packages/platform/project-api/src/public.js";
import { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";
import type { dialog } from "electron";
import type { DesktopContext } from "./types.js";
import { ProjectSessionManager } from "./project-session-manager.js";
import { registerIpc } from "./ipc/register-ipc.js";
import { loadModelServices } from "./model-configuration.js";
import { ProfileRepository } from "../../../../packages/platform/user-profile-store/src/public.js";

export async function createCompositionRoot(dialogService: typeof dialog, profileDirectory: string): Promise<DesktopContext> {
  const model = await loadModelServices(resolve(profileDirectory, "..", "model-services.json"));
  const creationCredential = Object.freeze({ channel: "desktop-main-creation" });
  const profile = new ProfileRepository(profileDirectory, "desktop-user", creationCredential);
  try {
    const host = new ProjectHostSession({ modelProvider: model.provider, provider: model.name, model: model.model, creationModelPolicy: model.creationModelPolicy, creationObservationPolicy: model.creationObservationPolicy, profileRepository: profile, creationRequestChannels: [{ credential: creationCredential, actor_id: "desktop-user" }] });
    const sessions = new ProjectSessionManager(host, profile);
    const events = createEventBus();
    return { host, profile, sessions, events, dialog: dialogService, creationCredential, modelService: model.name && model.model ? { provider: model.name, model: model.model } : null };
  } catch (cause) {
    try { await profile.close(); } catch (cleanup) { throw new AggregateError([cause, cleanup], "Desktop startup and profile cleanup failed", { cause }); }
    throw cause;
  }
}

export function registerCompositionRoot(context: DesktopContext): void { registerIpc(context); }
