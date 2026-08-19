from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.request import Request, urlopen

import pytest

from js2scratch.png import write_png_rgba
from js2scratch.rewrite import rewrite_let_const_to_var
from js2scratch.run import RUNTIME_DIR, discover_project, find_node, make_server, run_headless


ROOT = Path(__file__).resolve().parents[1]


def test_rewrite_let_const_to_var_skips_strings_and_comments():
    source = """
let fps = 0;
const n = 1;
console.log("let x");
console.log('const y');
// let ignored
/* const also */
for (let i = 0; i < 3; i++) {
  fps += n;
}
"""
    out = rewrite_let_const_to_var(source)
    assert "let fps" not in out
    assert "const n" not in out
    assert "for (var i = 0;" in out
    assert "var fps = 0;" in out
    assert "var n = 1;" in out
    assert '"let x"' in out
    assert "'const y'" in out
    assert "// let ignored" in out
    assert "/* const also */" in out


def test_rewrite_passthrough_on_lex_error():
    source = "let x = `nope`;"
    assert rewrite_let_const_to_var(source) == source


def test_discover_hello_world():
    project = discover_project(ROOT / "examples" / "js" / "hello_world")
    assert project["name"]
    names = [s["name"] for s in project["sprites"]]
    assert "Cat" in names
    assert project["sprites"][0]["script"] == "/sprite/Cat.js"


def test_discover_single_file():
    path = ROOT / "examples" / "js" / "hello_world" / "Cat.js"
    project = discover_project(path)
    assert project["root"] == path.parent
    assert project["sprites"][0]["file"] == "Cat.js"


def test_runtime_files_exist():
    for name in ("index.html", "host.js", "worker.js", "builtins.js", "keys.js", "headless.js"):
        assert (RUNTIME_DIR / name).is_file()


def test_key_table_scratch_names():
    text = (RUNTIME_DIR / "keys.js").read_text(encoding="utf-8")
    for name in ("space", "left arrow", "right arrow", "enter", "any"):
        assert f'"{name}"' in text
    assert "js2sScratchKeyFromEvent" in text


@pytest.fixture
def runner_url(tmp_path):
    (tmp_path / "Cat.js").write_text(
        'let fps = 0;\nconst msg = "let fps";\nconsole.log(msg);\n',
        encoding="utf-8",
    )
    (tmp_path / "data.txt").write_text("10\n", encoding="utf-8")
    project = discover_project(tmp_path)
    server = make_server(project, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[:2]
    yield f"http://{host}:{port}"
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)


def _get(url: str):
    req = Request(url, headers={"Accept": "*/*"})
    with urlopen(req, timeout=5) as resp:
        return resp.status, dict(resp.headers), resp.read()


def test_runner_isolation_headers(runner_url):
    status, headers, body = _get(runner_url + "/")
    assert status == 200
    lower = {k.lower(): v for k, v in headers.items()}
    assert lower["cross-origin-opener-policy"] == "same-origin"
    assert lower["cross-origin-embedder-policy"] == "require-corp"
    assert lower["cross-origin-resource-policy"] == "same-origin"
    assert b"js2scratch runner" in body


def test_runner_serves_rewritten_sprite(runner_url):
    status, headers, body = _get(runner_url + "/sprite/Cat.js")
    assert status == 200
    text = body.decode("utf-8")
    assert "var fps = 0;" in text
    assert "var msg" in text
    assert '"let fps"' in text
    assert "let fps = 0;" not in text
    lower = {k.lower(): v for k, v in headers.items()}
    assert lower["cross-origin-embedder-policy"] == "require-corp"


def test_runner_manifest_and_project_file(runner_url):
    status, _, body = _get(runner_url + "/manifest.json")
    assert status == 200
    assert b'"Cat"' in body
    assert b"/sprite/Cat.js" in body
    status, _, body = _get(runner_url + "/project/data.txt")
    assert status == 200
def test_write_png_rgba(tmp_path):
    rgba = bytes([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255])
    path = tmp_path / "tiny.png"
    write_png_rgba(path, 2, 2, rgba)
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"


@pytest.mark.skipif(find_node() is None, reason="node required for headless runner")
def test_headless_hello_world(tmp_path):
    project = discover_project(ROOT / "examples" / "js" / "hello_world")
    code = run_headless(project, tmp_path, frames=1, timeout=15)
    assert code == 0
    summary = json.loads((tmp_path / "summary.json").read_text(encoding="utf-8"))
    assert summary["ok"] is True
    assert summary["error"] is None
    log = (tmp_path / "run.log").read_text(encoding="utf-8")
    assert "Hello World" in log
    assert (tmp_path / "last-frame.png").is_file()


@pytest.mark.skipif(find_node() is None, reason="node required for headless runner")
def test_headless_reports_throw(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "Cat.js").write_text("console.log(1);\nmissing();\n", encoding="utf-8")
    project = discover_project(tmp_path / "src")
    out = tmp_path / "out"
    code = run_headless(project, out, frames=1, timeout=15)
    assert code != 0
    err = (out / "error.txt").read_text(encoding="utf-8")
    assert "missing" in err.lower() or "not defined" in err.lower() or "ReferenceError" in err


@pytest.mark.skipif(find_node() is None, reason="node required for headless runner")
def test_headless_cloud_variables(tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "Cat.js").write_text(
        """
setCloudVariable(0, 42);
console.log(getCloudVariable(0));
let i = 1;
setCloudVariable(i, 7);
console.log(getCloudVariable(i));
console.log(getCloudVariable(2));
""",
        encoding="utf-8",
    )
    project = discover_project(src)
    out = tmp_path / "out"
    code = run_headless(project, out, frames=1, timeout=15)
    assert code == 0
    log = (out / "run.log").read_text(encoding="utf-8")
    assert log.splitlines()[:3] == ["42", "7", "0"]


