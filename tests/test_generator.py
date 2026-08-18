from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from scratch3 import Project
from scratch3.blocks import (
    Bounce,
    Broadcast,
    ChangePenParam,
    CreateClone,
    CustomBlock,
    Define,
    Equals,
    EraseAll,
    GoTo,
    GoToXY,
    If,
    Move,
    PenDown,
    PenUp,
    PlaySound,
    Repeat,
    Say,
    SetPenColor,
    SetPenParam,
    SetPenSize,
    SetVariable,
    Stamp,
    Stop,
    SwitchCostume,
    Touching,
    TurnRight,
    WhenFlagClicked,
    WhenIReceive,
)


def _by_opcode(blocks: dict, opcode: str) -> list[tuple[str, dict]]:
    return [
        (block_id, block)
        for block_id, block in blocks.items()
        if isinstance(block, dict) and block.get("opcode") == opcode
    ]


def test_zip_contains_project_and_costumes(tmp_path: Path) -> None:
    project = Project()
    sprite = project.add_sprite("Cat")
    sprite.add_script(WhenFlagClicked(Move(10)))
    path = tmp_path / "demo.sb3"
    project.save(path)

    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        assert "project.json" in names
        data = json.loads(archive.read("project.json"))
        assert data["targets"][0]["isStage"] is True
        assert data["targets"][1]["name"] == "Cat"
        assert data["targets"][0]["costumes"]
        assert data["targets"][1]["costumes"]
        assert data["meta"]["semver"] == "3.0.0"
        for target in data["targets"]:
            for costume in target["costumes"]:
                assert costume["md5ext"] in names


def test_stack_parent_next_and_substack() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    cat.add_script(
        WhenFlagClicked(
            GoToXY(0, 0),
            Repeat(10, Move(10), TurnRight(15)),
            If(Touching("edge"), Bounce()),
        )
    )
    blocks = project.to_dict()["targets"][1]["blocks"]
    (hat_id, hat) = _by_opcode(blocks, "event_whenflagclicked")[0]
    assert hat["topLevel"] is True
    assert hat["parent"] is None

    goto_id = hat["next"]
    goto = blocks[goto_id]
    assert goto["opcode"] == "motion_gotoxy"
    assert goto["parent"] == hat_id
    assert goto["inputs"]["X"][0] == 1
    assert goto["inputs"]["X"][1][0] == 4
    assert goto["inputs"]["Y"][1][0] == 4

    repeat_id = goto["next"]
    repeat = blocks[repeat_id]
    assert repeat["opcode"] == "control_repeat"
    assert repeat["parent"] == goto_id
    assert repeat["inputs"]["TIMES"] == [1, [6, "10"]]

    move_id = repeat["inputs"]["SUBSTACK"][1]
    move = blocks[move_id]
    assert move["opcode"] == "motion_movesteps"
    assert move["parent"] == repeat_id
    turn_id = move["next"]
    turn = blocks[turn_id]
    assert turn["opcode"] == "motion_turnright"
    assert turn["parent"] == move_id
    assert turn["next"] is None

    if_id = repeat["next"]
    if_block = blocks[if_id]
    assert if_block["opcode"] == "control_if"
    assert if_block["parent"] == repeat_id
    touching_id = if_block["inputs"]["CONDITION"][1]
    touching = blocks[touching_id]
    assert touching["opcode"] == "sensing_touchingobject"
    bounce_id = if_block["inputs"]["SUBSTACK"][1]
    assert blocks[bounce_id]["opcode"] == "motion_ifonedgebounce"


def test_number_vs_string_shadows() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    cat.add_script(WhenFlagClicked(Move(10), Say("Hello!")))
    blocks = project.to_dict()["targets"][1]["blocks"]
    move = _by_opcode(blocks, "motion_movesteps")[0][1]
    say = _by_opcode(blocks, "looks_say")[0][1]
    assert move["inputs"]["STEPS"][1][0] == 4
    assert say["inputs"]["MESSAGE"][1][0] == 10
    assert say["inputs"]["MESSAGE"][1][1] == "Hello!"


def test_say_for_seconds_uses_two_inputs() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    cat.add_script(WhenFlagClicked(Say("Hello!", 0.5)))
    blocks = project.to_dict()["targets"][1]["blocks"]
    say = _by_opcode(blocks, "looks_sayforsecs")[0][1]
    assert say["inputs"]["MESSAGE"][1][1] == "Hello!"
    assert say["inputs"]["SECS"][1] == [4, "0.5"]


