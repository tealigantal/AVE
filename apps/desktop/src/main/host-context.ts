import { RecentProjects } from "./recent-projects.js";
import { resolve } from "node:path";
import { createEventBus } from "../../../../packages/platform/project-api/src/public.js";
import { ProjectHostSession, ResourceGate } from "../../../../packages/platform/project-host/src/public.js";
import type { HostContext } from "./types.js";
import { ProjectSessionManager } from "./project-session-manager.js";
import { loadModelServices, type configuredCloudProfiles } from "./model-configuration.js";
import { ProfileRepository } from "../../../../packages/platform/user-profile-store/src/public.js";
import { takeTrustedDispatch } from "../../../../packages/platform/model-gateway/src/trusted-dispatch.js";

export async function createHostContext(profileDirectory: string): Promise<HostContext> {
  // One gate spans worker jobs and local model calls. It does not unload model
  // weights or by itself prove that the whole service fits a memory budget.
  const resourceGate = new ResourceGate(process.env.AVE_LOW_RESOURCE === "1");
  const model = await loadModelServices(resolve(profileDirectory, "..", "model-services.json"), process.env, resourceGate.enabled ? resourceGate : undefined);
  const cloudProfiles = "profiles" in model ? model as ReturnType<typeof configuredCloudProfiles> : undefined;
  const creationCredential = Object.freeze({ channel: "desktop-main-creation" });
  const profile = new ProfileRepository(profileDirectory, "desktop-user", creationCredential);
  try {
    const host = new ProjectHostSession({ resourceGate, modelProvider: model.provider, provider: model.name, model: model.model, ...(cloudProfiles ? { creationModelProviders: cloudProfiles.creationModelProviders } : {}), creationModelPolicy: model.creationModelPolicy, creationObservationPolicy: model.creationObservationPolicy, profileRepository: profile, trustedPlanningDispatch: takeTrustedDispatch(), creationRequestChannels: [{ credential: creationCredential, actor_id: "desktop-user" }] });
    const sessions = new ProjectSessionManager(host, profile);
    const events = createEventBus();
    return { host, recents: new RecentProjects(resolve(profileDirectory, "..", "recent-projects.json")), profile, sessions, events, creationCredential, creationTermsDirectory: profileDirectory, modelService: model.name && model.model ? { provider: model.name, model: model.model } : null, ...(cloudProfiles ? { modelProfiles: { default_digest: cloudProfiles.provider.deployment.digest, options: cloudProfiles.profiles } } : {}) };
  } catch (cause) {
    try { await profile.close(); } catch (cleanup) { throw new AggregateError([cause, cleanup], "Desktop startup and profile cleanup failed", { cause }); }
    throw cause;
  }
}
