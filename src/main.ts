import './style.css';
import { passages, systemicMoments } from './content';
import { computeScore, QUESTION_SECONDS, renderPassageHtml, shuffle } from './game';
import type { Passage, Question, SystemicMoment, GearSlot } from './types';
import { drawSprite, gearForSlot, startIdleBob } from './sprite';
import { playBlip, playCorrect, playWrong, playLevelUp, playBadge } from './sfx';
import { flashScreen, burstParticles, popScore, ensureScanlineOverlay } from './effects';
import { loadSave, persistSave, levelForXp, xpProgress, rankForLevel, applyRunToSave, BADGES } from './save';

type Screen =
  | 'start'
  | 'guide'
  | 'reading'
  | 'systemic-setup'
  | 'systemic-choice'
  | 'systemic-speculation'
  | 'systemic-reality'
  | 'question'
  | 'feedback'
  | 'round-done'
  | 'results';

type RoundRef = { kind: 'figure'; passage: Passage } | { kind: 'systemic'; moment: SystemicMoment };

interface State {
  screen: Screen;
  rounds: RoundRef[];
  roundIndex: number;
  questionIndex: number;
  timeLeft: number;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  totalQuestions: number;
  selectedChoice: number | null;
  lastCorrect: boolean;
  lastPoints: number;
  systemicChoiceId: string | null;
  timeouts: number;
  vocabCorrectThisRun: number;
  hadQuickAnswer: boolean;
  earnedBadgesThisRun: string[];
  leveledUpTo: number | null;
  previousScreen: Screen;
}

const app = document.querySelector<HTMLDivElement>('#app')!;
const save = loadSave();
let timerId: number | undefined;
let stopIdleBob: (() => void) | null = null;

let state: State = freshState();

function freshState(): State {
  return {
    screen: 'start',
    rounds: [],
    roundIndex: 0,
    questionIndex: 0,
    timeLeft: QUESTION_SECONDS,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    totalQuestions: 0,
    selectedChoice: null,
    lastCorrect: false,
    lastPoints: 0,
    systemicChoiceId: null,
    timeouts: 0,
    vocabCorrectThisRun: 0,
    hadQuickAnswer: false,
    earnedBadgesThisRun: [],
    leveledUpTo: null,
    previousScreen: 'start',
  };
}

function currentRound(): RoundRef {
  return state.rounds[state.roundIndex];
}

function currentQuestions(): Question[] {
  const round = currentRound();
  return round.kind === 'figure' ? round.passage.questions : round.moment.questions;
}

function equippedGearIds(): string[] {
  return Object.values(save.equipped).filter((id): id is string => Boolean(id));
}

function clearTimer() {
  if (timerId !== undefined) {
    window.clearInterval(timerId);
    timerId = undefined;
  }
}

function startTimer() {
  clearTimer();
  timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      clearTimer();
      handleAnswer(null);
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const valueEl = document.querySelector<HTMLElement>('#timer-value');
  const barEl = document.querySelector<HTMLElement>('#timer-bar');
  if (valueEl) valueEl.textContent = String(state.timeLeft);
  if (barEl) barEl.style.width = `${(state.timeLeft / QUESTION_SECONDS) * 100}%`;
  const timerEl = document.querySelector<HTMLElement>('.timer');
  if (timerEl) timerEl.classList.toggle('timer--urgent', state.timeLeft <= 5);
}

function startGame() {
  playBlip();
  state = freshState();
  const figureRounds: RoundRef[] = shuffle(passages).map((passage) => ({ kind: 'figure', passage }));
  const systemicRounds: RoundRef[] = systemicMoments.map((moment) => ({ kind: 'systemic', moment }));
  state.rounds = [...figureRounds, ...systemicRounds];
  state.totalQuestions = state.rounds.reduce((sum, r) => sum + (r.kind === 'figure' ? r.passage.questions.length : r.moment.questions.length), 0);
  state.screen = currentRound().kind === 'figure' ? 'reading' : 'systemic-setup';
  render();
}

function beginQuestions() {
  playBlip();
  state.screen = 'question';
  state.questionIndex = 0;
  state.timeLeft = QUESTION_SECONDS;
  state.selectedChoice = null;
  render();
  startTimer();
}