def test_menu_shadows() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    cat.add_script(
        WhenFlagClicked(
            GoTo("random position"),
            SwitchCostume("costume1"),
            PlaySound("meow"),
            CreateClone("myself"),
            If(Touching("edge"), Bounce()),
        )
    )
    blocks = project.to_dict()["targets"][1]["blocks"]

    goto = _by_opcode(blocks, "motion_goto")[0][1]
    menu_id = goto["inputs"]["TO"][1]
    assert blocks[menu_id]["opcode"] == "motion_goto_menu"
    assert blocks[menu_id]["shadow"] is True
    assert blocks[menu_id]["fields"]["TO"][0] == "_random_"

    costume = _by_opcode(blocks, "looks_switchcostumeto")[0][1]
    costume_menu = blocks[costume["inputs"]["COSTUME"][1]]
    assert costume_menu["opcode"] == "looks_costume"

    sound = _by_opcode(blocks, "sound_play")[0][1]
    sound_menu = blocks[sound["inputs"]["SOUND_MENU"][1]]
    assert sound_menu["opcode"] == "sound_sounds_menu"
    assert sound_menu["fields"]["SOUND_MENU"][0] == "meow"

    clone = _by_opcode(blocks, "control_create_clone_of")[0][1]
    clone_menu = blocks[clone["inputs"]["CLONE_OPTION"][1]]
    assert clone_menu["fields"]["CLONE_OPTION"][0] == "_myself_"

    touching = _by_opcode(blocks, "sensing_touchingobject")[0][1]
    touching_menu = blocks[touching["inputs"]["TOUCHINGOBJECTMENU"][1]]
    assert touching_menu["fields"]["TOUCHINGOBJECTMENU"][0] == "_edge_"


def test_reporter_covers_number_shadow() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    cat.add_script(WhenFlagClicked(Move(Equals(1, 1))))
    blocks = project.to_dict()["targets"][1]["blocks"]
    move = _by_opcode(blocks, "motion_movesteps")[0][1]
    assert move["inputs"]["STEPS"][0] == 3
    child_id = move["inputs"]["STEPS"][1]
    assert blocks[child_id]["opcode"] == "operator_equals"
    assert move["inputs"]["STEPS"][2][0] == 4


def test_variable_and_broadcast() -> None:
    project = Project()
    score = project.variable("score", 0, show=True)
    ping = project.broadcast("ping")
    cat = project.add_sprite("Cat")
    cat.add_script(WhenFlagClicked(SetVariable(score, 1), Broadcast(ping)))
    cat.add_script(WhenIReceive(ping, SetVariable(score, 0)))
    data = project.to_dict()
    stage = data["targets"][0]
    assert score.id in stage["variables"]
    assert stage["variables"][score.id][0] == "score"
    assert ping.id in stage["broadcasts"]
    assert data["monitors"][0]["opcode"] == "data_variable"
    blocks = data["targets"][1]["blocks"]
    set_var = _by_opcode(blocks, "data_setvariableto")[0][1]
    assert set_var["fields"]["VARIABLE"] == [score.name, score.id]
    broadcast = _by_opcode(blocks, "event_broadcast")[0][1]
    assert broadcast["inputs"]["BROADCAST_INPUT"][1][0] == 11
    assert broadcast["inputs"]["BROADCAST_INPUT"][1][1] == "ping"


def test_list_from_file(tmp_path: Path) -> None:
    path = tmp_path / "items.txt"
    path.write_text("sword\n42\n3.5\n\nlast\n", encoding="utf-8")
    project = Project()
    items = project.list("items", from_file=path)
    assert items.values == ["sword", 42, 3.5, "", "last"]
    data = project.to_dict()
    stored = [entry[1] for entry in data["targets"][0]["lists"].values()]
    assert ["sword", 42, 3.5, "", "last"] in stored


def test_sprite_list_from_file(tmp_path: Path) -> None:
    path = tmp_path / "names.txt"
    path.write_text("alpha\nbeta\n", encoding="utf-8")
    project = Project()
    cat = project.add_sprite("Cat")
    names = cat.list("names", from_file=path)
    assert names.values == ["alpha", "beta"]
    data = project.to_dict()
    sprite = next(target for target in data["targets"] if target["name"] == "Cat")
    stored = [entry[1] for entry in sprite["lists"].values()]
    assert ["alpha", "beta"] in stored


def test_list_from_file_rejects_values(tmp_path: Path) -> None:
    path = tmp_path / "items.txt"
    path.write_text("a\n", encoding="utf-8")
    project = Project()
    with pytest.raises(TypeError, match="values or from_file"):
        project.list("items", ["a"], from_file=path)


