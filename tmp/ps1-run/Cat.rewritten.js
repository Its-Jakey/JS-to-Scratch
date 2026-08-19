// PlayStation 1 emulator (Gran Turismo 2 Arcade) for TurboWarp.
// Green flag: BIOS + disc lists are baked by loadBin. Far below real-time.
// Controls: X/A/W/D/S/Z/C/Q/E/1/3, arrows, enter. Hide sprite; pen blit.

var bios = loadBin("bios.bin");
// BIOS-only boot: uncomment loadBin and delete the empty list to bake the GT2 disc again.
// let disc = loadBin("../PSX/ps1-scratch/Gran Turismo 2 (USA) (Arcade Mode) (Rev 1)/Gran Turismo 2 (USA) (Arcade Mode) (Rev 1).bin");
var disc = [];
var ram = [];
var scratch = [];
var vram = [];
var spuRam = [];
var spuHw = [];
var cpu_r = [];
var cpu_cop0_r = [];
var cpu_cop2_dr_v_xy = [];
var cpu_cop2_dr_v_z = [];
var cpu_cop2_dr_sxy_xy = [];
var gteRT = [];
var gteL = [];
var gteLR = [];
var dmaReg = [];
var timer_counter = [];
var timer_target = [];
var timer_mode = [];
var timer_irq_fired = [];
var timer_paused = [];
var timer_blank_once = [];
var cdrom_data_buf = [];
var cdrom_resp_buf = [];
var cdrom_param_buf = [];
var cdrom_xa_buf = [];
var pad_rxq = [];
var mc1_regs = [520093696, 528482304, 1254463, 12322, 1254463, 537411041, 133187, 460663, 201001];
var gpu_buf = [];
var gpu_v_x = [];
var gpu_v_y = [];
var gpu_v_c = [];
var gpu_v_tx = [];
var gpu_v_ty = [];
var mdec_input = [];
var mdec_output = [];
var mdec_uv_quant_table = [];
var mdec_y_quant_table = [];
var mdec_scale_table = [];
var mdec_yblk = [];
var mdec_crblk = [];
var mdec_cbblk = [];
var mdecIdct0 = [];
var mdecIdct1 = [];
var gfx = [];
var prev = [];
var spu_voice_left = [];
var GT2_TRACK_COUNT = 1;

var g_ram_size = 0;
var g_dma_mdec_in_irq_delay = 0;
var g_dma_mdec_out_irq_delay = 0;
var g_dma_cdrom_irq_delay = 0;
var g_dma_spu_irq_delay = 0;
var g_dma_gpu_irq_delay = 0;
var g_dma_otc_irq_delay = 0;
var g_dma_dpcr = 0;
var g_dma_dicr = 0;
var cpu_opcode = 0;
var cpu_pc = 0;
var cpu_next_pc = 0;
var cpu_saved_pc = 0;
var cpu_hi = 0;
var cpu_lo = 0;
var cpu_load_d = 0;
var cpu_load_v = 0;
var cpu_last_cycles = 0;
var cpu_total_cycles = 0;
var cpu_branch = 0;
var cpu_delay_slot = 0;
var cpu_branch_taken = 0;
var cpu_cop2_dr_otz = 0;
var cpu_cop2_dr_ir0 = 0;
var cpu_cop2_dr_ir1 = 0;
var cpu_cop2_dr_ir2 = 0;
var cpu_cop2_dr_ir3 = 0;
var cpu_cop2_dr_sz0 = 0;
var cpu_cop2_dr_sz1 = 0;
var cpu_cop2_dr_sz2 = 0;
var cpu_cop2_dr_sz3 = 0;
var cpu_cop2_dr_rgb0_u32 = 0;
var cpu_cop2_dr_rgb1_u32 = 0;
var cpu_cop2_dr_rgb2_u32 = 0;
var cpu_cop2_dr_rgbc_u32 = 0;
var cpu_cop2_dr_res1 = 0;
var cpu_cop2_dr_mac0 = 0;
var cpu_cop2_dr_mac1 = 0;
var cpu_cop2_dr_mac2 = 0;
var cpu_cop2_dr_mac3 = 0;
var cpu_cop2_dr_irgb = 0;
var cpu_cop2_dr_lzcs = 0;
var cpu_cop2_dr_lzcr = 0;
var cpu_cop2_cr_rt_33 = 0;
var cpu_cop2_cr_tr_x = 0;
var cpu_cop2_cr_tr_y = 0;
var cpu_cop2_cr_tr_z = 0;
var cpu_cop2_cr_l_33 = 0;
var cpu_cop2_cr_bk_x = 0;
var cpu_cop2_cr_bk_y = 0;
var cpu_cop2_cr_bk_z = 0;
var cpu_cop2_cr_lr_33 = 0;
var cpu_cop2_cr_fc_x = 0;
var cpu_cop2_cr_fc_y = 0;
var cpu_cop2_cr_fc_z = 0;
var cpu_cop2_cr_ofx = 0;
var cpu_cop2_cr_ofy = 0;
var cpu_cop2_cr_h = 0;
var cpu_cop2_cr_dqa = 0;
var cpu_cop2_cr_dqb = 0;
var cpu_cop2_cr_zsf3 = 0;
var cpu_cop2_cr_zsf4 = 0;
var cpu_cop2_cr_flag = 0;
var cpu_gte_lm = 0;
var cpu_gte_sf = 0;
var cpu_gte_mx = 0;
var cpu_gte_v = 0;
var cpu_gte_cv = 0;
var cpu_s_mac0 = 0;
var cpu_s_mac3 = 0;
var gte_mvmva_mx_11 = 0;
var gte_mvmva_mx_12 = 0;
var gte_mvmva_mx_13 = 0;
var gte_mvmva_mx_21 = 0;
var gte_mvmva_mx_22 = 0;
var gte_mvmva_mx_23 = 0;
var gte_mvmva_mx_31 = 0;
var gte_mvmva_mx_32 = 0;
var gte_mvmva_mx_33 = 0;
var gte_mvmva_vx = 0;
var gte_mvmva_vy = 0;
var gte_mvmva_vz = 0;
var gte_mvmva_cv_x = 0;
var gte_mvmva_cv_y = 0;
var gte_mvmva_cv_z = 0;
var timer_hblank = 0;
var timer_vblank = 0;
var cdrom_disc_track_start = 0;
var cdrom_disc_track_end = 0;
var cdrom_disc_open = 0;
var cdrom_disc_type = 0;
var cdrom_index = 0;
var cdrom_pending_speed_switch_delay = 0;
var cdrom_ier = 0;
var cdrom_ifr = 0;
var cdrom_mode = 0;
var cdrom_data_req = 0;
var cdrom_data_rd = 0;
var cdrom_data_wr = 0;
var cdrom_resp_rd = 0;
var cdrom_resp_wr = 0;
var cdrom_param_rd = 0;
var cdrom_param_wr = 0;
var cdrom_pending_command = 0;
var cdrom_busy = 0;
var cdrom_xa_lba = 0;
var cdrom_xa_playing = 0;
var cdrom_xa_mute = 0;
var cdrom_xa_channel = 0;
var cdrom_xa_file = 0;
var cdrom_xa_remaining_samples = 0;
var cdrom_state = 0;
var cdrom_prev_state = 0;
var cdrom_delay = 0;
var cdrom_pending_lba = 0;
var cdrom_lba = 0;
var cdrom_read_ongoing = 0;
var pad_buttons = 0;
var pad_rxq_len = 0;
var pad_rxq_pos = 0;
var pad_dest = 0;
var pad_cycles_until_irq = 0;
var pad_irq_bit = 0;
var pad_mode = 0;
var pad_ctrl = 0;
var pad_baud = 0;
var pad_stat = 0;
var g_bus_access_cycles = 0;
var mc2_ram_size = 0;
var mc3_cache_control = 0;
var ic_stat = 0;
var ic_mask = 0;
var gpu_display_off_init = 0;
var gpu_recv_data = 0;
var gpu_buf_index = 0;
var gpu_cmd_args_remaining = 0;
var gpu_draw_attrib = 0;
var gpu_draw_clut = 0;
var gpu_draw_texp = 0;
var gpu_rect_x = 0;
var gpu_rect_y = 0;
var gpu_rect_w = 0;
var gpu_rect_h = 0;
var gpu_rect_c = 0;
var gpu_rect_tx = 0;
var gpu_rect_ty = 0;
var gpu_xpos = 0;
var gpu_ypos = 0;
var gpu_xsiz = 0;
var gpu_ysiz = 0;
var gpu_tsiz = 0;
var gpu_addr = 0;
var gpu_xcnt = 0;
var gpu_ycnt = 0;
var gpu_c0_xcnt = 0;
var gpu_c0_ycnt = 0;
var gpu_c0_addr = 0;
var gpu_c0_xsiz = 0;
var gpu_c0_ysiz = 0;
var gpu_c0_tsiz = 0;
var gpu_gp1_10h_req = 0;
var gpu_state = 0;
var gpu_display_mode = 0;
var gpu_gpustat = 0;
var gpu_draw_x1 = 0;
var gpu_draw_y1 = 0;
var gpu_draw_x2 = 0;
var gpu_draw_y2 = 0;
var gpu_off_x = 0;
var gpu_off_y = 0;
var gpu_texw_mx = 0;
var gpu_texw_my = 0;
var gpu_texw_ox = 0;
var gpu_texw_oy = 0;
var gpu_texp_x = 0;
var gpu_texp_y = 0;
var gpu_texp_d = 0;
var gpu_disp_x = 0;
var gpu_disp_y = 0;
var gpu_disp_x1 = 0;
var gpu_disp_x2 = 0;
var gpu_disp_y1 = 0;
var gpu_disp_y2 = 0;
var gpu_cycles = 0;
var gpu_line = 0;
var gpu_dbg_vb = 0;
var gpu_dbg_tex_count = 0;
var gpu_dbg_tex_ymin = 0;
var mdec_io_base = 0;
var mdec_io_size = 0;
var mdec_cmd = 0;
var mdec_input_index = 0;
var mdec_input_size = 0;
var mdec_output_index = 0;
var mdec_output_words_remaining = 0;
var mdec_words_remaining = 0;
var mdec_current_block = 0;
var mdec_output_bit15 = 0;
var mdec_output_signed = 0;
var mdec_output_depth = 0;
var mdec_input_request = 0;
var mdec_output_request = 0;
var mdec_busy = 0;
var mdec_input_full = 0;
var mdec_output_empty = 0;
var mdec_enable_dma0 = 0;
var mdec_enable_dma1 = 0;
var mdec_recv_color = 0;
var mdec_cmd_decode_count = 0;
var mdecSrcIndex = 0;
var mdecBlkId = 0;
var mdecQuantId = 0;
var sio_ctrl = 0;
var mulHi = 0;
var mulLo = 0;
var needRender = 0;
var pixelStep = 0;
var gfxW = 0;
var gfxH = 0;
var gfxLen = 0;
var STEPS_PER_SLICE = 0;
var fps = 0;
var fpsFrames = 0;
var dispW = 0;
var dispH = 0;
var rgb24 = 0;
var xaRet = 0;
var xaGo = 0;
var dmaListGo = 0;
var mdecLoopGo = 0;


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
  if (0) return;
  var sa = s32(a);
  var sb = s32(b);
  var r = sa + sb;
  return ((sa ^ r) & (sb ^ r) & 2147483648) != 0;
}

function sign_extend(v, bits) {
  if (0) return;
  var shift = 32 - bits;
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
  if (0) return;
  var m = 17592186044416;
  var half = 8796093022208;
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
  if (0) return;
  value = value >>> 0;
  if (!value) return 32;
  var bits = 0;
  while (value) {
    value = value >>> 1;
    bits++;
  }
  return 32 - bits;
}

function mulu32wide(a, b) {
  if (0) return;
  a = u32(a);
  b = u32(b);
  var a0 = a & 65535;
  var a1 = a >>> 16;
  var b0 = b & 65535;
  var b1 = b >>> 16;
  var p0 = a0 * b0;
  var p1 = a0 * b1;
  var p2 = a1 * b0;
  var p3 = a1 * b1;
  var mid = (p0 >>> 16) + (p1 & 65535) + (p2 & 65535);
  mulLo = u32((p0 & 65535) | ((mid & 65535) << 16));
  mulHi = u32(p3 + (p1 >>> 16) + (p2 >>> 16) + (mid >>> 16));
}

function muls32wide(a, b) {
  if (0) return;
  a = s32(a);
  b = s32(b);
  var neg = 0;
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
    var lo = u32(~mulLo);
    var hi = u32(~mulHi);
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
  if (0) return;
  var sh = (off & 3) * 8;
  return trunc(u32(w) / pow2(sh)) % 256;
}

function word_load16(w, off) {
  if (0) return;
  var sh = (off & 2) * 8;
  return trunc(u32(w) / pow2(sh)) % 65536;
}

function word_store8(w, off, v) {
  if (0) return;
  v = v & 255;
  var sh = (off & 3) * 8;
  var mask = 255 * pow2(sh);
  w = u32(w);
  w = (w & ~mask) | (v * pow2(sh));
  return u32(w);
}

function word_store16(w, off, v) {
  if (0) return;
  v = v & 65535;
  var sh = (off & 2) * 8;
  var mask = 65535 * pow2(sh);
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
  if (0) return;
  var wi = off >>> 2;
  ram[wi] = word_store8(ram[wi], off, v);
}

function ram_store16(off, v) {
  if (0) return;
  var wi = off >>> 2;
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
  if (0) return;
  var wi = off >>> 2;
  scratch[wi] = word_store8(scratch[wi], off, v);
}

