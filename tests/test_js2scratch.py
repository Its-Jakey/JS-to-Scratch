from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from js2scratch import CompileError, compile_js, compile_project, parse
from js2scratch.ast import (
    Binary,
    Break,
    Call,
    ExpressionStmt,
    Identifier,
    Literal,
    Member,
    Program,
    Switch,
    SwitchCase,
)


ROOT = Path(__file__).resolve().parents[1]


def _by_opcode(blocks: dict, opcode: str) -> list[tuple[str, dict]]:
    return [
        (block_id, block)
        for block_id, block in blocks.items()
        if isinstance(block, dict) and block.get("opcode") == opcode
    ]


def _sprite(project) -> dict:
    data = project.to_dict()
    return next(target for target in data["targets"] if not target["isStage"])


def _stage(project) -> dict:
    data = project.to_dict()
    return next(target for target in data["targets"] if target["isStage"])


def _sprite_blocks(project) -> dict:
    return _sprite(project)["blocks"]


def _proccodes(blocks: dict) -> list[str]:
    return [
        (block.get("mutation") or {}).get("proccode")
        for _, block in _by_opcode(blocks, "procedures_prototype")
        if (block.get("mutation") or {}).get("proccode")
    ]


def _list_named(sprite: dict, name: str):
    for entry in sprite["lists"].values():
        if entry[0] == name:
            return entry[1]
    return None


def _var_names(sprite: dict) -> list[str]:
    return [entry[0] for entry in sprite["variables"].values()]


def _script_ids(blocks: dict, start_id: str | None) -> list[str]:
    ids: list[str] = []
    current = start_id
    while current:
        ids.append(current)
        current = blocks[current].get("next")
    return ids


def _definition_body_ids(blocks: dict, proccode: str) -> list[str]:
    for proto_id, proto in _by_opcode(blocks, "procedures_prototype"):
        if (proto.get("mutation") or {}).get("proccode") != proccode:
            continue
        definition = blocks[proto["parent"]]
        return _script_ids(blocks, definition.get("next"))
    raise AssertionError(f"no definition for {proccode!r}")


def test_parse_hello_world() -> None:
    program = parse('console.log("Hello World!");')
    assert isinstance(program, Program)
    stmt = program.body[0]
    assert isinstance(stmt, ExpressionStmt)
    assert isinstance(stmt.expression, Call)
    assert isinstance(stmt.expression.callee, Member)
    assert isinstance(stmt.expression.arguments[0], Literal)
    assert stmt.expression.arguments[0].value == "Hello World!"


def test_parse_rejects_objects() -> None:
    with pytest.raises(CompileError, match="object literals are not supported"):
        parse("let x = { a: 1 };")


def test_parse_rejects_new() -> None:
    with pytest.raises(CompileError, match="new / objects are not supported"):
        parse("let x = new Foo();")


def test_parse_rejects_this() -> None:
    with pytest.raises(CompileError, match="this is not supported"):
        parse("console.log(this);")


def test_hello_world_opcodes() -> None:
    project = compile_js('console.log("Hello World!");', sprite="Cat", name="Hello World")
    blocks = _sprite_blocks(project)
    hats = _by_opcode(blocks, "event_whenflagclicked")
    says = _by_opcode(blocks, "looks_say")
    assert len(hats) == 1
    assert len(says) == 1
    message = says[0][1]["inputs"]["MESSAGE"]
    assert message[0] == 1
    assert message[1][0] == 10
    assert message[1][1] == "Hello World!"
    assert hats[0][1]["next"] == says[0][0]


