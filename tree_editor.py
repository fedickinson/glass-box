from __future__ import annotations

import argparse
import json
import threading
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from reasoning_tree import read_simple_tree, write_simple_tree


DEFAULT_TREE_PATH = Path(__file__).with_name("demo_branch_tree_10.json")
UI_DIR = Path(__file__).with_name("tree_editor_ui")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Launch a local browser UI for editing a simplified reasoning tree JSON file.",
    )
    parser.add_argument(
        "tree_path",
        nargs="?",
        type=Path,
        default=DEFAULT_TREE_PATH,
        help="Path to the simplified tree JSON file to edit.",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind.")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind.")
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not automatically open the editor in a browser.",
    )
    return parser.parse_args()


def _make_handler(tree_path: Path):
    class TreeEditorHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(UI_DIR), **kwargs)

        def end_headers(self) -> None:
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_GET(self) -> None:
            parsed = urlparse(self.path)

            if parsed.path == "/api/tree":
                self._send_tree_payload()
                return

            if parsed.path == "/":
                self.path = "/index.html"

            super().do_GET()

        def do_POST(self) -> None:
            parsed = urlparse(self.path)

            if parsed.path != "/api/tree":
                self.send_error(HTTPStatus.NOT_FOUND, "Unknown API route.")
                return

            try:
                content_length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid Content-Length header."})
                return

            try:
                payload = json.loads(self.rfile.read(content_length))
            except json.JSONDecodeError as exc:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": f"Request body is not valid JSON: {exc.msg}."})
                return

            items = payload.get("items")
            if not isinstance(items, list):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Request body must include an `items` array."})
                return

            try:
                write_simple_tree(tree_path, items)
            except ValueError as exc:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return

            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "path": str(tree_path),
                    "items": read_simple_tree(tree_path),
                },
            )

        def log_message(self, format: str, *args) -> None:  # noqa: A003
            del format, args

        def _send_tree_payload(self) -> None:
            try:
                items = read_simple_tree(tree_path)
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc), "path": str(tree_path)})
                return

            self._send_json(
                HTTPStatus.OK,
                {
                    "path": str(tree_path),
                    "display_name": tree_path.name,
                    "items": items,
                },
            )

        def _send_json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

    return TreeEditorHandler


def main() -> None:
    args = parse_args()
    tree_path = args.tree_path.expanduser().resolve()

    if not tree_path.exists():
        raise FileNotFoundError(f"Tree file not found: {tree_path}")
    if not UI_DIR.exists():
        raise FileNotFoundError(f"Editor UI directory not found: {UI_DIR}")

    handler = _make_handler(tree_path)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    url = f"http://{args.host}:{args.port}"

    print(f"editing {tree_path}")
    print(f"open {url}")

    if not args.no_open:
        threading.Timer(0.25, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nshutting down")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
