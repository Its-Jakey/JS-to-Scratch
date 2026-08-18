"""Sound blocks."""

from __future__ import annotations

from scratch3.blocks.spec import (
    SOUND_EFFECT_ALIASES,
    Field,
    Menu,
    Number,
    ReporterBlock,
    StackBlock,
)


class PlaySoundUntilDone(StackBlock):
    opcode = "sound_playuntildone"
    input_specs = (Menu("SOUND_MENU", "sound_sounds_menu", "SOUND_MENU", "pop"),)


class PlaySound(StackBlock):
    opcode = "sound_play"
    input_specs = (Menu("SOUND_MENU", "sound_sounds_menu", "SOUND_MENU", "pop"),)


class StopAllSounds(StackBlock):
    opcode = "sound_stopallsounds"


class ChangeSoundEffect(StackBlock):
    opcode = "sound_changeeffectby"
    field_specs = (Field("EFFECT", "PITCH", aliases=SOUND_EFFECT_ALIASES),)
    input_specs = (Number("VALUE", 10),)


class SetSoundEffect(StackBlock):
    opcode = "sound_seteffectto"
    field_specs = (Field("EFFECT", "PITCH", aliases=SOUND_EFFECT_ALIASES),)
    input_specs = (Number("VALUE", 100),)


class ClearSoundEffects(StackBlock):
    opcode = "sound_cleareffects"


class ChangeVolume(StackBlock):
    opcode = "sound_changevolumeby"
    input_specs = (Number("VOLUME", -10),)


class SetVolume(StackBlock):
    opcode = "sound_setvolumeto"
    input_specs = (Number("VOLUME", 100),)


class Volume(ReporterBlock):
    opcode = "sound_volume"
