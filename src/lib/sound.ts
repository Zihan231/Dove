let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();
let ambient: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let ambientWanted = false;
let part2: AudioBufferSourceNode | null = null;

const listeners = new Set<() => void>();

function getCtx() {
  if (!ctx) {
    ctx = new AudioContext();
    ctx.onstatechange = () => listeners.forEach((l) => l());
  }
  return ctx;
}

export function isAudioRunning() {
  return ctx?.state === "running";
}

export function onAudioStateChange(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

// Browsers only allow audio after a user gesture; call this from one.
export async function unlockAudio() {
  await getCtx().resume().catch(() => {});
}

// Loops the full track. Scheduled even while the context is suspended (autoplay policy);
// it begins the moment audio is allowed.
export async function startAmbient() {
  ambientWanted = true;
  if (ambient) return;
  const c = getCtx();
  void c.resume().catch(() => {});
  const buf = await load("/audio/part1-loop-3.wav");
  if (!ambientWanted || ambient) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.8, c.currentTime + 0.5);
  src.connect(gain).connect(c.destination);
  src.start();
  ambient = { src, gain };
}

export function stopAmbient(fadeSeconds = 0.4) {
  ambientWanted = false;
  if (!ambient || !ctx) return;
  const { src, gain } = ambient;
  ambient = null;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSeconds);
  src.stop(ctx.currentTime + fadeSeconds + 0.05);
}

function load(url: string) {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => getCtx().decodeAudioData(b));
    buffers.set(url, p);
  }
  return p;
}

// Soundtrack for the healing video; starts together with it.
export async function playPart2() {
  const c = getCtx();
  if (c.state !== "running") await c.resume().catch(() => {});
  const buf = await load("/audio/part2-long.wav");
  stopPart2();
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start();
  part2 = src;
}

export function stopPart2() {
  try {
    part2?.stop();
  } catch {}
  part2 = null;
}
