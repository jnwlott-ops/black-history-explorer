import { jackieQuest } from './content';
import { computeScore, QUESTION_SECONDS } from './game';
import type { QuestChapter } from './types';
import { playBlip, playCorrect, playWrong, playLevelUp, playBadge } from './sfx';
import { flashScreen, burstParticles, popScore } from './effects';
import { loadSave, persistSave, levelForXp, rankForLevel, applyRunToSave, BADGES } from './save';
import { drawLandscape } from './scenes';

type QuestScreen =
  | 'intro'
  | 'chapter-intro'
  | 'decision'
  | 'consequence'
  | 'reality'
  | 'question'
  | 'feedback'
  | 'chapter-done'
  | 'complete';

interface QState {
  screen: QuestScreen;
  chapterIndex: number;
  disabledChoices: Set<string>;
  questionIndex: number;
  timeLeft: number;
  selectedChoice: number | null;
  lastCorrect: boolean;
  lastPoints: number;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  totalQuestions: number;
  timeouts: number;
  vocabCorrectThisRun: number;
  hadQuickAnswer: boolean;
  earnedBadges: string[];
  leveledUpTo: number | null;
}

const quest = jackieQuest;
let app: HTMLElement;
let onExit: () => void;
let timerId: number | undefined;
let qstate: QState;

function freshState(): QState {
  return {
    screen: 'intro',
    chapterIndex: 0,
    disabledChoices: new Set(),
    questionIndex: 0,
    timeLeft: QUESTION_SECONDS,
    selectedChoice: null,
    lastCorrect: false,
    lastPoints: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    totalQuestions: quest.chapters.reduce((sum, c) => sum + c.questions.length, 0),
    timeouts: 0,
    vocabCorrectThisRun: 0,
    hadQuickAnswer: false,
    earnedBadges: [],
    leveledUpTo: null,
  };
}

export function startQuest(container: HTMLElement, exitCallback: () => void): void {
  app = container;
  onExit = exitCallback;
  qstate = freshState();
  render();
}