def test_function_return_convention() -> None:
    source = """
    function add(a, b) {
      return a + b;
    }
    console.log(add(1, 2));
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    blocks = sprite["blocks"]
    defs = _by_opcode(blocks, "procedures_definition")
    calls = _by_opcode(blocks, "procedures_call")
    adds = _by_opcode(blocks, "operator_add")
    asserts_sets = _by_opcode(blocks, "data_setvariableto")
    says = _by_opcode(blocks, "looks_say")
    assert defs
    assert calls
    assert adds
    assert says
    return_sets = [
        node
        for _, node in asserts_sets
        if node["fields"]["VARIABLE"][0] == "__return"
    ]
    assert return_sets
    copied = [
        node
        for _, node in asserts_sets
        if node["fields"]["VARIABLE"][0].startswith("__t")
    ]
    assert not copied
    assert "add__a" not in _var_names(sprite)
    assert "add__b" not in _var_names(sprite)
    body = _definition_body_ids(blocks, "add %s %s")
    assert not any(blocks[bid].get("opcode") == "control_stop" for bid in body)
    args = _by_opcode(blocks, "argument_reporter_string_number")
    assert {node["fields"]["VALUE"][0] for _, node in args} >= {"a", "b"}


def test_return_does_not_attach_blocks_after_stop() -> None:
    source = """
    function pick(x) {
      if (x) {
        return 1;
      }
      return 2;
    }
    console.log(pick(1));
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    stops = _by_opcode(blocks, "control_stop")
    assert stops
    for _, node in stops:
        has_next = str((node.get("mutation") or {}).get("hasnext", "false")) == "true"
        if not has_next:
            assert node.get("next") is None


def test_constant_array_stored_on_list() -> None:
    source = """
    let a = [10, 20];
    console.log(a[0]);
    """
    project = compile_js(source, sprite="Cat")
    data = project.to_dict()
    sprite = next(target for target in data["targets"] if target["name"] == "Cat")
    values = [entry[1] for entry in sprite["lists"].values()]
    assert any(item == [10, 20] for item in values)


def test_if_while_and_math() -> None:
    source = """
    let n = 0;
    if (1 + 2 > 2) {
      n = Math.abs(-3);
    }
    while (n < 5) {
      n = n + 1;
    }
    console.log(n);
    """
    project = compile_js(source)
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "control_if")
    assert _by_opcode(blocks, "control_repeat_until")
    assert _by_opcode(blocks, "operator_mathop")
    assert _by_opcode(blocks, "looks_say")


def test_arrays_are_1_based() -> None:
    source = """
    let a = [10, 20];
    console.log(a[0]);
    a.push(30);
    """
    project = compile_js(source)
    blocks = _sprite_blocks(project)
    items = _by_opcode(blocks, "data_itemoflist")
    assert items
    assert _by_opcode(blocks, "data_addtolist")
    index = items[0][1]["inputs"]["INDEX"]
    assert index[0] == 1
    assert index[1][1] == "1"
    assert not _by_opcode(blocks, "operator_add")


def test_for_loop_and_string_join() -> None:
    source = """
    let s = "";
    for (let i = 0; i < 3; i++) {
      s = s + "a";
    }
    console.log(s);
    """
    project = compile_js(source)
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "control_repeat_until")
    assert _by_opcode(blocks, "operator_join")
    assert _by_opcode(blocks, "looks_say")


def test_unknown_property_is_rejected() -> None:
    with pytest.raises(CompileError, match="property access is not supported"):
        compile_js("let x = 1; console.log(x.foo);")


def test_compile_error_includes_location() -> None:
    with pytest.raises(CompileError, match="object literals") as excinfo:
        parse("let x = {};", filename="Cat.js")
    err = excinfo.value
    assert err.filename == "Cat.js"
    assert err.line == 1
    assert err.column is not None


def test_compile_project_folder() -> None:
    folder = ROOT / "examples" / "js" / "hello_world"
    project = compile_project(folder)
    assert project.name == "Hello World"
    data = project.to_dict()
    names = [target["name"] for target in data["targets"]]
    assert names[0] == "Stage"
    assert "Cat" in names
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "looks_say")


def test_compile_project_writes_sb3(tmp_path: Path) -> None:
    project = compile_project(ROOT / "examples" / "js" / "functions")
    path = tmp_path / "functions.sb3"
    project.save(path)
    with zipfile.ZipFile(path) as archive:
        data = json.loads(archive.read("project.json"))
    sprite = next(target for target in data["targets"] if target["name"] == "Cat")
    opcodes = {
        block["opcode"]
        for block in sprite["blocks"].values()
        if isinstance(block, dict) and "opcode" in block
    }
    assert "procedures_definition" in opcodes
    assert "procedures_call" in opcodes
    assert "looks_say" in opcodes


