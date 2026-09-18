/** Brief full-viewport color flash, used on correct/wrong feedback. */
export function flashScreen(color: string): void {
  const el = document.createElement('div');
  el.className = 'screen-flash';
  el.style.background = color;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/** Small colored particles bursting outward from a point, for a correct answer. */
export function burstParticles(x: number, y: number, color: string): void {
  const container = document.createElement('div');
  container.className = 'particle-burst';
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;
  document.body.appendChild(container);

  const count = 10;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const angle = (i / count) * Math.PI * 2;
    const distance = 40 + Math.random() * 30;
    p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    p.style.background = color;
    container.appendChild(p);
  }

  window.setTimeout(() => container.remove(), 700);
}

/** Floating "+N" text that rises and fades near a reference element. */
export function popScore(anchor: HTMLElement, text: string): void {
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'score-pop';
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/** Adds the fixed CRT scanline overlay once; safe to call more than once. */
export function ensureScanlineOverlay(): void {
  if (document.querySelector('.crt-overlay')) return;
  const el = document.createElement('div');
  el.className = 'crt-overlay';
  document.body.appendChild(el);
}
