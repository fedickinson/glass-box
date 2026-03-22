let promptBox = null;
let outputBoxes = [];
let beams = [];
let headlineFrame = null;
let stageFrame = null;
let slidePhase = 0;
let phaseStartMs = 0;
let mediaRecorder = null;
let recordingChunks = [];
let recordingStopped = false;

const runtimeOptions = getRuntimeOptions();

const PAGE_BACKGROUND = 250;
const GREEDY_STEP = 0.28;
const OUTPUT_FADE = 0.65;
const HEADLINE_FADE = 0.8;
const PROMPT_HOLD = 0.95;
const HOLD_AFTER = 0.9;
const NEXT_SLIDE_PATH = "/sketch-slide-3.js";

const PROMPT_TITLE = "Prompt";
const PROMPT_TEXT =
  "Diagnose these symptoms: \nfever, cough, fatigue, and loss of taste.";
const HEADLINE_MESSAGES = [
  "When uncertainty is high, agents can have very different outputs",
  "Different reasoning paths can lead to different conclusions",
  "Interpreting outputs requires understanding the reasoning behind them",
];

const BEAM_CONFIGS = [
  {
    id: "A",
    label: "Output A",
    outputText:
      "Chest Cold",
    tint: [232, 122, 76],
    startDelay: 0.0,
    offsets: [-0.014, 0.01, -0.006, 0.006, 0],
  },
  {
    id: "B",
    label: "Output B",
    outputText:
      "COVID-19",
    tint: [214, 72, 68],
    startDelay: 0.16,
    offsets: [0.01, -0.012, 0.008, -0.005, 0],
  },
  {
    id: "C",
    label: "Output C",
    outputText:
      "Swine Flu",
    tint: [196, 34, 48],
    startDelay: 0.32,
    offsets: [0.016, -0.006, 0.013, -0.008, 0],
  },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  buildScene();
  phaseStartMs = millis();

  if (runtimeOptions.record) {
    startRecording();
  }
}

