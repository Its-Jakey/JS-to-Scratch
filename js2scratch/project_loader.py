"""Load a folder of sprite .js files (and optional project.json) into a Project."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scratch3.project import Project
from scratch3.target import Target

from js2scratch.compiler import compile_into, compile_js
from js2scratch.errors import CompileError

SPRITE_KEYS = ("x", "y", "size", "direction", "visible", "draggable", "rotation_style")


def compile_project(path: str | Path) -> Project:
    root = Path(path)
    if root.is_file():
        source = root.read_text(encoding="utf-8")
        return compile_js(source, sprite=root.stem, name=root.stem, filename=str(root))
    if not root.is_dir():
        raise CompileError(f"not a file or directory: {root}")

    config: dict[str, Any] = {}
    config_path = root / "project.json"
    if config_path.is_file():
        try:
            loaded = json.loads(config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CompileError(f"invalid project.json: {exc}", filename=str(config_path)) from exc
        if not isinstance(loaded, dict):
            raise CompileError("project.json must be an object", filename=str(config_path))
        config = loaded

    project = Project(str(config.get("name", root.name)))
    sprite_configs: dict[str, Any] = config.get("sprites", {})
    if sprite_configs and not isinstance(sprite_configs, dict):
        raise CompileError("project.json 'sprites' must be an object", filename=str(config_path))

    js_files = sorted(
        p for p in root.glob("*.js") if p.name != "stage.js" and not p.name.startswith(".")
    )
    stage_js = root / "stage.js"
    if not js_files and not stage_js.is_file():
        raise CompileError(f"no .js files found in {root}", filename=str(root))

    for js_file in js_files:
        cfg = sprite_configs.get(js_file.stem, {})
        if cfg is None:
            cfg = {}
        if not isinstance(cfg, dict):
            raise CompileError(
                f"sprite config for {js_file.stem!r} must be an object",
                filename=str(config_path),
            )
        kwargs = {key: cfg[key] for key in SPRITE_KEYS if key in cfg}
        sprite = project.add_sprite(js_file.stem, **kwargs)
        _add_assets(sprite, cfg, root)
        compile_into(js_file.read_text(encoding="utf-8"), sprite, filename=str(js_file))

    if stage_js.is_file():
        stage_cfg = config.get("stage", {})
        if isinstance(stage_cfg, dict):
            _add_assets(project.stage, stage_cfg, root)
        compile_into(stage_js.read_text(encoding="utf-8"), project.stage, filename=str(stage_js))

    return project


def _add_assets(target: Target, cfg: dict[str, Any], root: Path) -> None:
    costumes = cfg.get("costumes")
    if costumes is None and "costume" in cfg:
        costumes = [cfg["costume"]]
    if costumes:
        if isinstance(costumes, str):
            costumes = [costumes]
        for costume in costumes:
            path = root / str(costume)
            target.add_costume(str(path), Path(str(costume)).stem)
    sounds = cfg.get("sounds") or []
    if isinstance(sounds, str):
        sounds = [sounds]
    for sound in sounds:
        path = root / str(sound)
        target.add_sound(str(path), Path(str(sound)).stem)