function currentChapter(): QuestChapter {
  return quest.chapters[qstate.chapterIndex];
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
    qstate.timeLeft -= 1;
    if (qstate.timeLeft <= 0) {
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
  if (valueEl) valueEl.textContent = String(qstate.timeLeft);
  if (barEl) barEl.style.width = `${(qstate.timeLeft / QUESTION_SECONDS) * 100}%`;
  const timerEl = document.querySelector<HTMLElement>('.timer');
  if (timerEl) timerEl.classList.toggle('timer--urgent', qstate.timeLeft <= 5);
}

function goToChapterIntro() {
  playBlip();
  qstate.screen = 'chapter-intro';
  render();
}

function goToDecision() {
  playBlip();
  qstate.screen = 'decision';
  render();
}

function pickChoice(choiceId: string) {
  const choice = currentChapter().choices.find((c) => c.id === choiceId);
  if (!choice) return;
  if (choice.isReality) {
    playCorrect();
    qstate.screen = 'reality';
  } else {
    playWrong();
    qstate.disabledChoices.add(choiceId);
    qstate.screen = 'consequence';
  }
  render();
}

function backToDecision() {
  playBlip();
  qstate.screen = 'decision';
  render();
}

function goToRealityView() {
  const heading = document.querySelector<HTMLElement>('.feedback-screen h2, .reading-screen h2');
  if (heading) {
    flashScreen('rgba(63, 178, 127, 0.22)');
    const rect = heading.getBoundingClientRect();
    burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#3fb27f');
  }
}

function beginQuestions() {
  playBlip();
  qstate.screen = 'question';
  qstate.questionIndex = 0;
  qstate.timeLeft = QUESTION_SECONDS;
  qstate.selectedChoice = null;
  render();
  startTimer();
}

function handleAnswer(choiceIndex: number | null) {
  clearTimer();
  const question = currentChapter().questions[qstate.questionIndex];
  const correct = choiceIndex !== null && choiceIndex === question.correctIndex;
  qstate.selectedChoice = choiceIndex;
  qstate.lastCorrect = correct;

  if (correct) {
    const points = computeScore(qstate.timeLeft, qstate.streak);
    qstate.score += points;
    qstate.lastPoints = points;
    qstate.streak += 1;
    qstate.bestStreak = Math.max(qstate.bestStreak, qstate.streak);
    qstate.correctCount += 1;
    if (question.kind === 'vocab') qstate.vocabCorrectThisRun += 1;
    if (qstate.timeLeft >= 15) qstate.hadQuickAnswer = true;
    playCorrect();
  } else {
    qstate.lastPoints = 0;
    qstate.streak = 0;
    if (choiceIndex === null) qstate.timeouts += 1;
    playWrong();
  }

  qstate.screen = 'feedback';
  render();
}

function continueAfterFeedback() {
  playBlip();
  const questions = currentChapter().questions;
  if (qstate.questionIndex < questions.length - 1) {
    qstate.questionIndex += 1;
    qstate.timeLeft = QUESTION_SECONDS;
    qstate.selectedChoice = null;
    qstate.screen = 'question';
    render();
    startTimer();
  } else {
    qstate.screen = 'chapter-done';
    render();
  }
}

function nextChapter() {
  playBlip();
  if (qstate.chapterIndex < quest.chapters.length - 1) {
    qstate.chapterIndex += 1;
    qstate.disabledChoices = new Set();
    qstate.screen = 'chapter-intro';
    render();
  } else {
    finalizeQuest();
  }
}

function finalizeQuest() {
  const save = loadSave();
  const levelBefore = levelForXp(save.totalXp);
  const earned = applyRunToSave(save, {
    correctCount: qstate.correctCount,
    totalQuestions: qstate.totalQuestions,
    bestStreak: qstate.bestStreak,
    timeouts: qstate.timeouts,
    vocabCorrectThisRun: qstate.vocabCorrectThisRun,
    hadQuickAnswer: qstate.hadQuickAnswer,
  });
  persistSave(save);
  const levelAfter = levelForXp(save.totalXp);
  qstate.earnedBadges = earned;
  qstate.leveledUpTo = levelAfter > levelBefore ? levelAfter : null;
  if (qstate.leveledUpTo) playLevelUp();
  else if (earned.length > 0) playBadge();
  qstate.screen = 'complete';
  render();
}

function exitQuest() {
  playBlip();
  clearTimer();
  onExit();
}

function render() {
  switch (qstate.screen) {
    case 'intro':
      app.innerHTML = renderIntro();
      document.querySelector('#quest-begin-btn')?.addEventListener('click', goToChapterIntro);
      document.querySelector('#quest-exit-btn')?.addEventListener('click', exitQuest);
      break;
    case 'chapter-intro':
      app.innerHTML = renderChapterIntro();
      document.querySelector('#quest-decide-btn')?.addEventListener('click', goToDecision);
      drawSceneCanvas('#quest-scene', 0.55);
      break;
    case 'decision':
      app.innerHTML = renderDecision();
      document.querySelectorAll<HTMLButtonElement>('.choice-btn:not(:disabled)').forEach((btn) => {
        btn.addEventListener('click', () => pickChoice(btn.dataset.choiceId!));
      });
      break;
    case 'consequence':
      app.innerHTML = renderConsequence();
      document.querySelector('#quest-retry-btn')?.addEventListener('click', backToDecision);
      break;
    case 'reality':
      app.innerHTML = renderReality();
      document.querySelector('#quest-begin-check-btn')?.addEventListener('click', beginQuestions);
      drawSceneCanvas('#quest-scene', 1);
      goToRealityView();
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
    case 'chapter-done':
      app.innerHTML = renderChapterDone();
      document.querySelector('#quest-next-chapter-btn')?.addEventListener('click', nextChapter);
      break;
    case 'complete':
      app.innerHTML = renderComplete();
      document.querySelector('#quest-exit-btn')?.addEventListener('click', exitQuest);
      break;
  }
}

function drawSceneCanvas(selector: string, brightness: number) {
  const canvas = document.querySelector<HTMLCanvasElement>(selector);
  if (!canvas) return;
  const chapter = currentChapter();
  drawLandscape(canvas, chapter.sceneConfig);
  canvas.style.filter = `brightness(${brightness})`;
}

function triggerFeedbackEffects() {
  const heading = document.querySelector<HTMLElement>('.feedback-screen h2');
  if (!heading) return;
  const rect = heading.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  if (qstate.lastCorrect) {
    flashScreen('rgba(63, 178, 127, 0.22)');
    burstParticles(cx, cy, '#3fb27f');
    popScore(heading, `+${qstate.lastPoints}`);
  } else {
    flashScreen('rgba(225, 85, 63, 0.22)');
  }
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

function chapterProgress(): string {
  return `Chapter ${qstate.chapterIndex + 1} of ${quest.chapters.length}`;
}

function renderIntro(): string {
  return `
    <div class="screen quest-screen">
      <p class="progress">Deep Quest &middot; Beta</p>
      <h1>${quest.title}</h1>
      <p class="tagline">You're not watching this story from the outside. You're leaping into the people who lived it — and you can't move on until you find the choice they actually made.</p>
      <ul class="rules">
        <li>Each chapter drops you into a real person's perspective at a real decision point.</li>
        <li>A wrong choice isn't a dead end — you'll see its fallout, that option locks out, and you try again.</li>
        <li>Once you find what really happened, the story unfolds in full — then a short comprehension check.</li>
      </ul>
      <button id="quest-begin-btn" class="primary-btn">Begin the first leap</button>
      <button id="quest-exit-btn" class="secondary-btn">Back</button>
    </div>
  `;
}

function renderChapterIntro(): string {
  const c = currentChapter();
  return `
    <div class="screen quest-screen">
      <div class="progress">${chapterProgress()}</div>
      <canvas id="quest-scene" class="scene-canvas" width="320" height="180"></canvas>
      <h2>${c.title}</h2>
      <p class="years">${c.year}</p>
      <p class="persona-blurb">${c.personaBlurb}</p>
      <p class="historical-context">${c.historicalContext}</p>
      <p class="passage">${c.scene}</p>
      <button id="quest-decide-btn" class="primary-btn">What do you do?</button>
    </div>
  `;
}

function renderDecision(): string {
  const c = currentChapter();
  const choices = c.choices
    .map((choice) => {
      const disabled = qstate.disabledChoices.has(choice.id);
      return `<button class="choice-btn" data-choice-id="${choice.id}" ${disabled ? 'disabled' : ''}>${choice.label}</button>`;
    })
    .join('');
  return `
    <div class="screen question-screen">
      <div class="progress">${chapterProgress()}</div>
      <p class="question-prompt">What do you do?</p>
      <div class="choices">${choices}</div>
    </div>
  `;
}

function renderConsequence(): string {
  const c = currentChapter();
  const lastDisabled = [...qstate.disabledChoices].pop();
  const choice = c.choices.find((ch) => ch.id === lastDisabled);
  return `
    <div class="screen feedback-screen feedback-wrong">
      <h2>That's not what happened</h2>
      <p class="explanation">${choice?.consequence ?? ''}</p>
      <button id="quest-retry-btn" class="primary-btn">Try again</button>
    </div>
  `;
}

function renderReality(): string {
  const c = currentChapter();
  return `
    <div class="screen reading-screen">
      <canvas id="quest-scene" class="scene-canvas" width="320" height="180"></canvas>
      <h2>What really happened</h2>
      <p class="passage">${c.realityText}</p>
      <button id="quest-begin-check-btn" class="primary-btn">Begin the check</button>
    </div>
  `;
}

function renderQuestion(): string {
  const questions = currentChapter().questions;
  const q = questions[qstate.questionIndex];
  const choices = q.choices.map((choice, i) => `<button class="choice-btn" data-index="${i}">${choice}</button>`).join('');
  return `
    <div class="screen question-screen">
      <div class="progress">${chapterProgress()} &middot; Question ${qstate.questionIndex + 1} of ${questions.length}</div>
      <div class="timer">
        <div class="timer-track"><div id="timer-bar" class="timer-fill" style="width: 100%"></div></div>
        <span id="timer-value" class="timer-value">${qstate.timeLeft}</span>
      </div>
      <p class="question-kind">${labelForKind(q.kind)}</p>
      <p class="question-prompt">${q.prompt}</p>
      <div class="choices">${choices}</div>
    </div>
  `;
}

function renderFeedback(): string {
  const questions = currentChapter().questions;
  const q = questions[qstate.questionIndex];
  const resultClass = qstate.lastCorrect ? 'feedback-correct' : 'feedback-wrong';
  const heading = qstate.lastCorrect ? 'Correct!' : qstate.selectedChoice === null ? "Time's up" : 'Not quite';
  const pointsLine = qstate.lastCorrect ? `<p class="points">+${qstate.lastPoints} points</p>` : '';
  const answerLine = `<p class="answer-reveal">Correct answer: <strong>${q.choices[q.correctIndex]}</strong></p>`;
  return `
    <div class="screen feedback-screen ${resultClass}">
      <h2>${heading}</h2>
      ${pointsLine}
      ${qstate.lastCorrect ? '' : answerLine}
      <p class="explanation">${q.explanation}</p>
      <button id="continue-btn" class="primary-btn">Continue</button>
    </div>
  `;
}

function renderChapterDone(): string {
  const c = currentChapter();
  const isLast = qstate.chapterIndex === quest.chapters.length - 1;
  return `
    <div class="screen passage-done-screen">
      <h2>${c.title}</h2>
      <p class="narrative-line">${c.closingLine}</p>
      <p class="running-score">Score so far: ${qstate.score}</p>
      <button id="quest-next-chapter-btn" class="primary-btn">${isLast ? 'Finish the quest' : 'Leap to the next chapter'}</button>
    </div>
  `;
}

function renderComplete(): string {
  const accuracy = qstate.totalQuestions === 0 ? 0 : Math.round((qstate.correctCount / qstate.totalQuestions) * 100);
  const levelUpBanner = qstate.leveledUpTo
    ? `<p class="narrative-line">Level up! You're now a ${rankForLevel(qstate.leveledUpTo)} (Level ${qstate.leveledUpTo}).</p>`
    : '';
  const badgeList = qstate.earnedBadges.length
    ? `<h2>New badges</h2><ul class="figure-list">${qstate.earnedBadges
        .map((id) => {
          const badge = BADGES.find((b) => b.id === id);
          return badge ? `<li><strong>${badge.name}</strong> &mdash; ${badge.description}</li>` : '';
        })
        .join('')}</ul>`
    : '';
  return `
    <div class="screen results-screen">
      <h1>Quest Complete</h1>
      <p class="tagline">${quest.subject}'s record holds, chapter by chapter.</p>
      <p class="final-score">${qstate.score} points</p>
      <div class="stat-row">
        <div class="stat"><span class="stat-value">${accuracy}%</span><span class="stat-label">Accuracy</span></div>
        <div class="stat"><span class="stat-value">${qstate.correctCount}/${qstate.totalQuestions}</span><span class="stat-label">Correct</span></div>
        <div class="stat"><span class="stat-value">${qstate.bestStreak}</span><span class="stat-label">Best Streak</span></div>
      </div>
      ${levelUpBanner}
      ${badgeList}
      <button id="quest-exit-btn" class="primary-btn">Back to base</button>
    </div>
  `;
}
