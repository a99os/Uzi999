import { API_URL } from "./api-client";

let ctx: AudioContext | null = null;

function tone(context: AudioContext, freq: number, startTime: number, duration: number) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playNotificationDing(customSoundUrl?: string | null) {
  if (customSoundUrl) {
    const audio = new Audio(`${API_URL}${customSoundUrl}`);
    audio.play().catch(() => {
      // Autoplay blocked or file unavailable — fail silently.
    });
    return;
  }
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    tone(ctx, 880, now, 0.18);
    tone(ctx, 1318.5, now + 0.12, 0.22);
  } catch {
    // Audio not available (e.g. autoplay policy) — fail silently.
  }
}
