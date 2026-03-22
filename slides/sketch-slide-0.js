let slideStartMs = 0;
let mediaRecorder = null;
let recordingChunks = [];
let recordingStopped = false;

const runtimeOptions = getRuntimeOptions();

const PAGE_BACKGROUND = 255;
const TITLE_LINES = [
  "Your agent doesn't reason",
  "for high stakes",
];
const NEXT_SLIDE_PATH = "/sketch.js";
const FADE_DURATION = 0.75;
const HOLD_AFTER = 1.0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  slideStartMs = millis();

  if (runtimeOptions.record) {
    startRecording();
  }
}

function draw() {
  const elapsed = (millis() - slideStartMs) / 1000;
  const fade = easeOutCubic(constrain(elapsed / FADE_DURATION, 0, 1));

  background(PAGE_BACKGROUND);
  drawTitleCard(fade);

  if (
    runtimeOptions.record &&
    !recordingStopped &&
    elapsed >= FADE_DURATION + HOLD_AFTER
  ) {
    stopRecording();
    recordingStopped = true;
    noLoop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  slideStartMs = millis();
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

  if (!isRevealComplete()) {
    completeReveal();
    return;
  }

  goToNextSlide();
}

function isRevealComplete() {
  return (millis() - slideStartMs) / 1000 >= FADE_DURATION;
}

function completeReveal() {
  slideStartMs = millis() - FADE_DURATION * 1000;
  loop();
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

function drawTitleCard(fade) {
  const card = getTitleCardFrame();
  const titleLayout = getTitleLayout(card);
  const titleCenterY = card.y + card.h * 0.53;

  push();
  rectMode(CORNER);
  noStroke();
  fill(255, 250, 244, 230 * fade);
  rect(card.x, card.y, card.w, card.h, 34);

  stroke(28, 42, 60, 28 * fade);
  strokeWeight(1.2);
  noFill();
  rect(card.x, card.y, card.w, card.h, 34);

  noStroke();
  fill(207, 120, 62, 210 * fade);
  rect(card.x + card.w * 0.08, card.y + card.h * 0.11, 84, 5, 999);

  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textFont("Georgia");
  textLeading(titleLayout.leading);
  textSize(titleLayout.titleSize);
  fill(24, 36, 52, 255 * fade);
  text(TITLE_LINES[0], width * 0.5, titleCenterY - titleLayout.leading * 0.43);

  fill(169, 74, 27, 255 * fade);
  text(TITLE_LINES[1], width * 0.5, titleCenterY + titleLayout.leading * 0.43);

  noStroke();
  fill(169, 74, 27, 44 * fade);
  const accentWidth = min(card.w * 0.34, titleLayout.titleSize * 4.1);
  rect(
    width * 0.5 - accentWidth * 0.5,
    titleCenterY + titleLayout.leading * 0.7,
    accentWidth,
    max(titleLayout.titleSize * 0.12, 6),
    999
  );
  pop();
}

function getTitleCardFrame() {
  const cardWidth = min(width * 0.86, 1080);
  const cardHeight = min(height * 0.56, 420);
  return {
    x: (width - cardWidth) * 0.5,
    y: (height - cardHeight) * 0.5,
    w: cardWidth,
    h: cardHeight,
  };
}

function getTitleLayout(card) {
  const maxLineWidth = card.w * 0.76;
  const maxTextHeight = card.h * 0.46;
  let titleSize = min(width * 0.068, height * 0.13, 78);
  let leading = titleSize * 1.05;

  push();
  textStyle(BOLD);
  textFont("Georgia");

  while (titleSize > 24) {
    textSize(titleSize);
    const widestLine = max(
      textWidth(TITLE_LINES[0]),
      textWidth(TITLE_LINES[1])
    );
    const totalHeight = leading * (TITLE_LINES.length - 1) + titleSize * 1.08;

    if (widestLine <= maxLineWidth && totalHeight <= maxTextHeight) {
      break;
    }

    titleSize -= 1;
    leading = titleSize * 1.05;
  }
  pop();

  return {
    titleSize,
    leading,
  };
}

function easeOutCubic(value) {
  return 1 - pow(1 - value, 3);
}

function getRuntimeOptions() {
  const params = new URLSearchParams(window.location.search);
  return {
    autoplay: params.get("autoplay") === "1",
    record: params.get("record") === "1",
    filename: params.get("filename") || "sketch-slide-0.webm",
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

  const blob = new Blob(recordingChunks, {
    type: mediaRecorder.mimeType || "video/webm",
  });
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
