"""Tokenizer for the JavaScript subset."""

from __future__ import annotations

from dataclasses import dataclass

from js2scratch.errors import CompileError

KEYWORDS = {
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "let",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "await",
    "async",
    "of",
    "static",
}

TWO_CHAR = {
    "==",
    "!=",
    "<=",
    ">=",
    "&&",
    "||",
    "++",
    "--",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "&=",
    "|=",
    "^=",
    "=>",
    "<<",
    ">>",
    "??",
    "**",
}

THREE_CHAR = {"===", "!==", ">>>", "**=", "&&=", "<<=", ">>="}
FOUR_CHAR = {">>>="}


@dataclass
class Token:
    type: str
    value: object
    line: int
    column: int
    newline_before: bool = False


class Lexer:
    def __init__(self, source: str, filename: str | None = None) -> None:
        self.source = source
        self.filename = filename
        self.i = 0
        self.line = 1
        self.column = 1
        self._newline_pending = False

    def _peek(self, n: int = 0) -> str:
        j = self.i + n
        if j >= len(self.source):
            return ""
        return self.source[j]

    def _advance(self) -> str:
        ch = self.source[self.i]
        self.i += 1
        if ch == "\n":
            self.line += 1
            self.column = 1
        else:
            self.column += 1
        return ch

    def _error(self, message: str, line: int | None = None, column: int | None = None) -> None:
        raise CompileError(
            message,
            line=self.line if line is None else line,
            column=self.column if column is None else column,
            filename=self.filename,
        )

    def tokenize(self) -> list[Token]:
        tokens: list[Token] = []
        while True:
            token = self._next()
            tokens.append(token)
            if token.type == "EOF":
                break
        return tokens

    def _skip_whitespace_and_comments(self) -> None:
        while self.i < len(self.source):
            ch = self._peek()
            if ch in " \t\r\v\f":
                self._advance()
                continue
            if ch == "\n":
                self._newline_pending = True
                self._advance()
                continue
            if ch == "/" and self._peek(1) == "/":
                while self.i < len(self.source) and self._peek() != "\n":
                    self._advance()
                continue
            if ch == "/" and self._peek(1) == "*":
                start_line, start_col = self.line, self.column
                self._advance()
                self._advance()
                while self.i < len(self.source):
                    if self._peek() == "*" and self._peek(1) == "/":
                        self._advance()
                        self._advance()
                        break
                    self._advance()
                else:
                    self._error("unterminated comment", start_line, start_col)
                continue
            break

    def _next(self) -> Token:
        self._skip_whitespace_and_comments()
        newline_before = self._newline_pending
        self._newline_pending = False
        if self.i >= len(self.source):
            return Token("EOF", None, self.line, self.column, newline_before)

        line, column = self.line, self.column
        ch = self._peek()

        if ch in "\"'":
            return self._string(newline_before)

        if ch == "`":
            self._error("template literals are not supported", line, column)

        if ch.isdigit() or (ch == "." and self._peek(1).isdigit()):
            return self._number(newline_before)

        if ch.isalpha() or ch in "_$":
            return self._ident(newline_before)

        four = self.source[self.i : self.i + 4]
        if four in FOUR_CHAR:
            for _ in range(4):
                self._advance()
            return Token(four, four, line, column, newline_before)

        three = self.source[self.i : self.i + 3]
        if three in THREE_CHAR:
            for _ in range(3):
                self._advance()
            return Token(three, three, line, column, newline_before)

        two = self.source[self.i : self.i + 2]
        if two in TWO_CHAR:
            self._advance()
            self._advance()
            return Token(two, two, line, column, newline_before)

        if ch == "." and self._peek(1) == "." and self._peek(2) == ".":
            self._error("spread/rest syntax is not supported", line, column)

        self._advance()
        return Token(ch, ch, line, column, newline_before)

    def _ident(self, newline_before: bool) -> Token:
        line, column = self.line, self.column
        start = self.i
        while True:
            ch = self._peek()
            if ch.isalnum() or ch in "_$":
                self._advance()
            else:
                break
        text = self.source[start:self.i]
        if text in KEYWORDS:
            return Token(text, text, line, column, newline_before)
        return Token("IDENT", text, line, column, newline_before)

    def _number(self, newline_before: bool) -> Token:
        line, column = self.line, self.column
        start = self.i
        if self._peek() == "0" and self._peek(1) in ("x", "X"):
            self._advance()
            self._advance()
            if not self._peek() or self._peek() not in "0123456789abcdefABCDEF":
                self._error("invalid hex literal", line, column)
            while self._peek() and self._peek() in "0123456789abcdefABCDEF":
                self._advance()
            text = self.source[start:self.i]
            return Token("NUMBER", float(int(text, 16)), line, column, newline_before)

        while self._peek().isdigit():
            self._advance()
        if self._peek() == ".":
            self._advance()
            while self._peek().isdigit():
                self._advance()
        if self._peek() in ("e", "E"):
            self._advance()
            if self._peek() in ("+", "-"):
                self._advance()
            if not self._peek().isdigit():
                self._error("invalid number literal", line, column)
            while self._peek().isdigit():
                self._advance()
        text = self.source[start:self.i]
        value: float | int
        if any(c in text for c in ".eE"):
            value = float(text)
        else:
            value = int(text)
        return Token("NUMBER", value, line, column, newline_before)

    def _string(self, newline_before: bool) -> Token:
        line, column = self.line, self.column
        quote = self._advance()
        chars: list[str] = []
        while self.i < len(self.source):
            ch = self._advance()
            if ch == quote:
                return Token("STRING", "".join(chars), line, column, newline_before)
            if ch == "\n":
                self._error("unterminated string", line, column)
            if ch != "\\":
                chars.append(ch)
                continue
            esc = self._advance()
            mapping = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", '"': '"', "'": "'", "0": "\0", "b": "\b", "f": "\f", "v": "\v"}
            if esc in mapping:
                chars.append(mapping[esc])
            elif esc == "u" and all(self._peek(n) in "0123456789abcdefABCDEF" for n in range(4)):
                hex_digits = "".join(self._advance() for _ in range(4))
                chars.append(chr(int(hex_digits, 16)))
            elif esc == "x" and all(self._peek(n) in "0123456789abcdefABCDEF" for n in range(2)):
                hex_digits = "".join(self._advance() for _ in range(2))
                chars.append(chr(int(hex_digits, 16)))
            else:
                chars.append(esc)
        self._error("unterminated string", line, column)
        raise AssertionError


def tokenize(source: str, filename: str | None = None) -> list[Token]:
    return Lexer(source, filename).tokenize()
