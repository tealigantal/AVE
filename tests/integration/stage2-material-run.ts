import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { ProjectHostSession } from '../../packages/platform/project-host/src/public.js';
import { builtInCreativeSkillDefinitions, editorialObjectDigest } from '../../packages/core/editorial-core/src/public.js';
import { canonicalStage2TimelineTracks, assertCanonicalStage2Timeline } from '../../apps/desktop/src/main/stage2-timeline.js';
import { createStage2HumanReview } from './stage2-human-review-helper.js';
import { caseBlueprint, evidenceDuration, fileHash, type MaterialCase } from './stage2-material-case.js';

const run = promisify(execFile);
const { fingerprint } = await import(new URL('../../scripts/docs/fingerprint.mjs', import.meta.url).href);
const ref = (row: any, id: string) => ({ object_id: row.value[id], object_version: row.value.object_version, digest: row.object_hash });
const json = (value: unknown) => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);

// Shared by both real lanes. Every write is a normal Host use case; this is an
// explicitly simulated technical precheck, never the direct-human entry.
export async function runMaterialCase(c: MaterialCase, root: string, prepareForHuman = false) {
  const results: any[] = [];
  for (const chosen of c.candidates) {
    const project = resolve(root, `${prepareForHuman ? 'human-' : ''}${chosen.id}`); await mkdir(project);
    const human = createStage2HumanReview('automated-material-precheck', new Date().toISOString());
    const host = new ProjectHostSession(human.options);
    const action = async (input: any) => {
      const workspace: any = await host.readStage2Workspace();
      const value = { ...input, workspace_digest: workspace.workspace_digest, reason: input.reason ?? 'automated protocol precheck; human decision pending' };
      const review = await host.prepareStage2ProductActionReview(value);
      return host.performStage2ProductAction(human.credential, value, review) as Promise<any>;
    };
    try {
      await host.create(project);
      host.initializeTimeline(canonicalStage2TimelineTracks);
      assertCanonicalStage2Timeline(host.readTimelineSnapshot());
      const originals = new Map<string, any>();
      for (const asset of c.assets) {
        const [imported]: any = await host.importMedia([asset.path]); originals.set(asset.id, imported);
        assert.equal(imported.asset_id, `asset:sha256:${asset.sha256}`);
      }
      const stamp = new Date().toISOString();
      const policy = (id: string) => ({ object_id: id, object_version: 1, digest: editorialObjectDigest({ case: c.case_id, id, authorization: c.assets.map(a => a.authorization) }) });
      const draft = host.createCreativeContractDraft({ project_id: host.status().project!, contract_id: 'material-contract', creator_goal: c.contract.goal, audience: c.contract.audience, platforms: ['youtube'], target_duration: { schema_version: 1, value: 120, timescale: 1 }, voice_and_identity: { desired_traits: ['faithful to supplied observations'], forbidden_misrepresentation: c.contract.forbidden }, privacy_policy_ref: policy('case-privacy'), rights_policy_ref: policy('case-rights'), approval_policy: { mode: 'explicit_user', actor_kind: 'user' }, protected_refs: c.evidence.filter(e => e.protected).map(e => `evidence:${e.id}`), allowed_transformations: ['trim'], forbidden_outcomes: c.contract.forbidden, requirements: c.contract.requirements.map(r => ({ requirement_id: r.id, statement: r.statement, kind: 'hard', priority: 100 })), created_at: stamp, provenance: { producer: 'adapter', source_id: c.case_id, source_version: '1', policy_version: 'knowledge-v1', input_refs: [`candidate-origin:${c.provenance.kind}`, editorialObjectDigest(c)], unresolved_assumptions: [] } });
      host.registerCreativeContractDraft({ ...draft, status: 'review' });
      const contract = await action({ action: 'contract.approve', contract_id: draft.contract_id });
      const contractRef = ref(contract, 'contract_id');
      for (const [id, original] of originals) await host.recordMaterialPermission(await human.materialPermission(host, `material-${id}`, { contract_ref: contractRef, asset_id: original.asset_id, asset_location_id: original.asset_location_id, location_ref: original.location_ref, verified_at: original.verified_at, permission_state: 'authorized', policy_ref: draft.rights_policy_ref }));
      for (const e of c.evidence) {
        const candidate = { evidence_id: e.id, analysis_type: 'scene', asset_id: originals.get(e.asset).asset_id, start_pts: e.start, end_pts: e.end, timescale: e.timescale, evidence_version: 1, review_status: 'candidate', label: `${e.observation} [source: ${e.provenance}; interpretation: ${e.interpretation}; uncertainty: ${e.uncertainty.join('; ')}]` };
        host.registerEvidence(candidate); await human.approveEvidence(host, `evidence-${e.id}`, candidate);
      }
      const packInput = { pack_id: 'material-pack', contract_ref: contractRef, evidence_ids: c.evidence.map(e => e.id), coverage_matrix: { schema_version: 1 as const, matrix_id: 'material-coverage', rows: c.contract.requirements.map(r => ({ requirement_id: r.id, evidence_ids: c.evidence.filter(e => e.supports.some(s => s.requirement === r.id)).map(e => e.id), status: 'covered' as const })) }, expected_media_verified_at: Object.fromEntries([...originals.values()].map(o => [o.asset_id, o.verified_at])), policy_version: 'knowledge-v1', timeline_version: 0, created_at: stamp };
      const pack: any = await host.assembleMaterialEvidencePack(packInput);
      // Remove the actual carriers of one requirement through normal Pack construction.
      const missingIds = packInput.coverage_matrix.rows[0]!.evidence_ids;
      const incomplete: any = await host.assembleMaterialEvidencePack({ ...packInput, pack_id: 'missing-required-material', evidence_ids: packInput.evidence_ids.filter(id => !missingIds.includes(id)), coverage_matrix: { ...packInput.coverage_matrix, matrix_id: 'missing-coverage', rows: packInput.coverage_matrix.rows.map(r => ({ ...r, evidence_ids: r.evidence_ids.filter(id => !missingIds.includes(id)), status: r.evidence_ids.every(id => missingIds.includes(id)) ? 'missing' as const : 'covered' as const })) } });
      assert.notEqual(incomplete.value.status, 'sufficient');
      assert.ok(incomplete.value.sufficiency.missing_requirement_ids.includes(c.contract.requirements[0]!.id));
      const packRef = ref(pack, 'pack_id');
      const skill = builtInCreativeSkillDefinitions.find(s => s.status === 'published')!; host.pinBuiltInCreativeSkillDefinition(skill.skill_id, skill.skill_version);
      const evaluation: any = await host.evaluateCreativeSkillKnowledge({ evaluation_id: 'material-skill', definition_ref: { object_id: skill.skill_id, object_version: skill.skill_version, digest: skill.definition_digest }, contract_ref: contractRef, material_pack_ref: packRef, context_tags: ['personal-story', 'reaction-evidenced'], parameter_values: { intensity: 'moderate' }, evaluated_at: stamp });
      host.pinBuiltInDurationBlueprint(caseBlueprint.blueprint_id, 1);
      const duration: any = await host.evaluateDurationBlueprint({ feasibility_id: 'material-duration', blueprint_ref: { object_id: caseBlueprint.blueprint_id, object_version: 1, digest: caseBlueprint.definition_digest }, contract_ref: contractRef, material_pack_ref: packRef, evaluated_at: stamp });
      const common = { contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [ref(evaluation, 'evaluation_id')], duration_feasibility_ref: ref(duration, 'feasibility_id') };
      for (const p of c.candidates) await host.createStoryDirection({ ...common, direction_id: `direction-${p.id}`, title: p.title, thesis: p.thesis, expected_benefits: [p.tradeoff], risks: [], alternatives: [], confidence: { score: 1, basis: [c.provenance.method] }, created_at: stamp });
      const selected = await action({ action: 'direction.select', selected_id: `direction-${chosen.id}` });
      for (const p of c.candidates) {
        await host.proposeStoryV2({ ...common, direction_ref: ref(selected.direction, 'direction_id'), proposal_id: `story-${p.id}`, thesis: p.thesis, audience_promise: c.contract.goal, beats: p.beats.map((b, index) => {
          const entries = b.evidence.map(id => c.evidence.find(e => e.id === id)!);
          const scale = entries.reduce((n, e) => n * BigInt(e.timescale), 1n);
          const value = entries.reduce((n, e) => n + BigInt(e.end - e.start) * (scale / BigInt(e.timescale)), 0n);
          const gcd = (a: bigint, z: bigint): bigint => z ? gcd(z, a % z) : a; const divisor = gcd(value, scale);
          assert.ok(value / divisor <= BigInt(Number.MAX_SAFE_INTEGER) && scale / divisor <= BigInt(Number.MAX_SAFE_INTEGER));
          return { beat_id: b.id, role: b.role, purpose: b.purpose, target_duration: { schema_version: 1 as const, value: Number(value / divisor), timescale: Number(scale / divisor) }, evidence_refs: b.evidence.map(id => { const e = pack.value.evidence_refs.find((x: any) => x.evidence_id === id); return { object_id: id, object_version: e.evidence_version, digest: e.content_digest }; }), alternative_evidence_refs: [], coverage_requirement_ids: [...new Set(entries.flatMap(e => e.supports.map(s => s.requirement)))], entry_state: `state-${index}`, exit_state: `state-${index + 1}`, desired_emotion: 'faithful', continuity_constraints: [b.purpose], confidence: { score: 1, basis: [c.provenance.method] }, reason: b.purpose, risks: entries.flatMap(e => e.uncertainty), unresolved_assumptions: [] };
        }), risks: [], alternatives: [], created_at: stamp });
      }
      if (prepareForHuman) {
        const ws: any = await host.readStage2Workspace(); assert.equal(ws.approved_plans.length, 0); assert.equal(ws.executions.length, 0);
        results.push({ project, candidate: chosen.id, status: 'story_approval_pending', workspace_digest: ws.workspace_digest }); continue;
      }
      const approved = await action({ action: 'story.approve', selected_id: `story-${chosen.id}` });
      const intentWorkspace: any = await host.readStage2Workspace();
      const generation = { stage: 'intent' as const, workspace_digest: intentWorkspace.workspace_digest, reason: 'compile every approved Evidence through canonical Product' };
      const generationReview = await host.prepareStage2ProductGenerationReview(generation);
      const generated: any = await host.performStage2ProductGeneration(human.credential, generation, generationReview);
      const card = generated.intents.find((i: any) => i.status === 'candidate'); assert.ok(card);
      assert.equal(card.operations.length, chosen.beats.flatMap(b => b.evidence).length, 'Product Intent must retain every approved Evidence range');
      const intent = { value: { intent_id: card.object_id } };
      const execute = async (intentId: string) => { const approval = await action({ action: 'intent.approve', intent_id: intentId }); return action({ action: 'intent.execute', intent_id: intentId, proposal_approval_decision_id: approval.value.decision_id }); };
      let execution = await execute(intent.value.intent_id);
      const saveRender = async (label: string) => {
        const ws: any = await host.readStage2Workspace();
        const rendered: any = await host.renderStage2ProductExecution({ workspace_digest: ws.workspace_digest, execution_id: execution.execution_id });
        const current: any = await host.readStage2Workspace(); assert.equal(current.review.render.binding_status, 'current');
        const timeline: any = host.readTimelineSnapshot();
        const clips = timeline.tracks.find((t: any) => t.track_id === 'video-main').clips;
        const tick = timeline.sequence?.timebase ?? { value: 1n, timescale: clips[0].source.timescale };
        const tickSeconds = Number(tick.value) / Number(tick.timescale);
        const record: any = { label, project, timeline_version: timeline.version, execution, clips, qc: rendered.status.qc, checks: [] };
        for (const target of ['preview', 'master']) {
          const output = rendered[target].outputs.find((o: any) => o.kind === 'render'); assert.ok(output?.path);
          const path = resolve(root, `${chosen.id}-${label}-${target}.mp4`); await copyFile(output.path, path);
          const probe = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path])).stdout);
          await run('ffmpeg', ['-v', 'error', '-xerror', '-i', path, '-f', 'null', '-'], { maxBuffer: 1024 * 1024 });
          const last = clips.at(-1); const expected = Number(last.timeline_start + last.timeline_duration) * tickSeconds;
          const video = probe.streams.find((s: any) => s.codec_type === 'video'); const [n, d] = video.avg_frame_rate.split('/').map(Number);
          const audio = probe.streams.find((s: any) => s.codec_type === 'audio');
          const tolerance = d / n + (audio ? 1024 / Number(audio.sample_rate) : 0);
          assert.ok(Math.abs(Number(probe.format.duration) - expected) <= tolerance, 'decoded full duration must match committed extent');
          // Decode intervals throughout every clip, including latter half and tail.
          // Store measurements for source-aware human assessment; no blanket silence waiver.
          for (const clip of clips) {
            const start = Number(clip.timeline_start) * tickSeconds, length = Number(clip.timeline_duration) * tickSeconds;
            const window = Math.min(length / 4, 0.5);
            const sourceAsset = c.assets.find(a => `asset:sha256:${a.sha256}` === clip.source.asset_id)!;
            for (const at of [start, start + length / 2 - window / 2, start + length - window]) {
              const measurement = await run('ffmpeg', ['-v', 'info', '-ss', String(at), '-t', String(window), '-i', path, '-af', 'astats=metadata=0:reset=0', '-vf', 'signalstats,metadata=print', '-f', 'null', '-'], { maxBuffer: 4 * 1024 * 1024 });
              const sourceAt = Number(clip.source.start_pts) / Number(clip.source.timescale) + at - start;
              const sourceMeasurement = await run('ffmpeg', ['-v', 'info', '-ss', String(sourceAt), '-t', String(window), '-i', sourceAsset.path, '-af', 'astats=metadata=0:reset=0', '-vf', 'signalstats,metadata=print', '-f', 'null', '-'], { maxBuffer: 4 * 1024 * 1024 });
              const rms = (s: string) => [...s.matchAll(/RMS level dB: ([^\r\n]+)/g)].map(m => Number(m[1]));
              const sourceRms = rms(sourceMeasurement.stderr), outputRms = rms(measurement.stderr);
              assert.ok(measurement.stderr.match(/lavfi.signalstats.YAVG=/), 'decoded interval must contain picture measurements');
              if (sourceRms.length) assert.ok(outputRms.length, 'source audio stream must survive into output');
              if (sourceRms.some(Number.isFinite)) assert.ok(outputRms.some(Number.isFinite), 'audible source interval cannot become digital silence');
              record.checks.push({ target, clip: clip.clip_id, at, window, source_at: sourceAt, source_audio_rms: sourceRms, audio_rms: outputRms, picture_luma: measurement.stderr.match(/lavfi.signalstats.YAVG=[^\r\n]+/g), source_picture_luma: sourceMeasurement.stderr.match(/lavfi.signalstats.YAVG=[^\r\n]+/g) });
            }
            if (start > 0) {
              const seam = await run('ffmpeg', ['-v', 'info', '-ss', String(start - window / 2), '-t', String(window), '-i', path, '-af', 'astats=metadata=0:reset=0', '-vf', 'signalstats,metadata=print', '-f', 'null', '-'], { maxBuffer: 4 * 1024 * 1024 });
              assert.match(seam.stderr, /lavfi.signalstats.YAVG=/);
              record.checks.push({ target, seam_at: start, window, measurements: seam.stderr });
            }
          }
          record[target] = { path, sha256: await fileHash(path), semantic_graph_hash: output.semantic_graph_hash, probe };
          assert.equal(output.semantic_graph_hash, execution.semantic_graph_hash);
        }
        assert.equal(record.qc, 'passed'); results.push(record); return record;
      };
      const baseline = await saveRender('before');
      const versionSnapshot = host.readTimelineSnapshot(), beforeStaleResults = host.listRenderResults();
      await assert.rejects(() => host.renderStage2ProductExecution({ workspace_digest: '0'.repeat(64), execution_id: execution.execution_id }), /WORKSPACE_STALE/);
      assert.deepEqual(host.readTimelineSnapshot(), versionSnapshot); assert.deepEqual(host.listRenderResults(), beforeStaleResults);
      baseline.stale_workspace = { mutation: 'request workspace digest changed', error: 'PRODUCT_WORKSPACE_STALE', timeline_and_results_unchanged: true };
      if (chosen.id === c.feedback.candidate) {
        const before: any = host.readTimelineSnapshot(); const track = before.tracks.find((t: any) => t.track_id === 'video-main'), tail = track.clips.at(-1);
        const e = c.evidence.find(e => e.id === c.feedback.evidence)!;
        assert.ok(tail.semantic_sidecar.evidence_refs.includes(e.id));
        const trim = { schema_version: 1 as const, value: c.feedback.trim_pts, timescale: e.timescale };
        const target = { track_id: 'video-main', clip_id: tail.clip_id, trim_duration: trim, proposed_source: { asset_id: tail.source.asset_id, start: { schema_version: 1 as const, value: Number(tail.source.start_pts), timescale: e.timescale }, end: { schema_version: 1 as const, value: Number(tail.source.end_pts) - trim.value, timescale: e.timescale } } };
        const feedback: any = await host.createFeedbackRevision({ diagnosis_id: 'case-trim', intent_id: 'case-trim-intent', base_execution_id: execution.execution_id, target, feedback_text: c.feedback.reason, reason: c.feedback.reason, alternatives: ['retain current cut'], confidence: { score: 1, basis: c.feedback.preserved_facts } });
        baseline.feedback_preview = await host.previewFeedbackRevision(feedback.intent.value.intent_id);
        execution = await execute(feedback.intent.value.intent_id);
        const after: any = host.readTimelineSnapshot();
        assert.deepEqual(after.tracks.find((t: any) => t.track_id === 'video-main').clips.slice(0, -1), track.clips.slice(0, -1));
        await saveRender('after');
        // Separate legal suggestion explicitly rejected; never substitute invalid-input rejection.
        const currentTail = after.tracks.find((t: any) => t.track_id === 'video-main').clips.at(-1);
        const rejected: any = await host.createFeedbackRevision({ diagnosis_id: 'case-reject', intent_id: 'case-reject-intent', base_execution_id: execution.execution_id, target: { ...target, trim_duration: { ...trim, value: 1 }, proposed_source: { ...target.proposed_source, end: { ...target.proposed_source.end, value: Number(currentTail.source.end_pts) - 1 } } }, feedback_text: 'retain this version', reason: 'separate rejection protocol check', alternatives: ['retain current cut'], confidence: { score: 1, basis: ['exact current tail'] } });
        await action({ action: 'feedback.reject', intent_id: rejected.intent.value.intent_id });
        assert.deepEqual(host.readTimelineSnapshot(), after);
        const ws: any = await host.readStage2Workspace(); const digest = ws.workspace_digest;
        await host.close(); await host.open(project);
        const reopened: any = await host.readStage2Workspace(); assert.equal(reopened.workspace_digest, digest);
        assert.equal(reopened.intents.find((i: any) => i.object_id === rejected.intent.value.intent_id).status, 'rejected');
        await assert.rejects(() => execute(rejected.intent.value.intent_id), /UNAVAILABLE_OR_STALE|REJECTED/);
        baseline.rejection = { intent_id: rejected.intent.value.intent_id, persisted: true, reopen: true, timeline_unchanged: true };
      } else {
        const original = [...originals.values()].find(o => o.asset_id === baseline.clips[0].source.asset_id); assert.ok(original);
        const beforePermissionTimeline = host.readTimelineSnapshot(), beforePermissionResults = host.listRenderResults();
        await host.recordMaterialPermission(await human.materialPermission(host, 'isolated-permission-denied', { contract_ref: contractRef, asset_id: original.asset_id, asset_location_id: original.asset_location_id, location_ref: original.location_ref, verified_at: original.verified_at, permission_state: 'denied', policy_ref: draft.rights_policy_ref }));
        const ws: any = await host.readStage2Workspace();
        await assert.rejects(() => host.renderStage2ProductExecution({ workspace_digest: ws.workspace_digest, execution_id: execution.execution_id }), /EXECUTION_RENDER_UNAVAILABLE_OR_STALE/);
        assert.deepEqual(host.readTimelineSnapshot(), beforePermissionTimeline); assert.deepEqual(host.listRenderResults(), beforePermissionResults);
        baseline.permission_variant = { mutation: 'authorized test Original permission revoked in isolated precheck project', error: 'PRODUCT_EXECUTION_RENDER_UNAVAILABLE_OR_STALE', timeline_and_results_unchanged: true, project_current_authority: 'revoked; viewed output is historical' };
      }
    } finally { await host.close(); }
  }
  await writeFile(resolve(root, prepareForHuman ? 'human-projects.json' : 'technical-results.json'), json({ source_fingerprint: await fingerprint(), node_version: process.version, tool_versions: { ffmpeg: (await run('ffmpeg', ['-version'])).stdout.split('\n')[0], ffprobe: (await run('ffprobe', ['-version'])).stdout.split('\n')[0] }, input_hashes: c.assets.map(a => ({ id: a.id, sha256: a.sha256 })), case_id: c.case_id, case_digest: editorialObjectDigest(c), claim: 'automated precheck only; localized luma, freeze and listening assessment still requires review', human_status: 'pending', results }));
  return results;
}
