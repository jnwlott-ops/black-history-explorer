export type QuestionKind = 'vocab' | 'main-idea' | 'inference';

export interface Question {
  kind: QuestionKind;
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** Shown after the player answers, whether right or wrong. */
  explanation: string;
}

export interface Passage {
  id: string;
  name: string;
  years: string;
  /** Passage text with the vocabulary word wrapped in `<vocab>...</vocab>`. */
  text: string;
  vocabWord: string;
  vocabDefinition: string;
  funFact: string;
  questions: Question[];
  /** Where the player (a Chronicle time guide) lands, shown before the passage. */
  arrival: string;
  /** Shown after a correct answer: the moment's memory is anchored in the record. */
  memorySecured: string;
  /** Shown after a wrong or missed answer: the record blurs, no real history changes. */
  memoryFlicker: string;
}

export interface Choice {
  id: string;
  label: string;
}

/**
 * A systemic moment: instead of one figure's personal story, the player takes
 * a real decision point, picks a path, sees a short speculative vignette for
 * paths that diverge from history, then the real outcome either way. The
 * real outcome never changes based on the player's choice — only whether
 * their choice matched it.
 */
export interface SystemicMoment {
  id: string;
  title: string;
  year: string;
  setup: string;
  choices: Choice[];
  /** The id of the choice that matches what actually happened. */
  realityChoiceId: string;
  /** Short "what might have happened" vignette, keyed by non-reality choice id. */
  speculation: Record<string, string>;
  /** Reality intro shown when the player's choice matched history. */
  matchIntro: string;
  /** Reality intro shown when the player's choice didn't match history. */
  missIntro: string;
  /** The shared epilogue, told the same way regardless of the player's choice. */
  epilogue: string;
  closingLine: string;
  questions: Question[];
}

export type GearSlot = 'hat' | 'scarf' | 'sash' | 'cape';

export interface GearItem {
  id: string;
  slot: GearSlot;
  name: string;
  requiredLevel: number;
  /** Sparse pixel overrides painted on top of the base sprite: [x, y, color]. */
  pixels: [number, number, string][];
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
}

export interface SaveData {
  totalXp: number;
  badges: string[];
  vocabCorrectLifetime: number;
  runsCompleted: number;
  bestStreakLifetime: number;
  equipped: Partial<Record<GearSlot, string>>;
  guideName: string;
  skinTone: string;
  robeColor: string;
}

/** A simple NES-tile-style landscape, built from flat color bands and silhouette rects. */
export interface SceneConfig {
  sky: [string, string];
  ground: string;
  groundLine: number;
  silhouettes: { x: number; y: number; w: number; h: number; color: string }[];
  accent?: { x: number; y: number; r: number; color: string };
}

export interface QuestChoiceOption {
  id: string;
  label: string;
  /** True for the one choice that matches what actually happened. */
  isReality: boolean;
  /** Shown on a wrong pick, narrating the negative fallout; the choice is then disabled. */
  consequence?: string;
}

/**
 * One chapter of a deep quest: the player "leaps" into a real person's
 * perspective at a real decision point and must find the choice that
 * matches history — wrong choices are eliminated with a consequence, not
 * treated as valid alternate outcomes.
 */
export interface QuestChapter {
  id: string;
  title: string;
  persona: string;
  personaBlurb: string;
  year: string;
  historicalContext: string;
  scene: string;
  sceneConfig: SceneConfig;
  choices: QuestChoiceOption[];
  realityText: string;
  closingLine: string;
  questions: Question[];
}

export interface Quest {
  id: string;
  title: string;
  subject: string;
  chapters: QuestChapter[];
}
