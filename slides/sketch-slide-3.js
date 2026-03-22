let titleCardImage = null;
let slideStartMs = 0;
let mediaRecorder = null;
let recordingChunks = [];
let recordingStopped = false;
let handoffTriggered = false;

const runtimeOptions = getRuntimeOptions();

const PAGE_BACKGROUND = 255;
const TITLECARD_PATH = "assets/titlecard.png";
const FADE_DURATION = 0.8;
const HOLD_AFTER = 1.2;
const CARD_MAX_WIDTH = 0.92;
const CARD_MAX_HEIGHT = 0.88;

function preload() {
  titleCardImage = loadImage(TITLECARD_PATH);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  slideStartMs = millis();

  if (runtimeOptions.record) {
    startRecording();
  }
}

function draw() {
  background(PAGE_BACKGROUND);

  const elapsed = (millis() - slideStartMs) / 1000;
  drawTitleCard(elapsed);
  updatePointer(elapsed);

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
  handoffTriggered = false;
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
  if (shouldNavigateToHandoff()) {
    goToHandoff();
    return;
  }

  completeReveal();
}

function completeReveal() {
  slideStartMs = millis() - FADE_DURATION * 1000;
  loop();
}

function shouldNavigateToHandoff() {
  return (
    !runtimeOptions.record &&
    Boolean(runtimeOptions.handoff) &&
    isRevealComplete()
  );
}

function isRevealComplete() {
  return (millis() - slideStartMs) / 1000 >= FADE_DURATION;
}

function goToHandoff() {
  if (!runtimeOptions.handoff || handoffTriggered) {
    return;
  }

  handoffTriggered = true;
  window.location.assign(runtimeOptions.handoff);
}

function drawTitleCard(elapsed) {
  const fade = easeOutCubic(constrain(elapsed / FADE_DURATION, 0, 1));

  if (!titleCardImage || !titleCardImage.width || !titleCardImage.height) {
    drawFallbackMessage(fade);
    return;
  }

  const maxWidth = width * CARD_MAX_WIDTH;
  const maxHeight = height * CARD_MAX_HEIGHT;
  const scaleFactor = min(
    maxWidth / titleCardImage.width,
    maxHeight / titleCardImage.height
  );
  const drawWidth = titleCardImage.width * scaleFactor;
  const drawHeight = titleCardImage.height * scaleFactor;
  const drawX = (width - drawWidth) * 0.5;
  const drawY = (height - drawHeight) * 0.5;

  push();
  tint(255, 255 * fade);
  image(titleCardImage, drawX, drawY, drawWidth, drawHeight);
  pop();
}

function drawFallbackMessage(fade) {
  noStroke();
  fill(60, 72, 86, 255 * fade);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(min(width * 0.03, 28));
  text("Title card unavailable", width * 0.5, height * 0.5);
  textStyle(NORMAL);
}

function updatePointer(elapsed) {
  if (!runtimeOptions.record && runtimeOptions.handoff && elapsed >= FADE_DURATION) {
    cursor(HAND);
    return;
  }

  cursor(ARROW);
}

function easeOutCubic(value) {
  return 1 - pow(1 - value, 3);
}

function getRuntimeOptions() {
  const params = new URLSearchParams(window.location.search);
  return {
    autoplay: params.get("autoplay") === "1",
    record: params.get("record") === "1",
    filename: params.get("filename") || "sketch-slide-3.webm",
    handoff: params.get("handoff") || "",
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
