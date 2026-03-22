let greedyNodes = [];
let beamNodes = [];
let beamEdges = [];
let headlineFrame = null;
let stageFrame = null;
let greedyStartMs = 0;
let beamStartMs = 0;
let beamRevealed = false;
let mediaRecorder = null;
let recordingChunks = [];
let recordingStopped = false;

const runtimeOptions = getRuntimeOptions();

const GREEDY_STEP = 0.35;
const BEAM_STEP = 0.18;
const COMPRESSION_INDEX = 6;
const ERROR_INDEX = 8;
const HEADLINE_FADE = 0.8;
const AUTOPLAY_REVEAL_DELAY = 0.25;
const EXPORT_HOLD = 0.85;
const INTRO_MESSAGE =
  "Thinking longer isn\u2019t thinking better, little errors snowball";
const REVEAL_MESSAGE = "Accuracy comes from exploring many paths";
const PAGE_BACKGROUND = 250;
const NEXT_SLIDE_PATH = "/sketch-slide-2.js";

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  greedyStartMs = millis();
  buildScene();

  if (runtimeOptions.record) {
    startRecording();
  }
}

function draw() {
  background(PAGE_BACKGROUND);
  drawStageFrame();

  const greedyElapsed = (millis() - greedyStartMs) / 1000;

  if (
    runtimeOptions.autoplay &&
    !beamRevealed &&
    greedyElapsed >= greedyDuration() + AUTOPLAY_REVEAL_DELAY
  ) {
    revealBeamSearch();
  }

  const greedyT = beamRevealed
    ? greedyDuration()
    : min(greedyElapsed, greedyDuration());

  clipToStage(() => {
    drawGreedy(greedyT);

    if (beamRevealed) {
      drawBeams((millis() - beamStartMs) / 1000);
    }
  });

  drawHeadline();

  if (
    runtimeOptions.record &&
    beamRevealed &&
    !recordingStopped &&
    (millis() - beamStartMs) / 1000 >= beamDuration() + EXPORT_HOLD
  ) {
    stopRecording();
    noLoop();
  }
}

function windowResized() {
  const greedyElapsed = millis() - greedyStartMs;
  const beamElapsed = beamRevealed ? millis() - beamStartMs : 0;
  resizeCanvas(windowWidth, windowHeight);
  buildScene();
  greedyStartMs = millis() - greedyElapsed;

  if (beamRevealed) {
    beamStartMs = millis() - beamElapsed;
  }
}

