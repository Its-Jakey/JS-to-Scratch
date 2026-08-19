"""Convert a Project AST into Scratch 3 project.json."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from scratch3.blocks.spec import SerializeContext, serialize_script
from scratch3.refs import BinaryU32Source

if TYPE_CHECKING:
    from scratch3.project import Project
    from scratch3.target import Sprite, Stage, Target


def serialize_project(project: Project) -> dict[str, Any]:
    targets: list[dict[str, Any]] = []
    monitors: list[dict[str, Any]] = []
    project.stage.layer_order = 0
    targets.append(_serialize_target(project.stage, project, monitors))
    for index, sprite in enumerate(project.sprites, start=1):
        sprite.layer_order = index
        targets.append(_serialize_target(sprite, project, monitors))
    return {
        "targets": targets,
        "monitors": monitors,
        "extensions": _collect_extensions(project, targets),
        "meta": {
            "semver": "3.0.0",
            "vm": "0.2.0",
            "agent": "scratch3-python",
        },
    }


_EXTENSION_PREFIXES = {
    "pen_": "pen",
}


def _collect_extensions(project: Project, targets: list[dict[str, Any]]) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for extension_id in project.extensions:
        if extension_id not in seen:
            found.append(extension_id)
            seen.add(extension_id)
    for target in targets:
        for block in target["blocks"].values():
            if not isinstance(block, dict):
                continue
            opcode = block.get("opcode") or ""
            for prefix, extension_id in _EXTENSION_PREFIXES.items():
                if opcode.startswith(prefix) and extension_id not in seen:
                    found.append(extension_id)
                    seen.add(extension_id)
    return found


def _serialize_target(target: Target, project: Project, monitors: list[dict[str, Any]]) -> dict[str, Any]:
    target.ensure_costumes()
    ctx = SerializeContext(target, project)
    for index, script in enumerate(target.scripts):
        x = 40 if script.x is None else script.x
        y = 40 + index * 220 if script.y is None else script.y
        serialize_script(script, ctx, x, y)

    payload: dict[str, Any] = {
        "isStage": target.is_stage,
        "name": target.name,
        "variables": _variables_json(target),
        "lists": _lists_json(target),
        "broadcasts": _broadcasts_json(target) if target.is_stage else {},
        "blocks": ctx.blocks,
        "comments": {},
        "currentCostume": target.current_costume,
        "costumes": [costume.to_json() for costume in target.costumes],
        "sounds": [sound.to_json() for sound in target.sounds],
        "volume": target.volume,
        "layerOrder": target.layer_order,
    }
    if target.is_stage:
        stage: Stage = target  # type: ignore[assignment]
        payload["tempo"] = stage.tempo
        payload["videoTransparency"] = stage.video_transparency
        payload["videoState"] = stage.video_state
        payload["textToSpeechLanguage"] = stage.text_to_speech_language
    else:
        sprite: Sprite = target  # type: ignore[assignment]
        payload["visible"] = sprite.visible
        payload["x"] = sprite.x
        payload["y"] = sprite.y
        payload["size"] = sprite.size
        payload["direction"] = sprite.direction
        payload["draggable"] = sprite.draggable
        payload["rotationStyle"] = sprite.rotation_style

    monitors.extend(_monitors_for(target))
    return payload


def _variables_json(target: Target) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for variable in target.variables.values():
        entry: list[Any] = [variable.name, variable.value]
        if variable.cloud:
            entry.append(True)
        result[variable.id] = entry
    return result


def _lists_json(target: Target) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for lst in target.lists.values():
        if lst.binary_source is not None:
            values: Any = lst.binary_source
        else:
            values = list(lst.values)
        result[lst.id] = [lst.name, values]
    return result


def _broadcasts_json(target: Target) -> dict[str, str]:
    stage: Stage = target  # type: ignore[assignment]
    return {broadcast.id: broadcast.name for broadcast in stage.broadcasts.values()}


def _monitors_for(target: Target) -> list[dict[str, Any]]:
    monitors: list[dict[str, Any]] = []
    sprite_name = None if target.is_stage else target.name
    y = 5
    for variable in target.variables.values():
        if not variable.show:
            continue
        monitors.append(
            {
                "id": variable.id,
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": variable.name},
                "spriteName": sprite_name,
                "value": variable.value,
                "width": 0,
                "height": 0,
                "x": 5,
                "y": y,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True,
            }
        )
        y += 24
    for lst in target.lists.values():
        if not lst.show:
            continue
        monitors.append(
            {
                "id": lst.id,
                "mode": "list",
                "opcode": "data_listcontents",
                "params": {"LIST": lst.name},
                "spriteName": sprite_name,
                "value": list(lst.values) if lst.binary_source is None else [],
                "width": 100,
                "height": 200,
                "x": 5,
                "y": y,
                "visible": True,
            }
        )
        y += 24
    return monitors