function scratch_store16(off, v) {
  if (0) return;
  var wi = off >>> 2;
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
  if (0) return;
  var wi = off >>> 2;
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
  if (0) return;
  if (lba >= cdrom_disc_track_end) return 0;
  if (lba < cdrom_disc_track_start) {
    var i = 0;
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
  var base = (lba - cdrom_disc_track_start) * 588;
  var w = 0;
  while (w < 588) {
    var val = disc_word(base + w);
    var b = 0;
    while (b < 4) {
      var bytev = trunc(val / pow2(b * 8)) % 256;
      var di = w * 4 + b;
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
  if (0) return;
  if (gpu_display_mode & 64) return 49;
  var m = gpu_display_mode & 3;
  if (m == 0) return 10;
  if (m == 1) return 8;
  if (m == 2) return 5;
  return 4;
}


// --- tables ---
var BTOI_TABLE = [
	0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
	0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,
	0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23,
	0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d,
	0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37,
	0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x41,
	0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b,
	0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55,
	0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f,
	0x5a, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
	0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72, 0x73,
	0x6e, 0x6f, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x7b, 0x7c, 0x7d,
	0x78, 0x79, 0x7a, 0x7b, 0x7c, 0x7d, 0x7e, 0x7f, 0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
	0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f, 0x90, 0x91,
	0x8c, 0x8d, 0x8e, 0x8f, 0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b,
	0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5,
];
var PSX_DMA_CTRL_HW_1_TABLE = [
	0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000002,
];
var PSX_DMA_CTRL_HW_0_TABLE = [
	0x71770703, 0x71770703, 0x71770703, 0x71770703, 0x71770703, 0x71770703, 0x50000002,
];
var PSX_CPU_COP0_WRITE_MASK_TABLE = [
	0x00000000, 0x00000000, 0x00000000, 0xffffffff, 0x00000000, 0xffffffff, 0x00000000,
	0xffc0f03f, 0x00000000, 0xffffffff, 0x00000000, 0xffffffff, 0xffffffff, 0xffffffff,
	0x00000300, 0x00000000, 0x00000000,
];
var ITOB_TABLE = [
	0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15,
	0x16, 0x17, 0x18, 0x19, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x30, 0x31,
	0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47,
	0x48, 0x49, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x60, 0x61, 0x62, 0x63,
	0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79,
	0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x90, 0x91, 0x92, 0x93, 0x94, 0x95,
	0x96, 0x97, 0x98, 0x99, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xb0, 0xb1,
	0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xc0, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7,
	0xc8, 0xc9, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xe0, 0xe1, 0xe2, 0xe3,
	0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9,
];
var CDROM_CD_GETID = [
	0x08, 0x40, 0x00, 0x00,
	0x02, 0x00, 0x20, 0x00,
	0x0a, 0x90, 0x00, 0x00,
	0x0a, 0x80, 0x00, 0x00,
];
var CDROM_VERSION_ID = [
	0x94, 0x09, 0x19, 0x01,
	0x94, 0x09, 0x19, 0xc0,
	0x94, 0x11, 0x18, 0xc0, 0x95, 0x05, 0x16, 0xc1,
	0x95, 0x07, 0x24, 0xc1, 0x95, 0x07, 0x24, 0xd1,
	0x96, 0x08, 0x15, 0xc2, 0x96, 0x08, 0x18, 0xc1,
	0x96, 0x09, 0x12, 0xc2, 0x97, 0x01, 0x10, 0xc2,
	0x97, 0x08, 0x14, 0xc2, 0x98, 0x06, 0x10, 0xc3,
	0x99, 0x02, 0x01, 0xc3, 0xa1, 0x03, 0x06, 0xc3,
];
var PSX_GTE_UNR_TABLE = [
	0xff, 0xfd, 0xfb, 0xf9, 0xf7, 0xf5, 0xf3, 0xf1, 0xef, 0xee, 0xec, 0xea, 0xe8, 0xe6, 0xe4, 0xe3,
	0xe1, 0xdf, 0xdd, 0xdc, 0xda, 0xd8, 0xd6, 0xd5, 0xd3, 0xd1, 0xd0, 0xce, 0xcd, 0xcb, 0xc9, 0xc8,
	0xc6, 0xc5, 0xc3, 0xc1, 0xc0, 0xbe, 0xbd, 0xbb, 0xba, 0xb8, 0xb7, 0xb5, 0xb4, 0xb2, 0xb1, 0xb0,
	0xae, 0xad, 0xab, 0xaa, 0xa9, 0xa7, 0xa6, 0xa4, 0xa3, 0xa2, 0xa0, 0x9f, 0x9e, 0x9c, 0x9b, 0x9a,
	0x99, 0x97, 0x96, 0x95, 0x94, 0x92, 0x91, 0x90, 0x8f, 0x8d, 0x8c, 0x8b, 0x8a, 0x89, 0x87, 0x86,
	0x85, 0x84, 0x83, 0x82, 0x81, 0x7f, 0x7e, 0x7d, 0x7c, 0x7b, 0x7a, 0x79, 0x78, 0x77, 0x75, 0x74,
	0x73, 0x72, 0x71, 0x70, 0x6f, 0x6e, 0x6d, 0x6c, 0x6b, 0x6a, 0x69, 0x68, 0x67, 0x66, 0x65, 0x64,
	0x63, 0x62, 0x61, 0x60, 0x5f, 0x5e, 0x5d, 0x5d, 0x5c, 0x5b, 0x5a, 0x59, 0x58, 0x57, 0x56, 0x55,
	0x54, 0x53, 0x53, 0x52, 0x51, 0x50, 0x4f, 0x4e, 0x4d, 0x4d, 0x4c, 0x4b, 0x4a, 0x49, 0x48, 0x48,
	0x47, 0x46, 0x45, 0x44, 0x43, 0x43, 0x42, 0x41, 0x40, 0x3f, 0x3f, 0x3e, 0x3d, 0x3c, 0x3c, 0x3b,
	0x3a, 0x39, 0x39, 0x38, 0x37, 0x36, 0x36, 0x35, 0x34, 0x33, 0x33, 0x32, 0x31, 0x31, 0x30, 0x2f,
	0x2e, 0x2e, 0x2d, 0x2c, 0x2c, 0x2b, 0x2a, 0x2a, 0x29, 0x28, 0x28, 0x27, 0x26, 0x26, 0x25, 0x24,
	0x24, 0x23, 0x22, 0x22, 0x21, 0x20, 0x20, 0x1f, 0x1e, 0x1e, 0x1d, 0x1d, 0x1c, 0x1b, 0x1b, 0x1a,
	0x19, 0x19, 0x18, 0x18, 0x17, 0x16, 0x16, 0x15, 0x15, 0x14, 0x14, 0x13, 0x12, 0x12, 0x11, 0x11,
	0x10, 0x0f, 0x0f, 0x0e, 0x0e, 0x0d, 0x0d, 0x0c, 0x0c, 0x0b, 0x0a, 0x0a, 0x09, 0x09, 0x08, 0x08,
	0x07, 0x07, 0x06, 0x06, 0x05, 0x05, 0x04, 0x04, 0x03, 0x03, 0x02, 0x02, 0x01, 0x01, 0x00, 0x00,
	0x00,
];
var MDEC_ZAGZIG = [
	0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27,
	20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58,
	59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];
function bus_region_mask(addr) {
  switch (addr >>> 29) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 6:
    case 7:
      return 0xffffffff;
    case 4:
      return 0x7fffffff;
    case 5:
      return 0x1fffffff;
  }
  return 0xffffffff;
}

// --- bus ---

function read32_as_width(reg, offset, width) {
  if (width === 16) return u32(reg) >>> ((offset & 2) * 8);
  if (width === 8) return u32(reg) >>> ((offset & 3) * 8);
  return u32(reg);
}

function write_value_as_32(value, offset, width) {
  if (width === 16) return u32(value) << ((offset & 2) * 8);
  if (width === 8) return u32(value) << ((offset & 3) * 8);
  return u32(value);
}


function bus_dma(write, offset, value, width) {
  if (0) return;
  g_bus_access_cycles = 0;
  if (write) {
    if (width === 32) {
      if (offset < 0x70) {
        var channel = (offset >>> 4) & 0x7;
        var reg = (offset >>> 2) & 0x3;
        dmaReg[(channel) * 3 + (reg)] = u32(value);
        if (reg === 2) psx_dma_run_channel(channel);
      } else if (offset === 0x70) {
        g_dma_dpcr = u32(value);
      } else if (offset === 0x74) {
        dma_write_dicr(value);
      }
    } else if (width === 16) {
      if (offset === 0x74 || offset === 0x76) {
        dma_write_dicr(u32(value) << ((offset - 0x74) * 8));
      }
    } else if (offset >= 0x74 && offset <= 0x77) {
      dma_write_dicr(u32(value) << ((offset - 0x74) * 8));
    }
    return 0;
  }

  if (width === 32) {
    if (offset < 0x70) {
      channel = (offset >>> 4) & 0x7;
      reg = (offset >>> 2) & 0x3;
      var cr = dmaReg[(channel) * 3 + (reg)];
      if (reg === 2) {
        cr = u32(cr | PSX_DMA_CTRL_HW_1_TABLE[channel]);
        cr = u32(cr & PSX_DMA_CTRL_HW_0_TABLE[channel]);
      }
      return cr;
    }
    return dma_read_global(offset);
  }

  if (width === 16) return dma_read_global(offset & ~2) >>> ((offset & 2) * 8);
  return dma_read_global(offset & ~3) >>> ((offset & 3) * 8);
}

function bus_exp(_addr) {
  g_bus_access_cycles = 0;
  return 0;
}

function bus_mc1(write, offset, value, width) {
  if (0) return;
  var idx = (offset & ~3) >>> 2;
  g_bus_access_cycles = 0;
  if (idx < 0 || idx >= 9) return 0;
  if (write) {
    mc1_regs[idx] = write_value_as_32(value, offset, width);
    return 0;
  }
  return read32_as_width(mc1_regs[idx], offset, width);
}

function bus_mc2(write, offset, value, width) {
  g_bus_access_cycles = 0;
  if ((offset & ~3) !== 0) return 0;
  if (write) {
    mc2_ram_size = write_value_as_32(value, offset, width);
    return 0;
  }
  return read32_as_width(mc2_ram_size, offset, width);
}

function bus_mc3(write, offset, value, width) {
  g_bus_access_cycles = 0;
  if ((offset & ~3) !== 0) return 0;
  if (write) {
    mc3_cache_control = write_value_as_32(value, offset, width);
    return 0;
  }
  return read32_as_width(mc3_cache_control, offset, width);
}

function bus_ic(write, offset, value, width) {
  if (0) return;
  g_bus_access_cycles = 0;
  if (write) {
    var reg = write_value_as_32(value, offset, width);
    switch (offset & ~3) {
      case 0x00:
        ic_stat &= reg;
        break;
      case 0x04:
        ic_mask = reg;
        break;
    }
    if (!(ic_stat & ic_mask)) cpu_cop0_r[13] = cpu_cop0_r[13] &  ~0x00000400;
    else cpu_cop0_r[13] = cpu_cop0_r[13] |  0x00000400;
    return 0;
  }

  reg = 0;
  switch (offset & ~3) {
    case 0x00:
      reg = ic_stat;
      break;
    case 0x04:
      reg = ic_mask;
      break;
    default:
      return 0;
  }
  return read32_as_width(reg, offset, width);
}


function bus_device_stub(write, _offset, _value, _width) {
  g_bus_access_cycles = 0;
  return 0;
}

function bus_misc_read16(addr) {
  if (addr === 0x1f80105a) return sio_ctrl;
  if (addr === 0x1f801054) return 0x05;
  if (addr === 0x1f400004) return 0xc8;
  if (addr === 0x1f400006) return 0x1fe0;
  return 0;
}

function bus_access(write, addr, value, width) {
  addr = u32(addr) & bus_region_mask(addr);

  if ((width === 32 && (addr & 0x3)) || (width === 16 && (addr & 0x1))) return 0;

  if (addr >= 0x1fc00000 && addr < 0x1fc00000 + 524288) {
    return bus_bios(write, addr - 0x1fc00000, value, width);
  }

  if (addr < 0x800000) return bus_ram(write, addr, value, width);

  if (addr >= 0x1f801080 && addr < 0x1f801100) {
    return bus_dma(write, addr - 0x1f801080, value, width);
  }

  if (
    (addr >= 0x1f000000 && addr < 0x1f080000) ||
    (addr >= 0x1f802000 && addr < 0x1fa00000)
  ) {
    return bus_exp(addr);
  }

  if (addr >= 0x1f801000 && addr < 0x1f801024) {
    return bus_mc1(write, addr - 0x1f801000, value, width);
  }

  if (addr >= 0x1f801060 && addr < 0x1f801064) {
    return bus_mc2(write, addr - 0x1f801060, value, width);
  }

  if (addr >= 0xfffe0130 && addr < 0xfffe0134) {
    return bus_mc3(write, addr - 0xfffe0130, value, width);
  }

  if (addr >= 0x1f801070 && addr < 0x1f801078) {
    return bus_ic(write, addr - 0x1f801070, value, width);
  }

  if (addr >= 0x1f800000 && addr < 0x1f800400) {
    return bus_scratch(write, addr - 0x1f800000, value, width);
  }

  if (addr >= 0x1f801810 && addr < 0x1f801818) {
    return bus_gpu(write, addr - 0x1f801810, value, width);
  }

  if (addr >= 0x1f801c00 && addr < 0x1f802000) {
    return bus_spu(write, addr - 0x1f801c00, value, width);
  }

  if (addr >= 0x1f801100 && addr < 0x1f801130) {
    return bus_timer(write, addr - 0x1f801100, value, width);
  }

  if (addr >= 0x1f801800 && addr < 0x1f801804) {
    return bus_cdrom(write, addr - 0x1f801800, value, width);
  }

  if (addr >= 0x1f801040 && addr < 0x1f801050) {
    return bus_pad(write, addr - 0x1f801040, value, width);
  }

  if (addr >= 0x1f801820 && addr < 0x1f801828) {
    return bus_mdec(write, addr - 0x1f801820, value, width);
  }

  if (!write && width === 16) return bus_misc_read16(addr);

  return 0;
}

function psx_bus_read16(addr) {
  g_bus_access_cycles = 2;
  return u16(bus_access(0, addr, 0, 16));
}

function psx_bus_read8(addr) {
  g_bus_access_cycles = 2;
  return u8(bus_access(0, addr, 0, 8));
}

function psx_bus_write32(addr, value) {
  g_bus_access_cycles = 0;
  bus_access(1, addr, value, 32);
}

function psx_bus_write16(addr, value) {
  g_bus_access_cycles = 0;
  bus_access(1, addr, value, 16);
}


// --- cpu ---


function rs() {
  return (OP() >>> 21) & 0x1f;
}

function rt() {
  return (OP() >>> 16) & 0x1f;
}

function rd() {
  return (OP() >>> 11) & 0x1f;
}

function shamt() {
  return (OP() >>> 6) & 0x1f;
}

function imm16() {
  return s32_from_s16(OP());
}

function BRANCH(offset) {
  cpu_next_pc = u32(cpu_next_pc + offset);
  cpu_next_pc = u32(cpu_next_pc - 4);
  cpu_branch = 1;
  cpu_branch_taken = 1;
}

function DO_PENDING_LOAD() {
  cpu_r[cpu_load_d] = cpu_load_v;
  cpu_r[0] = 0;
  cpu_load_v = 0xffffffff;
  cpu_load_d = 0;
}


function psx_cpu_exception(cause) {
  if (0) return;
  cpu_cop0_r[13] = u32((cpu_cop0_r[13] & 0xffffff80) | cause);
  cpu_cop0_r[14] = cpu_saved_pc;

  if (cpu_delay_slot) {
    cpu_cop0_r[14] = u32(cpu_cop0_r[14] - 4);
    cpu_cop0_r[13] = cpu_cop0_r[13] |  0x80000000;
  }

  var mode = cpu_cop0_r[12] & 0x3f;
  cpu_cop0_r[12] = u32((cpu_cop0_r[12] & 0xffffffc0) | ((mode << 2) & 0x3f));
  cpu_pc = cpu_cop0_r[12] & 0x00400000 ? 0xbfc00180 : 0x80000080;
  cpu_next_pc = u32(cpu_pc + 4);
}

function psx_cpu_execute() {
  if (0) return;
  var primary = (OP() & 0xfc000000) >>> 26;

  switch (primary) {
    case 0x00: {
      var funct = OP() & 0x3f;
      switch (funct) {
        case 0x00:
          cpu_r[rd()] = u32(cpu_r[rt()] << shamt());
          DO_PENDING_LOAD();
          return 2;
        case 0x02:
          cpu_r[rd()] = u32(cpu_r[rt()] >>> shamt());
          DO_PENDING_LOAD();
          return 2;
        case 0x03:
          cpu_r[rd()] = u32(s32_sar(cpu_r[rt()], shamt()));
          DO_PENDING_LOAD();
          return 2;
        case 0x04:
          cpu_r[rd()] = u32(cpu_r[rt()] << (cpu_r[rs()] & 0x1f));
          DO_PENDING_LOAD();
          return 2;
        case 0x06:
          cpu_r[rd()] = u32(cpu_r[rt()] >>> (cpu_r[rs()] & 0x1f));
          DO_PENDING_LOAD();
          return 2;
        case 0x07:
          cpu_r[rd()] = u32(s32_sar(cpu_r[rt()], cpu_r[rs()] & 0x1f));
          DO_PENDING_LOAD();
          return 2;
        case 0x08:
          cpu_branch = 1;
          cpu_next_pc = cpu_r[rs()];
          DO_PENDING_LOAD();
          return 2;
        case 0x09:
          cpu_branch = 1;
          cpu_r[rd()] = cpu_next_pc;
          cpu_next_pc = cpu_r[rs()];
          DO_PENDING_LOAD();
          return 2;
        case 0x0c:
          psx_cpu_exception(0x08 << 2);
          DO_PENDING_LOAD();
          return 2;
        case 0x10:
          cpu_r[rd()] = cpu_hi;
          DO_PENDING_LOAD();
          return 2;
        case 0x11:
          cpu_hi = cpu_r[rs()];
          DO_PENDING_LOAD();
          return 2;
        case 0x12:
          cpu_r[rd()] = cpu_lo;
          DO_PENDING_LOAD();
          return 2;
        case 0x13:
          cpu_lo = cpu_r[rs()];
          DO_PENDING_LOAD();
          return 2;
        case 0x18: {
          muls32wide(cpu_r[rs()], cpu_r[rt()]);
          cpu_hi = mulHi;
          cpu_lo = mulLo;
          DO_PENDING_LOAD();
          return 2;
        }
        case 0x19: {
          mulu32wide(cpu_r[rs()], cpu_r[rt()]);
          cpu_hi = mulHi;
          cpu_lo = mulLo;
          DO_PENDING_LOAD();
          return 2;
        }
        case 0x1a: {
          var su = s32(cpu_r[rs()]);
          var tu = s32(cpu_r[rt()]);
          if (!tu) {
            cpu_hi = u32(su);
            cpu_lo = su >= 0 ? 0xffffffff : 1;
          } else if (u32(su) === 0x80000000 && tu === -1) {
            cpu_hi = 0;
            cpu_lo = 0x80000000;
          } else {
            cpu_hi = u32(rems32(su, tu));
            cpu_lo = u32(divs32(su, tu));
          }
          DO_PENDING_LOAD();
          return 2;
        }
        case 0x1b: {
          var s = cpu_r[rs()];
          var t = cpu_r[rt()];
          if (!t) {
            cpu_hi = s;
            cpu_lo = 0xffffffff;
          } else {
            cpu_hi = u32(remu32(s, t));
            cpu_lo = u32(divu32(s, t));
          }
          DO_PENDING_LOAD();
          return 2;
        }
        case 0x20: {
          su = cpu_r[rs()];
          tu = cpu_r[rt()];
          var r = s32(su + tu);
          var o = (su ^ r) & (tu ^ r);
          if (o & 0x80000000) psx_cpu_exception(0x0c << 2);
          else cpu_r[rd()] = u32(r);
          DO_PENDING_LOAD();
          return 2;
        }
        case 0x21:
          cpu_r[rd()] = u32(cpu_r[rs()] + cpu_r[rt()]);
          DO_PENDING_LOAD();
          return 2;
        case 0x22: {
          var a = s32(cpu_r[rs()]);
          var b = s32(cpu_r[rt()]);
          r = a - b;
          var ou = ((a ^ b) & (a ^ r)) >>> 31;
          if (ou) psx_cpu_exception(0x0c << 2);
          else cpu_r[rd()] = u32(r);
          DO_PENDING_LOAD();
          return 2;
        }
        case 0x23:
          cpu_r[rd()] = u32(cpu_r[rs()] - cpu_r[rt()]);
          DO_PENDING_LOAD();
          return 2;
        case 0x24:
          cpu_r[rd()] = u32(cpu_r[rs()] & cpu_r[rt()]);
          DO_PENDING_LOAD();
          return 2;
        case 0x25:
          cpu_r[rd()] = u32(cpu_r[rs()] | cpu_r[rt()]);
          DO_PENDING_LOAD();
          return 2;
        case 0x26:
          cpu_r[rd()] = u32(cpu_r[rs()] ^ cpu_r[rt()]);
          DO_PENDING_LOAD();
          return 2;
        case 0x27:
          cpu_r[rd()] = u32(~(cpu_r[rs()] | cpu_r[rt()]));
          DO_PENDING_LOAD();
          return 2;
        case 0x2a:
          cpu_r[rd()] = s32(cpu_r[rs()]) < s32(cpu_r[rt()]) ? 1 : 0;
          DO_PENDING_LOAD();
          return 2;
        case 0x2b:
          cpu_r[rd()] = cpu_r[rs()] < cpu_r[rt()] ? 1 : 0;
          DO_PENDING_LOAD();
          return 2;
      }
      break;
    }
    case 0x01: {
      cpu_branch = 1;
      cpu_branch_taken = 0;
      var rtField = (OP() & 0x001f0000) >>> 16;
      switch (rtField) {
        case 0x0000: {
          DO_PENDING_LOAD();
          if (s32(cpu_r[rs()]) < 0) BRANCH(u32(imm16() << 2));
          return 2;
        }
        case 0x0001: {
          DO_PENDING_LOAD();
          if (s32(cpu_r[rs()]) >= 0) BRANCH(u32(s32_from_s16(OP() & 0xffff) << 2));
          return 2;
        }
        case 0x0010: {
          DO_PENDING_LOAD();
          cpu_r[31] = cpu_next_pc;
          if (s32(cpu_r[rs()]) < 0) BRANCH(u32(s32_from_s16(OP() & 0xffff) << 2));
          return 2;
        }
        case 0x0011: {
          DO_PENDING_LOAD();
          cpu_r[31] = cpu_next_pc;
          if (s32(cpu_r[rs()]) >= 0) BRANCH(u32(imm16() << 2));
          return 2;
        }
        default: {
          if (OP() & 0x00010000) {
            DO_PENDING_LOAD();
            if (s32(cpu_r[rs()]) >= 0) BRANCH(u32(s32_from_s16(OP() & 0xffff) << 2));
          } else {
            DO_PENDING_LOAD();
            if (s32(cpu_r[rs()]) < 0) BRANCH(u32(imm16() << 2));
          }
          return 2;
        }
      }
    }
    case 0x02: {
      cpu_branch = 1;
      DO_PENDING_LOAD();
      cpu_next_pc = u32((cpu_next_pc & 0xf0000000) | ((OP() & 0x03ffffff) << 2));
      return 2;
    }
    case 0x03: {
      cpu_branch = 1;
      DO_PENDING_LOAD();
      cpu_r[31] = cpu_next_pc;
      cpu_next_pc = u32((cpu_next_pc & 0xf0000000) | ((OP() & 0x03ffffff) << 2));
      return 2;
    }
    case 0x04: {
      cpu_branch = 1;
      cpu_branch_taken = 0;
      DO_PENDING_LOAD();
      if (cpu_r[rs()] === cpu_r[rt()]) BRANCH(u32(imm16() << 2));
      return 2;
    }
    case 0x05: {
      cpu_branch = 1;
      cpu_branch_taken = 0;
      DO_PENDING_LOAD();
      if (cpu_r[rs()] !== cpu_r[rt()]) BRANCH(u32(imm16() << 2));
      return 2;
    }
    case 0x06: {
      cpu_branch = 1;
      cpu_branch_taken = 0;
      DO_PENDING_LOAD();
      if (s32(cpu_r[rs()]) <= 0) BRANCH(u32(imm16() << 2));
      return 2;
    }
    case 0x07: {
      cpu_branch = 1;
      cpu_branch_taken = 0;
      DO_PENDING_LOAD();
      if (s32(cpu_r[rs()]) > 0) BRANCH(u32(imm16() << 2));
      return 2;
    }
    case 0x08: {
      s = cpu_r[rs()];
      DO_PENDING_LOAD();
      var i = u32(imm16());
      r = u32(s + i);
      if (s32_add_overflow(s, i)) psx_cpu_exception(0x0c << 2);
      else cpu_r[rt()] = r;
      return 2;
    }
    case 0x09:
      DO_PENDING_LOAD();
      cpu_r[rt()] = u32(cpu_r[rs()] + imm16());
      return 2;
    case 0x0a:
      DO_PENDING_LOAD();
      cpu_r[rt()] = s32(cpu_r[rs()]) < imm16() ? 1 : 0;
      return 2;
    case 0x0b:
      DO_PENDING_LOAD();
      cpu_r[rt()] = cpu_r[rs()] < u32(imm16()) ? 1 : 0;
      return 2;
    case 0x0c:
      DO_PENDING_LOAD();
      cpu_r[rt()] = u32(cpu_r[rs()] & (OP() & 0xffff));
      return 2;
    case 0x0d:
      DO_PENDING_LOAD();
      cpu_r[rt()] = u32(cpu_r[rs()] | (OP() & 0xffff));
      return 2;
    case 0x0e:
      DO_PENDING_LOAD();
      cpu_r[rt()] = u32(cpu_r[rs()] ^ (OP() & 0xffff));
      return 2;
    case 0x0f:
      DO_PENDING_LOAD();
      cpu_r[rt()] = u32((OP() & 0xffff) << 16);
      return 2;
    case 0x10: {
      var cop = (OP() & 0x03e00000) >>> 21;
      switch (cop) {
        case 0x00:
          DO_PENDING_LOAD();
          cpu_load_v = cpu_cop0_r[rd()];
          cpu_load_d = rt();
          return 2;
        case 0x04:
          cpu_cop0_r[rd()] = u32(cpu_r[rt()] & PSX_CPU_COP0_WRITE_MASK_TABLE[rd()]);
          DO_PENDING_LOAD();
          return 2;
        case 0x10: {
          DO_PENDING_LOAD();
          var mode = cpu_cop0_r[12] & 0x3f;
          cpu_cop0_r[12] = u32((cpu_cop0_r[12] & 0xfffffff0) | (mode >>> 2));
          return 2;
        }
      }
      break;
    }
    case 0x12: {
      cop = (OP() & 0x03e00000) >>> 21;
      switch (cop) {
        case 0x00:
          DO_PENDING_LOAD();
          cpu_load_v = gte_read_register(rd());
          cpu_load_d = rt();
          return 2;
        case 0x02:
          DO_PENDING_LOAD();
          cpu_load_v = gte_read_register(rd() + 32);
          cpu_load_d = rt();
          return 2;
        case 0x04: {
          t = cpu_r[rt()];
          DO_PENDING_LOAD();
          gte_write_register(rd(), t);
          return 2;
        }
        case 0x06: {
          t = cpu_r[rt()];
          DO_PENDING_LOAD();
          gte_write_register(rd() + 32, t);
          return 2;
        }
        default:
          DO_PENDING_LOAD();
          return gte_run();
      }
    }
    case 0x20: {
      if (cpu_load_d !== rt()) DO_PENDING_LOAD();
      cpu_load_d = rt();
      cpu_load_v = u32(s32_from_s8(psx_bus_read8(u32(cpu_r[rs()] + imm16()))));
      return 2;
    }
    case 0x21: {
      if (cpu_load_d !== rt()) DO_PENDING_LOAD();
      var addr = u32(cpu_r[rs()] + imm16());
      if (addr & 1) psx_cpu_exception(0x04 << 2);
      else {
        cpu_load_d = rt();
        cpu_load_v = u32(s32_from_s16(psx_bus_read16(addr)));
      }
      return 2;
    }
    case 0x22: {
      var rtt = rt();
      t = cpu_r[rtt];
      addr = u32(cpu_r[rs()] + imm16());
      var load = bus_access(0, addr & 0xfffffffc, 0, 32);
      if (rtt === cpu_load_d) t = cpu_load_v;
      else DO_PENDING_LOAD();
      var shift = (addr & 3) << 3;
      var mask = u32(0x00ffffff >>> shift);
      cpu_load_d = rtt;
      cpu_load_v = u32((t & mask) | (load << (24 - shift)));
      return 2;
    }
    case 0x23: {
      addr = u32(cpu_r[rs()] + imm16());
      if (cpu_load_d !== rt()) DO_PENDING_LOAD();
      if (addr & 3) psx_cpu_exception(0x04 << 2);
      else {
        cpu_load_d = rt();
        cpu_load_v = bus_access(0, addr, 0, 32);
      }
      return 2;
    }
    case 0x24: {
      if (cpu_load_d !== rt()) DO_PENDING_LOAD();
      cpu_load_d = rt();
      cpu_load_v = u32(psx_bus_read8(u32(cpu_r[rs()] + imm16())));
      return 2;
    }
    case 0x25: {
      addr = u32(cpu_r[rs()] + imm16());
      if (cpu_load_d !== rt()) DO_PENDING_LOAD();
      if (addr & 1) psx_cpu_exception(0x04 << 2);
      else {
        cpu_load_d = rt();
        cpu_load_v = u32(psx_bus_read16(addr));
      }
      return 2;
    }
    case 0x26: {
      rtt = rt();
      t = cpu_r[rtt];
      addr = u32(cpu_r[rs()] + imm16());
      load = bus_access(0, addr & 0xfffffffc, 0, 32);
      if (rtt === cpu_load_d) t = cpu_load_v;
      else DO_PENDING_LOAD();
      shift = (addr & 3) << 3;
      mask = u32(0xffffff00 << (24 - shift));
      cpu_load_d = rtt;
      cpu_load_v = u32((t & mask) | (load >>> shift));
      return 2;
    }
    case 0x28: {
      DO_PENDING_LOAD();
      if (cpu_cop0_r[12] & 0x00010000) return 2;
      g_bus_access_cycles = 0;
      bus_access(1, u32(cpu_r[rs()] + imm16()), cpu_r[rt()], 8);
      return 2;
    }
    case 0x29: {
      addr = u32(cpu_r[rs()] + imm16());
      DO_PENDING_LOAD();
      if (cpu_cop0_r[12] & 0x00010000) return 2;
      if (addr & 1) psx_cpu_exception(0x05 << 2);
      else psx_bus_write16(addr, cpu_r[rt()]);
      return 2;
    }
    case 0x2a: {
      DO_PENDING_LOAD();
      addr = u32(cpu_r[rs()] + imm16());
      var aligned = addr & 0xfffffffc;
      var v = bus_access(0, aligned, 0, 32);
      switch (addr & 3) {
        case 0:
          v = u32((v & 0xffffff00) | (cpu_r[rt()] >>> 24));
          break;
        case 1:
          v = u32((v & 0xffff0000) | (cpu_r[rt()] >>> 16));
          break;
        case 2:
          v = u32((v & 0xff000000) | (cpu_r[rt()] >>> 8));
          break;
        case 3:
          v = cpu_r[rt()];
          break;
      }
      psx_bus_write32(aligned, v);
      return 2;
    }
    case 0x2b: {
      addr = u32(cpu_r[rs()] + imm16());
      DO_PENDING_LOAD();
      if (cpu_cop0_r[12] & 0x00010000) return 2;
      if (addr & 3) psx_cpu_exception(0x05 << 2);
      else psx_bus_write32(addr, cpu_r[rt()]);
      return 2;
    }
    case 0x2e: {
      addr = u32(cpu_r[rs()] + imm16());
      aligned = addr & 0xfffffffc;
      v = bus_access(0, aligned, 0, 32);
      DO_PENDING_LOAD();
      switch (addr & 3) {
        case 0:
          v = cpu_r[rt()];
          break;
        case 1:
          v = u32((v & 0x000000ff) | (cpu_r[rt()] << 8));
          break;
        case 2:
          v = u32((v & 0x0000ffff) | (cpu_r[rt()] << 16));
          break;
        case 3:
          v = u32((v & 0x00ffffff) | (cpu_r[rt()] << 24));
          break;
      }
      psx_bus_write32(aligned, v);
      return 2;
    }
    case 0x30:
    case 0x31:
      psx_cpu_exception(0x0b << 2);
      return 2;
    case 0x32: {
      addr = u32(cpu_r[rs()] + imm16());
      DO_PENDING_LOAD();
      if (addr & 3) psx_cpu_exception(0x04 << 2);
      else gte_write_register(rt(), bus_access(0, addr, 0, 32));
      return 2;
    }
    case 0x33:
      psx_cpu_exception(0x0b << 2);
      return 2;
    case 0x38:
    case 0x39:
      psx_cpu_exception(0x0b << 2);
      return 2;
    case 0x3a: {
      addr = u32(cpu_r[rs()] + imm16());
      DO_PENDING_LOAD();
      if (cpu_cop0_r[12] & 0x00010000) return 2;
      if (addr & 3) psx_cpu_exception(0x05 << 2);
      else psx_bus_write32(addr, gte_read_register(rt()));
      return 2;
    }
    case 0x3b:
      psx_cpu_exception(0x0b << 2);
      return 2;
  }

  return 0;
}

function psx_cpu_cycle() {
  if (0) return;
  cpu_last_cycles = 0;
  cpu_saved_pc = cpu_pc;
  cpu_delay_slot = cpu_branch;
  cpu_branch = 0;
  cpu_branch_taken = 0;

  if (cpu_saved_pc & 3) psx_cpu_exception(0x04 << 2);

  cpu_opcode = bus_access(0, cpu_pc, 0, 32);
  cpu_last_cycles = g_bus_access_cycles;
  g_bus_access_cycles = 0;

  cpu_pc = cpu_next_pc;
  cpu_next_pc = u32(cpu_next_pc + 4);

  if ((cpu_cop0_r[12] & 0x00000001) && (cpu_cop0_r[12] & cpu_cop0_r[13] & 0x00000700)) {
    if ((cpu_opcode & 0xfe000000) === 0x4a000000) {
      DO_PENDING_LOAD();
      cpu_last_cycles += gte_run();
    }
    cpu_total_cycles += cpu_last_cycles;
    cpu_r[0] = 0;
    psx_cpu_exception(0);
    return;
  }

  var cyc = psx_cpu_execute();
  if (!cyc) psx_cpu_exception(0x0a << 2);

  cpu_last_cycles += cyc;
  cpu_total_cycles += cpu_last_cycles;
  cpu_r[0] = 0;
}

function psx_cpu_init() {
  if (0) return;
  var i = 0;
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

// --- gte ---


var MAC0_MIN = -2147483648;
var MAC0_MAX = 2147483647;
var MAC_MIN = -8796093022208;
var MAC_MAX = 8796093022207;

var gte_rd_cat = [
  1, 2, 1, 2, 1, 2, 9, 10, 3, 3, 3, 3, 4, 4, 4, 5,
  6, 6, 6, 6, 7, 7, 7, 11, 8, 8, 8, 8, 12, 13, 14, 15,
  16, 16, 16, 16, 19, 20, 20, 20, 17, 17, 17, 17, 21, 22, 22, 22,
  18, 18, 18, 18, 23, 24, 24, 24, 25, 25, 26, 27, 28, 29, 29, 30,
];

var gte_rd_sub = [
  0, 0, 1, 1, 2, 2, 0, 0, 0, 1, 2, 3, 0, 1, 2, 0,
  0, 1, 2, 3, 0, 1, 2, 0, 0, 1, 2, 3, 0, 0, 0, 0,
  0, 1, 2, 3, 0, 0, 1, 2, 0, 1, 2, 3, 0, 0, 1, 2,
  0, 1, 2, 3, 0, 0, 1, 2, 0, 1, 0, 0, 0, 0, 1, 0,
];

var gte_wr_cat = [
  1, 2, 1, 2, 1, 2, 9, 10, 3, 3, 3, 3, 4, 4, 4, 5,
  6, 6, 6, 6, 7, 7, 7, 11, 8, 8, 8, 8, 12, 13, 14, 13,
  15, 15, 15, 15, 18, 19, 19, 19, 16, 16, 16, 16, 20, 21, 21, 21,
  17, 17, 17, 17, 22, 23, 23, 23, 24, 24, 25, 26, 27, 28, 28, 29,
];

var gte_wr_sub = [
  0, 0, 1, 1, 2, 2, 0, 0, 0, 1, 2, 3, 0, 1, 2, 0,
  0, 1, 2, 3, 0, 1, 2, 0, 0, 1, 2, 3, 0, 0, 0, 0,
  0, 1, 2, 3, 0, 0, 1, 2, 0, 1, 2, 3, 0, 0, 1, 2,
  0, 1, 2, 3, 0, 0, 1, 2, 0, 1, 0, 0, 0, 0, 1, 0,
];

function gte_handle_irgb_write() {
  cpu_cop2_dr_ir1 = ((cpu_cop2_dr_irgb >>> 0) & 0x1f) * 0x80;
  cpu_cop2_dr_ir2 = ((cpu_cop2_dr_irgb >>> 5) & 0x1f) * 0x80;
  cpu_cop2_dr_ir3 = ((cpu_cop2_dr_irgb >>> 10) & 0x1f) * 0x80;
}

function gte_handle_irgb_read() {
  if (0) return;
  var r =
    cpu_cop2_dr_ir1 >> 7 <= 0x00
      ? 0x00
      : cpu_cop2_dr_ir1 >> 7 >= 0x1f
        ? 0x1f
        : cpu_cop2_dr_ir1 >> 7;
  var g =
    cpu_cop2_dr_ir2 >> 7 <= 0x00
      ? 0x00
      : cpu_cop2_dr_ir2 >> 7 >= 0x1f
        ? 0x1f
        : cpu_cop2_dr_ir2 >> 7;
  var b =
    cpu_cop2_dr_ir3 >> 7 <= 0x00
      ? 0x00
      : cpu_cop2_dr_ir3 >> 7 >= 0x1f
        ? 0x1f
        : cpu_cop2_dr_ir3 >> 7;

  cpu_cop2_dr_irgb = r | (g << 5) | (b << 10);
}

function gte_sxy_set_x(i, v) {
  cpu_cop2_dr_sxy_xy[i] =
    (cpu_cop2_dr_sxy_xy[i] & 0xffff0000) | u32(u16(s16(v)));
}

function gte_sxy_set_y(i, v) {
  cpu_cop2_dr_sxy_xy[i] =
    (cpu_cop2_dr_sxy_xy[i] & 0xffff) | (u32(u16(s16(v))) << 16);
}

function gte_handle_sxyp_write() {
  cpu_cop2_dr_sxy_xy[0] = cpu_cop2_dr_sxy_xy[1];
  cpu_cop2_dr_sxy_xy[1] = cpu_cop2_dr_sxy_xy[2];
  cpu_cop2_dr_sxy_xy[2] = cpu_cop2_dr_sxy_xy[3];
}

function gte_handle_lzcs_write() {
  if (0) return;
  if (cpu_cop2_dr_lzcs === 0xffffffff || !cpu_cop2_dr_lzcs) {
    cpu_cop2_dr_lzcr = 32;
    return;
  }

  var b = (u32(cpu_cop2_dr_lzcs) >>> 31) & 1;

  cpu_cop2_dr_lzcr = clz32(b ? u32(~cpu_cop2_dr_lzcs) : u32(cpu_cop2_dr_lzcs));
}

function gte_pack_row(a, b) {
  return u32(u16(a) | (u32(u16(b)) << 16));
}

function gte_rgb_pipe_shift() {
  cpu_cop2_dr_rgb0_u32 = cpu_cop2_dr_rgb1_u32;
  cpu_cop2_dr_rgb1_u32 = cpu_cop2_dr_rgb2_u32;
}

function gte_mvmva_copy_mx(mx) {
  if (mx === 0) {
    gte_mvmva_mx_11 = gteRT[(0) * 2 + (0)];
    gte_mvmva_mx_12 = gteRT[(0) * 2 + (1)];
    gte_mvmva_mx_13 = gteRT[(1) * 2 + (0)];
    gte_mvmva_mx_21 = gteRT[(1) * 2 + (1)];
    gte_mvmva_mx_22 = gteRT[(2) * 2 + (0)];
    gte_mvmva_mx_23 = gteRT[(2) * 2 + (1)];
    gte_mvmva_mx_31 = gteRT[(3) * 2 + (0)];
    gte_mvmva_mx_32 = gteRT[(3) * 2 + (1)];
    gte_mvmva_mx_33 = cpu_cop2_cr_rt_33;
  } else if (mx === 1) {
    gte_mvmva_mx_11 = gteL[(0) * 2 + (0)];
    gte_mvmva_mx_12 = gteL[(0) * 2 + (1)];
    gte_mvmva_mx_13 = gteL[(1) * 2 + (0)];
    gte_mvmva_mx_21 = gteL[(1) * 2 + (1)];
    gte_mvmva_mx_22 = gteL[(2) * 2 + (0)];
    gte_mvmva_mx_23 = gteL[(2) * 2 + (1)];
    gte_mvmva_mx_31 = gteL[(3) * 2 + (0)];
    gte_mvmva_mx_32 = gteL[(3) * 2 + (1)];
    gte_mvmva_mx_33 = cpu_cop2_cr_l_33;
  } else {
    gte_mvmva_mx_11 = gteLR[(0) * 2 + (0)];
    gte_mvmva_mx_12 = gteLR[(0) * 2 + (1)];
    gte_mvmva_mx_13 = gteLR[(1) * 2 + (0)];
    gte_mvmva_mx_21 = gteLR[(1) * 2 + (1)];
    gte_mvmva_mx_22 = gteLR[(2) * 2 + (0)];
    gte_mvmva_mx_23 = gteLR[(2) * 2 + (1)];
    gte_mvmva_mx_31 = gteLR[(3) * 2 + (0)];
    gte_mvmva_mx_32 = gteLR[(3) * 2 + (1)];
    gte_mvmva_mx_33 = cpu_cop2_cr_lr_33;
  }
}

function gte_clamp_mac0(value) {
  cpu_s_mac0 = (value);

  if (value < MAC0_MIN) {
    cpu_cop2_cr_flag |= 0x8000;
  } else if (value > MAC0_MAX) {
    cpu_cop2_cr_flag |= 0x10000;
  }

  return value;
}

function gte_clamp_mac(i, value) {
  if (i === 3) cpu_s_mac3 = (value);

  if (value < MAC_MIN) {
    cpu_cop2_cr_flag |= 0x8000000 >>> (i - 1);
  } else if (value > MAC_MAX) {
    cpu_cop2_cr_flag |= 0x40000000 >>> (i - 1);
  }

  value = s64_sign_extend_44(value);
  return s32((s64_sar(value, cpu_gte_sf)));
}

function gte_check_mac(i, value) {
  if (value < MAC_MIN) {
    cpu_cop2_cr_flag |= 0x8000000 >>> (i - 1);
  } else if (value > MAC_MAX) {
    cpu_cop2_cr_flag |= 0x40000000 >>> (i - 1);
  }

  return s64_sign_extend_44(value);
}

function gte_clamp_ir0(value) {
  if (value < 0) {
    cpu_cop2_cr_flag |= 0x1000;
    return 0;
  } else if (value > 0x1000) {
    cpu_cop2_cr_flag |= 0x1000;
    return 0x1000;
  }

  return value;
}

function gte_clamp_sxy(i, value) {
  if (value < -1024) {
    cpu_cop2_cr_flag |= 0x4000 >>> (i - 1);
    return -1024;
  } else if (value > 1023) {
    cpu_cop2_cr_flag |= 0x4000 >>> (i - 1);
    return 1023;
  }

  return value;
}

function gte_clamp_sz3(value) {
  if (value < 0) {
    cpu_cop2_cr_flag |= 0x40000;
    return 0;
  } else if (value > 0xffff) {
    cpu_cop2_cr_flag |= 0x40000;
    return 0xffff;
  }

  return value;
}

function gte_clamp_rgb(i, value) {
  if (value < 0) {
    cpu_cop2_cr_flag |= 0x200000 >>> (i - 1);
    return 0;
  } else if (value > 0xff) {
    cpu_cop2_cr_flag |= 0x200000 >>> (i - 1);
    return 0xff;
  }

  return u8(value);
}

function gte_rgb2_from_mac(cd) {
  cpu_cop2_dr_rgb2_u32 =
    u32(gte_clamp_rgb(1, cpu_cop2_dr_mac1 >> 4)) |
    (u32(gte_clamp_rgb(2, cpu_cop2_dr_mac2 >> 4)) << 8) |
    (u32(gte_clamp_rgb(3, cpu_cop2_dr_mac3 >> 4)) << 16) |
    (u32(cd) << 24);
}

function gte_clamp_ir(i, value, lm) {
  if (lm && value < 0) {
    cpu_cop2_cr_flag |= 0x1000000 >>> (i - 1);
    return 0;
  } else if (value < -32768 && !lm) {
    cpu_cop2_cr_flag |= 0x1000000 >>> (i - 1);
    return -0x8000;
  } else if (value > 32767) {
    cpu_cop2_cr_flag |= 0x1000000 >>> (i - 1);
    return 0x7fff;
  }

  return s32((value));
}

function gte_clamp_ir_z(value, sf, lm) {
  if (0) return;
  var value_sf = (s64_sar(value, sf));
  var value_12 = (s64_sar(value, 12));
  var min = 0;

  if (lm === 0) min = s32(-0x8000);

  if (value_12 < s32(-0x8000) || value_12 > 0x7fff) cpu_cop2_cr_flag |= 1 << 22;

  return s32(value_sf <= min ? min : value_sf >= 0x7fff ? 0x7fff : value_sf);
}

function gte_divide(n, d) {
  if (0) return;
  if (n >= d * 2) {
    cpu_cop2_cr_flag |= (1 << 31) | (1 << 17);
    return 0x1ffff;
  }

  var shift = clz32(d) - 16;

  var r1 = (d << shift) & 0x7fff;
  var r2 = PSX_GTE_UNR_TABLE[(r1 + 0x40) >> 7] + 0x101;
  var r3 = ((0x80 - r2 * (r1 + 0x8000)) >> 8) & 0x1ffff;

  var reciprocal = (r2 * r3 + 0x80) >> 8;
  var res = s64_sar(reciprocal * (n << shift) + 32768, 16);

  return res > 0x1ffff ? 0x1ffff : res;
}

function gte_rtp(i, dq) {
  if (0) return;
  var vx = (s16(cpu_cop2_dr_v_xy[i]));
  var vy = (s16(cpu_cop2_dr_v_xy[i] >>> 16));
  var vz = (cpu_cop2_dr_v_z[i]);

  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_add(
      gte_check_mac(
        1,
        s64_add(
          gte_check_mac(
            1,
            s64_add(
              s64_shl((cpu_cop2_cr_tr_x), 12),
              s64_mul((s16(gteRT[(0) * 2 + (0)])), vx))),
          s64_mul((s16(gteRT[(0) * 2 + (1)])), vy))),
      s64_mul((s16(gteRT[(1) * 2 + (0)])), vz)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_add(
      gte_check_mac(
        2,
        s64_add(
          gte_check_mac(
            2,
            s64_add(
              s64_shl((cpu_cop2_cr_tr_y), 12),
              s64_mul((s16(gteRT[(1) * 2 + (1)])), vx))),
          s64_mul((s16(gteRT[(2) * 2 + (0)])), vy))),
      s64_mul((s16(gteRT[(2) * 2 + (1)])), vz)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_add(
      gte_check_mac(
        3,
        s64_add(
          gte_check_mac(
            3,
            s64_add(
              s64_shl((cpu_cop2_cr_tr_z), 12),
              s64_mul((s16(gteRT[(3) * 2 + (0)])), vx))),
          s64_mul((s16(gteRT[(3) * 2 + (1)])), vy))),
      s64_mul((s16(cpu_cop2_cr_rt_33)), vz)));
  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir_z(cpu_s_mac3, cpu_gte_sf, cpu_gte_lm);
  cpu_cop2_dr_sz0 = cpu_cop2_dr_sz1;
  cpu_cop2_dr_sz1 = cpu_cop2_dr_sz2;
  cpu_cop2_dr_sz2 = cpu_cop2_dr_sz3;
  cpu_cop2_dr_sz3 = gte_clamp_sz3((s64_sar(cpu_s_mac3, 12)));
  var div = gte_divide(cpu_cop2_cr_h, cpu_cop2_dr_sz3);
  cpu_cop2_dr_sxy_xy[0] = cpu_cop2_dr_sxy_xy[1];
  cpu_cop2_dr_sxy_xy[1] = cpu_cop2_dr_sxy_xy[2];
  gte_sxy_set_x(
    2,
    (
      gte_clamp_sxy(
        1,
        s64_sar(gte_clamp_mac0(
          (s32(cpu_cop2_cr_ofx)) + (cpu_cop2_dr_ir1 * div)), 16))));
  gte_sxy_set_y(
    2,
    (
      gte_clamp_sxy(
        2,
        s64_sar(gte_clamp_mac0(
          (s32(cpu_cop2_cr_ofy)) + (cpu_cop2_dr_ir2 * div)), 16))));

  if (dq) {
    cpu_cop2_dr_mac0 = s32(
      (
        gte_clamp_mac0(
          (cpu_cop2_cr_dqb) + (cpu_cop2_cr_dqa * div))));
    cpu_cop2_dr_ir0 = gte_clamp_ir0((s64_sar(cpu_s_mac0, 12)));
  }
}

function gte_dpct_step() {
  if (0) return;
  var mac1 = gte_clamp_mac(
    1,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_x), 12),
      s64_shl((cpu_cop2_dr_rgb0_u32 & 0xff), 16)));
  var mac2 = gte_clamp_mac(
    2,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_y), 12),
      s64_shl(((cpu_cop2_dr_rgb0_u32 >>> 8) & 0xff), 16)));
  var mac3 = gte_clamp_mac(
    3,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_z), 12),
      s64_shl(((cpu_cop2_dr_rgb0_u32 >>> 16) & 0xff), 16)));
  var ir1 = gte_clamp_ir(1, (mac1), 0);
  var ir2 = gte_clamp_ir(2, (mac2), 0);
  var ir3 = gte_clamp_ir(3, (mac3), 0);

  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_add(
      s64_shl((cpu_cop2_dr_rgb0_u32 & 0xff), 16),
      (cpu_cop2_dr_ir0 * ir1)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_add(
      s64_shl(((cpu_cop2_dr_rgb0_u32 >>> 8) & 0xff), 16),
      (cpu_cop2_dr_ir0 * ir2)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_add(
      s64_shl(((cpu_cop2_dr_rgb0_u32 >>> 16) & 0xff), 16),
      (cpu_cop2_dr_ir0 * ir3)));
  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
  gte_rgb_pipe_shift();
  gte_rgb2_from_mac(u8(cpu_cop2_dr_rgbc_u32 >>> 24));
}

