/* Hand Math Arcade: camera setup, gesture recognition, and game state. */

const video = document.querySelector('#inputVideo');
const canvas = document.querySelector('#overlayCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.querySelector('#startButton');
const newChallengeButton = document.querySelector('#newChallengeButton');
const cameraPlaceholder = document.querySelector('#cameraPlaceholder');
const cameraState = document.querySelector('#cameraState');
const trackingBadge = document.querySelector('#trackingBadge');
const detectedHands = document.querySelector('#detectedHands');
const equation = document.querySelector('#equation');
const equationHint = document.querySelector('#equationHint');
const operationTag = document.querySelector('#operationTag');
const roundNumber = document.querySelector('#roundNumber');
const inputValue = document.querySelector('#inputValue');
const challengeEyebrow = document.querySelector('#challengeEyebrow');
const feedbackBox = document.querySelector('#feedbackBox');
const feedbackIcon = document.querySelector('#feedbackIcon');
const feedbackTitle = document.querySelector('#feedbackTitle');
const feedbackText = document.querySelector('#feedbackText');
const progressLabel = document.querySelector('#progressLabel');
const progressPercent = document.querySelector('#progressPercent');
const progressBar = document.querySelector('#progressBar');
const scoreValue = document.querySelector('#scoreValue');
const streakValue = document.querySelector('#streakValue');
const cameraStage = document.querySelector('#cameraStage');
const cameraEyebrow = document.querySelector('#cameraEyebrow');
const cameraTitle = document.querySelector('#cameraTitle');
const lockZone = document.querySelector('#lockZone');
const rejectZone = document.querySelector('#rejectZone');
const digitKeypad = document.querySelector('#digitKeypad');
const celebrationLayer = document.querySelector('#celebrationLayer');
const beatSettings = document.querySelector('#beatSettings');
const handSettings = document.querySelector('#handSettings');
const beatTableSelect = document.querySelector('#beatTableSelect');
const beatLivesToggle = document.querySelector('#beatLivesToggle');
const beatLivesToggleLabel = document.querySelector('#beatLivesToggleLabel');
const beatLivesCount = document.querySelector('#beatLivesCount');
const inputLabel = document.querySelector('#inputLabel');
const handGuide = document.querySelector('#handGuide');
const beatGuide = document.querySelector('#beatGuide');
const posePanel = document.querySelector('#posePanel');
const gestureOverlay = document.querySelector('#gestureOverlay');
const beatCountdown = document.querySelector('#beatCountdown');
const gameModeButtons = typeof document.querySelectorAll === 'function'
  ? Array.from(document.querySelectorAll('[data-game-mode]'))
  : [];
const difficultyButtons = typeof document.querySelectorAll === 'function'
  ? Array.from(document.querySelectorAll('[data-difficulty]'))
  : [];
const handLevelButtons = typeof document.querySelectorAll === 'function'
  ? Array.from(document.querySelectorAll('[data-hand-level]'))
  : [];

const state = {
  stream: null,
  hands: null,
  tracking: false,
  sending: false,
  challenge: null,
  gameMode: 'hand-sign',
  handLevel: 1,
  round: 1,
  score: 0,
  streak: 0,
  mode: 'ready',
  tens: null,
  ones: null,
  detected: [],
  stableValue: null,
  stableFrames: 0,
  acceptedValue: null,
  confirmFrames: 0,
  confirmPlace: null,
  thumbUpLatched: false,
  releaseFrames: 0,
  reviewFrames: 0,
  deleteFrames: 0,
  feedbackTimer: null,
  frameRequest: null,
  frameErrors: 0,
  modelFallbackUsed: false,
  lastResultsAt: 0,
  sessionId: 0,
  pointer: {
    left: { target: null, since: 0, lastSeen: 0, armed: true },
    right: { target: null, since: 0, lastSeen: 0, armed: true },
  },
  keypadIntent: false,
  celebrationTimer: null,
  beat: {
    table: 3,
    difficulty: 'easy',
    targetOrder: [],
    targetIndex: 0,
    boxes: [],
    saber: null,
    saberLastSeenAt: 0,
    saberVisibleUntil: 0,
    saberConfidence: 0,
    lastHitAt: 0,
    wrongUntil: 0,
    waveTimer: null,
    countdownActive: false,
    livesEnabled: true,
    lives: 3,
    gameOver: false,
    statusText: 'Peg med pegefingeren for at t\u00E6nde lyssv\u00E6rdet.',
  },
};

const STABLE_FRAMES = 12;
const CONFIRM_FRAMES = 12;
const RELEASE_FRAMES = 6;
const DELETE_FRAMES = 6;
const KEY_HOVER_MS = 420;
const LOCK_HOVER_MS = 420;
const REJECT_HOVER_MS = 480;
const POINTER_RESET_MS = 220;
const BEAT_TARGET_COUNT = 12;
const BEAT_BOX_COUNT = 4;
const BEAT_HIT_COOLDOWN_MS = 360;
const BEAT_SABER_HOLD_MS = 280;
const BEAT_SABER_SMOOTHING = 0.42;
const BEAT_NEXT_WAVE_PAUSE_MS = 320;
const BEAT_COUNTDOWN_STEP_MS = 560;
const BEAT_WRONG_FLASH_MS = 420;
const BEAT_STARTING_LIVES = 3;
const CONNECTORS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// ASL digit poses shown with the right hand. Digits 6-9 touch the thumb to
// pinky, ring, middle, and index respectively.
const DIGIT_POSES = {
  0: 'O-form',
  1: 'pegefinger',
  2: 'pege- + langfinger',
  3: 'tommel + pege- + langfinger',
  4: 'fire fingre',
  5: '\u00E5ben h\u00E5nd',
  6: 'tommel r\u00F8rer lillefinger',
  7: 'tommel r\u00F8rer ringfinger',
  8: 'tommel r\u00F8rer langfinger',
  9: 'tommel r\u00F8rer pegefinger',
};

const HAND_OPERATORS = ['+', '-', '\u00D7', '\u00F7'];

function normaliseHandLevel(level) {
  const numericLevel = Number(level);
  return Number.isFinite(numericLevel) ? Math.max(1, Math.min(3, Math.round(numericLevel))) : 1;
}

function makeChallengeForLevel(level = state.handLevel, forcedOperator = null) {
  const handLevel = normaliseHandLevel(level);
  const operator = HAND_OPERATORS.includes(forcedOperator)
    ? forcedOperator
    : HAND_OPERATORS[randomInt(0, HAND_OPERATORS.length - 1)];
  let left;
  let right;
  let answer;

  if (operator === '+') {
    if (handLevel === 1) {
      left = randomInt(1, 10);
      right = randomInt(1, 10);
    } else if (handLevel === 2) {
      left = randomInt(5, 25);
      right = randomInt(5, 25);
    } else {
      left = randomInt(20, 49);
      right = randomInt(20, 99 - left);
    }
    answer = left + right;
  } else if (operator === '-') {
    if (handLevel === 1) {
      left = randomInt(2, 12);
      right = randomInt(1, left);
    } else if (handLevel === 2) {
      left = randomInt(20, 60);
      right = randomInt(1, Math.min(20, left));
    } else {
      left = randomInt(50, 99);
      right = randomInt(10, Math.min(49, left));
    }
    answer = left - right;
  } else if (operator === '\u00D7') {
    if (handLevel === 1) {
      left = randomInt(2, 5);
      right = randomInt(1, 5);
    } else if (handLevel === 2) {
      left = randomInt(3, 9);
      right = randomInt(2, 9);
    } else {
      left = randomInt(6, 12);
      right = randomInt(4, Math.floor(99 / left));
    }
    answer = left * right;
  } else {
    const divisor = handLevel === 1 ? randomInt(2, 5) : handLevel === 2 ? randomInt(3, 9) : randomInt(6, 12);
    const quotient = handLevel === 1 ? randomInt(1, 5) : handLevel === 2 ? randomInt(2, 10) : randomInt(8, 20);
    left = divisor * quotient;
    right = divisor;
    answer = quotient;
  }

  return { left, right, operator, answer, needsTwoDigits: answer >= 10 };
}

function makeChallenge() {
  return makeChallengeForLevel(state.handLevel);
}

function operationLabel(operator) {
  return ({
    '+': 'PLUS',
    '-': 'MINUS',
    '\u00D7': 'GANGE',
    '\u00F7': 'DIVISION',
  })[operator] || 'OPGAVE';
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleValues(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function buildBeatTargetOrder(table, difficulty) {
  const order = Array.from({ length: BEAT_TARGET_COUNT }, (_, index) => table * (index + 1));
  return difficulty === 'hard' ? shuffleValues(order) : order;
}

function beatPosition(index, difficulty, occupied = []) {
  let position = { x: 0.04 + Math.random() * 0.76, y: 0.06 + Math.random() * 0.74 };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const clearOfOthers = occupied.every((other) => Math.hypot(position.x - other.x, position.y - other.y) > 0.2);
    if (clearOfOthers) break;
    position = { x: 0.04 + Math.random() * 0.76, y: 0.06 + Math.random() * 0.74 };
  }
  return position;
}

function movingVelocity(minSpeed, maxSpeed) {
  const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
  return Math.random() < 0.5 ? -speed : speed;
}

function randomBeatDecoy(table, values) {
  let value = randomInt(1, table * BEAT_TARGET_COUNT);
  while (value % table === 0 || values.includes(value)) {
    value = randomInt(1, table * BEAT_TARGET_COUNT);
  }
  return value;
}

function createBeatBoxes(table, difficulty, targetValue) {
  const values = [targetValue];
  while (values.length < BEAT_BOX_COUNT) values.push(randomBeatDecoy(table, values));
  if (difficulty === 'hard') shuffleValues(values);
  const positions = [];
  return values.map((value, index) => {
    const position = beatPosition(index, difficulty, positions);
    positions.push(position);
    return {
      value,
      isTarget: value === targetValue,
      x: position.x,
      y: position.y,
      width: 0.16,
      height: 0.14,
      phase: index * 0.9,
      velocityX: movingVelocity(0.12, 0.22),
      velocityY: movingVelocity(0.1, 0.18),
      alive: true,
      wrongUntil: 0,
      spawnedAt: performance.now(),
    };
  });
}

function hideBeatCountdown() {
  if (!beatCountdown) return;
  beatCountdown.hidden = true;
  beatCountdown.textContent = '';
  beatCountdown.className = 'beat-countdown';
}

function showBeatCountdown(value) {
  if (!beatCountdown) return;
  beatCountdown.hidden = false;
  beatCountdown.className = 'beat-countdown';
  beatCountdown.textContent = String(value);
  void beatCountdown.offsetWidth;
  beatCountdown.className = 'beat-countdown show';
}

function updateBeatLivesUI() {
  if (beatLivesToggleLabel) beatLivesToggleLabel.textContent = state.beat.livesEnabled ? 'Til' : 'Fra';
  if (beatLivesCount) beatLivesCount.textContent = state.beat.livesEnabled
    ? `${state.beat.lives} liv`
    : 'Ubegr\u00E6nset';
  if (beatLivesToggle) {
    beatLivesToggle.setAttribute?.('aria-pressed', String(state.beat.livesEnabled));
    beatLivesToggle.classList?.toggle?.('active', state.beat.livesEnabled);
    beatLivesToggle.classList?.toggle?.('inactive', !state.beat.livesEnabled);
  }
}

function toggleBeatLives() {
  state.beat.livesEnabled = !state.beat.livesEnabled;
  state.beat.lives = BEAT_STARTING_LIVES;
  state.beat.gameOver = false;
  if (state.gameMode === 'beat-saber') startBeatMode(false);
  else updateBeatLivesUI();
}

function runBeatCountdown(value) {
  if (state.gameMode !== 'beat-saber') {
    state.beat.countdownActive = false;
    hideBeatCountdown();
    return;
  }
  if (value <= 0) {
    state.beat.countdownActive = false;
    state.beat.waveTimer = null;
    hideBeatCountdown();
    beginBeatRound();
    return;
  }
  showBeatCountdown(value);
  state.beat.statusText = `N\u00E6ste b\u00F8lge om ${value}`;
  setProgress(`N\u00E6ste b\u00F8lge om ${value}`, ((4 - value) / 3) * 100, true);
  state.beat.waveTimer = window.setTimeout(() => runBeatCountdown(value - 1), BEAT_COUNTDOWN_STEP_MS);
}

function queueBeatNextWave() {
  window.clearTimeout(state.beat.waveTimer);
  state.beat.countdownActive = true;
  state.beat.saber = null;
  hideBeatCountdown();
  state.beat.statusText = 'N\u00E6ste b\u00F8lge kommer om lidt.';
  setProgress('G\u00F8r dig klar', 0, true);
  state.beat.waveTimer = window.setTimeout(() => runBeatCountdown(3), BEAT_NEXT_WAVE_PAUSE_MS);
}

function beginBeatRound() {
  if (state.gameMode !== 'beat-saber' || state.beat.gameOver) return;
  state.beat.countdownActive = false;
  hideBeatCountdown();
  if (state.beat.targetIndex >= state.beat.targetOrder.length) {
    state.round += 1;
    state.beat.targetIndex = 0;
    state.beat.targetOrder = buildBeatTargetOrder(state.beat.table, state.beat.difficulty);
  }
  const targetValue = state.beat.targetOrder[state.beat.targetIndex];
  state.beat.boxes = createBeatBoxes(state.beat.table, state.beat.difficulty, targetValue);
  state.beat.saber = null;
  state.beat.saberLastSeenAt = 0;
  state.beat.saberVisibleUntil = 0;
  state.beat.saberConfidence = 0;
  state.beat.lastHitAt = 0;
  state.beat.wrongUntil = 0;
  updateBeatLivesUI();
  state.beat.statusText = `Sk\u00E6r kassen med ${targetValue}`;
  roundNumber.textContent = `RUNDE ${String(state.round).padStart(2, '0')}`;
  equation.textContent = `${state.beat.table}-TABELLEN`;
  inputValue.textContent = `${state.beat.targetIndex} / ${BEAT_TARGET_COUNT}`;
  setProgress(`N\u00E6ste m\u00E5l: ${targetValue}`, 0, false);
  updateModeUI();
}

function startBeatMode(resetScore = true) {
  window.clearTimeout(state.beat.waveTimer);
  state.beat.waveTimer = null;
  state.beat.countdownActive = false;
  hideBeatCountdown();
  state.beat.table = Number(beatTableSelect?.value) || state.beat.table;
  if (state.beat.table < 2 || state.beat.table > 10) state.beat.table = 3;
  state.beat.targetOrder = buildBeatTargetOrder(state.beat.table, state.beat.difficulty);
  state.beat.targetIndex = 0;
  state.beat.boxes = [];
  state.beat.saber = null;
  state.beat.saberLastSeenAt = 0;
  state.beat.saberVisibleUntil = 0;
  state.beat.saberConfidence = 0;
  state.beat.lastHitAt = 0;
  state.beat.wrongUntil = 0;
  state.beat.lives = BEAT_STARTING_LIVES;
  state.beat.gameOver = false;
  state.round = 1;
  state.mode = 'beat';
  if (resetScore) {
    state.score = 0;
    state.streak = 0;
    updateScore();
  }
  updateBeatLivesUI();
  updateModeUI();
  beginBeatRound();
}

function switchGameMode(mode) {
  if (mode !== 'hand-sign' && mode !== 'beat-saber') return;
  if (mode === state.gameMode) return;
  state.gameMode = mode;
  if (mode === 'beat-saber') {
    startBeatMode(true);
    return;
  }
  window.clearTimeout(state.beat.waveTimer);
  state.beat.waveTimer = null;
  state.score = 0;
  state.streak = 0;
  updateScore();
  setChallenge();
  updateModeUI();
}

function updateModeUI() {
  const isBeatMode = state.gameMode === 'beat-saber';
  gameModeButtons.forEach((button) => {
    const active = button.dataset.gameMode === state.gameMode;
    button.classList?.toggle?.('active', active);
    if (typeof button.classList?.toggle !== 'function') {
      button.classList?.add?.(active ? 'active' : 'inactive');
      button.classList?.remove?.(active ? 'inactive' : 'active');
    }
  });
  if (cameraEyebrow) cameraEyebrow.textContent = isBeatMode ? 'DIREKTE BEATSABER' : 'DIREKTE H\u00C5NDSPORING';
  if (cameraTitle) cameraTitle.textContent = isBeatMode ? 'Sving dit lyssv\u00E6rd' : 'Vis dit svar';
  if (gestureOverlay) gestureOverlay.hidden = isBeatMode;
  if (beatSettings) beatSettings.hidden = !isBeatMode;
  if (handSettings) handSettings.hidden = isBeatMode;
  if (handGuide) handGuide.hidden = isBeatMode;
  if (beatGuide) beatGuide.hidden = !isBeatMode;
  if (posePanel) posePanel.hidden = isBeatMode;
  cameraStage.classList?.toggle?.('beat-stage', isBeatMode);
  if (isBeatMode) {
    updateBeatLivesUI();
    operationTag.textContent = 'BEATSABER';
    inputLabel.textContent = 'RAMTE M\u00C5L';
    newChallengeButton.textContent = 'Ny b\u00F8lge';
    if (challengeEyebrow) challengeEyebrow.textContent = 'V\u00C6LG OG RAM';
    equationHint.textContent = 'Peg med en pegefinger p\u00E5 m\u00E5let, og lad de forkerte kasser st\u00E5.';
    setFeedback('info', 'Klar til BeatSaber', 'Sk\u00E6r kun det n\u00E6ste multiplum af den valgte tabel.');
    difficultyButtons.forEach((button) => {
      const active = button.dataset.difficulty === state.beat.difficulty;
      button.classList?.toggle?.('active', active);
    });
    if (beatTableSelect) beatTableSelect.value = String(state.beat.table);
  } else {
    if (challengeEyebrow) challengeEyebrow.textContent = 'L\u00D8S OPGAVEN';
    inputLabel.textContent = 'DIT SVAR';
    newChallengeButton.textContent = 'Ny opgave';
    handLevelButtons.forEach((button) => {
      const active = Number(button.dataset.handLevel) === state.handLevel;
      button.classList?.toggle?.('active', active);
    });
  }
}

function setChallenge() {
  window.clearTimeout(state.feedbackTimer);
  state.challenge = makeChallenge();
  state.mode = state.challenge.needsTwoDigits ? 'ones' : 'single';
  state.tens = null;
  state.ones = null;
  state.stableValue = null;
  state.stableFrames = 0;
  state.acceptedValue = null;
  state.confirmFrames = 0;
  state.confirmPlace = null;
  state.thumbUpLatched = false;
  state.reviewFrames = 0;
  state.deleteFrames = 0;
  window.clearTimeout(state.celebrationTimer);
  state.celebrationTimer = null;
  celebrationLayer.className = 'celebration-layer';
  celebrationLayer.innerHTML = '';
  resetPointer('left');
  resetPointer('right');
  state.keypadIntent = false;
  state.releaseFrames = 0;
  equation.textContent = `${state.challenge.left} ${state.challenge.operator} ${state.challenge.right} = ?`;
  operationTag.textContent = operationLabel(state.challenge.operator);
  roundNumber.textContent = `RUNDE ${String(state.round).padStart(2, '0')}`;
  inputValue.textContent = '\u2014';
  if (state.challenge.needsTwoDigits) {
    equationHint.textContent = 'H\u00F8jre h\u00E5nd viser ASL, eller venstre pegefinger v\u00E6lger enere f\u00F8rst og derefter tiere.';
  } else {
    equationHint.textContent = 'Vis ASL med h\u00F8jre h\u00E5nd, eller peg p\u00E5 et ciffer med venstre h\u00E5nd.';
  }
  setFeedback('info', 'Klar, n\u00E5r du er', state.challenge.needsTwoDigits ? 'Start med enercifret p\u00E5 h\u00F8jre h\u00E5nd eller venstre tastatur.' : 'Vis et ciffer med h\u00F8jre h\u00E5nd eller venstre tastatur.');
  setProgress('Venter p\u00E5 et ciffer', 0, false);
  updateGestureControls();
}

function setFeedback(kind, title, text) {
  feedbackBox.className = `feedback-box ${kind}`;
  feedbackIcon.textContent = kind === 'correct' ? '\u2713' : kind === 'incorrect' ? '\u00D7' : kind === 'confirm' ? '\u2191' : '\u2726';
  feedbackTitle.textContent = title;
  feedbackText.textContent = text;
}

function setProgress(label, percentage, confirming) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  progressLabel.textContent = label;
  progressPercent.textContent = `${Math.round(safePercentage)}%`;
  progressBar.style.width = `${safePercentage}%`;
  progressBar.className = `progress-bar${confirming ? ' confirm' : ''}`;
}

function updateScore() {
  scoreValue.textContent = String(state.score);
  streakValue.textContent = `${state.streak} ${state.streak === 1 ? 'i tr\u00E6k' : 'i tr\u00E6k'}`;
}

function showCelebration(isMilestone, count) {
  const regularMessages = [
    'Flot regnet!',
    'Pletskud!',
    'Rigtigt!',
    'St\u00E6rkt arbejde!',
    'Du har styr p\u00E5 det!',
  ];
  const milestoneMessages = [
    `${count} rigtige! Fantastisk arbejde!`,
    `${count} point! Du er en talmester!`,
    `${count} rigtige - det er st\u00E6rkt!`,
  ];
  const messages = isMilestone ? milestoneMessages : regularMessages;
  const message = messages[(count - 1) % messages.length];
  const confetti = isMilestone
    ? Array.from({ length: 34 }, (_, index) => {
      const x = ((index * 47) % 220) - 110;
      const y = 90 + ((index * 29) % 170);
      const delay = (index % 7) * 35;
      return `<span class="confetti-piece" style="--confetti-x:${x}px;--confetti-y:${y}px;--confetti-delay:${delay}ms"></span>`;
    }).join('')
    : '';
  celebrationLayer.className = `celebration-layer${isMilestone ? ' milestone' : ''}`;
  celebrationLayer.innerHTML = `<div class="celebration-message">${message}</div>${confetti}`;
  window.clearTimeout(state.celebrationTimer);
  state.celebrationTimer = window.setTimeout(() => {
    celebrationLayer.className = 'celebration-layer';
    celebrationLayer.innerHTML = '';
    state.celebrationTimer = null;
  }, isMilestone ? 2500 : 900);
}

function getDigitButtons() {
  return typeof digitKeypad.querySelectorAll === 'function'
    ? Array.from(digitKeypad.querySelectorAll('.digit-key'))
    : [];
}

function updateGestureControls() {
  const canLock = state.mode === 'confirm' || state.mode === 'review';
  const canReject = state.mode === 'confirm' || state.mode === 'review';
  const canChooseDigit = state.mode === 'ones' || state.mode === 'tens' || state.mode === 'single';
  lockZone.disabled = !canLock;
  rejectZone.disabled = !canReject;
  lockZone.classList?.add?.(canLock ? 'active' : 'inactive');
  lockZone.classList?.remove?.(canLock ? 'inactive' : 'active');
  rejectZone.classList?.add?.(canReject ? 'active' : 'inactive');
  rejectZone.classList?.remove?.(canReject ? 'inactive' : 'active');
  getDigitButtons().forEach((button) => {
    button.disabled = !canChooseDigit;
  });
}

function resetPointer(side) {
  const tracker = state.pointer[side];
  if (tracker.element) {
    tracker.element.classList?.remove?.('hovering');
    setElementProgress(tracker.element, 0);
  }
  tracker.target = null;
  tracker.element = null;
  tracker.since = 0;
  tracker.lastSeen = 0;
  tracker.armed = true;
}

function setElementProgress(element, percentage) {
  const progress = element?.querySelector?.('.zone-progress, .key-progress');
  if (progress?.style) progress.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
}

function updatePointerHover(side, target, now, dwellMs, onActivate, preserveLock = false) {
  const tracker = state.pointer[side];
  if (!target) {
    if (preserveLock && tracker.target && !tracker.armed) {
      tracker.lastSeen = now;
      tracker.element?.classList?.remove?.('hovering');
      setElementProgress(tracker.element, 0);
      return false;
    }
    if (tracker.lastSeen && now - tracker.lastSeen > POINTER_RESET_MS) resetPointer(side);
    return false;
  }

  if (tracker.target !== target.id) {
    resetPointer(side);
    tracker.target = target.id;
    tracker.element = target;
    tracker.since = now;
  }
  tracker.lastSeen = now;
  tracker.element.classList?.add?.('hovering');
  const percentage = ((now - tracker.since) / dwellMs) * 100;
  setElementProgress(target, percentage);
  if (!tracker.armed || now - tracker.since < dwellMs) return false;

  tracker.armed = false;
  setElementProgress(target, 100);
  onActivate();
  return true;
}

function stagePointForLandmark(landmark) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const stageWidth = cameraStage.clientWidth;
  const stageHeight = cameraStage.clientHeight;
  if (!landmark || !sourceWidth || !sourceHeight || !stageWidth || !stageHeight) return null;
  const scale = Math.max(stageWidth / sourceWidth, stageHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const offsetX = (stageWidth - renderedWidth) / 2;
  const offsetY = (stageHeight - renderedHeight) / 2;
  return {
    x: offsetX + (1 - landmark.x) * renderedWidth,
    y: offsetY + landmark.y * renderedHeight,
  };
}

function stageRectForElement(element) {
  const stageRect = cameraStage.getBoundingClientRect?.();
  const elementRect = element?.getBoundingClientRect?.();
  if (!stageRect || !elementRect) return null;
  return {
    left: elementRect.left - stageRect.left,
    right: elementRect.right - stageRect.left,
    top: elementRect.top - stageRect.top,
    bottom: elementRect.bottom - stageRect.top,
  };
}

function pointInside(point, rect, padding = 0) {
  return Boolean(point && rect
    && point.x >= rect.left - padding
    && point.x <= rect.right + padding
    && point.y >= rect.top - padding
    && point.y <= rect.bottom + padding);
}

function updatePointerCursor(point) {
  let cursor = document.querySelector('#pointerCursor');
  if (!cursor && typeof document.createElement === 'function') {
    cursor = document.createElement('div');
    cursor.id = 'pointerCursor';
    cursor.className = 'pointer-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cameraStage.appendChild(cursor);
  }
  if (!cursor) return;
  if (!point) {
    cursor.hidden = true;
    return;
  }
  cursor.hidden = false;
  cursor.style.left = `${point.x}px`;
  cursor.style.top = `${point.y}px`;
}

async function startCamera() {
  if (state.tracking) {
    stopCamera();
    return;
  }

  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!window.isSecureContext && !localHost) {
    showCameraError('\u00C5bn spillet fra http://localhost:8080 eller en HTTPS-adresse.');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraError('Denne browser giver ikke adgang til kameraet.');
    return;
  }

  const sessionId = ++state.sessionId;
  state.frameErrors = 0;
  state.modelFallbackUsed = false;
  startButton.disabled = true;
  startButton.textContent = 'Starter...';
  setFeedback('info', 'Starter kameraet', 'Indl\u00E6ser den lokale model til h\u00E5ndsporing...');
  cameraState.className = 'live-pill';
  cameraState.innerHTML = '<i></i> Indl\u00E6ser model';
  try {
    let permissionTimer;
    const cameraRequest = navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    try {
      state.stream = await Promise.race([
        cameraRequest,
        new Promise((resolve, reject) => {
          permissionTimer = window.setTimeout(() => {
            const timeoutError = new Error('Der ventes stadig p\u00E5 kameratilladelse.');
            timeoutError.name = 'PermissionTimeout';
            reject(timeoutError);
          }, 30000);
        }),
      ]);
    } catch (error) {
      cameraRequest.then((lateStream) => lateStream.getTracks().forEach((track) => track.stop())).catch(() => {});
      throw error;
    } finally {
      window.clearTimeout(permissionTimer);
    }
    state.stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (state.tracking && sessionId === state.sessionId) {
          stopCamera();
          showCameraError('Kamerastreamen stoppede. Tilslut eller aktiv\u00E9r kameraet, og pr\u00F8v igen.');
        }
      });
    });
    video.srcObject = state.stream;
    await video.play();
    setupHands(sessionId);
    state.tracking = true;
    if (state.gameMode === 'beat-saber' && !state.beat.boxes.length) beginBeatRound();
    cameraPlaceholder.classList.add('hidden');
    video.classList.add('ready');
    cameraState.className = 'live-pill live';
    cameraState.innerHTML = '<i></i> Direkte';
    startButton.classList.add('stop');
    startButton.textContent = 'Stop kamera';
    setFeedback('info', 'Kameraet er klar', 'Lav et ciffertegn, og hold det inden for billedet.');
    state.frameRequest = requestAnimationFrame(() => processFrame(sessionId));
  } catch (error) {
    console.error(error);
    stopCamera();
    showCameraError(cameraErrorMessage(error));
  } finally {
    startButton.disabled = false;
    if (!state.tracking) startButton.textContent = 'Start kamera';
  }
}

