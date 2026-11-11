'use strict';
const { ipcRenderer } = require('electron');
let recorder, stream, stopping = false, failed = false, pending = 0, sequence = 0;
let chain = Promise.resolve();
const MAX_PENDING = 32 * 1024 * 1024;
const stopTracks = () => { if (stream) for (const track of stream.getTracks()) track.stop(); };
function report(error) {
  if (failed) return;
  failed = true;
  stopping = true;
  try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch { /* error already reported */ }
  stopTracks();
  void ipcRenderer.invoke('p5:error', String(error?.message || error)).catch(() => {});
}
async function begin() {
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: true });
    if (stream.getVideoTracks().length !== 1 || stream.getAudioTracks().length !== 1) throw Error('desktop capture requires one video and one system audio track');
    for (const track of stream.getTracks()) track.addEventListener('ended', () => { if (!stopping) report(Error(`capture track ended: ${track.kind}`)); });
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw Error('WebM audio/video encoder unavailable');
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });
    recorder.onstart = () => {
      chain = ipcRenderer.invoke('p5:started', { wallMs: Date.now(), monoMs: performance.now() });
      void chain.catch(report);
    };
    recorder.ondataavailable = event => {
      if (failed || !event.data || !event.data.size) return;
      const size = event.data.size, index = sequence++;
      pending += size;
      if (pending > MAX_PENDING) { report(Error('recording output queue overflow')); return; }
      chain = chain.then(async () => {
        const bytes = await event.data.arrayBuffer();
        await ipcRenderer.invoke('p5:chunk', index, bytes);
        pending -= size;
      });
      void chain.catch(report);
    };
    recorder.onerror = event => report(event.error || Error('MediaRecorder error'));
    recorder.onstop = () => {
      const finished = { wallMs: Date.now(), monoMs: performance.now() };
      stopTracks();
      void chain.then(async () => {
        if (failed || !stopping) throw Error('unexpected recorder stop');
        await ipcRenderer.invoke('p5:finished', finished);
      }).catch(report);
    };
    recorder.start(1000);
  } catch (error) { report(error); }
}
ipcRenderer.on('p5:stop', () => {
  if (failed || stopping || !recorder || recorder.state !== 'recording') { report(Error('invalid stop state')); return; }
  stopping = true;
  try { recorder.stop(); } catch (error) { report(error); }
});
window.addEventListener('DOMContentLoaded', () => document.getElementById('start').addEventListener('click', () => { void begin(); }, { once: true }));