def test_pen_and_motion_builtins() -> None:
    source = """
    pen.clear();
    pen.setColor("#4C97FF");
    pen.setSize(3);
    pen.down();
    move(10);
    turnRight(10);
    pen.up();
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "pen_clear")
    assert _by_opcode(blocks, "pen_setPenColorToColor")
    assert _by_opcode(blocks, "pen_setPenSizeTo")
    assert _by_opcode(blocks, "pen_penDown")
    assert _by_opcode(blocks, "pen_penUp")
    assert _by_opcode(blocks, "motion_movesteps")
    assert _by_opcode(blocks, "motion_turnright")
    data = project.to_dict()
    assert "pen" in data["extensions"]
    hex_color = _by_opcode(blocks, "pen_setPenColorToColor")[0][1]
    assert hex_color["inputs"]["COLOR"] == [1, [9, "#4C97FF"]]


def test_pen_set_color_decimal_rgb() -> None:
    source = """
    let packed = 16711680;
    pen.setColor(7259381);
    pen.setColor(packed);
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    colors = [node["inputs"]["COLOR"] for _, node in _by_opcode(blocks, "pen_setPenColorToColor")]
    assert colors[0][0] == 3
    assert colors[0][1] == [4, "7259381"]
    assert colors[0][2] == [9, "#9966FF"]
    assert colors[1][0] == 3
    assert colors[1][1][0] == 12
    assert colors[1][1][1] == "packed"


def test_pen_unknown_method_rejected() -> None:
    with pytest.raises(CompileError, match="pen.foo is not supported"):
        compile_js("pen.foo();")


def test_compile_pen_example() -> None:
    project = compile_project(ROOT / "examples" / "js" / "pen")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "pen_penDown")
    assert _by_opcode(blocks, "control_repeat_until")
    assert _by_opcode(blocks, "motion_movesteps")


def test_global_array_used_in_function() -> None:
    source = """
    let mem = [];
    function poke(i, value) {
      mem[i] = value;
    }
    mem.push(0);
    poke(0, 7);
    console.log(mem[0]);
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "data_replaceitemoflist")
    assert _by_opcode(blocks, "procedures_definition")


def test_key_pressed_builtin() -> None:
    source = """
    let n = 0;
    if (keyPressed("space")) {
      n = 1;
    }
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "sensing_keypressed")


def test_mouse_builtins() -> None:
    source = """
    let x = mouseX();
    let y = mouseY();
    let n = 0;
    if (mouseDown()) {
      n = 1;
    }
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "sensing_mousex")
    assert _by_opcode(blocks, "sensing_mousey")
    assert _by_opcode(blocks, "sensing_mousedown")


def test_timer_and_show_variable() -> None:
    source = """
    let fps = 0;
    resetTimer();
    showVariable("fps");
    fps = timer();
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "sensing_timer")
    assert _by_opcode(blocks, "sensing_resettimer")
    assert _by_opcode(blocks, "data_showvariable")
    data = project.to_dict()
    assert any(m.get("params", {}).get("VARIABLE") == "fps" and m.get("visible") for m in data["monitors"])


def test_load_list_from_file(tmp_path: Path) -> None:
    (tmp_path / "words.txt").write_text("alpha\n42\n3.5\n", encoding="utf-8")
    (tmp_path / "Cat.js").write_text(
        'let words = loadList("words.txt");\nconsole.log(words[0]);\n',
        encoding="utf-8",
    )
    project = compile_project(tmp_path)
    data = project.to_dict()
    sprite = next(target for target in data["targets"] if target["name"] == "Cat")
    values = [entry[1] for entry in sprite["lists"].values()]
    assert any(item == ["alpha", 42, 3.5] for item in values)
    blocks = sprite["blocks"]
    assert not _by_opcode(blocks, "data_addtolist")
    assert _by_opcode(blocks, "data_itemoflist")


def test_load_list_nested_path(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "rom.txt").write_text("240\n144\n", encoding="utf-8")
    source = 'let rom = loadList("data/rom.txt");\nconsole.log(rom.length);\n'
    project = compile_js(source, sprite="Cat", filename=str(tmp_path / "Cat.js"))
    data = project.to_dict()
    sprite = next(target for target in data["targets"] if target["name"] == "Cat")
    values = [entry[1] for entry in sprite["lists"].values()]
    assert any(item == [240, 144] for item in values)


def test_load_list_rejects_non_literal() -> None:
    with pytest.raises(CompileError, match="string literal"):
        compile_js('let p = "a.txt"; let a = loadList(p);')


def test_load_list_missing_file(tmp_path: Path) -> None:
    with pytest.raises(CompileError, match="cannot read list file"):
        compile_js(
            'let a = loadList("missing.txt");',
            filename=str(tmp_path / "Cat.js"),
        )


