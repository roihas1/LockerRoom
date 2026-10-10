let ctx: AudioContext | null = null;

/** Short arena horn via Web Audio. Must be called from a user gesture. */
export function playBuzzer(durationMs = 700): void {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") return;
  ctx ??= new AudioContext();
  const now = ctx.currentTime;
  const end = now + durationMs / 1000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
  gain.gain.setValueAtTime(0.25, end - 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(ctx.destination);
  for (const freq of [196, 247]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(end);
  }
}