function psx_gte_i_rtps() {
  cpu_cop2_cr_flag = 0;
  gte_rtp(0, 1);
}

function psx_gte_i_nclip() {
  if (0) return;
  cpu_cop2_cr_flag = 0;

  var value = (
    s16(cpu_cop2_dr_sxy_xy[0]) *
      (s16(cpu_cop2_dr_sxy_xy[1] >>> 16) - s16(cpu_cop2_dr_sxy_xy[2] >>> 16)));
  value = s64_add(
    value,
    (
      s16(cpu_cop2_dr_sxy_xy[1]) *
        (s16(cpu_cop2_dr_sxy_xy[2] >>> 16) - s16(cpu_cop2_dr_sxy_xy[0] >>> 16))));
  value = s64_add(
    value,
    (
      s16(cpu_cop2_dr_sxy_xy[2]) *
        (s16(cpu_cop2_dr_sxy_xy[0] >>> 16) - s16(cpu_cop2_dr_sxy_xy[1] >>> 16))));

  cpu_cop2_dr_mac0 = s32((gte_clamp_mac0(value)));
}

function psx_gte_i_op() {
  cpu_cop2_cr_flag = 0;

  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_sub(
      (s16(gteRT[(2) * 2 + (0)]) * cpu_cop2_dr_ir3),
      (s16(cpu_cop2_cr_rt_33) * cpu_cop2_dr_ir2)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_sub(
      (s16(cpu_cop2_cr_rt_33) * cpu_cop2_dr_ir1),
      (s16(gteRT[(0) * 2 + (0)]) * cpu_cop2_dr_ir3)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_sub(
      (s16(gteRT[(0) * 2 + (0)]) * cpu_cop2_dr_ir2),
      (s16(gteRT[(2) * 2 + (0)]) * cpu_cop2_dr_ir1)));

  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
}

function psx_gte_i_dpcs() {
  if (0) return;
  cpu_cop2_cr_flag = 0;

  var mac1 = gte_clamp_mac(
    1,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_x), 12),
      s64_shl((cpu_cop2_dr_rgbc_u32 & 0xff), 16)));
  var mac2 = gte_clamp_mac(
    2,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_y), 12),
      s64_shl(((cpu_cop2_dr_rgbc_u32 >>> 8) & 0xff), 16)));
  var mac3 = gte_clamp_mac(
    3,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_z), 12),
      s64_shl(((cpu_cop2_dr_rgbc_u32 >>> 16) & 0xff), 16)));

  var ir1 = gte_clamp_ir(1, (mac1), 0);
  var ir2 = gte_clamp_ir(2, (mac2), 0);
  var ir3 = gte_clamp_ir(3, (mac3), 0);

  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_add(
      s64_shl((cpu_cop2_dr_rgbc_u32 & 0xff), 16),
      (cpu_cop2_dr_ir0 * ir1)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_add(
      s64_shl(((cpu_cop2_dr_rgbc_u32 >>> 8) & 0xff), 16),
      (cpu_cop2_dr_ir0 * ir2)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_add(
      s64_shl(((cpu_cop2_dr_rgbc_u32 >>> 16) & 0xff), 16),
      (cpu_cop2_dr_ir0 * ir3)));

  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);

  gte_rgb_pipe_shift();
  gte_rgb2_from_mac(u8(cpu_cop2_dr_rgbc_u32 >>> 24));
}