def test_bitwise_constant_fold_has_no_helpers() -> None:
    project = compile_js("console.log(12 & 10);")
    sprite = _sprite(project)
    assert _list_named(sprite, "andLUT") is None
    assert not any(code.startswith("AND") for code in _proccodes(sprite["blocks"]))
    say = _by_opcode(sprite["blocks"], "looks_say")[0][1]
    assert say["inputs"]["MESSAGE"][1][1] == "8"


def test_and_all_ones_mask_uses_modulo() -> None:
    project = compile_js(
        """
        let x = 0;
        console.log(x & 255);
        """
    )
    sprite = _sprite(project)
    assert _by_opcode(sprite["blocks"], "operator_mod")
    assert _list_named(sprite, "andLUT") is None
    assert not any(code.startswith("AND") for code in _proccodes(sprite["blocks"]))


def test_and8_helper_not_and32() -> None:
    project = compile_js(
        """
        let a = 1;
        let b = 2;
        console.log(a & b);
        """
    )
    sprite = _sprite(project)
    codes = _proccodes(sprite["blocks"])
    assert "AND8 %s %s" in codes
    assert "AND16 %s %s" not in codes
    assert "AND32 %s %s" not in codes
    lut = _list_named(sprite, "andLUT")
    assert lut is not None
    assert len(lut) == 65536
    assert lut[0] == 0
    assert lut[1 * 256 + 1] == 1
    assert lut[12 * 256 + 10] == 8


def test_and16_helper_not_and32() -> None:
    project = compile_js(
        """
        let a = 1000;
        let b = 2000;
        console.log(a & b);
        """
    )
    codes = _proccodes(_sprite_blocks(project))
    assert "AND16 %s %s" in codes
    assert "AND8 %s %s" not in codes
    assert "AND32 %s %s" not in codes


def test_unknown_and_uses_and32() -> None:
    project = compile_js(
        """
        function band(a, b) {
          return a & b;
        }
        console.log(band(12, 10));
        """
    )
    codes = _proccodes(_sprite_blocks(project))
    assert "AND32 %s %s" in codes
    assert "AND8 %s %s" not in codes
    assert "OR32 %s %s" not in codes


def test_or8_includes_and8_only() -> None:
    project = compile_js(
        """
        let a = 1;
        let b = 2;
        console.log(a | b);
        """
    )
    codes = _proccodes(_sprite_blocks(project))
    assert "OR8 %s %s" in codes
    assert "AND8 %s %s" not in codes
    assert "OR32 %s %s" not in codes
    assert "AND32 %s %s" not in codes
    assert _list_named(_sprite(project), "andLUT") is not None


def test_or_and_xor_helpers_and_dependencies() -> None:
    project = compile_js(
        """
        function mix(a, b) {
          return (a | b) ^ a;
        }
        console.log(mix(1, 2));
        """
    )
    codes = _proccodes(_sprite_blocks(project))
    assert "OR32 %s %s" in codes
    assert "XOR32 %s %s" in codes
    assert "AND32 %s %s" not in codes
    assert "AND8 %s %s" not in codes
    assert "OR8 %s %s" not in codes
    assert _list_named(_sprite(project), "andLUT") is not None


def test_constant_shift_is_multiply_or_floor() -> None:
    project = compile_js(
        """
        let x = 1;
        console.log(x << 3);
        console.log(x >> 1);
        """
    )
    sprite = _sprite(project)
    assert _list_named(sprite, "pow2LUT") is None
    assert _by_opcode(sprite["blocks"], "operator_multiply")
    assert _by_opcode(sprite["blocks"], "operator_mathop")


def test_variable_shift_uses_pow2_lut() -> None:
    project = compile_js(
        """
        function shl(a, n) {
          return a << n;
        }
        console.log(shl(1, 3));
        """
    )
    sprite = _sprite(project)
    lut = _list_named(sprite, "pow2LUT")
    assert lut == [1 << n for n in range(32)]
    assert _list_named(sprite, "andLUT") is None


def test_bitwise_not_and_compound_and() -> None:
    project = compile_js(
        """
        let x = 7;
        x &= 3;
        console.log(~x);
        """
    )
    sprite = _sprite(project)
    assert _by_opcode(sprite["blocks"], "operator_mod")
    assert _by_opcode(sprite["blocks"], "operator_subtract")
    assert _list_named(sprite, "andLUT") is None


