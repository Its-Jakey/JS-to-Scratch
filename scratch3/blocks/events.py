"""Events blocks."""

from __future__ import annotations

from scratch3.blocks.spec import (
    KEY_ALIASES,
    WHENGREATER_ALIASES,
    BroadcastIn,
    Field,
    HatBlock,
    Number,
    StackBlock,
)


class WhenFlagClicked(HatBlock):
    opcode = "event_whenflagclicked"


class WhenKeyPressed(HatBlock):
    opcode = "event_whenkeypressed"
    field_specs = (Field("KEY_OPTION", "space", aliases=KEY_ALIASES),)


class WhenThisSpriteClicked(HatBlock):
    opcode = "event_whenthisspriteclicked"


class WhenStageClicked(HatBlock):
    opcode = "event_whenstageclicked"


class WhenBackdropSwitchesTo(HatBlock):
    opcode = "event_whenbackdropswitchesto"
    field_specs = (Field("BACKDROP", "backdrop1"),)


class WhenGreaterThan(HatBlock):
    opcode = "event_whengreaterthan"
    field_specs = (Field("WHENGREATERTHANMENU", "LOUDNESS", aliases=WHENGREATER_ALIASES),)
    input_specs = (Number("VALUE", 10),)


class WhenIReceive(HatBlock):
    opcode = "event_whenbroadcastreceived"
    field_specs = (Field("BROADCAST_OPTION", "message1", ref="broadcast"),)


class Broadcast(StackBlock):
    opcode = "event_broadcast"
    input_specs = (BroadcastIn("BROADCAST_INPUT"),)


class BroadcastAndWait(StackBlock):
    opcode = "event_broadcastandwait"
    input_specs = (BroadcastIn("BROADCAST_INPUT"),)
