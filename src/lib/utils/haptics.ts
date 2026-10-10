/** Short vibration on supporting phones. No-op on desktop, iOS Safari, or when the user prefers reduced motion. */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate(pattern);
}