def test_parse_bitwise_precedence() -> None:
    program = parse("1 + 2 & 3 << 2")
    expr = program.body[0].expression
    assert isinstance(expr, Binary)
    assert expr.op == "&"
    assert isinstance(expr.left, Binary) and expr.left.op == "+"
    assert isinstance(expr.right, Binary) and expr.right.op == "<<"


def test_parse_switch() -> None:
    program = parse(
        """
        switch (x) {
          case 1:
            break;
          default:
            x = 2;
        }
        """
    )
    stmt = program.body[0]
    assert isinstance(stmt, Switch)
    assert isinstance(stmt.discriminant, Identifier)
    assert stmt.discriminant.name == "x"
    assert len(stmt.cases) == 2
    first, second = stmt.cases
    assert isinstance(first, SwitchCase)
    assert isinstance(first.test, Literal) and first.test.value == 1
    assert isinstance(first.body[0], Break)
    assert second.test is None
    assert second.body


def test_switch_compiles_case_blocks_and_stops() -> None:
    source = """
    let x = 1;
    switch (x) {
      case 1:
        console.log("one");
        break;
      case 2:
        console.log("two");
        break;
      default:
        console.log("other");
    }
    console.log("after");
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    codes = _proccodes(blocks)
    assert "__sw1" not in codes
    assert not any(str(code).startswith("__sw1_c") for code in codes)
    assert _by_opcode(blocks, "control_if") or _by_opcode(blocks, "control_if_else")
    hats = _by_opcode(blocks, "event_whenflagclicked")
    flag_script = _script_ids(blocks, hats[0][1].get("next"))
    says_in_flag = [
        bid for bid in flag_script if blocks[bid].get("opcode") == "looks_say"
    ]
    assert len(says_in_flag) == 1


def test_switch_fallthrough_calls_next_case() -> None:
    source = """
    let x = 1;
    switch (x) {
      case 1:
        console.log("one");
      case 2:
        console.log("two");
        break;
      default:
        console.log("other");
    }
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    body = _definition_body_ids(blocks, "__sw1_c0")
    calls = [
        blocks[bid]
        for bid in body
        if blocks[bid].get("opcode") == "procedures_call"
    ]
    assert any((node.get("mutation") or {}).get("proccode") == "__sw1_c1" for node in calls)
    broken = _definition_body_ids(blocks, "__sw1_c1")
    broken_calls = [
        (blocks[bid].get("mutation") or {}).get("proccode")
        for bid in broken
        if blocks[bid].get("opcode") == "procedures_call"
    ]
    assert "__sw1_c2" not in broken_calls


def test_return_in_case_sets_flag() -> None:
    source = """
    function pick(x) {
      switch (x) {
        case 1:
          return 2;
        default:
          return 3;
      }
    }
    console.log(pick(1));
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    assert "__sw_ret" in _var_names(sprite)
    sets = [
        node
        for _, node in _by_opcode(sprite["blocks"], "data_setvariableto")
        if node["fields"]["VARIABLE"][0] == "__sw_ret"
    ]
    assert any(node["inputs"]["VALUE"][1][1] == "1" for node in sets)
    assert any(node["inputs"]["VALUE"][1][1] == "0" for node in sets)


def test_switch_without_return_has_no_flag() -> None:
    source = """
    function pick(x) {
      switch (x) {
        case 1:
          break;
      }
      return 0;
    }
    console.log(pick(1));
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    assert "__sw_ret" not in _var_names(sprite)


def test_break_outside_switch_is_rejected() -> None:
    with pytest.raises(CompileError, match="break outside of switch"):
        compile_js("break;")


def test_break_in_loop_is_rejected() -> None:
    with pytest.raises(CompileError, match="break in loops is not supported"):
        compile_js("while (true) { break; }")


def test_continue_still_rejected() -> None:
    with pytest.raises(CompileError, match="continue is not supported"):
        parse("while (true) { continue; }")


def test_multiple_default_is_rejected() -> None:
    with pytest.raises(CompileError, match="multiple default clauses"):
        parse("switch (1) { default: break; default: break; }")


def test_case_outside_switch_is_rejected() -> None:
    with pytest.raises(CompileError, match="case outside of switch"):
        parse("case 1: break;")


