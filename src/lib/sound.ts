// Subtle Web Audio chimes for task add/complete.
// Gated by a localStorage flag so a future mute toggle needs no rework.

const FLAG_KEY = "weeklie.sound";

function soundEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(FLAG_KEY) !== "0";
  } catch {
    return true;
  }
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  peak: number,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = audio.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playChime(variant: "add" | "complete") {
  if (!soundEnabled()) return;
  const audio = getCtx();
  if (!audio) return;

  if (variant === "add") {
    tone(audio, 660, 0, 0.12, 0.06);
  } else {
    tone(audio, 660, 0, 0.12, 0.06);
    tone(audio, 990, 0.09, 0.18, 0.06);
  }
}
