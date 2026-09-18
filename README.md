# Black History Explorer

A timed reading-comprehension and vocabulary game, written for a
middle-school reading level. Ten short passages about figures from Black
history, each followed by three quick questions — vocabulary-in-context,
main idea, and inference — answered against a 20-second clock. Fast,
correct answers score more; a run of correct answers builds a streak bonus.

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
  types.ts     Passage and Question shapes
  content.ts   The ten passages, their vocab word, and their questions
  game.ts      Pure helpers: scoring, shuffling, passage-text rendering
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
