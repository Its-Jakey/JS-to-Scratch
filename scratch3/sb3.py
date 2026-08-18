"""Pack and unpack .sb3 ZIP archives."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Any, Iterable

from scratch3.assets import Costume, Sound


def write_sb3(
    path: str | Path,
    project_json: dict[str, Any],
    assets: Iterable[Costume | Sound],
) -> Path:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
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