function psx_gte_i_intpl() {
  if (0) return;
  cpu_cop2_cr_flag = 0;

  var mac1 = gte_clamp_mac(
    1,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_x), 12),
      s64_shl((cpu_cop2_dr_ir1), 12)));
  var mac2 = gte_clamp_mac(
    2,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_y), 12),
      s64_shl((cpu_cop2_dr_ir2), 12)));
  var mac3 = gte_clamp_mac(
    3,
    s64_sub(
      s64_shl((cpu_cop2_cr_fc_z), 12),
      s64_shl((cpu_cop2_dr_ir3), 12)));

  var ir1 = gte_clamp_ir(1, (mac1), 0);
  var ir2 = gte_clamp_ir(2, (mac2), 0);
  var ir3 = gte_clamp_ir(3, (mac3), 0);

  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_add(
      s64_shl((cpu_cop2_dr_ir1), 12),
      (cpu_cop2_dr_ir0 * ir1)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_add(
      s64_shl((cpu_cop2_dr_ir2), 12),
      (cpu_cop2_dr_ir0 * ir2)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_add(
      s64_shl((cpu_cop2_dr_ir3), 12),
      (cpu_cop2_dr_ir0 * ir3)));

  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);

  gte_rgb_pipe_shift();
  gte_rgb2_from_mac(u8(cpu_cop2_dr_rgbc_u32 >>> 24));
}

function psx_gte_i_mvmva() {
  if (0) return;
  cpu_cop2_cr_flag = 0;

  switch (cpu_gte_mx) {
    case 0:
    case 1:
    case 2:
      gte_mvmva_copy_mx(cpu_gte_mx);
      break;
    case 3:
      gte_mvmva_mx_11 = s16(-((cpu_cop2_dr_rgbc_u32 & 0xff) << 4));
      gte_mvmva_mx_12 = s16((cpu_cop2_dr_rgbc_u32 & 0xff) << 4);
      gte_mvmva_mx_13 = cpu_cop2_dr_ir0;
      gte_mvmva_mx_21 = gteRT[(1) * 2 + (0)];
      gte_mvmva_mx_22 = gteRT[(1) * 2 + (0)];
      gte_mvmva_mx_23 = gteRT[(1) * 2 + (0)];
      gte_mvmva_mx_31 = gteRT[(2) * 2 + (0)];
      gte_mvmva_mx_32 = gteRT[(2) * 2 + (0)];
      gte_mvmva_mx_33 = gteRT[(2) * 2 + (0)];
      break;
  }

  switch (cpu_gte_v) {
    case 0:
      gte_mvmva_vx = s16(cpu_cop2_dr_v_xy[0]);
      gte_mvmva_vy = s16(cpu_cop2_dr_v_xy[0] >>> 16);
      gte_mvmva_vz = cpu_cop2_dr_v_z[0];
      break;
    case 1:
      gte_mvmva_vx = s16(cpu_cop2_dr_v_xy[1]);
      gte_mvmva_vy = s16(cpu_cop2_dr_v_xy[1] >>> 16);
      gte_mvmva_vz = cpu_cop2_dr_v_z[1];
      break;
    case 2:
      gte_mvmva_vx = s16(cpu_cop2_dr_v_xy[2]);
      gte_mvmva_vy = s16(cpu_cop2_dr_v_xy[2] >>> 16);
      gte_mvmva_vz = cpu_cop2_dr_v_z[2];
      break;
    case 3:
      gte_mvmva_vx = cpu_cop2_dr_ir1;
      gte_mvmva_vy = cpu_cop2_dr_ir2;
      gte_mvmva_vz = cpu_cop2_dr_ir3;
      break;
  }

  switch (cpu_gte_cv) {
    case 0:
      gte_mvmva_cv_x = cpu_cop2_cr_tr_x;
      gte_mvmva_cv_y = cpu_cop2_cr_tr_y;
      gte_mvmva_cv_z = cpu_cop2_cr_tr_z;
      break;
    case 1:
      gte_mvmva_cv_x = cpu_cop2_cr_bk_x;
      gte_mvmva_cv_y = cpu_cop2_cr_bk_y;
      gte_mvmva_cv_z = cpu_cop2_cr_bk_z;
      break;
    case 2:
      gte_mvmva_cv_x = cpu_cop2_cr_fc_x;
      gte_mvmva_cv_y = cpu_cop2_cr_fc_y;
      gte_mvmva_cv_z = cpu_cop2_cr_fc_z;
      break;
    case 3:
      gte_mvmva_cv_x = 0;
      gte_mvmva_cv_y = 0;
      gte_mvmva_cv_z = 0;
      break;
  }

  if (cpu_gte_cv === 2) {
    cpu_cop2_dr_mac1 = gte_clamp_mac(
      1,
      gte_check_mac(
        1,
        s64_add(
          (gte_mvmva_mx_12 * gte_mvmva_vy),
          (gte_mvmva_mx_13 * gte_mvmva_vz))));
    cpu_cop2_dr_mac2 = gte_clamp_mac(
      2,
      gte_check_mac(
        2,
        s64_add(
          (gte_mvmva_mx_22 * gte_mvmva_vy),
          (gte_mvmva_mx_23 * gte_mvmva_vz))));
    cpu_cop2_dr_mac3 = gte_clamp_mac(
      3,
      gte_check_mac(
        3,
        s64_add(
          (gte_mvmva_mx_32 * gte_mvmva_vy),
          (gte_mvmva_mx_33 * gte_mvmva_vz))));

    var mac1 = gte_clamp_mac(
      1,
      s64_add(
        s64_shl((gte_mvmva_cv_x), 12),
        (gte_mvmva_mx_11 * gte_mvmva_vx)));
    var mac2 = gte_clamp_mac(
      2,
      s64_add(
        s64_shl((gte_mvmva_cv_y), 12),
        (gte_mvmva_mx_21 * gte_mvmva_vx)));
    var mac3 = gte_clamp_mac(
      3,
      s64_add(
        s64_shl((gte_mvmva_cv_z), 12),
        (gte_mvmva_mx_31 * gte_mvmva_vx)));

    gte_clamp_ir(1, (mac1), 0);
    gte_clamp_ir(2, (mac2), 0);
    gte_clamp_ir(3, (mac3), 0);
  } else {
    cpu_cop2_dr_mac1 = gte_clamp_mac(
      1,
      gte_check_mac(1, s64_add(gte_check_mac(
          1,
          s64_add(
            s64_add(
              s64_shl((gte_mvmva_cv_x), 12),
              (gte_mvmva_mx_11 * gte_mvmva_vx)),
            (gte_mvmva_mx_12 * gte_mvmva_vy))), (gte_mvmva_mx_13 * gte_mvmva_vz))));
    cpu_cop2_dr_mac2 = gte_clamp_mac(
      2,
      gte_check_mac(2, s64_add(gte_check_mac(
          2,
          s64_add(
            s64_add(
              s64_shl((gte_mvmva_cv_y), 12),
              (gte_mvmva_mx_21 * gte_mvmva_vx)),
            (gte_mvmva_mx_22 * gte_mvmva_vy))), (gte_mvmva_mx_23 * gte_mvmva_vz))));
    cpu_cop2_dr_mac3 = gte_clamp_mac(
      3,
      gte_check_mac(3, s64_add(gte_check_mac(
          3,
          s64_add(
            s64_add(
              s64_shl((gte_mvmva_cv_z), 12),
              (gte_mvmva_mx_31 * gte_mvmva_vx)),
            (gte_mvmva_mx_32 * gte_mvmva_vy))), (gte_mvmva_mx_33 * gte_mvmva_vz))));
  }

  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
}

function psx_gte_i_ncds() {
  if (0) return;
  cpu_cop2_cr_flag = 0;

  var vx = (s16(cpu_cop2_dr_v_xy[0]));
  var vy = (s16(cpu_cop2_dr_v_xy[0] >>> 16));
  var vz = (cpu_cop2_dr_v_z[0]);

  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_add(
      s64_add(
        s64_mul((s16(gteL[(0) * 2 + (0)])), vx),
        s64_mul((s16(gteL[(0) * 2 + (1)])), vy)),
      s64_mul((s16(gteL[(1) * 2 + (0)])), vz)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_add(
      s64_add(
        s64_mul((s16(gteL[(1) * 2 + (1)])), vx),
        s64_mul((s16(gteL[(2) * 2 + (0)])), vy)),
      s64_mul((s16(gteL[(2) * 2 + (1)])), vz)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_add(
      s64_add(
        s64_mul((s16(gteL[(3) * 2 + (0)])), vx),
        s64_mul((s16(gteL[(3) * 2 + (1)])), vy)),
      s64_mul((s16(cpu_cop2_cr_l_33)), vz)));
  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    gte_check_mac(1, s64_add(gte_check_mac(
        1,
        s64_add(
          s64_add(
            s64_shl((cpu_cop2_cr_bk_x), 12),
            s64_mul((s16(gteLR[(0) * 2 + (0)])), (cpu_cop2_dr_ir1))),
          s64_mul((s16(gteLR[(0) * 2 + (1)])), (cpu_cop2_dr_ir2)))), (gteLR[(1) * 2 + (0)] * cpu_cop2_dr_ir3))));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    gte_check_mac(2, s64_add(gte_check_mac(
        2,
        s64_add(
          s64_add(
            s64_shl((cpu_cop2_cr_bk_y), 12),
            (gteLR[(1) * 2 + (1)] * cpu_cop2_dr_ir1)),
          (gteLR[(2) * 2 + (0)] * cpu_cop2_dr_ir2))), (gteLR[(2) * 2 + (1)] * cpu_cop2_dr_ir3))));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    gte_check_mac(3, s64_add(gte_check_mac(
        3,
        s64_add(
          s64_add(
            s64_shl((cpu_cop2_cr_bk_z), 12),
            (gteLR[(3) * 2 + (0)] * cpu_cop2_dr_ir1)),
          (gteLR[(3) * 2 + (1)] * cpu_cop2_dr_ir2))), (cpu_cop2_cr_lr_33 * cpu_cop2_dr_ir3))));
  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
  var ir1 = gte_clamp_ir(
    1,
    gte_clamp_mac(
      1,
      s64_sub(
        s64_shl((cpu_cop2_cr_fc_x), 12),
        ((cpu_cop2_dr_rgbc_u32 & 0xff) << 4) * (cpu_cop2_dr_ir1))),
    0);
  var ir2 = gte_clamp_ir(
    2,
    gte_clamp_mac(
      2,
      s64_sub(
        s64_shl((cpu_cop2_cr_fc_y), 12),
        (((cpu_cop2_dr_rgbc_u32 >>> 8) & 0xff) << 4) * (cpu_cop2_dr_ir2))),
    0);
  var ir3 = gte_clamp_ir(
    3,
    gte_clamp_mac(
      3,
      s64_sub(
        s64_shl((cpu_cop2_cr_fc_z), 12),
        (((cpu_cop2_dr_rgbc_u32 >>> 16) & 0xff) << 4) * (cpu_cop2_dr_ir3))),
    0);
  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_add(
      ((cpu_cop2_dr_rgbc_u32 & 0xff) << 4) * (cpu_cop2_dr_ir1),
      (cpu_cop2_dr_ir0 * ir1)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_add(
      (((cpu_cop2_dr_rgbc_u32 >>> 8) & 0xff) << 4) * (cpu_cop2_dr_ir2),
      (cpu_cop2_dr_ir0 * ir2)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_add(
      (((cpu_cop2_dr_rgbc_u32 >>> 16) & 0xff) << 4) * (cpu_cop2_dr_ir3),
      (cpu_cop2_dr_ir0 * ir3)));
  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
  gte_rgb_pipe_shift();
  gte_rgb2_from_mac(u8(cpu_cop2_dr_rgbc_u32 >>> 24));
}

function psx_gte_i_sqr() {
  cpu_cop2_cr_flag = 0;

  cpu_cop2_dr_mac1 = gte_clamp_mac(1, (cpu_cop2_dr_ir1 * cpu_cop2_dr_ir1));
  cpu_cop2_dr_mac2 = gte_clamp_mac(2, (cpu_cop2_dr_ir2 * cpu_cop2_dr_ir2));
  cpu_cop2_dr_mac3 = gte_clamp_mac(3, (cpu_cop2_dr_ir3 * cpu_cop2_dr_ir3));

  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
}

function psx_gte_i_dpct() {
  cpu_cop2_cr_flag = 0;
  gte_dpct_step();
  gte_dpct_step();
  gte_dpct_step();
}

function psx_gte_i_avsz3() {
  if (0) return;
  cpu_cop2_cr_flag = 0;

  var avg = (cpu_cop2_cr_zsf3 * (cpu_cop2_dr_sz1 + cpu_cop2_dr_sz2 + cpu_cop2_dr_sz3));

  cpu_cop2_dr_mac0 = s32((gte_clamp_mac0(avg)));
  cpu_cop2_dr_otz = gte_clamp_sz3((s64_sar(avg, 12)));
}

function psx_gte_i_rtpt() {
  cpu_cop2_cr_flag = 0;
  gte_rtp(0, 0);
  gte_rtp(1, 0);
  gte_rtp(2, 1);
}

function psx_gte_i_gpf() {
  cpu_cop2_cr_flag = 0;

  cpu_cop2_dr_mac1 = gte_clamp_mac(1, (cpu_cop2_dr_ir0 * cpu_cop2_dr_ir1));
  cpu_cop2_dr_mac2 = gte_clamp_mac(2, (cpu_cop2_dr_ir0 * cpu_cop2_dr_ir2));
  cpu_cop2_dr_mac3 = gte_clamp_mac(3, (cpu_cop2_dr_ir0 * cpu_cop2_dr_ir3));
  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
  gte_rgb_pipe_shift();
  gte_rgb2_from_mac(u8(cpu_cop2_dr_rgbc_u32 >>> 24));
}

