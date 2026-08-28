const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const markup = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function makeElement() {
  return {
    className: '',
    disabled: false,
    innerHTML: '',
    srcObject: null,
    style: {},
    textContent: '',
    videoHeight: 480,
    videoWidth: 640,
    readyState: 4,
    classList: { add() {}, remove() {} },
    addEventListener() {},
    getContext() {
      return {
        arc() {}, beginPath() {}, clearRect() {}, fill() {}, fillText() {},
        lineTo() {}, moveTo() {}, restore() {}, save() {}, scale() {},
        stroke() {}, translate() {},
      };
    },
    play: async () => {},
  };
}

function loadApp() {
  const elements = new Map();
  const context = {
    console,
    Math,
    Promise,
    Set,
    document: {
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, makeElement());
        return elements.get(selector);
      },
    },
    location: { hostname: 'localhost' },
    navigator: { mediaDevices: {} },
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    window: {
      addEventListener() {},
      clearTimeout() {},
      isSecureContext: true,
      setTimeout: () => 1,
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'app.js' });
  return context;
}

function point(x, y, z = 0) {
  return { x, y, z };
}

function makeHand(digit) {
  const hand = Array.from({ length: 21 }, () => point(0.5, 0.75));
  hand[0] = point(0.5, 0.9);
  const fingers = [
    [5, 6, 7, 8, 0.38],
    [9, 10, 11, 12, 0.46],
    [13, 14, 15, 16, 0.54],
    [17, 18, 19, 20, 0.62],
  ];
  const extendedByDigit = {
    0: [false, false, false, false],
    1: [true, false, false, false],
    2: [true, true, false, false],
    3: [true, true, false, false],
    4: [true, true, true, true],
    5: [true, true, true, true],
    6: [true, true, true, false],
    7: [true, true, false, true],
    8: [true, false, true, true],
    9: [false, true, true, true],
  };
  const extended = extendedByDigit[digit];

  fingers.forEach(([mcp, pip, dip, tip, x], index) => {
    hand[mcp] = point(x, 0.7);
    if (extended[index]) {
      hand[pip] = point(x, 0.55);
      hand[dip] = point(x, 0.42);
      hand[tip] = point(x, 0.28);
    } else {
      hand[pip] = point(x, 0.58);
      hand[dip] = point(x, 0.64);
      hand[tip] = point(x, 0.7);
    }
  });

  hand[1] = point(0.44, 0.78);
  if (digit === 3 || digit === 5) {
    hand[2] = point(0.38, 0.7);
    hand[3] = point(0.28, 0.65);
    hand[4] = point(0.16, 0.6);
  } else {
    hand[2] = point(0.42, 0.74);
    hand[3] = point(0.47, 0.72);
    hand[4] = point(0.5, 0.7);
  }

  const contactTip = { 0: 8, 6: 20, 7: 16, 8: 12, 9: 8 }[digit];
  if (contactTip !== undefined) hand[4] = { ...hand[contactTip] };
  return hand;
}

function makeThumbsUp() {
  const hand = makeHand(0);
  hand[1] = point(0.48, 0.78);
  hand[2] = point(0.49, 0.7);
  hand[3] = point(0.5, 0.55);
  hand[4] = point(0.5, 0.35);
  return hand;
}

function makeThumbsDown() {
  const hand = makeHand(0);
  hand[1] = point(0.5, 0.78);
  hand[2] = point(0.5, 0.82);
  hand[3] = point(0.5, 0.98);
  hand[4] = point(0.5, 1.18);
  return hand;
}

test('source stays ASCII-safe and free of mojibake', () => {
  assert.doesNotMatch(source, /[\u00C3\u00C2\u00E2\u00C6\uFFFD]/u);
  assert.doesNotMatch(source, /[^\x00-\x7F]/u);
  assert.match(source, /\\u00D7/);
});