function handleSystemicChoice(choiceId: string) {
  playBlip();
  const round = currentRound();
  if (round.kind !== 'systemic') return;
  state.systemicChoiceId = choiceId;
  state.screen = choiceId === round.moment.realityChoiceId ? 'systemic-reality' : 'systemic-speculation';
  render();
}

function goToReality() {
  playBlip();
  state.screen = 'systemic-reality';
  render();
}

function handleAnswer(choiceIndex: number | null) {
  clearTimer();
  const questions = currentQuestions();
  const question = questions[state.questionIndex];
  const correct = choiceIndex !== null && choiceIndex === question.correctIndex;
  state.selectedChoice = choiceIndex;
  state.lastCorrect = correct;

  if (correct) {
    const points = computeScore(state.timeLeft, state.streak);
    state.score += points;
    state.lastPoints = points;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.correctCount += 1;
    if (question.kind === 'vocab') state.vocabCorrectThisRun += 1;
    if (state.timeLeft >= 15) state.hadQuickAnswer = true;
    playCorrect();
  } else {
    state.lastPoints = 0;
    state.streak = 0;
    if (choiceIndex === null) state.timeouts += 1;
    playWrong();
  }

  state.screen = 'feedback';
  render();
}

function continueAfterFeedback() {
  playBlip();
  const questions = currentQuestions();
  if (state.questionIndex < questions.length - 1) {
    state.questionIndex += 1;
    state.timeLeft = QUESTION_SECONDS;
    state.selectedChoice = null;
    state.screen = 'question';
    render();
    startTimer();
  } else {
    state.screen = 'round-done';
    render();
  }
}

function nextRound() {
  playBlip();
  if (state.roundIndex < state.rounds.length - 1) {
    state.roundIndex += 1;
    state.systemicChoiceId = null;
    state.screen = currentRound().kind === 'figure' ? 'reading' : 'systemic-setup';
    render();
  } else {
    finalizeRun();
  }
}

function finalizeRun() {
  const levelBefore = levelForXp(save.totalXp);
  const earned = applyRunToSave(save, {
    correctCount: state.correctCount,
    totalQuestions: state.totalQuestions,
    bestStreak: state.bestStreak,
    timeouts: state.timeouts,
    vocabCorrectThisRun: state.vocabCorrectThisRun,
    hadQuickAnswer: state.hadQuickAnswer,
  });
  persistSave(save);
  const levelAfter = levelForXp(save.totalXp);
  state.earnedBadgesThisRun = earned;
  state.leveledUpTo = levelAfter > levelBefore ? levelAfter : null;
  if (state.leveledUpTo) playLevelUp();
  else if (earned.length > 0) playBadge();
  state.screen = 'results';
  render();
}

function openGuide(from: Screen) {
  playBlip();
  state.previousScreen = from;
  state.screen = 'guide';
  render();
}

function closeGuide() {
  playBlip();
  state.screen = state.previousScreen;
  render();
}

function toggleGear(slot: GearSlot, gearId: string) {
  if (save.equipped[slot] === gearId) {
    delete save.equipped[slot];
  } else {
    save.equipped[slot] = gearId;
  }
  persistSave(save);
  render();
}

