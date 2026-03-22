const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const { once } = require("events");
const { chromium } = require("playwright");

const ROOT = __dirname;
const DEFAULT_PORT = Number(process.env.P5_PORT || "3013");
const OUTPUT_DIR = path.join(ROOT, "output");
const DEFAULT_SKETCH_FILE = "sketch.js";
const { sketchFile, outputFile } = parseCliArgs(process.argv.slice(2));
const OUTPUT_PATH = path.join(OUTPUT_DIR, outputFile);
const FILE_NAME = path.basename(OUTPUT_PATH);

function parseCliArgs(args) {
  if (args.length === 0) {
    return {
      sketchFile: DEFAULT_SKETCH_FILE,
      outputFile: "sketch-run.webm",
    };
  }

  if (args[0].endsWith(".js")) {
    return {
      sketchFile: args[0],
      outputFile: args[1] || `${path.basename(args[0], ".js")}.webm`,
    };
  }

  return {
    sketchFile: DEFAULT_SKETCH_FILE,
    outputFile: args[0],
  };
}

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = await new Promise((resolve) => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 500);
      });

      request.on("error", () => {
        resolve(false);
      });
    });

    if (ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to find an open port starting from ${startPort}`);
}

async function stopServer(server) {
  if (!server || server.exitCode !== null || server.signalCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    server.kill("SIGTERM");
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }

  const closed = await Promise.race([
    once(server, "close").then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 3000)),
  ]);

  if (closed) {
    return;
  }

  if (process.platform === "win32") {
    server.kill("SIGKILL");
  } else {
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch {
      server.kill("SIGKILL");
    }
  }

  await once(server, "close");
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sketchPath = path.resolve(ROOT, sketchFile);
  if (!fs.existsSync(sketchPath)) {
    throw new Error(`Sketch file not found: ${sketchPath}`);
  }

  const port = await findAvailablePort(DEFAULT_PORT);
  const pageUrl = `http://127.0.0.1:${port}?autoplay=1&record=1&filename=${encodeURIComponent(FILE_NAME)}`;

  const server = spawn("npx", ["p5", "serve", sketchFile, "--port", String(port)], {
    cwd: ROOT,
    stdio: "pipe",
    detached: process.platform !== "win32",
  });

  server.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}`);

    const browser = await chromium.launch({
      headless: true,
    });
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    const download = await downloadPromise;
    await download.saveAs(OUTPUT_PATH);

    await context.close();
    await browser.close();
    console.log(`saved video to ${OUTPUT_PATH}`);
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
