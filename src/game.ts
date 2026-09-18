export const QUESTION_SECONDS = 20;

/** Score for one correct answer: a flat base, a bonus for answering quickly,
 * and a bonus that grows with the player's current streak (capped so one
 * lucky guess late in the game can't dominate the total). */
export function computeScore(remainingSeconds: number, streakBeforeThisAnswer: number): number {
  const base = 50;
  const timeBonus = remainingSeconds * 5;
  const streakBonus = Math.min(streakBeforeThisAnswer, 10) * 10;
  return base + timeBonus + streakBonus;
}

/** Fisher-Yates shuffle; does not mutate the input array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Renders a passage's `<vocab>word</vocab>` marker as a highlighted span. */
export function renderPassageHtml(text: string): string {
  return escapeHtml(text).replace(
    /&lt;vocab&gt;(.*?)&lt;\/vocab&gt;/g,
    '<mark class="vocab-word">$1</mark>',
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