function draw() {
  background(PAGE_BACKGROUND);
  updateSlidePhase();
  const elapsed = getVisualElapsed();

  drawHeadline(elapsed);
  drawPromptBox();
  beams.forEach((beam) => {
    drawBeam(beam, elapsed);
  });
  beams.forEach((beam) => {
    drawOutputBox(beam, elapsed);
  });

  if (
    runtimeOptions.record &&
    !recordingStopped &&
    slidePhase === 4 &&
    currentPhaseElapsed() >= HOLD_AFTER
  ) {
    if (runtimeOptions.record) {
      stopRecording();
    }
    recordingStopped = true;
    noLoop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildScene();
  phaseStartMs = millis();
  slidePhase = runtimeOptions.autoplay ? 0 : slidePhase;
  recordingStopped = false;
  loop();
}

function mousePressed() {
  handleSlideAdvance();
}

function touchStarted() {
  handleSlideAdvance();
  return false;
}

function handleSlideAdvance() {
  if (runtimeOptions.record) {
    return;
  }

  if (slidePhase === 0) {
    startFirstTransition();
    return;
  }

  if (slidePhase === 1) {
    settleFirstTransition();
    return;
  }

  if (slidePhase === 2) {
    startSecondTransition();
    return;
  }

  if (slidePhase === 3) {
    settleSecondTransition();
    return;
  }

  goToNextSlide();
}

function buildScene() {
  headlineFrame = buildHeadlineFrame();
  stageFrame = buildStageFrame();
  const layout = buildLayout();
  promptBox = layout.promptBox;
  outputBoxes = layout.outputBoxes;

  beams = BEAM_CONFIGS.map((config, index) =>
    buildBeam(config, layout.laneYs[index], layout.outputBoxes[index], layout)
  );
}

function buildLayout() {
  const marginX = min(stageFrame.w * 0.055, 72);
  const promptWidth = min(stageFrame.w * 0.255, 320);
  const outputWidth = min(stageFrame.w * 0.235, 296);
  const outputHeight = min(stageFrame.h * 0.2, 132);
  const gap = max(stageFrame.w * 0.03, 30);
  const promptRadius = 30;

  const outputX = stageFrame.x + stageFrame.w - marginX - outputWidth;
  const laneTop = stageFrame.y + max(stageFrame.h * 0.18, outputHeight * 0.75);
  const laneBottom = stageFrame.y + min(stageFrame.h * 0.82, stageFrame.h - outputHeight * 0.75);
  const promptInset = promptRadius * 0.8;
  const promptTop = max(stageFrame.y, laneTop - promptInset);
  const promptBottom = min(stageFrame.y + stageFrame.h, laneBottom + promptInset);
  const prompt = {
    x: stageFrame.x + marginX,
    y: promptTop,
    w: promptWidth,
    h: promptBottom - promptTop,
    r: promptRadius,
  };
  const laneYs = [0, 0.5, 1].map((fraction) => lerp(laneTop, laneBottom, fraction));
  const outputs = laneYs.map((laneY) => ({
    x: outputX,
    y: laneY - outputHeight * 0.5,
    w: outputWidth,
    h: outputHeight,
    r: 24,
  }));

  return {
    promptBox: prompt,
    outputBoxes: outputs,
    laneYs,
    centralLeft: prompt.x + prompt.w + gap,
    centralRight: outputX - gap,
    centralHeight: laneBottom - laneTop,
    anchorGap: min(width * 0.016, 18),
  };
}

function buildHeadlineFrame() {
  const w = min(width * 0.82, 980);
  const h = min(height * 0.15, 124);
  return {
    x: (width - w) * 0.5,
    y: min(height * 0.04, 28),
    w,
    h,
    radius: 24,
  };
}

function buildStageFrame() {
  const sideMargin = width * 0.04;
  const topGap = min(height * 0.045, 34);
  const bottomMargin = min(height * 0.05, 28);
  const x = sideMargin;
  const y = headlineFrame.y + headlineFrame.h + topGap;
  const w = width - sideMargin * 2;
  const h = max(height - y - bottomMargin, 0);

  return {
    x,
    y,
    w,
    h,
    radius: 30,
  };
}

function buildBeam(config, laneY, outputBox, layout) {
  const startAnchor = {
    x: promptBox.x + promptBox.w + layout.anchorGap * 0.18,
    y: laneY,
  };
  const endAnchor = {
    x: outputBox.x - layout.anchorGap * 0.75,
    y: laneY,
  };
  const midStartX = layout.centralLeft + (layout.centralRight - layout.centralLeft) * 0.06;
  const midEndX = layout.centralRight - (layout.centralRight - layout.centralLeft) * 0.04;
  const midPoints = config.offsets.map((offset, index) => ({
    x: lerp(midStartX, midEndX, config.offsets.length === 1 ? 1 : index / (config.offsets.length - 1)),
    y: laneY + layout.centralHeight * offset,
  }));
  const points = [startAnchor, ...midPoints, endAnchor];

  return {
    ...config,
    laneY,
    outputBox,
    startAnchor,
    endAnchor,
    points,
    finishTime: config.startDelay + (points.length - 1) * GREEDY_STEP,
  };
}

function totalDuration() {
  return conclusionStartTime() + max(HEADLINE_FADE, OUTPUT_FADE);
}

function beamAnimationStartTime() {
  return PROMPT_HOLD;
}

function beamRenderDuration() {
  return beams.length ? max(...beams.map((beam) => beam.finishTime)) : 0;
}

function conclusionStartTime() {
  return beamAnimationStartTime() + beamRenderDuration();
}

function currentPhaseElapsed() {
  return (millis() - phaseStartMs) / 1000;
}

function updateSlidePhase() {
  if (slidePhase === 0) {
    if (runtimeOptions.autoplay && currentPhaseElapsed() >= PROMPT_HOLD) {
      startFirstTransition();
    }
    return;
  }

  if (slidePhase === 1 && currentPhaseElapsed() >= beamRenderDuration()) {
    if (runtimeOptions.autoplay) {
      startSecondTransition();
    } else {
      settleFirstTransition();
    }
    return;
  }

  if (
    slidePhase === 3 &&
    currentPhaseElapsed() >= max(HEADLINE_FADE, OUTPUT_FADE)
  ) {
    settleSecondTransition();
  }
}

function getVisualElapsed() {
  if (slidePhase === 0) {
    return 0;
  }

  if (slidePhase === 1) {
    return beamAnimationStartTime() + currentPhaseElapsed();
  }

  if (slidePhase === 2) {
    return conclusionStartTime();
  }

  if (slidePhase === 3) {
    return conclusionStartTime() + currentPhaseElapsed();
  }

  return totalDuration();
}

function startFirstTransition() {
  if (slidePhase > 0) {
    return;
  }

  slidePhase = 1;
  phaseStartMs = millis();
  loop();
}

function settleFirstTransition() {
  if (slidePhase > 1) {
    return;
  }

  slidePhase = 2;
  phaseStartMs = millis();
}

function startSecondTransition() {
  if (slidePhase > 2) {
    return;
  }

  slidePhase = 3;
  phaseStartMs = millis();
  loop();
}

function settleSecondTransition() {
  slidePhase = 4;
  phaseStartMs = millis();
}

function goToNextSlide() {
  if (!NEXT_SLIDE_PATH) {
    return;
  }

  window.location.assign(buildSlideUrl(NEXT_SLIDE_PATH));
}

function buildSlideUrl(pathname) {
  const nextUrl = new URL(pathname, window.location.href);
  const params = new URLSearchParams(window.location.search);

  params.delete("record");
  params.delete("filename");

  params.forEach((value, key) => {
    nextUrl.searchParams.set(key, value);
  });

  return nextUrl.toString();
}

function drawPromptBox() {
  push();
  fill(255, 249, 242);
  stroke(213, 219, 226);
  strokeWeight(1.4);
  rect(promptBox.x, promptBox.y, promptBox.w, promptBox.h, promptBox.r);

  noStroke();
  fill(70, 88, 110);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(min(width * 0.018, 20));
  text(PROMPT_TITLE, promptBox.x + promptBox.w * 0.08, promptBox.y + promptBox.h * 0.09);

  fill(53, 66, 80);
  textStyle(NORMAL);
  textSize(min(width * 0.02, 24));
  drawWrappedTextBlock(
    PROMPT_TEXT,
    promptBox.x + promptBox.w * 0.08,
    promptBox.y + promptBox.h * 0.2,
    promptBox.w * 0.8,
    min(width * 0.026, 29)
  );
  pop();
}

function drawBeam(beam, elapsed) {
  const beamElapsed = elapsed - beamAnimationStartTime();
  const tint = color(...beam.tint);
  const lineWeight = min(width, height) * 0.007;
  const nodeSize = min(width, height) * 0.016;
  const endpointSize = min(width, height) * 0.02;

  drawPromptAnchor(beam.startAnchor, tint, endpointSize);
  if (slidePhase >= 2) {
    drawOutputAnchor(beam.endAnchor, tint, endpointSize, true);
  }

  for (let index = 0; index < beam.points.length - 1; index += 1) {
    const progress = constrain((beamElapsed - beam.startDelay - index * GREEDY_STEP) / GREEDY_STEP, 0, 1);
    if (progress <= 0) {
      continue;
    }

    const startPoint = beam.points[index];
    const endPoint = beam.points[index + 1];
    const segmentColor = lerpColor(tint, color(176, 38, 48), index / (beam.points.length - 2));

    stroke(segmentColor);
    strokeWeight(lineWeight);
    line(
      startPoint.x,
      startPoint.y,
      lerp(startPoint.x, endPoint.x, progress),
      lerp(startPoint.y, endPoint.y, progress)
    );
  }

  noStroke();
  for (let index = 1; index < beam.points.length - 1; index += 1) {
    if (beamElapsed < beam.startDelay + index * GREEDY_STEP) {
      continue;
    }

    const point = beam.points[index];
    const nodeColor = lerpColor(tint, color(176, 38, 48), index / (beam.points.length - 2));
    fill(nodeColor);
    circle(point.x, point.y, nodeSize);
  }
}

function drawPromptAnchor(anchor, tint, size) {
  push();
  fill(255);
  stroke(tint);
  strokeWeight(size * 0.16);
  circle(anchor.x, anchor.y, size * 1.12);
  pop();
}

function drawOutputAnchor(anchor, tint, size, isActive) {
  push();
  fill(255);
  stroke(lerpColor(tint, color(45, 55, 65), 0.2));
  strokeWeight(size * 0.16);
  circle(anchor.x, anchor.y, size * 1.34);

  noStroke();
  fill(red(tint), green(tint), blue(tint), isActive ? 255 : 64);
  circle(anchor.x, anchor.y, size * (isActive ? 0.88 : 0.7));
  pop();
}

function drawOutputBox(beam, elapsed) {
  if (slidePhase < 2) {
    return;
  }

  const box = beam.outputBox;
  const tint = color(...beam.tint);

  push();
  fill(255);
  stroke(red(tint), green(tint), blue(tint), 92);
  strokeWeight(1.5);
  rect(box.x, box.y, box.w, box.h, box.r);

  noStroke();
  fill(red(tint), green(tint), blue(tint), 235);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(min(width * 0.015, 18));
  text(beam.label, box.x + box.w * 0.08, box.y + box.h * 0.12);

  textStyle(BOLD);
  textSize(min(width * 0.022, 28));
  fill(55, 68, 82);
  drawWrappedTextBlock(
    beam.outputText,
    box.x + box.w * 0.08,
    box.y + box.h * 0.48,
    box.w * 0.8,
    min(width * 0.026, 30)
  );
  pop();
}

function drawHeadline(elapsed) {
  const firstTransition = constrain(
    (elapsed - PROMPT_HOLD) / HEADLINE_FADE,
    0,
    1
  );
  const secondTransition = constrain(
    (elapsed - conclusionStartTime()) / HEADLINE_FADE,
    0,
    1
  );
  const textCenterX = headlineFrame.x + headlineFrame.w * 0.5;
  const textCenterY = headlineFrame.y + headlineFrame.h * 0.5;
  const maxTextWidth = headlineFrame.w * 0.88;
  const lineHeight = min(width * 0.036, 34);
  const accentWidth = min(headlineFrame.w * 0.34, 280);
  const accentY = headlineFrame.y + headlineFrame.h * 0.88;
  const firstColor = color(43, 55, 71);
  const secondColor = color(28, 110, 136);
  const thirdColor = color(179, 57, 69);

  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(min(width * 0.028, 26));
  textLeading(min(width * 0.036, 34));

  if (elapsed < PROMPT_HOLD) {
    drawHeadlineMessage(
      HEADLINE_MESSAGES[0],
      firstColor,
      255,
      textCenterX,
      textCenterY,
      maxTextWidth,
      lineHeight,
      0
    );
  } else if (elapsed < conclusionStartTime()) {
    if (firstTransition < 1) {
      drawHeadlineMessage(
        HEADLINE_MESSAGES[0],
        firstColor,
        255 * (1 - firstTransition),
        textCenterX,
        textCenterY - 16 * firstTransition,
        maxTextWidth,
        lineHeight,
        0
      );
    }

    drawHeadlineMessage(
      HEADLINE_MESSAGES[1],
      secondColor,
      255 * firstTransition,
      textCenterX,
      textCenterY + 16 * (1 - firstTransition),
      maxTextWidth,
      lineHeight,
      180 * firstTransition,
      accentWidth * firstTransition,
      accentY
    );
  } else {
    if (secondTransition < 1) {
      drawHeadlineMessage(
        HEADLINE_MESSAGES[1],
        secondColor,
        255 * (1 - secondTransition),
        textCenterX,
        textCenterY - 16 * secondTransition,
        maxTextWidth,
        lineHeight,
        180 * (1 - secondTransition),
        accentWidth * (1 - secondTransition),
        accentY
      );
    }

    drawHeadlineMessage(
      HEADLINE_MESSAGES[2],
      thirdColor,
      255 * secondTransition,
      textCenterX,
      textCenterY + 16 * (1 - secondTransition),
      maxTextWidth,
      lineHeight,
      185 * secondTransition,
      accentWidth * secondTransition,
      accentY
    );
  }

  pop();
}

function drawHeadlineMessage(
  message,
  messageColor,
  alphaValue,
  centerX,
  centerY,
  maxWidth,
  lineHeight,
  accentAlpha = 0,
  accentWidth = 0,
  accentY = 0
) {
  fill(red(messageColor), green(messageColor), blue(messageColor), alphaValue);
  drawWrappedHeadline(message, centerX, centerY, maxWidth, lineHeight);

  if (accentAlpha <= 0 || accentWidth <= 0) {
    return;
  }

  noStroke();
  fill(red(messageColor), green(messageColor), blue(messageColor), accentAlpha);
  rect(
    centerX - accentWidth / 2,
    accentY,
    accentWidth,
    4,
    999
  );
}

function drawWrappedHeadline(message, centerX, centerY, maxWidth, lineHeight) {
  const words = message.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (currentLine && textWidth(nextLine) > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    text(line, centerX, firstLineY + index * lineHeight);
  });
}

