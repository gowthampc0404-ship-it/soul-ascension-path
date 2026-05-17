// Web Audio + SpeechSynthesis fallback. Designed to be swap-replaceable with
// @capacitor-community/text-to-speech and @capacitor/local-notifications.

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
    catch { return null; }
  }
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.18, delay = 0) {
  const c = getCtx(); if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0); osc.stop(t0 + duration + 0.05);
}

export function sfxQuestComplete() {
  tone(140, 0.35, "sine", 0.28);
  tone(220, 0.18, "triangle", 0.18, 0.05);
  tone(440, 0.12, "triangle", 0.12, 0.12);
}
export function sfxLevelUp() {
  tone(523, 0.18, "sawtooth", 0.18);
  tone(659, 0.18, "sawtooth", 0.18, 0.14);
  tone(784, 0.28, "sawtooth", 0.2, 0.28);
  tone(1046, 0.5, "triangle", 0.22, 0.46);
}
export function sfxFailure() {
  tone(180, 0.4, "square", 0.16);
  tone(120, 0.6, "sawtooth", 0.18, 0.08);
}
export function sfxSlash() {
  const c = getCtx(); if (!c) return;
  const buf = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = c.createBufferSource(); src.buffer = buf;
  const filt = c.createBiquadFilter(); filt.type = "highpass"; filt.frequency.value = 1800;
  const g = c.createGain(); g.gain.value = 0.22;
  src.connect(filt).connect(g).connect(c.destination); src.start();
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 0.7; u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* noop */ }
}
