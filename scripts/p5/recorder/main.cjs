'use strict';
const { app, BrowserWindow, desktopCapturer, ipcMain, screen, session } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { outputWithinRoot, validateChunk, validateCapture, readStopMarker } = require('./guards.cjs');
const run = promisify(execFile);
const emit = (event, extra = {}) => process.stdout.write(JSON.stringify({ event, ...extra }) + '\n');

async function digestFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--list-displays') {
    await app.whenReady();
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
    const displays = screen.getAllDisplays().map(display => ({ id: String(display.id), width: display.size.width, height: display.size.height, capturable: sources.some(source => source.display_id === String(display.id)) }));
    emit('displays', { displays });
    app.exit(0);
    return;
  }
  if (args.length !== 4 || args[0] !== '--output' || args[2] !== '--display-id' || !args[3]) throw Error('usage: --output <absolute .webm> --display-id <id>');
  if (!path.isAbsolute(args[1]) || path.extname(args[1]).toLowerCase() !== '.webm') throw Error('output must be absolute .webm');
  const rootName = process.env.AVE_INTERACTION_EVIDENCE_ROOT;
  if (!rootName || !path.isAbsolute(rootName)) throw Error('absolute AVE_INTERACTION_EVIDENCE_ROOT required');
  const root = await fsp.realpath(rootName);
  const parent = await fsp.realpath(path.dirname(args[1]));
  outputWithinRoot(root, parent);
  const output = path.join(parent, path.basename(args[1]));
  const rawPath = output + '.raw.webm', remuxPath = output + '.remux.webm', stopPath = output + '.stop.json';
  for (const target of [output, remuxPath, stopPath]) {
    try { await fsp.lstat(target); throw Error(`output already exists: ${target}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  let raw = await fsp.open(rawPath, 'wx', 0o600);
  app.setPath('userData', path.join(parent, `p5-recorder-profile-${process.pid}`));
  await app.whenReady();
  let win, state = 'starting', seq = 0, failure = false, started = null, requestGranted = false;
  const closeRaw = async () => { if (raw) { const file = raw; raw = null; await file.close(); } };
  async function fail(error) {
    if (failure || state === 'done') return;
    failure = true; state = 'failed';
    emit('error', { message: String(error?.message || error) });
    try { await closeRaw(); } catch (error2) { emit('cleanup-error', { message: error2.message }); }
    app.exit(1);
  }
  function origin(event) {
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw Error('invalid recorder IPC origin');
  }
  ipcMain.handle('p5:started', (event, info) => {
    origin(event);
    if (state !== 'starting' || !info || !Number.isFinite(info.wallMs) || !Number.isFinite(info.monoMs)) throw Error('unexpected start');
    state = 'recording'; started = info;
    emit('started', { captured_at: new Date(info.wallMs).toISOString(), monotonic_ms: info.monoMs, display_id: args[3] });
  });
  ipcMain.handle('p5:chunk', async (event, index, bytes) => {
    origin(event);
    validateChunk(state, raw, seq, index, bytes);
    await raw.writeFile(Buffer.from(bytes)); seq++;
  });
  ipcMain.handle('p5:error', async (event, message) => { origin(event); await fail(Error(String(message))); });
  ipcMain.handle('p5:finished', async (event, info) => {
    origin(event);
    if (state !== 'stopping' || !started || !seq || !info || !Number.isFinite(info.wallMs) || !Number.isFinite(info.monoMs)) { await fail(Error('invalid recorder finish')); return; }
    state = 'finalizing';
    try {
      await raw.sync(); await closeRaw();
      await run(process.env.AVE_FFMPEG || 'ffmpeg', ['-v', 'error', '-n', '-i', rawPath, '-map', '0', '-c', 'copy', '-f', 'webm', remuxPath], { windowsHide: true, timeout: 300000, maxBuffer: 1024 * 1024 });
      const probeResult = await run(process.env.AVE_FFPROBE || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', remuxPath], { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
      const duration = validateCapture(started, info, JSON.parse(probeResult.stdout));
      await fsp.link(remuxPath, output);
      const result = { raw_path: rawPath, raw_sha256: await digestFile(rawPath), path: output, sha256: await digestFile(output), duration_seconds: duration, audio_track_present: true, video_track_present: true, captured_at: new Date(started.wallMs).toISOString(), finished_at: new Date(info.wallMs).toISOString(), chunks: seq };
      state = 'done'; emit('stopped', result); app.exit(0);
    } catch (error) { await fail(error); }
  });
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      if (requestGranted || !win || request.frame !== win.webContents.mainFrame || !request.videoRequested || !request.audioRequested) throw Error('unexpected display request');
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
      const matches = sources.filter(source => source.display_id === args[3]);
      if (matches.length !== 1) throw Error('display ID not uniquely available');
      requestGranted = true; callback({ video: matches[0], audio: 'loopback' });
    } catch (error) { callback(null); void fail(error); }
  });
  win = new BrowserWindow({ show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false, backgroundThrottling: false } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('render-process-gone', (_event, details) => { void fail(Error(`recorder renderer exited: ${details.reason}`)); });
  win.on('closed', () => { if (!['done', 'failed'].includes(state)) void fail(Error('recorder window closed')); });
  let checking = false;
  setInterval(async () => {
    if (checking || !['starting', 'recording'].includes(state) || !fs.existsSync(stopPath)) return;
    checking = true;
    try {
      const command = await readStopMarker(stopPath);
      if (command?.command !== 'stop' || Object.keys(command).length !== 1 || state !== 'recording') throw Error('unexpected recorder command');
      state = 'stopping'; win.webContents.send('p5:stop');
    } catch (error) { await fail(error); }
    finally { checking = false; }
  }, 250).unref();
  // The complete mixed-media journey can exceed two hours; keep one continuous
  // recording while retaining a finite fail-safe for an abandoned process.
  setTimeout(() => { if (!['done', 'failed'].includes(state)) void fail(Error('recorder maximum duration exceeded')); }, 8 * 60 * 60 * 1000).unref();
  await win.loadFile(path.join(__dirname, 'capture.html'));
  emit('ready', { display_id: args[3], stop_path: stopPath });
  await win.webContents.executeJavaScript("document.getElementById('start').click()", true);
}
main().catch(error => { emit('error', { message: String(error?.message || error) }); app.exit(1); });
