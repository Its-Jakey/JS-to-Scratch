"""Recursive-descent parser for the JavaScript subset."""

from __future__ import annotations

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
    If,
    Index,
    Literal,
    Member,
    Node,
    Program,
    Return,
    Switch,
    SwitchCase,
    Unary,
    Update,
    VarDecl,
    While,
)
from js2scratch.errors import CompileError
from js2scratch.lexer import Token, tokenize

UNSUPPORTED_KEYWORDS = {
    "continue": "continue is not supported",
    "case": "case outside of switch",
    "default": "default outside of switch",
    "try": "try/catch is not supported",
    "catch": "try/catch is not supported",
    "finally": "try/catch is not supported",
    "throw": "throw is not supported",
    "class": "classes are not supported",
    "extends": "classes are not supported",
    "new": "new / objects are not supported",
    "this": "this is not supported",
    "super": "super is not supported",
    "import": "modules are not supported (each .js file is a sprite)",
    "export": "modules are not supported (each .js file is a sprite)",
    "async": "async/await is not supported",
    "await": "async/await is not supported",
    "typeof": "typeof is not supported",
    "instanceof": "instanceof is not supported",
    "delete": "delete is not supported",
    "void": "void is not supported",
    "with": "with is not supported",
    "yield": "generators are not supported",
    "debugger": "debugger is not supported",
    "static": "classes are not supported",
}

ASSIGN_OPS = {"=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=", ">>>="}
BINARY_EQUALITY = {"==", "===", "!=", "!=="}
BINARY_RELATIONAL = {"<", ">", "<=", ">="}
SHIFT_OPS = {"<<", ">>", ">>>"}
UNSUPPORTED_OPS = {
    "??": "nullish coalescing is not supported",
    "**": "exponentiation is not supported; use Math.pow",
    "=>": "arrow functions are not supported",
}


