"""Operators blocks."""

from __future__ import annotations

from scratch3.blocks.spec import (
    Boolean,
    BooleanBlock,
    Field,
    Number,
    ReporterBlock,
    String,
)


class Add(ReporterBlock):
    opcode = "operator_add"
    input_specs = (Number("NUM1", ""), Number("NUM2", ""))


class Subtract(ReporterBlock):
    opcode = "operator_subtract"
    input_specs = (Number("NUM1", ""), Number("NUM2", ""))


class Multiply(ReporterBlock):
    opcode = "operator_multiply"
    input_specs = (Number("NUM1", ""), Number("NUM2", ""))


class Divide(ReporterBlock):
    opcode = "operator_divide"
    input_specs = (Number("NUM1", ""), Number("NUM2", ""))


class PickRandom(ReporterBlock):
    opcode = "operator_random"
    input_specs = (Number("FROM", 1), Number("TO", 10))


class GreaterThan(BooleanBlock):
    opcode = "operator_gt"
    input_specs = (String("OPERAND1", ""), String("OPERAND2", "50"))


class LessThan(BooleanBlock):
    opcode = "operator_lt"
    input_specs = (String("OPERAND1", ""), String("OPERAND2", "50"))


class Equals(BooleanBlock):
    opcode = "operator_equals"
    input_specs = (String("OPERAND1", ""), String("OPERAND2", "50"))


class And(BooleanBlock):
    opcode = "operator_and"
    input_specs = (Boolean("OPERAND1"), Boolean("OPERAND2"))


class Or(BooleanBlock):
    opcode = "operator_or"
    input_specs = (Boolean("OPERAND1"), Boolean("OPERAND2"))


class Not(BooleanBlock):
    opcode = "operator_not"
    input_specs = (Boolean("OPERAND"),)


class Join(ReporterBlock):
    opcode = "operator_join"
    input_specs = (String("STRING1", "apple "), String("STRING2", "banana"))


class LetterOf(ReporterBlock):
    opcode = "operator_letter_of"
    input_specs = (Number("LETTER", 1), String("STRING", "apple"))


class LengthOf(ReporterBlock):
    opcode = "operator_length"
    input_specs = (String("STRING", "apple"),)


class Contains(BooleanBlock):
    opcode = "operator_contains"
    input_specs = (String("STRING1", "apple"), String("STRING2", "a"))


class Mod(ReporterBlock):
    opcode = "operator_mod"
    input_specs = (Number("NUM1", ""), Number("NUM2", ""))


class Round(ReporterBlock):
    opcode = "operator_round"
    input_specs = (Number("NUM", ""),)


_MATHOP_ALIASES = {
    "abs": "abs",
    "floor": "floor",
    "ceiling": "ceiling",
    "ceil": "ceiling",
    "sqrt": "sqrt",
    "sin": "sin",
    "cos": "cos",
    "tan": "tan",
    "asin": "asin",
    "acos": "acos",
    "atan": "atan",
    "ln": "ln",
    "log": "log",
    "e ^": "e ^",
    "e^": "e ^",
    "10 ^": "10 ^",
    "10^": "10 ^",
}


class MathOp(ReporterBlock):
    opcode = "operator_mathop"
    field_specs = (Field("OPERATOR", "abs", aliases=_MATHOP_ALIASES),)
    input_specs = (Number("NUM", ""),)
