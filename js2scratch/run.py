"""Local browser runner: python -m js2scratch.run <file-or-folder>."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from js2scratch.errors import CompileError
from js2scratch.png import write_png_rgba
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


def default_debug_dir(source: Path) -> Path:
    root = source if source.is_dir() else source.parent
    return root / ".js2s-debug"


def find_node() -> str | None:
    found = shutil.which("node")
    if found:
        return found
    for base in (os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)"), r"C:\Program Files"):
        if not base:
            continue
        candidate = Path(base) / "nodejs" / "node.exe"
        if candidate.is_file():
            return str(candidate)
    return None


def run_headless(
    project: dict[str, Any],
    out_dir: Path,
    *,
    frames: int = 3,
    timeout: float = 60.0,
    keys: list[str] | None = None,
) -> int:
    """Run sprite scripts in Node, dump log/summary/PNG for agent debugging."""
    node = find_node()
    if not node:
        print("headless runner requires Node.js on PATH", file=sys.stderr)
        return 2

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    root: Path = project["root"]
    status = 0
    started = time.time()

    for sprite in project["sprites"]:
        source_path = root / sprite["file"]
        rewritten = rewrite_let_const_to_var(
            source_path.read_text(encoding="utf-8"),
            filename=str(source_path),
        )
        script_copy = out_dir / f"{sprite['name']}.rewritten.js"
        script_copy.write_text(rewritten, encoding="utf-8")
        sprite_out = out_dir if len(project["sprites"]) == 1 else out_dir / sprite["name"]
        sprite_out.mkdir(parents=True, exist_ok=True)
        cmd = [
            node,
            str(RUNTIME_DIR / "headless.js"),
            "--root",
            str(root),
            "--script",
            str(script_copy),
            "--out",
            str(sprite_out),
            "--runtime",
            str(RUNTIME_DIR),
            "--frames",
            str(frames),
            "--timeout-ms",
            str(int(timeout * 1000)),
        ]
        if keys:
            cmd.extend(["--keys", ",".join(keys)])
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.stdout:
            (sprite_out / "stdout.txt").write_text(proc.stdout, encoding="utf-8")
        if proc.stderr:
            (sprite_out / "stderr.txt").write_text(proc.stderr, encoding="utf-8")
        rgba_path = sprite_out / "last-frame.rgba"
        meta_path = sprite_out / "last-frame.json"
        if rgba_path.is_file() and meta_path.is_file():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            write_png_rgba(
                sprite_out / "last-frame.png",
                int(meta["width"]),
                int(meta["height"]),
                rgba_path.read_bytes(),
            )
        if proc.returncode != 0:
            status = proc.returncode
            err = (sprite_out / "error.txt").read_text(encoding="utf-8") if (sprite_out / "error.txt").is_file() else proc.stderr
            print(err or f"headless {sprite['name']} exited {proc.returncode}", file=sys.stderr)

    elapsed = time.time() - started
    print(f"js2scratch headless: {project['name']}")
    print(f"  frames={frames}  elapsed={elapsed:.2f}s  out={out_dir}")
    summary = out_dir / "summary.json"
    if not summary.is_file() and len(project["sprites"]) == 1:
        pass
    print(f"  read {out_dir / 'summary.json'}, {out_dir / 'run.log'}, {out_dir / 'last-frame.png'}")
    return 0 if status == 0 else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="js2scratch.run",
        description="Run a js2scratch JavaScript project in the browser (before compiling to Scratch).",
    )
    parser.add_argument("source", type=Path, help="A .js file or a folder of sprite .js files")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=0, help="Port (default: pick a free port)")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser")
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run in Node (no browser): dump summary.json, run.log, last-frame.png, then exit",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=3,
        help="Headless: stop after this many wait() yields (default: 3)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=60.0,
        help="Headless: kill after this many seconds (default: 60)",
    )
    parser.add_argument(
        "--debug-dir",
        type=Path,
        help="Artifact directory (default: <project>/.js2s-debug)",
    )
    parser.add_argument(
        "--keys",
        default="",
        help="Headless: comma-separated Scratch key names held down (e.g. w,left arrow)",
    )
    args = parser.parse_args(argv)

    try:
        project = discover_project(args.source)
    except CompileError as exc:
        print(exc, file=sys.stderr)
        return 1

    if args.headless:
        out = args.debug_dir or default_debug_dir(Path(args.source))
        keys = [k.strip() for k in args.keys.split(",") if k.strip()]
        return run_headless(project, out, frames=args.frames, timeout=args.timeout, keys=keys)

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