def test_list_from_missing_file(tmp_path: Path) -> None:
    project = Project()
    with pytest.raises(FileNotFoundError):
        project.list("items", from_file=tmp_path / "missing.txt")


def test_custom_block_mutations() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    jump = CustomBlock("jump %s", ["height"], warp=True)
    cat.add_script(Define(jump, SetVariable("dummy", jump["height"])))
    cat.add_script(WhenFlagClicked(jump(50)))
    blocks = project.to_dict()["targets"][1]["blocks"]

    definition = _by_opcode(blocks, "procedures_definition")[0][1]
    proto_id = definition["inputs"]["custom_block"][1]
    proto = blocks[proto_id]
    assert proto["opcode"] == "procedures_prototype"
    assert proto["shadow"] is True
    mutation = proto["mutation"]
    assert mutation["proccode"] == "jump %s"
    assert mutation["warp"] == "true"
    assert '"height"' in mutation["argumentnames"]

    call = _by_opcode(blocks, "procedures_call")[0][1]
    assert call["mutation"]["proccode"] == "jump %s"
    assert call["mutation"]["warp"] == "true"
    arg_ids = json.loads(call["mutation"]["argumentids"])
    assert arg_ids[0] in call["inputs"]


def test_stop_mutation() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    cat.add_script(WhenFlagClicked(Stop("all"), Stop("other scripts in sprite")))
    blocks = project.to_dict()["targets"][1]["blocks"]
    stops = [block for _, block in _by_opcode(blocks, "control_stop")]
    hasnext = {block["fields"]["STOP_OPTION"][0]: block["mutation"]["hasnext"] for block in stops}
    assert hasnext["all"] == "false"
    assert hasnext["other scripts in sprite"] == "true"


def test_hello_world_example(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    example = Path(__file__).resolve().parents[1] / "examples" / "hello_world.py"
    ns: dict = {"__file__": str(tmp_path / "hello_world.py")}
    compiled = compile(example.read_text(encoding="utf-8"), str(example), "exec")
    monkeypatch.chdir(tmp_path)
    exec(compiled, ns)
    output = tmp_path / "hello_world.sb3"
    assert output.exists()
    with zipfile.ZipFile(output) as archive:
        data = json.loads(archive.read("project.json"))
    sprite = data["targets"][1]
    opcodes = {
        block["opcode"]
        for block in sprite["blocks"].values()
        if isinstance(block, dict) and "opcode" in block
    }
    assert "event_whenflagclicked" in opcodes
    assert "motion_movesteps" in opcodes
    assert "control_repeat" in opcodes
    assert "looks_sayforsecs" in opcodes


def test_pen_extension_blocks_and_menus() -> None:
    project = Project()
    cat = project.add_sprite("Cat")
    cat.add_script(
        WhenFlagClicked(
            EraseAll(),
            SetPenColor("#ff0000"),
            SetPenParam("saturation", 80),
            ChangePenParam("color", 10),
            SetPenSize(5),
            PenDown(),
            Move(50),
            PenUp(),
            Stamp(),
        )
    )
    data = project.to_dict()
    assert data["extensions"] == ["pen"]
    blocks = data["targets"][1]["blocks"]

    assert _by_opcode(blocks, "pen_clear")
    assert _by_opcode(blocks, "pen_penDown")
    assert _by_opcode(blocks, "pen_penUp")
    assert _by_opcode(blocks, "pen_stamp")

    color = _by_opcode(blocks, "pen_setPenColorToColor")[0][1]
    assert color["inputs"]["COLOR"] == [1, [9, "#ff0000"]]

    set_param = _by_opcode(blocks, "pen_setPenColorParamTo")[0][1]
    menu_id = set_param["inputs"]["COLOR_PARAM"][1]
    menu = blocks[menu_id]
    assert menu["opcode"] == "pen_menu_colorParam"
    assert menu["shadow"] is True
    assert menu["fields"]["colorParam"][0] == "saturation"
    assert set_param["inputs"]["VALUE"] == [1, [4, "80"]]

    change_param = _by_opcode(blocks, "pen_changePenColorParamBy")[0][1]
    change_menu = blocks[change_param["inputs"]["COLOR_PARAM"][1]]
    assert change_menu["fields"]["colorParam"][0] == "color"

    size = _by_opcode(blocks, "pen_setPenSizeTo")[0][1]
    assert size["inputs"]["SIZE"] == [1, [4, "5"]]