function render() {
  ensureScanlineOverlay();
  if (stopIdleBob) {
    stopIdleBob();
    stopIdleBob = null;
  }

  switch (state.screen) {
    case 'start':
      app.innerHTML = renderStart();
      document.querySelector('#start-btn')?.addEventListener('click', startGame);
      document.querySelector('#guide-btn')?.addEventListener('click', () => openGuide('start'));
      setupAvatarCanvas('#avatar-preview');
      break;
    case 'guide':
      app.innerHTML = renderGuide();
      document.querySelector('#guide-back-btn')?.addEventListener('click', closeGuide);
      document.querySelectorAll<HTMLInputElement>('.gear-toggle').forEach((input) => {
        input.addEventListener('change', () => toggleGear(input.dataset.slot as GearSlot, input.dataset.gear!));
      });
      setupAvatarCanvas('#avatar-large');
      break;
    case 'reading':
      app.innerHTML = renderReading();
      document.querySelector('#ready-btn')?.addEventListener('click', beginQuestions);
      break;
    case 'systemic-setup':
      app.innerHTML = renderSystemicSetup();
      document.querySelector('#decide-btn')?.addEventListener('click', () => {
        playBlip();
        state.screen = 'systemic-choice';
        render();
      });
      break;
    case 'systemic-choice':
      app.innerHTML = renderSystemicChoice();
      document.querySelectorAll<HTMLButtonElement>('.choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => handleSystemicChoice(btn.dataset.choiceId!));
      });
      break;
    case 'systemic-speculation':
      app.innerHTML = renderSystemicSpeculation();
      document.querySelector('#reality-btn')?.addEventListener('click', goToReality);
      break;
    case 'systemic-reality':
      app.innerHTML = renderSystemicReality();
      document.querySelector('#begin-check-btn')?.addEventListener('click', beginQuestions);
      break;
    case 'question':
      app.innerHTML = renderQuestion();
      document.querySelectorAll<HTMLButtonElement>('.choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => handleAnswer(Number(btn.dataset.index)));
      });
      updateTimerDisplay();
      break;
    case 'feedback':
      app.innerHTML = renderFeedback();
      document.querySelector('#continue-btn')?.addEventListener('click', continueAfterFeedback);
      triggerFeedbackEffects();
      break;
    case 'round-done':
      app.innerHTML = renderRoundDone();
      document.querySelector('#next-round-btn')?.addEventListener('click', nextRound);
      break;
    case 'results':
      app.innerHTML = renderResults();
      document.querySelector('#restart-btn')?.addEventListener('click', startGame);
      document.querySelector('#guide-btn')?.addEventListener('click', () => openGuide('results'));
      break;
  }
}

function setupAvatarCanvas(selector: string) {
  const canvas = document.querySelector<HTMLCanvasElement>(selector);
  if (!canvas) return;
  drawSprite(canvas, equippedGearIds());
  stopIdleBob = startIdleBob(canvas);
}

function triggerFeedbackEffects() {
  const heading = document.querySelector<HTMLElement>('.feedback-screen h2');
  if (!heading) return;
  const rect = heading.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  if (state.lastCorrect) {
    flashScreen('rgba(63, 178, 127, 0.22)');
    burstParticles(cx, cy, '#3fb27f');
    popScore(heading, `+${state.lastPoints}`);
  } else {
    flashScreen('rgba(225, 85, 63, 0.22)');
  }
}

function progressLabel(): string {
  return `Jump ${state.roundIndex + 1} of ${state.rounds.length}`;
}

function renderStart(): string {
  const { level } = xpProgress(save.totalXp);
  return `
    <div class="screen start-screen">
      <h1>Black History Explorer</h1>
      <p class="tagline">You're a time guide for the Chronicle Project.</p>
      <div class="avatar-row">
        <canvas id="avatar-preview" class="avatar-canvas avatar-canvas--small" width="64" height="64"></canvas>
        <div class="avatar-rank">
          <div class="rank-name">${rankForLevel(level)}</div>
          <div class="rank-level">Level ${level}</div>
        </div>
      </div>
      <ul class="rules">
        <li>Every jump drops you beside a real person from Black history, moments before something important happens.</li>
        <li>Read what's unfolding, then answer three quick questions about it — vocabulary, main idea, and inference — to anchor the memory in the record.</li>
        <li>You have ${QUESTION_SECONDS} seconds per question. Read fast and correctly to lock the moment in before it slips.</li>
        <li>Answer in a row without missing to build a streak and steady the timeline.</li>
      </ul>
      <button id="start-btn" class="primary-btn">Begin your first jump</button>
      <button id="guide-btn" class="secondary-btn">Your Guide</button>
    </div>
  `;
}

