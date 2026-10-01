import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";

/** Public acquisition metadata is evaluator-only and must not be supplied to the generator. */
export const publicSources = [
  { id: "A01", partition: "learning", title: "Ranger-led Hike Down Switchbacks into the Canyon 02", credit: "NPS Video: Blum, Wang and Well", license: "Public domain; no implied NPS endorsement", page: "https://home.nps.gov/media/video/view.htm?id=3961B82C-155D-451F-67F8F2572995A422", download: "https://www.nps.gov/nps-audiovideo/audiovideo/5d878af8-d70f-4fd3-aaff-e49d746a98741080p.mp4" },
  { id: "B01", partition: "held-out", title: "Acadia B-Roll: Visitor Activities", credit: "NPS", license: "Public domain:Full Granting Rights", page: "https://npgallery.nps.gov/AssetDetail/98e923e4-d794-4399-b345-da0bf102588f", acquisition_variant: "official full-length low-resolution proxy after original transport failures", original_download: "https://npgallery.nps.gov/media/video/98e923e4-d794-4399-b345-da0bf102588f/Original.mp4", download: "https://npgallery.nps.gov/media/video/98e923e4-d794-4399-b345-da0bf102588f/ProxyLoRes.mp4" },
  { id: "B02", partition: "held-out", title: "Acadia B-Roll: Coastal Scenery", credit: "NPS Video", license: "Public domain:Full Granting Rights", page: "https://npgallery.nps.gov/AssetDetail/6fc09aec-7fc2-47ed-b8cc-e1b10861dd3e", acquisition_variant: "official full-length low-resolution proxy", original_download: "https://npgallery.nps.gov/media/video/6fc09aec-7fc2-47ed-b8cc-e1b10861dd3e/Original.mp4", download: "https://npgallery.nps.gov/media/video/6fc09aec-7fc2-47ed-b8cc-e1b10861dd3e/ProxyLoRes.mp4" },
] as const;

export async function digestFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function preparePublicMedia(reviewRoot: string): Promise<void> {
  const mediaRoot = resolve(reviewRoot, "public-media"), evidenceRoot = resolve(reviewRoot, "source-rights");
  await mkdir(mediaRoot, { recursive: true }); await mkdir(evidenceRoot, { recursive: true });
  const manifest: unknown[] = [];
  let previous: any = { sources: [] };
  try { previous = JSON.parse(await readFile(resolve(evidenceRoot, "manifest.json"), "utf8")); } catch (error: any) { if (error.code !== "ENOENT") throw error; }
  for (const source of publicSources) {
    const path = resolve(mediaRoot, `source-${source.id}.mp4`), pagePath = resolve(evidenceRoot, `${source.id}.html`);
    // Acquisition is explicit and never overwrites an existing source; partial downloads remain evidence.
    let exists = false; try { await stat(path); exists = true; } catch (error: any) { if (error.code !== "ENOENT") throw error; }
    if (exists) {
      let receipt: any = previous.sources.find((item: any) => item.id === source.id);
      if (!receipt) { try { receipt = JSON.parse(await readFile(resolve(evidenceRoot, `${source.id}.download.json`), "utf8")); } catch (error: any) { if (error.code !== "ENOENT") throw error; } }
      if (!receipt || receipt.sha256 !== await digestFile(path) || receipt.bytes !== (await stat(path)).size) throw new Error(`SOURCE_INCOMPLETE_OR_CHANGED ${source.id}: existing bytes have no matching completed acquisition receipt`);
    }
    if (!exists) {
      let html: string;
      try { html = await readFile(pagePath, "utf8"); } catch (error: any) {
        if (error.code !== "ENOENT") throw error;
        const page = await fetch(source.page, { signal: AbortSignal.timeout(60000) });
        if (!page.ok) throw new Error(`SOURCE_LICENSE_FETCH_FAILED ${source.id}: HTTP ${page.status}`);
        html = await page.text(); await writeFile(pagePath, html, { flag: "wx" });
      }
      if (!/public\s+domain/i.test(html)) throw new Error(`SOURCE_LICENSE_UNVERIFIED ${source.id}`);
      if (process.platform === "win32") {
        const acquisition = spawnSync("pwsh", ["-NoProfile", "-File", resolve(import.meta.dirname, "real-download.ps1"), "-Uri", source.download, "-Destination", path], { encoding: "utf8", windowsHide: true, timeout: 310000 });
        await writeFile(resolve(evidenceRoot, `${source.id}.transport-${Date.now()}.log`), acquisition.stdout + acquisition.stderr);
        if (acquisition.status !== 0) throw new Error(`SOURCE_DOWNLOAD_FAILED ${source.id}: ${acquisition.error?.message ?? acquisition.stderr}`);
      } else {
        const response = await fetch(source.download, { signal: AbortSignal.timeout(300000) });
        if (!response.ok || !response.body || !response.headers.get("content-type")?.startsWith("video/")) throw new Error(`SOURCE_DOWNLOAD_FAILED ${source.id}: HTTP ${response.status}`);
        await pipeline(Readable.fromWeb(response.body as any), createWriteStream(path, { flags: "wx" }));
        const expectedLength = response.headers.get("content-length");
        if (expectedLength !== null && (await stat(path)).size !== Number(expectedLength)) throw new Error(`SOURCE_LENGTH_MISMATCH ${source.id}`);
      }
      const bytes = (await stat(path)).size;
      await writeFile(resolve(evidenceRoot, `${source.id}.download.json`), JSON.stringify({ download: source.download, bytes, sha256: await digestFile(path), at: new Date().toISOString() }, null, 2), { flag: "wx" });
    }
    const probe = spawnSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", path], { encoding: "utf8", windowsHide: true });
    if (probe.status !== 0) throw new Error(`SOURCE_PROBE_FAILED ${source.id}: ${probe.stderr}`);
    const facts = JSON.parse(probe.stdout);
    if (!facts.streams.some((stream: any) => stream.codec_type === "video")) throw new Error(`SOURCE_HAS_NO_VIDEO ${source.id}`);
    await writeFile(resolve(evidenceRoot, `${source.id}.probe.json`), JSON.stringify(facts, null, 2));
    manifest.push({ ...source, local_file: path, sha256: await digestFile(path), bytes: (await stat(path)).size, license_snapshot_sha256: await digestFile(pagePath), acquired_at: new Date().toISOString(), probe: facts, listening_status: "not-yet-listened", evaluator_only: true });
    await writeFile(resolve(evidenceRoot, "manifest.json"), JSON.stringify({ test_identity: "stage3-isolated-creator", sources: manifest, held_out_rule: "B sources are excluded from learning; no source descriptions or evaluator answers are generator inputs" }, null, 2));
    console.log(`Acquired ${source.id}: real video, ${(await stat(path)).size} bytes`);
  }
}

export async function readPublicMedia(reviewRoot: string): Promise<any> {
  return JSON.parse(await readFile(resolve(reviewRoot, "source-rights/manifest.json"), "utf8"));
}
