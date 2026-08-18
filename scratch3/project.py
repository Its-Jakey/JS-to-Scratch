"""Scratch 3 project container."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from scratch3.assets import Costume, Sound
from scratch3.refs import Broadcast, List, Variable
from scratch3.sb3 import write_sb3
from scratch3.serialize import serialize_project
from scratch3.target import Sprite, Stage


class Project:
    def __init__(self, name: str = "Untitled") -> None:
        self.name = name
        self.stage = Stage(self)
        self.sprites: list[Sprite] = []
        self.extensions: list[str] = []

    def add_sprite(self, name: str = "Sprite1", **kwargs: Any) -> Sprite:
        sprite = Sprite(self, name, **kwargs)
        self.sprites.append(sprite)
        return sprite

    def variable(
        self,
        name: str,
        value: Any = 0,
        *,
        cloud: bool = False,
        show: bool = False,
    ) -> Variable:
        return self.stage.variable(name, value, cloud=cloud, show=show)

    def list(
        self,
        name: str,
        values: list[Any] | None = None,
        *,
        from_file: str | Path | None = None,
        show: bool = False,
    ) -> List:
        return self.stage.list(name, values, from_file=from_file, show=show)

    def broadcast(self, name: str) -> Broadcast:
        return self.stage.broadcast(name)

    def register_broadcast(self, broadcast: Broadcast) -> Broadcast:
        return self.stage.register_broadcast(broadcast)

    def to_dict(self) -> dict[str, Any]:
        return serialize_project(self)

    def _iter_assets(self) -> list[Costume | Sound]:
        assets: list[Costume | Sound] = []
        self.stage.ensure_costumes()
        assets.extend(self.stage.costumes)
        assets.extend(self.stage.sounds)
        for sprite in self.sprites:
            sprite.ensure_costumes()
            assets.extend(sprite.costumes)
            assets.extend(sprite.sounds)
        return assets

    def save(self, path: str | Path) -> Path:
        return write_sb3(path, self.to_dict(), self._iter_assets())