function psx_gte_i_gpl() {
  cpu_cop2_cr_flag = 0;

  cpu_cop2_dr_mac1 = gte_clamp_mac(
    1,
    s64_add(
      s64_shl((cpu_cop2_dr_mac1), cpu_gte_sf),
      (cpu_cop2_dr_ir0 * cpu_cop2_dr_ir1)));
  cpu_cop2_dr_mac2 = gte_clamp_mac(
    2,
    s64_add(
      s64_shl((cpu_cop2_dr_mac2), cpu_gte_sf),
      (cpu_cop2_dr_ir0 * cpu_cop2_dr_ir2)));
  cpu_cop2_dr_mac3 = gte_clamp_mac(
    3,
    s64_add(
      s64_shl((cpu_cop2_dr_mac3), cpu_gte_sf),
      (cpu_cop2_dr_ir0 * cpu_cop2_dr_ir3)));
  cpu_cop2_dr_ir1 = gte_clamp_ir(1, (cpu_cop2_dr_mac1), cpu_gte_lm);
  cpu_cop2_dr_ir2 = gte_clamp_ir(2, (cpu_cop2_dr_mac2), cpu_gte_lm);
  cpu_cop2_dr_ir3 = gte_clamp_ir(3, (cpu_cop2_dr_mac3), cpu_gte_lm);
  gte_rgb_pipe_shift();
  gte_rgb2_from_mac(u8(cpu_cop2_dr_rgbc_u32 >>> 24));
}

function gte_read_register(r) {
  if (0) return;
  if (r > 63) return 0;

  var cat = gte_rd_cat[r];
  var sub = gte_rd_sub[r];

  switch (cat) {
    case 1:
      return cpu_cop2_dr_v_xy[sub];
    case 2:
      return s32(cpu_cop2_dr_v_z[sub]);
    case 3:
      switch (sub) {
        case 0:
          return s32(cpu_cop2_dr_ir0);
        case 1:
          return s32(cpu_cop2_dr_ir1);
        case 2:
          return s32(cpu_cop2_dr_ir2);
        default:
          return s32(cpu_cop2_dr_ir3);
      }
    case 4:
      return cpu_cop2_dr_sxy_xy[sub];
    case 5:
      return cpu_cop2_dr_sxy_xy[2];
    case 6:
      switch (sub) {
        case 0:
          return cpu_cop2_dr_sz0;
        case 1:
          return cpu_cop2_dr_sz1;
        case 2:
          return cpu_cop2_dr_sz2;
        default:
          return cpu_cop2_dr_sz3;
      }
    case 7:
      switch (sub) {
        case 0:
          return cpu_cop2_dr_rgb0_u32;
        case 1:
          return cpu_cop2_dr_rgb1_u32;
        default:
          return cpu_cop2_dr_rgb2_u32;
      }
    case 8:
      switch (sub) {
        case 0:
          return cpu_cop2_dr_mac0;
        case 1:
          return cpu_cop2_dr_mac1;
        case 2:
          return cpu_cop2_dr_mac2;
        default:
          return cpu_cop2_dr_mac3;
      }
    case 9:
      return cpu_cop2_dr_rgbc_u32;
    case 10:
      return cpu_cop2_dr_otz;
    case 11:
      return cpu_cop2_dr_res1;
    case 12:
      gte_handle_irgb_read();
      return cpu_cop2_dr_irgb;
    case 13:
      return cpu_cop2_dr_irgb;
    case 14:
      return cpu_cop2_dr_lzcs;
    case 15:
      return cpu_cop2_dr_lzcr;
    case 16:
      return gte_pack_row(gteRT[(sub) * 2 + (0)], gteRT[(sub) * 2 + (1)]);
    case 17:
      return gte_pack_row(gteL[(sub) * 2 + (0)], gteL[(sub) * 2 + (1)]);
    case 18:
      return gte_pack_row(gteLR[(sub) * 2 + (0)], gteLR[(sub) * 2 + (1)]);
    case 19:
      return s32(cpu_cop2_cr_rt_33);
    case 20:
      switch (sub) {
        case 0:
          return cpu_cop2_cr_tr_x;
        case 1:
          return cpu_cop2_cr_tr_y;
        default:
          return cpu_cop2_cr_tr_z;
      }
    case 21:
      return s32(cpu_cop2_cr_l_33);
    case 22:
      switch (sub) {
        case 0:
          return cpu_cop2_cr_bk_x;
        case 1:
          return cpu_cop2_cr_bk_y;
        default:
          return cpu_cop2_cr_bk_z;
      }
    case 23:
      return s32(cpu_cop2_cr_lr_33);
    case 24:
      switch (sub) {
        case 0:
          return cpu_cop2_cr_fc_x;
        case 1:
          return cpu_cop2_cr_fc_y;
        default:
          return cpu_cop2_cr_fc_z;
      }
    case 25:
      return sub ? cpu_cop2_cr_ofy : cpu_cop2_cr_ofx;
    case 26:
      return s32(s16(cpu_cop2_cr_h));
    case 27:
      return cpu_cop2_cr_dqa;
    case 28:
      return cpu_cop2_cr_dqb;
    case 29:
      return sub ? cpu_cop2_cr_zsf4 : cpu_cop2_cr_zsf3;
    case 30:
      return (cpu_cop2_cr_flag & 0x7ffff000) | ((cpu_cop2_cr_flag & 0x7f87e000) !== 0 ? 1 << 31 : 0);
  }

  return 0;
}

function gte_write_register(r, value) {
  if (0) return;
  if (r > 63) return;

  var cat = gte_wr_cat[r];
  var sub = gte_wr_sub[r];

  switch (cat) {
    case 1:
      cpu_cop2_dr_v_xy[sub] = value;
      break;
    case 2:
      cpu_cop2_dr_v_z[sub] = value;
      break;
    case 3:
      switch (sub) {
        case 0:
          cpu_cop2_dr_ir0 = value;
          break;
        case 1:
          cpu_cop2_dr_ir1 = value;
          break;
        case 2:
          cpu_cop2_dr_ir2 = value;
          break;
        default:
          cpu_cop2_dr_ir3 = value;
          break;
      }
      break;
    case 4:
      cpu_cop2_dr_sxy_xy[sub] = value;
      break;
    case 5:
      cpu_cop2_dr_sxy_xy[3] = value;
      gte_handle_sxyp_write();
      break;
    case 6:
      switch (sub) {
        case 0:
          cpu_cop2_dr_sz0 = value;
          break;
        case 1:
          cpu_cop2_dr_sz1 = value;
          break;
        case 2:
          cpu_cop2_dr_sz2 = value;
          break;
        default:
          cpu_cop2_dr_sz3 = value;
          break;
      }
      break;
    case 7:
      switch (sub) {
        case 0:
          cpu_cop2_dr_rgb0_u32 = value;
          break;
        case 1:
          cpu_cop2_dr_rgb1_u32 = value;
          break;
        default:
          cpu_cop2_dr_rgb2_u32 = value;
          break;
      }
      break;
    case 8:
      switch (sub) {
        case 0:
          cpu_cop2_dr_mac0 = value;
          break;
        case 1:
          cpu_cop2_dr_mac1 = value;
          break;
        case 2:
          cpu_cop2_dr_mac2 = value;
          break;
        default:
          cpu_cop2_dr_mac3 = value;
          break;
      }
      break;
    case 9:
      cpu_cop2_dr_rgbc_u32 = value;
      break;
    case 10:
      cpu_cop2_dr_otz = value;
      break;
    case 11:
      cpu_cop2_dr_res1 = value;
      break;
    case 12:
      cpu_cop2_dr_irgb = value & 0x7fff;
      gte_handle_irgb_write();
      break;
    case 14:
      cpu_cop2_dr_lzcs = value;
      gte_handle_lzcs_write();
      break;
    case 15:
      gteRT[(sub) * 2 + (0)] = s16(value & 0xffff);
      gteRT[(sub) * 2 + (1)] = s16(value >>> 16);
      break;
    case 16:
      gteL[(sub) * 2 + (0)] = s16(value & 0xffff);
      gteL[(sub) * 2 + (1)] = s16(value >>> 16);
      break;
    case 17:
      gteLR[(sub) * 2 + (0)] = s16(value & 0xffff);
      gteLR[(sub) * 2 + (1)] = s16(value >>> 16);
      break;
    case 18:
      cpu_cop2_cr_rt_33 = value;
      break;
    case 19:
      switch (sub) {
        case 0:
          cpu_cop2_cr_tr_x = value;
          break;
        case 1:
          cpu_cop2_cr_tr_y = value;
          break;
        default:
          cpu_cop2_cr_tr_z = value;
          break;
      }
      break;
    case 20:
      cpu_cop2_cr_l_33 = value;
      break;
    case 21:
      switch (sub) {
        case 0:
          cpu_cop2_cr_bk_x = value;
          break;
        case 1:
          cpu_cop2_cr_bk_y = value;
          break;
        default:
          cpu_cop2_cr_bk_z = value;
          break;
      }
      break;
    case 22:
      cpu_cop2_cr_lr_33 = value;
      break;
    case 23:
      switch (sub) {
        case 0:
          cpu_cop2_cr_fc_x = value;
          break;
        case 1:
          cpu_cop2_cr_fc_y = value;
          break;
        default:
          cpu_cop2_cr_fc_z = value;
          break;
      }
      break;
    case 24:
      if (sub) cpu_cop2_cr_ofy = value;
      else cpu_cop2_cr_ofx = value;
      break;
    case 25:
      cpu_cop2_cr_h = value;
      break;
    case 26:
      cpu_cop2_cr_dqa = value;
      break;
    case 27:
      cpu_cop2_cr_dqb = value;
      break;
    case 28:
      if (sub) cpu_cop2_cr_zsf4 = value;
      else cpu_cop2_cr_zsf3 = value;
      break;
    case 29:
      cpu_cop2_cr_flag = value & 0x7ffff000;
      break;
    default:
      break;
  }
}

function gte_run() {
  cpu_gte_sf = (cpu_opcode & 0x80000) !== 0 ? 12 : 0;
  cpu_gte_lm = (cpu_opcode & 0x400) !== 0 ? 1 : 0;
  cpu_gte_cv = (cpu_opcode >>> 13) & 3;
  cpu_gte_v = (cpu_opcode >>> 15) & 3;
  cpu_gte_mx = (cpu_opcode >>> 17) & 3;

  switch (cpu_opcode & 0x3f) {
    case 0x01:
      psx_gte_i_rtps();
      return 15;
    case 0x06:
      psx_gte_i_nclip();
      return 8;
    case 0x0c:
      psx_gte_i_op();
      return 6;
    case 0x10:
      psx_gte_i_dpcs();
      return 8;
    case 0x11:
      psx_gte_i_intpl();
      return 8;
    case 0x12:
      psx_gte_i_mvmva();
      return 8;
    case 0x13:
      psx_gte_i_ncds();
      return 19;
    case 0x28:
      psx_gte_i_sqr();
      return 5;
    case 0x2a:
      psx_gte_i_dpct();
      return 17;
    case 0x2d:
      psx_gte_i_avsz3();
      return 5;
    case 0x30:
      psx_gte_i_rtpt();
      return 23;
    case 0x3d:
      psx_gte_i_gpf();
      return 5;
    case 0x3e:
      psx_gte_i_gpl();
      return 5;
    default:
      return 0;
  }
}

// --- ic ---

function psx_ic_irq(id) {
  ic_stat |= id;

  if (ic_mask & ic_stat) cpu_cop0_r[13] = cpu_cop0_r[13] |  0x00000400;
}

// --- timer ---

function timer_read_mode(i) {
  if (0) return;
  var value = u16(timer_mode[i] & 0x1fff);
  timer_mode[i] = u16(timer_mode[i] & ~0x1800);
  return value;
}

function timer_write_mode(i, value) {
  if (0) return;
  var sync_mode;

  timer_mode[i] = u16((value & 0x03ff) | 0x0400);
  timer_irq_fired[i] = 0;
  timer_counter[i] = 0;
  timer_blank_once[i] = 0;
  timer_paused[i] = 0;

  if (i === 2) {
    if (!(timer_mode[i] & 1)) return;

    sync_mode = (timer_mode[i] >>> 1) & 3;
    timer_paused[i] = sync_mode === 0 || sync_mode === 3 ? 1 : 0;
    return;
  }

  sync_mode = (timer_mode[i] >>> 1) & 3;

  if (sync_mode === 1 || sync_mode === 2 || !(timer_mode[i] & 1)) return;

  timer_paused[i] = ((i ? timer_vblank : timer_hblank) | (sync_mode === 3)) ? 1 : 0;
}

function timer_handle_irq(i) {
  if (0) return;
  var irq = 0;

  if ((timer_counter[i] >>> 8) > timer_target[i]) {
    timer_mode[i] = u16(timer_mode[i] | 0x0800);

    if (timer_mode[i] & 0x0008) timer_counter[i] = 0;

    if (timer_mode[i] & 0x0010) irq = 1;
  }

  if ((timer_counter[i] >>> 8) > 65535) {
    timer_counter[i] = 0;
    timer_mode[i] = u16(timer_mode[i] | 0x1000);

    if (timer_mode[i] & 0x0020) irq = 1;
  }

  if (!irq) return;

  if (!(timer_mode[i] & 0x0080)) timer_mode[i] = u16(timer_mode[i] & ~0x0400);
  else timer_mode[i] = u16(timer_mode[i] ^ 0x0400);

  if (!(timer_mode[i] & 0x0040)) {
    if (!(timer_mode[i] & 0x0400) && !timer_irq_fired[i]) timer_irq_fired[i] = 1;
    else return;
  }

  if (!(timer_mode[i] & 0x0400)) {
    timer_mode[i] = u16(timer_mode[i] | 0x0400);
    psx_ic_irq(16 << i);
  }
}

function timer_scaled_inc(i, cyc) {
  if (0) return;
  var inc = cyc << 8;
  var clk = (timer_mode[i] >>> 8) & 3;

  if (i === 0 && clk & 1) {
    var d = timer_gpu_dot_div();
    inc = trunc((inc * 11) / (7 * d));
  } else if (i === 1 && clk & 1) {
    return 0;
  } else if (i === 2 && clk > 1) {
    inc >>>= 3;
  }

  return inc;
}

function timer_tick(i, cyc) {
  if (timer_paused[i]) return;

  timer_counter[i] = u32(timer_counter[i] + timer_scaled_inc(i, cyc));
  timer_handle_irq(i);
}

function timer_blank_sync(i, start) {
  if (0) return;
  if (!(timer_mode[i] & 1)) return;

  var sync_mode = (timer_mode[i] >>> 1) & 3;

  if (start) {
    switch (sync_mode) {
      case 0:
        timer_paused[i] = 1;
        break;
      case 1:
        timer_counter[i] = 0;
        break;
      case 2:
        timer_counter[i] = 0;
        timer_paused[i] = 0;
        break;
      case 3:
        if (!timer_blank_once[i]) {
          timer_blank_once[i] = 1;
          timer_mode[i] = u16(timer_mode[i] & ~1);
          timer_paused[i] = 0;
        }
        break;
    }
  } else {
    switch (sync_mode) {
      case 0:
        timer_paused[i] = 0;
        break;
      case 2:
        timer_paused[i] = 1;
        break;
    }
  }
}

function psx_timer_update(_cyc) {
  timer_tick(0, 2);
  timer_tick(1, 2);
  timer_tick(2, 2);
}

function bus_timer(write, offset, value, width) {
  if (0) return;
  var i = offset >>> 4;
  var reg = offset & 0xf;

  g_bus_access_cycles = 0;
  if (write) {
    if (width !== 8) {
      switch (reg) {
        case 0:
          timer_counter[i] = u32(u32(value) & 0xffff) << 8;
          break;
        case 4:
          timer_write_mode(i, value);
          break;
        case 8:
          timer_target[i] = u32(value) & 0xffff;
          break;
      }
      timer_handle_irq(i);
    }
    return 0;
  }

  if (width === 8) return 0;

  switch (reg) {
    case 0:
      return u16(timer_counter[i] >>> 8);
    case 4:
      return timer_read_mode(i);
    case 8:
      return timer_target[i];
  }

  return 0;
}

// --- pad ---

function pad_joy_queue() {
  pad_rxq[0] = 0xff;
  pad_rxq[1] = 0x41;
  pad_rxq[2] = 0x5a;
  pad_rxq[3] = u8(pad_buttons);
  pad_rxq[4] = u8(pad_buttons >>> 8);
  pad_rxq_len = 5;
  pad_rxq_pos = 0;
}

function pad_write_tx(data) {
  if (!(pad_ctrl & 0x0001)) return;

  if (!pad_dest) {
    if (data !== 0x01) return;

    pad_dest = 0x01;
    pad_joy_queue();

    if (pad_ctrl & 0x1000) pad_cycles_until_irq = 512;
    return;
  }

  if (pad_dest !== 0x01) return;

  if (data === 0x43) {
    pad_rxq[0] = 0xff;
    pad_rxq_len = 1;
    pad_rxq_pos = 0;
  }

  if (pad_rxq_pos >= pad_rxq_len) pad_dest = 0;

  if (pad_ctrl & 0x1000) {
    pad_irq_bit = 1;
    pad_cycles_until_irq = 512;
  }
}

function pad_handle_ctrl_write(value) {
  pad_ctrl = u16(value);

  if (!(pad_ctrl & 0x0002)) pad_dest = 0;

  if (pad_ctrl & 0x0010) {
    pad_stat = u16(pad_stat & 0xfdc7);
    pad_ctrl = u16(pad_ctrl & ~0x0010);
  }
}

function psx_pad_read_rx() {
  if (!pad_dest) return 0xffffffff;

  if (!(pad_ctrl & 0x0002) && !(pad_ctrl & 0x0004)) return 0xffffffff;

  if (pad_dest !== 0x01) return 0xffffffff;

  if (pad_rxq_pos >= pad_rxq_len) {
    pad_dest = 0;
    return 0xff;
  }

  return pad_rxq[pad_rxq_pos++];
}

function bus_pad(write, offset, value, width) {
  if (0) return;
  g_bus_access_cycles = 0;
  if (write) {
    if (width === 8 || width === 16) {
      switch (offset) {
        case 0:
          pad_write_tx(u16(value));
          break;
        case 8:
          pad_mode = u16(value);
          break;
        case 10:
          pad_handle_ctrl_write(value);
          break;
        case 14:
          pad_baud = u16(value);
          break;
      }
    }
    return 0;
  }

  var v = 0;
  switch (offset) {
    case 0:
      v = psx_pad_read_rx();
      break;
    case 4:
      v = pad_stat | 7;
      break;
    case 8:
      v = pad_mode;
      break;
    case 10:
      v = pad_ctrl;
      break;
    case 14:
      v = pad_baud;
      break;
  }

  if (width === 8) return u8(v);
  if (width === 16) return u16(v);
  return u32(v);
}

function psx_pad_button_press(slot, data) {
  if (slot === 0) pad_buttons = u16(pad_buttons & ~data);
}

function psx_pad_button_release(slot, data) {
  if (slot === 0) pad_buttons = u16(pad_buttons | data);
}

function psx_pad_update(cyc) {
  if (!pad_cycles_until_irq) return;

  pad_cycles_until_irq -= cyc;

  if (pad_cycles_until_irq > 0) return;

  psx_ic_irq(0x80);

  if (pad_irq_bit) {
    pad_stat = u16(pad_stat | 0x0200);
    pad_irq_bit = 0;
  }

  pad_cycles_until_irq = 0;
}

// --- gpu raster ---

function gpu_clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function gpu_rgb888_to_bgr555(cr, cg, cb) {
  if (0) return;
  var rgb =
    u32(gpu_clamp255(cr)) |
    (u32(gpu_clamp255(cg)) << 8) |
    (u32(gpu_clamp255(cb)) << 16);

  return u16(
    ((rgb & 0x0000f8) >>> 3) | ((rgb & 0x00f800) >>> 6) | ((rgb & 0xf80000) >>> 9));
}

function gpu_modulate_texel(texel, mod) {
  if (0) return;
  var tr = ((texel >>> 0) & 0x1f) << 3;
  var tg = ((texel >>> 5) & 0x1f) << 3;
  var tb = ((texel >>> 10) & 0x1f) << 3;

  return gpu_rgb888_to_bgr555(
    (tr * u8(mod) + 64) >> 7,
    (tg * u8(mod >>> 8) + 64) >> 7,
    (tb * u8(mod >>> 16) + 64) >> 7);
}

function gpu_blend_transp(color, back) {
  if (0) return;
  var cr = ((color >>> 0) & 0x1f) << 3;
  var cg = ((color >>> 5) & 0x1f) << 3;
  var cb = ((color >>> 10) & 0x1f) << 3;
  var br = ((back >>> 0) & 0x1f) << 3;
  var bg = ((back >>> 5) & 0x1f) << 3;
  var bb = ((back >>> 10) & 0x1f) << 3;

  return gpu_rgb888_to_bgr555((br + cr) >> 1, (bg + cg) >> 1, (bb + cb) >> 1);
}

function gpu_put_pixel(x, y, color) {
  vram[x + y * 1024] = u16(color);
}

function gpu_draw_pixel(x, y, color, transp) {
  if (transp) color = gpu_blend_transp(color, vram[x + y * 1024]);

  gpu_put_pixel(x, y, color);
}