def test_mutated_param_is_copied() -> None:
    source = """
    function inc(a) {
      a = a + 1;
      return a;
    }
    console.log(inc(3));
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    assert "inc__a" in _var_names(sprite)
    body = _definition_body_ids(sprite["blocks"], "inc %s")
    sets = [
        sprite["blocks"][bid]
        for bid in body
        if sprite["blocks"][bid].get("opcode") == "data_setvariableto"
        and sprite["blocks"][bid]["fields"]["VARIABLE"][0] == "inc__a"
    ]
    assert sets


def test_make_color_snapshots_only_live_returns() -> None:
    source = """
    function hexByte(n) {
      let x = n;
      return x;
    }
    function makeColor(r, g, b) {
      return "#" + hexByte(r) + hexByte(g) + hexByte(b);
    }
    console.log(makeColor(1, 2, 3));
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    names = _var_names(sprite)
    assert "makeColor__r" not in names
    assert "makeColor__g" not in names
    assert "makeColor__b" not in names
    assert "__t1" in names
    assert "__t2" in names
    assert "__t3" not in names
    body = _definition_body_ids(sprite["blocks"], "makeColor %s %s %s")
    assert not any(sprite["blocks"][bid].get("opcode") == "control_stop" for bid in body)
    temps = [
        sprite["blocks"][bid]["fields"]["VARIABLE"][0]
        for bid in body
        if sprite["blocks"][bid].get("opcode") == "data_setvariableto"
        and sprite["blocks"][bid]["fields"]["VARIABLE"][0].startswith("__t")
    ]
    assert temps == ["__t1", "__t2"]
    return_sets = [
        sprite["blocks"][bid]
        for bid in body
        if sprite["blocks"][bid].get("opcode") == "data_setvariableto"
        and sprite["blocks"][bid]["fields"]["VARIABLE"][0] == "__return"
    ]
    assert return_sets


def test_two_calls_snapshot_the_first() -> None:
    source = """
    function id(x) {
      let y = x;
      return y;
    }
    console.log(id(1), id(2));
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    assert "__t1" in _var_names(sprite)
    hats = _by_opcode(sprite["blocks"], "event_whenflagclicked")
    script = _script_ids(sprite["blocks"], hats[0][1].get("next"))
    temp_sets = [
        sprite["blocks"][bid]
        for bid in script
        if sprite["blocks"][bid].get("opcode") == "data_setvariableto"
        and sprite["blocks"][bid]["fields"]["VARIABLE"][0].startswith("__t")
    ]
    assert len(temp_sets) == 1


def test_early_return_still_stops() -> None:
    source = """
    function pick(x) {
      if (x) {
        return 1;
      }
      return 2;
    }
    console.log(pick(1));
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    stops = _by_opcode(blocks, "control_stop")
    assert stops
    for _, node in stops:
        has_next = str((node.get("mutation") or {}).get("hasnext", "false")) == "true"
        if not has_next:
            assert node.get("next") is None


def test_no_return_variable_without_functions() -> None:
    project = compile_js("console.log(1);", sprite="Cat")
    assert "__return" not in _var_names(_sprite(project))


def test_condition_not_and_or_are_operators() -> None:
    source = """
    let a = 1;
    let b = 2;
    if (!a) {
      a = 0;
    }
    if (a && b) {
      a = 3;
    }
    if (a || b) {
      a = 4;
    }
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "operator_not")
    assert _by_opcode(blocks, "operator_and")
    assert _by_opcode(blocks, "operator_or")
    names = _var_names(_sprite(project))
    assert not any(name.startswith("__t") for name in names)


def test_postfix_increment_statement_uses_change_by() -> None:
    source = """
    let i = 0;
    i++;
    for (let j = 0; j < 3; j++) {
      i = i + 1;
    }
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    assert _by_opcode(sprite["blocks"], "data_changevariableby")
    assert not any(name.startswith("__t") for name in _var_names(sprite))