class Parser:
    def __init__(self, source: str, filename: str | None = None) -> None:
        self.filename = filename
        self.tokens = tokenize(source, filename)
        self.i = 0

    def parse(self) -> Program:
        body: list[Node] = []
        while not self._check("EOF"):
            stmt = self._statement()
            if stmt is not None:
                body.append(stmt)
        return Program(body=body, line=1, column=1)

    def _peek(self, n: int = 0) -> Token:
        j = min(self.i + n, len(self.tokens) - 1)
        return self.tokens[j]

    def _check(self, *types: str) -> bool:
        return self._peek().type in types

    def _match(self, *types: str) -> Token | None:
        if self._check(*types):
            return self._advance()
        return None

    def _advance(self) -> Token:
        token = self._peek()
        if token.type != "EOF":
            self.i += 1
        return token

    def _expect(self, *types: str) -> Token:
        if self._check(*types):
            return self._advance()
        token = self._peek()
        expected = " or ".join(types)
        raise self._error(f"expected {expected}, got {token.type!r}", token)

    def _error(self, message: str, token: Token | None = None) -> CompileError:
        token = token or self._peek()
        return CompileError(message, line=token.line, column=token.column, filename=self.filename)

    def _loc(self, token: Token) -> dict[str, int]:
        return {"line": token.line, "column": token.column}

    def _statement(self) -> Node | None:
        token = self._peek()
        if token.type in UNSUPPORTED_KEYWORDS:
            raise self._error(UNSUPPORTED_KEYWORDS[token.type], token)
        if self._match(";"):
            return None
        if self._check("function"):
            return self._function_decl()
        if self._check("let", "const", "var"):
            stmt = self._var_decl()
            self._end_statement()
            return stmt
        if self._check("if"):
            return self._if_stmt()
        if self._check("while"):
            return self._while_stmt()
        if self._check("do"):
            stmt = self._do_while_stmt()
            self._end_statement()
            return stmt
        if self._check("for"):
            return self._for_stmt()
        if self._check("return"):
            stmt = self._return_stmt()
            self._end_statement()
            return stmt
        if self._check("switch"):
            return self._switch_stmt()
        if self._check("break"):
            stmt = self._break_stmt()
            self._end_statement()
            return stmt
        if self._check("{"):
            return self._block()
        expr = self._expression()
        stmt = ExpressionStmt(expression=expr, **self._loc(token))
        self._end_statement()
        return stmt

    def _end_statement(self) -> None:
        if self._match(";"):
            return
        nxt = self._peek()
        if nxt.type in ("EOF", "}"):
            return
        if nxt.newline_before:
            return
        raise self._error("expected ';' after statement", nxt)

    def _block(self) -> Block:
        start = self._expect("{")
        body: list[Node] = []
        while not self._check("}", "EOF"):
            stmt = self._statement()
            if stmt is not None:
                body.append(stmt)
        self._expect("}")
        return Block(body=body, **self._loc(start))

    def _function_decl(self) -> FunctionDecl:
        start = self._expect("function")
        name_tok = self._expect("IDENT")
        self._expect("(")
        params: list[str] = []
        if not self._check(")"):
            while True:
                param = self._expect("IDENT")
                if param.value in params:
                    raise self._error(f"duplicate parameter {param.value!r}", param)
                params.append(str(param.value))
                if not self._match(","):
                    break
                if self._check(")"):
                    raise self._error("trailing commas in parameters are not supported")
        self._expect(")")
        if not self._check("{"):
            raise self._error("expected function body")
        body_block = self._block()
        return FunctionDecl(
            name=str(name_tok.value),
            params=params,
            body=body_block.body,
            **self._loc(start),
        )

    def _var_decl(self) -> VarDecl:
        start = self._expect("let", "const", "var")
        name = self._expect("IDENT")
        init = None
        if self._match("="):
            init = self._assignment()
        return VarDecl(kind=start.type, name=str(name.value), init=init, **self._loc(start))

    def _if_stmt(self) -> If:
        start = self._expect("if")
        self._expect("(")
        test = self._expression()
        self._expect(")")
        consequent = self._statement() or Block(**self._loc(self._peek()))
        alternate = None
        if self._match("else"):
            alternate = self._statement() or Block(**self._loc(self._peek()))
        return If(test=test, consequent=consequent, alternate=alternate, **self._loc(start))

    def _while_stmt(self) -> While:
        start = self._expect("while")
        self._expect("(")
        test = self._expression()
        self._expect(")")
        body = self._statement() or Block(**self._loc(self._peek()))
        return While(test=test, body=body, **self._loc(start))

    def _do_while_stmt(self) -> DoWhile:
        start = self._expect("do")
        body = self._statement() or Block(**self._loc(self._peek()))
        self._expect("while")
        self._expect("(")
        test = self._expression()
        self._expect(")")
        return DoWhile(body=body, test=test, **self._loc(start))

    def _for_stmt(self) -> For:
        start = self._expect("for")
        self._expect("(")
        if self._check("in") or (self._check("IDENT") and self._peek(1).type == "in"):
            raise self._error("for...in is not supported")
        init: Node | None = None
        if not self._check(";"):
            if self._check("let", "const", "var"):
                init = self._var_decl()
                if self._check("of"):
                    raise self._error("for...of is not supported")
                if self._check("in"):
                    raise self._error("for...in is not supported")
            else:
                init = self._expression()
        self._expect(";")
        test = None if self._check(";") else self._expression()
        self._expect(";")
        update = None if self._check(")") else self._expression()
        self._expect(")")
        body = self._statement() or Block(**self._loc(self._peek()))
        return For(init=init, test=test, update=update, body=body, **self._loc(start))

    def _return_stmt(self) -> Return:
        start = self._expect("return")
        argument = None
        nxt = self._peek()
        if nxt.type not in (";", "}", "EOF") and not nxt.newline_before:
            argument = self._expression()
        return Return(argument=argument, **self._loc(start))

    def _break_stmt(self) -> Break:
        start = self._expect("break")
        nxt = self._peek()
        if nxt.type == "IDENT" and not nxt.newline_before:
            raise self._error("labeled break is not supported", nxt)
        return Break(**self._loc(start))

    def _switch_stmt(self) -> Switch:
        start = self._expect("switch")
        self._expect("(")
        discriminant = self._expression()
        self._expect(")")
        self._expect("{")
        cases: list[SwitchCase] = []
        seen_default = False
        while not self._check("}", "EOF"):
            if self._check("case"):
                cases.append(self._switch_case())
            elif self._check("default"):
                if seen_default:
                    raise self._error("multiple default clauses")
                seen_default = True
                cases.append(self._switch_default())
            else:
                raise self._error("expected 'case' or 'default'")
        self._expect("}")
        return Switch(discriminant=discriminant, cases=cases, **self._loc(start))

    def _switch_case(self) -> SwitchCase:
        start = self._expect("case")
        test = self._expression()
        self._expect(":")
        return SwitchCase(test=test, body=self._switch_case_body(), **self._loc(start))

    def _switch_default(self) -> SwitchCase:
        start = self._expect("default")
        self._expect(":")
        return SwitchCase(test=None, body=self._switch_case_body(), **self._loc(start))

    def _switch_case_body(self) -> list[Node]:
        body: list[Node] = []
        while not self._check("}", "EOF", "case", "default"):
            stmt = self._statement()
            if stmt is not None:
                body.append(stmt)
        return body

    def _expression(self) -> Node:
        return self._assignment()

    def _assignment(self) -> Node:
        expr = self._or()
        if self._check(*ASSIGN_OPS):
            op_tok = self._advance()
            if not isinstance(expr, (Identifier, Index)):
                raise self._error("invalid assignment target", op_tok)
            if isinstance(expr, Index) and op_tok.type != "=":
                raise self._error("compound assignment to array elements is not supported", op_tok)
            value = self._assignment()
            return Assign(op=op_tok.type, left=expr, right=value, **self._loc(op_tok))
        return expr

    def _or(self) -> Node:
        left = self._and()
        while self._check("||"):
            op = self._advance()
            right = self._and()
            left = Binary(op="||", left=left, right=right, **self._loc(op))
        return left

    def _and(self) -> Node:
        left = self._bitor()
        while self._check("&&"):
            op = self._advance()
            right = self._bitor()
            left = Binary(op="&&", left=left, right=right, **self._loc(op))
        return left

    def _bitor(self) -> Node:
        left = self._bitxor()
        while self._check("|"):
            op = self._advance()
            right = self._bitxor()
            left = Binary(op="|", left=left, right=right, **self._loc(op))
        return left

    def _bitxor(self) -> Node:
        left = self._bitand()
        while self._check("^"):
            op = self._advance()
            right = self._bitand()
            left = Binary(op="^", left=left, right=right, **self._loc(op))
        return left

    def _bitand(self) -> Node:
        left = self._equality()
        while self._check("&"):
            op = self._advance()
            right = self._equality()
            left = Binary(op="&", left=left, right=right, **self._loc(op))
        return left

    def _equality(self) -> Node:
        left = self._relational()
        while self._check(*BINARY_EQUALITY):
            op = self._advance()
            right = self._relational()
            left = Binary(op=op.type, left=left, right=right, **self._loc(op))
        return left

    def _relational(self) -> Node:
        left = self._shift()
        if self._check("in", "instanceof"):
            raise self._error(UNSUPPORTED_KEYWORDS[self._peek().type])
        while self._check(*BINARY_RELATIONAL):
            op = self._advance()
            right = self._shift()
            left = Binary(op=op.type, left=left, right=right, **self._loc(op))
        return left

    def _shift(self) -> Node:
        left = self._additive()
        while self._check(*SHIFT_OPS):
            op = self._advance()
            right = self._additive()
            left = Binary(op=op.type, left=left, right=right, **self._loc(op))
        return left

    def _additive(self) -> Node:
        left = self._multiplicative()
        while self._check("+", "-"):
            op = self._advance()
            right = self._multiplicative()
            left = Binary(op=op.type, left=left, right=right, **self._loc(op))
        return left

    def _multiplicative(self) -> Node:
        left = self._unary()
        if self._check("**"):
            raise self._error(UNSUPPORTED_OPS["**"])
        while self._check("*", "/", "%"):
            op = self._advance()
            right = self._unary()
            left = Binary(op=op.type, left=left, right=right, **self._loc(op))
        return left

    def _unary(self) -> Node:
        if self._check(*UNSUPPORTED_OPS):
            raise self._error(UNSUPPORTED_OPS[self._peek().type])
        if self._check("++", "--"):
            op = self._advance()
            arg = self._unary()
            if not isinstance(arg, (Identifier, Index)):
                raise self._error("invalid increment/decrement target", op)
            return Update(op=op.type, argument=arg, prefix=True, **self._loc(op))
        if self._check("!", "+", "-", "~"):
            op = self._advance()
            arg = self._unary()
            return Unary(op=op.type, argument=arg, prefix=True, **self._loc(op))
        if self._check("?"):
            raise self._error("ternary expressions are not supported")
        return self._postfix()

    def _postfix(self) -> Node:
        expr = self._primary()
        while True:
            if self._match("("):
                args: list[Node] = []
                if not self._check(")"):
                    while True:
                        args.append(self._assignment())
                        if not self._match(","):
                            break
                        if self._check(")"):
                            raise self._error("trailing commas in arguments are not supported")
                self._expect(")")
                expr = Call(callee=expr, arguments=args, line=expr.line, column=expr.column)
                continue
            if self._match("["):
                index = self._expression()
                self._expect("]")
                expr = Index(object=expr, index=index, line=expr.line, column=expr.column)
                continue
            if self._match("."):
                prop = self._expect("IDENT")
                expr = Member(object=expr, property=str(prop.value), line=expr.line, column=expr.column)
                continue
            if self._check("++", "--") and not self._peek().newline_before:
                op = self._advance()
                if not isinstance(expr, (Identifier, Index)):
                    raise self._error("invalid increment/decrement target", op)
                expr = Update(op=op.type, argument=expr, prefix=False, **self._loc(op))
                continue
            if self._check("?"):
                raise self._error("ternary expressions / optional chaining are not supported")
            break
        return expr

    def _primary(self) -> Node:
        token = self._peek()
        if token.type in UNSUPPORTED_KEYWORDS:
            raise self._error(UNSUPPORTED_KEYWORDS[token.type], token)
        if token.type in UNSUPPORTED_OPS:
            raise self._error(UNSUPPORTED_OPS[token.type], token)
        if self._match("NUMBER"):
            return Literal(value=token.value, kind="number", **self._loc(token))
        if self._match("STRING"):
            return Literal(value=token.value, kind="string", **self._loc(token))
        if self._match("true"):
            return Literal(value=True, kind="boolean", **self._loc(token))
        if self._match("false"):
            return Literal(value=False, kind="boolean", **self._loc(token))
        if self._match("null"):
            return Literal(value=None, kind="null", **self._loc(token))
        if self._match("IDENT"):
            name = str(token.value)
            if name == "undefined":
                return Literal(value=None, kind="null", **self._loc(token))
            return Identifier(name=name, **self._loc(token))
        if self._match("["):
            elements: list[Node | None] = []
            if not self._check("]"):
                while True:
                    if self._check(","):
                        elements.append(None)
                    else:
                        elements.append(self._assignment())
                    if not self._match(","):
                        break
                    if self._check("]"):
                        break
            self._expect("]")
            return ArrayLiteral(elements=elements, **self._loc(token))
        if self._check("{"):
            raise self._error("object literals are not supported", token)
        if self._match("("):
            expr = self._expression()
            self._expect(")")
            return expr
        if self._check("function"):
            raise self._error("function expressions are not supported", token)
        if self._check("/"):
            raise self._error("regular expressions are not supported", token)
        raise self._error(f"unexpected token {token.type!r}", token)


def parse(source: str, filename: str | None = None) -> Program:
    return Parser(source, filename).parse()