function buildScene() {
  greedyNodes = [];
  beamNodes = [];
  beamEdges = [];

  headlineFrame = buildHeadlineFrame();
  stageFrame = buildStageFrame();

  const left = stageFrame.x + stageFrame.w * 0.08;
  const right = stageFrame.x + stageFrame.w * 0.92;
  const y = stageFrame.y + stageFrame.h * 0.57;
  const count = 10;
  const promptColor = color(70, 88, 110);
  const greedyColor = color(232, 122, 76);
  const beamColor = color(232, 122, 76);
  const compressionColor = color(214, 72, 68);
  const errorColor = color(196, 34, 48);
  const rewardToColor = (reward) =>
    reward ? color(72, 176, 92) : color(210, 70, 70);

  for (let i = 0; i < count; i += 1) {
    greedyNodes.push({
      x: lerp(left, right, i / (count - 1)),
      y,
      label:
        i === 0
          ? "Prompt"
          : i === COMPRESSION_INDEX
            ? "context compression"
            : i === ERROR_INDEX
              ? "error"
              : i === count - 1
                ? "Output"
                : "",
      endpoint: i === 0 || i === count - 1,
      fillColor:
        i === 0
          ? promptColor
          : i === count - 1
            ? errorColor
            : i >= ERROR_INDEX
              ? errorColor
              : i >= COMPRESSION_INDEX
                ? compressionColor
                : greedyColor,
    });
  }

  const sourceIndexes = [2, 3, 5];
  const rootOffsets = [
    { x: 0.055, y: -0.3 },
    { x: 0.055, y: 0.12 },
    { x: 0.055, y: 0.24 },
  ];
  const leafOffsets = [
    [
      { x: 0.08, y: -0.08 },
      { x: 0.1, y: 0.05 },
    ],
    [
      { x: 0.08, y: -0.07 },
      { x: 0.1, y: 0.07 },
    ],
    [
      { x: 0.08, y: -0.08 },
      { x: 0.1, y: 0 },
      { x: 0.08, y: 0.08 },
    ],
  ];
  const grandchildOffsets = [
    { x: 0.08, y: -0.04 },
    { x: 0.08, y: 0.04 },
  ];

  const addEdge = (a, b) => {
    beamEdges.push({ a, b });
    return beamEdges.length;
  };

  sourceIndexes.forEach((sourceIndex, i) => {
    const source = greedyNodes[sourceIndex];
    const rootOffset = rootOffsets[i];
    const root = {
      x: source.x + stageFrame.w * rootOffset.x,
      y: y + stageFrame.h * rootOffset.y,
      step: 0,
      depth: 1,
      output: false,
      fillColor: beamColor,
    };

    root.step = addEdge(source, root);
    beamNodes.push(root);

    leafOffsets[i].forEach((offset, j) => {
      const reward = i !== 0 || j !== 0 ? random() > 0.5 : null;
      const leaf = {
        x: root.x + stageFrame.w * offset.x,
        y: root.y + stageFrame.h * offset.y,
        step: 0,
        depth: 2,
        output: i !== 0 || j !== 0,
        reward,
        fillColor: reward === null ? beamColor : rewardToColor(reward),
      };

      leaf.step = addEdge(root, leaf);
      beamNodes.push(leaf);

      if (i !== 0 || j !== 0) {
        return;
      }

      const grandchildOffset = grandchildOffsets[0];
      const grandchildReward = random() > 0.5;
      const grandchild = {
        x: leaf.x + stageFrame.w * grandchildOffset.x,
        y: leaf.y + stageFrame.h * grandchildOffset.y,
        step: 0,
        depth: 3,
        output: true,
        reward: grandchildReward,
        fillColor: rewardToColor(grandchildReward),
      };

      grandchild.step = addEdge(leaf, grandchild);
      beamNodes.push(grandchild);
    });
  });
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

function greedyDuration() {
  return greedyNodes.length * GREEDY_STEP;
}

function beamDuration() {
  return beamEdges.length * BEAM_STEP;
}

function drawStageFrame() {
  return;
}

function clipToStage(drawFn) {
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(stageFrame.x, stageFrame.y, stageFrame.w, stageFrame.h);
  drawingContext.clip();
  drawFn();
  drawingContext.restore();
}

function mousePressed() {
  handleSlideAdvance();
}

function touchStarted() {
  handleSlideAdvance();
  return false;
}

function handleSlideAdvance() {
  if (!beamRevealed) {
    revealBeamSearch();
    return;
  }

  if (!isBeamAnimationComplete()) {
    completeBeamSearch();
    return;
  }

  goToNextSlide();
}

function revealBeamSearch() {
  if (beamRevealed) {
    return;
  }

  beamRevealed = true;
  beamStartMs = millis();
}

function isBeamAnimationComplete() {
  if (!beamRevealed) {
    return false;
  }

  return (millis() - beamStartMs) / 1000 >= beamDuration();
}

function completeBeamSearch() {
  if (!beamRevealed) {
    revealBeamSearch();
    return;
  }

  beamStartMs = millis() - beamDuration() * 1000;
}

function goToNextSlide() {
  if (!NEXT_SLIDE_PATH || runtimeOptions.record) {
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

function drawGreedy(t) {
  const lineWeight = min(stageFrame.w, stageFrame.h) * 0.011;
  const nodeSize = min(stageFrame.w, stageFrame.h) * 0.033;

  for (let i = 0; i < greedyNodes.length - 1; i += 1) {
    const p = constrain((t - i * GREEDY_STEP) / GREEDY_STEP, 0, 1);

    if (p <= 0) {
      continue;
    }

    const a = greedyNodes[i];
    const b = greedyNodes[i + 1];
    const edgeColor =
      i >= ERROR_INDEX
        ? color(196, 34, 48)
        : i >= COMPRESSION_INDEX
          ? color(214, 72, 68)
          : color(232, 122, 76);

    stroke(edgeColor);
    strokeWeight(lineWeight);
    line(a.x, a.y, lerp(a.x, b.x, p), lerp(a.y, b.y, p));
  }

  greedyNodes.forEach((node, i) => {
    if (t < i * GREEDY_STEP) {
      return;
    }

    if (node.endpoint) {
      drawEndpointNode(node, nodeSize);
      return;
    }

    noStroke();
    fill(node.fillColor);
    circle(node.x, node.y, nodeSize);

    if (node.label) {
      drawGreedyLabel(node, nodeSize);
    }
  });
}

function drawBeams(t) {
  const lineWeight = min(stageFrame.w, stageFrame.h) * 0.008;
  const nodeSize = min(stageFrame.w, stageFrame.h) * 0.027;

  stroke(232, 122, 76);
  strokeWeight(lineWeight);

  beamEdges.forEach((edge, i) => {
    const p = constrain((t - i * BEAM_STEP) / BEAM_STEP, 0, 1);

    if (p <= 0) {
      return;
    }

    line(
      edge.a.x,
      edge.a.y,
      lerp(edge.a.x, edge.b.x, p),
      lerp(edge.a.y, edge.b.y, p)
    );
  });

  noStroke();

  beamNodes.forEach((node) => {
    if (t < node.step * BEAM_STEP) {
      return;
    }

    if (node.output) {
      drawEndpointNode(node, nodeSize, false);
      return;
    }

    noStroke();
    fill(node.fillColor);
    circle(node.x, node.y, nodeSize);
  });
}

function drawEndpointNode(node, baseSize, showLabel = true) {
  const nodeColor = node.fillColor || color(106, 84, 52);
  const isPrompt = node.label === "Prompt";

  if (isPrompt) {
    stroke(nodeColor);
    strokeWeight(baseSize * 0.18);
    fill(255);
    circle(node.x, node.y, baseSize * 1.45);
  } else {
    const outlineColor = lerpColor(nodeColor, color(20, 20, 20), 0.35);

    noStroke();
    fill(255);
    circle(node.x, node.y, baseSize * 1.95);

    stroke(outlineColor);
    strokeWeight(baseSize * 0.2);
    fill(nodeColor);
    circle(node.x, node.y, baseSize * 1.55);
  }

  if (!showLabel || !node.label) {
    noStroke();
    return;
  }

  noStroke();
  fill(nodeColor);
  textAlign(CENTER, BOTTOM);
  textSize(baseSize * 0.75);
  text(node.label, node.x, node.y - baseSize * 0.95);
}

function drawGreedyLabel(node, baseSize) {
  noStroke();
  fill(node.fillColor);
  textAlign(CENTER, BOTTOM);
  textSize(baseSize * 0.55);
  text(node.label, node.x, node.y - baseSize * 0.95);
}

function drawHeadline() {
  const fade = beamRevealed
    ? constrain((millis() - beamStartMs) / 1000 / HEADLINE_FADE, 0, 1)
    : 0;
  const easedFade = easeOutCubic(fade);
  const textCenterX = headlineFrame.x + headlineFrame.w * 0.5;
  const textCenterY = headlineFrame.y + headlineFrame.h * 0.5;
  const maxTextWidth = headlineFrame.w * 0.88;
  const lineHeight = min(width * 0.036, 34);
  const accentWidth = min(headlineFrame.w * 0.34, 280);
  const accentY = headlineFrame.y + headlineFrame.h * 0.88;

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(min(width * 0.028, 26));
  textLeading(min(width * 0.036, 34));

  if (fade < 1) {
    fill(43, 55, 71, 255 * (1 - easedFade));
    drawWrappedHeadline(
      INTRO_MESSAGE,
      textCenterX,
      textCenterY - 16 * easedFade,
      maxTextWidth,
      lineHeight
    );
  }

  if (beamRevealed) {
    fill(28, 110, 136, 255 * easedFade);
    drawWrappedHeadline(
      REVEAL_MESSAGE,
      textCenterX,
      textCenterY + 16 * (1 - easedFade),
      maxTextWidth,
      lineHeight
    );

    noStroke();
    fill(28, 110, 136, 180 * easedFade);
    rect(
      textCenterX - (accentWidth * easedFade) / 2,
      accentY,
      accentWidth * easedFade,
      4,
      999
    );
  }

  textStyle(NORMAL);
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

function easeOutCubic(value) {
  return 1 - pow(1 - value, 3);
}

function getRuntimeOptions() {
  const params = new URLSearchParams(window.location.search);
  return {
    autoplay: params.get("autoplay") === "1",
    record: params.get("record") === "1",
    filename: params.get("filename") || "sketch-run.webm",
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

  recordingStopped = true;
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