function gpu_fetch_texel(tx, ty, tpx, tpy, clutx, cluty, depth) {
  if (0) return;
  tx = u16((tx & ~gpu_texw_mx) | (gpu_texw_ox & gpu_texw_mx));
  ty = u16((ty & ~gpu_texw_my) | (gpu_texw_oy & gpu_texw_my));
  tx = u16(tx & 0xff);
  ty = u16(ty & 0xff);

  if (depth === 0) {
    var texel = vram[tpx + (tx >>> 2) + (tpy + ty) * 1024];
    var index = (texel >>> ((tx & 0x3) << 2)) & 0xf;

    return vram[clutx + index + cluty * 1024];
  }

  if (depth === 1) {
    texel = vram[tpx + (tx >>> 1) + (tpy + ty) * 1024];
    index = (texel >>> ((tx & 0x1) << 3)) & 0xff;

    return vram[clutx + index + cluty * 1024];
  }

  return vram[tpx + tx + (tpy + ty) * 1024];
}


function gpu_plot_line_pixel(x, y, color) {
  if (0) return;
  var bc =
    x >= gpu_draw_x1 &&
    x <= gpu_draw_x2 &&
    y >= gpu_draw_y1 &&
    y <= gpu_draw_y2;

  if (x < 1024 && y < 512 && x >= 0 && y >= 0 && bc) vram[x + y * 1024] = u16(color);
}

function gpu_plot_line(x0, y0, x1, y1, color) {
  if (0) return;
  if (Math.abs(y1 - y0) < Math.abs(x1 - x0)) {
    var dx;
    var dy;
    var yi;
    var d;
    var y;
    var x;

    if (x0 > x1) {
      var tx = x0;
      var ty = y0;
      x0 = x1;
      y0 = y1;
      x1 = tx;
      y1 = ty;
    }
    dx = x1 - x0;
    dy = y1 - y0;
    yi = 1;
    if (dy < 0) {
      yi = -1;
      dy = -dy;
    }
    d = 2 * dy - dx;
    y = y0;
    for (x = x0; x < x1; x++) {
      gpu_plot_line_pixel(x, y, color);
      if (d > 0) {
        y += yi;
        d += 2 * (dy - dx);
      } else d += 2 * dy;
    }
  } else {
    var xi;

    if (y0 > y1) {
      tx = x0;
      ty = y0;
      x0 = x1;
      y0 = y1;
      x1 = tx;
      y1 = ty;
    }
    dx = x1 - x0;
    dy = y1 - y0;
    xi = 1;
    if (dx < 0) {
      xi = -1;
      dx = -dx;
    }
    d = 2 * dx - dy;
    x = x0;
    for (y = y0; y < y1; y++) {
      gpu_plot_line_pixel(x, y, color);
      if (d > 0) {
        x += xi;
        d += 2 * (dx - dy);
      } else d += 2 * dx;
    }
  }
}

function gpu_render_flat_line(x0, y0, x1, y1, color) {
  gpu_plot_line(x0 + gpu_off_x, y0 + gpu_off_y, x1 + gpu_off_x, y1 + gpu_off_y, color);
}