test('Håndtegn exposes three levels with all four operations', () => {
  for (const level of [1, 2, 3]) {
    assert.match(markup, new RegExp(`data-hand-level="${level}"`));
  }
  const context = loadApp();
  const operators = ['+', '-', '\u00D7', '\u00F7'];
  for (const level of [1, 2, 3]) {
    for (const operator of operators) {
      context.testLevel = level;
      context.testOperator = operator;
      const challenge = vm.runInContext('makeChallengeForLevel(testLevel, testOperator)', context);
      const expected = operator === '+'
        ? challenge.left + challenge.right
        : operator === '-'
          ? challenge.left - challenge.right
          : operator === '\u00D7'
            ? challenge.left * challenge.right
            : challenge.left / challenge.right;
      assert.equal(challenge.answer, expected);
      assert.ok(challenge.answer >= 0 && challenge.answer <= 99);
      assert.equal(challenge.needsTwoDigits, challenge.answer >= 10);
      if (operator === '-') assert.ok(challenge.right <= challenge.left);
      if (operator === '\u00F7') assert.equal(challenge.left % challenge.right, 0);
    }
  }
});

test('all required offline MediaPipe files exist', () => {
  const required = [
    'hands.js',
    'hands.binarypb',
    'hands_solution_packed_assets_loader.js',
    'hands_solution_packed_assets.data',
    'hands_solution_simd_wasm_bin.js',
    'hands_solution_simd_wasm_bin.wasm',
    'hand_landmark_lite.tflite',
    'hand_landmark_full.tflite',
  ];
  required.forEach((file) => {
    const filePath = path.join(root, 'vendor', 'mediapipe', file);
    assert.ok(fs.existsSync(filePath), `${file} is missing`);
    assert.ok(fs.statSync(filePath).size > 0, `${file} is empty`);
  });
});