function cameraErrorMessage(error) {
  const messages = {
    NotAllowedError: 'Kameraadgang blev afvist. Tillad kameraet i browserens indstillinger, og pr\u00F8v igen.',
    NotFoundError: 'Der blev ikke fundet et kamera. Tilslut et kamera, og pr\u00F8v igen.',
    NotReadableError: 'Kameraet er optaget eller utilg\u00E6ngeligt. Luk andre kameraapps, og pr\u00F8v igen.',
    OverconstrainedError: 'Kameraet kan ikke levere en kompatibel videostream.',
    AbortError: 'Kameraanmodningen blev afbrudt. Luk andre kameraapps, og pr\u00F8v igen.',
    SecurityError: 'Kameraadgang er blokeret af siden eller browserens sikkerhedsindstillinger. Brug localhost eller HTTPS.',
    TypeError: 'Kameraadgang er ikke tilg\u00E6ngelig her. \u00C5bn spillet fra localhost eller HTTPS.',
    PermissionTimeout: 'Der ventes stadig p\u00E5 kameratilladelse. Tillad den i browserens dialogboks, og pr\u00F8v igen.',
  };
  return messages[error?.name] || (error?.message ? 'Kameraet kunne ikke startes: ' + error.message : 'Kameraet kunne ikke startes.');
}
function setupHands(sessionId, modelComplexity = 1) {
  if (state.hands) return;
  if (typeof Hands === 'undefined') throw new Error('Den lokale MediaPipe Hands-runtime blev ikke fundet.');

  state.hands = new Hands({
    locateFile: (file) => `vendor/mediapipe/${file}`,
  });
  state.hands.setOptions({
    maxNumHands: 2,
    modelComplexity,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  state.hands.onResults((results) => handleResults(results, sessionId));
}

function stopCamera() {
  state.sessionId += 1;
  state.tracking = false;
  state.sending = false;
  const handsToClose = state.hands;
  state.hands = null;
  Promise.resolve(handsToClose?.close?.()).catch((error) => console.warn('MediaPipe cleanup error', error));
  state.frameErrors = 0;
  state.modelFallbackUsed = false;
  state.lastResultsAt = 0;
  state.mode = state.gameMode === 'beat-saber' ? 'beat' : state.challenge?.needsTwoDigits ? 'ones' : 'single';
  state.tens = null;
  state.ones = null;
  state.stableValue = null;
  state.stableFrames = 0;
  state.acceptedValue = null;
  state.confirmFrames = 0;
  state.thumbUpLatched = false;
  state.releaseFrames = 0;
  inputValue.textContent = state.gameMode === 'beat-saber' ? `0 / ${BEAT_TARGET_COUNT}` : '\u2014';
  state.confirmPlace = null;
  if (state.gameMode === 'beat-saber') equationHint.textContent = 'Peg med en pegefinger p\u00E5 det rigtige multiplum.';
  else if (state.challenge) equationHint.textContent = state.challenge.needsTwoDigits ? 'H\u00F8jre h\u00E5nd viser ASL, eller venstre pegefinger v\u00E6lger enere f\u00F8rst og derefter tiere.' : 'Vis ASL med h\u00F8jre h\u00E5nd, eller peg p\u00E5 et ciffer med venstre h\u00E5nd.';
  state.reviewFrames = 0;
  state.deleteFrames = 0;
  window.clearTimeout(state.beat.waveTimer);
  state.beat.waveTimer = null;
  state.beat.countdownActive = false;
  hideBeatCountdown();
  state.beat.boxes = [];
  state.beat.saber = null;
  resetPointer('left');
  resetPointer('right');
  state.keypadIntent = false;
  if (state.frameRequest) cancelAnimationFrame(state.frameRequest);
  state.frameRequest = null;
  state.stream?.getTracks().forEach((track) => track.stop());
  state.stream = null;
  video.srcObject = null;
  video.classList.remove('ready');
  cameraPlaceholder.classList.remove('hidden');
  cameraState.className = 'live-pill';
  cameraState.innerHTML = '<i></i> Kamera slukket';
  startButton.classList.remove('stop');
  startButton.disabled = false;
  startButton.textContent = 'Start kamera';
  state.detected = [];
  detectedHands.innerHTML = '<span class="muted">Ingen h\u00E6nder registreret</span>';
  trackingBadge.textContent = 'Venter p\u00E5 en h\u00E5nd';
  trackingBadge.className = 'tracking-badge';
  setFeedback('info', 'Kameraet er stoppet', 'Start kameraet for at forts\u00E6tte opgaven.');
  setProgress('Venter p\u00E5 kameraet', 0, false);
  updateGestureControls();
  clearCanvas();
}

function showCameraError(message) {
  cameraState.className = 'live-pill error';
  cameraState.innerHTML = '<i></i> Kamera utilg\u00E6ngeligt';
  setFeedback('incorrect', 'Kamera p\u00E5kr\u00E6vet', message);
}

async function processFrame(sessionId) {
  if (!state.tracking || sessionId !== state.sessionId) return;
  if (!state.sending && video.readyState >= 2) {
    state.sending = true;
    try {
      await state.hands.send({ image: video });
      if (!state.tracking || sessionId !== state.sessionId) return;
      state.frameErrors = 0;
    } catch (error) {
      if (!state.tracking || sessionId !== state.sessionId) return;
      console.error('MediaPipe frame error', error);
      if (!state.modelFallbackUsed) {
        state.modelFallbackUsed = true;
        state.frameErrors = 0;
        const failedHands = state.hands;
        state.hands = null;
        await Promise.resolve(failedHands?.close?.()).catch((closeError) => console.warn('MediaPipe fallback cleanup error', closeError));
        if (state.tracking && sessionId === state.sessionId) {
          setupHands(sessionId, 0);
          setFeedback('info', 'Pr\u00F8ver h\u00E5ndsporing igen', 'Skifter til den alternative lokale h\u00E5ndmodel...');
        }
      } else {
        state.frameErrors += 1;
        if (state.frameErrors >= 3) {
          const detail = error?.message ? ` ${error.message}` : '';
          stopCamera();
          showCameraError(`H\u00E5ndsporingen kunne ikke behandle kamerastreamen efter at have pr\u00F8vet begge lokale modeller.${detail}`);
          return;
        }
      }
    } finally {
      state.sending = false;
    }
  }
  if (state.tracking && sessionId === state.sessionId) {
    state.frameRequest = requestAnimationFrame(() => processFrame(sessionId));
  }
}
function handleResults(results, sessionId) {
  if (!state.tracking || sessionId !== state.sessionId) return;
  const isBeatMode = state.gameMode === 'beat-saber';
  const now = performance.now();
  state.lastResultsAt = now;
  resizeCanvas();
  clearCanvas();
  const landmarks = results.multiHandLandmarks || [];
  const worldLandmarks = results.multiHandWorldLandmarks || [];
  const handedness = results.multiHandedness || [];
  state.detected = landmarks.map((hand, index) => {
    const reportedLabel = handedness[index]?.label || `H\u00E5nd ${index + 1}`;
    const label = physicalHandLabel(reportedLabel);
    const geometryHand = worldLandmarks[index] || hand;
    const digit = detectDigit(geometryHand);
    const isLeftHand = label === 'Left';
    const thumbsUp = isLeftHand && isThumbsUp(geometryHand, hand);
    const thumbsDown = isLeftHand && isThumbsDown(geometryHand, hand);
    const pointing = isBeatMode ? isPointing(geometryHand) : isLeftHand && isPointing(geometryHand);
    const point = pointing ? stagePointForLandmark(hand[8]) : null;
    const saber = pointing ? { base: hand[5], tip: hand[8] } : null;
    drawHand(hand, digit, thumbsUp, thumbsDown, pointing, index);
    return { label, digit, thumbsUp, thumbsDown, pointing, point, saber };
  });

  renderDetectedHands();
  const rightHand = state.detected.find((hand) => hand.label === 'Right');
  const leftHand = state.detected.find((hand) => hand.label === 'Left');
  if (isBeatMode) {
    const saberHand = state.detected.find((hand) => hand.pointing);
    handleBeatSaberFrame(saberHand, now);
    drawBeatSaberArena(now);
    updateTrackingBadge(saberHand, false, false);
    return;
  }
  const leftThumbUp = Boolean(leftHand?.thumbsUp);
  const leftThumbDown = Boolean(leftHand?.thumbsDown);
  if (!leftThumbUp) state.thumbUpLatched = false;
  const modeAtStart = state.mode;
  const leftPointerActive = updateLeftPointer(leftHand, now);
  updatePointerCursor(leftHand?.point || rightHand?.point || null);
  if (modeAtStart === 'confirm') {
    if (!leftPointerActive) handleConfirmation(leftThumbUp);
  } else if (modeAtStart === 'review') {
    if (!leftPointerActive) handleReview(leftThumbUp, leftThumbDown);
  } else if (!leftPointerActive) {
    handleDigitInput(rightHand?.digit ?? null);
  }
  updateTrackingBadge(rightHand, leftThumbUp, leftThumbDown);
}

function bounceCoordinate(value, min, max) {
  const range = max - min;
  const cycle = range * 2;
  const wrapped = ((value - min) % cycle + cycle) % cycle;
  return min + (wrapped <= range ? wrapped : cycle - wrapped);
}

function beatBoxRect(box, now) {
  const seconds = (now - box.spawnedAt) * 0.001;
  const velocityX = Number.isFinite(box.velocityX) ? box.velocityX : 0.14;
  const velocityY = Number.isFinite(box.velocityY) ? box.velocityY : 0.12;
  const x = bounceCoordinate(box.x + velocityX * seconds, 0.03, 0.81);
  const y = bounceCoordinate(box.y + velocityY * seconds, 0.06, 0.8);
  return { x, y, width: box.width, height: box.height };
}

function beatPointInside(point, rect) {
  return Boolean(point
    && point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height);
}

function handleBeatSaberFrame(saberHand, now) {
  if (state.beat.gameOver) {
    state.beat.saber = null;
    state.beat.statusText = 'Spillet er slut. Tryk p\u00E5 Ny b\u00F8lge for at starte igen.';
    return;
  }
  const liveSaber = saberHand?.saber || null;
  const previousSaber = state.beat.saber;
  if (liveSaber) {
    const amount = previousSaber ? BEAT_SABER_SMOOTHING : 1;
    const smoothPoint = (previous, next) => ({
      x: previous.x + (next.x - previous.x) * amount,
      y: previous.y + (next.y - previous.y) * amount,
    });
    state.beat.saber = previousSaber
      ? { base: smoothPoint(previousSaber.base, liveSaber.base), tip: smoothPoint(previousSaber.tip, liveSaber.tip) }
      : { base: { ...liveSaber.base }, tip: { ...liveSaber.tip } };
    state.beat.saberLastSeenAt = now;
    state.beat.saberVisibleUntil = now + BEAT_SABER_HOLD_MS;
    state.beat.saberConfidence = Math.min(1, state.beat.saberConfidence + 0.35);
  } else if (state.beat.saber && now <= state.beat.saberVisibleUntil) {
    state.beat.saberConfidence = Math.max(0.25, state.beat.saberConfidence - 0.08);
  } else {
    state.beat.saber = null;
    state.beat.saberConfidence = 0;
  }

  if (!liveSaber) {
    state.beat.statusText = state.beat.saber
      ? 'Lyssv\u00E6rd stabiliseres - peg videre for at holde det aktivt.'
      : 'Peg med pegefingeren for at t\u00E6nde lyssv\u00E6rdet.';
    return;
  }
  if (state.beat.countdownActive) {
    state.beat.statusText = 'N\u00E6ste b\u00F8lge g\u00F8r sig klar.';
    return;
  }
  state.beat.statusText = 'Lyssv\u00E6rd aktivt - sk\u00E6r kun det rigtige m\u00E5l.';
  if (now - state.beat.lastHitAt < BEAT_HIT_COOLDOWN_MS) return;
  const hitBox = state.beat.boxes.find((box) => box.alive && beatPointInside(state.beat.saber.tip, beatBoxRect(box, now)));
  if (!hitBox) return;

  state.beat.lastHitAt = now;
  if (hitBox.isTarget) {
    hitBox.alive = false;
    state.beat.targetIndex += 1;
    state.score += 1;
    state.streak += 1;
    updateScore();
    inputValue.textContent = `${state.beat.targetIndex} / ${BEAT_TARGET_COUNT}`;
    setFeedback('correct', `Ramt: ${hitBox.value}`, 'Det er et multiplum af den valgte tabel.');
    if (state.beat.targetIndex >= BEAT_TARGET_COUNT) {
      state.beat.statusText = 'Runden er klaret! G\u00F8r dig klar til en ny b\u00F8lge.';
      setProgress('Runde klaret', 100, false);
      showCelebration(state.score % 10 === 0, state.score);
    } else {
      state.beat.statusText = `Godt! N\u00E6ste m\u00E5l er ${state.beat.targetOrder[state.beat.targetIndex]}.`;
      setProgress(`N\u00E6ste m\u00E5l: ${state.beat.targetOrder[state.beat.targetIndex]}`, (state.beat.targetIndex / BEAT_TARGET_COUNT) * 100, false);
    }
    queueBeatNextWave();
    return;
  }

  hitBox.wrongUntil = now + BEAT_WRONG_FLASH_MS;
  state.beat.wrongUntil = hitBox.wrongUntil;
  state.score = Math.max(0, state.score - 1);
  state.streak = 0;
  updateScore();
  if (state.beat.livesEnabled) {
    state.beat.lives = Math.max(0, state.beat.lives - 1);
    updateBeatLivesUI();
    if (state.beat.lives === 0) {
      state.beat.gameOver = true;
      window.clearTimeout(state.beat.waveTimer);
      state.beat.waveTimer = null;
      state.beat.countdownActive = false;
      state.beat.saber = null;
      state.beat.statusText = 'Spillet er slut. Tryk p\u00E5 Ny b\u00F8lge for at starte igen.';
      setFeedback('incorrect', 'Spillet er slut', `Du ramte ${hitBox.value}. Du har ikke flere liv.`);
      setProgress('Ingen liv tilbage', 100, true);
      return;
    }
  }
  const livesMessage = state.beat.livesEnabled
    ? ` Du har ${state.beat.lives} liv tilbage.`
    : '';
  setFeedback('incorrect', `Pas p\u00E5: ${hitBox.value}`, `${hitBox.value} h\u00F8rer ikke til ${state.beat.table}-tabellen. Kassen bliver st\u00E5ende.${livesMessage}`);
  setProgress(`Find m\u00E5let: ${state.beat.targetOrder[state.beat.targetIndex]}`, (state.beat.targetIndex / BEAT_TARGET_COUNT) * 100, true);
}

function drawBeatSaberArena(now) {
  state.beat.boxes.filter((box) => box.alive).forEach((box) => {
    const rect = beatBoxRect(box, now);
    const x = rect.x * canvas.width;
    const y = rect.y * canvas.height;
    const width = rect.width * canvas.width;
    const height = rect.height * canvas.height;
    const wrong = box.wrongUntil > now;
    ctx.save();
    ctx.globalAlpha = wrong ? 0.55 : 1;
    ctx.fillStyle = 'rgba(103, 228, 225, 0.14)';
    ctx.strokeStyle = wrong ? '#ffcb66' : '#67e4e1';
    ctx.lineWidth = wrong ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(x + 12, y);
    ctx.lineTo(x + width - 12, y);
    ctx.lineTo(x + width, y + 12);
    ctx.lineTo(x + width, y + height - 12);
    ctx.lineTo(x + width - 12, y + height);
    ctx.lineTo(x + 12, y + height);
    ctx.lineTo(x, y + height - 12);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x + 12, y);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f4f6fb';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textX = x + width / 2;
    const textY = y + height / 2;
    ctx.save();
    ctx.translate(textX * 2, 0);
    ctx.scale(-1, 1);
    ctx.fillText(String(box.value), textX, textY);
    ctx.restore();
    ctx.restore();
  });

  const saber = state.beat.saber;
  if (!saber) return;
  const dx = saber.tip.x - saber.base.x;
  const dy = saber.tip.y - saber.base.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const startX = clamp(saber.base.x - ux * 0.08, 0.02, 0.98) * canvas.width;
  const startY = clamp(saber.base.y - uy * 0.08, 0.02, 0.98) * canvas.height;
  const endX = clamp(saber.tip.x + ux * 0.16, 0.02, 0.98) * canvas.width;
  const endY = clamp(saber.tip.y + uy * 0.16, 0.02, 0.98) * canvas.height;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = '#67e4e1';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = 'rgba(103, 228, 225, 0.55)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#f4f6fb';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.fillStyle = '#67e4e1';
  ctx.beginPath();
  ctx.arc(clamp(saber.tip.x, 0.02, 0.98) * canvas.width, clamp(saber.tip.y, 0.02, 0.98) * canvas.height, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function updateLeftPointer(leftHand, now) {
  const canChooseDigit = state.mode === 'ones' || state.mode === 'tens' || state.mode === 'single';
  if (canChooseDigit && leftHand?.pointing) {
    return updateKeypadPointer('left', leftHand, now);
  }
  if (!leftHand?.pointing || (state.mode !== 'confirm' && state.mode !== 'review')) {
    state.keypadIntent = false;
    updatePointerHover('left', null, now, 1, () => {});
    return false;
  }
  const target = [lockZone, rejectZone]
    .find((element) => pointInside(leftHand.point, stageRectForElement(element), 10));
  const dwellMs = target === rejectZone ? REJECT_HOVER_MS : LOCK_HOVER_MS;
  const active = Boolean(target);
  updatePointerHover('left', target, now, dwellMs, () => {
    if (target === lockZone) {
      if (state.mode === 'confirm') lockCandidate('venstre pegefinger');
      else approveLockedCandidate('venstre pegefinger');
    }
    if (target === rejectZone) rejectOrDelete('venstre pegefinger');
  });
  return active;
}

function updateKeypadPointer(side, hand, now) {
  const buttons = getDigitButtons();
  const canChooseDigit = state.mode === 'ones' || state.mode === 'tens' || state.mode === 'single';
  const keypadIntent = Boolean(canChooseDigit
    && hand?.pointing
    && pointInside(hand.point, stageRectForElement(digitKeypad), 8));
  const target = keypadIntent
    ? buttons.find((button) => pointInside(hand.point, stageRectForElement(button), 8))
    : null;
  state.keypadIntent = keypadIntent;
  if (!keypadIntent) {
    const stillInsideKeypad = Boolean(hand?.pointing
      && pointInside(hand.point, stageRectForElement(digitKeypad), 8));
    updatePointerHover('right', null, now, 1, () => {}, stillInsideKeypad);
    buttons.forEach((button) => button.classList?.remove?.('hovering'));
    return false;
  }
  if (target) {
    updatePointerHover('right', target, now, KEY_HOVER_MS, () => {
      selectKeypadDigit(Number(target.dataset.digit));
    });
  } else {
    updatePointerHover('right', null, now, KEY_HOVER_MS, () => {}, true);
  }
  return true;
}

// MediaPipe assumes mirrored selfie input. The tracker receives the raw,
// unmirrored video, while CSS mirrors only the preview, so swap its labels.
function physicalHandLabel(label) {
  if (label === 'Left') return 'Right';
  if (label === 'Right') return 'Left';
  return label;
}
function resizeCanvas() {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawHand(hand, digit, thumbsUp, thumbsDown, pointing, index) {
  const color = thumbsDown ? '#ff7185' : thumbsUp ? '#ffcb66' : index === 0 ? '#67e4e1' : '#68df9a';
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  CONNECTORS.forEach(([start, end]) => {
    ctx.beginPath();
    ctx.moveTo(hand[start].x * canvas.width, hand[start].y * canvas.height);
    ctx.lineTo(hand[end].x * canvas.width, hand[end].y * canvas.height);
    ctx.stroke();
  });
  hand.forEach((point, pointIndex) => {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, pointIndex === 0 ? 7 : 4, 0, Math.PI * 2);
    ctx.fill();
  });
  const anchor = hand[0];
  ctx.save();
  ctx.translate(anchor.x * canvas.width, anchor.y * canvas.height);
  ctx.scale(-1, 1);
  ctx.fillStyle = color;
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText(thumbsDown ? 'TOMMEL NED' : thumbsUp ? 'TOMMEL OP' : pointing ? 'PEG' : `CIFFER ${digit ?? '?'}`, 14, -12);
  ctx.restore();
}

function renderDetectedHands() {
  if (!state.detected.length) {
    detectedHands.innerHTML = '<span class="muted">Ingen h\u00E6nder registreret</span>';
    return;
  }
  detectedHands.innerHTML = state.detected.map((hand) => {
    const value = state.gameMode === 'beat-saber'
      ? hand.pointing ? '\u2694' : '?'
      : hand.thumbsDown ? '\u2193' : hand.thumbsUp ? '\u2191' : hand.pointing ? '\u261D' : hand.digit ?? '?';
    const label = hand.label === 'Left' ? 'Venstre' : hand.label === 'Right' ? 'H\u00F8jre' : hand.label;
    return `<span class="hand-chip"><span>${label}</span><strong>${value}</strong></span>`;
  }).join('');
}

function updateTrackingBadge(rightHand, leftThumbUp, leftThumbDown) {
  if (state.gameMode === 'beat-saber') {
    trackingBadge.textContent = rightHand?.pointing ? state.beat.statusText : 'Peg med en pegefinger for at aktivere lyssv\u00E6rdet';
    trackingBadge.className = rightHand?.pointing ? 'tracking-badge good' : 'tracking-badge';
  } else if (state.keypadIntent) {
    trackingBadge.textContent = 'Venstre peger p\u00E5 ciffertastaturet';
    trackingBadge.className = 'tracking-badge confirm';
  } else if (state.mode === 'review' && leftThumbDown) {
    trackingBadge.textContent = 'Venstre tommel ned registreret (ekstra sletning)';
    trackingBadge.className = 'tracking-badge confirm';
  } else if (state.mode === 'review') {
    trackingBadge.textContent = 'Peg p\u00E5 L\u00C5S for at godkende, eller tommel ned for at slette';
    trackingBadge.className = 'tracking-badge confirm';
  } else if (state.mode === 'confirm' && leftThumbUp) {
    trackingBadge.textContent = 'Venstre tommel op registreret';
    trackingBadge.className = 'tracking-badge confirm';
  } else if (state.mode === 'confirm') {
    trackingBadge.textContent = 'Peg p\u00E5 L\u00C5S, eller vis tommel op';
    trackingBadge.className = 'tracking-badge confirm';
  } else if (rightHand) {
    trackingBadge.textContent = `H\u00F8jre h\u00E5nd viser ${rightHand.digit ?? '?'}`;
    trackingBadge.className = 'tracking-badge good';
  } else if (state.detected.length) {
    trackingBadge.textContent = 'Brug h\u00F8jre ASL eller venstre tastatur';
    trackingBadge.className = 'tracking-badge';
  } else {
    trackingBadge.textContent = state.lastResultsAt ? 'Ingen h\u00E5nd i billedet' : 'Venter p\u00E5 h\u00E5ndsporing';
    trackingBadge.className = 'tracking-badge';
  }
}

function digitStageLabel() {
  if (state.mode === 'ones') return 'Vis enerciffer med h\u00F8jre ASL eller venstre tastatur';
  if (state.mode === 'tens') return 'Vis tierciffer med h\u00F8jre ASL eller venstre tastatur';
  return 'Vis ciffer med h\u00F8jre ASL eller venstre tastatur';
}

function prepareDigitForLock(digit, source = 'h\u00E5ndtegn') {
  if (state.mode !== 'ones' && state.mode !== 'tens' && state.mode !== 'single') return false;
  if (state.mode === 'tens' && digit === 0) {
    setFeedback('incorrect', 'Tiercifret kan ikke v\u00E6re nul', 'Vis 1 til 9, eller v\u00E6lg et andet ciffer.');
    setProgress('H\u00F8jre h\u00E5nd: vis tiercifret', 0, false);
    return false;
  }

  state.acceptedValue = digit;
  state.confirmPlace = state.mode;
  state.mode = 'confirm';
  state.stableValue = null;
  state.stableFrames = 0;
  if (state.confirmPlace === 'ones') inputValue.textContent = `_${digit}`;
  else if (state.confirmPlace === 'tens') inputValue.textContent = `${digit}${state.ones}`;
  else inputValue.textContent = String(digit);
  const sourceLabel = source === 'ciffertastatur' ? 'ciffertastaturet' : 'h\u00F8jre h\u00E5nd';
  equationHint.textContent = `Ciffer ${digit} er valgt via ${sourceLabel}. Peg p\u00E5 L\u00C5S, eller vis tommel op.`;
  setFeedback('confirm', `Ciffer klar: ${digit}`, 'Peg p\u00E5 L\u00C5S med venstre h\u00E5nd, eller brug tommel op.');
  setProgress('Venter p\u00E5 venstre h\u00E5nd: peg p\u00E5 L\u00C5S', 0, true);
  updateGestureControls();
  return true;
}

function lockCandidate(source = 'venstre h\u00E5nd') {
  if (state.mode !== 'confirm' || state.acceptedValue === null) return false;
  const place = state.confirmPlace;
  const digit = state.acceptedValue;
  state.confirmFrames = 0;
  state.reviewFrames = 0;
  state.deleteFrames = 0;
  if (place === 'ones') state.ones = digit;
  if (place === 'tens') state.tens = digit;
  state.mode = 'review';
  equationHint.textContent = 'Ciffer l\u00E5st. Peg p\u00E5 L\u00C5S igen for at forts\u00E6tte, eller p\u00E5 NEJ / SLET for at slette.';
  setFeedback('confirm', `Ciffer l\u00E5st: ${digit}`, `L\u00E5st via ${source}. Peg p\u00E5 L\u00C5S igen, eller p\u00E5 NEJ / SLET.`);
  setProgress('Kontroll\u00E9r det l\u00E5ste ciffer', 0, true);
  updateGestureControls();
  return true;
}

function rejectOrDelete(source = 'venstre h\u00E5nd') {
  if (state.mode === 'confirm' || state.mode === 'review') {
    undoLockedDigit();
    setFeedback('info', 'Ciffer slettet', `Det blev slettet via ${source}.`);
    return true;
  }
  if (state.mode === 'ones' || state.mode === 'tens' || state.mode === 'single') {
    state.stableValue = null;
    state.stableFrames = 0;
    setFeedback('info', 'Ciffer ryddet', 'Vis et nyt ciffer med h\u00F8jre ASL eller peg p\u00E5 venstre tastatur.');
    setProgress(digitStageLabel(), 0, false);
    return true;
  }
  return false;
}

function selectKeypadDigit(digit) {
  if (state.mode !== 'ones' && state.mode !== 'tens' && state.mode !== 'single') return false;
  return prepareDigitForLock(digit, 'ciffertastatur');
}

function handleDigitInput(digit) {
  if (state.mode === 'feedback' || state.mode === 'done') return;
  if (digit === null || state.acceptedValue !== null) {
    if (digit === null) {
      state.stableValue = null;
      state.stableFrames = 0;
      setProgress(digitStageLabel(), 0, false);
    }
    return;
  }

  if (digit === state.stableValue) state.stableFrames += 1;
  else {
    state.stableValue = digit;
    state.stableFrames = 1;
  }
  const percentage = (state.stableFrames / STABLE_FRAMES) * 100;
  setProgress(`Afl\u00E6ser ciffer p\u00E5 h\u00F8jre h\u00E5nd: ${digit}`, percentage, false);

  if (state.stableFrames < STABLE_FRAMES) return;
  if (state.mode === 'tens' && digit === 0) {
    setFeedback('incorrect', 'Tiercifret kan ikke v\u00E6re nul', 'Vis 1 til 9 med h\u00F8jre h\u00E5nd.');
    unlockAfterPoseChange();
    setProgress('H\u00F8jre h\u00E5nd: vis tiercifret', 0, false);
    return;
  }
  prepareDigitForLock(digit, 'h\u00E5ndtegn');
}

function handleConfirmation(leftThumbUp) {
  if (!leftThumbUp) {
    state.thumbUpLatched = false;
    state.confirmFrames = 0;
    setProgress('Venter p\u00E5 venstre L\u00C5S eller tommel op', 0, true);
    return;
  }
  if (state.thumbUpLatched) {
    state.confirmFrames = 0;
    setProgress('S\u00E6nk venstre tommel f\u00F8r n\u00E6ste l\u00E5s', 0, true);
    return;
  }
  state.confirmFrames += 1;
  setProgress('L\u00E5ser ciffer', (state.confirmFrames / CONFIRM_FRAMES) * 100, true);
  if (state.confirmFrames < CONFIRM_FRAMES) return;
  if (lockCandidate('venstre tommel op')) {
    state.thumbUpLatched = true;
    approveLockedCandidate('venstre tommel op');
  }
}

function approveLockedCandidate(source = 'venstre h\u00E5nd') {
  if (state.mode !== 'review') return false;
  setFeedback('confirm', 'Ciffer godkendt', `Godkendt via ${source}.`);
  finishLockedCandidate();
  return true;
}

function finishLockedCandidate() {
  const place = state.confirmPlace;
  const digit = state.acceptedValue;
  state.reviewFrames = 0;
  if (place === 'single') {
    submitAnswer(digit);
    return;
  }
  if (place === 'tens') {
    submitAnswer();
    return;
  }

  state.mode = 'tens';
  state.stableValue = null;
  state.stableFrames = 0;
  state.acceptedValue = null;
  state.confirmPlace = null;
  equationHint.textContent = 'Enercifret er godkendt. Vis nu tiercifret med h\u00F8jre h\u00E5nd.';
  setFeedback('info', `Enerciffer l\u00E5st: ${state.ones}`, 'Vis tiercifret med h\u00F8jre h\u00E5nd.');
  setProgress('H\u00F8jre h\u00E5nd: vis tiercifret', 0, false);
  updateGestureControls();
}

function handleReview(leftThumbUp, leftThumbDown) {
  if (leftThumbDown) {
    state.reviewFrames = 0;
    state.deleteFrames += 1;
    setProgress('Tommel ned registreret - hold lidt endnu for at slette', (state.deleteFrames / DELETE_FRAMES) * 100, true);
    if (state.deleteFrames >= DELETE_FRAMES) undoLockedDigit();
    return;
  }
  state.deleteFrames = 0;
  if (leftThumbUp) {
    state.reviewFrames = 0;
    setProgress('Peg p\u00E5 L\u00C5S igen, eller s\u00E6nk venstre h\u00E5nd for at godkende', 0, true);
    return;
  }
  state.reviewFrames += 1;
  setProgress('Godkender l\u00E5st ciffer', (state.reviewFrames / RELEASE_FRAMES) * 100, true);
  if (state.reviewFrames < RELEASE_FRAMES) return;

  state.reviewFrames = 0;
  finishLockedCandidate();
}

function undoLockedDigit() {
  const place = state.confirmPlace;
  if (place === 'ones') state.ones = null;
  if (place === 'tens') state.tens = null;
  state.mode = place;
  state.acceptedValue = null;
  state.confirmPlace = null;
  state.stableValue = null;
  state.stableFrames = 0;
  state.confirmFrames = 0;
  state.reviewFrames = 0;
  state.deleteFrames = 0;
  inputValue.textContent = place === 'tens' ? `_${state.ones}` : '\u2014';
  equationHint.textContent = place === 'tens'
    ? 'Tiercifret blev slettet. Vis et nyt tierciffer med h\u00F8jre h\u00E5nd.'
    : 'Cifret blev slettet. Vis et nyt ciffer med h\u00F8jre h\u00E5nd.';
  setFeedback('info', 'Ciffer slettet', 'Vis det rigtige ciffer med h\u00F8jre h\u00E5nd.');
  setProgress(digitStageLabel(), 0, false);
  updateGestureControls();
}

function submitAnswer(singleDigit = null) {
  const answer = state.challenge.needsTwoDigits ? (state.tens * 10) + state.ones : singleDigit;
  inputValue.textContent = String(answer);
  state.mode = 'feedback';
  updateGestureControls();
  const isCorrect = answer === state.challenge.answer;
  if (isCorrect) {
    state.score += 1;
    state.streak += 1;
    setFeedback('correct', 'Rigtigt!', `${state.challenge.left} ${state.challenge.operator} ${state.challenge.right} = ${state.challenge.answer}.`);
  } else {
    state.streak = 0;
    setFeedback('incorrect', 'Ikke helt', `Svaret er ${state.challenge.answer}. Du viste ${answer}.`);
  }
  updateScore();
  if (isCorrect) showCelebration(state.score % 10 === 0, state.score);
  setProgress(isCorrect ? 'Runden er f\u00E6rdig' : 'Pr\u00F8v den n\u00E6ste', 100, false);
  window.clearTimeout(state.feedbackTimer);
  state.feedbackTimer = window.setTimeout(() => {
    state.round += 1;
    setChallenge();
  }, isCorrect ? 1350 : 1900);
}

function unlockAfterPoseChange() {
  state.acceptedValue = null;
  state.stableValue = null;
  state.stableFrames = 0;
}

function detectDigit(hand) {
  const thumb = isThumbExtended(hand);
  const index = isFingerExtended(hand, 5, 6, 7, 8);
  const middle = isFingerExtended(hand, 9, 10, 11, 12);
  const ring = isFingerExtended(hand, 13, 14, 15, 16);
  const pinky = isFingerExtended(hand, 17, 18, 19, 20);
  const touchesIndex = thumbTouchesFinger(hand, 8);
  const touchesMiddle = thumbTouchesFinger(hand, 12);
  const touchesRing = thumbTouchesFinger(hand, 16);
  const touchesPinky = thumbTouchesFinger(hand, 20);

  // ASL 0 is an O: curled fingers with the thumb and index fingertips meeting.
  if (touchesIndex && !index && !middle && !ring && !pinky) return 0;
  if (!thumb && index && !middle && !ring && !pinky) return 1;
  if (!thumb && index && middle && !ring && !pinky) return 2;
  if (thumb && index && middle && !ring && !pinky) return 3;
  if (!thumb && index && middle && ring && pinky) return 4;
  if (thumb && index && middle && ring && pinky) return 5;
  if (touchesPinky && index && middle && ring && !pinky) return 6;
  if (touchesRing && index && middle && !ring && pinky) return 7;
  if (touchesMiddle && index && !middle && ring && pinky) return 8;
  if (touchesIndex && !index && middle && ring && pinky) return 9;
  return null;
}

function thumbTouchesFinger(hand, fingertipIndex) {
  const palmSize = distance(hand[0], hand[9]) || 0.001;
  return distance(hand[4], hand[fingertipIndex]) < palmSize * 0.42;
}

function isFingerExtended(hand, mcpIndex, pipIndex, dipIndex, tipIndex) {
  const pipAngle = jointAngle(hand[mcpIndex], hand[pipIndex], hand[dipIndex]);
  const dipAngle = jointAngle(hand[pipIndex], hand[dipIndex], hand[tipIndex]);
  const tipReach = distance(hand[tipIndex], hand[0]);
  const pipReach = distance(hand[pipIndex], hand[0]);
  return pipAngle > 150 && dipAngle > 145 && tipReach > pipReach * 1.04;
}

function isThumbExtended(hand) {
  const palmSize = distance(hand[0], hand[9]) || 0.001;
  const mcpAngle = jointAngle(hand[1], hand[2], hand[3]);
  const ipAngle = jointAngle(hand[2], hand[3], hand[4]);
  const thumbAway = distance(hand[4], hand[5]) > palmSize * 0.5;
  const thumbReach = distance(hand[4], hand[0]) > distance(hand[3], hand[0]) * 1.04;
  return mcpAngle > 130 && ipAngle > 145 && thumbAway && thumbReach;
}

function commandHandShape(geometryHand) {
  const curled = [
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
  ].every((indices) => !isFingerExtended(geometryHand, ...indices));
  const palmSize = distance(geometryHand[0], geometryHand[9]) || 0.001;
  const thumbReach = distance(geometryHand[4], geometryHand[0]) > palmSize * 0.75;
  const thumbSpan = distance(geometryHand[4], geometryHand[2]) > palmSize * 0.45;
  return curled && (isThumbExtended(geometryHand) || thumbReach || thumbSpan);
}

// Use the raw image's vertical axis. Y grows downwards, so negative means up.
function classifyThumbCommand(geometryHand, imageHand) {
  if (!commandHandShape(geometryHand)) return 'none';
  const thumbX = imageHand[4].x - imageHand[2].x;
  const thumbY = imageHand[4].y - imageHand[2].y;
  const palmSize = distance(imageHand[0], imageHand[9]) || 0.001;
  const verticalReach = thumbY / palmSize;
  const thumbLength = Math.hypot(thumbX, thumbY) || 1;
  const alignment = thumbY / thumbLength;
  if (verticalReach <= -0.25 && alignment <= -0.3) return 'up';
  if (verticalReach >= 0.25 && alignment >= 0.3) return 'down';
  return 'none';
}

function isThumbsUp(geometryHand, imageHand) {
  return classifyThumbCommand(geometryHand, imageHand) === 'up';
}

function isThumbsDown(geometryHand, imageHand) {
  return classifyThumbCommand(geometryHand, imageHand) === 'down';
}

function isPointing(hand) {
  const indexExtended = isFingerExtended(hand, 5, 6, 7, 8);
  const othersCurled = [
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
  ].every((indices) => !isFingerExtended(hand, ...indices));
  return indexExtended && othersCurled && !isThumbExtended(hand);
}

function jointAngle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const length = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z) || 1;
  return Math.acos(Math.max(-1, Math.min(1, dot / length))) * 180 / Math.PI;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

lockZone.addEventListener('click', () => lockCandidate('mus eller touch'));
rejectZone.addEventListener('click', () => rejectOrDelete('mus eller touch'));
digitKeypad.addEventListener('click', (event) => {
  const button = event.target?.closest?.('.digit-key');
  if (button) selectKeypadDigit(Number(button.dataset.digit));
});

startButton.addEventListener('click', startCamera);
newChallengeButton.addEventListener('click', () => {
  if (state.gameMode === 'beat-saber') {
    startBeatMode(true);
    return;
  }
  state.round += 1;
  state.streak = 0;
  updateScore();
  setChallenge();
});
gameModeButtons.forEach((button) => {
  button.addEventListener('click', () => switchGameMode(button.dataset.gameMode));
});
difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.beat.difficulty = button.dataset.difficulty === 'hard' ? 'hard' : 'easy';
    if (state.gameMode === 'beat-saber') startBeatMode(true);
    else updateModeUI();
  });
});
beatLivesToggle?.addEventListener('click', toggleBeatLives);
handLevelButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.handLevel = normaliseHandLevel(button.dataset.handLevel);
    if (state.gameMode === 'hand-sign') {
      state.round += 1;
      state.streak = 0;
      updateScore();
      setChallenge();
    }
    updateModeUI();
  });
});
beatTableSelect?.addEventListener('change', () => {
  if (state.gameMode === 'beat-saber') startBeatMode(true);
});
window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', stopCamera);

updateScore();
setChallenge();
updateModeUI();