def test_void_function_omits_empty_return() -> None:
    source = """
    function bar() {
    }
    function foo() {
      bar();
    }
    foo();
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    assert "__return" not in _var_names(sprite)
    sets = [
        node
        for _, node in _by_opcode(sprite["blocks"], "data_setvariableto")
        if node["fields"]["VARIABLE"][0] == "__return"
    ]
    assert not sets


def test_pure_do_while_has_no_loop_flag() -> None:
    source = """
    let n = 0;
    do {
      n++;
    } while (n < 3);
    """
    project = compile_js(source, sprite="Cat")
    sprite = _sprite(project)
    assert _by_opcode(sprite["blocks"], "control_repeat_until")
    assert not any(name.startswith("__loop") for name in _var_names(sprite))


def test_compound_add_uses_change_by() -> None:
    source = """
    let x = 0;
    x += 2;
    x = x + 3;
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert len(_by_opcode(blocks, "data_changevariableby")) >= 2
    assert not _by_opcode(blocks, "operator_add")


def test_number_truthiness_skips_empty_string() -> None:
    source = """
    let n = 0;
    if (n) {
      n = 1;
    }
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    equals = _by_opcode(blocks, "operator_equals")
    assert equals
    for _, node in equals:
        inputs = node["inputs"]
        vals = []
        for key in ("OPERAND1", "OPERAND2"):
            raw = inputs.get(key)
            if raw and isinstance(raw[1], list):
                vals.append(raw[1][1])
        assert "" not in vals


def test_list_or_uses_or8() -> None:
    source = """
    let v = [1, 2];
    console.log(v[0] | v[1]);
    """
    project = compile_js(source, sprite="Cat")
    codes = _proccodes(_sprite_blocks(project))
    assert "OR8 %s %s" in codes
    assert "OR32 %s %s" not in codes


def test_const_fold_add() -> None:
    project = compile_js("console.log(1 + 2);")
    say = _by_opcode(_sprite_blocks(project), "looks_say")[0][1]
    assert say["inputs"]["MESSAGE"][1][1] == "3"
    assert not _by_opcode(_sprite_blocks(project), "operator_add")


def test_tiny_function_inlined_when_called_twice() -> None:
    source = """
    function dub(x) {
      return x + x;
    }
    console.log(dub(1));
    console.log(dub(2));
    """
    project = compile_js(source, sprite="Cat")
    codes = _proccodes(_sprite_blocks(project))
    assert not any(code == "dub %s" or (isinstance(code, str) and code.startswith("dub ")) for code in codes)


def test_compile_nes_example() -> None:
    project = compile_project(ROOT / "examples" / "js" / "nes")
    assert project.name == "NES (NROM)"
    sprite = _sprite(project)
    blocks = sprite["blocks"]
    proccodes = _proccodes(blocks)
    assert "cpuStep" in proccodes
    assert "renderFrame" in proccodes
    assert "runSlice" in proccodes
    assert any(code.startswith("cpuRead") for code in proccodes)
    assert _by_opcode(blocks, "control_forever")
    assert _by_opcode(blocks, "sensing_keypressed")
    assert _by_opcode(blocks, "pen_penDown")
    assert "pen" in project.to_dict()["extensions"]
    rom = _list_named(sprite, "rom")
    pal = _list_named(sprite, "pal")
    assert rom is not None
    assert pal is not None
    assert len(rom) == 24592
    assert len(pal) == 64


def test_nes_rom_txt_matches_ines() -> None:
    raw = (ROOT / "examples" / "js" / "nes" / "nestest.nes").read_bytes()
    lines = (ROOT / "examples" / "js" / "nes" / "rom.txt").read_text(encoding="utf-8").splitlines()
    assert raw[:4] == b"NES\x1a"
    assert [int(line) for line in lines] == list(raw)


def test_ternary_lowers_to_if_else() -> None:
    source = """
    function pick(x) {
      return x > 0 ? 1 : 0;
    }
    console.log(pick(2));
    """
    project = compile_js(source, sprite="Cat")
    blocks = _sprite_blocks(project)
    assert _by_opcode(blocks, "control_if_else")


def test_load_bin_packs_little_endian_u32(tmp_path: Path) -> None:
    blob = tmp_path / "words.bin"
    blob.write_bytes(bytes([0x44, 0x33, 0x22, 0x11, 0x78, 0x56, 0x34, 0x12, 0xFF]))
    source = tmp_path / "Cat.js"
    source.write_text('let words = loadBin("words.bin");\nconsole.log(words[0], words.length);\n', encoding="utf-8")
    project = compile_js(source.read_text(encoding="utf-8"), sprite="Cat", filename=str(source))
    sprite = _sprite(project)
    words = _list_named(sprite, "words")
    assert words is not None
    from scratch3.refs import BinaryU32Source, iter_u32_le

    assert isinstance(words, BinaryU32Source)
    packed = list(iter_u32_le(words.path))
    assert packed == [0x11223344, 0x12345678, 0x000000FF]

    out = tmp_path / "out.sb3"
    project.save(out)
    with zipfile.ZipFile(out) as archive:
        data = json.loads(archive.read("project.json"))
    cat = next(target for target in data["targets"] if not target["isStage"])
    baked = None
    for entry in cat["lists"].values():
        if entry[0] == "words":
            baked = entry[1]
            break
    assert baked == [0x11223344, 0x12345678, 0x000000FF]


def _cloud_entries(project) -> list[list]:
    return [entry for entry in _stage(project)["variables"].values() if entry[0].startswith("☁")]


def test_cloud_vars_omitted_when_unused() -> None:
    project = compile_js('console.log("hi");', sprite="Cat")
    assert _cloud_entries(project) == []
    codes = _proccodes(_sprite_blocks(project))
    assert "getCloudVariable %s" not in codes
    assert "setCloudVariable %s %s" not in codes


def test_cloud_const_index_direct_get_set() -> None:
    source = """
    setCloudVariable(0, 42);
    console.log(getCloudVariable(0));
    setCloudVariable(1 + 2, 7);
    console.log(getCloudVariable(3));
    """
    project = compile_js(source, sprite="Cat")
    clouds = _cloud_entries(project)
    assert len(clouds) == 10
    assert all(entry[2] is True for entry in clouds)
    names = [entry[0] for entry in clouds]
    assert names == [f"☁ cloud{i}" for i in range(10)]
    assert all(name not in _var_names(_sprite(project)) for name in names)

    blocks = _sprite_blocks(project)
    codes = _proccodes(blocks)
    assert "getCloudVariable %s" not in codes
    assert "setCloudVariable %s %s" not in codes

    sets = [
        node
        for _, node in _by_opcode(blocks, "data_setvariableto")
        if node["fields"]["VARIABLE"][0].startswith("☁")
    ]
    set_names = [node["fields"]["VARIABLE"][0] for node in sets]
    assert "☁ cloud0" in set_names
    assert "☁ cloud3" in set_names

    says = _by_opcode(blocks, "looks_say")
    assert says
    message = says[0][1]["inputs"]["MESSAGE"]
    assert message[1][0] == 12
    assert message[1][1] == "☁ cloud0"


def test_cloud_const_index_out_of_range() -> None:
    with pytest.raises(CompileError, match="out of range"):
        compile_js("setCloudVariable(10, 1);")
    with pytest.raises(CompileError, match="out of range"):
        compile_js("console.log(getCloudVariable(-1));")
    with pytest.raises(CompileError, match="out of range"):
        compile_js("setCloudVariable(5 + 5, 1);")
    with pytest.raises(CompileError, match="integer"):
        compile_js("setCloudVariable(1.5, 1);")


def test_cloud_dynamic_index_custom_block() -> None:
    source = """
    let i = 0;
    setCloudVariable(i, 5);
    console.log(getCloudVariable(i));
    """
    project = compile_js(source, sprite="Cat")
    assert len(_cloud_entries(project)) == 10
    blocks = _sprite_blocks(project)
    codes = _proccodes(blocks)
    assert "getCloudVariable %s" in codes
    assert "setCloudVariable %s %s" in codes
    assert len(_definition_body_ids(blocks, "getCloudVariable %s")) == 11
    assert len(_definition_body_ids(blocks, "setCloudVariable %s %s")) == 10
    assert _by_opcode(blocks, "control_if")
    calls = _by_opcode(blocks, "procedures_call")
    procodes = [(block.get("mutation") or {}).get("proccode") for _, block in calls]
    assert "getCloudVariable %s" in procodes
    assert "setCloudVariable %s %s" in procodes


def test_cloud_reserved_builtin() -> None:
    with pytest.raises(CompileError, match="reserved builtin"):
        compile_js("function getCloudVariable(idx) { return idx; }")
    with pytest.raises(CompileError, match="takes 1 argument"):
        compile_js("getCloudVariable();")
    with pytest.raises(CompileError, match="takes 2 argument"):
        compile_js("setCloudVariable(0);")



