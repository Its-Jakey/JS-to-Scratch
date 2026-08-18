"""Lower a JavaScript-subset AST into scratch3 blocks."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from scratch3.blocks import (
    Add,
    AddToList,
    And,
    ChangeVariable,
    CustomBlock,
    Define,
    DeleteAllOfList,
    Divide,
    Equals,
    GreaterThan,
    If,
    IfElse,
    ItemOfList,
    Join,
    LengthOf,
    LengthOfList,
    LessThan,
    LetterOf,
    MathOp,
    Mod,
    Multiply,
    Not,
    Or,
    PickRandom,
    RepeatUntil,
    ReplaceItemOfList,
    Round,
    Say,
    SetVariable,
    Stop,
    Subtract,
    WhenFlagClicked,
    Forever,
)
from scratch3.blocks.spec import BooleanBlock
from scratch3.project import Project
from scratch3.refs import List, Variable, load_list_file
from scratch3.target import Target

from js2scratch.ast import (
    ArrayLiteral,
    Assign,
    Binary,
    Block,
    Break,
    Call,
    DoWhile,
    ExpressionStmt,
    For,
    FunctionDecl,
    Identifier,
    If as IfNode,
    Index,
    Literal,
    Member,
    Node,
    Program,
    Return,
    Switch,
    Unary,
    Update,
    VarDecl,
    While,
)
from js2scratch.bitwise import (
    and_expr,
    and_lut_values,
    const_bits,
    fold_bitwise,
    fold_not,
    mask_modulus,
    pow2_lut_values,
    to_int32,
    to_uint32,
)
from js2scratch.builtins import (
    ALLOWED_MATH,
    DRAW_BUILTINS,
    MATH_UNARY,
    PEN_METHODS,
    RESERVED_BUILTINS,
)
from js2scratch.errors import CompileError
from js2scratch.parser import parse

NUMBER = "number"
STRING = "string"
BOOLEAN = "boolean"
ARRAY = "array"
UNKNOWN = "unknown"
VOID = "void"


@dataclass
class Lowered:
    blocks: list[Any]
    value: Any = ""
    type: str = UNKNOWN
    bits: int | None = None


@dataclass
class NameInfo:
    js_name: str
    scratch_name: str
    is_list: bool = False
    is_var: bool = False
    type: str = UNKNOWN
    declared: bool = False
    line: int = 1
    column: int = 1
    variable: Variable | None = None
    lst: List | None = None
    bits: int | None = None


@dataclass
class FuncInfo:
    node: FunctionDecl
    custom: CustomBlock | None = None
    locals: dict[str, NameInfo] = field(default_factory=dict)


class Compiler:
    def __init__(self, target: Target, filename: str | None = None) -> None:
        self.target = target
        self.filename = filename
        self.base_dir = Path(filename).resolve().parent if filename else Path.cwd()
        self.globals: dict[str, NameInfo] = {}
        self.functions: dict[str, FuncInfo] = {}
        self.func_name: str | None = None
        self.ret: Variable | None = None
        self.js_add: CustomBlock | None = None
        self.bw_ops: dict[str, tuple[CustomBlock, Variable]] = {}
        self.and_lut: List | None = None
        self.pow2_lut: List | None = None
        self.temp_i = 0
        self.loop_i = 0
        self.arr_i = 0
        self.switch_i = 0
        self.switch_depth = 0
        self.loop_depth = 0
        self.sw_ret: Variable | None = None
        self.sw_ret_needed = False

    def compile(self, program: Program) -> None:
        self._collect(program)
        self.ret = self.target.variable("__return", 0)
        for info in (*self.globals.values(), *(loc for fn in self.functions.values() for loc in fn.locals.values())):
            self._materialize(info)
        for fname, fn in self.functions.items():
            fn.custom = CustomBlock(fname, fn.node.params, warp=True)
        for fname, fn in self.functions.items():
            self._emit_function(fn)
        main: list[Any] = []
        for stmt in program.body:
            if isinstance(stmt, FunctionDecl):
                continue
            main.extend(self._stmt(stmt))
        if main:
            self.target.add_script(WhenFlagClicked(*main))

    def _error(self, message: str, node: Node | None = None) -> CompileError:
        return CompileError(
            message,
            line=None if node is None else node.line,
            column=None if node is None else node.column,
            filename=self.filename,
        )

    def _scope(self) -> dict[str, NameInfo]:
        if self.func_name is not None:
            return self.functions[self.func_name].locals
        return self.globals

    def _scratch_name(self, js_name: str, func: str | None = None) -> str:
        if func is None:
            return js_name
        return f"{func}__{js_name}"

    def _materialize(self, info: NameInfo) -> None:
        if info.is_list:
            info.lst = self.target.list(info.scratch_name, [])
        else:
            info.is_var = True
            info.variable = self.target.variable(info.scratch_name, 0)

    def _declare(self, name: str, node: Node, *, func: str | None, is_list: bool, typ: str) -> NameInfo:
        scope = self.globals if func is None else self.functions[func].locals
        existing = scope.get(name)
        if existing and existing.declared:
            raise self._error(f"redeclaration of {name!r}", node)
        if name in self.functions and func is None:
            raise self._error(f"{name!r} is already a function", node)
        if existing is None:
            existing = NameInfo(
                js_name=name,
                scratch_name=self._scratch_name(name, func),
                line=node.line,
                column=node.column,
            )
            scope[name] = existing
        existing.declared = True
        existing.line = node.line
        existing.column = node.column
        if is_list:
            if existing.is_var and existing.type not in (UNKNOWN, ARRAY):
                raise self._error(f"{name!r} is used both as a value and as an array", node)
            existing.is_list = True
            existing.type = ARRAY
        else:
            if existing.is_list:
                raise self._error(f"{name!r} is used both as a value and as an array", node)
            existing.is_var = True
            if typ != UNKNOWN:
                existing.type = typ
        return existing

    def _mark_list(self, name: str, node: Node, func: str | None) -> None:
        scope = self.globals if func is None else self.functions[func].locals
        info = scope.get(name)
        if info is None and func is not None:
            info = self.globals.get(name)
        if info is None:
            info = NameInfo(js_name=name, scratch_name=self._scratch_name(name, func), declared=False)
            scope[name] = info
        if info.is_var and info.type == STRING:
            return
        if info.is_var and info.type not in (UNKNOWN, ARRAY):
            raise self._error(f"{name!r} is used both as a value and as an array", node)
        info.is_list = True
        info.type = ARRAY

    def _collect(self, program: Program) -> None:
        for stmt in program.body:
            if isinstance(stmt, FunctionDecl):
                if stmt.name in self.functions:
                    raise self._error(f"redeclaration of function {stmt.name!r}", stmt)
                if stmt.name in RESERVED_BUILTINS:
                    raise self._error(f"{stmt.name!r} is a reserved builtin", stmt)
                self.functions[stmt.name] = FuncInfo(node=stmt)
        # Declare top-level names first so functions can use global arrays.
        for stmt in program.body:
            if not isinstance(stmt, FunctionDecl):
                self._walk_stmt(stmt, None)
        for stmt in program.body:
            if isinstance(stmt, FunctionDecl):
                for param in stmt.params:
                    self._declare(param, stmt, func=stmt.name, is_list=False, typ=UNKNOWN)
                self._walk_stmts(stmt.body, stmt.name)

    def _walk_stmts(self, stmts: list[Node], func: str | None) -> None:
        for stmt in stmts:
            self._walk_stmt(stmt, func)

    def _walk_stmt(self, node: Node | None, func: str | None) -> None:
        if node is None:
            return
        if isinstance(node, FunctionDecl):
            raise self._error("nested function declarations are not supported", node)
        if isinstance(node, Block):
            self._walk_stmts(node.body, func)
            return
        if isinstance(node, VarDecl):
            is_list = isinstance(node.init, ArrayLiteral) or _is_load_list_call(node.init)
            typ = ARRAY if is_list else self._literal_type(node.init)
            self._declare(node.name, node, func=func, is_list=is_list, typ=typ)
            self._walk_expr(node.init, func)
            return
        if isinstance(node, IfNode):
            self._walk_expr(node.test, func)
            self._walk_stmt(node.consequent, func)
            self._walk_stmt(node.alternate, func)
            return
        if isinstance(node, (While, DoWhile)):
            self._walk_expr(node.test, func)
            self._walk_stmt(node.body, func)
            return
        if isinstance(node, For):
            self._walk_stmt(node.init, func) if isinstance(node.init, VarDecl) else self._walk_expr(node.init, func)
            self._walk_expr(node.test, func)
            self._walk_expr(node.update, func)
            self._walk_stmt(node.body, func)
            return
        if isinstance(node, Return):
            self._walk_expr(node.argument, func)
            return
        if isinstance(node, Switch):
            self._walk_expr(node.discriminant, func)
            for case in node.cases:
                self._walk_expr(case.test, func)
                self._walk_stmts(case.body, func)
            return
        if isinstance(node, Break):
            return
        if isinstance(node, ExpressionStmt):
            self._walk_expr(node.expression, func)
            return

    def _walk_expr(self, node: Node | None, func: str | None) -> None:
        if node is None:
            return
        if isinstance(node, ArrayLiteral):
            for el in node.elements:
                self._walk_expr(el, func)
            return
        if isinstance(node, (Binary, Assign)):
            if isinstance(node, Assign) and isinstance(node.left, Identifier) and (
                isinstance(node.right, ArrayLiteral) or _is_load_list_call(node.right)
            ):
                self._mark_list(node.left.name, node, func)
            if isinstance(node, Assign) and isinstance(node.left, Index) and isinstance(node.left.object, Identifier):
                self._mark_list(node.left.object.name, node, func)
            self._walk_expr(node.left, func)
            self._walk_expr(node.right, func)
            return
        if isinstance(node, (Unary, Update)):
            if isinstance(node, Update) and isinstance(node.argument, Index) and isinstance(node.argument.object, Identifier):
                self._mark_list(node.argument.object.name, node, func)
            self._walk_expr(node.argument, func)
            return
        if isinstance(node, Call):
            if isinstance(node.callee, Member) and node.callee.property == "push" and isinstance(node.callee.object, Identifier):
                self._mark_list(node.callee.object.name, node, func)
            self._walk_expr(node.callee, func)
            for arg in node.arguments:
                self._walk_expr(arg, func)
            return
        if isinstance(node, Member):
            self._walk_expr(node.object, func)
            return
        if isinstance(node, Index):
            if isinstance(node.object, Identifier):
                scope = self.globals if func is None else self.functions[func].locals
                info = scope.get(node.object.name) or (self.globals.get(node.object.name) if func else None)
                if info is None or info.type != STRING:
                    self._mark_list(node.object.name, node, func)
            self._walk_expr(node.object, func)
            self._walk_expr(node.index, func)
            return

    def _literal_type(self, node: Node | None) -> str:
        if isinstance(node, Literal):
            return {"number": NUMBER, "string": STRING, "boolean": BOOLEAN, "null": UNKNOWN}[node.kind]
        if isinstance(node, ArrayLiteral):
            return ARRAY
        return UNKNOWN

    def _lookup(self, name: str, node: Node) -> NameInfo:
        if self.func_name is not None:
            local = self.functions[self.func_name].locals.get(name)
            if local is not None:
                if not local.declared:
                    raise self._error(f"undeclared variable {name!r}", node)
                return local
        info = self.globals.get(name)
        if info is not None:
            if not info.declared:
                raise self._error(f"undeclared variable {name!r}", node)
            return info
        if name in self.functions:
            raise self._error("first-class functions are not supported", node)
        raise self._error(f"undeclared variable {name!r}", node)

    def _new_temp(self) -> Variable:
        self.temp_i += 1
        return self.target.variable(f"__t{self.temp_i}", 0)

    def _new_loop_flag(self) -> Variable:
        self.loop_i += 1
        return self.target.variable(f"__loop{self.loop_i}", 0)

    def _new_array(self) -> List:
        self.arr_i += 1
        return self.target.list(f"__arr{self.arr_i}", [])

    def _as_boolean(self, value: Any) -> Any:
        if isinstance(value, BooleanBlock):
            return value
        if isinstance(value, bool):
            return Equals(1, 1) if value else Equals(1, 0)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return Equals(1, 1) if value != 0 else Equals(1, 0)
        if isinstance(value, str):
            return Equals(1, 0) if value == "" else Equals(1, 1)
        return Not(Or(Equals(value, 0), Equals(value, "")))

    def _ensure_js_add(self) -> CustomBlock:
        if self.js_add is not None:
            return self.js_add
        self.js_add = CustomBlock("__js_add %s %s", ["a", "b"], warp=True)
        a = self.js_add["a"]
        b = self.js_add["b"]
        numeric = And(
            And(Equals(Multiply(a, 1), a), Equals(Multiply(b, 1), b)),
            And(Not(Equals(a, "")), Not(Equals(b, ""))),
        )
        self.target.add_script(
            Define(
                self.js_add,
                IfElse(
                    numeric,
                    SetVariable(self.ret, Add(a, b)),
                    SetVariable(self.ret, Join(a, b)),
                ),
            )
        )
        return self.js_add

    def _numeric_const(self, lowered: Lowered) -> int | float | None:
        if lowered.blocks:
            return None
        value = lowered.value
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)):
            return value
        return None

    def _and_width(self, left: Lowered, right: Lowered) -> int:
        known = [bits for bits in (left.bits, right.bits) if bits is not None]
        return min(known) if known else 32

    def _or_width(self, left: Lowered, right: Lowered) -> int:
        if left.bits is None or right.bits is None:
            return 32
        return max(left.bits, right.bits)

    def _ensure_and_lut(self) -> List:
        if self.and_lut is None:
            self.and_lut = self.target.list("andLUT", and_lut_values())
        return self.and_lut

    def _ensure_pow2_lut(self) -> List:
        if self.pow2_lut is None:
            self.pow2_lut = self.target.list("pow2LUT", pow2_lut_values())
        return self.pow2_lut

    def _ensure_bw(self, kind: str, bits: int) -> tuple[CustomBlock, Variable]:
        key = f"{kind}{bits}"
        existing = self.bw_ops.get(key)
        if existing is not None:
            return existing
        ret = self.target.variable(f"{key}_return", 0)
        custom = CustomBlock(f"{key} %s %s", ["a", "b"], warp=True)
        a = custom["a"]
        b = custom["b"]
        if kind == "AND":
            body = [SetVariable(ret, and_expr(a, b, bits, self._ensure_and_lut()))]
        else:
            and_custom, and_ret = self._ensure_bw("AND", bits)
            and_result = and_ret
            if kind == "OR":
                result = Subtract(Add(a, b), and_result)
            else:
                result = Subtract(Add(a, b), Multiply(2, and_result))
            body = [and_custom(a, b), SetVariable(ret, result)]
        self.target.add_script(Define(custom, *body))
        self.bw_ops[key] = (custom, ret)
        return custom, ret

    def _call_bw(self, kind: str, bits: int, left: Lowered, right: Lowered) -> Lowered:
        custom, ret = self._ensure_bw(kind, bits)
        blocks = [*left.blocks, *right.blocks, custom(left.value, right.value)]
        tmp = self._new_temp()
        blocks.append(SetVariable(tmp, ret))
        return Lowered(blocks, tmp, NUMBER, bits=bits)

    def _bitwise_not(self, arg: Lowered) -> Lowered:
        constant = self._numeric_const(arg)
        if constant is not None:
            value = fold_not(constant)
            return Lowered(arg.blocks, value, NUMBER, bits=const_bits(value))
        return Lowered(arg.blocks, Subtract(-1, arg.value), NUMBER, bits=32)

    def _bitwise(self, op: str, left: Lowered, right: Lowered, node: Node) -> Lowered:
        left_c = self._numeric_const(left)
        right_c = self._numeric_const(right)
        if left_c is not None and right_c is not None:
            value = fold_bitwise(op, left_c, right_c)
            return Lowered([*left.blocks, *right.blocks], value, NUMBER, bits=const_bits(value))

        if op == "&":
            return self._bitwise_and(left, right, left_c, right_c)
        if op == "|":
            return self._bitwise_or_xor("OR", left, right, left_c, right_c)
        if op == "^":
            return self._bitwise_or_xor("XOR", left, right, left_c, right_c)
        if op in ("<<", ">>", ">>>"):
            return self._bitwise_shift(op, left, right, right_c)
        raise self._error(f"unsupported operator {op!r}", node)

    def _bitwise_and(
        self,
        left: Lowered,
        right: Lowered,
        left_c: int | float | None,
        right_c: int | float | None,
    ) -> Lowered:
        blocks = [*left.blocks, *right.blocks]
        if left_c is not None and to_uint32(left_c) == 0:
            return Lowered(blocks, 0, NUMBER, bits=8)
        if right_c is not None and to_uint32(right_c) == 0:
            return Lowered(blocks, 0, NUMBER, bits=8)
        if left_c is not None:
            modulus = mask_modulus(left_c)
            if modulus is not None:
                return Lowered(blocks, Mod(right.value, modulus), NUMBER, bits=const_bits(modulus - 1))
        if right_c is not None:
            modulus = mask_modulus(right_c)
            if modulus is not None:
                return Lowered(blocks, Mod(left.value, modulus), NUMBER, bits=const_bits(modulus - 1))
        return self._call_bw("AND", self._and_width(left, right), left, right)

    def _bitwise_or_xor(
        self,
        kind: str,
        left: Lowered,
        right: Lowered,
        left_c: int | float | None,
        right_c: int | float | None,
    ) -> Lowered:
        blocks = [*left.blocks, *right.blocks]
        if left_c is not None and to_uint32(left_c) == 0:
            return Lowered(blocks, right.value, NUMBER, bits=right.bits)
        if right_c is not None and to_uint32(right_c) == 0:
            return Lowered(blocks, left.value, NUMBER, bits=left.bits)
        return self._call_bw(kind, self._or_width(left, right), left, right)

    def _bitwise_shift(
        self,
        op: str,
        left: Lowered,
        right: Lowered,
        right_c: int | float | None,
    ) -> Lowered:
        blocks = [*left.blocks, *right.blocks]
        if right_c is not None:
            shift = to_int32(right_c) & 31
            if shift == 0:
                return Lowered(blocks, left.value, NUMBER, bits=left.bits)
            amount = 1 << shift
            if op == "<<":
                bits = 32 if left.bits is None or left.bits + shift > 16 else (16 if left.bits + shift > 8 else 8)
                return Lowered(blocks, Multiply(left.value, amount), NUMBER, bits=bits)
            bits = left.bits
            divided = MathOp("floor", Divide(left.value, amount))
            if op == ">>>":
                divided = MathOp("floor", Divide(Mod(left.value, 4294967296), amount))
                bits = 32
            return Lowered(blocks, divided, NUMBER, bits=bits)
        power = ItemOfList(Add(Mod(right.value, 32), 1), self._ensure_pow2_lut())
        if op == "<<":
            return Lowered(blocks, Multiply(left.value, power), NUMBER, bits=32)
        if op == ">>>":
            return Lowered(blocks, MathOp("floor", Divide(Mod(left.value, 4294967296), power)), NUMBER, bits=32)
        return Lowered(blocks, MathOp("floor", Divide(left.value, power)), NUMBER, bits=left.bits)

    def _emit_function(self, fn: FuncInfo) -> None:
        assert fn.custom is not None
        prev = self.func_name
        self.func_name = fn.node.name
        body: list[Any] = []
        for param in fn.node.params:
            info = fn.locals[param]
            if info.is_list:
                raise self._error("arrays cannot be function parameters", fn.node)
            body.append(SetVariable(info.variable, fn.custom[param]))
        for stmt in fn.node.body:
            self._extend_stack(body, self._stmt(stmt))
        # `stop this script` is a cap; chaining anything after it makes Blockly
        # crash on load (`nextConnection` is null).
        if not body or not self._is_cap_stop(body[-1]):
            body.append(SetVariable(self.ret, ""))
        self.target.add_script(Define(fn.custom, *body))
        self.func_name = prev

    def _is_cap_stop(self, block: Any) -> bool:
        if not isinstance(block, Stop):
            return False
        option = str(block.fields.get("STOP_OPTION", "all"))
        return option in ("this script", "all")

    def _extend_stack(self, dest: list[Any], src: list[Any]) -> list[Any]:
        for block in src:
            if dest and self._is_cap_stop(dest[-1]):
                break
            dest.append(block)
        return dest

    def _stmt(self, node: Node | None) -> list[Any]:
        if node is None:
            return []
        if isinstance(node, Block):
            blocks: list[Any] = []
            for stmt in node.body:
                self._extend_stack(blocks, self._stmt(stmt))
            return blocks
        if isinstance(node, FunctionDecl):
            raise self._error("nested function declarations are not supported", node)
        if isinstance(node, VarDecl):
            return self._var_decl(node)
        if isinstance(node, IfNode):
            return self._if(node)
        if isinstance(node, While):
            return self._while(node)
        if isinstance(node, DoWhile):
            return self._do_while(node)
        if isinstance(node, For):
            return self._for(node)
        if isinstance(node, Switch):
            return self._switch(node)
        if isinstance(node, Break):
            return self._break(node)
        if isinstance(node, Return):
            return self._return(node)
        if isinstance(node, ExpressionStmt):
            return self._expr(node.expression, used=False).blocks
        raise self._error(f"unsupported statement {type(node).__name__}", node)

    def _var_decl(self, node: VarDecl) -> list[Any]:
        info = self._lookup(node.name, node)
        if node.init is None:
            if info.is_list:
                return [DeleteAllOfList(info.lst)]
            return [SetVariable(info.variable, 0)]
        if info.is_list or isinstance(node.init, ArrayLiteral) or _is_load_list_call(node.init):
            return self._fill_list(info.lst if info.lst is not None else self._lookup(node.name, node).lst, node.init)
        lowered = self._expr(node.init)
        info.type = lowered.type if lowered.type != UNKNOWN else info.type
        info.bits = lowered.bits
        return [*lowered.blocks, SetVariable(info.variable, lowered.value)]

    def _constant_array_values(self, node: ArrayLiteral) -> list[Any] | None:
        values: list[Any] = []
        for el in node.elements:
            if el is None:
                values.append("")
                continue
            if not isinstance(el, Literal):
                return None
            if el.kind == "boolean":
                values.append(1 if el.value else 0)
            elif el.kind == "null":
                values.append("")
            elif el.kind == "number" and isinstance(el.value, float) and el.value.is_integer():
                values.append(int(el.value))
            else:
                values.append(el.value)
        return values

    def _fill_list(self, lst: List | None, node: Node) -> list[Any]:
        if lst is None:
            raise self._error("internal error: missing list", node)
        if _is_load_list_call(node):
            values = self._read_load_list(node)
            lst.values = values
            if not values:
                return [DeleteAllOfList(lst)]
            return []
        if isinstance(node, ArrayLiteral):
            const_values = self._constant_array_values(node)
            if const_values is not None:
                lst.values = const_values
                if not const_values:
                    return [DeleteAllOfList(lst)]
                return []
        blocks: list[Any] = [DeleteAllOfList(lst)]
        if isinstance(node, ArrayLiteral):
            for el in node.elements:
                if el is None:
                    blocks.append(AddToList("", lst))
                else:
                    lowered = self._expr(el)
                    blocks.extend(lowered.blocks)
                    blocks.append(AddToList(lowered.value, lst))
            return blocks
        lowered = self._expr(node)
        blocks.extend(lowered.blocks)
        if lowered.type == ARRAY or isinstance(lowered.value, List):
            source = lowered.value
            index = self._new_temp()
            blocks.append(SetVariable(index, 1))
            blocks.append(
                RepeatUntil(
                    GreaterThan(index, LengthOfList(source)),
                    AddToList(ItemOfList(index, source), lst),
                    ChangeVariable(index, 1),
                )
            )
            return blocks
        raise self._error("cannot assign a non-array value to an array", node)

    def _condition(self, node: Node) -> tuple[list[Any], Any]:
        lowered = self._expr(node)
        return lowered.blocks, self._as_boolean(lowered.value)

    def _is_always_true(self, node: Node) -> bool:
        return isinstance(node, Literal) and node.kind == "boolean" and node.value is True

    def _if(self, node: IfNode) -> list[Any]:
        assert node.test is not None
        prelude, cond = self._condition(node.test)
        then_blocks = self._stmt(node.consequent)
        if node.alternate is None:
            return [*prelude, If(cond, then=then_blocks)]
        else_blocks = self._stmt(node.alternate)
        return [*prelude, IfElse(cond, then_blocks, else_blocks)]

    def _while(self, node: While) -> list[Any]:
        assert node.test is not None
        self.loop_depth += 1
        try:
            body = self._stmt(node.body)
        finally:
            self.loop_depth -= 1
        if self._is_always_true(node.test):
            return [Forever(*body)]
        prelude, cond = self._condition(node.test)
        if not prelude:
            return [RepeatUntil(Not(cond), *body)]
        flag = self._new_loop_flag()
        return [
            SetVariable(flag, 1),
            RepeatUntil(
                Equals(flag, 0),
                *prelude,
                IfElse(cond, body, [SetVariable(flag, 0)]),
            ),
        ]

    def _do_while(self, node: DoWhile) -> list[Any]:
        assert node.test is not None
        self.loop_depth += 1
        try:
            body = self._stmt(node.body)
        finally:
            self.loop_depth -= 1
        if self._is_always_true(node.test):
            return [Forever(*body)]
        prelude, cond = self._condition(node.test)
        flag = self._new_loop_flag()
        return [
            SetVariable(flag, 1),
            RepeatUntil(
                Equals(flag, 0),
                *body,
                *prelude,
                If(Not(cond), SetVariable(flag, 0)),
            ),
        ]

    def _for(self, node: For) -> list[Any]:
        blocks: list[Any] = []
        if isinstance(node.init, VarDecl):
            blocks.extend(self._stmt(node.init))
        elif node.init is not None:
            blocks.extend(self._expr(node.init, used=False).blocks)
        self.loop_depth += 1
        try:
            body = self._stmt(node.body)
        finally:
            self.loop_depth -= 1
        if node.update is not None:
            self._extend_stack(body, self._expr(node.update, used=False).blocks)
        if node.test is None or self._is_always_true(node.test):
            blocks.append(Forever(*body))
            return blocks
        prelude, cond = self._condition(node.test)
        if not prelude:
            blocks.append(RepeatUntil(Not(cond), *body))
            return blocks
        flag = self._new_loop_flag()
        blocks.extend(
            [
                SetVariable(flag, 1),
                RepeatUntil(
                    Equals(flag, 0),
                    *prelude,
                    IfElse(cond, body, [SetVariable(flag, 0)]),
                ),
            ]
        )
        return blocks

    def _contains_return(self, node: Node | None) -> bool:
        if node is None:
            return False
        if isinstance(node, Return):
            return True
        if isinstance(node, Block):
            return any(self._contains_return(stmt) for stmt in node.body)
        if isinstance(node, IfNode):
            return self._contains_return(node.consequent) or self._contains_return(node.alternate)
        if isinstance(node, (While, DoWhile)):
            return self._contains_return(node.body)
        if isinstance(node, For):
            init_ret = isinstance(node.init, VarDecl) and self._contains_return(node.init)
            return init_ret or self._contains_return(node.body)
        if isinstance(node, Switch):
            return any(self._contains_return(stmt) for case in node.cases for stmt in case.body)
        return False

    def _ensure_sw_ret(self) -> Variable:
        if self.sw_ret is None:
            self.sw_ret = self.target.variable("__sw_ret", 0)
        return self.sw_ret

    def _switch(self, node: Switch) -> list[Any]:
        assert node.discriminant is not None
        self.switch_i += 1
        n = self.switch_i
        disc = self.target.variable(f"__sw{n}_disc", 0)
        lowered = self._expr(node.discriminant)
        blocks = [*lowered.blocks, SetVariable(disc, lowered.value)]

        needs_ret = self.func_name is not None and any(
            self._contains_return(stmt) for case in node.cases for stmt in case.body
        )
        if needs_ret:
            blocks.append(SetVariable(self._ensure_sw_ret(), 0))

        case_customs = [CustomBlock(f"__sw{n}_c{i}", [], warp=True) for i in range(len(node.cases))]
        dispatcher = CustomBlock(f"__sw{n}", [], warp=True)

        prev_depth = self.switch_depth
        prev_needed = self.sw_ret_needed
        self.switch_depth += 1
        self.sw_ret_needed = needs_ret or prev_needed
        try:
            for i, case in enumerate(node.cases):
                body: list[Any] = []
                for stmt in case.body:
                    self._extend_stack(body, self._stmt(stmt))
                if (not body or not self._is_cap_stop(body[-1])) and i + 1 < len(node.cases):
                    body.append(case_customs[i + 1]())
                self.target.add_script(Define(case_customs[i], *body))

            dispatch_body: list[Any] = []
            default_index: int | None = None
            for i, case in enumerate(node.cases):
                if case.test is None:
                    default_index = i
                    continue
                test = self._expr(case.test)
                dispatch_body.extend(test.blocks)
                dispatch_body.append(
                    If(
                        Equals(disc, test.value),
                        then=[case_customs[i](), Stop("this script")],
                    )
                )
            if default_index is not None:
                dispatch_body.append(case_customs[default_index]())
            self.target.add_script(Define(dispatcher, *dispatch_body))
        finally:
            self.switch_depth = prev_depth
            self.sw_ret_needed = prev_needed

        blocks.append(dispatcher())
        if needs_ret:
            blocks.append(If(Equals(self.sw_ret, 1), then=[Stop("this script")]))
        return blocks

    def _break(self, node: Break) -> list[Any]:
        if self.loop_depth:
            raise self._error("break in loops is not supported", node)
        if self.switch_depth <= 0:
            raise self._error("break outside of switch", node)
        return [Stop("this script")]

    def _return(self, node: Return) -> list[Any]:
        if self.func_name is None:
            raise self._error("return outside of function", node)
        if node.argument is None:
            blocks: list[Any] = [SetVariable(self.ret, "")]
        else:
            lowered = self._expr(node.argument)
            blocks = [*lowered.blocks, SetVariable(self.ret, lowered.value)]
        if self.sw_ret_needed:
            blocks.append(SetVariable(self._ensure_sw_ret(), 1))
        blocks.append(Stop("this script"))
        return blocks

    def _expr(self, node: Node | None, used: bool = True) -> Lowered:
        if node is None:
            return Lowered([], "", UNKNOWN)
        if isinstance(node, Literal):
            return self._literal(node)
        if isinstance(node, Identifier):
            return self._identifier(node)
        if isinstance(node, ArrayLiteral):
            return self._array_literal(node)
        if isinstance(node, Binary):
            return self._binary(node)
        if isinstance(node, Unary):
            return self._unary(node)
        if isinstance(node, Update):
            return self._update(node)
        if isinstance(node, Assign):
            return self._assign(node)
        if isinstance(node, Call):
            return self._call(node, used=used)
        if isinstance(node, Member):
            return self._member(node)
        if isinstance(node, Index):
            return self._index(node)
        raise self._error(f"unsupported expression {type(node).__name__}", node)

    def _literal(self, node: Literal) -> Lowered:
        if node.kind == "number":
            bits = const_bits(node.value) if isinstance(node.value, (int, float)) else None
            return Lowered([], node.value, NUMBER, bits=bits)
        if node.kind == "string":
            return Lowered([], node.value, STRING)
        if node.kind == "boolean":
            return Lowered([], 1 if node.value else 0, BOOLEAN, bits=8)
        return Lowered([], "", UNKNOWN)

    def _identifier(self, node: Identifier) -> Lowered:
        if node.name in RESERVED_BUILTINS:
            raise self._error(f"{node.name} cannot be used as a value", node)
        info = self._lookup(node.name, node)
        if info.is_list:
            return Lowered([], info.lst, ARRAY)
        return Lowered([], info.variable, info.type, bits=info.bits)

    def _array_literal(self, node: ArrayLiteral) -> Lowered:
        lst = self._new_array()
        return Lowered(self._fill_list(lst, node), lst, ARRAY)

    def _binary(self, node: Binary) -> Lowered:
        op = node.op
        if op == "&&":
            return self._logic_and(node)
        if op == "||":
            return self._logic_or(node)
        left = self._expr(node.left)
        right = self._expr(node.right)
        blocks = [*left.blocks, *right.blocks]
        lv, rv = left.value, right.value
        if op == "+":
            return self._add(blocks, left, right, node)
        arith = {"-": Subtract, "*": Multiply, "/": Divide, "%": Mod}
        if op in arith:
            return Lowered(blocks, arith[op](lv, rv), NUMBER)
        if op in ("==", "==="):
            return Lowered(blocks, Equals(lv, rv), BOOLEAN)
        if op in ("!=", "!=="):
            return Lowered(blocks, Not(Equals(lv, rv)), BOOLEAN)
        if op == "<":
            return Lowered(blocks, LessThan(lv, rv), BOOLEAN)
        if op == ">":
            return Lowered(blocks, GreaterThan(lv, rv), BOOLEAN)
        if op == "<=":
            return Lowered(blocks, Not(GreaterThan(lv, rv)), BOOLEAN)
        if op == ">=":
            return Lowered(blocks, Not(LessThan(lv, rv)), BOOLEAN)
        if op in ("&", "|", "^", "<<", ">>", ">>>"):
            return self._bitwise(op, left, right, node)
        raise self._error(f"unsupported operator {op!r}", node)

    def _add(self, blocks: list[Any], left: Lowered, right: Lowered, node: Node) -> Lowered:
        if left.type == STRING or right.type == STRING:
            return Lowered(blocks, Join(left.value, right.value), STRING)
        numeric = {NUMBER, BOOLEAN}
        if left.type in numeric and right.type in numeric:
            return Lowered(blocks, Add(left.value, right.value), NUMBER)
        helper = self._ensure_js_add()
        blocks.append(helper(left.value, right.value))
        tmp = self._new_temp()
        blocks.append(SetVariable(tmp, self.ret))
        return Lowered(blocks, tmp, UNKNOWN)

    def _logic_and(self, node: Binary) -> Lowered:
        left = self._expr(node.left)
        right = self._expr(node.right)
        tmp = self._new_temp()
        blocks = [*left.blocks, SetVariable(tmp, left.value)]
        then_blocks = [*right.blocks, SetVariable(tmp, right.value)]
        blocks.append(If(self._as_boolean(tmp), then=then_blocks))
        return Lowered(blocks, tmp, UNKNOWN)

    def _logic_or(self, node: Binary) -> Lowered:
        left = self._expr(node.left)
        right = self._expr(node.right)
        tmp = self._new_temp()
        blocks = [*left.blocks, SetVariable(tmp, left.value)]
        else_blocks = [*right.blocks, SetVariable(tmp, right.value)]
        blocks.append(If(Not(self._as_boolean(tmp)), then=else_blocks))
        return Lowered(blocks, tmp, UNKNOWN)

    def _unary(self, node: Unary) -> Lowered:
        arg = self._expr(node.argument)
        if node.op == "!":
            tmp = self._new_temp()
            blocks = [
                *arg.blocks,
                IfElse(self._as_boolean(arg.value), SetVariable(tmp, 0), SetVariable(tmp, 1)),
            ]
            return Lowered(blocks, tmp, BOOLEAN)
        if node.op == "-":
            return Lowered(arg.blocks, Subtract(0, arg.value), NUMBER)
        if node.op == "+":
            return Lowered(arg.blocks, Add(0, arg.value), NUMBER)
        if node.op == "~":
            return self._bitwise_not(arg)
        raise self._error(f"unsupported unary operator {node.op!r}", node)

    def _update(self, node: Update) -> Lowered:
        delta = 1 if node.op == "++" else -1
        target = node.argument
        if isinstance(target, Identifier):
            info = self._lookup(target.name, node)
            if info.is_list:
                raise self._error("cannot increment an array", node)
            var = info.variable
            info.bits = None
            if node.prefix:
                return Lowered([ChangeVariable(var, delta)], var, NUMBER)
            tmp = self._new_temp()
            return Lowered([SetVariable(tmp, var), ChangeVariable(var, delta)], tmp, NUMBER)
        if isinstance(target, Index):
            obj = self._expr(target.object)
            idx = self._expr(target.index)
            scratch_index = Add(idx.value, 1)
            current = ItemOfList(scratch_index, obj.value)
            blocks = [*obj.blocks, *idx.blocks]
            if node.prefix:
                nxt = Add(current, delta) if delta == 1 else Subtract(current, 1)
                blocks.append(ReplaceItemOfList(scratch_index, obj.value, nxt))
                tmp = self._new_temp()
                blocks.append(SetVariable(tmp, ItemOfList(scratch_index, obj.value)))
                return Lowered(blocks, tmp, NUMBER)
            tmp = self._new_temp()
            blocks.append(SetVariable(tmp, current))
            nxt = Add(tmp, delta) if delta == 1 else Subtract(tmp, 1)
            blocks.append(ReplaceItemOfList(scratch_index, obj.value, nxt))
            return Lowered(blocks, tmp, NUMBER)
        raise self._error("invalid increment/decrement target", node)

    def _assign(self, node: Assign) -> Lowered:
        assert node.left is not None and node.right is not None
        if isinstance(node.left, Identifier):
            info = self._lookup(node.left.name, node)
            if node.op == "=":
                if info.is_list:
                    blocks = self._fill_list(info.lst, node.right)
                    return Lowered(blocks, info.lst, ARRAY)
                right = self._expr(node.right)
                info.type = right.type if right.type != UNKNOWN else info.type
                info.bits = right.bits
                return Lowered(
                    [*right.blocks, SetVariable(info.variable, right.value)],
                    info.variable,
                    info.type,
                    bits=right.bits,
                )
            if info.is_list:
                raise self._error("compound assignment to arrays is not supported", node)
            right = self._expr(node.right)
            current = Lowered([], info.variable, info.type, bits=info.bits)
            combined = self._compound(node.op, current, right, node)
            info.bits = combined.bits
            return Lowered(
                [*combined.blocks, SetVariable(info.variable, combined.value)],
                info.variable,
                combined.type,
                bits=combined.bits,
            )
        if isinstance(node.left, Index):
            if node.op != "=":
                raise self._error("compound assignment to array elements is not supported", node)
            obj = self._expr(node.left.object)
            idx = self._expr(node.left.index)
            right = self._expr(node.right)
            blocks = [*obj.blocks, *idx.blocks, *right.blocks]
            blocks.append(ReplaceItemOfList(Add(idx.value, 1), obj.value, right.value))
            return Lowered(blocks, right.value, right.type)
        raise self._error("invalid assignment target", node)

    def _compound(self, op: str, left: Lowered, right: Lowered, node: Node) -> Lowered:
        bitwise = {"&=": "&", "|=": "|", "^=": "^", "<<=": "<<", ">>=": ">>", ">>>=": ">>>"}
        if op in bitwise:
            return self._bitwise(bitwise[op], left, right, node)
        mapping = {"+=": "+", "-=": "-", "*=": "*", "/=": "/", "%=": "%"}
        binary = Binary(op=mapping[op], left=None, right=None, line=node.line, column=node.column)
        if op == "+=":
            return self._add([*left.blocks, *right.blocks], left, right, binary)
        arith = {"-=": Subtract, "*=": Multiply, "/=": Divide, "%=": Mod}
        return Lowered([*left.blocks, *right.blocks], arith[op](left.value, right.value), NUMBER)

    def _member(self, node: Member) -> Lowered:
        if isinstance(node.object, Identifier) and node.object.name in RESERVED_BUILTINS:
            raise self._error(
                f"{node.object.name}.{node.property} must be called, or is not supported",
                node,
            )
        if node.property != "length":
            raise self._error(
                f"property access is not supported (objects are stripped); .{node.property} is not allowed",
                node,
            )
        obj = self._expr(node.object)
        if obj.type == ARRAY or isinstance(obj.value, List):
            return Lowered(obj.blocks, LengthOfList(obj.value), NUMBER)
        return Lowered(obj.blocks, LengthOf(obj.value), NUMBER)

    def _index(self, node: Index) -> Lowered:
        obj = self._expr(node.object)
        idx = self._expr(node.index)
        blocks = [*obj.blocks, *idx.blocks]
        scratch_index = Add(idx.value, 1)
        if obj.type == STRING:
            return Lowered(blocks, LetterOf(scratch_index, obj.value), STRING)
        return Lowered(blocks, ItemOfList(scratch_index, obj.value), UNKNOWN)

    def _call(self, node: Call, used: bool) -> Lowered:
        callee = node.callee
        if isinstance(callee, Member):
            return self._call_member(node, callee, used)
        if isinstance(callee, Identifier):
            return self._call_ident(node, callee, used)
        raise self._error("that call is not supported", node)

    def _call_ident(self, node: Call, callee: Identifier, used: bool) -> Lowered:
        if callee.name == "loadList":
            return self._load_list(node)
        if callee.name in DRAW_BUILTINS and callee.name not in self.functions:
            return self._draw_builtin(node, callee.name)
        if callee.name not in self.functions:
            raise self._error(f"unknown function {callee.name!r}", callee)
        fn = self.functions[callee.name]
        assert fn.custom is not None
        if len(node.arguments) != len(fn.node.params):
            raise self._error(
                f"{callee.name}() expected {len(fn.node.params)} argument(s), got {len(node.arguments)}",
                node,
            )
        blocks: list[Any] = []
        values: list[Any] = []
        for arg in node.arguments:
            lowered = self._expr(arg)
            blocks.extend(lowered.blocks)
            values.append(lowered.value)
        blocks.append(fn.custom(*values))
        if not used:
            return Lowered(blocks, self.ret, UNKNOWN)
        tmp = self._new_temp()
        blocks.append(SetVariable(tmp, self.ret))
        return Lowered(blocks, tmp, UNKNOWN)

    def _call_member(self, node: Call, callee: Member, used: bool) -> Lowered:
        if isinstance(callee.object, Identifier) and callee.object.name == "console":
            if callee.property != "log":
                raise self._error(f"console.{callee.property} is not supported", node)
            return self._console_log(node, used)
        if isinstance(callee.object, Identifier) and callee.object.name == "pen":
            return self._pen_call(node, callee.property)
        if isinstance(callee.object, Identifier) and callee.object.name == "Math":
            return self._math_call(node, callee.property, used)
        if callee.property == "push":
            return self._array_push(node, callee, used)
        raise self._error(
            f"property access is not supported (objects are stripped); .{callee.property} is not allowed",
            node,
        )

    def _lower_args(self, node: Call) -> tuple[list[Any], list[Any]]:
        blocks: list[Any] = []
        values: list[Any] = []
        for arg in node.arguments:
            lowered = self._expr(arg)
            blocks.extend(lowered.blocks)
            values.append(lowered.value)
        return blocks, values

    def _draw_builtin(self, node: Call, name: str) -> Lowered:
        argc, factory, kind = DRAW_BUILTINS[name]
        if len(node.arguments) != argc:
            raise self._error(f"{name}() takes {argc} argument(s)", node)
        blocks, values = self._lower_args(node)
        result = factory(*values)
        if kind == "reporter":
            return Lowered(blocks, result, NUMBER)
        if kind == "boolean":
            return Lowered(blocks, result, BOOLEAN)
        blocks.append(result)
        return Lowered(blocks, "", VOID)

    def _pen_call(self, node: Call, name: str) -> Lowered:
        spec = PEN_METHODS.get(name)
        if spec is None:
            raise self._error(f"pen.{name} is not supported", node)
        argc, factory = spec
        if len(node.arguments) != argc:
            raise self._error(f"pen.{name}() takes {argc} argument(s)", node)
        blocks, values = self._lower_args(node)
        blocks.append(factory(*values))
        return Lowered(blocks, "", VOID)

    def _console_log(self, node: Call, used: bool) -> Lowered:
        blocks: list[Any] = []
        values: list[Any] = []
        for arg in node.arguments:
            lowered = self._expr(arg)
            blocks.extend(lowered.blocks)
            values.append(lowered.value)
        message: Any = ""
        if values:
            message = values[0]
            for value in values[1:]:
                message = Join(Join(message, " "), value)
        blocks.append(Say(message))
        return Lowered(blocks, "", VOID)

    def _math_call(self, node: Call, name: str, used: bool) -> Lowered:
        if name not in ALLOWED_MATH:
            raise self._error(f"Math.{name} is not supported", node)
        if name == "random":
            if node.arguments:
                raise self._error("Math.random() takes no arguments", node)
            return Lowered([], PickRandom(0.0, 1.0), NUMBER)
        if not node.arguments:
            raise self._error(f"Math.{name}() requires arguments", node)
        if name == "round":
            arg = self._expr(node.arguments[0])
            return Lowered(arg.blocks, Round(arg.value), NUMBER)
        if name == "pow":
            if len(node.arguments) != 2:
                raise self._error("Math.pow() takes 2 arguments", node)
            base = self._expr(node.arguments[0])
            exp = self._expr(node.arguments[1])
            return Lowered(
                [*base.blocks, *exp.blocks],
                MathOp("e ^", Multiply(exp.value, MathOp("ln", base.value))),
                NUMBER,
            )
        if name in ("max", "min"):
            if len(node.arguments) < 1:
                raise self._error(f"Math.{name}() requires arguments", node)
            first = self._expr(node.arguments[0])
            tmp = self._new_temp()
            blocks = [*first.blocks, SetVariable(tmp, first.value)]
            compare = GreaterThan if name == "max" else LessThan
            for arg in node.arguments[1:]:
                other = self._expr(arg)
                blocks.extend(other.blocks)
                blocks.append(If(compare(other.value, tmp), SetVariable(tmp, other.value)))
            return Lowered(blocks, tmp, NUMBER)
        if len(node.arguments) != 1:
            raise self._error(f"Math.{name}() takes 1 argument", node)
        arg = self._expr(node.arguments[0])
        return Lowered(arg.blocks, MathOp(MATH_UNARY[name], arg.value), NUMBER)

    def _array_push(self, node: Call, callee: Member, used: bool) -> Lowered:
        if len(node.arguments) != 1:
            raise self._error("push() takes 1 argument", node)
        obj = self._expr(callee.object)
        item = self._expr(node.arguments[0])
        blocks = [*obj.blocks, *item.blocks, AddToList(item.value, obj.value)]
        if used:
            return Lowered(blocks, LengthOfList(obj.value), NUMBER)
        return Lowered(blocks, "", VOID)

    def _load_list(self, node: Call) -> Lowered:
        values = self._read_load_list(node)
        lst = self._new_array()
        lst.values = values
        if not values:
            return Lowered([DeleteAllOfList(lst)], lst, ARRAY)
        return Lowered([], lst, ARRAY)

    def _read_load_list(self, node: Call) -> list[Any]:
        if len(node.arguments) != 1:
            raise self._error("loadList() takes 1 argument", node)
        arg = node.arguments[0]
        if not isinstance(arg, Literal) or arg.kind != "string":
            raise self._error("loadList() path must be a string literal", node)
        path = Path(str(arg.value))
        if not path.is_absolute():
            path = self.base_dir / path
        try:
            return load_list_file(path)
        except OSError as exc:
            detail = exc.strerror or str(exc)
            raise self._error(f"cannot read list file {arg.value!r}: {detail}", node) from exc


def _is_load_list_call(node: Node | None) -> bool:
    return (
        isinstance(node, Call)
        and isinstance(node.callee, Identifier)
        and node.callee.name == "loadList"
    )


def compile_into(source: str, target: Target, filename: str | None = None) -> None:
    program = parse(source, filename=filename)
    Compiler(target, filename=filename).compile(program)


def compile_js(
    source: str,
    *,
    sprite: str = "Sprite1",
    name: str = "Untitled",
    filename: str | None = None,
) -> Project:
    project = Project(name)
    target = project.add_sprite(sprite)
    compile_into(source, target, filename=filename)
    return project
