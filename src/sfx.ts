let ctx: AudioContext | null = null;

/** Must be called from inside a user-gesture handler (a click) the first time. */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType, gainPeak: number): void {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audio.currentTime + startOffset;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playBlip(): void {
  tone(440, 0, 0.06, 'square', 0.05);
}

export function playCorrect(): void {
  tone(523, 0, 0.09, 'square', 0.06);
  tone(784, 0.08, 0.12, 'square', 0.06);
}

export function playWrong(): void {
  tone(220, 0, 0.1, 'sawtooth', 0.05);
  tone(140, 0.09, 0.16, 'sawtooth', 0.05);
}

export function playLevelUp(): void {
  [523, 659, 784, 1047].forEach((freq, i) => tone(freq, i * 0.08, 0.14, 'square', 0.06));
}

export function playBadge(): void {
  tone(880, 0, 0.08, 'triangle', 0.07);
  tone(1046, 0.07, 0.16, 'triangle', 0.07);
}
