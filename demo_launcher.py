#!/usr/bin/env python3
from __future__ import annotations

import argparse
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SLIDES_DIR = ROOT / "slides"
CLINICAL_UI_DIR = ROOT / "clinical-tree-ui"
SLIDES_HOST = "localhost"
UI_HOST = "127.0.0.1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start the p5 slide deck and clinical-tree-ui demo together.",
    )
    parser.add_argument(
        "--slides-port",
        type=int,
        default=3000,
        help="Port for the slides server.",
    )
    parser.add_argument(
        "--ui-port",
        type=int,
        default=5173,
        help="Port for the clinical-tree-ui Vite server.",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not automatically open the demo in a browser.",
    )
    return parser.parse_args()


def ensure_dependencies_installed() -> None:
    missing_dirs = []

    for app_dir in (SLIDES_DIR, CLINICAL_UI_DIR):
        if not (app_dir / "node_modules").is_dir():
            missing_dirs.append(app_dir)

    if not missing_dirs:
        return

    message_lines = ["Missing npm dependencies:"]
    for app_dir in missing_dirs:
        relative_dir = app_dir.relative_to(ROOT)
        message_lines.append(f"  - {relative_dir}/node_modules")

    message_lines.append("")
    message_lines.append("Install them once with:")
    for app_dir in missing_dirs:
        relative_dir = app_dir.relative_to(ROOT)
        message_lines.append(f"  cd {relative_dir} && npm ci")

    raise SystemExit("\n".join(message_lines))


def ensure_port_available(host: str, port: int, label: str) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError as exc:
            raise SystemExit(
                f"{label} port {port} on {host} is unavailable: {exc.strerror or exc}"
            ) from exc


def start_process(
    name: str,
    command: list[str],
    cwd: Path,
) -> tuple[subprocess.Popen[str], threading.Thread]:
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except FileNotFoundError as exc:
        raise SystemExit(
            f"Failed to start {name}: `{command[0]}` is not installed or not on PATH."
        ) from exc

    thread = threading.Thread(
        target=stream_output,
        args=(name, process),
        daemon=True,
    )
    thread.start()
    return process, thread


def stream_output(name: str, process: subprocess.Popen[str]) -> None:
    if process.stdout is None:
        return

    for line in process.stdout:
        print(f"[{name}] {line}", end="")


def wait_for_http_ready(
    name: str,
    url: str,
    process: subprocess.Popen[str],
    timeout_seconds: float = 30.0,
) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None

    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(
                f"{name} exited with code {process.returncode} before becoming ready."
            )

        try:
            with urllib.request.urlopen(url, timeout=1.5) as response:
                if 200 <= response.status < 400:
                    return
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc

        time.sleep(0.25)

    error_detail = f" Last error: {last_error}" if last_error else ""
    raise TimeoutError(f"Timed out waiting for {name} at {url}.{error_detail}")


def stop_process(name: str, process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return

    print(f"Stopping {name}...")
    process.terminate()

    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def build_urls(slides_port: int, ui_port: int) -> tuple[str, str]:
    handoff_url = f"http://{UI_HOST}:{ui_port}/orthopedics/reasoning/fast"
    slides_query = urllib.parse.urlencode({"handoff": handoff_url})
    deck_url = f"http://{SLIDES_HOST}:{slides_port}/sketch.js?{slides_query}"
    return deck_url, handoff_url


def main() -> int:
    args = parse_args()
    ensure_dependencies_installed()
    ensure_port_available("127.0.0.1", args.slides_port, "Slides")
    ensure_port_available(UI_HOST, args.ui_port, "clinical-tree-ui")

    deck_url, handoff_url = build_urls(args.slides_port, args.ui_port)
    slides_process = None
    ui_process = None

    try:
        slides_process, _ = start_process(
            "slides",
            ["npm", "run", "serve", "--", "--port", str(args.slides_port)],
            SLIDES_DIR,
        )
        ui_process, _ = start_process(
            "clinical-tree-ui",
            [
                "npm",
                "run",
                "dev",
                "--",
                "--host",
                UI_HOST,
                "--port",
                str(args.ui_port),
                "--strictPort",
            ],
            CLINICAL_UI_DIR,
        )

        wait_for_http_ready(
            "slides",
            f"http://127.0.0.1:{args.slides_port}/sketch.js",
            slides_process,
        )
        wait_for_http_ready(
            "clinical-tree-ui",
            f"http://{UI_HOST}:{args.ui_port}/",
            ui_process,
        )

        print(f"Slides ready at {deck_url}")
        print(f"UI handoff target: {handoff_url}")

        if not args.no_open:
            webbrowser.open(deck_url)

        while True:
            if slides_process.poll() is not None:
                raise RuntimeError(
                    f"slides exited unexpectedly with code {slides_process.returncode}."
                )
            if ui_process.poll() is not None:
                raise RuntimeError(
                    "clinical-tree-ui exited unexpectedly "
                    f"with code {ui_process.returncode}."
                )
            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\nShutting down demo launcher...")
        return 0
    except (RuntimeError, TimeoutError, OSError) as exc:
        print(f"Demo launcher failed: {exc}", file=sys.stderr)
        return 1
    finally:
        if slides_process is not None:
            stop_process("slides", slides_process)
        if ui_process is not None:
            stop_process("clinical-tree-ui", ui_process)


if __name__ == "__main__":
    raise SystemExit(main())
