"""Pack and unpack .sb3 ZIP archives."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Any, Iterable

from scratch3.assets import Costume, Sound
from scratch3.json_stream import write_json
from scratch3.refs import BinaryU32Source


def _uses_binary_lists(obj: Any) -> bool:
    if isinstance(obj, BinaryU32Source):
        return True
    if isinstance(obj, dict):
        return any(_uses_binary_lists(value) for value in obj.values())
    if isinstance(obj, (list, tuple)):
        return any(_uses_binary_lists(item) for item in obj)
    return False


def write_sb3(
    path: str | Path,
    project_json: dict[str, Any],
    assets: Iterable[Costume | Sound],
) -> Path:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        if _uses_binary_lists(project_json):
            with archive.open("project.json", "w") as handle:
                write_json(handle, project_json)
        else:
            archive.writestr(
                "project.json",
                json.dumps(project_json, separators=(",", ":"), ensure_ascii=False),
            )
        for asset in assets:
            if asset.md5ext in seen:
                continue
            seen.add(asset.md5ext)
            archive.writestr(asset.md5ext, asset.data)
    return destination