function drawWrappedTextBlock(textValue, x, y, maxWidth, lineHeight) {
  const lines = wrapTextLines(textValue, maxWidth);
  let cursorY = y;

  lines.forEach((line) => {
    if (line === "") {
      cursorY += lineHeight * 0.6;
      return;
    }

    text(line, x, cursorY);
    cursorY += lineHeight;
  });
}

function wrapTextLines(textValue, maxWidth) {
  const paragraphs = textValue.split("\n");
  const lines = [];

  paragraphs.forEach((paragraph, index) => {
    if (!paragraph.trim()) {
      lines.push("");
      return;
    }

    const words = paragraph.split(" ");
    let currentLine = "";

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (currentLine && textWidth(nextLine) > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
        return;
      }

      currentLine = nextLine;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    if (index < paragraphs.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

function easeOutCubic(value) {
  return 1 - pow(1 - value, 3);
}

function getRuntimeOptions() {
  const params = new URLSearchParams(window.location.search);
  return {
    autoplay: params.get("autoplay") === "1",
    record: params.get("record") === "1",
    filename: params.get("filename") || "sketch-slide-2.webm",
  };
}

function startRecording() {
  if (mediaRecorder || typeof MediaRecorder === "undefined") {
    return;
  }

  const canvas = document.querySelector("canvas");
  if (!canvas) {
    return;
  }

  const stream = canvas.captureStream(60);
  const mimeType = selectRecordingMimeType();
  const options = mimeType ? { mimeType } : undefined;

  mediaRecorder = new MediaRecorder(stream, options);
  recordingChunks = [];
  recordingStopped = false;

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data && event.data.size > 0) {
      recordingChunks.push(event.data);
    }
  });

  mediaRecorder.addEventListener("stop", saveRecording);
  mediaRecorder.start(250);
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    return;
  }

  mediaRecorder.stop();
}

function saveRecording() {
  if (!recordingChunks.length) {
    return;
  }

  const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || "video/webm" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = runtimeOptions.filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}

function selectRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }

  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}
