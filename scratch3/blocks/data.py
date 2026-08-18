"""Variables and list blocks."""

from __future__ import annotations

from scratch3.blocks.spec import (
    BooleanBlock,
    Field,
    Number,
    ReporterBlock,
    SerializeContext,
    StackBlock,
    String,
    _list_primitive,
    _variable_primitive,
)


class VariableReporter(ReporterBlock):
    """Reporter for a variable; serializes as a primitive when used as an input."""

    opcode = "data_variable"
    field_specs = (Field("VARIABLE", ref="variable"),)

    def serialize(self, ctx: SerializeContext, parent_id: str | None, top_level: bool) -> str:
        variable = ctx.resolve_variable(self.fields.get("VARIABLE"))
        if top_level:
            block_id = ctx.new_id()
            x = 0 if self.x is None else self.x
            y = 0 if self.y is None else self.y
            ctx.blocks[block_id] = _variable_primitive(variable) + [x, y]
            return block_id
        # Used as a full block (rare); emit a real block object.
        return super().serialize(ctx, parent_id, top_level)


class ListReporter(ReporterBlock):
    opcode = "data_listcontents"
    field_specs = (Field("LIST", ref="list"),)

    def serialize(self, ctx: SerializeContext, parent_id: str | None, top_level: bool) -> str:
        lst = ctx.resolve_list(self.fields.get("LIST"))
        if top_level:
            block_id = ctx.new_id()
            x = 0 if self.x is None else self.x
            y = 0 if self.y is None else self.y
            ctx.blocks[block_id] = _list_primitive(lst) + [x, y]
            return block_id
        return super().serialize(ctx, parent_id, top_level)


class SetVariable(StackBlock):
    opcode = "data_setvariableto"
    field_specs = (Field("VARIABLE", ref="variable"),)
    input_specs = (String("VALUE", "0"),)


class ChangeVariable(StackBlock):
    opcode = "data_changevariableby"
    field_specs = (Field("VARIABLE", ref="variable"),)
    input_specs = (Number("VALUE", 1),)


class ShowVariable(StackBlock):
    opcode = "data_showvariable"
    field_specs = (Field("VARIABLE", ref="variable"),)


class HideVariable(StackBlock):
    opcode = "data_hidevariable"
    field_specs = (Field("VARIABLE", ref="variable"),)


class AddToList(StackBlock):
    opcode = "data_addtolist"
    input_specs = (String("ITEM", "thing"),)
    field_specs = (Field("LIST", ref="list"),)
    arg_order = ("ITEM", "LIST")


class DeleteOfList(StackBlock):
    opcode = "data_deleteoflist"
    input_specs = (Number("INDEX", 1),)
    field_specs = (Field("LIST", ref="list"),)
    arg_order = ("INDEX", "LIST")


class DeleteAllOfList(StackBlock):
    opcode = "data_deletealloflist"
    field_specs = (Field("LIST", ref="list"),)


class InsertAtList(StackBlock):
    opcode = "data_insertatlist"
    input_specs = (String("ITEM", "thing"), Number("INDEX", 1))
    field_specs = (Field("LIST", ref="list"),)
    arg_order = ("ITEM", "INDEX", "LIST")


class ReplaceItemOfList(StackBlock):
    opcode = "data_replaceitemoflist"
    input_specs = (Number("INDEX", 1), String("ITEM", "thing"))
    field_specs = (Field("LIST", ref="list"),)
    arg_order = ("INDEX", "LIST", "ITEM")


class ItemOfList(ReporterBlock):
    opcode = "data_itemoflist"
    input_specs = (Number("INDEX", 1),)
    field_specs = (Field("LIST", ref="list"),)
    arg_order = ("INDEX", "LIST")


class ItemNumOfList(ReporterBlock):
    opcode = "data_itemnumoflist"
    input_specs = (String("ITEM", "thing"),)
    field_specs = (Field("LIST", ref="list"),)
    arg_order = ("ITEM", "LIST")


class LengthOfList(ReporterBlock):
    opcode = "data_lengthoflist"
    field_specs = (Field("LIST", ref="list"),)


class ListContains(BooleanBlock):
    opcode = "data_listcontainsitem"
    field_specs = (Field("LIST", ref="list"),)
    input_specs = (String("ITEM", "thing"),)


class ShowList(StackBlock):
    opcode = "data_showlist"
    field_specs = (Field("LIST", ref="list"),)


class HideList(StackBlock):
    opcode = "data_hidelist"
    field_specs = (Field("LIST", ref="list"),)
