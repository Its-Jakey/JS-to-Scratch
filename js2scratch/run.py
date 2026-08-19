"""Local browser runner: python -m js2scratch.run <file-or-folder>."""

from __future__ import annotations

import argparse
import json
import mimetypes
import sys
import threading
import webbrowser
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from js2scratch.errors import CompileError
from js2scratch.project_loader import SPRITE_KEYS
from js2scratch.rewrite import rewrite_let_const_to_var

RUNTIME_DIR = Path(__file__).resolve().parent / "runtime"

COOP = "same-origin"
COEP = "require-corp"
CORP = "same-origin"

_MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".txt": "text/plain; charset=utf-8",
    ".bin": "application/octet-stream",
    ".wasm": "application/wasm",
}


def discover_project(path: Path) -> dict[str, Any]:
    """Build a runner manifest from a .js file or a project folder."""
    path = path.resolve()
    if path.is_file():
        if path.suffix.lower() != ".js":
            raise CompileError(f"not a JavaScript file: {path}")
        return {
            "name": path.stem,
            "root": path.parent,
            "sprites": [_sprite_entry(path.stem, path.name, {}, path.name.lower() == "stage.js")],
        }
    if not path.is_dir():
        raise CompileError(f"not a file or directory: {path}")

    config: dict[str, Any] = {}
    config_path = path / "project.json"
    if config_path.is_file():
        try:
            loaded = json.loads(config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CompileError(f"invalid project.json: {exc}", filename=str(config_path)) from exc
        if not isinstance(loaded, dict):
            raise CompileError("project.json must be an object", filename=str(config_path))
        config = loaded

    sprite_configs = config.get("sprites", {})
    if sprite_configs and not isinstance(sprite_configs, dict):
        raise CompileError("project.json 'sprites' must be an object", filename=str(config_path))

    js_files = sorted(p for p in path.glob("*.js") if p.name != "stage.js" and not p.name.startswith("."))
    stage_js = path / "stage.js"
    if not js_files and not stage_js.is_file():
        raise CompileError(f"no .js files found in {path}", filename=str(path))

    sprites: list[dict[str, Any]] = []
    if stage_js.is_file():
        sprites.append(_sprite_entry("Stage", "stage.js", config.get("stage") or {}, True))
    for js_file in js_files:
        cfg = sprite_configs.get(js_file.stem) or {}
        if not isinstance(cfg, dict):
            raise CompileError(
                f"sprite config for {js_file.stem!r} must be an object",
                filename=str(config_path),
            )
        sprites.append(_sprite_entry(js_file.stem, js_file.name, cfg, False))

    return {
        "name": str(config.get("name", path.name)),
        "root": path,
        "sprites": sprites,
    }


def _sprite_entry(name: str, filename: str, cfg: dict[str, Any], is_stage: bool) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "name": name,
        "file": filename,
        "script": f"/sprite/{filename}",
        "isStage": is_stage,
        "x": 0,
        "y": 0,
        "direction": 90,
        "visible": not is_stage,
        "size": 100,
    }
    for key in SPRITE_KEYS:
        if key in cfg:
            entry[key] = cfg[key]
    return entry


def _isolation_headers() -> list[tuple[str, str]]:
    return [
        ("Cross-Origin-Opener-Policy", COOP),
        ("Cross-Origin-Embedder-Policy", COEP),
        ("Cross-Origin-Resource-Policy", CORP),
        ("Cache-Control", "no-store"),
    ]


class RunnerHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, request, client_address, server, *, project: dict[str, Any]) -> None:
        self.project = project
        super().__init__(request, client_address, server)

    def log_message(self, format: str, *args: object) -> None:
        if args and len(args) >= 1 and str(args[0]).startswith("GET /"):
            code = args[1] if len(args) > 1 else ""
            if str(code).startswith("4") or str(code).startswith("5"):
                super().log_message(format, *args)

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for name, value in _isolation_headers():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _send_path(self, path: Path, content_type: str | None = None) -> None:
        if not path.is_file():
            self._send(404, b"not found\n", "text/plain; charset=utf-8")
            return
        data = path.read_bytes()
        if content_type is None:
            content_type = _MIME.get(path.suffix.lower())
            if content_type is None:
                guessed, _ = mimetypes.guess_type(str(path))
                content_type = guessed or "application/octet-stream"
        self._send(200, data, content_type)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        route = unquote(parsed.path)

        if route in ("/", "/index.html"):
            self._send_path(RUNTIME_DIR / "index.html", "text/html; charset=utf-8")
            return
        if route.startswith("/runtime/"):
            rel = route[len("/runtime/") :]
            path = (RUNTIME_DIR / rel).resolve()
            if not _is_inside(RUNTIME_DIR, path):
                self._send(403, b"forbidden\n", "text/plain; charset=utf-8")
                return
            self._send_path(path)
            return
        if route == "/manifest.json":
            public = {
                "name": self.project["name"],
                "sprites": [
                    {k: v for k, v in sprite.items() if k != "file"}
                    for sprite in self.project["sprites"]
                ],
            }
            body = json.dumps(public).encode("utf-8")
            self._send(200, body, "application/json; charset=utf-8")
            return
        if route.startswith("/sprite/"):
            filename = route[len("/sprite/") :]
            sprite = next((s for s in self.project["sprites"] if s["file"] == filename), None)
            if sprite is None:
                self._send(404, b"not found\n", "text/plain; charset=utf-8")
                return
            path = self.project["root"] / filename
            try:
                source = path.read_text(encoding="utf-8")
            except OSError:
                self._send(404, b"not found\n", "text/plain; charset=utf-8")
                return
            rewritten = rewrite_let_const_to_var(source, filename=str(path))
            self._send(200, rewritten.encode("utf-8"), "text/javascript; charset=utf-8")
            return
        if route.startswith("/project/"):
            rel = route[len("/project/") :]
            root: Path = self.project["root"]
            path = (root / rel).resolve()
            if not _is_inside(root, path):
                self._send(403, b"forbidden\n", "text/plain; charset=utf-8")
                return
            self._send_path(path)
            return

        self._send(404, b"not found\n", "text/plain; charset=utf-8")


def _is_inside(root: Path, path: Path) -> bool:
    try:
        path.relative_to(root.resolve())
        return True
    except ValueError:
        return False


def make_server(project: dict[str, Any], host: str = "127.0.0.1", port: int = 0) -> ThreadingHTTPServer:
    handler = partial(RunnerHandler, project=project)
    return ThreadingHTTPServer((host, port), handler)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="js2scratch.run",
        description="Run a js2scratch JavaScript project in the browser (before compiling to Scratch).",
    )
    parser.add_argument("source", type=Path, help="A .js file or a folder of sprite .js files")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=0, help="Port (default: pick a free port)")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser")
    args = parser.parse_args(argv)

    try:
        project = discover_project(args.source)
    except CompileError as exc:
        print(exc, file=sys.stderr)
        return 1

    server = make_server(project, host=args.host, port=args.port)
    host, port = server.server_address[:2]
    url = f"http://{host}:{port}/"
    names = ", ".join(s["name"] for s in project["sprites"])
    print(f"js2scratch runner: {project['name']}")
    print(f"  sprites: {names}")
    print(f"  {url}")
    print("Press Ctrl+C to stop.")

    if not args.no_browser:
        threading.Timer(0.3, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
