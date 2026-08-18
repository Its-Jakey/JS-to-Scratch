"""JavaScript-subset AST nodes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Node:
    line: int = 1
    column: int = 1


@dataclass
class Program(Node):
    body: list[Node] = field(default_factory=list)


@dataclass
class FunctionDecl(Node):
    name: str = ""
    params: list[str] = field(default_factory=list)
    body: list[Node] = field(default_factory=list)


@dataclass
class VarDecl(Node):
    kind: str = "let"  # let | const | var
    name: str = ""
    init: Node | None = None


@dataclass
class Block(Node):
    body: list[Node] = field(default_factory=list)


@dataclass
class If(Node):
    test: Node | None = None
    consequent: Node | None = None
    alternate: Node | None = None


@dataclass
class While(Node):
    test: Node | None = None
    body: Node | None = None


@dataclass
class DoWhile(Node):
    body: Node | None = None
    test: Node | None = None


@dataclass
class For(Node):
    init: Node | None = None
    test: Node | None = None
    update: Node | None = None
    body: Node | None = None


@dataclass
class Return(Node):
    argument: Node | None = None


@dataclass
class SwitchCase(Node):
    test: Node | None = None  # None = default
    body: list[Node] = field(default_factory=list)


@dataclass
class Switch(Node):
    discriminant: Node | None = None
    cases: list[SwitchCase] = field(default_factory=list)


@dataclass
class Break(Node):
    pass


@dataclass
class ExpressionStmt(Node):
    expression: Node | None = None


@dataclass
class Identifier(Node):
    name: str = ""


@dataclass
class Literal(Node):
    value: Any = None
    kind: str = "number"  # number | string | boolean | null


@dataclass
class ArrayLiteral(Node):
    elements: list[Node | None] = field(default_factory=list)


@dataclass
class Binary(Node):
    op: str = ""
    left: Node | None = None
    right: Node | None = None


@dataclass
class Unary(Node):
    op: str = ""
    argument: Node | None = None
    prefix: bool = True


@dataclass
class Update(Node):
    op: str = "++"
    argument: Node | None = None
    prefix: bool = True


@dataclass
class Assign(Node):
    op: str = "="
    left: Node | None = None
    right: Node | None = None


@dataclass
class Call(Node):
    callee: Node | None = None
    arguments: list[Node] = field(default_factory=list)


@dataclass
class Member(Node):
    object: Node | None = None
    property: str = ""


@dataclass
class Index(Node):
    object: Node | None = None
    index: Node | None = None
