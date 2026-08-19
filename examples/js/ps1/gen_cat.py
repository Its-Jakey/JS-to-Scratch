"""Generate examples/js/ps1/Cat.js from the JS PSXE core (js2scratch subset)."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
JS = ROOT / "examples" / "js" / "PSX" / "ps1-scratch" / "js"
OUT = Path(__file__).resolve().parent

DISC_REL_CUE = (
    "../PSX/ps1-scratch/Gran Turismo 2 (USA) (Arcade Mode) (Rev 1)/"
    "Gran Turismo 2 (USA) (Arcade Mode) (Rev 1).bin"
)
# From examples/js/ps1/Cat.js this reaches the JS port's disc folder.
DISC_ABS_CUE = (OUT / DISC_REL_CUE).resolve()


def read_js(rel: str) -> str:
    return (JS / rel).read_text(encoding="utf-8")


def strip_imports_exports(text: str) -> str:
    out: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        at_line = i == 0 or text[i - 1] == "\n"
        if at_line and text.startswith("import", i):
            j = text.find(";", i)
            if j < 0:
                break
            i = j + 1
            if i < n and text[i] == "\n":
                i += 1
            continue
        if at_line and text.startswith("export ", i):
            rest = text[i:]
            m = re.match(r"export\s+async\s+function\s+", rest)
            if m:
                out.append("function ")
                i += m.end()
                continue
            m = re.match(r"export\s+function\s+", rest)
            if m:
                out.append("function ")
                i += m.end()
                continue
            m = re.match(r"export\s+\{[^}]*\}\s*;?[ \t]*\n?", rest)
            if m:
                i += m.end()
                continue
            m = re.match(r"export\s+const\s+", rest)
            if m:
                out.append("let ")
                i += m.end()
                continue
        out.append(text[i])
        i += 1
    return "".join(out)


def function_bodies(src: str) -> list[tuple[int, int, int]]:
    """Return (header_start, body_start, body_end) for each top-level function."""
    spans: list[tuple[int, int, int]] = []
    for m in re.finditer(r"^function [A-Za-z_][\w]*\s*\(", src, re.M):
        header_start = m.start()
        i = m.end() - 1
        depth = 0
        while i < len(src):
            if src[i] == "(":
                depth += 1
            elif src[i] == ")":
                depth -= 1
                if depth == 0:
                    i += 1
                    break
            i += 1
        while i < len(src) and src[i] in " \t\n":
            i += 1
        if i >= len(src) or src[i] != "{":
            continue
        body_start = i
        depth = 0
        while i < len(src):
            if src[i] == "{":
                depth += 1
            elif src[i] == "}":
                depth -= 1
                if depth == 0:
                    spans.append((header_start, body_start, i + 1))
                    break
            i += 1
    return spans


def _param_names(header: str) -> list[str]:
    open_p = header.find("(")
    close_p = header.rfind(")")
    if open_p < 0 or close_p < 0:
        return []
    inner = header[open_p + 1 : close_p].strip()
    if not inner:
        return []
    return [p.strip() for p in inner.split(",") if p.strip()]


def dedupe_lets_in_body(body: str, declared: set[str]) -> str:
    lines = body.splitlines(keepends=True)
    out: list[str] = []
    for line in lines:
        m = re.match(r"^(\s*for\s*\(\s*)(?:const|let) ([A-Za-z_][\w]*)\b", line)
        if m:
            name = m.group(2)
            if name in declared:
                line = m.group(1) + name + line[m.end() :]
            else:
                declared.add(name)
            out.append(line)
            continue
        m = re.match(r"^(\s*)(?:const|let) ([A-Za-z_][\w]*)\b", line)
        if m:
            name = m.group(2)
            if name in declared:
                rest = line[m.end() :]
                if rest.lstrip().startswith(";"):
                    continue
                line = m.group(1) + name + rest
            else:
                declared.add(name)
        out.append(line)
    return "".join(out)


def prevent_let_inlining(src: str) -> str:
    """Keep functions that declare locals from being inlined (duplicate let after inline)."""
    spans = function_bodies(src)
    if not spans:
        return src
    parts: list[str] = []
    last = 0
    for _header_start, body_start, body_end in spans:
        parts.append(src[last:body_start])
        body = src[body_start:body_end]
        if re.search(r"\b(?:let|const) ", body) and "if (0) return;" not in body[:80]:
            body = "{\n  if (0) return;" + body[1:]
        parts.append(body)
        last = body_end
    parts.append(src[last:])
    return "".join(parts)


def dedupe_lets(src: str) -> str:
    spans = function_bodies(src)
    if not spans:
        return src
    parts: list[str] = []
    last = 0
    for header_start, body_start, body_end in spans:
        parts.append(src[last:body_start])
        declared = set(_param_names(src[header_start:body_start]))
        parts.append(dedupe_lets_in_body(src[body_start:body_end], declared))
        last = body_end
    parts.append(src[last:])
    return "".join(parts)


def remove_function(src: str, name: str) -> str:
    m = re.search(rf"^(?:export\s+)?function {re.escape(name)}\s*\(", src, re.M)
    if not m:
        return src
    start = m.start()
    i = m.end() - 1
    depth = 0
    while i < len(src):
        if src[i] == "(":
            depth += 1
        elif src[i] == ")":
            depth -= 1
            if depth == 0:
                i += 1
                break
        i += 1
    while i < len(src) and src[i] in " \t\n":
        i += 1
    if i >= len(src) or src[i] != "{":
        return src
    depth = 0
    while i < len(src):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                if end < len(src) and src[end] == "\n":
                    end += 1
                return src[:start] + src[end:]
        i += 1
    return src


def remove_call_stmt(src: str, name: str) -> str:
    key = name + "("
    i = 0
    out: list[str] = []
    while True:
        j = src.find(key, i)
        if j < 0:
            out.append(src[i:])
            break
        line_start = src.rfind("\n", 0, j) + 1
        prefix = src[line_start:j].strip()
        if prefix not in ("", "export"):
            out.append(src[i:j])
            i = j + len(key)
            continue
        k = j + len(key) - 1
        depth = 0
        while k < len(src):
            if src[k] == "(":
                depth += 1
            elif src[k] == ")":
                depth -= 1
                if depth == 0:
                    end = k + 1
                    while end < len(src) and src[end] in " \t":
                        end += 1
                    if end < len(src) and src[end] == ";":
                        end += 1
                    if end < len(src) and src[end] == "\n":
                        end += 1
                    out.append(src[i:line_start])
                    i = end
                    break
            k += 1
        else:
            out.append(src[i:])
            break
    return "".join(out)


def convert_typed_array_literals(s: str) -> str:
    pat = re.compile(
        r"(?:new\s+(?:Uint8|Uint16|Uint32|Int8|Int16|Int32)Array|"
        r"(?:Uint8|Int8|Uint16)Array\.from)\s*\("
    )
    out: list[str] = []
    i = 0
    while True:
        m = pat.search(s, i)
        if not m:
            out.append(s[i:])
            break
        out.append(s[i : m.start()])
        start_paren = m.end() - 1
        depth = 0
        k = start_paren
        found = False
        while k < len(s):
            if s[k] == "(":
                depth += 1
            elif s[k] == ")":
                depth -= 1
                if depth == 0:
                    inner = s[start_paren + 1 : k].strip()
                    if inner.endswith(".map(u32)"):
                        inner = inner[: -len(".map(u32)")].rstrip()
                    out.append(inner)
                    i = k + 1
                    found = True
                    break
            k += 1
        if not found:
            out.append(s[m.start() :])
            break
    return "".join(out)


def expand_index_compound(s: str) -> str:
    ops = (("|=", "|"), ("&=", "&"), ("^=", "^"), ("+=", "+"), ("-=", "-"))
    i = 0
    out: list[str] = []
    n = len(s)
    while i < n:
        if s[i].isalpha() or s[i] == "_":
            j = i + 1
            while j < n and (s[j].isalnum() or s[j] == "_"):
                j += 1
            name = s[i:j]
            k = j
            while k < n and s[k] in " \t":
                k += 1
            if k < n and s[k] == "[":
                depth = 0
                p = k
                while p < n:
                    if s[p] == "[":
                        depth += 1
                    elif s[p] == "]":
                        depth -= 1
                        if depth == 0:
                            p += 1
                            break
                    p += 1
                q = p
                while q < n and s[q] in " \t":
                    q += 1
                matched = None
                for cand, binop in ops:
                    if s.startswith(cand, q):
                        matched = (cand, binop)
                        break
                if matched:
                    cand, binop = matched
                    idx = s[k + 1 : p - 1]
                    out.append(f"{name}[{idx}] = {name}[{idx}] {binop} ")
                    i = q + len(cand)
                    continue
            out.append(s[i:j])
            i = j
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


def replace_shift_n(s: str, nbits: int) -> str:
    tokens = [f">> {nbits}n", f">>{nbits}n"]
    for tok in tokens:
        i = 0
        out: list[str] = []
        while True:
            j = s.find(tok, i)
            if j < 0:
                out.append(s[i:])
                break
            k = j - 1
            while k >= i and s[k] in " \t\n":
                k -= 1
            if k < i:
                out.append(s[i : j + len(tok)])
                i = j + len(tok)
                continue
            if s[k] == ")":
                depth = 0
                p = k
                start = None
                while p >= i:
                    if s[p] == ")":
                        depth += 1
                    elif s[p] == "(":
                        depth -= 1
                        if depth == 0:
                            q = p - 1
                            while q >= i and (s[q].isalnum() or s[q] == "_"):
                                q -= 1
                            start = q + 1
                            break
                    p -= 1
                if start is None:
                    out.append(s[i : j + len(tok)])
                    i = j + len(tok)
                    continue
                expr = s[start : k + 1]
                out.append(s[i:start])
                out.append(f"s64_sar({expr}, {nbits})")
                i = j + len(tok)
            elif s[k].isalnum() or s[k] == "_":
                p = k
                while p >= i and (s[p].isalnum() or s[p] == "_"):
                    p -= 1
                start = p + 1
                expr = s[start : k + 1]
                out.append(s[i:start])
                out.append(f"s64_sar({expr}, {nbits})")
                i = j + len(tok)
            else:
                out.append(s[i : j + len(tok)])
                i = j + len(tok)
        s = "".join(out)
    return s


def unwrap_call(s: str, name: str) -> str:
    key = name + "("
    i = 0
    out: list[str] = []
    while True:
        j = s.find(key, i)
        if j < 0:
            out.append(s[i:])
            break
        if j > 0 and (s[j - 1].isalnum() or s[j - 1] == "_"):
            out.append(s[i : j + len(key)])
            i = j + len(key)
            continue
        start_paren = j + len(name)
        depth = 0
        k = start_paren
        while k < len(s):
            if s[k] == "(":
                depth += 1
            elif s[k] == ")":
                depth -= 1
                if depth == 0:
                    inner = s[start_paren + 1 : k]
                    out.append(s[i:j])
                    out.append("(" + inner + ")")
                    i = k + 1
                    break
            k += 1
        else:
            out.append(s[i:])
            break
    return "".join(out)


def fix_gte_check_mac_3arg(s: str) -> str:
    key = "gte_check_mac("
    i = 0
    out: list[str] = []
    while True:
        j = s.find(key, i)
        if j < 0:
            out.append(s[i:])
            break
        start = j + len(key)
        depth = 1
        k = start
        args: list[str] = []
        arg_start = start
        while k < len(s) and depth:
            c = s[k]
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    args.append(s[arg_start:k])
                    break
            elif c == "," and depth == 1:
                args.append(s[arg_start:k])
                arg_start = k + 1
            k += 1
        args = [a.strip() for a in args if a.strip()]
        out.append(s[i:j])
        if len(args) == 3:
            out.append(f"gte_check_mac({args[0]}, s64_add({args[1]}, {args[2]}))")
        else:
            out.append(s[j : k + 1])
        i = k + 1
    return "".join(out)


def strip_console_calls(s: str) -> str:
    for name in ("console.error", "console.log", "console.warn"):
        key = name + "("
        i = 0
        out: list[str] = []
        while True:
            j = s.find(key, i)
            if j < 0:
                out.append(s[i:])
                break
            line_start = s.rfind("\n", 0, j) + 1
            k = j + len(key) - 1
            depth = 0
            while k < len(s):
                if s[k] == "(":
                    depth += 1
                elif s[k] == ")":
                    depth -= 1
                    if depth == 0:
                        end = k + 1
                        while end < len(s) and s[end] in " \t":
                            end += 1
                        if end < len(s) and s[end] == ";":
                            end += 1
                        if end < len(s) and s[end] == "\n":
                            end += 1
                        out.append(s[i:line_start])
                        i = end
                        break
                k += 1
            else:
                out.append(s[i:])
                break
        s = "".join(out)
    return s


def flatten_nested(s: str) -> str:
    s = re.sub(
        r"S\.g_dma_channel\[([^\]]+)\]\[([^\]]+)\]",
        r"dmaReg[(\1) * 3 + (\2)]",
        s,
    )
    s = re.sub(
        r"S\.cpu_cop2_cr_rt\[([^\]]+)\]\[([^\]]+)\]",
        r"gteRT[(\1) * 2 + (\2)]",
        s,
    )
    s = re.sub(
        r"S\.cpu_cop2_cr_l\[([^\]]+)\]\[([^\]]+)\]",
        r"gteL[(\1) * 2 + (\2)]",
        s,
    )
    s = re.sub(
        r"S\.cpu_cop2_cr_lr\[([^\]]+)\]\[([^\]]+)\]",
        r"gteLR[(\1) * 2 + (\2)]",
        s,
    )
    return s


def bigint_literals(s: str) -> str:
    def hexn(m: re.Match[str]) -> str:
        sign = m.group(1) or ""
        return sign + str(int(m.group(2), 16))

    s = re.sub(r"(-?)0x([0-9a-fA-F]+)n\b", hexn, s)
    s = re.sub(r"(-?)(\d+)n\b", lambda m: (m.group(1) or "") + m.group(2), s)
    return s


def transform_core(src: str) -> str:
    src = strip_imports_exports(src)
    src = convert_typed_array_literals(src)
    src = flatten_nested(src)
    src = src.replace("S.", "")
    src = re.sub(r"\bg_ram_buf\b", "ram", src)
    src = re.sub(r"\bscratchpad_buf\b", "scratch", src)
    src = re.sub(r"\bgpu_vram\b", "vram", src)
    src = re.sub(r"\bspu_ram\b", "spuRam", src)
    src = re.sub(r"\bspu_hw\b", "spuHw", src)
    src = src.replace("S64.add(", "s64_add(")
    src = src.replace("S64.sub(", "s64_sub(")
    src = src.replace("S64.mul(", "s64_mul(")
    src = src.replace("S64.shl(", "s64_shl(")
    src = src.replace("S32.sar(", "s32_sar(")
    src = src.replace("S32.mulWide(", "muls32wide(")
    src = src.replace("U32.mulWide(", "mulu32wide(")
    src = src.replace("Math.trunc(", "trunc(")
    src = src.replace("psx_disc_read(cdrom_lba, cdrom_data_buf)", "psx_disc_read_data(cdrom_lba)")
    src = src.replace("psx_disc_read(cdrom_xa_lba, cdrom_xa_buf)", "psx_disc_read_xa(cdrom_xa_lba)")
    src = src.replace("'S'.charCodeAt(0)", "83")
    src = src.replace("'C'.charCodeAt(0)", "67")
    src = src.replace("'E'.charCodeAt(0)", "69")
    src = src.replace("'A'.charCodeAt(0)", "65")
    src = strip_console_calls(src)
    src = src.replace("onPresent();", "needRender = 1;")
    src = src.replace("onDisplayModeChanged();", "")
    src = expand_index_compound(src)
    src = src.replace("value >> BigInt(cpu_gte_sf)", "s64_sar(value, cpu_gte_sf)")
    src = src.replace("value >> BigInt(sf)", "s64_sar(value, sf)")
    src = replace_shift_n(src, 16)
    src = replace_shift_n(src, 12)
    src = bigint_literals(src)
    src = re.sub(r"BigInt\(([^)]+)\)", r"\1", src)
    src = unwrap_call(src, "Number")
    src = src.replace("PSXE_BIOS_SIZE", "524288")
    src = re.sub(r"/\*\*[\s\S]*?\*/\n?", "", src)
    src = re.sub(r"let \w+ = \(\) => \{\};\s*", "", src)
    src = src.replace("const OP = () => cpu_opcode;", "")
    src = src.replace("bus.bus_access", "bus_access")
    src = src.replace("bus.psx_bus_read8", "psx_bus_read8")
    src = src.replace("bus.psx_bus_read16", "psx_bus_read16")
    src = src.replace("bus.psx_bus_write16", "psx_bus_write16")
    src = src.replace("bus.psx_bus_write32", "psx_bus_write32")
    src = src.replace("\t", "  ")
    return src


SCALARS = [
    "g_ram_size",
    "g_dma_mdec_in_irq_delay",
    "g_dma_mdec_out_irq_delay",
    "g_dma_cdrom_irq_delay",
    "g_dma_spu_irq_delay",
    "g_dma_gpu_irq_delay",
    "g_dma_otc_irq_delay",
    "g_dma_dpcr",
    "g_dma_dicr",
    "cpu_opcode",
    "cpu_pc",
    "cpu_next_pc",
    "cpu_saved_pc",
    "cpu_hi",
    "cpu_lo",
    "cpu_load_d",
    "cpu_load_v",
    "cpu_last_cycles",
    "cpu_total_cycles",
    "cpu_branch",
    "cpu_delay_slot",
    "cpu_branch_taken",
    "cpu_cop2_dr_otz",
    "cpu_cop2_dr_ir0",
    "cpu_cop2_dr_ir1",
    "cpu_cop2_dr_ir2",
    "cpu_cop2_dr_ir3",
    "cpu_cop2_dr_sz0",
    "cpu_cop2_dr_sz1",
    "cpu_cop2_dr_sz2",
    "cpu_cop2_dr_sz3",
    "cpu_cop2_dr_rgb0_u32",
    "cpu_cop2_dr_rgb1_u32",
    "cpu_cop2_dr_rgb2_u32",
    "cpu_cop2_dr_rgbc_u32",
    "cpu_cop2_dr_res1",
    "cpu_cop2_dr_mac0",
    "cpu_cop2_dr_mac1",
    "cpu_cop2_dr_mac2",
    "cpu_cop2_dr_mac3",
    "cpu_cop2_dr_irgb",
    "cpu_cop2_dr_lzcs",
    "cpu_cop2_dr_lzcr",
    "cpu_cop2_cr_rt_33",
    "cpu_cop2_cr_tr_x",
    "cpu_cop2_cr_tr_y",
    "cpu_cop2_cr_tr_z",
    "cpu_cop2_cr_l_33",
    "cpu_cop2_cr_bk_x",
    "cpu_cop2_cr_bk_y",
    "cpu_cop2_cr_bk_z",
    "cpu_cop2_cr_lr_33",
    "cpu_cop2_cr_fc_x",
    "cpu_cop2_cr_fc_y",
    "cpu_cop2_cr_fc_z",
    "cpu_cop2_cr_ofx",
    "cpu_cop2_cr_ofy",
    "cpu_cop2_cr_h",
    "cpu_cop2_cr_dqa",
    "cpu_cop2_cr_dqb",
    "cpu_cop2_cr_zsf3",
    "cpu_cop2_cr_zsf4",
    "cpu_cop2_cr_flag",
    "cpu_gte_lm",
    "cpu_gte_sf",
    "cpu_gte_mx",
    "cpu_gte_v",
    "cpu_gte_cv",
    "cpu_s_mac0",
    "cpu_s_mac3",
    "gte_mvmva_mx_11",
    "gte_mvmva_mx_12",
    "gte_mvmva_mx_13",
    "gte_mvmva_mx_21",
    "gte_mvmva_mx_22",
    "gte_mvmva_mx_23",
    "gte_mvmva_mx_31",
    "gte_mvmva_mx_32",
    "gte_mvmva_mx_33",
    "gte_mvmva_vx",
    "gte_mvmva_vy",
    "gte_mvmva_vz",
    "gte_mvmva_cv_x",
    "gte_mvmva_cv_y",
    "gte_mvmva_cv_z",
    "timer_hblank",
    "timer_vblank",
    "cdrom_disc_track_start",
    "cdrom_disc_track_end",
    "cdrom_disc_open",
    "cdrom_disc_type",
    "cdrom_index",
    "cdrom_pending_speed_switch_delay",
    "cdrom_ier",
    "cdrom_ifr",
    "cdrom_mode",
    "cdrom_data_req",
    "cdrom_data_rd",
    "cdrom_data_wr",
    "cdrom_resp_rd",
    "cdrom_resp_wr",
    "cdrom_param_rd",
    "cdrom_param_wr",
    "cdrom_pending_command",
    "cdrom_busy",
    "cdrom_xa_lba",
    "cdrom_xa_playing",
    "cdrom_xa_mute",
    "cdrom_xa_channel",
    "cdrom_xa_file",
    "cdrom_xa_remaining_samples",
    "cdrom_state",
    "cdrom_prev_state",
    "cdrom_delay",
    "cdrom_pending_lba",
    "cdrom_lba",
    "cdrom_read_ongoing",
    "pad_buttons",
    "pad_rxq_len",
    "pad_rxq_pos",
    "pad_dest",
    "pad_cycles_until_irq",
    "pad_irq_bit",
    "pad_mode",
    "pad_ctrl",
    "pad_baud",
    "pad_stat",
    "g_bus_access_cycles",
    "mc2_ram_size",
    "mc3_cache_control",
    "ic_stat",
    "ic_mask",
    "gpu_display_off_init",
    "gpu_recv_data",
    "gpu_buf_index",
    "gpu_cmd_args_remaining",
    "gpu_draw_attrib",
    "gpu_draw_clut",
    "gpu_draw_texp",
    "gpu_rect_x",
    "gpu_rect_y",
    "gpu_rect_w",
    "gpu_rect_h",
    "gpu_rect_c",
    "gpu_rect_tx",
    "gpu_rect_ty",
    "gpu_xpos",
    "gpu_ypos",
    "gpu_xsiz",
    "gpu_ysiz",
    "gpu_tsiz",
    "gpu_addr",
    "gpu_xcnt",
    "gpu_ycnt",
    "gpu_c0_xcnt",
    "gpu_c0_ycnt",
    "gpu_c0_addr",
    "gpu_c0_xsiz",
    "gpu_c0_ysiz",
    "gpu_c0_tsiz",
    "gpu_gp1_10h_req",
    "gpu_state",
    "gpu_display_mode",
    "gpu_gpustat",
    "gpu_draw_x1",
    "gpu_draw_y1",
    "gpu_draw_x2",
    "gpu_draw_y2",
    "gpu_off_x",
    "gpu_off_y",
    "gpu_texw_mx",
    "gpu_texw_my",
    "gpu_texw_ox",
    "gpu_texw_oy",
    "gpu_texp_x",
    "gpu_texp_y",
    "gpu_texp_d",
    "gpu_disp_x",
    "gpu_disp_y",
    "gpu_disp_x1",
    "gpu_disp_x2",
    "gpu_disp_y1",
    "gpu_disp_y2",
    "gpu_cycles",
    "gpu_line",
    "gpu_dbg_vb",
    "gpu_dbg_tex_count",
    "gpu_dbg_tex_ymin",
    "mdec_io_base",
    "mdec_io_size",
    "mdec_cmd",
    "mdec_input_index",
    "mdec_input_size",
    "mdec_output_index",
    "mdec_output_words_remaining",
    "mdec_words_remaining",
    "mdec_current_block",
    "mdec_output_bit15",
    "mdec_output_signed",
    "mdec_output_depth",
    "mdec_input_request",
    "mdec_output_request",
    "mdec_busy",
    "mdec_input_full",
    "mdec_output_empty",
    "mdec_enable_dma0",
    "mdec_enable_dma1",
    "mdec_recv_color",
    "mdec_cmd_decode_count",
    "mdecSrcIndex",
    "mdecBlkId",
    "mdecQuantId",
    "sio_ctrl",
    "mulHi",
    "mulLo",
    "needRender",
    "pixelStep",
    "gfxW",
    "gfxH",
    "gfxLen",
    "STEPS_PER_SLICE",
    "fps",
    "fpsFrames",
    "dispW",
    "dispH",
    "rgb24",
    "xaRet",
    "xaGo",
    "dmaListGo",
    "mdecLoopGo",
]


def header(disc_path: str) -> str:
    lines = [
        "// PlayStation 1 emulator (Gran Turismo 2 Arcade) for TurboWarp.",
        "// Green flag: BIOS + disc lists are baked by loadBin. Far below real-time.",
        "// Controls: X/A/W/D/S/Z/C/Q/E/1/3, arrows, enter. Hide sprite; pen blit.",
        "",
        'let bios = loadBin("bios.bin");',
        "// BIOS-only boot: uncomment loadBin and delete the empty list to bake the GT2 disc again.",
        f'// let disc = loadBin("{disc_path}");',
        "let disc = [];",
        "let ram = [];",
        "let scratch = [];",
        "let vram = [];",
        "let spuRam = [];",
        "let spuHw = [];",
        "let cpu_r = [];",
        "let cpu_cop0_r = [];",
        "let cpu_cop2_dr_v_xy = [];",
        "let cpu_cop2_dr_v_z = [];",
        "let cpu_cop2_dr_sxy_xy = [];",
        "let gteRT = [];",
        "let gteL = [];",
        "let gteLR = [];",
        "let dmaReg = [];",
        "let timer_counter = [];",
        "let timer_target = [];",
        "let timer_mode = [];",
        "let timer_irq_fired = [];",
        "let timer_paused = [];",
        "let timer_blank_once = [];",
        "let cdrom_data_buf = [];",
        "let cdrom_resp_buf = [];",
        "let cdrom_param_buf = [];",
        "let cdrom_xa_buf = [];",
        "let pad_rxq = [];",
        "let mc1_regs = [520093696, 528482304, 1254463, 12322, 1254463, 537411041, 133187, 460663, 201001];",
        "let gpu_buf = [];",
        "let gpu_v_x = [];",
        "let gpu_v_y = [];",
        "let gpu_v_c = [];",
        "let gpu_v_tx = [];",
        "let gpu_v_ty = [];",
        "let mdec_input = [];",
        "let mdec_output = [];",
        "let mdec_uv_quant_table = [];",
        "let mdec_y_quant_table = [];",
        "let mdec_scale_table = [];",
        "let mdec_yblk = [];",
        "let mdec_crblk = [];",
        "let mdec_cbblk = [];",
        "let mdecIdct0 = [];",
        "let mdecIdct1 = [];",
        "let gfx = [];",
        "let prev = [];",
        "let spu_voice_left = [];",
        "let GT2_TRACK_COUNT = 1;",
        "",
    ]
    for name in SCALARS:
        lines.append(f"let {name} = 0;")
    lines.append("")
    lines.append(HELPERS)
    return "\n".join(lines) + "\n"


HELPERS = r'''
// --- integer helpers ---
function trunc(x) {
  if (x < 0) return Math.ceil(x);
  return Math.floor(x);
}

function pow2(n) {
  n = n & 31;
  if (n == 0) return 1;
  return u32(1 << n);
}

function u8(v) {
  return v & 255;
}

function s8(v) {
  return (v << 24) >> 24;
}

function u16(v) {
  return v & 65535;
}

function s16(v) {
  return (v << 16) >> 16;
}

function u32(v) {
  return v >>> 0;
}

function s32(v) {
  return v | 0;
}

function s32_from_s8(v) {
  return s32(s8(v));
}

function s32_from_s16(v) {
  return s32(s16(v));
}

function s32_sar(a, n) {
  return s32(a) >> (n & 31);
}

function s32_add_overflow(a, b) {
  let sa = s32(a);
  let sb = s32(b);
  let r = sa + sb;
  return ((sa ^ r) & (sb ^ r) & 2147483648) != 0;
}

function sign_extend(v, bits) {
  let shift = 32 - bits;
  return s32(s32(v << shift) >> shift);
}

function s64(v) {
  return v;
}

function s64_add(a, b) {
  return a + b;
}

function s64_sub(a, b) {
  return a - b;
}

function s64_mul(a, b) {
  return a * b;
}

function s64_shl(a, n) {
  if (n <= 0) return a;
  return a * pow2(n);
}

function s64_sar(v, n) {
  if (n <= 0) return trunc(v);
  return Math.floor(v / pow2(n));
}

function s44(v) {
  let m = 17592186044416;
  let half = 8796093022208;
  v = trunc(v);
  v = v % m;
  if (v < 0) v = v + m;
  if (v >= half) v = v - m;
  return v;
}

function s64_sign_extend_44(v) {
  return s44(v);
}

function clz32(value) {
  value = value >>> 0;
  if (!value) return 32;
  let bits = 0;
  while (value) {
    value = value >>> 1;
    bits++;
  }
  return 32 - bits;
}

function mulu32wide(a, b) {
  a = u32(a);
  b = u32(b);
  let a0 = a & 65535;
  let a1 = a >>> 16;
  let b0 = b & 65535;
  let b1 = b >>> 16;
  let p0 = a0 * b0;
  let p1 = a0 * b1;
  let p2 = a1 * b0;
  let p3 = a1 * b1;
  let mid = (p0 >>> 16) + (p1 & 65535) + (p2 & 65535);
  mulLo = u32((p0 & 65535) | ((mid & 65535) << 16));
  mulHi = u32(p3 + (p1 >>> 16) + (p2 >>> 16) + (mid >>> 16));
}

function muls32wide(a, b) {
  a = s32(a);
  b = s32(b);
  let neg = 0;
  if (a < 0) {
    a = u32(0 - a);
    neg = 1 - neg;
  } else {
    a = u32(a);
  }
  if (b < 0) {
    b = u32(0 - b);
    neg = 1 - neg;
  } else {
    b = u32(b);
  }
  mulu32wide(a, b);
  if (neg) {
    let lo = u32(~mulLo);
    let hi = u32(~mulHi);
    lo = u32(lo + 1);
    if (lo == 0) hi = u32(hi + 1);
    mulLo = lo;
    mulHi = hi;
  }
}

function divs32(a, b) {
  a = s32(a);
  b = s32(b);
  if (b == 0) return 0;
  return trunc(a / b);
}

function rems32(a, b) {
  a = s32(a);
  b = s32(b);
  if (b == 0) return 0;
  return a - trunc(a / b) * b;
}

function divu32(a, b) {
  a = u32(a);
  b = u32(b);
  if (b == 0) return 0;
  return trunc(a / b);
}

function remu32(a, b) {
  a = u32(a);
  b = u32(b);
  if (b == 0) return 0;
  return a - trunc(a / b) * b;
}

function word_load8(w, off) {
  let sh = (off & 3) * 8;
  return trunc(u32(w) / pow2(sh)) % 256;
}

function word_load16(w, off) {
  let sh = (off & 2) * 8;
  return trunc(u32(w) / pow2(sh)) % 65536;
}

function word_store8(w, off, v) {
  v = v & 255;
  let sh = (off & 3) * 8;
  let mask = 255 * pow2(sh);
  w = u32(w);
  w = (w & ~mask) | (v * pow2(sh));
  return u32(w);
}

function word_store16(w, off, v) {
  v = v & 65535;
  let sh = (off & 2) * 8;
  let mask = 65535 * pow2(sh);
  w = u32(w);
  w = (w & ~mask) | (v * pow2(sh));
  return u32(w);
}

function ram_load8(off) {
  return word_load8(ram[off >>> 2], off);
}

function ram_load16(off) {
  return word_load16(ram[off >>> 2], off);
}

function ram_load32(off) {
  return u32(ram[off >>> 2]);
}

function ram_store8(off, v) {
  let wi = off >>> 2;
  ram[wi] = word_store8(ram[wi], off, v);
}

function ram_store16(off, v) {
  let wi = off >>> 2;
  ram[wi] = word_store16(ram[wi], off, v);
}

function ram_store32(off, v) {
  ram[off >>> 2] = u32(v);
}

function bios_load8(off) {
  return word_load8(bios[off >>> 2], off);
}

function bios_load16(off) {
  return word_load16(bios[off >>> 2], off);
}

function bios_load32(off) {
  return u32(bios[off >>> 2]);
}

function scratch_load8(off) {
  return word_load8(scratch[off >>> 2], off);
}

function scratch_load16(off) {
  return word_load16(scratch[off >>> 2], off);
}

function scratch_load32(off) {
  return u32(scratch[off >>> 2]);
}

function scratch_store8(off, v) {
  let wi = off >>> 2;
  scratch[wi] = word_store8(scratch[wi], off, v);
}

function scratch_store16(off, v) {
  let wi = off >>> 2;
  scratch[wi] = word_store16(scratch[wi], off, v);
}

function scratch_store32(off, v) {
  scratch[off >>> 2] = u32(v);
}

function spuHw_load16(off) {
  return spuHw[off] | (spuHw[off + 1] << 8);
}

function spuHw_store16(off, v) {
  v = u16(v);
  spuHw[off] = v & 255;
  spuHw[off + 1] = v >>> 8;
}

function spuHw_load32(off) {
  return u32(spuHw[off] | (spuHw[off + 1] << 8) | (spuHw[off + 2] << 16) | (spuHw[off + 3] << 24));
}

function spuHw_store32(off, v) {
  v = u32(v);
  spuHw[off] = v & 255;
  spuHw[off + 1] = (v >>> 8) & 255;
  spuHw[off + 2] = (v >>> 16) & 255;
  spuHw[off + 3] = v >>> 24;
}

function spuRam_load16(off) {
  return word_load16(spuRam[off >>> 2], off);
}

function spuRam_store8(off, v) {
  let wi = off >>> 2;
  spuRam[wi] = word_store8(spuRam[wi], off, v);
}

function disc_word(i) {
  if (i < 0) return 0;
  if (i >= disc.length) return 0;
  return u32(disc[i]);
}

function bus_bios(write, offset, value, width) {
  g_bus_access_cycles = 18;
  if (write) return 0;
  if (width == 32) return bios_load32(offset);
  if (width == 16) return bios_load16(offset);
  return bios_load8(offset);
}

function bus_ram(write, offset, value, width) {
  g_bus_access_cycles = 0;
  if (!write && ((mc2_ram_size >>> 9) & 7) == 3 && offset >= 4194304) {
    if (width == 32) return 4294967295;
    if (width == 16) return 65535;
    return 255;
  }
  offset = offset & (g_ram_size - 1);
  if (write) {
    if (width == 32) ram_store32(offset, value);
    else if (width == 16) ram_store16(offset, value);
    else ram_store8(offset, value);
    return 0;
  }
  if (width == 32) return ram_load32(offset);
  if (width == 16) return ram_load16(offset);
  return ram_load8(offset);
}

function bus_scratch(write, offset, value, width) {
  g_bus_access_cycles = 0;
  if (write) {
    if (width == 32) scratch_store32(offset, value);
    else if (width == 16) scratch_store16(offset, value);
    else scratch_store8(offset, value);
    return 0;
  }
  if (width == 32) return scratch_load32(offset);
  if (width == 16) return scratch_load16(offset);
  return scratch_load8(offset);
}

function OP() {
  return cpu_opcode;
}

function psx_bios_init() {
}

function psx_disc_read_data(lba) {
  return psx_disc_read_into(lba, 0);
}

function psx_disc_read_xa(lba) {
  return psx_disc_read_into(lba, 1);
}

function psx_disc_read_into(lba, xa) {
  if (lba >= cdrom_disc_track_end) return 0;
  if (lba < cdrom_disc_track_start) {
    let i = 0;
    while (i < 2352) {
      if (xa) cdrom_xa_buf[i] = 0;
      else cdrom_data_buf[i] = 0;
      i++;
    }
    i = 1;
    while (i < 11) {
      if (xa) cdrom_xa_buf[i] = 255;
      else cdrom_data_buf[i] = 255;
      i++;
    }
    return 3;
  }
  let base = (lba - cdrom_disc_track_start) * 588;
  let w = 0;
  while (w < 588) {
    let val = disc_word(base + w);
    let b = 0;
    while (b < 4) {
      let bytev = trunc(val / pow2(b * 8)) % 256;
      let di = w * 4 + b;
      if (xa) cdrom_xa_buf[di] = bytev;
      else cdrom_data_buf[di] = bytev;
      b++;
    }
    w++;
  }
  return 1;
}

function disc_get_cd_type() {
  if (!psx_disc_read_data(166)) return 3;
  if (cdrom_data_buf[32] != 80) return 2;
  if (cdrom_data_buf[33] != 76) return 2;
  if (cdrom_data_buf[34] != 65) return 2;
  if (cdrom_data_buf[35] != 89) return 2;
  if (cdrom_data_buf[36] != 83) return 2;
  if (cdrom_data_buf[37] != 84) return 2;
  if (cdrom_data_buf[38] != 65) return 2;
  if (cdrom_data_buf[39] != 84) return 2;
  if (cdrom_data_buf[40] != 73) return 2;
  if (cdrom_data_buf[41] != 79) return 2;
  if (cdrom_data_buf[42] != 78) return 2;
  return 1;
}

function gt2_disc_open_bin() {
  if (disc.length < 1) return 0;
  cdrom_disc_track_start = 150;
  cdrom_disc_track_end = 310357;
  return 1;
}

function disc_close() {
}

function psx_disc_query(lba) {
  if (lba >= cdrom_disc_track_end) return 0;
  if (lba < cdrom_disc_track_start) return 3;
  return 1;
}

function psx_disc_get_track_lba(track) {
  if (!track) return 310357;
  if (track > GT2_TRACK_COUNT) return 0;
  if (track == 1) return 150;
  return 0;
}

function psx_cdrom_open() {
  cdrom_pending_command = 28;
  cdrom_exec_cmd();
  if (!gt2_disc_open_bin()) {
    cdrom_disc_open = 0;
    return 0;
  }
  cdrom_disc_open = 1;
  cdrom_disc_type = disc_get_cd_type();
  if (cdrom_disc_type == 0) {
    disc_close();
    cdrom_disc_open = 0;
    return 0;
  }
  return 1;
}

function timer_gpu_dot_div() {
  if (gpu_display_mode & 64) return 49;
  let m = gpu_display_mode & 3;
  if (m == 0) return 10;
  if (m == 1) return 8;
  if (m == 2) return 5;
  return 4;
}
'''


HAND_CPU_INIT = r'''
function psx_cpu_init() {
  let i = 0;
  while (i < 32) {
    cpu_r[i] = 0;
    i++;
  }
  cpu_opcode = 0;
  cpu_pc = 0;
  cpu_next_pc = 0;
  cpu_saved_pc = 0;
  cpu_hi = 0;
  cpu_lo = 0;
  cpu_load_d = 0;
  cpu_load_v = 0;
  cpu_last_cycles = 0;
  cpu_total_cycles = 0;
  cpu_branch = 0;
  cpu_delay_slot = 0;
  cpu_branch_taken = 0;
  i = 0;
  while (i < 16) {
    cpu_cop0_r[i] = 0;
    i++;
  }
  i = 0;
  while (i < 3) {
    cpu_cop2_dr_v_xy[i] = 0;
    cpu_cop2_dr_v_z[i] = 0;
    i++;
  }
  cpu_cop2_dr_rgbc_u32 = 0;
  i = 0;
  while (i < 4) {
    cpu_cop2_dr_sxy_xy[i] = 0;
    i++;
  }
  cpu_cop2_dr_rgb0_u32 = 0;
  cpu_cop2_dr_rgb1_u32 = 0;
  cpu_cop2_dr_rgb2_u32 = 0;
  cpu_cop2_dr_mac0 = 0;
  cpu_cop2_dr_ir0 = 0;
  cpu_cop2_dr_ir1 = 0;
  cpu_cop2_dr_ir2 = 0;
  cpu_cop2_dr_ir3 = 0;
  cpu_cop2_dr_sz0 = 0;
  cpu_cop2_dr_sz1 = 0;
  cpu_cop2_dr_sz2 = 0;
  cpu_cop2_dr_sz3 = 0;
  cpu_cop2_dr_mac1 = 0;
  cpu_cop2_dr_mac2 = 0;
  cpu_cop2_dr_mac3 = 0;
  cpu_cop2_dr_otz = 0;
  cpu_cop2_dr_res1 = 0;
  cpu_cop2_dr_irgb = 0;
  cpu_cop2_dr_lzcs = 0;
  cpu_cop2_dr_lzcr = 0;
  i = 0;
  while (i < 8) {
    gteRT[i] = 0;
    gteL[i] = 0;
    gteLR[i] = 0;
    i++;
  }
  cpu_cop2_cr_rt_33 = 0;
  cpu_cop2_cr_tr_x = 0;
  cpu_cop2_cr_tr_y = 0;
  cpu_cop2_cr_tr_z = 0;
  cpu_cop2_cr_l_33 = 0;
  cpu_cop2_cr_bk_x = 0;
  cpu_cop2_cr_bk_y = 0;
  cpu_cop2_cr_bk_z = 0;
  cpu_cop2_cr_lr_33 = 0;
  cpu_cop2_cr_fc_x = 0;
  cpu_cop2_cr_fc_y = 0;
  cpu_cop2_cr_fc_z = 0;
  cpu_cop2_cr_ofx = 0;
  cpu_cop2_cr_ofy = 0;
  cpu_cop2_cr_h = 0;
  cpu_cop2_cr_dqa = 0;
  cpu_cop2_cr_dqb = 0;
  cpu_cop2_cr_zsf3 = 0;
  cpu_cop2_cr_zsf4 = 0;
  cpu_cop2_cr_flag = 0;
  cpu_pc = 3217031168;
  cpu_next_pc = u32(cpu_pc + 4);
  cpu_cop0_r[12] = 277872640;
  cpu_cop0_r[15] = 2;
}
'''

HAND_DMA = r'''
function psx_dma_init() {
  let i = 0;
  while (i < 21) {
    dmaReg[i] = 0;
    i++;
  }
  g_dma_mdec_in_irq_delay = 0;
  g_dma_mdec_out_irq_delay = 0;
  g_dma_cdrom_irq_delay = 0;
  g_dma_spu_irq_delay = 0;
  g_dma_gpu_irq_delay = 0;
  g_dma_otc_irq_delay = 0;
  g_dma_dpcr = 124065569;
  g_dma_dicr = 0;
}

function psx_dma_do_gpu() {
  if (!(dmaReg[8] & 16777216)) return;
  let step = dmaReg[8] & 2 ? -4 : 4;
  let mode = (dmaReg[8] & 1536) >>> 9;
  if (mode == 1) {
    let n = (dmaReg[7] & 65535) * ((dmaReg[7] >>> 16) & 65535);
    let i = 0;
    while (i < n) {
      if (dmaReg[8] & 1) {
        psx_bus_write32(528482320, bus_access(0, dmaReg[6], 0, 32));
      } else {
        psx_bus_write32(dmaReg[6], bus_access(0, 528482320, 0, 32));
      }
      dmaReg[6] = u32(dmaReg[6] + step);
      i++;
    }
    g_dma_gpu_irq_delay = n;
  } else if (mode == 2) {
    let hdr = bus_access(0, dmaReg[6], 0, 32);
    let size = hdr >>> 24;
    let addr = dmaReg[6];
    dmaListGo = 1;
    while (dmaListGo) {
      while (size > 0) {
        size = size - 1;
        addr = u32((addr + step) & 2097148);
        psx_bus_write32(528482320, bus_access(0, addr, 0, 32));
        g_dma_gpu_irq_delay++;
      }
      addr = hdr & 16777215;
      if (addr == 16777215) {
        dmaListGo = 0;
      } else {
        hdr = bus_access(0, addr, 0, 32);
        size = hdr >>> 24;
      }
    }
  }
  dmaReg[8] = dmaReg[8] & ~(16777216 | 268435456);
  dmaReg[7] = 0;
}
'''

HAND_RASTER = r'''
function gpu_render_triangle(i0, i1, i2, edge) {
  edge = edge;
  let v0x = gpu_v_x[i0];
  let v0y = gpu_v_y[i0];
  let v1x = gpu_v_x[i1];
  let v1y = gpu_v_y[i1];
  let v2x = gpu_v_x[i2];
  let v2y = gpu_v_y[i2];
  let v0tx = gpu_v_tx[i0];
  let v0ty = gpu_v_ty[i0];
  let v1tx = gpu_v_tx[i1];
  let v1ty = gpu_v_ty[i1];
  let v2tx = gpu_v_tx[i2];
  let v2ty = gpu_v_ty[i2];
  let mod = gpu_v_c[0];
  let tpx = (gpu_draw_texp & 15) << 6;
  let tpy = (gpu_draw_texp & 16) << 4;
  let clutx = (gpu_draw_clut & 63) << 4;
  let cluty = (gpu_draw_clut >>> 6) & 511;
  let depth = (gpu_draw_texp >>> 7) & 3;
  let transp = (gpu_draw_attrib & 2) != 0;
  let ax = v0x;
  let ay = v0y;
  let atx = v0tx;
  let aty = v0ty;
  let bx;
  let by;
  let btx;
  let bty;
  let cx;
  let cy;
  let ctx;
  let cty;
  if ((v1x - v0x) * (v2y - v0y) - (v1y - v0y) * (v2x - v0x) < 0) {
    bx = v2x;
    by = v2y;
    btx = v2tx;
    bty = v2ty;
    cx = v1x;
    cy = v1y;
    ctx = v1tx;
    cty = v1ty;
  } else {
    bx = v1x;
    by = v1y;
    btx = v1tx;
    bty = v1ty;
    cx = v2x;
    cy = v2y;
    ctx = v2tx;
    cty = v2ty;
  }
  ax = ax + gpu_off_x;
  bx = bx + gpu_off_x;
  cx = cx + gpu_off_x;
  ay = ay + gpu_off_y;
  by = by + gpu_off_y;
  cy = cy + gpu_off_y;
  let xmin = Math.min(ax, bx, cx);
  let ymin = Math.min(ay, by, cy);
  let xmax = Math.max(ax, bx, cx);
  let ymax = Math.max(ay, by, cy);
  if (xmax - xmin > 2048 || ymax - ymin > 1024) return;
  let area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (!area) return;
  let y = ymin;
  while (y < ymax) {
    let x = xmin;
    while (x < xmax) {
      let in_clip = x >= gpu_draw_x1 && x <= gpu_draw_x2 && y >= gpu_draw_y1 && y <= gpu_draw_y2;
      if (in_clip) {
        let px = x;
        let py = y;
        let z0 = (cx - bx) * (py - by) - (cy - by) * (px - bx);
        if (!(z0 < 0 || (z0 == 0 && (cy > by || (cy == by && cx < bx))))) {
          let z1 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
          if (!(z1 < 0 || (z1 == 0 && (ay > cy || (ay == cy && ax < cx))))) {
            let z2 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
            if (!(z2 < 0 || (z2 == 0 && (by > ay || (by == ay && bx < ax))))) {
              let color = 0;
              let pixel_transp = transp;
              let drawPx = 1;
              if (gpu_draw_attrib & 4) {
                let tx = trunc((z0 * atx + z1 * btx + z2 * ctx) / area);
                let ty = trunc((z0 * aty + z1 * bty + z2 * cty) / area);
                let texel = gpu_fetch_texel(tx, ty, tpx, tpy, clutx, cluty, depth);
                if (!texel) drawPx = 0;
                else {
                  if (gpu_draw_attrib & 2) pixel_transp = (texel & 32768) != 0;
                  color = gpu_draw_attrib & 1 ? texel : gpu_modulate_texel(texel, mod);
                }
              } else {
                color = ((mod & 248) >>> 3) | ((mod & 63488) >>> 6) | ((mod & 16252928) >>> 9);
              }
              if (drawPx) gpu_draw_pixel(x, y, color, pixel_transp);
            }
          }
        }
      }
      x++;
    }
    y++;
  }
}

function gpu_render_rect() {
  let width = 0;
  let height = 0;
  switch ((gpu_draw_attrib >>> 3) & 3) {
    case 0:
      width = gpu_rect_w;
      height = gpu_rect_h;
      break;
    case 1:
      width = 1;
      height = 1;
      break;
    case 2:
      width = 8;
      height = 8;
      break;
    default:
      width = 16;
      height = 16;
      break;
  }
  let textured = (gpu_draw_attrib & 4) != 0;
  let transp = (gpu_draw_attrib & 2) != 0;
  let clutx = (gpu_draw_clut & 63) << 4;
  let cluty = (gpu_draw_clut >>> 6) & 511;
  let x0 = gpu_rect_x + gpu_off_x;
  let y0 = gpu_rect_y + gpu_off_y;
  x0 = s16(s16(x0) << 5) >> 5;
  y0 = s16(s16(y0) << 5) >> 5;
  let xmax = x0 + width;
  let ymax = y0 + height;
  xmax = xmax <= -1024 ? -1024 : xmax >= 1024 ? 1024 : xmax;
  ymax = ymax <= -1024 ? -1024 : ymax >= 1024 ? 1024 : ymax;
  x0 = x0 <= -1024 ? -1024 : x0 >= 1024 ? 1024 : x0;
  y0 = y0 <= -1024 ? -1024 : y0 >= 1024 ? 1024 : y0;
  let xc = 0;
  let yc = 0;
  let y = y0;
  while (y < ymax) {
    let x = x0;
    xc = 0;
    while (x < xmax) {
      let bc = x >= gpu_draw_x1 && x <= gpu_draw_x2 && y >= gpu_draw_y1 && y <= gpu_draw_y2;
      if (bc) {
        let color = 0;
        let pixel_transp = transp;
        let drawPx = 1;
        if (textured) {
          let texel = gpu_fetch_texel(gpu_rect_tx + xc, gpu_rect_ty + yc, gpu_texp_x, gpu_texp_y, clutx, cluty, gpu_texp_d);
          if (!texel) drawPx = 0;
          else {
            if (gpu_draw_attrib & 2) pixel_transp = (texel & 32768) != 0;
            color = gpu_modulate_texel(texel, gpu_rect_c);
          }
        } else {
          color = ((gpu_rect_c & 248) >>> 3) | ((gpu_rect_c & 63488) >>> 6) | ((gpu_rect_c & 16252928) >>> 9);
        }
        if (drawPx) gpu_draw_pixel(x, y, color, pixel_transp);
      }
      xc++;
      x++;
    }
    yc++;
    y++;
  }
}
'''

HAND_MDEC = r'''
function mdec_input_u16(index) {
  let word = index >>> 1;
  let half = index & 1;
  let v = mdec_input[word];
  return half ? (v >>> 16) & 65535 : v & 65535;
}

function mdec_input_byte(bi) {
  return trunc(u32(mdec_input[bi >>> 2]) / pow2((bi & 3) * 8)) % 256;
}

function mdec_blk_get(id, i) {
  if (id == 0) return mdec_yblk[i];
  if (id == 1) return mdec_crblk[i];
  return mdec_cbblk[i];
}

function mdec_blk_set(id, i, v) {
  if (id == 0) mdec_yblk[i] = v;
  else if (id == 1) mdec_crblk[i] = v;
  else mdec_cbblk[i] = v;
}

function mdec_quant_get(qid, k) {
  if (qid == 0) return mdec_y_quant_table[k];
  return mdec_uv_quant_table[k];
}

function real_idct(blkId) {
  let i = 0;
  while (i < 64) {
    mdecIdct0[i] = mdec_blk_get(blkId, i);
    i++;
  }
  let pass = 0;
  while (pass < 2) {
    let x = 0;
    while (x < 8) {
      let y = 0;
      while (y < 8) {
        let sum = 0;
        let z = 0;
        while (z < 8) {
          let sv = pass == 0 ? mdecIdct0[y + z * 8] : mdecIdct1[y + z * 8];
          sum = sum + s32(sv) * s32(mdec_scale_table[x + z * 8] / 8);
          z++;
        }
        let outv = s16((sum + 4095) / 8192);
        if (pass == 0) mdecIdct1[x + y * 8] = outv;
        else mdecIdct0[x + y * 8] = outv;
        y++;
      }
      x++;
    }
    pass++;
  }
  i = 0;
  while (i < 64) {
    mdec_blk_set(blkId, i, mdecIdct0[i]);
    i++;
  }
}

function rl_decode_block(blkId, srcIndex, qid) {
  let k = 0;
  while (k < 64) {
    mdec_blk_set(blkId, k, 0);
    k++;
  }
  k = 0;
  let n = mdec_input_u16(srcIndex);
  srcIndex++;
  while (n == 65024) {
    n = mdec_input_u16(srcIndex);
    srcIndex++;
  }
  let q_scale = (n >>> 10) & 63;
  let val = s16(s16((n & 1023) << 6) >> 6) * mdec_quant_get(qid, k);
  while (k < 64) {
    if (!q_scale) val = s16(s16((n & 1023) << 6) >> 6) * 2;
    val = s16(val <= -1024 ? -1024 : val >= 1023 ? 1023 : val);
    if (q_scale > 0) mdec_blk_set(blkId, MDEC_ZAGZIG[k], val);
    if (!q_scale) mdec_blk_set(blkId, k, val);
    n = mdec_input_u16(srcIndex);
    srcIndex++;
    if (k == 63) {
      k = 64;
    } else {
      k = k + ((n >>> 10) & 63) + 1;
      val = s16(trunc((s16(s16((n & 1023) << 6) >> 6) * mdec_quant_get(qid, k) * q_scale + 4) / 8));
    }
  }
  real_idct(blkId);
  return srcIndex;
}

function yuv_to_rgb(baseOff, xx, yy) {
  let y = 0;
  while (y < 8) {
    let x = 0;
    while (x < 8) {
      let rv = mdec_crblk[((x + xx) >> 1) + ((y + yy) >> 1) * 8];
      let bv = mdec_cbblk[((x + xx) >> 1) + ((y + yy) >> 1) * 8];
      let gv = trunc((-3437 * bv - 7143 * rv) / 10000);
      let l = mdec_yblk[x + y * 8];
      rv = trunc((1402 * rv) / 1000);
      bv = trunc((1772 * bv) / 1000);
      rv = l + rv <= -128 ? -128 : l + rv >= 127 ? 127 : l + rv;
      gv = l + gv <= -128 ? -128 : l + gv >= 127 ? 127 : l + gv;
      bv = l + bv <= -128 ? -128 : l + bv >= 127 ? 127 : l + bv;
      if (!mdec_output_signed) {
        rv = rv ^ 128;
        gv = gv ^ 128;
        bv = bv ^ 128;
      }
      let pix = baseOff + ((x + xx) + (y + yy) * 16) * 3;
      mdec_output[pix] = u8(rv);
      mdec_output[pix + 1] = u8(gv);
      mdec_output[pix + 2] = u8(bv);
      x++;
    }
    y++;
  }
}

function mdec_decode_macroblock() {
  if (mdec_output_depth < 2) {
    rl_decode_block(0, 0, 0);
    let i = 0;
    while (i < 196608) {
      mdec_output[i] = 0;
      i++;
    }
    mdec_output_words_remaining = 8;
    mdec_output_empty = 0;
    mdec_output_index = 0;
  } else {
    let srcIdx = 0;
    let block_size = 768;
    let bytes_processed = 0;
    let block_count = 1;
    mdecLoopGo = 1;
    while (mdecLoopGo) {
      if (bytes_processed >= mdec_input_size) mdecLoopGo = 0;
      else if (block_count * block_size > 196608) mdecLoopGo = 0;
      else {
        srcIdx = rl_decode_block(1, srcIdx, 1);
        srcIdx = rl_decode_block(2, srcIdx, 1);
        srcIdx = rl_decode_block(0, srcIdx, 0);
        yuv_to_rgb(block_count * block_size - block_size, 0, 0);
        srcIdx = rl_decode_block(0, srcIdx, 0);
        yuv_to_rgb(block_count * block_size - block_size, 8, 0);
        srcIdx = rl_decode_block(0, srcIdx, 0);
        yuv_to_rgb(block_count * block_size - block_size, 0, 8);
        srcIdx = rl_decode_block(0, srcIdx, 0);
        yuv_to_rgb(block_count * block_size - block_size, 8, 8);
        bytes_processed = srcIdx * 2;
        block_count++;
      }
    }
    mdec_output_words_remaining = ((block_count - 1) * block_size) >>> 2;
    mdec_output_empty = 0;
    mdec_output_index = 0;
  }
}

function mdec_set_iqtab() {
  let i = 0;
  while (i < 64) {
    mdec_y_quant_table[i] = mdec_input_byte(i);
    i++;
  }
  if (mdec_recv_color) {
    i = 0;
    while (i < 64) {
      mdec_uv_quant_table[i] = mdec_input_byte(64 + i);
      i++;
    }
  }
}

function mdec_set_scale() {
  let i = 0;
  while (i < 64) {
    let w = mdec_input[i >>> 1];
    let h = i & 1 ? (w >>> 16) & 65535 : w & 65535;
    mdec_scale_table[i] = s16(h);
    i++;
  }
}

function mdec_run_cmd() {
  switch (mdec_cmd >>> 29) {
    case 1:
      mdec_decode_macroblock();
      break;
    case 2:
      mdec_set_iqtab();
      break;
    case 3:
      mdec_set_scale();
      break;
  }
}

function mdec_out_load32(off) {
  return u32(mdec_output[off] | (mdec_output[off + 1] << 8) | (mdec_output[off + 2] << 16) | (mdec_output[off + 3] << 24));
}

function bus_mdec(write, offset, value, width) {
  let mdec_off = offset & ~3;
  let mdec_val = write_value_as_32(value, offset, width);
  let mdec_reg = 0;
  g_bus_access_cycles = 0;
  if (write) {
    if (mdec_off == 0) {
      if (mdec_words_remaining) {
        mdec_input[mdec_input_index] = mdec_val;
        mdec_input_index++;
        mdec_words_remaining--;
        if (!mdec_words_remaining) {
          mdec_output_empty = 0;
          mdec_input_full = 1;
          mdec_input_request = 0;
          mdec_busy = 0;
          mdec_output_request = mdec_enable_dma1;
          mdec_run_cmd();
        }
      } else {
        mdec_cmd = mdec_val;
        if ((mdec_val >>> 29) == 1) mdec_cmd_decode_count++;
        mdec_output_request = 0;
        mdec_output_empty = 1;
        mdec_output_bit15 = (mdec_val >>> 25) & 1;
        mdec_output_signed = (mdec_val >>> 26) & 1;
        mdec_output_depth = (mdec_val >>> 27) & 3;
        mdec_input_index = 0;
        mdec_input_full = 0;
        mdec_busy = 1;
        if ((mdec_cmd >>> 29) == 0) {
          mdec_busy = 0;
          mdec_words_remaining = 0;
        } else if ((mdec_cmd >>> 29) == 1) {
          mdec_words_remaining = mdec_cmd & 65535;
        } else if ((mdec_cmd >>> 29) == 2) {
          mdec_recv_color = mdec_cmd & 1;
          mdec_words_remaining = mdec_recv_color ? 32 : 16;
        } else if ((mdec_cmd >>> 29) == 3) {
          mdec_words_remaining = 32;
        }
        if (mdec_words_remaining) {
          mdec_input_request = 1;
          mdec_input_size = mdec_words_remaining * 4;
          mdec_input_full = 0;
          mdec_input_index = 0;
        }
      }
    } else if (mdec_off == 4) {
      mdec_enable_dma0 = (mdec_val & 1073741824) != 0;
      mdec_enable_dma1 = (mdec_val & 536870912) != 0;
      if (mdec_val & 2147483648) {
        mdec_busy = 0;
        mdec_words_remaining = 0;
        mdec_output_bit15 = 0;
        mdec_output_signed = 0;
        mdec_output_depth = 0;
        mdec_input_request = 0;
        mdec_output_request = 0;
        mdec_input_full = 0;
        mdec_output_empty = 1;
        mdec_current_block = 4;
      }
    }
    return 0;
  }
  if (mdec_off == 0) {
    if (mdec_output_words_remaining) {
      mdec_output_words_remaining--;
      mdec_reg = mdec_out_load32(mdec_output_index * 4);
      mdec_output_index++;
    } else {
      mdec_output_empty = 0;
      mdec_output_index = 0;
      mdec_output_request = 0;
      mdec_reg = 2863311530;
    }
  } else if (mdec_off == 4) {
    mdec_reg = mdec_words_remaining;
    mdec_reg = mdec_reg | (mdec_current_block << 16);
    mdec_reg = mdec_reg | (mdec_output_bit15 << 23);
    mdec_reg = mdec_reg | (mdec_output_signed << 24);
    mdec_reg = mdec_reg | (mdec_output_depth << 25);
    mdec_reg = mdec_reg | (mdec_output_request << 27);
    mdec_reg = mdec_reg | (mdec_input_request << 28);
    mdec_reg = mdec_reg | (mdec_busy << 29);
    mdec_reg = mdec_reg | (mdec_input_full << 30);
    mdec_reg = mdec_reg | (mdec_output_empty ? 2147483648 : 0);
  }
  return read32_as_width(mdec_reg, offset, width);
}
'''

HAND_SPU_XA = r'''
function spu_hw_u16(off) {
  return spuHw_load16(off);
}

function spu_hw_set_u16(off, v) {
  spuHw_store16(off, v);
}

function spu_hw_u32(off) {
  return spuHw_load32(off);
}

function spu_hw_set_u32(off, v) {
  spuHw_store32(off, v);
}

function spu_tfifo_flush() {
  let count = spu_hw_u16(580);
  let addr = spu_hw_u32(512);
  let i = 0;
  while (i < count) {
    let sample = spu_hw_u16(516 + i * 2);
    spuRam_store8(addr, sample & 255);
    addr++;
    spuRam_store8(addr, sample >>> 8);
    addr++;
    i++;
  }
  spu_hw_set_u32(512, addr);
  spu_hw_set_u16(580, 0);
}

function spu_key_on(value) {
  let i = 0;
  while (i < 24) {
    if (value & (1 << i)) {
      spu_voice_left[i] = 768 * 60;
      spu_hw_set_u16(i * 8 + 6, 32767);
    }
    i++;
  }
  spu_hw_set_u32(412, spu_hw_u32(412) & ~(value & 16777215));
}

function spu_stub_tick() {
  if (spu_hw_u16(426) & 16384) {
    spu_hw_set_u32(594, spu_hw_u32(594) ^ 1);
    spu_hw_set_u32(396, 0);
    spu_hw_set_u32(392, 0);
  }
  let v = 0;
  while (v < 24) {
    if (spu_voice_left[v]) {
      spu_voice_left[v]--;
      if (!spu_voice_left[v]) spu_voice_end(v);
    }
    v++;
  }
}

function cdrom_fetch_xa_sector() {
  xaGo = 1;
  xaRet = 0;
  while (xaGo) {
    let ts = psx_disc_read_xa(cdrom_xa_lba);
    if (ts == 0) {
      xaRet = 0;
      xaGo = 0;
    } else if (cdrom_xa_buf[18] & 1) {
      xaRet = 0;
      xaGo = 0;
    } else {
      cdrom_xa_lba++;
      if (cdrom_xa_buf[18] & 4) {
        if (!(cdrom_mode & 8)) {
          xaRet = 1;
          xaGo = 0;
        } else if (cdrom_xa_buf[16] == cdrom_xa_file && cdrom_xa_buf[17] == cdrom_xa_channel) {
          xaRet = 1;
          xaGo = 0;
        }
      }
    }
  }
  return xaRet;
}
'''

HAND_PSX = r'''
function psx_update() {
  psx_cpu_cycle();
  psx_cdrom_update(cpu_last_cycles);
  psx_gpu_update(cpu_last_cycles);
  psx_pad_update(cpu_last_cycles);
  psx_timer_update(cpu_last_cycles);
  psx_dma_update(cpu_last_cycles);
  psx_audio_tick(cpu_last_cycles);
}

function psx_init() {
  psx_bios_init();
  psx_dma_init();
  psx_gpu_init();
  psx_spu_init();
  psx_cpu_init();
  return 0;
}
'''

HAND_FRONTEND = r'''
function expand5(v) {
  v = v & 31;
  return v * 8 + Math.floor(v / 4);
}

function updateDisplaySize() {
  if (gpu_display_mode & 64) dispW = 384;
  else {
    switch (gpu_display_mode & 3) {
      case 0:
        dispW = 256;
        break;
      case 1:
        dispW = 320;
        break;
      case 2:
        dispW = 512;
        break;
      case 3:
        dispW = 640;
        break;
      default:
        dispW = 320;
        break;
    }
  }
  if (gpu_display_mode & 4) dispH = 480;
  else {
    let range = gpu_disp_y2 - gpu_disp_y1;
    dispH = range > 0 && range < 239 ? range : 240;
  }
  rgb24 = (gpu_display_mode >>> 4) & 1;
  gfxW = Math.floor(dispW / pixelStep);
  gfxH = Math.floor(dispH / pixelStep);
  gfxLen = gfxW * gfxH;
  while (gfx.length < gfxLen) {
    gfx.push(0);
    prev.push(0 - 1);
  }
}

function vram16(x, y) {
  return vram[x + y * 1024] & 65535;
}

function pixelColor(sx, sy) {
  if (rgb24) {
    let base = (gpu_disp_x + sx) * 2 + (gpu_disp_y + sy) * 2048;
    let b0 = trunc(vram[Math.floor(base / 2)] / pow2((base & 1) * 8)) % 256;
    let b1off = base + 1;
    let b1 = trunc(vram[Math.floor(b1off / 2)] / pow2((b1off & 1) * 8)) % 256;
    let b2off = base + 2;
    let b2 = trunc(vram[Math.floor(b2off / 2)] / pow2((b2off & 1) * 8)) % 256;
    return b0 * 65536 + b1 * 256 + b2;
  }
  let px = vram16(gpu_disp_x + sx, gpu_disp_y + sy) & 32767;
  let r = expand5(px);
  let g = expand5(px >>> 5);
  let b = expand5(px >>> 10);
  return r * 65536 + g * 256 + b;
}

function plotPixel(x, y, color) {
  goTo(x - (gfxW * pixelStep) / 2, (gfxH * pixelStep) / 2 - y);
  pen.setColor(color);
  pen.down();
  changeX(1);
  pen.up();
}

function blit() {
  if (gpu_gpustat & 8388608) return;
  updateDisplaySize();
  let i = 0;
  while (i < gfxLen) {
    let gx = i % gfxW;
    let gy = Math.floor(i / gfxW);
    let color = pixelColor(gx * pixelStep, gy * pixelStep);
    if (color != prev[i]) {
      prev[i] = color;
      gfx[i] = color;
      plotPixel(gx * pixelStep, gy * pixelStep, color);
    }
    i++;
  }
}

function pollKeys() {
  pad_buttons = 65535;
  if (keyPressed("x")) pad_buttons = pad_buttons & ~16384;
  if (keyPressed("a")) pad_buttons = pad_buttons & ~32768;
  if (keyPressed("w")) pad_buttons = pad_buttons & ~4096;
  if (keyPressed("d")) pad_buttons = pad_buttons & ~8192;
  if (keyPressed("enter")) pad_buttons = pad_buttons & ~8;
  if (keyPressed("s")) pad_buttons = pad_buttons & ~1;
  if (keyPressed("up arrow")) pad_buttons = pad_buttons & ~16;
  if (keyPressed("down arrow")) pad_buttons = pad_buttons & ~64;
  if (keyPressed("left arrow")) pad_buttons = pad_buttons & ~128;
  if (keyPressed("right arrow")) pad_buttons = pad_buttons & ~32;
  if (keyPressed("q")) pad_buttons = pad_buttons & ~1024;
  if (keyPressed("e")) pad_buttons = pad_buttons & ~2048;
  if (keyPressed("1")) pad_buttons = pad_buttons & ~256;
  if (keyPressed("3")) pad_buttons = pad_buttons & ~512;
  if (keyPressed("z")) pad_buttons = pad_buttons & ~2;
  if (keyPressed("c")) pad_buttons = pad_buttons & ~4;
}

function growN(lstNeed, kind) {
  if (kind == 0) {
    while (ram.length < lstNeed) ram.push(0);
  } else if (kind == 1) {
    while (scratch.length < lstNeed) scratch.push(0);
  } else if (kind == 2) {
    while (vram.length < lstNeed) vram.push(0);
  } else if (kind == 3) {
    while (spuRam.length < lstNeed) spuRam.push(0);
  } else if (kind == 4) {
    while (spuHw.length < lstNeed) spuHw.push(0);
  } else if (kind == 5) {
    while (cpu_r.length < lstNeed) cpu_r.push(0);
  } else if (kind == 6) {
    while (cpu_cop0_r.length < lstNeed) cpu_cop0_r.push(0);
  } else if (kind == 7) {
    while (mdec_input.length < lstNeed) mdec_input.push(0);
  } else if (kind == 8) {
    while (mdec_output.length < lstNeed) mdec_output.push(0);
  }
}

function bootFill() {
  g_ram_size = 2097152;
  growN(524288, 0);
  growN(256, 1);
  growN(524288, 2);
  growN(131072, 3);
  growN(598, 4);
  growN(32, 5);
  growN(16, 6);
  while (cpu_cop2_dr_v_xy.length < 3) cpu_cop2_dr_v_xy.push(0);
  while (cpu_cop2_dr_v_z.length < 3) cpu_cop2_dr_v_z.push(0);
  while (cpu_cop2_dr_sxy_xy.length < 4) cpu_cop2_dr_sxy_xy.push(0);
  while (gteRT.length < 8) gteRT.push(0);
  while (gteL.length < 8) gteL.push(0);
  while (gteLR.length < 8) gteLR.push(0);
  while (dmaReg.length < 21) dmaReg.push(0);
  while (timer_counter.length < 3) timer_counter.push(0);
  while (timer_target.length < 3) timer_target.push(0);
  while (timer_mode.length < 3) timer_mode.push(0);
  while (timer_irq_fired.length < 3) timer_irq_fired.push(0);
  while (timer_paused.length < 3) timer_paused.push(0);
  while (timer_blank_once.length < 3) timer_blank_once.push(0);
  while (cdrom_data_buf.length < 2352) cdrom_data_buf.push(0);
  while (cdrom_xa_buf.length < 2352) cdrom_xa_buf.push(0);
  while (cdrom_resp_buf.length < 32) cdrom_resp_buf.push(0);
  while (cdrom_param_buf.length < 32) cdrom_param_buf.push(0);
  while (pad_rxq.length < 8) pad_rxq.push(0);
  while (gpu_buf.length < 16) gpu_buf.push(0);
  while (gpu_v_x.length < 4) gpu_v_x.push(0);
  while (gpu_v_y.length < 4) gpu_v_y.push(0);
  while (gpu_v_c.length < 4) gpu_v_c.push(0);
  while (gpu_v_tx.length < 4) gpu_v_tx.push(0);
  while (gpu_v_ty.length < 4) gpu_v_ty.push(0);
  growN(65535, 7);
  growN(196608, 8);
  while (mdec_uv_quant_table.length < 64) mdec_uv_quant_table.push(0);
  while (mdec_y_quant_table.length < 64) mdec_y_quant_table.push(0);
  while (mdec_scale_table.length < 64) mdec_scale_table.push(0);
  while (mdec_yblk.length < 64) mdec_yblk.push(0);
  while (mdec_crblk.length < 64) mdec_crblk.push(0);
  while (mdec_cbblk.length < 64) mdec_cbblk.push(0);
  while (mdecIdct0.length < 64) mdecIdct0.push(0);
  while (mdecIdct1.length < 64) mdecIdct1.push(0);
  while (spu_voice_left.length < 24) spu_voice_left.push(0);
  pixelStep = 2;
  dispW = 320;
  dispH = 240;
  updateDisplaySize();
}

function boot() {
  bootFill();
  pad_buttons = 65535;
  mdec_output_empty = 1;
  mc2_ram_size = 2952;
  cdrom_pending_lba = 150;
  cdrom_lba = 150;
  STEPS_PER_SLICE = 1000;
  psx_init();
  // psx_cdrom_open();
  hide();
  pointInDirection(90);
  pen.clear();
  pen.setSize(pixelStep);
  showVariable("fps");
  resetTimer();
}

function runSlice() {
  let n = 0;
  while (n < STEPS_PER_SLICE) {
    psx_update();
    n++;
  }
}

boot();
while (true) {
  pollKeys();
  runSlice();
  if (needRender) {
    blit();
    needRender = 0;
    fpsFrames++;
  }
  if (timer() >= 1) {
    fps = fpsFrames;
    fpsFrames = 0;
    resetTimer();
  }
  wait(0);
}
'''


def grab_const_array(src: str, name: str) -> str:
    m = re.search(rf"(?:export\s+)?(?:const|let)\s+{name}\s*=\s*", src)
    if not m:
        raise SystemExit(f"missing array {name}")
    s = convert_typed_array_literals(src[m.end() :])
    s = s.lstrip()
    if not s.startswith("["):
        raise SystemExit(f"{name} not an array")
    depth = 0
    i = 0
    while i < len(s):
        if s[i] == "[":
            depth += 1
        elif s[i] == "]":
            depth -= 1
            if depth == 0:
                return s[: i + 1]
        i += 1
    raise SystemExit(f"unclosed array {name}")


def tables_js() -> str:
    src = read_js("tables.js")
    parts = ["// --- tables ---"]
    for name in (
        "BTOI_TABLE",
        "PSX_DMA_CTRL_HW_1_TABLE",
        "PSX_DMA_CTRL_HW_0_TABLE",
        "PSX_CPU_COP0_WRITE_MASK_TABLE",
        "ITOB_TABLE",
        "CDROM_CD_GETID",
        "CDROM_VERSION_ID",
        "PSX_GTE_UNR_TABLE",
    ):
        parts.append(f"let {name} = {grab_const_array(src, name)};")
    zag = read_js("data/mdec-tables.js")
    parts.append(f"let MDEC_ZAGZIG = {grab_const_array(zag, 'MDEC_ZAGZIG')};")
    mask = transform_core(src)
    m = re.search(r"^function bus_region_mask\([\s\S]*?^\}", mask, re.M)
    if not m:
        raise SystemExit("bus_region_mask missing")
    parts.append(m.group(0))
    return "\n".join(parts) + "\n"


def patch_cpu(src: str) -> str:
    src = src.replace(
        """        case 0x18: {
          const wide = s64_to_hilo(muls32wide(cpu_r[rs()], cpu_r[rt()]));
          cpu_hi = wide.hi;
          cpu_lo = wide.lo;""",
        """        case 0x18: {
          muls32wide(cpu_r[rs()], cpu_r[rt()]);
          cpu_hi = mulHi;
          cpu_lo = mulLo;""",
    )
    src = src.replace(
        """        case 0x19: {
          const wide = s64_to_hilo(mulu32wide(cpu_r[rs()], cpu_r[rt()]));
          cpu_hi = wide.hi;
          cpu_lo = wide.lo;""",
        """        case 0x19: {
          mulu32wide(cpu_r[rs()], cpu_r[rt()]);
          cpu_hi = mulHi;
          cpu_lo = mulLo;""",
    )
    src = src.replace("cpu_hi = u32(su % tu);", "cpu_hi = u32(rems32(su, tu));")
    src = src.replace("cpu_lo = u32(trunc(su / tu));", "cpu_lo = u32(divs32(su, tu));")
    src = src.replace("cpu_hi = u32(s % t);", "cpu_hi = u32(remu32(s, t));")
    src = src.replace("cpu_lo = u32(trunc(s / t));", "cpu_lo = u32(divu32(s, t));")
    return src


def patch_timer(src: str) -> str:
    src = src.replace(
        "const div = [10, 8, 5, 4];\n    const d = gpu_display_mode & 0x40 ? 49 : div[gpu_display_mode & 3];",
        "const d = timer_gpu_dot_div();",
    )
    src = src.replace(
        "const div = [10, 8, 5, 4];\n        const d = gpu_display_mode & 0x40 ? 49 : div[gpu_display_mode & 3];",
        "const d = timer_gpu_dot_div();",
    )
    src = re.sub(
        r"const div = \[10, 8, 5, 4\];\s*const d = gpu_display_mode & 0x40 \? 49 : div\[gpu_display_mode & 3\];",
        "const d = timer_gpu_dot_div();",
        src,
    )
    return src


def patch_spu(src: str) -> str:
    src = src.replace("load_u16_le(spuRam, addr)", "spuRam_load16(addr)")
    src = src.replace("load_u16_le(spuHw, off)", "spuHw_load16(off)")
    src = src.replace("load_u32_le(spuHw, off)", "spuHw_load32(off)")
    src = src.replace("store_u16_le(spuHw, off, v)", "spuHw_store16(off, v)")
    src = src.replace("store_u32_le(spuHw, off, v)", "spuHw_store32(off, v)")
    src = src.replace("store_u32_le(spuHw, 0x19c, 0x00ffffff)", "spuHw_store32(412, 16777215)")
    src = src.replace("store_u32_le(spuHw, 412, 16777215)", "spuHw_store32(412, 16777215)")
    return src


def write_stub_bin(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = 17 * 2352
    data = bytearray(n)
    off = 16 * 2352 + 32
    data[off : off + 11] = b"PLAYSTATION"
    path.write_bytes(data)
    print(f"wrote stub disc {path} ({n} bytes)")


def ensure_disc(*, stub: bool = False) -> str:
    if not stub and DISC_ABS_CUE.is_file() and DISC_ABS_CUE.stat().st_size > 1000000:
        return DISC_REL_CUE.replace("\\", "/")
    stub_path = OUT / "gt2.bin"
    if not stub_path.is_file() or stub_path.stat().st_size < 1000:
        write_stub_bin(stub_path)
    return "gt2.bin"


def patch_gte_source(src: str) -> str:
    src = src.replace(
        "const res = Number((BigInt(reciprocal) * BigInt(n << shift) + 0x8000n) >> 16n);",
        "const res = s64_sar(reciprocal * (n << shift) + 32768, 16);",
    )
    return src


def fix_gte_mac_shifts(src: str) -> str:
    src = re.sub(
        r"\b(cpu_s_mac[03]|avg|value)\s*>>\s*12\b",
        r"s64_sar(\1, 12)",
        src,
    )
    return src


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--stub-disc",
        action="store_true",
        help="Bake a tiny gt2.bin instead of the real ~730 MB disc (for compile tests)",
    )
    args = ap.parse_args()
    disc_path = ensure_disc(stub=args.stub_disc)
    bios = OUT / "bios.bin"
    if not bios.is_file():
        src = JS / "data" / "bios.bin"
        if src.is_file():
            bios.write_bytes(src.read_bytes())
            print("copied bios.bin")
        else:
            print("warning: bios.bin missing", file=sys.stderr)

    parts: list[str] = [header(disc_path), tables_js()]

    bus = transform_core(read_js("bus.js"))
    for name in (
        "bus_load_mem",
        "bus_store_mem",
        "bus_bios",
        "bus_ram",
        "bus_scratch",
        "dma_bind",
    ):
        bus = remove_function(bus, name)
    bus = remove_call_stmt(bus, "dma_bind")
    parts.append("// --- bus ---\n" + bus)

    cpu = transform_core(read_js("cpu.js"))
    cpu = remove_function(cpu, "psx_cpu_init")
    cpu = patch_cpu(cpu)
    parts.append("// --- cpu ---\n" + cpu + HAND_CPU_INIT)

    gte = transform_core(patch_gte_source(read_js("gte.js")))
    gte = fix_gte_check_mac_3arg(gte)
    gte = unwrap_call(gte, "s64")
    gte = fix_gte_mac_shifts(gte)
    parts.append("// --- gte ---\n" + gte)

    ic = transform_core(read_js("ic.js"))
    parts.append("// --- ic ---\n" + ic)

    timer = patch_timer(transform_core(read_js("timer.js")))
    parts.append("// --- timer ---\n" + timer)

    pad = transform_core(read_js("pad.js"))
    parts.append("// --- pad ---\n" + pad)

    raster = transform_core(read_js("gpu/raster.js"))
    raster = remove_function(raster, "gpu_render_triangle")
    raster = remove_function(raster, "gpu_render_rect")
    parts.append("// --- gpu raster ---\n" + raster + HAND_RASTER)

    cmd = transform_core(read_js("gpu/cmd.js"))
    cmd = cmd.replace(
        "if (gpu_cmd_args_remaining) break;\n\n      switch (op)",
        "if (!gpu_cmd_args_remaining) {\n      switch (op)",
    )
    cmd = cmd.replace(
        "gpu_xfer_load_begin();\n          break;\n      }\n      break;\n\n    case 2:",
        "gpu_xfer_load_begin();\n          break;\n      }\n      }\n      break;\n\n    case 2:",
    )
    parts.append("// --- gpu cmd ---\n" + cmd)

    gpu = transform_core(read_js("gpu/index.js"))
    gpu = remove_function(gpu, "setFrontendHooks")
    gpu = remove_function(gpu, "psx_gpu_get_display_buffer")
    gpu = re.sub(r"let onPresent = \(\) => \{\};\s*", "", gpu)
    gpu = re.sub(r"let onDisplayModeChanged = \(\) => \{\};\s*", "", gpu)
    parts.append("// --- gpu ---\n" + gpu)

    core = transform_core(read_js("cdrom/core.js"))
    core = remove_function(core, "psx_cdrom_open")
    parts.append("// --- cdrom core ---\n" + core)

    cdcmd = transform_core(read_js("cdrom/cmd.js"))
    parts.append("// --- cdrom cmd ---\n" + cdcmd)

    cdread = transform_core(read_js("cdrom/read.js"))
    parts.append("// --- cdrom read ---\n" + cdread)

    cdaudio = transform_core(read_js("cdrom/audio.js"))
    cdaudio = remove_function(cdaudio, "cdrom_fetch_xa_sector")
    parts.append("// --- cdrom audio ---\n" + cdaudio)

    dma = transform_core(read_js("dma.js"))
    dma = remove_function(dma, "dma_bind")
    dma = remove_function(dma, "psx_dma_init")
    dma = remove_function(dma, "psx_dma_do_gpu")
    dma = re.sub(r"let bus = null;\s*", "", dma)
    parts.append("// --- dma ---\n" + dma + HAND_DMA)

    parts.append("// --- mdec ---\n" + HAND_MDEC)

    spu = patch_spu(transform_core(read_js("spu.js")))
    for name in (
        "spu_hw_u16",
        "spu_hw_set_u16",
        "spu_hw_u32",
        "spu_hw_set_u32",
        "spu_tfifo_flush",
        "spu_key_on",
        "spu_stub_tick",
    ):
        spu = remove_function(spu, name)
    parts.append("// --- spu ---\n" + spu + HAND_SPU_XA)

    parts.append("// --- psx ---\n" + HAND_PSX)
    parts.append("// --- frontend ---\n" + HAND_FRONTEND)

    text = "\n".join(parts)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    while True:
        nxt = re.sub(r",\s*\)", ")", text)
        if nxt == text:
            break
        text = nxt
    text = dedupe_lets(text)
    text = prevent_let_inlining(text)
    out = OUT / "Cat.js"
    out.write_text(text, encoding="utf-8")
    print(f"wrote {out} ({len(text.splitlines())} lines), disc={disc_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
