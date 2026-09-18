# Black History Explorer

A timed reading-comprehension and vocabulary game, written for a
middle-school reading level, framed as a time-traveling "Chronicle"
guide. Ten short passages about figures from Black history, each followed
by three quick questions — vocabulary-in-context, main idea, and
inference — answered against a 20-second clock. Fast, correct answers
score more; a run of correct answers builds a streak bonus.

The mission ends with a **systemic moment**: instead of one figure's
story, the player takes a real decision point (the 1866 vote to override
Andrew Johnson's veto of the Civil Rights Act), picks a path, sees a short
speculative vignette if their choice diverges from history, then the real
outcome — including the honest, unflinching epilogue about Reconstruction's
later collapse — either way. The real outcome never changes based on the
player's choice, only whether their choice matched it.

Progress carries across sessions: correct answers earn XP that levels up
the player's hand-drawn pixel-art guide, unlocking cosmetic gear the
player can toggle on or off, alongside a set of badges for accuracy,
speed, and streaks. Feedback is reinforced with retro arcade touches — a
CRT scanline overlay, particle bursts, screen flashes, and 8-bit sound
effects synthesized live via the Web Audio API (no audio files).

**Play it:** https://jnwlott-ops.github.io/black-history-explorer/

## Running it locally

```bash
npm install
npm run dev
```

Then open the printed local URL in a browser.

```bash
npm run typecheck   # type-check only
npm run build        # production build to dist/
```

## How it's built

Plain TypeScript and DOM APIs via [Vite](https://vitejs.dev/) — no UI
framework. Kept intentionally small:

```
src/
  types.ts     Passage, Question, SystemicMoment, gear, badge, and save shapes
  content.ts   The ten passages and the Reconstruction systemic moment
  game.ts      Pure helpers: scoring, shuffling, passage-text rendering
  sprite.ts    Hand-coded pixel-art avatar + gear, drawn to a <canvas>
  sfx.ts       8-bit sound effects synthesized via the Web Audio API
  effects.ts   DOM-based arcade juice: screen flash, particles, score pop, CRT overlay
  save.ts      localStorage persistence, XP/leveling, and badge rules
  main.ts      App state machine and screen rendering
  style.css    Styling
```

## Deployment

Every push to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`.

## Adding a new figure

Add an entry to the `passages` array in `src/content.ts`: a short passage
(with one word wrapped in `<vocab>...</vocab>` for the vocabulary
question), its definition, a fun fact, and three questions — one of kind
`vocab`, one `main-idea`, one `inference` — each with four choices and an
explanation shown after answering.
