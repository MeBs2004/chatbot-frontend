let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume();

  return audioCtx;
}

function playTone(ctx, frequency, startTime, duration, peakGain) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// Must be called synchronously inside a user-gesture handler (click/keydown)
// so the AudioContext is allowed to start/resume under browser autoplay policy.
export function primeNotificationSound() {
  getAudioContext();
}

// Soft two-note "message received" chime.
export function playBotReplySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(ctx, 660, now, 0.14, 0.16);
  playTone(ctx, 880, now + 0.09, 0.22, 0.2);
}
