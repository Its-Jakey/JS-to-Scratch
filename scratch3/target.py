"""Stage and sprite targets."""

from __future__ import annotations

from pathlib import Path
from typing import Any, TYPE_CHECKING

from scratch3.assets import Costume, Sound
from scratch3.blocks.spec import Block
from scratch3.refs import Broadcast, List, Variable, load_list_file

if TYPE_CHECKING:
    from scratch3.project import Project


class Target:
    is_stage: bool = False

    def __init__(self, project: Project, name: str) -> None:
        self.project = project
        self.name = name
        self.variables: dict[str, Variable] = {}
        self.lists: dict[str, List] = {}
        self.costumes: list[Costume] = []
        self.sounds: list[Sound] = []
        self.scripts: list[Block] = []
        self.current_costume = 0
        self.volume = 100
        self.layer_order = 0

    def add_script(self, *blocks: Block) -> None:
        if not blocks:
            return
        head = blocks[0]
        if len(blocks) > 1:
            head.stack.extend(blocks[1:])
        self.scripts.append(head)

    def add_costume(
        self,
        source: str | Costume | bytes | None = None,
        name: str | None = None,
        *,
        data_format: str = "svg",
        rotation_center: tuple[float, float] | None = None,
    ) -> Costume:
        if isinstance(source, Costume):
            costume = source
            if name:
                costume.name = name
        elif isinstance(source, bytes):
            costume = Costume(name or f"costume{len(self.costumes) + 1}", source, data_format, rotation_center=rotation_center)
        elif source is None:
            costume = Costume.default_backdrop() if self.is_stage else Costume.default_costume()
            if name:
                costume.name = name
        else:
            costume = Costume.from_file(source, name, rotation_center=rotation_center)
        self.costumes.append(costume)
        return costume

    def add_sound(self, source: str | Sound | bytes, name: str | None = None, data_format: str = "wav") -> Sound:
        if isinstance(source, Sound):
            sound = source
            if name:
                sound.name = name
        elif isinstance(source, bytes):
            sound = Sound(name or f"sound{len(self.sounds) + 1}", source, data_format)
        else:
            sound = Sound.from_file(source, name)
        self.sounds.append(sound)
        return sound

    def variable(
        self,
        name: str,
        value: Any = 0,
        *,
        cloud: bool = False,
        show: bool = False,
    ) -> Variable:
        existing = self.variables.get(name)
        if existing is not None:
            existing.value = value
            existing.cloud = cloud
            existing.show = show
            return existing
        variable = Variable(
            name=name,
            value=value,
            cloud=cloud,
            show=show,
            sprite_name=None if self.is_stage else self.name,
        )
        self.variables[name] = variable
        return variable

    def list(
        self,
        name: str,
        values: list[Any] | None = None,
        *,
        from_file: str | Path | None = None,
        show: bool = False,
    ) -> List:
        if from_file is not None:
            if values is not None:
                raise TypeError("list() accepts either values or from_file, not both")
            values = load_list_file(from_file)
        existing = self.lists.get(name)
        if existing is not None:
            if values is not None:
                existing.values = list(values)
            existing.show = show
            return existing
        lst = List(
            name=name,
            values=list(values or []),
            show=show,
            sprite_name=None if self.is_stage else self.name,
        )
        self.lists[name] = lst
        return lst

    def find_variable(self, name: str) -> Variable | None:
        return self.variables.get(name)

    def find_list(self, name: str) -> List | None:
        return self.lists.get(name)

    def ensure_costumes(self) -> None:
        if not self.costumes:
            self.add_costume()


class Stage(Target):
    is_stage = True

    def __init__(self, project: Project) -> None:
        super().__init__(project, "Stage")
        self.tempo = 60
        self.video_state = "on"
        self.video_transparency = 50
        self.text_to_speech_language = None
        self.broadcasts: dict[str, Broadcast] = {}
        self.layer_order = 0

    def broadcast(self, name: str) -> Broadcast:
        existing = self.broadcasts.get(name)
        if existing is not None:
            return existing
        message = Broadcast(name)
        self.broadcasts[name] = message
        return message

    def register_broadcast(self, broadcast: Broadcast) -> Broadcast:
        existing = self.broadcasts.get(broadcast.name)
        if existing is not None:
            return existing
        self.broadcasts[broadcast.name] = broadcast
        return broadcast


class Sprite(Target):
    is_stage = False

    def __init__(
        self,
        project: Project,
        name: str,
        *,
        x: float = 0,
        y: float = 0,
        size: float = 100,
        direction: float = 90,
        visible: bool = True,
        draggable: bool = False,
        rotation_style: str = "all around",
    ) -> None:
        super().__init__(project, name)
        self.x = x
        self.y = y
        self.size = size
        self.direction = direction
        self.visible = visible
        self.draggable = draggable
        self.rotation_style = rotation_style
