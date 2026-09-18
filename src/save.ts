import type { BadgeDef, SaveData } from './types';
import { SKIN_TONES, ROBE_COLORS } from './sprite';

const STORAGE_KEY = 'black-history-explorer:save';
export const XP_PER_CORRECT = 20;

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900, 3500];

export const BADGES: BadgeDef[] = [
  { id: 'first-jump', name: 'First Jump', description: 'Complete your first mission.' },
  { id: 'chronicle-keeper', name: 'Chronicle Keeper', description: 'Finish a mission without a single question timing out.' },
  { id: 'perfect-run', name: 'Perfect Run', description: 'Answer every question correctly in one mission.' },
  { id: 'streak-master', name: 'Streak Master', description: 'Reach a streak of five correct answers in a row.' },
  { id: 'quick-draw', name: 'Quick Draw', description: 'Answer correctly with 15 or more seconds still on the clock.' },
  { id: 'vocab-ace', name: 'Vocab Ace', description: 'Answer 15 vocabulary questions correctly, across all your missions.' },
  { id: 'reconstruction-witness', name: 'Reconstruction Witness', description: "Live through the vote that outlasted a presidency." },
  { id: 'time-traveler', name: 'Time Traveler', description: 'Complete three full missions.' },
];

function defaultSave(): SaveData {
  return {
    totalXp: 0,
    badges: [],
    vocabCorrectLifetime: 0,
    runsCompleted: 0,
    bestStreakLifetime: 0,
    equipped: {},
    guideName: 'Guide',
    skinTone: SKIN_TONES[0],
    robeColor: ROBE_COLORS[0],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — progress just won't persist.
  }
}

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function xpProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelForXp(xp);
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? floor + 1000;
  return { level, into: xp - floor, span: nextThreshold - floor };
}

export function rankForLevel(level: number): string {
  if (level >= 10) return 'Master Chronicler';
  if (level >= 8) return 'Chronicler';
  if (level >= 6) return 'Keeper';
  if (level >= 4) return 'Senior Guide';
  if (level >= 2) return 'Field Guide';
  return 'Novice Guide';
}

export interface RunStats {
  correctCount: number;
  totalQuestions: number;
  bestStreak: number;
  timeouts: number;
  vocabCorrectThisRun: number;
  hadQuickAnswer: boolean;
}

/** Applies a completed run's stats to the save, returning newly earned badge ids. */
export function applyRunToSave(save: SaveData, stats: RunStats): string[] {
  save.totalXp += stats.correctCount * XP_PER_CORRECT;
  save.runsCompleted += 1;
  save.vocabCorrectLifetime += stats.vocabCorrectThisRun;
  save.bestStreakLifetime = Math.max(save.bestStreakLifetime, stats.bestStreak);

  const earned: string[] = [];
  const has = (id: string) => save.badges.includes(id);
  const award = (id: string) => {
    if (!has(id)) {
      save.badges.push(id);
      earned.push(id);
    }
  };

  award('first-jump');
  if (stats.timeouts === 0) award('chronicle-keeper');
  if (stats.correctCount === stats.totalQuestions) award('perfect-run');
  if (save.bestStreakLifetime >= 5) award('streak-master');
  if (stats.hadQuickAnswer) award('quick-draw');
  if (save.vocabCorrectLifetime >= 15) award('vocab-ace');
  award('reconstruction-witness');
  if (save.runsCompleted >= 3) award('time-traveler');

  return earned;
}