function renderGuide(): string {
  const { level, into, span } = xpProgress(save.totalXp);
  const pct = Math.min(100, Math.round((into / span) * 100));
  const slots: GearSlot[] = ['hat', 'scarf', 'sash', 'cape'];
  const gearRows = slots
    .map((slot) => {
      const items = gearForSlot(slot);
      return items
        .map((item) => {
          const unlocked = level >= item.requiredLevel;
          const checked = save.equipped[slot] === item.id;
          if (!unlocked) {
            return `<div class="gear-row gear-row--locked">${item.name} — unlocks at level ${item.requiredLevel}</div>`;
          }
          return `
            <label class="gear-row">
              <input type="checkbox" class="gear-toggle" data-slot="${slot}" data-gear="${item.id}" ${checked ? 'checked' : ''} />
              ${item.name}
            </label>
          `;
        })
        .join('');
    })
    .join('');

  const badgeCards = BADGES.map((badge) => {
    const earned = save.badges.includes(badge.id);
    return `
      <div class="badge-card ${earned ? 'badge-card--earned' : 'badge-card--locked'}">
        <div class="badge-name">${earned ? '★' : '☆'} ${badge.name}</div>
        <div class="badge-desc">${badge.description}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="screen guide-screen">
      <h1>Your Guide</h1>
      <canvas id="avatar-large" class="avatar-canvas avatar-canvas--large" width="160" height="160"></canvas>
      <div class="rank-name">${rankForLevel(level)} &middot; Level ${level}</div>
      <div class="xp-track"><div class="xp-fill" style="width: ${pct}%"></div></div>
      <p class="xp-label">${into} / ${span} XP to next level</p>
      <h2>Gear</h2>
      <div class="gear-list">${gearRows}</div>
      <h2>Badges</h2>
      <div class="badge-grid">${badgeCards}</div>
      <button id="guide-back-btn" class="primary-btn">Back</button>
    </div>
  `;
}

function renderReading(): string {
  const round = currentRound();
  if (round.kind !== 'figure') return '';
  const p = round.passage;
  return `
    <div class="screen reading-screen">
      <div class="progress">${progressLabel()}</div>
      <p class="arrival">${p.arrival}</p>
      <h2>${p.name}</h2>
      <p class="years">${p.years}</p>
      <p class="passage">${renderPassageHtml(p.text)}</p>
      <button id="ready-btn" class="primary-btn">You're in the moment — begin</button>
    </div>
  `;
}

function renderSystemicSetup(): string {
  const round = currentRound();
  if (round.kind !== 'systemic') return '';
  const m = round.moment;
  return `
    <div class="screen reading-screen">
      <div class="progress">${progressLabel()}</div>
      <h2>${m.title}</h2>
      <p class="years">${m.year}</p>
      <p class="passage">${m.setup}</p>
      <button id="decide-btn" class="primary-btn">Make your decision</button>
    </div>
  `;
}

function renderSystemicChoice(): string {
  const round = currentRound();
  if (round.kind !== 'systemic') return '';
  const m = round.moment;
  const choices = m.choices
    .map((choice) => `<button class="choice-btn" data-choice-id="${choice.id}">${choice.label}</button>`)
    .join('');
  return `
    <div class="screen question-screen">
      <div class="progress">${progressLabel()}</div>
      <p class="question-prompt">What do you do?</p>
      <div class="choices">${choices}</div>
    </div>
  `;
}

function renderSystemicSpeculation(): string {
  const round = currentRound();
  if (round.kind !== 'systemic' || !state.systemicChoiceId) return '';
  const text = round.moment.speculation[state.systemicChoiceId] ?? '';
  return `
    <div class="screen feedback-screen">
      <h2>What might have happened</h2>
      <p class="explanation">${text}</p>
      <button id="reality-btn" class="primary-btn">See what really happened</button>
    </div>
  `;
}

function renderSystemicReality(): string {
  const round = currentRound();
  if (round.kind !== 'systemic') return '';
  const m = round.moment;
  const matched = state.systemicChoiceId === m.realityChoiceId;
  const intro = matched ? m.matchIntro : m.missIntro;
  return `
    <div class="screen reading-screen">
      <h2>What really happened</h2>
      <p class="passage">${intro} ${m.epilogue}</p>
      <button id="begin-check-btn" class="primary-btn">Begin the check</button>
    </div>
  `;
}

function renderQuestion(): string {
  const questions = currentQuestions();
  const q = questions[state.questionIndex];
  const choices = q.choices
    .map((choice, i) => `<button class="choice-btn" data-index="${i}">${choice}</button>`)
    .join('');
  return `
    <div class="screen question-screen">
      <div class="progress">${progressLabel()} &middot; Question ${state.questionIndex + 1} of ${questions.length}</div>
      <div class="timer">
        <div class="timer-track"><div id="timer-bar" class="timer-fill" style="width: 100%"></div></div>
        <span id="timer-value" class="timer-value">${state.timeLeft}</span>
      </div>
      <p class="question-kind">${labelForKind(q.kind)}</p>
      <p class="question-prompt">${q.prompt}</p>
      <div class="choices">${choices}</div>
    </div>
  `;
}

function labelForKind(kind: string): string {
  switch (kind) {
    case 'vocab':
      return 'Vocabulary';
    case 'main-idea':
      return 'Main Idea';
    case 'inference':
      return 'Inference';
    default:
      return '';
  }
}

function renderFeedback(): string {
  const round = currentRound();
  const questions = currentQuestions();
  const q = questions[state.questionIndex];
  const resultClass = state.lastCorrect ? 'feedback-correct' : 'feedback-wrong';
  const heading = state.lastCorrect ? 'Correct!' : state.selectedChoice === null ? "Time's up" : 'Not quite';
  const pointsLine = state.lastCorrect ? `<p class="points">+${state.lastPoints} points</p>` : '';
  const answerLine = `<p class="answer-reveal">Correct answer: <strong>${q.choices[q.correctIndex]}</strong></p>`;
  const narrative =
    round.kind === 'figure' ? (state.lastCorrect ? round.passage.memorySecured : round.passage.memoryFlicker) : '';
  return `
    <div class="screen feedback-screen ${resultClass}">
      <h2>${heading}</h2>
      ${pointsLine}
      ${state.lastCorrect ? '' : answerLine}
      <p class="explanation">${q.explanation}</p>
      ${narrative ? `<p class="narrative-line">${narrative}</p>` : ''}
      <button id="continue-btn" class="primary-btn">Continue</button>
    </div>
  `;
}

function renderRoundDone(): string {
  const round = currentRound();
  const isLast = state.roundIndex === state.rounds.length - 1;
  const buttonLabel = isLast ? 'End the mission' : 'Slip to the next moment';
  if (round.kind === 'figure') {
    const p = round.passage;
    return `
      <div class="screen passage-done-screen">
        <h2>${p.name}</h2>
        <p class="narrative-line">Timeline secured. The record will hold.</p>
        <p class="fun-fact">${p.funFact}</p>
        <p class="running-score">Score so far: ${state.score}</p>
        <button id="next-round-btn" class="primary-btn">${buttonLabel}</button>
      </div>
    `;
  }
  const m = round.moment;
  return `
    <div class="screen passage-done-screen">
      <h2>${m.title}</h2>
      <p class="narrative-line">${m.closingLine}</p>
      <p class="running-score">Score so far: ${state.score}</p>
      <button id="next-round-btn" class="primary-btn">${buttonLabel}</button>
    </div>
  `;
}

function renderResults(): string {
  const accuracy = state.totalQuestions === 0 ? 0 : Math.round((state.correctCount / state.totalQuestions) * 100);
  const figureNames = state.rounds
    .map((r) => (r.kind === 'figure' ? `<li><strong>${r.passage.name}</strong> (${r.passage.years}) &mdash; ${r.passage.funFact}</li>` : `<li><strong>${r.moment.title}</strong> (${r.moment.year})</li>`))
    .join('');

  const levelUpBanner = state.leveledUpTo
    ? `<p class="narrative-line">Level up! You're now a ${rankForLevel(state.leveledUpTo)} (Level ${state.leveledUpTo}).</p>`
    : '';

  const badgeList = state.earnedBadgesThisRun.length
    ? `<h2>New badges</h2><ul class="figure-list">${state.earnedBadgesThisRun
        .map((id) => {
          const badge = BADGES.find((b) => b.id === id);
          return badge ? `<li><strong>${badge.name}</strong> &mdash; ${badge.description}</li>` : '';
        })
        .join('')}</ul>`
    : '';

  return `
    <div class="screen results-screen">
      <h1>Mission Debrief</h1>
      <p class="tagline">The Chronicle is intact. Here's what you secured.</p>
      <p class="final-score">${state.score} points</p>
      <div class="stat-row">
        <div class="stat"><span class="stat-value">${accuracy}%</span><span class="stat-label">Accuracy</span></div>
        <div class="stat"><span class="stat-value">${state.correctCount}/${state.totalQuestions}</span><span class="stat-label">Correct</span></div>
        <div class="stat"><span class="stat-value">${state.bestStreak}</span><span class="stat-label">Best Streak</span></div>
      </div>
      ${levelUpBanner}
      ${badgeList}
      <h2>Moments you secured</h2>
      <ul class="figure-list">${figureNames}</ul>
      <button id="restart-btn" class="primary-btn">Run the mission again</button>
      <button id="guide-btn" class="secondary-btn">Your Guide</button>
    </div>
  `;
}

render();
