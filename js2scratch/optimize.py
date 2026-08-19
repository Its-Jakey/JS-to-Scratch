"""AST optimizer: const-fold, tiny-function inlining, unused-let DCE."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from js2scratch.ast import (
    ArrayLiteral,
    Assign,
    Binary,
    Block,
    Break,
    Call,
    Conditional,
    DoWhile,
    ExpressionStmt,
    For,
    FunctionDecl,
    Identifier,
    If,
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

_MAX_INLINE_STMTS = 4
_MIN_INLINE_CALLS = 2
_CONTROL = (If, While, DoWhile, For, Switch)


def optimize(program: Program) -> Program:
    for _ in range(8):
        changed = False
        program, fold_changed = _fold_program(program)
        changed = changed or fold_changed
        program, inline_changed = _inline_program(program)
        changed = changed or inline_changed
        program, dce_changed = _dce_program(program)
        changed = changed or dce_changed
        if not changed:
            break
    return program


def _fold_program(program: Program) -> tuple[Program, bool]:
    changed = False
    body = []
    for stmt in program.body:
        new, did = _fold_stmt(stmt)
        body.append(new)
        changed = changed or did
    if not changed:
        return program, False
    return Program(body=body, line=program.line, column=program.column), True


def _fold_stmt(node: Node | None) -> tuple[Node | None, bool]:
    if node is None:
        return None, False
    if isinstance(node, FunctionDecl):
        body = []
        changed = False
        for stmt in node.body:
            new, did = _fold_stmt(stmt)
            body.append(new)
            changed = changed or did
        if not changed:
            return node, False
        return FunctionDecl(name=node.name, params=list(node.params), body=body, line=node.line, column=node.column), True
    if isinstance(node, Block):
        body = []
        changed = False
        for stmt in node.body:
            new, did = _fold_stmt(stmt)
            body.append(new)
            changed = changed or did
        if not changed:
            return node, False
        return Block(body=body, line=node.line, column=node.column), True
    if isinstance(node, VarDecl):
        init, did = _fold_expr(node.init)
        if not did:
            return node, False
        return VarDecl(kind=node.kind, name=node.name, init=init, line=node.line, column=node.column), True
    if isinstance(node, If):
        test, a = _fold_expr(node.test)
        cons, b = _fold_stmt(node.consequent)
        alt, c = _fold_stmt(node.alternate)
        if not (a or b or c):
            return node, False
        return If(test=test, consequent=cons, alternate=alt, line=node.line, column=node.column), True
    if isinstance(node, (While, DoWhile)):
        test, a = _fold_expr(node.test)
        body, b = _fold_stmt(node.body)
        if not (a or b):
            return node, False
        if isinstance(node, While):
            return While(test=test, body=body, line=node.line, column=node.column), True
        return DoWhile(test=test, body=body, line=node.line, column=node.column), True
    if isinstance(node, For):
        init, a = _fold_stmt(node.init) if isinstance(node.init, VarDecl) else _fold_expr(node.init)
        test, b = _fold_expr(node.test)
        update, c = _fold_expr(node.update)
        body, d = _fold_stmt(node.body)
        if not (a or b or c or d):
            return node, False
        return For(init=init, test=test, update=update, body=body, line=node.line, column=node.column), True
    if isinstance(node, Return):
        arg, did = _fold_expr(node.argument)
        if not did:
            return node, False
        return Return(argument=arg, line=node.line, column=node.column), True
    if isinstance(node, Switch):
        disc, a = _fold_expr(node.discriminant)
        cases = []
        changed = a
        for case in node.cases:
            test, b = _fold_expr(case.test)
            body = []
            for stmt in case.body:
                new, c = _fold_stmt(stmt)
                body.append(new)
                changed = changed or c
            changed = changed or b
            cases.append(type(case)(test=test, body=body, line=case.line, column=case.column))
        if not changed:
            return node, False
        return Switch(discriminant=disc, cases=cases, line=node.line, column=node.column), True
    if isinstance(node, ExpressionStmt):
        expr, did = _fold_expr(node.expression)
        if not did:
            return node, False
        return ExpressionStmt(expression=expr, line=node.line, column=node.column), True
    if isinstance(node, Assign):
        left, a = _fold_expr(node.left)
        right, b = _fold_expr(node.right)
        if not (a or b):
            return node, False
        return Assign(op=node.op, left=left, right=right, line=node.line, column=node.column), True
    return node, False


def _fold_expr(node: Node | None) -> tuple[Node | None, bool]:
    if node is None:
        return None, False
    if isinstance(node, Binary):
        left, a = _fold_expr(node.left)
        right, b = _fold_expr(node.right)
        folded = _fold_binary(node.op, left, right, node)
        if folded is not None:
            return folded, True
        if not (a or b):
            return node, False
        return Binary(op=node.op, left=left, right=right, line=node.line, column=node.column), True
    if isinstance(node, Unary):
        arg, did = _fold_expr(node.argument)
        folded = _fold_unary(node.op, arg, node)
        if folded is not None:
            return folded, True
        if not did:
            return node, False
        return Unary(op=node.op, argument=arg, prefix=node.prefix, line=node.line, column=node.column), True
    if isinstance(node, Call):
        callee, a = _fold_expr(node.callee)
        args = []
        changed = a
        for arg in node.arguments:
            new, did = _fold_expr(arg)
            args.append(new)
            changed = changed or did
        if not changed:
            return node, False
        return Call(callee=callee, arguments=args, line=node.line, column=node.column), True
    if isinstance(node, Member):
        obj, did = _fold_expr(node.object)
        if not did:
            return node, False
        return Member(object=obj, property=node.property, line=node.line, column=node.column), True
    if isinstance(node, Index):
        obj, a = _fold_expr(node.object)
        idx, b = _fold_expr(node.index)
        if not (a or b):
            return node, False
        return Index(object=obj, index=idx, line=node.line, column=node.column), True
    if isinstance(node, ArrayLiteral):
        els = []
        changed = False
        for el in node.elements:
            new, did = _fold_expr(el)
            els.append(new)
            changed = changed or did
        if not changed:
            return node, False
        return ArrayLiteral(elements=els, line=node.line, column=node.column), True
    if isinstance(node, Assign):
        left, a = _fold_expr(node.left)
        right, b = _fold_expr(node.right)
        if not (a or b):
            return node, False
        return Assign(op=node.op, left=left, right=right, line=node.line, column=node.column), True
    if isinstance(node, Conditional):
        test, a = _fold_expr(node.test)
        cons, b = _fold_expr(node.consequent)
        alt, c = _fold_expr(node.alternate)
        if isinstance(test, Literal):
            truthy = not (
                (test.kind == "boolean" and not test.value)
                or (test.kind == "number" and test.value == 0)
                or (test.kind == "string" and test.value == "")
                or test.kind == "null"
            )
            return (cons if truthy else alt), True
        if not (a or b or c):
            return node, False
        return Conditional(
            test=test, consequent=cons, alternate=alt, line=node.line, column=node.column
        ), True
    if isinstance(node, Update):
        arg, did = _fold_expr(node.argument)
        if not did:
            return node, False
        return Update(op=node.op, argument=arg, prefix=node.prefix, line=node.line, column=node.column), True
    return node, False


def _num_lit(node: Node | None) -> int | float | None:
    if isinstance(node, Literal) and node.kind == "number" and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    return None


def _fold_binary(op: str, left: Node | None, right: Node | None, origin: Node) -> Literal | None:
    if op == "+" and isinstance(left, Literal) and isinstance(right, Literal):
        if left.kind == "string" or right.kind == "string":
            return Literal(value=str(left.value) + str(right.value), kind="string", line=origin.line, column=origin.column)
    lv, rv = _num_lit(left), _num_lit(right)
    if lv is None or rv is None:
        return None
    ops = {
        "+": lambda a, b: a + b,
        "-": lambda a, b: a - b,
        "*": lambda a, b: a * b,
        "/": lambda a, b: a / b if b != 0 else None,
        "%": lambda a, b: a % b if b != 0 else None,
    }
    fn = ops.get(op)
    if fn is None:
        return None
    value = fn(lv, rv)
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return Literal(value=value, kind="number", line=origin.line, column=origin.column)


def _fold_unary(op: str, arg: Node | None, origin: Node) -> Literal | None:
    num = _num_lit(arg)
    if num is None:
        return None
    if op == "-":
        return Literal(value=-num, kind="number", line=origin.line, column=origin.column)
    if op == "+":
        return Literal(value=num, kind="number", line=origin.line, column=origin.column)
    return None


def _inline_program(program: Program) -> tuple[Program, bool]:
    funcs = {stmt.name: stmt for stmt in program.body if isinstance(stmt, FunctionDecl)}
    counts: dict[str, int] = {name: 0 for name in funcs}
    _count_calls(program, counts)
    inlinable = {
        name: fn
        for name, fn in funcs.items()
        if counts[name] >= _MIN_INLINE_CALLS and _is_tiny(fn)
    }
    if not inlinable:
        return program, False
    body, changed = _inline_stmts(program.body, inlinable)
    remaining_counts: dict[str, int] = {name: 0 for name in funcs}
    new_program = Program(body=body, line=program.line, column=program.column)
    _count_calls(new_program, remaining_counts)
    pruned = []
    for stmt in body:
        if isinstance(stmt, FunctionDecl) and remaining_counts.get(stmt.name, 0) == 0:
            changed = True
            continue
        pruned.append(stmt)
    return Program(body=pruned, line=program.line, column=program.column), changed


def _is_tiny(fn: FunctionDecl) -> bool:
    if _contains_control(fn.body) or _contains_self_call(fn.body, fn.name):
        return False
    if _stmt_count(fn.body) > _MAX_INLINE_STMTS:
        return False
    if _params_mutated(fn):
        return False
    returns = _return_exprs(fn.body)
    if len(returns) > 1:
        return False
    if returns and not (_stmt_count(fn.body) == 1 and isinstance(fn.body[0], Return)):
        return False
    return True


def _stmt_count(stmts: list[Node]) -> int:
    n = 0
    for stmt in stmts:
        if isinstance(stmt, Block):
            n += _stmt_count(stmt.body)
        else:
            n += 1
    return n


def _contains_control(stmts: list[Node]) -> bool:
    for stmt in stmts:
        if isinstance(stmt, _CONTROL):
            return True
        if isinstance(stmt, Block) and _contains_control(stmt.body):
            return True
    return False


def _contains_self_call(stmts: list[Node], name: str) -> bool:
    found = False

    def walk(node: Node | None) -> None:
        nonlocal found
        if node is None or found:
            return
        if isinstance(node, Call) and isinstance(node.callee, Identifier) and node.callee.name == name:
            found = True
            return
        for child in _children(node):
            walk(child)

    for stmt in stmts:
        walk(stmt)
    return found


def _params_mutated(fn: FunctionDecl) -> bool:
    params = set(fn.params)

    def walk(node: Node | None) -> bool:
        if node is None:
            return False
        if isinstance(node, Assign) and isinstance(node.left, Identifier) and node.left.name in params:
            return True
        if isinstance(node, Update) and isinstance(node.argument, Identifier) and node.argument.name in params:
            return True
        return any(walk(child) for child in _children(node))

    return any(walk(stmt) for stmt in fn.body)


def _return_exprs(stmts: list[Node]) -> list[Node | None]:
    found: list[Node | None] = []
    for stmt in stmts:
        if isinstance(stmt, Return):
            found.append(stmt.argument)
        elif isinstance(stmt, Block):
            found.extend(_return_exprs(stmt.body))
    return found


def _count_calls(node: Node | None, counts: dict[str, int]) -> None:
    if node is None:
        return
    if isinstance(node, Call) and isinstance(node.callee, Identifier) and node.callee.name in counts:
        counts[node.callee.name] += 1
    for child in _children(node):
        _count_calls(child, counts)


def _children(node: Node) -> list[Node | None]:
    if isinstance(node, Program):
        return list(node.body)
    if isinstance(node, FunctionDecl):
        return list(node.body)
    if isinstance(node, Block):
        return list(node.body)
    if isinstance(node, VarDecl):
        return [node.init]
    if isinstance(node, If):
        return [node.test, node.consequent, node.alternate]
    if isinstance(node, (While, DoWhile)):
        return [node.test, node.body]
    if isinstance(node, For):
        return [node.init, node.test, node.update, node.body]
    if isinstance(node, Return):
        return [node.argument]
    if isinstance(node, Switch):
        kids: list[Node | None] = [node.discriminant]
        for case in node.cases:
            kids.append(case.test)
            kids.extend(case.body)
        return kids
    if isinstance(node, ExpressionStmt):
        return [node.expression]
    if isinstance(node, (Binary, Assign)):
        return [node.left, node.right]
    if isinstance(node, Conditional):
        return [node.test, node.consequent, node.alternate]
    if isinstance(node, (Unary, Update)):
        return [node.argument]
    if isinstance(node, Call):
        return [node.callee, *node.arguments]
    if isinstance(node, Member):
        return [node.object]
    if isinstance(node, Index):
        return [node.object, node.index]
    if isinstance(node, ArrayLiteral):
        return list(node.elements)
    return []


def _inline_stmts(stmts: list[Node], inlinable: dict[str, FunctionDecl]) -> tuple[list[Node], bool]:
    out: list[Node] = []
    changed = False
    for stmt in stmts:
        if isinstance(stmt, ExpressionStmt) and isinstance(stmt.expression, Call):
            call = stmt.expression
            if isinstance(call.callee, Identifier) and call.callee.name in inlinable:
                fn = inlinable[call.callee.name]
                if not _return_exprs(fn.body) and _args_safe(fn, call):
                    out.extend(_subst_stmts(fn.body, fn, call))
                    changed = True
                    continue
        new, did = _inline_stmt(stmt, inlinable)
        out.append(new)
        changed = changed or did
    return out, changed


def _inline_stmt(node: Node | None, inlinable: dict[str, FunctionDecl]) -> tuple[Any, bool]:
    if node is None:
        return None, False
    if isinstance(node, FunctionDecl):
        body, changed = _inline_stmts(node.body, inlinable)
        if not changed:
            return node, False
        return FunctionDecl(name=node.name, params=list(node.params), body=body, line=node.line, column=node.column), True
    if isinstance(node, Block):
        body, changed = _inline_stmts(node.body, inlinable)
        if not changed:
            return node, False
        return Block(body=body, line=node.line, column=node.column), True
    if isinstance(node, VarDecl):
        init, did = _inline_expr(node.init, inlinable)
        if not did:
            return node, False
        return VarDecl(kind=node.kind, name=node.name, init=init, line=node.line, column=node.column), True
    if isinstance(node, If):
        test, a = _inline_expr(node.test, inlinable)
        cons, b = _inline_stmt(node.consequent, inlinable)
        alt, c = _inline_stmt(node.alternate, inlinable)
        if not (a or b or c):
            return node, False
        return If(test=test, consequent=cons, alternate=alt, line=node.line, column=node.column), True
    if isinstance(node, While):
        test, a = _inline_expr(node.test, inlinable)
        body, b = _inline_stmt(node.body, inlinable)
        if not (a or b):
            return node, False
        return While(test=test, body=body, line=node.line, column=node.column), True
    if isinstance(node, DoWhile):
        test, a = _inline_expr(node.test, inlinable)
        body, b = _inline_stmt(node.body, inlinable)
        if not (a or b):
            return node, False
        return DoWhile(test=test, body=body, line=node.line, column=node.column), True
    if isinstance(node, For):
        init, a = _inline_stmt(node.init, inlinable) if isinstance(node.init, VarDecl) else _inline_expr(node.init, inlinable)
        test, b = _inline_expr(node.test, inlinable)
        update, c = _inline_expr(node.update, inlinable)
        body, d = _inline_stmt(node.body, inlinable)
        if not (a or b or c or d):
            return node, False
        return For(init=init, test=test, update=update, body=body, line=node.line, column=node.column), True
    if isinstance(node, Return):
        arg, did = _inline_expr(node.argument, inlinable)
        if not did:
            return node, False
        return Return(argument=arg, line=node.line, column=node.column), True
    if isinstance(node, Switch):
        disc, a = _inline_expr(node.discriminant, inlinable)
        cases = []
        changed = a
        for case in node.cases:
            test, b = _inline_expr(case.test, inlinable)
            body, c = _inline_stmts(case.body, inlinable)
            changed = changed or b or c
            cases.append(type(case)(test=test, body=body, line=case.line, column=case.column))
        if not changed:
            return node, False
        return Switch(discriminant=disc, cases=cases, line=node.line, column=node.column), True
    if isinstance(node, ExpressionStmt):
        expr, did = _inline_expr(node.expression, inlinable)
        if not did:
            return node, False
        return ExpressionStmt(expression=expr, line=node.line, column=node.column), True
    return node, False


def _inline_expr(node: Node | None, inlinable: dict[str, FunctionDecl]) -> tuple[Any, bool]:
    if node is None:
        return None, False
    if isinstance(node, Call):
        callee, a = _inline_expr(node.callee, inlinable)
        args = []
        changed = a
        for arg in node.arguments:
            new, did = _inline_expr(arg, inlinable)
            args.append(new)
            changed = changed or did
        call = node
        if changed:
            call = Call(callee=callee, arguments=args, line=node.line, column=node.column)
        if isinstance(call.callee, Identifier) and call.callee.name in inlinable:
            fn = inlinable[call.callee.name]
            returns = _return_exprs(fn.body)
            if len(returns) == 1 and _args_safe(fn, call):
                return _subst_expr(returns[0], fn, call), True
        return call, changed
    if isinstance(node, Binary):
        left, a = _inline_expr(node.left, inlinable)
        right, b = _inline_expr(node.right, inlinable)
        if not (a or b):
            return node, False
        return Binary(op=node.op, left=left, right=right, line=node.line, column=node.column), True
    if isinstance(node, Unary):
        arg, did = _inline_expr(node.argument, inlinable)
        if not did:
            return node, False
        return Unary(op=node.op, argument=arg, prefix=node.prefix, line=node.line, column=node.column), True
    if isinstance(node, Assign):
        left, a = _inline_expr(node.left, inlinable)
        right, b = _inline_expr(node.right, inlinable)
        if not (a or b):
            return node, False
        return Assign(op=node.op, left=left, right=right, line=node.line, column=node.column), True
    if isinstance(node, Member):
        obj, did = _inline_expr(node.object, inlinable)
        if not did:
            return node, False
        return Member(object=obj, property=node.property, line=node.line, column=node.column), True
    if isinstance(node, Index):
        obj, a = _inline_expr(node.object, inlinable)
        idx, b = _inline_expr(node.index, inlinable)
        if not (a or b):
            return node, False
        return Index(object=obj, index=idx, line=node.line, column=node.column), True
    if isinstance(node, ArrayLiteral):
        els = []
        changed = False
        for el in node.elements:
            new, did = _inline_expr(el, inlinable)
            els.append(new)
            changed = changed or did
        if not changed:
            return node, False
        return ArrayLiteral(elements=els, line=node.line, column=node.column), True
    if isinstance(node, Conditional):
        test, a = _inline_expr(node.test, inlinable)
        cons, b = _inline_expr(node.consequent, inlinable)
        alt, c = _inline_expr(node.alternate, inlinable)
        if not (a or b or c):
            return node, False
        return Conditional(
            test=test, consequent=cons, alternate=alt, line=node.line, column=node.column
        ), True
    if isinstance(node, Update):
        arg, did = _inline_expr(node.argument, inlinable)
        if not did:
            return node, False
        return Update(op=node.op, argument=arg, prefix=node.prefix, line=node.line, column=node.column), True
    return node, False


def _ident_uses(node: Node | None, name: str) -> int:
    if node is None:
        return 0
    n = 1 if isinstance(node, Identifier) and node.name == name else 0
    return n + sum(_ident_uses(child, name) for child in _children(node))


def _args_safe(fn: FunctionDecl, call: Call) -> bool:
    if len(call.arguments) != len(fn.params):
        return False
    body_root = Block(body=fn.body)
    for param, arg in zip(fn.params, call.arguments):
        uses = _ident_uses(body_root, param)
        if uses > 1 and not isinstance(arg, (Identifier, Literal)):
            return False
    return True


def _subst_map(fn: FunctionDecl, call: Call) -> dict[str, Node]:
    return {param: deepcopy(arg) for param, arg in zip(fn.params, call.arguments)}


def _subst_expr(node: Node | None, fn: FunctionDecl, call: Call) -> Node | None:
    mapping = _subst_map(fn, call)
    return _replace_idents(deepcopy(node), mapping) if node is not None else None


def _subst_stmts(stmts: list[Node], fn: FunctionDecl, call: Call) -> list[Node]:
    mapping = _subst_map(fn, call)
    return [_replace_idents(deepcopy(stmt), mapping) for stmt in stmts]


def _replace_idents(node: Any, mapping: dict[str, Node]) -> Any:
    if node is None:
        return None
    if isinstance(node, Identifier) and node.name in mapping:
        return deepcopy(mapping[node.name])
    if isinstance(node, list):
        return [_replace_idents(item, mapping) for item in node]
    if not isinstance(node, Node):
        return node
    for field in getattr(node, "__dataclass_fields__", {}):
        if field in ("line", "column"):
            continue
        setattr(node, field, _replace_idents(getattr(node, field), mapping))
    return node


def _dce_program(program: Program) -> tuple[Program, bool]:
    reads: set[str] = set()
    _collect_reads(program, reads)
    body, changed = _dce_stmts(program.body, reads)
    if not changed:
        return program, False
    return Program(body=body, line=program.line, column=program.column), True


def _dce_stmts(stmts: list[Node], reads: set[str]) -> tuple[list[Node], bool]:
    out: list[Node] = []
    changed = False
    for stmt in stmts:
        if isinstance(stmt, VarDecl) and stmt.name not in reads and _pure_init(stmt.init):
            changed = True
            continue
        if isinstance(stmt, FunctionDecl):
            body, did = _dce_stmts(stmt.body, reads)
            if did:
                stmt = FunctionDecl(name=stmt.name, params=list(stmt.params), body=body, line=stmt.line, column=stmt.column)
                changed = True
        elif isinstance(stmt, Block):
            body, did = _dce_stmts(stmt.body, reads)
            if did:
                stmt = Block(body=body, line=stmt.line, column=stmt.column)
                changed = True
        out.append(stmt)
    return out, changed


def _pure_init(node: Node | None) -> bool:
    return node is None or isinstance(node, Literal)


def _collect_reads(node: Node | None, reads: set[str]) -> None:
    if node is None:
        return
    if isinstance(node, Identifier):
        reads.add(node.name)
        return
    if isinstance(node, VarDecl):
        _collect_reads(node.init, reads)
        return
    for child in _children(node):
        _collect_reads(child, reads)