test('the supplied ASL chart is bundled and referenced offline', () => {
  const chartPath = path.join(root, 'assets', 'asl-numbers-1-10.png');
  assert.ok(fs.existsSync(chartPath));
  assert.ok(fs.statSync(chartPath).size > 0);
  assert.match(markup, /assets\/asl-numbers-1-10\.png/);
});
test('tracker starts full and falls back once to lite without dropping the frame loop', () => {
  assert.match(source, /function setupHands\(sessionId, modelComplexity = 1\)/);
  assert.match(source, /setupHands\(sessionId\);\s*state\.tracking = true;/);
  assert.match(source, /modelComplexity,/);

  const frameSource = source.match(/async function processFrame\(sessionId\) \{[\s\S]*?\n\}/)[0];
  assert.match(frameSource, /if \(!state\.modelFallbackUsed\)/);
  assert.match(frameSource, /failedHands\?\.close\?\.\(\)/);
  assert.match(frameSource, /setupHands\(sessionId, 0\)/);
  assert.match(frameSource, /state\.frameErrors >= 3/);
  assert.match(frameSource, /error\?\.message/);
  assert.equal((frameSource.match(/requestAnimationFrame/g) || []).length, 1);

  const fallbackBranch = frameSource.match(/if \(!state\.modelFallbackUsed\) \{([\s\S]*?)\n      \} else \{/)[1];
  assert.doesNotMatch(fallbackBranch, /\breturn\b/);
});
test('digit classifier recognizes the ten documented poses', () => {
  const context = loadApp();
  for (let digit = 0; digit <= 9; digit += 1) {
    context.testHand = makeHand(digit);
    const detected = vm.runInContext('detectDigit(testHand)', context);
    assert.equal(detected, digit, `pose ${digit} was read as ${detected}`);
  }
});

test('thumbs-up classifier requires a raised thumb and curled fingers', () => {
  const context = loadApp();
  context.testThumb = makeThumbsUp();
  context.testOpen = makeHand(5);
  assert.equal(vm.runInContext('isThumbsUp(testThumb, testThumb)', context), true);
  assert.equal(vm.runInContext('isThumbsUp(testOpen, testOpen)', context), false);
});

test('two-digit input locks and advances directly with left thumbs up', () => {
  const context = loadApp();
  vm.runInContext("state.challenge = { needsTwoDigits: true, answer: 42, left: 40, right: 2, operator: '+' }; state.mode = 'ones';", context);
  for (let frame = 0; frame < 12; frame += 1) vm.runInContext('handleDigitInput(2)', context);
  assert.equal(vm.runInContext('state.confirmPlace', context), 'ones');
  for (let frame = 0; frame < 12; frame += 1) vm.runInContext('handleConfirmation(true)', context);
  assert.equal(vm.runInContext('state.ones', context), 2);
  assert.equal(vm.runInContext('state.mode', context), 'tens');
  assert.equal(vm.runInContext('state.thumbUpLatched', context), true);
  for (let frame = 0; frame < 12; frame += 1) vm.runInContext('handleDigitInput(4)', context);
  for (let frame = 0; frame < 12; frame += 1) vm.runInContext('handleConfirmation(true)', context);
  assert.equal(vm.runInContext('state.mode', context), 'confirm');
  vm.runInContext('handleConfirmation(false)', context);
  for (let frame = 0; frame < 12; frame += 1) vm.runInContext('handleConfirmation(true)', context);
  assert.equal(vm.runInContext('state.mode', context), 'feedback');
  assert.equal(vm.runInContext("document.querySelector('#inputValue').textContent", context), '42');
});

test('single digit advances directly after left-thumb confirmation', () => {
  const context = loadApp();
  vm.runInContext("state.challenge = { needsTwoDigits: false, answer: 5, left: 2, right: 3, operator: '+' }; state.mode = 'single';", context);
  for (let frame = 0; frame < 12; frame += 1) vm.runInContext('handleDigitInput(5)', context);
  assert.equal(vm.runInContext('state.mode', context), 'confirm');
  for (let frame = 0; frame < 12; frame += 1) vm.runInContext('handleConfirmation(true)', context);
  assert.equal(vm.runInContext('state.mode', context), 'feedback');
  assert.equal(vm.runInContext('state.score', context), 1);
});

test('keypad, lock, and reject actions share the same input flow', () => {
  const context = loadApp();
  vm.runInContext("state.mode = 'single';", context);
  assert.equal(vm.runInContext('selectKeypadDigit(7)', context), true);
  assert.equal(vm.runInContext('state.mode', context), 'confirm');
  assert.equal(vm.runInContext('state.acceptedValue', context), 7);
  assert.equal(vm.runInContext("lockCandidate('test')", context), true);
  assert.equal(vm.runInContext('state.mode', context), 'review');
  assert.equal(vm.runInContext("rejectOrDelete('test')", context), true);
  assert.equal(vm.runInContext('state.mode', context), 'single');
  assert.equal(vm.runInContext('state.acceptedValue', context), null);
});

test('a correct answer creates regular celebration feedback', () => {
  const context = loadApp();
  vm.runInContext("state.challenge = { needsTwoDigits: false, answer: 5, left: 2, right: 3, operator: '+' }; state.mode = 'single'; submitAnswer(5);", context);
  assert.equal(vm.runInContext('state.score', context), 1);
  assert.match(vm.runInContext("document.querySelector('#celebrationLayer').innerHTML", context), /Flot regnet/);
});

test('pointer dwell does not reactivate on the same target after a mode change', () => {
  const context = loadApp();
  context.testTarget = {
    id: 'digit-1',
    classList: { add() {}, remove() {} },
    querySelector() { return { style: {} }; },
  };
  vm.runInContext("state.testActivations = 0; updatePointerHover('right', testTarget, 1000, 100, () => { state.testActivations += 1; }); updatePointerHover('right', testTarget, 1100, 100, () => { state.testActivations += 1; }); updatePointerHover('right', null, 1200, 1, () => {}, true); updatePointerHover('right', testTarget, 2200, 100, () => { state.testActivations += 1; });", context);
  assert.equal(vm.runInContext('state.testActivations', context), 1);
  vm.runInContext("updatePointerHover('right', null, 2500, 1, () => {}); updatePointerHover('right', testTarget, 2600, 100, () => { state.testActivations += 1; }); updatePointerHover('right', testTarget, 2700, 100, () => { state.testActivations += 1; });", context);
  assert.equal(vm.runInContext('state.testActivations', context), 2);
});

test('left pointer owns keypad hit testing while right hand remains ASL input', () => {
  assert.match(source, /updateKeypadPointer\('left', leftHand, now\)/);
  assert.doesNotMatch(source, /updateKeypadPointer\('right'/);
  assert.match(source, /else if \(!leftPointerActive\)/);
});

test('right hand is restricted to digit guesses, not pointer commands', () => {
  const context = loadApp();
  context.testResult = {
    multiHandLandmarks: [makeHand(1)],
    multiHandWorldLandmarks: [makeHand(1)],
    multiHandedness: [{ label: 'Left' }],
  };
  vm.runInContext("state.tracking = true; state.sessionId = 4; state.mode = 'single'; handleResults(testResult, 4);", context);
  assert.equal(vm.runInContext('state.detected[0].label', context), 'Right');
  assert.equal(vm.runInContext('state.detected[0].digit', context), 1);
  assert.equal(vm.runInContext('state.detected[0].pointing', context), false);
});

test('raw MediaPipe handedness is mapped to the physical mirrored-preview hand', () => {
  const context = loadApp();
  assert.equal(vm.runInContext("physicalHandLabel('Left')", context), 'Right');
  assert.equal(vm.runInContext("physicalHandLabel('Right')", context), 'Left');
});

test('digit poses remain stable when mirrored horizontally', () => {
  const context = loadApp();
  for (let digit = 0; digit <= 9; digit += 1) {
    context.testHand = makeHand(digit).map((landmark) => ({ ...landmark, x: 1 - landmark.x }));
    assert.equal(vm.runInContext('detectDigit(testHand)', context), digit);
  }
});

test('ASL digit 6 is not treated as the left-hand lock gesture', () => {
  const context = loadApp();
  context.testSix = makeHand(6);
  assert.equal(vm.runInContext('detectDigit(testSix)', context), 6);
  assert.equal(vm.runInContext('isThumbsUp(testSix, testSix)', context), false);
});


test('thumbs-down classifier requires a lowered thumb and curled fingers', () => {
  const context = loadApp();
  context.testThumbDown = makeThumbsDown();
  context.testOpen = makeHand(5);
  assert.equal(vm.runInContext('isThumbsDown(testThumbDown, testThumbDown)', context), true);
  assert.equal(vm.runInContext('isThumbsDown(testOpen, testOpen)', context), false);
});

test('left thumbs down deletes a reviewed single digit', () => {
  const context = loadApp();
  vm.runInContext("state.mode = 'review'; state.confirmPlace = 'single'; state.acceptedValue = 5;", context);
  for (let frame = 0; frame < 6; frame += 1) vm.runInContext('handleReview(false, true)', context);
  assert.equal(vm.runInContext('state.mode', context), 'single');
  assert.equal(vm.runInContext('state.acceptedValue', context), null);
});

test('left thumbs down deletes reviewed ones without advancing', () => {
  const context = loadApp();
  vm.runInContext("state.mode = 'review'; state.confirmPlace = 'ones'; state.acceptedValue = 2; state.ones = 2;", context);
  for (let frame = 0; frame < 6; frame += 1) vm.runInContext('handleReview(false, true)', context);
  assert.equal(vm.runInContext('state.mode', context), 'ones');
  assert.equal(vm.runInContext('state.ones', context), null);
});

test('left thumbs down deletes reviewed tens and keeps ones', () => {
  const context = loadApp();
  vm.runInContext("state.mode = 'review'; state.confirmPlace = 'tens'; state.acceptedValue = 4; state.tens = 4; state.ones = 2;", context);
  for (let frame = 0; frame < 6; frame += 1) vm.runInContext('handleReview(false, true)', context);
  assert.equal(vm.runInContext('state.mode', context), 'tens');
  assert.equal(vm.runInContext('state.tens', context), null);
  assert.equal(vm.runInContext('state.ones', context), 2);
  assert.equal(vm.runInContext("document.querySelector('#inputValue').textContent", context), '_2');
});

test('BeatSaber easy mode builds ascending table targets', () => {
  const context = loadApp();
  assert.deepEqual([...vm.runInContext('buildBeatTargetOrder(3, "easy")', context)], [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]);
  const boxes = vm.runInContext('createBeatBoxes(3, "easy", 9)', context);
  assert.equal(boxes.length, 4);
  assert.equal(boxes.filter((box) => box.isTarget).length, 1);
  assert.ok(boxes.filter((box) => !box.isTarget).every((box) => box.value % 3 !== 0));
  assert.ok(boxes.every((box) => Number.isFinite(box.velocityX) && Number.isFinite(box.velocityY)));
});

test('BeatSaber starts with three lives and can turn lives off', () => {
  assert.match(markup, /id="beatLivesToggle"/);
  assert.match(markup, /aria-pressed="true"/);
  const context = loadApp();
  assert.equal(vm.runInContext('state.beat.livesEnabled', context), true);
  assert.equal(vm.runInContext('state.beat.lives', context), 3);
  vm.runInContext('toggleBeatLives()', context);
  assert.equal(vm.runInContext('state.beat.livesEnabled', context), false);
  assert.equal(vm.runInContext("document.querySelector('#beatLivesCount').textContent", context), 'Ubegrænset');
  vm.runInContext('toggleBeatLives()', context);
  assert.equal(vm.runInContext('state.beat.livesEnabled', context), true);
  assert.equal(vm.runInContext('state.beat.lives', context), 3);
});

test('BeatSaber removes one life for a wrong hit and ends after the third', () => {
  const context = loadApp();
  vm.runInContext("state.gameMode = 'beat-saber'; state.mode = 'beat'; state.beat.table = 3; state.beat.targetOrder = [6]; state.beat.targetIndex = 0; state.beat.livesEnabled = true; state.beat.lives = 3; state.beat.boxes = [{ value: 6, isTarget: true, x: 0.1, y: 0.1, width: 0.16, height: 0.14, phase: 0, velocityX: 0, velocityY: 0, alive: true, wrongUntil: 0, spawnedAt: 1000 }, { value: 5, isTarget: false, x: 0.55, y: 0.15, width: 0.16, height: 0.14, phase: 0, velocityX: 0, velocityY: 0, alive: true, wrongUntil: 0, spawnedAt: 1000 }];", context);
  context.testSaber = { saber: { base: { x: 0.5, y: 0.3 }, tip: { x: 0.6, y: 0.2 } } };
  vm.runInContext('handleBeatSaberFrame(testSaber, 1000)', context);
  assert.equal(vm.runInContext('state.beat.lives', context), 2);
  assert.equal(vm.runInContext('state.beat.gameOver', context), false);
  vm.runInContext('handleBeatSaberFrame(testSaber, 1400); handleBeatSaberFrame(testSaber, 1800);', context);
  assert.equal(vm.runInContext('state.beat.lives', context), 0);
  assert.equal(vm.runInContext('state.beat.gameOver', context), true);
  assert.equal(vm.runInContext("document.querySelector('#feedbackTitle').textContent", context), 'Spillet er slut');
});

test('BeatSaber hard mode keeps every target as a multiple', () => {
  const context = loadApp();
  const order = vm.runInContext('buildBeatTargetOrder(7, "hard")', context);
  assert.equal(order.length, 12);
  assert.deepEqual([...order].sort((a, b) => a - b), [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84]);
});

test('BeatSaber removes a correct box but leaves a decoy intact', () => {
  const context = loadApp();
  vm.runInContext("state.gameMode = 'beat-saber'; state.mode = 'beat'; state.beat.table = 3; state.beat.targetOrder = [6, 9]; state.beat.targetIndex = 0; state.score = 0; state.streak = 0; state.beat.boxes = [{ value: 6, isTarget: true, x: 0.15, y: 0.15, width: 0.16, height: 0.14, phase: 0, alive: true, wrongUntil: 0, spawnedAt: 1000 }, { value: 5, isTarget: false, x: 0.55, y: 0.15, width: 0.16, height: 0.14, phase: 0, alive: true, wrongUntil: 0, spawnedAt: 1000 }];", context);
  vm.runInContext('handleBeatSaberFrame({ saber: { base: { x: 0.1, y: 0.1 }, tip: { x: 0.2, y: 0.2 } } }, 1000)', context);
  assert.equal(vm.runInContext('state.beat.boxes[0].alive', context), false);
  assert.equal(vm.runInContext('state.beat.boxes[1].alive', context), true);
  assert.equal(vm.runInContext('state.score', context), 1);
});

test('BeatSaber boxes move smoothly instead of staying fixed', () => {
  const context = loadApp();
  context.testBox = { x: 0.4, y: 0.4, width: 0.16, height: 0.14, phase: 0.7, spawnedAt: 1000 };
  const first = vm.runInContext('beatBoxRect(testBox, 1000)', context);
  const later = vm.runInContext('beatBoxRect(testBox, 5000)', context);
  assert.notEqual(first.x, later.x);
  assert.notEqual(first.y, later.y);
  assert.ok(later.x >= 0.02 && later.x <= 0.82);
  assert.ok(later.y >= 0.04 && later.y <= 0.82);
});

test('BeatSaber pauses and shows a large three-count before the next wave', () => {
  const context = loadApp();
  vm.runInContext("state.gameMode = 'beat-saber'; state.beat.targetOrder = [3, 6]; state.beat.targetIndex = 1; state.beat.boxes = []; queueBeatNextWave();", context);
  assert.equal(vm.runInContext('state.beat.countdownActive', context), true);
  vm.runInContext('runBeatCountdown(3)', context);
  assert.equal(vm.runInContext("document.querySelector('#beatCountdown').textContent", context), '3');
  assert.equal(vm.runInContext("document.querySelector('#beatCountdown').hidden", context), false);
});

test('BeatSaber holds the lightsaber through a brief tracking gap', () => {
  const context = loadApp();
  vm.runInContext("state.gameMode = 'beat-saber'; state.mode = 'beat'; state.beat.boxes = [];", context);
  context.testSaber = { base: { x: 0.4, y: 0.6 }, tip: { x: 0.55, y: 0.3 } };
  vm.runInContext('handleBeatSaberFrame({ saber: testSaber }, 1000)', context);
  assert.ok(vm.runInContext('state.beat.saber', context));
  vm.runInContext('handleBeatSaberFrame(null, 1100)', context);
  assert.ok(vm.runInContext('state.beat.saber', context));
  vm.runInContext('handleBeatSaberFrame(null, 1400)', context);
  assert.equal(vm.runInContext('state.beat.saber', context), null);
});

test('stopping the camera clears transient two-digit input state', () => {
  const context = loadApp();
  vm.runInContext("state.challenge = { needsTwoDigits: true }; state.mode = 'confirm'; state.ones = 5; state.confirmPlace = 'ones'; state.stableFrames = 7; state.acceptedValue = 5; state.confirmFrames = 4; state.reviewFrames = 3; state.deleteFrames = 2; stopCamera();", context);
  assert.equal(vm.runInContext('state.mode', context), 'ones');
  assert.equal(vm.runInContext('state.tens', context), null);
  assert.equal(vm.runInContext('state.ones', context), null);
  assert.equal(vm.runInContext('state.stableFrames', context), 0);
  assert.equal(vm.runInContext('state.acceptedValue', context), null);
  assert.equal(vm.runInContext('state.confirmFrames', context), 0);
  assert.equal(vm.runInContext('state.confirmPlace', context), null);
  assert.equal(vm.runInContext('state.reviewFrames', context), 0);
  assert.equal(vm.runInContext('state.deleteFrames', context), 0);
});
let failures = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error.stack || error);
  }
}
console.log(`${tests.length - failures}/${tests.length} tests passed`);
process.exitCode = failures ? 1 : 0;
