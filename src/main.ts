import './style.css';
import { passages } from './content';
import { computeScore, QUESTION_SECONDS, renderPassageHtml, shuffle } from './game';
import type { Passage } from './types';

type Screen = 'start' | 'reading' | 'question' | 'feedback' | 'passage-done' | 'results';

interface State {
  screen: Screen;
  order: Passage[];
  passageIndex: number;
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
}

const app = document.querySelector<HTMLDivElement>('#app')!;
let timerId: number | undefined;

let state: State = freshState();

function freshState(): State {
  return {
    screen: 'start',
    order: [],
    passageIndex: 0,
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
  };
}

function currentPassage(): Passage {
  return state.order[state.passageIndex];
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
  state = freshState();
  state.order = shuffle(passages);
  state.totalQuestions = state.order.reduce((sum, p) => sum + p.questions.length, 0);
  state.screen = 'reading';
  render();
}

function beginQuestions() {
  state.screen = 'question';
  state.questionIndex = 0;
  state.timeLeft = QUESTION_SECONDS;
  state.selectedChoice = null;
  render();
  startTimer();
}

function handleAnswer(choiceIndex: number | null) {
  clearTimer();
  const question = currentPassage().questions[state.questionIndex];
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
  } else {
    state.lastPoints = 0;
    state.streak = 0;
  }

  state.screen = 'feedback';
  render();
}

function continueAfterFeedback() {
  const passage = currentPassage();
  if (state.questionIndex < passage.questions.length - 1) {
    state.questionIndex += 1;
    state.timeLeft = QUESTION_SECONDS;
    state.selectedChoice = null;
    state.screen = 'question';
    render();
    startTimer();
  } else {
    state.screen = 'passage-done';
    render();
  }
}

function nextPassage() {
  if (state.passageIndex < state.order.length - 1) {
    state.passageIndex += 1;
    state.screen = 'reading';
    render();
  } else {
    state.screen = 'results';
    render();
  }
}

function render() {
  switch (state.screen) {
    case 'start':
      app.innerHTML = renderStart();
      document.querySelector('#start-btn')?.addEventListener('click', startGame);
      break;
    case 'reading':
      app.innerHTML = renderReading();
      document.querySelector('#ready-btn')?.addEventListener('click', beginQuestions);
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
      break;
    case 'passage-done':
      app.innerHTML = renderPassageDone();
      document.querySelector('#next-passage-btn')?.addEventListener('click', nextPassage);
      break;
    case 'results':
      app.innerHTML = renderResults();
      document.querySelector('#restart-btn')?.addEventListener('click', startGame);
      break;
  }
}

function progressLabel(): string {
  return `Jump ${state.passageIndex + 1} of ${state.order.length}`;
}

function renderStart(): string {
  return `
    <div class="screen start-screen">
      <h1>Black History Explorer</h1>
      <p class="tagline">You're a time guide for the Chronicle Project.</p>
      <ul class="rules">
        <li>Every jump drops you beside a real person from Black history, moments before something important happens.</li>
        <li>Read what's unfolding, then answer three quick questions about it — vocabulary, main idea, and inference — to anchor the memory in the record.</li>
        <li>You have ${QUESTION_SECONDS} seconds per question. Read fast and correctly to lock the moment in before it slips.</li>
        <li>Answer in a row without missing to build a streak and steady the timeline.</li>
      </ul>
      <button id="start-btn" class="primary-btn">Begin your first jump</button>
    </div>
  `;
}

function renderReading(): string {
  const p = currentPassage();
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

function renderQuestion(): string {
  const p = currentPassage();
  const q = p.questions[state.questionIndex];
  const choices = q.choices
    .map(
      (choice, i) => `<button class="choice-btn" data-index="${i}">${choice}</button>`,
    )
    .join('');
  return `
    <div class="screen question-screen">
      <div class="progress">${progressLabel()} &middot; Question ${state.questionIndex + 1} of ${p.questions.length}</div>
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
  const p = currentPassage();
  const q = p.questions[state.questionIndex];
  const resultClass = state.lastCorrect ? 'feedback-correct' : 'feedback-wrong';
  const heading = state.lastCorrect ? 'Correct!' : state.selectedChoice === null ? "Time's up" : 'Not quite';
  const pointsLine = state.lastCorrect ? `<p class="points">+${state.lastPoints} points</p>` : '';
  const answerLine = `<p class="answer-reveal">Correct answer: <strong>${q.choices[q.correctIndex]}</strong></p>`;
  const narrative = state.lastCorrect ? p.memorySecured : p.memoryFlicker;
  return `
    <div class="screen feedback-screen ${resultClass}">
      <h2>${heading}</h2>
      ${pointsLine}
      ${state.lastCorrect ? '' : answerLine}
      <p class="explanation">${q.explanation}</p>
      <p class="narrative-line">${narrative}</p>
      <button id="continue-btn" class="primary-btn">Continue</button>
    </div>
  `;
}

function renderPassageDone(): string {
  const p = currentPassage();
  const isLast = state.passageIndex === state.order.length - 1;
  return `
    <div class="screen passage-done-screen">
      <h2>${p.name}</h2>
      <p class="narrative-line">Timeline secured. The record will hold.</p>
      <p class="fun-fact">${p.funFact}</p>
      <p class="running-score">Score so far: ${state.score}</p>
      <button id="next-passage-btn" class="primary-btn">${isLast ? 'End the mission' : 'Slip to the next moment'}</button>
    </div>
  `;
}

function renderResults(): string {
  const accuracy = state.totalQuestions === 0 ? 0 : Math.round((state.correctCount / state.totalQuestions) * 100);
  const figureList = state.order
    .map((p) => `<li><strong>${p.name}</strong> (${p.years}) &mdash; ${p.funFact}</li>`)
    .join('');
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
      <h2>Moments you secured</h2>
      <ul class="figure-list">${figureList}</ul>
      <button id="restart-btn" class="primary-btn">Run the mission again</button>
    </div>
  `;
}

render();