function gpu_render_triangle(i0, i1, i2, edge) {
  if (0) return;
  edge = edge;
  var v0x = gpu_v_x[i0];
  var v0y = gpu_v_y[i0];
  var v1x = gpu_v_x[i1];
  var v1y = gpu_v_y[i1];
  var v2x = gpu_v_x[i2];
  var v2y = gpu_v_y[i2];
  var v0tx = gpu_v_tx[i0];
  var v0ty = gpu_v_ty[i0];
  var v1tx = gpu_v_tx[i1];
  var v1ty = gpu_v_ty[i1];
  var v2tx = gpu_v_tx[i2];
  var v2ty = gpu_v_ty[i2];
  var mod = gpu_v_c[0];
  var tpx = (gpu_draw_texp & 15) << 6;
  var tpy = (gpu_draw_texp & 16) << 4;
  var clutx = (gpu_draw_clut & 63) << 4;
  var cluty = (gpu_draw_clut >>> 6) & 511;
  var depth = (gpu_draw_texp >>> 7) & 3;
  var transp = (gpu_draw_attrib & 2) != 0;
  var ax = v0x;
  var ay = v0y;
  var atx = v0tx;
  var aty = v0ty;
  var bx;
  var by;
  var btx;
  var bty;
  var cx;
  var cy;
  var ctx;
  var cty;
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
  var xmin = Math.min(ax, bx, cx);
  var ymin = Math.min(ay, by, cy);
  var xmax = Math.max(ax, bx, cx);
  var ymax = Math.max(ay, by, cy);
  if (xmax - xmin > 2048 || ymax - ymin > 1024) return;
  var area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (!area) return;
  var y = ymin;
  while (y < ymax) {
    var x = xmin;
    while (x < xmax) {
      var in_clip = x >= gpu_draw_x1 && x <= gpu_draw_x2 && y >= gpu_draw_y1 && y <= gpu_draw_y2;
      if (in_clip) {
        var px = x;
        var py = y;
        var z0 = (cx - bx) * (py - by) - (cy - by) * (px - bx);
        if (!(z0 < 0 || (z0 == 0 && (cy > by || (cy == by && cx < bx))))) {
          var z1 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
          if (!(z1 < 0 || (z1 == 0 && (ay > cy || (ay == cy && ax < cx))))) {
            var z2 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
            if (!(z2 < 0 || (z2 == 0 && (by > ay || (by == ay && bx < ax))))) {
              var color = 0;
              var pixel_transp = transp;
              var drawPx = 1;
              if (gpu_draw_attrib & 4) {
                var tx = trunc((z0 * atx + z1 * btx + z2 * ctx) / area);
                var ty = trunc((z0 * aty + z1 * bty + z2 * cty) / area);
                var texel = gpu_fetch_texel(tx, ty, tpx, tpy, clutx, cluty, depth);
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
  if (0) return;
  var width = 0;
  var height = 0;
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
  var textured = (gpu_draw_attrib & 4) != 0;
  var transp = (gpu_draw_attrib & 2) != 0;
  var clutx = (gpu_draw_clut & 63) << 4;
  var cluty = (gpu_draw_clut >>> 6) & 511;
  var x0 = gpu_rect_x + gpu_off_x;
  var y0 = gpu_rect_y + gpu_off_y;
  x0 = s16(s16(x0) << 5) >> 5;
  y0 = s16(s16(y0) << 5) >> 5;
  var xmax = x0 + width;
  var ymax = y0 + height;
  xmax = xmax <= -1024 ? -1024 : xmax >= 1024 ? 1024 : xmax;
  ymax = ymax <= -1024 ? -1024 : ymax >= 1024 ? 1024 : ymax;
  x0 = x0 <= -1024 ? -1024 : x0 >= 1024 ? 1024 : x0;
  y0 = y0 <= -1024 ? -1024 : y0 >= 1024 ? 1024 : y0;
  var xc = 0;
  var yc = 0;
  var y = y0;
  while (y < ymax) {
    var x = x0;
    xc = 0;
    while (x < xmax) {
      var bc = x >= gpu_draw_x1 && x <= gpu_draw_x2 && y >= gpu_draw_y1 && y <= gpu_draw_y2;
      if (bc) {
        var color = 0;
        var pixel_transp = transp;
        var drawPx = 1;
        if (textured) {
          var texel = gpu_fetch_texel(gpu_rect_tx + xc, gpu_rect_ty + yc, gpu_texp_x, gpu_texp_y, clutx, cluty, gpu_texp_d);
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

// --- gpu cmd ---

var GPU_POLY_ARGS = [3, 6, 4, 8, 5, 8, 7, 11];
var GPU_POLY_COLOR_OFF = [0, 0, 2, 3];
var GPU_POLY_VERT_OFF = [1, 2, 2, 3];
var GPU_POLY_TEXC_OFF = [0, 2, 0, 3];
var GPU_POLY_TEXP_OFF = [0, 4, 0, 6];

function gpu_cmd_begin_args(n) {
  gpu_state = 1;
  gpu_cmd_args_remaining = n;
}

function gpu_rect() {
  if (0) return;
  if (gpu_state === 0) {
    var size = (gpu_buf[0] >>> 27) & 3;
    var textured = (gpu_buf[0] & 0x04000000) !== 0;

    gpu_cmd_begin_args(1 + (size === 0 ? 1 : 0) + (textured ? 1 : 0));
    return;
  }

  if (gpu_state === 1) {
    if (!gpu_cmd_args_remaining) {
      gpu_draw_attrib = gpu_buf[0] >>> 24;

      textured = (gpu_draw_attrib & 4) !== 0;
      var raw = (gpu_draw_attrib & 1) !== 0;

      var size_offset = 2 + (textured ? 1 : 0);

      gpu_rect_c = gpu_buf[0] & 0xffffff;
      gpu_rect_x = s16(s16(gpu_buf[1] & 0xffff) << 5) >> 5;
      gpu_rect_y = s16(s16(gpu_buf[1] >>> 16) << 5) >> 5;
      gpu_rect_tx = gpu_buf[2] & 0xff;
      gpu_rect_ty = (gpu_buf[2] >>> 8) & 0xff;
      gpu_draw_clut = gpu_buf[2] >>> 16;
      gpu_rect_w = gpu_buf[size_offset] & 0xffff;
      gpu_rect_h = gpu_buf[size_offset] >>> 16;

      if (textured && raw) gpu_rect_c = 0x808080;

      gpu_render_rect();

      gpu_state = 0;
    }
  }
}

function gpu_poly() {
  if (0) return;
  if (gpu_state === 0) {
    var idx =
      ((gpu_buf[0] & 0x10000000) !== 0 ? 4 : 0) |
      ((gpu_buf[0] & 0x08000000) !== 0 ? 2 : 0) |
      ((gpu_buf[0] & 0x04000000) !== 0 ? 1 : 0);

    gpu_cmd_begin_args(GPU_POLY_ARGS[idx]);
    return;
  }

  if (gpu_state === 1) {
    if (!gpu_cmd_args_remaining) {
      gpu_draw_attrib = gpu_buf[0] >>> 24;

      var layout =
        ((gpu_draw_attrib & 0x10) !== 0 ? 2 : 0) | ((gpu_draw_attrib & 4) !== 0 ? 1 : 0);
      var color_offset = GPU_POLY_COLOR_OFF[layout];
      var vert_offset = GPU_POLY_VERT_OFF[layout];
      var texc_offset = GPU_POLY_TEXC_OFF[layout];
      var texp_offset = GPU_POLY_TEXP_OFF[layout];

      gpu_draw_clut = gpu_buf[2] >>> 16;
      gpu_draw_texp = gpu_buf[texp_offset] >>> 16;

      gpu_v_c[0] = gpu_buf[0 + 0 * color_offset] & 0xffffff;
      gpu_v_c[1] = gpu_buf[0 + 1 * color_offset] & 0xffffff;
      gpu_v_c[2] = gpu_buf[0 + 2 * color_offset] & 0xffffff;
      gpu_v_c[3] = gpu_buf[0 + 3 * color_offset] & 0xffffff;
      gpu_v_x[0] = s16(s16(gpu_buf[1 + 0 * vert_offset] & 0xffff) << 5) >> 5;
      gpu_v_x[1] = s16(s16(gpu_buf[1 + 1 * vert_offset] & 0xffff) << 5) >> 5;
      gpu_v_x[2] = s16(s16(gpu_buf[1 + 2 * vert_offset] & 0xffff) << 5) >> 5;
      gpu_v_x[3] = s16(s16(gpu_buf[1 + 3 * vert_offset] & 0xffff) << 5) >> 5;
      gpu_v_y[0] = s16(s16(gpu_buf[1 + 0 * vert_offset] >>> 16) << 5) >> 5;
      gpu_v_y[1] = s16(s16(gpu_buf[1 + 1 * vert_offset] >>> 16) << 5) >> 5;
      gpu_v_y[2] = s16(s16(gpu_buf[1 + 2 * vert_offset] >>> 16) << 5) >> 5;
      gpu_v_y[3] = s16(s16(gpu_buf[1 + 3 * vert_offset] >>> 16) << 5) >> 5;
      gpu_v_tx[0] = gpu_buf[2 + 0 * texc_offset] & 0xff;
      gpu_v_tx[1] = gpu_buf[2 + 1 * texc_offset] & 0xff;
      gpu_v_tx[2] = gpu_buf[2 + 2 * texc_offset] & 0xff;
      gpu_v_tx[3] = gpu_buf[2 + 3 * texc_offset] & 0xff;
      gpu_v_ty[0] = (gpu_buf[2 + 0 * texc_offset] >>> 8) & 0xff;
      gpu_v_ty[1] = (gpu_buf[2 + 1 * texc_offset] >>> 8) & 0xff;
      gpu_v_ty[2] = (gpu_buf[2 + 2 * texc_offset] >>> 8) & 0xff;
      gpu_v_ty[3] = (gpu_buf[2 + 3 * texc_offset] >>> 8) & 0xff;

      if (gpu_draw_attrib & 4) {
        var ymin =
          Math.min(gpu_v_y[0], gpu_v_y[1], gpu_v_y[2], gpu_v_y[3]) + gpu_off_y;
        if (!gpu_dbg_tex_ymin || ymin < gpu_dbg_tex_ymin) gpu_dbg_tex_ymin = ymin;
        gpu_dbg_tex_count = (gpu_dbg_tex_count || 0) + 1;
      }

      if (gpu_draw_attrib & 8) {
        gpu_render_triangle(0, 1, 2, 1);
        gpu_render_triangle(1, 2, 3, 1);
      } else {
        gpu_render_triangle(0, 1, 2, 0);
      }

      gpu_state = 0;
    }
  }
}

function gpu_draw_line() {
  if (0) return;
  if (gpu_state === 0) {
    var shaded = (gpu_buf[0] & 0x10000000) !== 0;
    var polyline = (gpu_buf[0] & 0x08000000) !== 0;

    gpu_cmd_begin_args(polyline ? -1 : shaded ? 3 : 2);
    return;
  }

  if (gpu_state === 1) {
    if (gpu_buf[0] & 0x08000000) {
      if ((gpu_buf[gpu_buf_index - 1] & 0xf000f000) === 0x50005000) {
        gpu_state = 0;
      }
    } else if (!gpu_cmd_args_remaining) {
      var end = gpu_buf[0] & 0x10000000 ? 3 : 2;
      var lx0 = gpu_buf[1] & 0xffff;
      var ly0 = gpu_buf[1] >>> 16;
      var lx1 = gpu_buf[end] & 0xffff;
      var ly1 = gpu_buf[end] >>> 16;
      var rgb = gpu_buf[0] & 0xffffff;

      gpu_render_flat_line(
        lx0,
        ly0,
        lx1,
        ly1,
        ((rgb & 0x0000f8) >>> 3) | ((rgb & 0x00f800) >>> 6) | ((rgb & 0xf80000) >>> 9));

      gpu_state = 0;
    }
  }
}

function gpu_xfer_load_begin() {
  gpu_xpos = gpu_buf[1] & 0x3ff;
  gpu_ypos = (gpu_buf[1] >>> 16) & 0x1ff;
  gpu_xsiz = gpu_buf[2] & 0xffff;
  gpu_ysiz = gpu_buf[2] >>> 16;
  gpu_xsiz = ((gpu_xsiz - 1) & 0x3ff) + 1;
  gpu_ysiz = ((gpu_ysiz - 1) & 0x1ff) + 1;
  gpu_tsiz = ((gpu_xsiz * gpu_ysiz) + 1) & 0xfffffffe;
  gpu_addr = gpu_xpos + gpu_ypos * 1024;
  gpu_xcnt = 0;
  gpu_ycnt = 0;
}

function gpu_xfer_load_pixel() {
  if (0) return;
  var xpos = (gpu_xpos + gpu_xcnt) & 0x3ff;
  var ypos = (gpu_ypos + gpu_ycnt) & 0x1ff;

  vram[xpos + ypos * 1024] = gpu_recv_data & 0xffff;

  ++gpu_xcnt;

  xpos = (gpu_xpos + gpu_xcnt) & 0x3ff;
  ypos = (gpu_ypos + gpu_ycnt) & 0x1ff;

  if (gpu_xcnt === gpu_xsiz) {
    ++gpu_ycnt;
    gpu_xcnt = 0;

    ypos = (gpu_ypos + gpu_ycnt) & 0x1ff;
    xpos = (gpu_xpos + gpu_xcnt) & 0x3ff;
  }

  vram[xpos + ypos * 1024] = gpu_recv_data >>> 16;

  ++gpu_xcnt;

  if (gpu_xcnt === gpu_xsiz) {
    ++gpu_ycnt;
    gpu_xcnt = 0;
  }

  gpu_tsiz -= 2;

  if (!gpu_tsiz) {
    gpu_xcnt = 0;
    gpu_ycnt = 0;
    gpu_state = 0;
  }
}

function gpu_cmd_xfer() {
  if (0) return;
  var op = (gpu_buf[0] >>> 24) & 0xff;

  switch (gpu_state) {
    case 0:
      gpu_cmd_begin_args(op === 0x80 ? 3 : 2);
      break;

    case 1:
      if (!gpu_cmd_args_remaining) {
      switch (op) {
        case 0x02: {
          var x0 = (gpu_buf[1] & 0xffff) & 0x3f0;
          var y0 = (gpu_buf[1] >>> 16) & 0x1ff;
          var w = ((gpu_buf[2] & 0x3ff) + 0x0f) & 0xfffffff0;
          var h = (gpu_buf[2] >>> 16) & 0x1ff;
          var rgb = gpu_buf[0] & 0xffffff;
          var color =
            ((rgb & 0x0000f8) >>> 3) |
            ((rgb & 0x00f800) >>> 6) |
            ((rgb & 0xf80000) >>> 9);

          for (var y = y0; y < y0 + h; y++) {
            for (var x = x0; x < x0 + w; x++) {
              if (x < 1024 && y < 512 && x >= 0 && y >= 0) gpu_put_pixel(x, y, color);
            }
          }

          gpu_state = 0;
          break;
        }

        case 0x80: {
          var srcx = gpu_buf[1] & 0xffff;
          var srcy = gpu_buf[1] >>> 16;
          var dstx = gpu_buf[2] & 0xffff;
          var dsty = gpu_buf[2] >>> 16;
          var xsiz = gpu_buf[3] & 0xffff;
          var ysiz = gpu_buf[3] >>> 16;

          for (y = 0; y < ysiz; y++) {
            for (x = 0; x < xsiz; x++) {
              var dstb = dstx + x < 1024 && dsty + y < 512;
              var srcb = srcx + x < 1024 && srcy + y < 512;

              if (dstb && srcb) {
                vram[dstx + x + (dsty + y) * 1024] =
                  vram[srcx + x + (srcy + y) * 1024];
              }
            }
          }

          gpu_state = 0;
          break;
        }

        case 0xc0: {
          gpu_c0_xcnt = 0;
          gpu_c0_ycnt = 0;
          var c0_xpos = gpu_buf[1] & 0xffff;
          var c0_ypos = gpu_buf[1] >>> 16;
          gpu_c0_xsiz = gpu_buf[2] & 0xffff;
          gpu_c0_ysiz = gpu_buf[2] >>> 16;
          c0_xpos = c0_xpos & 0x3ff;
          c0_ypos = c0_ypos & 0x1ff;
          gpu_c0_xsiz = ((gpu_c0_xsiz - 1) & 0x3ff) + 1;
          gpu_c0_ysiz = ((gpu_c0_ysiz - 1) & 0x1ff) + 1;
          gpu_c0_tsiz = ((gpu_c0_xsiz * gpu_c0_ysiz) + 1) & 0xfffffffe;
          gpu_c0_addr = c0_xpos + c0_ypos * 1024;

          gpu_state = 0;
          break;
        }

        case 0xa0:
          gpu_state = 2;
          gpu_xfer_load_begin();
          break;
      }
      }
      break;

    case 2:
      if (op === 0xa0) gpu_xfer_load_pixel();
      break;
  }
}

function psx_gpu_update_cmd() {
  if (0) return;
  var type = (gpu_buf[0] >>> 29) & 7;

  switch (type) {
    case 1:
      gpu_poly();
      return;
    case 2:
      gpu_draw_line();
      return;
    case 3:
      gpu_rect();
      return;
  }

  switch (gpu_buf[0] >>> 24) {
    case 0x00:
      break;
    case 0x01:
      break;
    case 0x02:
    case 0x80:
    case 0xa0:
    case 0xc0:
      gpu_cmd_xfer();
      break;
    case 0xe1:
      gpu_gpustat = u32((gpu_gpustat & 0xfffff800) | (gpu_buf[0] & 0x7ff));
      gpu_texp_x = (gpu_gpustat & 0xf) << 6;
      gpu_texp_y = (gpu_gpustat & 0x10) << 4;
      gpu_texp_d = (gpu_gpustat >>> 7) & 0x3;
      break;
    case 0xe2:
      gpu_texw_mx = ((gpu_buf[0] >>> 0) & 0x1f) << 3;
      gpu_texw_my = ((gpu_buf[0] >>> 5) & 0x1f) << 3;
      gpu_texw_ox = ((gpu_buf[0] >>> 10) & 0x1f) << 3;
      gpu_texw_oy = ((gpu_buf[0] >>> 15) & 0x1f) << 3;
      break;
    case 0xe3:
      gpu_draw_x1 = (gpu_buf[0] >>> 0) & 0x3ff;
      gpu_draw_y1 = (gpu_buf[0] >>> 10) & 0x1ff;
      break;
    case 0xe4:
      gpu_draw_x2 = (gpu_buf[0] >>> 0) & 0x3ff;
      gpu_draw_y2 = (gpu_buf[0] >>> 10) & 0x1ff;
      break;
    case 0xe5:
      gpu_off_x = sign_extend((gpu_buf[0] >>> 0) & 0x7ff, 11);
      gpu_off_y = sign_extend((gpu_buf[0] >>> 11) & 0x7ff, 11);
      break;
    case 0xe6:
      break;
  }
}

// --- gpu ---


function psxe_gpu_vblank() {
  if (gpu_dbg_vb >= 580 && gpu_dbg_vb <= 930 && gpu_dbg_tex_count) {
  }
  gpu_dbg_tex_count = 0;
  gpu_dbg_tex_ymin = 0;
  gpu_dbg_vb = (gpu_dbg_vb || 0) + 1;

  needRender = 1;
  timer_vblank = 1;
  timer_blank_sync(1, 1);
}

function psxe_gpu_hblank() {
  if (gpu_line < 240) {
    if (gpu_line & 1) {
      gpu_gpustat |= 1 << 31;
    } else {
      gpu_gpustat &= ~(1 << 31);
    }
  } else {
    gpu_gpustat &= ~(1 << 31);
  }

  gpu_line++;

  if (gpu_line === 240) {
    psxe_gpu_vblank();
    psx_ic_irq(0x1);
  } else if (gpu_line === 263) {
    timer_vblank = 0;
    timer_blank_sync(1, 0);
    gpu_line = 0;
  }
}

function psx_gpu_init() {
  gpu_draw_x1 = 0;
  gpu_draw_y1 = 0;
  gpu_draw_x2 = 1023;
  gpu_draw_y2 = 511;
  gpu_off_x = 0;
  gpu_off_y = 0;
  gpu_state = 0;
  gpu_gpustat = 0x800000;
  gpu_display_mode = 1;
}

function psx_gpu_update(cyc) {
  if (0) return;
  var prev_hblank = gpu_cycles >= 2560 && gpu_cycles <= 3413;

  gpu_cycles += trunc((cyc * 53693175) / 33868800);

  var curr_hblank = gpu_cycles >= 2560 && gpu_cycles <= 3413;

  if (curr_hblank && !prev_hblank) {
    psxe_gpu_hblank();
  } else if (prev_hblank && !curr_hblank) {
    timer_hblank = 0;
    timer_blank_sync(0, 0);
    gpu_cycles -= 3413;
  }
}


function bus_gpu(write, offset, value, width) {
  if (0) return;
  g_bus_access_cycles = 0;
  if (write) {
    if (width === 32) {
      switch (offset) {
        case 0x00:
          switch (gpu_state) {
            case 0:
              gpu_buf_index = 0;
              gpu_buf[gpu_buf_index++] = u32(value);
              psx_gpu_update_cmd();
              break;
            case 1:
              gpu_buf[gpu_buf_index++] = u32(value);
              gpu_cmd_args_remaining--;
              psx_gpu_update_cmd();
              break;
            case 2:
              gpu_recv_data = u32(value);
              psx_gpu_update_cmd();
              break;
          }
          break;
        case 0x04: {
          var cmd = value >>> 24;

          switch (cmd) {
            case 0x03:
              gpu_gpustat = u32((gpu_gpustat & ~0x00800000) | ((value << 23) & 0x00800000));
              break;
            case 0x05:
              gpu_disp_x = value & 0x3ff;
              gpu_disp_y = (value >>> 10) & 0x1ff;
              break;
            case 0x06:
              gpu_disp_x1 = value & 0xfff;
              gpu_disp_x2 = (value >>> 12) & 0xfff;
              break;
            case 0x07:
              gpu_disp_y1 = value & 0x1ff;
              gpu_disp_y2 = (value >>> 10) & 0x1ff;
              break;
            case 0x08:
              gpu_display_mode = value & 0xffffff;
              
              break;
            case 0x10:
              gpu_gp1_10h_req = value & 7;
              break;
          }
          break;
        }
      }
    }
    return 0;
  }

  if (width === 32) {
    switch (offset) {
      case 0x00: {
        var data = 0;

        if (gpu_c0_tsiz) {
          data |= vram[gpu_c0_addr + (gpu_c0_xcnt + gpu_c0_ycnt * 1024)];
          gpu_c0_xcnt += 1;

          if (gpu_c0_xcnt === gpu_c0_xsiz) {
            gpu_c0_ycnt += 1;
            gpu_c0_xcnt = 0;
          }

          data |= vram[gpu_c0_addr + (gpu_c0_xcnt + gpu_c0_ycnt * 1024)] << 16;
          gpu_c0_xcnt += 1;

          if (gpu_c0_xcnt === gpu_c0_xsiz) {
            gpu_c0_ycnt += 1;
            gpu_c0_xcnt = 0;
          }

          gpu_c0_tsiz -= 2;
        }

        if (gpu_gp1_10h_req) {
          switch (gpu_gp1_10h_req & 7) {
            case 2:
              data =
                ((gpu_texw_oy / 8) << 15) |
                ((gpu_texw_ox / 8) << 10) |
                ((gpu_texw_my / 8) << 5) |
                gpu_texw_mx / 8;
              break;
            case 3:
              data = (gpu_draw_y1 << 10) | gpu_draw_x1;
              break;
            case 4:
              data = (gpu_draw_y2 << 10) | gpu_draw_x2;
              break;
            case 5:
              data = (gpu_off_y << 10) | gpu_off_x;
              break;
          }

          gpu_gp1_10h_req = 0;
        }

        return data;
      }
      case 0x04:
        return u32(gpu_gpustat | 0x1c000000);
    }
  }

  return 0;
}

// --- cdrom core ---

function cdrom_cmd_nparams(cmd) {
  switch (cmd) {
    case 0x01:
    case 0x06:
    case 0x09:
    case 0x0a:
    case 0x0c:
    case 0x10:
    case 0x13:
    case 0x15:
    case 0x1a:
    case 0x1b:
    case 0x1c:
      return 0;
    case 0x02:
      return 3;
    case 0x0d:
      return 2;
    case 0x0e:
    case 0x14:
    case 0x19:
      return 1;
    default:
      return 0xff;
  }
}

function cdrom_cmd_no_disc_ok(cmd) {
  switch (cmd) {
    case 0x01:
    case 0x0a:
    case 0x0e:
    case 0x19:
    case 0x1a:
    case 0x1c:
      return 1;
    default:
      return 0;
  }
}

function cdrom_cmd_write_delay(cmd) {
  if (cmd === 0x0a) return 81102;
  return 0;
}

function cdrom_param_push(value) {
  if (cdrom_param_wr < 32) cdrom_param_buf[cdrom_param_wr++] = u8(value);
}

function cdrom_param_pop() {
  if (0) return;
  if (cdrom_param_rd === cdrom_param_wr) return 0;

  var data = cdrom_param_buf[cdrom_param_rd++];

  if (cdrom_param_rd === cdrom_param_wr) cdrom_param_rd = cdrom_param_wr = 0;

  return data;
}

function cdrom_resp_push(value) {
  if (cdrom_resp_wr < 32) cdrom_resp_buf[cdrom_resp_wr++] = u8(value);
}

function cdrom_resp_pop() {
  if (0) return;
  if (cdrom_resp_rd === cdrom_resp_wr) return 0;

  var data = cdrom_resp_buf[cdrom_resp_rd++];

  if (cdrom_resp_rd === cdrom_resp_wr) cdrom_resp_rd = cdrom_resp_wr = 0;

  return data;
}

function cdrom_data_pop() {
  if (0) return;
  if (cdrom_data_rd === cdrom_data_wr) return 0;

  var data = cdrom_data_buf[cdrom_data_rd++];

  if (cdrom_data_rd === cdrom_data_wr) cdrom_data_rd = cdrom_data_wr = 0;

  return data;
}

function cdrom_get_stat() {
  return (
    (cdrom_read_ongoing ? 0x20 : 0) |
    (cdrom_mode & 0x10 ? 0x08 : 0) |
    (!cdrom_disc_open ? 0x10 : 0) |
    0x02
  );
}

function cdrom_pause() {
  cdrom_prev_state = 0x0;
  cdrom_state = 0x0;
  cdrom_pending_command = 0;
  cdrom_busy = 0;
  cdrom_xa_playing = 0;
  cdrom_read_ongoing = 0;
}

function cdrom_restore_state() {
  cdrom_state = 0x0;

  if (cdrom_prev_state === 0x3) cdrom_state = cdrom_prev_state;

  cdrom_pending_command = 0;
}

function cdrom_set_int(n) {
  cdrom_ifr = n;
}

function cdrom_push_stat3() {
  cdrom_set_int(3);
  cdrom_resp_push(cdrom_get_stat());
}

function cdrom_tx1_to_resp2(delay) {
  cdrom_push_stat3();
  cdrom_delay = delay;
  cdrom_state = 0x2;
}

function cdrom_process_setloc() {
  if (!cdrom_pending_lba) return;

  cdrom_lba = cdrom_pending_lba;
  cdrom_pending_lba = 0;
}

function cdrom_get_read_delay() {
  return cdrom_mode & 0x80 ? 225792 : 451584;
}

function cdrom_get_pause_delay() {
  if (!cdrom_read_ongoing) return 7000;

  return 33869 * (cdrom_mode & 0x80 ? 35 : 70);
}

function cdrom_get_seek_delay(ts) {
  if (0) return;
  var delay = cdrom_pending_speed_switch_delay;

  cdrom_pending_speed_switch_delay = 0;

  if (ts === 0) delay = 650 * 33869;
  if (ts === 2) delay = 4000 * 33869;

  return delay;
}

function cdrom_error(stat, err) {
  cdrom_ifr = 5;

  cdrom_param_rd = cdrom_param_wr = 0;
  cdrom_resp_rd = cdrom_resp_wr = 0;

  if (stat & 0x08 || stat & 0x04) {
    cdrom_resp_push(stat);
  } else {
    cdrom_resp_push(0x01 | stat);
  }

  cdrom_resp_push(err);

  cdrom_prev_state = 0x0;
  cdrom_state = 0x0;
  cdrom_pending_command = 0;
  cdrom_busy = 0;
}

function cdrom_write_cmd(data) {
  cdrom_prev_state = cdrom_state;
  cdrom_state = 0x1;

  cdrom_pending_command = u8(data);

  cdrom_delay = cdrom_cmd_write_delay(cdrom_pending_command);
  if (!cdrom_delay) cdrom_delay = 50401;

  if (cdrom_state === 0x3) cdrom_busy = 1;
}


// --- cdrom cmd ---

function cd_delay_start_read(ts) {
  return cdrom_get_read_delay() + cdrom_get_seek_delay(ts);
}

function cd_delay_ongoing_read() {
  return cdrom_get_read_delay() + 33869 * 4;
}

function cdrom_exec_cmd() {
  if (0) return;
  switch (cdrom_pending_command) {
    case 0x01:
      cdrom_push_stat3();
      cdrom_restore_state();
      break;

    case 0x02: {
      var m = cdrom_param_pop();
      var s = cdrom_param_pop();
      var f = cdrom_param_pop();

      if (
        !((m & 0xf0) <= 0x90 &&
        (m & 0xf) <= 9 &&
        (s & 0xf0) <= 0x90 &&
        (s & 0xf) <= 9 &&
        (f & 0xf0) <= 0x90 &&
        (f & 0xf) <= 9 &&
        f < 0x75 &&
        s < 0x60)
      ) {
        cdrom_error(0x02, 0x10);
        return;
      }

      cdrom_push_stat3();
      cdrom_pending_lba =
        BTOI_TABLE[m] * 4500 + BTOI_TABLE[s] * 75 + BTOI_TABLE[f];
      cdrom_restore_state();
      break;
    }

    case 0x06:
    case 0x1b: {
      cdrom_push_stat3();
      cdrom_process_setloc();
      var ts = psx_disc_read_data(cdrom_lba);

      if (cdrom_mode & 0x40) {
        cdrom_xa_playing = 1;
        cdrom_xa_remaining_samples = 0;
        cdrom_xa_lba = cdrom_lba;
      }

      cdrom_state = 0x3;
      cdrom_prev_state = 0x3;
      cdrom_delay = cd_delay_start_read(ts);
      cdrom_read_ongoing = 1;
      break;
    }

    case 0x09:
      if (cdrom_state === 0x1) {
        cdrom_tx1_to_resp2(cdrom_get_pause_delay());
      } else {
        cdrom_set_int(2);
        cdrom_resp_push(0x02);
        cdrom_pause();
      }
      break;

    case 0x0a:
      if (cdrom_state === 0x1) {
        cdrom_tx1_to_resp2(33869);
      } else {
        cdrom_set_int(2);
        cdrom_resp_push(cdrom_get_stat());
        cdrom_pause();
      }
      break;

    case 0x0c:
      cdrom_push_stat3();
      cdrom_restore_state();
      break;

    case 0x0d:
      cdrom_push_stat3();
      cdrom_xa_file = cdrom_param_pop();
      cdrom_xa_channel = cdrom_param_pop();
      cdrom_restore_state();
      break;

    case 0x0e: {
      var prev_speed = cdrom_mode & 0x80;

      cdrom_push_stat3();
      cdrom_mode = cdrom_param_pop();

      if (prev_speed !== (cdrom_mode & 0x80)) {
        cdrom_pending_speed_switch_delay = 650 * 33869;
      }

      cdrom_pause();
      break;
    }

    case 0x10:
      cdrom_set_int(3);
      cdrom_resp_push(cdrom_data_buf[0x0c]);
      cdrom_resp_push(cdrom_data_buf[0x0d]);
      cdrom_resp_push(cdrom_data_buf[0x0e]);
      cdrom_resp_push(cdrom_data_buf[0x0f]);
      cdrom_resp_push(cdrom_data_buf[0x10]);
      cdrom_resp_push(cdrom_data_buf[0x11]);
      cdrom_resp_push(cdrom_data_buf[0x12]);
      cdrom_resp_push(cdrom_data_buf[0x13]);
      cdrom_restore_state();
      break;

    case 0x13:
      cdrom_push_stat3();
      cdrom_resp_push(1);
      cdrom_resp_push(ITOB_TABLE[GT2_TRACK_COUNT]);
      cdrom_restore_state();
      break;

    case 0x14: {
      var bcd = cdrom_param_pop();

      if (!((bcd & 0xf0) <= 0x90 && (bcd & 0xf) <= 9)) {
        cdrom_error(0x02, 0x10);
        return;
      }

      var track = BTOI_TABLE[bcd];
      f = psx_disc_get_track_lba(track);

      if (f === 0) {
        cdrom_error(0x02, 0x10);
        return;
      }

      var mm = trunc(f / (60 * 75));
      var ss = trunc((f % (60 * 75)) / 75);
      cdrom_push_stat3();
      cdrom_resp_push(ITOB_TABLE[mm]);
      cdrom_resp_push(ITOB_TABLE[ss]);
      cdrom_restore_state();
      break;
    }

    case 0x15:
      if (cdrom_state === 0x1) {
        cdrom_tx1_to_resp2(33869);
      } else {
        ts = psx_disc_query(cdrom_pending_lba);

        if (ts === 0) {
          cdrom_error(0x02 | 0x04, 0x10);
          return;
        }

        if (ts === 2) {
          cdrom_error(0x02 | 0x04, 0x04);
          return;
        }

        cdrom_process_setloc();
        cdrom_set_int(2);
        cdrom_resp_push(cdrom_get_stat());
        cdrom_restore_state();
      }
      break;

    case 0x19: {
      var subf = cdrom_param_pop();

      if (subf === 4) {
        cdrom_set_int(3);
        cdrom_resp_push(0x02);
        cdrom_restore_state();
        return;
      }

      if (subf === 5) {
        cdrom_set_int(3);
        cdrom_resp_push(0);
        cdrom_resp_push(0);
        cdrom_restore_state();
        return;
      }

      if (subf !== 32) {
        cdrom_error(0x02, 0x10);
        return;
      }

      cdrom_set_int(3);
      cdrom_resp_push(0x94);
      cdrom_resp_push(0x09);
      cdrom_resp_push(0x19);
      cdrom_resp_push(0xc0);
      cdrom_restore_state();
      break;
    }

    case 0x1a:
      if (cdrom_state === 0x1) {
        cdrom_push_stat3();
        cdrom_state = 0x2;
        cdrom_delay = 50401;
      } else {
        var t = cdrom_disc_type * 4;

        cdrom_set_int(2);
        cdrom_resp_push(CDROM_CD_GETID[t + 0]);
        cdrom_resp_push(CDROM_CD_GETID[t + 1]);
        cdrom_resp_push(CDROM_CD_GETID[t + 2]);
        cdrom_resp_push(CDROM_CD_GETID[t + 3]);

        if (cdrom_disc_type === 1) {
          cdrom_resp_push(83);
          cdrom_resp_push(67);
          cdrom_resp_push(69);
          cdrom_resp_push(65);
        } else {
          cdrom_resp_push(0);
          cdrom_resp_push(0);
          cdrom_resp_push(0);
          cdrom_resp_push(0);
        }

        cdrom_restore_state();
      }
      break;

    case 0x1c:
      break;

    default:
      cdrom_error(0x02, 0x40);
      break;
  }
}

function cdrom_handle_resp1() {
  if (0) return;
  var cmd = cdrom_pending_command;
  var n = cdrom_param_wr - cdrom_param_rd;
  var expect = cdrom_cmd_nparams(cmd);

  cdrom_busy = 0;

  if (!cdrom_disc_open && !cdrom_cmd_no_disc_ok(cmd)) {
    cdrom_error(0x10, 0x80);
    return;
  }

  if (expect === 0xff) {
    cdrom_error(0x02, 0x40);
    return;
  }

  if (n !== expect) {
    cdrom_error(0x02, 0x20);
    return;
  }

  cdrom_exec_cmd();
}


// --- cdrom read ---

function cdrom_handle_read() {
  if (0) return;
  cdrom_process_setloc();

  var ts = psx_disc_query(cdrom_lba);

  if (ts === 0) {
    cdrom_error(0x02 | 0x04, 0x10);
    return;
  }

  if (ts === 2) {
    cdrom_error(0x02 | 0x04, 0x04);
    return;
  }

  cdrom_set_int(1);
  cdrom_resp_push(cdrom_get_stat());

  psx_disc_read_data(cdrom_lba);

  var size_bit = cdrom_mode & 0x20;

  cdrom_data_rd = size_bit ? 12 : 24;
  cdrom_data_wr = size_bit ? 0x924 : 0x800;
  cdrom_data_wr += cdrom_data_rd;

  cdrom_pending_lba = cdrom_lba + 1;
  cdrom_delay = cdrom_get_read_delay();
}

function psx_cdrom_update(cycles) {
  if (cdrom_delay > 0) {
    cdrom_delay -= cycles;

    if (cdrom_delay > 0) return;
  }

  cdrom_delay = 0;

  if (cdrom_state === 0x0) return;

  if (cdrom_ifr & 0x1f) {
    cdrom_delay = 2;
    return;
  }

  switch (cdrom_state) {
    case 0x1: {
      cdrom_handle_resp1();

      if (cdrom_state === 0x3) {
        cdrom_process_setloc();

        cdrom_state = 0x3;
        cdrom_prev_state = 0x3;
        cdrom_delay = cd_delay_ongoing_read();
      }
      break;
    }

    case 0x2: {
      cdrom_exec_cmd();

      if (cdrom_state === 0x3) {
        cdrom_process_setloc();

        cdrom_state = 0x3;
        cdrom_prev_state = 0x3;
        cdrom_delay = cd_delay_ongoing_read();
      }
      break;
    }

    case 0x3: {
      cdrom_handle_read();
      break;
    }
  }

  if ((cdrom_ifr & cdrom_ier) === 0) return;

  psx_ic_irq(0x4);
}

function cdrom_read_status() {
  if (0) return;
  var data_empty = cdrom_data_rd === cdrom_data_wr || !cdrom_data_req;

  return (
    (cdrom_index << 0) |
    (cdrom_xa_playing << 2) |
    ((cdrom_param_rd === cdrom_param_wr) << 3) |
    ((cdrom_param_wr !== 32) << 4) |
    ((cdrom_resp_rd !== cdrom_resp_wr) << 5) |
    ((!data_empty) << 6) |
    (cdrom_busy << 7)
  );
}

function cdrom_read_data() {
  if (!cdrom_data_req) return 0;

  return cdrom_data_pop();
}

function psx_cdrom_read8(addr) {
  switch (addr) {
    case 0:
      return cdrom_read_status();
    case 1:
      return cdrom_resp_pop();
    case 2:
      return cdrom_read_data();
    case 3:
      return (cdrom_index & 1) ? 0xe0 | cdrom_ifr : cdrom_ier;
  }

  return 0;
}

function bus_cdrom(write, offset, value, width) {
  if (0) return;
  g_bus_access_cycles = 0;

  if (write) {
    if (width === 8) {
      var reg = (cdrom_index << 2) | offset;
      switch (reg) {
        case 0:
        case 4:
        case 8:
        case 12:
          cdrom_index = u8(value) & 3;
          break;
        case 1:
          cdrom_write_cmd(value);
          break;
        case 2:
          cdrom_param_push(value);
          break;
        case 3:
          cdrom_data_req = u8(value) & 0x80;
          break;
        case 5:
        case 9:
          break;
        case 6:
          cdrom_ier = u8(value);
          break;
        case 7:
          if (value & 0x40) cdrom_param_rd = cdrom_param_wr = 0;
          cdrom_ifr &= ~(u8(value) & 0x1f);
          break;
        case 15:
          cdrom_xa_mute = u8(value) & 1;
          break;
      }
    }
    return 0;
  }

  if (width === 16) {
    return (psx_cdrom_read8(offset) << 8) | psx_cdrom_read8(offset + 1);
  }

  return psx_cdrom_read8(offset);
}

// --- cdrom audio ---

function cdrom_xa_samples_per_sector() {
  if (0) return;
  var stereo = (cdrom_xa_buf[0x13] & 1) === 1;
  var f18khz = (cdrom_xa_buf[0x13] >>> 2) & 1;

  return (stereo ? 2352 : 4704) * (f18khz + 1);
}


function cdrom_advance_xa_sample() {
  if (!cdrom_xa_playing || !(cdrom_mode & 0x40)) {
    cdrom_xa_remaining_samples = 0;
    return;
  }

  if (!cdrom_xa_remaining_samples) {
    if (!cdrom_fetch_xa_sector()) {
      cdrom_xa_playing = 0;
      cdrom_xa_remaining_samples = 0;
      return;
    }

    cdrom_xa_remaining_samples = cdrom_xa_samples_per_sector();
  }

  --cdrom_xa_remaining_samples;
}

// --- dma ---

function dma_read_global(offset) {
  if (offset === 0x70) return g_dma_dpcr;
  if (offset === 0x74) return g_dma_dicr;
  return 0;
}

function dma_write_dicr(value) {
  if (0) return;
  var ack = value & 0x7f000000;
  var flags = g_dma_dicr & 0x7f000000;

  flags &= ~ack;
  flags &= 0x7f000000;

  g_dma_dicr &= 0x80000000;
  g_dma_dicr |= flags;
  g_dma_dicr |= value & 0xffffff;
}

function psx_dma_do_mdec_in() {
  if (0) return;
  if (!(dmaReg[(0) * 3 + (2)] & 0x01000000)) return;

  var size = (dmaReg[(0) * 3 + (1)] & 0xffff) * ((dmaReg[(0) * 3 + (1)] >>> 16) & 0xffff);
  var step = dmaReg[(0) * 3 + (2)] & 0x00000002 ? -4 : 4;

  for (var i = 0; i < size; i++) {
    var data = bus_access(0, dmaReg[(0) * 3 + (0)], 0, 32);
    psx_bus_write32(0x1f801820, data);
    dmaReg[(0) * 3 + (0)] = u32(dmaReg[(0) * 3 + (0)] + step);
  }

  g_dma_mdec_in_irq_delay = size;
  dmaReg[(0) * 3 + (2)] = 0;
  dmaReg[(0) * 3 + (1)] = 0;
}

function psx_dma_do_mdec_out() {
  if (0) return;
  if (!(dmaReg[(1) * 3 + (2)] & 0x01000000)) return;

  var size = (dmaReg[(1) * 3 + (1)] & 0xffff) * ((dmaReg[(1) * 3 + (1)] >>> 16) & 0xffff);

  for (var i = 0; i < size; i++) {
    var data = bus_access(0, 0x1f801820, 0, 32);
    psx_bus_write32(dmaReg[(1) * 3 + (0)], data);
    dmaReg[(1) * 3 + (0)] = u32(
      dmaReg[(1) * 3 + (0)] + (dmaReg[(1) * 3 + (2)] & 0x00000002 ? -4 : 4));
  }

  g_dma_mdec_out_irq_delay = size;
  dmaReg[(1) * 3 + (2)] = 0;
  dmaReg[(1) * 3 + (1)] = 0;
}


function psx_dma_do_cdrom() {
  if (0) return;
  if (!(dmaReg[(3) * 3 + (2)] & 0x01000000)) return;

  var size = dmaReg[(3) * 3 + (1)] & 0xffff;
  if (!size) size = 0x10000;

  g_dma_cdrom_irq_delay = 1;

  if (!(dmaReg[(3) * 3 + (2)] & 0x00000001)) {
    for (var i = 0; i < size; i++) {
      var data = 0;
      data |= psx_bus_read8(0x1f801802) << 0;
      data |= psx_bus_read8(0x1f801802) << 8;
      data |= psx_bus_read8(0x1f801802) << 16;
      data |= psx_bus_read8(0x1f801802) << 24;
      psx_bus_write32(dmaReg[(3) * 3 + (0)], data);
      dmaReg[(3) * 3 + (0)] = u32(
        dmaReg[(3) * 3 + (0)] + (dmaReg[(3) * 3 + (2)] & 0x00000002 ? -4 : 4));
    }
  }

  dmaReg[(3) * 3 + (2)] = 0;
  dmaReg[(3) * 3 + (1)] = 0;
}

function psx_dma_do_spu() {
  if (0) return;
  if (!(dmaReg[(4) * 3 + (2)] & 0x01000000)) return;

  var size = dmaReg[(4) * 3 + (1)] & 0xffff;
  var blocks = (dmaReg[(4) * 3 + (1)] >>> 16) & 0xffff;

  g_dma_spu_irq_delay = 32;

  if (dmaReg[(4) * 3 + (2)] & 0x00000001) {
    for (var j = 0; j < blocks; j++) {
      for (var i = 0; i < size; i++) {
        var data = bus_access(0, dmaReg[(4) * 3 + (0)], 0, 32);
        psx_bus_write16(0x1f801da8, data & 0xffff);
        psx_bus_write16(0x1f801da8, data >>> 16);
        dmaReg[(4) * 3 + (0)] = u32(
          dmaReg[(4) * 3 + (0)] + (dmaReg[(4) * 3 + (2)] & 0x00000002 ? -4 : 4));
      }
    }
  } else {
    for (j = 0; j < blocks; j++) {
      for (i = 0; i < size; i++) {
        data = psx_bus_read16(0x1f801da8);
        data |= psx_bus_read16(0x1f801da8) << 16;
        psx_bus_write32(dmaReg[(4) * 3 + (0)], data);
        dmaReg[(4) * 3 + (0)] = u32(
          dmaReg[(4) * 3 + (0)] + (dmaReg[(4) * 3 + (2)] & 0x00000002 ? -4 : 4));
      }
    }
  }

  dmaReg[(4) * 3 + (2)] = 0;
  dmaReg[(4) * 3 + (1)] = 0;
}

function psx_dma_do_otc() {
  if (0) return;
  if (
    !(g_dma_dpcr & 0x08000000) ||
    !(dmaReg[(6) * 3 + (2)] & 0x10000000) ||
    !(dmaReg[(6) * 3 + (2)] & 0x01000000)
  ) {
    return;
  }

  var size = dmaReg[(6) * 3 + (1)] & 0xffff;
  if (!size) size = 0x10000;

  for (var i = size; i > 0; i--) {
    var addr = i !== 1 ? dmaReg[(6) * 3 + (0)] - 4 : 0xffffff;
    psx_bus_write32(dmaReg[(6) * 3 + (0)], addr & 0xffffff);
    dmaReg[(6) * 3 + (0)] = u32(dmaReg[(6) * 3 + (0)] - 4);
  }

  g_dma_otc_irq_delay = size;
  dmaReg[(6) * 3 + (2)] = 0;
  dmaReg[(6) * 3 + (1)] = 0;
}

function psx_dma_run_channel(channel) {
  switch (channel) {
    case 0:
      psx_dma_do_mdec_in();
      break;
    case 1:
      psx_dma_do_mdec_out();
      break;
    case 2:
      psx_dma_do_gpu();
      break;
    case 3:
      psx_dma_do_cdrom();
      break;
    case 4:
      psx_dma_do_spu();
      break;
    case 6:
      psx_dma_do_otc();
      break;
  }
}

function psx_dma_update(_cyc) {
  if (0) return;
  if (g_dma_cdrom_irq_delay) {
    g_dma_cdrom_irq_delay = 0;
    if (g_dma_dicr & 0x00080000) g_dma_dicr |= 0x08000000;
  }

  if (g_dma_spu_irq_delay) {
    g_dma_spu_irq_delay = 0;
    if (g_dma_dicr & 0x00100000) g_dma_dicr |= 0x10000000;
  }

  if (g_dma_gpu_irq_delay) {
    g_dma_gpu_irq_delay = 0;
    if (g_dma_dicr & 0x00040000) g_dma_dicr |= 0x04000000;
  }

  if (g_dma_otc_irq_delay) {
    g_dma_otc_irq_delay = 0;
    if (g_dma_dicr & 0x00400000) g_dma_dicr |= 0x40000000;
  }

  if (g_dma_mdec_in_irq_delay) {
    g_dma_mdec_in_irq_delay--;
    if (!g_dma_mdec_in_irq_delay && g_dma_dicr & 0x00010000) {
      g_dma_dicr |= 0x01000000;
    }
  }

  if (g_dma_mdec_out_irq_delay) {
    g_dma_mdec_out_irq_delay--;
    if (!g_dma_mdec_out_irq_delay && g_dma_dicr & 0x00020000) {
      g_dma_dicr |= 0x02000000;
    }
  }

  var prev_irq_signal = (g_dma_dicr & 0x80000000) !== 0;
  var irq_on_flags = (g_dma_dicr & 0x00800000) !== 0;
  var force_irq = (g_dma_dicr & 0x00008000) !== 0;
  var irq = (g_dma_dicr & 0x7f000000) !== 0;
  var irq_signal = force_irq || (irq & irq_on_flags) !== 0;

  if (irq_signal && !prev_irq_signal) psx_ic_irq(0x8);

  g_dma_dicr &= ~0x80000000;
  g_dma_dicr |= u32(irq_signal ? 0x80000000 : 0);
}

function psx_dma_init() {
  if (0) return;
  var i = 0;
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
  if (0) return;
  if (!(dmaReg[8] & 16777216)) return;
  var step = dmaReg[8] & 2 ? -4 : 4;
  var mode = (dmaReg[8] & 1536) >>> 9;
  if (mode == 1) {
    var n = (dmaReg[7] & 65535) * ((dmaReg[7] >>> 16) & 65535);
    var i = 0;
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
    var hdr = bus_access(0, dmaReg[6], 0, 32);
    var size = hdr >>> 24;
    var addr = dmaReg[6];
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

// --- mdec ---

function mdec_input_u16(index) {
  if (0) return;
  var word = index >>> 1;
  var half = index & 1;
  var v = mdec_input[word];
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
  if (0) return;
  var i = 0;
  while (i < 64) {
    mdecIdct0[i] = mdec_blk_get(blkId, i);
    i++;
  }
  var pass = 0;
  while (pass < 2) {
    var x = 0;
    while (x < 8) {
      var y = 0;
      while (y < 8) {
        var sum = 0;
        var z = 0;
        while (z < 8) {
          var sv = pass == 0 ? mdecIdct0[y + z * 8] : mdecIdct1[y + z * 8];
          sum = sum + s32(sv) * s32(mdec_scale_table[x + z * 8] / 8);
          z++;
        }
        var outv = s16((sum + 4095) / 8192);
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
  if (0) return;
  var k = 0;
  while (k < 64) {
    mdec_blk_set(blkId, k, 0);
    k++;
  }
  k = 0;
  var n = mdec_input_u16(srcIndex);
  srcIndex++;
  while (n == 65024) {
    n = mdec_input_u16(srcIndex);
    srcIndex++;
  }
  var q_scale = (n >>> 10) & 63;
  var val = s16(s16((n & 1023) << 6) >> 6) * mdec_quant_get(qid, k);
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
  if (0) return;
  var y = 0;
  while (y < 8) {
    var x = 0;
    while (x < 8) {
      var rv = mdec_crblk[((x + xx) >> 1) + ((y + yy) >> 1) * 8];
      var bv = mdec_cbblk[((x + xx) >> 1) + ((y + yy) >> 1) * 8];
      var gv = trunc((-3437 * bv - 7143 * rv) / 10000);
      var l = mdec_yblk[x + y * 8];
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
      var pix = baseOff + ((x + xx) + (y + yy) * 16) * 3;
      mdec_output[pix] = u8(rv);
      mdec_output[pix + 1] = u8(gv);
      mdec_output[pix + 2] = u8(bv);
      x++;
    }
    y++;
  }
}

function mdec_decode_macroblock() {
  if (0) return;
  if (mdec_output_depth < 2) {
    rl_decode_block(0, 0, 0);
    var i = 0;
    while (i < 196608) {
      mdec_output[i] = 0;
      i++;
    }
    mdec_output_words_remaining = 8;
    mdec_output_empty = 0;
    mdec_output_index = 0;
  } else {
    var srcIdx = 0;
    var block_size = 768;
    var bytes_processed = 0;
    var block_count = 1;
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
  if (0) return;
  var i = 0;
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
  if (0) return;
  var i = 0;
  while (i < 64) {
    var w = mdec_input[i >>> 1];
    var h = i & 1 ? (w >>> 16) & 65535 : w & 65535;
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
  if (0) return;
  var mdec_off = offset & ~3;
  var mdec_val = write_value_as_32(value, offset, width);
  var mdec_reg = 0;
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

// --- spu ---


function spu_irq9_check(addr) {
  if (
    (spu_hw_u16(0x1aa) & 0x40) &&
    ((spu_hw_u16(0x1a4) << 3) === addr)
  ) {
    psx_ic_irq(0x200);
  }
}


function spu_key_off(value) {
  if (0) return;
  for (var i = 0; i < 24; i++) {
    if (value & (1 << i)) spu_voice_left[i] = 768 * 2;
  }
}

function spu_voice_end(v) {
  spu_hw_set_u32(0x19c, spu_hw_u32(0x19c) | (1 << v));
  spu_hw_set_u16((v * 8) + 6, 0);
  spu_voice_left[v] = 0;
  spu_irq9_check(spu_hw_u16((v * 8) + 3) << 3);
}

function spu_handle_write(offset, value) {
  if (0) return;
  switch (offset) {
    case 0x188:
    case 0x18a: {
      var high = (offset & 2) !== 0;
      if (!value) return 1;
      spu_key_on(u32(value) << (16 * high));
      return 1;
    }
    case 0x18c:
    case 0x18e: {
      high = (offset & 2) !== 0;
      if (!value) return 1;
      spu_key_off(u32(value) << (16 * high));
      return 1;
    }
    case 0x1a6:
      spu_hw_set_u16(0x1a6, value);
      spu_hw_set_u32(0x200, u32(value) << 3);
      return 1;
    case 0x1a8: {
      spu_hw_set_u16(0x1a8, value);
      var idx = spu_hw_u16(0x244);
      spu_hw_set_u16(0x204 + idx * 2, value);
      spu_hw_set_u16(0x244, idx + 1);
      if (spu_hw_u16(0x244) === 32 && ((spu_hw_u16(0x1aa) >>> 4) & 3) === 2) {
        spu_tfifo_flush();
      }
      return 1;
    }
    case 0x1aa:
      spu_hw_set_u16(0x1aa, value);
      spu_hw_set_u16(0x1ae, u16((spu_hw_u16(0x1ae) & 0xffc0) | (value & 0x3f)));
      if ((value >>> 4) & 3) spu_tfifo_flush();
      return 1;
    case 0x1a2:
      spu_hw_set_u16(0x1a2, value);
      spu_hw_set_u32(0x246, spu_hw_u16(0x1a2) << 3);
      return 1;
  }
  return 0;
}


var sample_debt = 0;

function psx_audio_tick(cycles) {
  sample_debt = u32(sample_debt + cycles);

  while (sample_debt >= 768) {
    sample_debt -= 768;
    spu_stub_tick();
    cdrom_advance_xa_sample();
  }
}

function bus_spu(write, offset, value, width) {
  if (0) return;
  g_bus_access_cycles = 0;
  if (write) {
    if (width === 32) {
      if (spu_handle_write(offset, value)) return 0;
      spu_hw_set_u32(offset, value);
    } else if (width === 16) {
      if (spu_handle_write(offset, value)) return 0;
      if (offset !== 0x0c) spu_hw_set_u16(offset, value);
    }
    return 0;
  }

  if (width === 32) return spu_hw_u32(offset);

  if (width === 16) {
    if (offset === 0x1a8) {
      var addr = spu_hw_u32(0x200);
      var data = spuRam_load16(addr);
      spu_hw_set_u32(0x200, addr + 2);
      return data;
    }
    return spu_hw_u16(offset);
  }

  return 0;
}

function psx_spu_init() {
  spuHw_store32(412, 16777215);
  spu_hw_set_u16(0x1a4, 0xffff);
}

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
  if (0) return;
  var count = spu_hw_u16(580);
  var addr = spu_hw_u32(512);
  var i = 0;
  while (i < count) {
    var sample = spu_hw_u16(516 + i * 2);
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
  if (0) return;
  var i = 0;
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
  if (0) return;
  if (spu_hw_u16(426) & 16384) {
    spu_hw_set_u32(594, spu_hw_u32(594) ^ 1);
    spu_hw_set_u32(396, 0);
    spu_hw_set_u32(392, 0);
  }
  var v = 0;
  while (v < 24) {
    if (spu_voice_left[v]) {
      spu_voice_left[v]--;
      if (!spu_voice_left[v]) spu_voice_end(v);
    }
    v++;
  }
}

function cdrom_fetch_xa_sector() {
  if (0) return;
  xaGo = 1;
  xaRet = 0;
  while (xaGo) {
    var ts = psx_disc_read_xa(cdrom_xa_lba);
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

// --- psx ---

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

// --- frontend ---

function expand5(v) {
  v = v & 31;
  return v * 8 + Math.floor(v / 4);
}

function updateDisplaySize() {
  if (0) return;
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
    var range = gpu_disp_y2 - gpu_disp_y1;
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
  if (0) return;
  if (rgb24) {
    var base = (gpu_disp_x + sx) * 2 + (gpu_disp_y + sy) * 2048;
    var b0 = trunc(vram[Math.floor(base / 2)] / pow2((base & 1) * 8)) % 256;
    var b1off = base + 1;
    var b1 = trunc(vram[Math.floor(b1off / 2)] / pow2((b1off & 1) * 8)) % 256;
    var b2off = base + 2;
    var b2 = trunc(vram[Math.floor(b2off / 2)] / pow2((b2off & 1) * 8)) % 256;
    return b0 * 65536 + b1 * 256 + b2;
  }
  var px = vram16(gpu_disp_x + sx, gpu_disp_y + sy) & 32767;
  var r = expand5(px);
  var g = expand5(px >>> 5);
  var b = expand5(px >>> 10);
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
  if (0) return;
  if (gpu_gpustat & 8388608) return;
  updateDisplaySize();
  var i = 0;
  while (i < gfxLen) {
    var gx = i % gfxW;
    var gy = Math.floor(i / gfxW);
    var color = pixelColor(gx * pixelStep, gy * pixelStep);
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
  console.log("boot biosWords", bios.length, "bios0", bios[0], "pc", cpu_pc, "next", cpu_next_pc, "sr", cpu_cop0_r[12]);
}

function runSlice() {
  if (0) return;
  var n = 0;
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
  console.log("slice pc", cpu_pc, "op", cpu_opcode, "cyc", cpu_total_cycles, "line", gpu_line, "stat", gpu_gpustat, "need", needRender, "r1", cpu_r[1], "r2", cpu_r[2], "r31", cpu_r[31]);
  wait(0);
}
