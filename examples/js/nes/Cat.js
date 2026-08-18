// NROM (Mapper 0) NES emulator.
// Green flag: loads rom.txt (iNES bytes) and runs it.
// Swap the game: python rom_to_txt.py your.nes
// Bundled ROM is kevtris's nestest (public domain).
//
// This is correct enough for NROM games, not real-time. Scratch cannot
// run ~30k 6502 cycles per frame; STEPS_PER_SLICE is a small batch.
// APU is stubbed (writes ignored) so games do not hang. No sound.
//
// Display is 128x120 (every other NES pixel, pen size 2). Set pixelStep
// to 1 for a 256x240 view (much slower).
//
// Controls: arrows = D-pad, X/C/space = A, Z = B, S/enter = Start,
// Q/shift = Select.
//
// nestestAuto = 1 starts at $C000 (CPU log mode, no PPU needed).

let ram = [];
let prg = [];
let chr = [];
let vram = [];
let prgRam = [];
let oam = [];
let paletteRam = [];
let gfx = [];
let prev = [];
let opaque = [];
let lineCount = [];
let pal = loadList("palette.txt");
let rom = loadList("rom.txt");

let A = 0;
let X = 0;
let Y = 0;
let SP = 0;
let PC = 0;
let flagC = 0;
let flagZ = 0;
let flagI = 0;
let flagD = 0;
let flagV = 0;
let flagN = 0;

let ea = 0;
let dat = 0;
let jam = 0;
let nmiLatch = 0;
let cpuCycles = 0;
let prgMask = 16383;
let chrIsRam = 0;
let mapperOk = 1;
let nestestAuto = 0;

let ppuCtrl = 0;
let nmiEnabled = 0;
let spriteSize = 0;
let bgTable = 0;
let sprTable = 0;
let vramInc = 1;
let bgLeft = 0;
let sprLeft = 0;
let bgOn = 0;
let sprOn = 0;
let vblank = 0;
let sprite0Hit = 0;
let spriteOverflow = 0;
let oamAddr = 0;
let w = 0;
let t = 0;
let v = 0;
let fineX = 0;
let ppuBuf = 0;
let ppuDot = 0;
let scanline = 0;
let needRender = 0;
let mirrorMode = 0;

let joyStrobe = 0;
let joyBit = 0;
let joyState = 0;

let pix = 0;
let pixOn = 0;
let frameSX = 0;
let frameSY = 0;
let frameNT = 0;
let pixelStep = 2;
let gfxW = 128;
let gfxH = 120;
let gfxLen = 15360;
let STEPS_PER_SLICE = 300;

function packP(bFlag) {
  return flagC + flagZ * 2 + flagI * 4 + flagD * 8 + bFlag * 16 + 32 + flagV * 64 + flagN * 128;
}

function unpackP(val) {
  flagC = val & 1;
  flagZ = (val >> 1) & 1;
  flagI = (val >> 2) & 1;
  flagD = (val >> 3) & 1;
  flagV = (val >> 6) & 1;
  flagN = 0;
  if (val >= 128) {
    flagN = 1;
  }
}

function setZN(val) {
  flagZ = 0;
  flagN = 0;
  if (val == 0) {
    flagZ = 1;
  }
  if (val >= 128) {
    flagN = 1;
  }
}

function onScanline() {
  if (scanline == 241) {
    vblank = 1;
    needRender = 1;
    if (nmiEnabled == 1) {
      nmiLatch = 1;
    }
  }
  if (scanline == 261) {
    vblank = 0;
    sprite0Hit = 0;
    spriteOverflow = 0;
    scanline = 0 - 1;
  }
  if (scanline >= 0) {
    if (scanline < 240) {
      evalSprite0();
    }
  }
}

function addCycles(n) {
  cpuCycles = cpuCycles + n;
  ppuDot = ppuDot + n * 3;
  while (ppuDot >= 341) {
    ppuDot = ppuDot - 341;
    scanline = scanline + 1;
    onScanline();
  }
}

function palIndex(addr) {
  let i = addr & 31;
  if (i >= 16) {
    if ((i & 3) == 0) {
      i = i - 16;
    }
  }
  return i;
}

function mirrorNT(addr) {
  let a = addr & 4095;
  if (mirrorMode == 0) {
    return a & 2047;
  }
  return (a & 1023) + ((a >> 11) & 1) * 1024;
}

function ppuRead(addr) {
  addr = addr & 16383;
  if (addr < 8192) {
    return chr[addr];
  }
  if (addr < 16128) {
    return vram[mirrorNT(addr)];
  }
  return paletteRam[palIndex(addr)];
}

function ppuWrite(addr, val) {
  addr = addr & 16383;
  val = val & 255;
  if (addr < 8192) {
    if (chrIsRam == 1) {
      chr[addr] = val;
    }
    return;
  }
  if (addr < 16128) {
    vram[mirrorNT(addr)] = val;
    return;
  }
  paletteRam[palIndex(addr)] = val;
}

function ppuDataRead() {
  let a = v & 16383;
  let val = ppuRead(a);
  let out = ppuBuf;
  ppuBuf = val;
  if (a >= 16128) {
    out = val;
  }
  v = v + vramInc & 16383;
  return out;
}

function write2000(val) {
  let prevNmi = nmiEnabled;
  ppuCtrl = val;
  nmiEnabled = (val >> 7) & 1;
  spriteSize = (val >> 5) & 1;
  bgTable = (val >> 4) & 1;
  sprTable = (val >> 3) & 1;
  vramInc = 1;
  if (((val >> 2) & 1) == 1) {
    vramInc = 32;
  }
  t = (t & 31) + (((t >> 5) & 31) * 32) + ((val & 3) * 1024) + (((t >> 12) & 7) * 4096);
  if (prevNmi == 0) {
    if (nmiEnabled == 1) {
      if (vblank == 1) {
        nmiLatch = 1;
      }
    }
  }
}

function write2001(val) {
  bgLeft = (val >> 1) & 1;
  sprLeft = (val >> 2) & 1;
  bgOn = (val >> 3) & 1;
  sprOn = (val >> 4) & 1;
}

function write2005(val) {
  if (w == 0) {
    fineX = val & 7;
    t = ((val >> 3) & 31) + (((t >> 5) & 31) * 32) + (((t >> 10) & 3) * 1024) + (((t >> 12) & 7) * 4096);
    w = 1;
  } else {
    t = (t & 31) + ((val >> 3) * 32) + (((t >> 10) & 3) * 1024) + ((val & 7) * 4096);
    w = 0;
  }
}

function write2006(val) {
  if (w == 0) {
    t = (t & 255) + ((val & 63) * 256);
    w = 1;
  } else {
    t = ((t >> 8) * 256) + val;
    v = t;
    w = 0;
  }
}

function ppuRegRead(reg) {
  if (reg == 2) {
    let r = vblank * 128 + sprite0Hit * 64 + spriteOverflow * 32;
    vblank = 0;
    w = 0;
    return r;
  }
  if (reg == 4) {
    return oam[oamAddr];
  }
  if (reg == 7) {
    return ppuDataRead();
  }
  return 0;
}

function ppuRegWrite(reg, val) {
  val = val & 255;
  if (reg == 0) {
    write2000(val);
    return;
  }
  if (reg == 1) {
    write2001(val);
    return;
  }
  if (reg == 3) {
    oamAddr = val;
    return;
  }
  if (reg == 4) {
    oam[oamAddr] = val;
    oamAddr = oamAddr + 1 & 255;
    return;
  }
  if (reg == 5) {
    write2005(val);
    return;
  }
  if (reg == 6) {
    write2006(val);
    return;
  }
  if (reg == 7) {
    ppuWrite(v & 16383, val);
    v = v + vramInc & 16383;
  }
}

function joyRead() {
  if (joyStrobe == 1) {
    return joyState & 1;
  }
  if (joyBit >= 8) {
    return 1;
  }
  let b = (joyState >> joyBit) & 1;
  joyBit = joyBit + 1;
  return b;
}

function joyWrite(val) {
  joyStrobe = val & 1;
  if (joyStrobe == 1) {
    joyBit = 0;
  }
}

function oamDma(page) {
  let base = page * 256;
  let i = 0;
  while (i < 256) {
    oam[oamAddr] = cpuRead(base + i);
    oamAddr = oamAddr + 1 & 255;
    i++;
  }
  addCycles(513);
}

function cpuRead(addr) {
  addr = addr & 65535;
  if (addr < 8192) {
    return ram[addr & 2047];
  }
  if (addr < 16384) {
    return ppuRegRead(addr & 7);
  }
  if (addr == 16406) {
    return joyRead();
  }
  if (addr == 16407) {
    return 0;
  }
  if (addr < 24576) {
    return 0;
  }
  if (addr < 32768) {
    return prgRam[addr & 8191];
  }
  return prg[addr & prgMask];
}

function cpuWrite(addr, val) {
  addr = addr & 65535;
  val = val & 255;
  if (addr < 8192) {
    ram[addr & 2047] = val;
    return;
  }
  if (addr < 16384) {
    ppuRegWrite(addr & 7, val);
    return;
  }
  if (addr == 16404) {
    oamDma(val);
    return;
  }
  if (addr == 16406) {
    joyWrite(val);
    return;
  }
  if (addr < 24576) {
    return;
  }
  if (addr < 32768) {
    prgRam[addr & 8191] = val;
  }
}

function push(val) {
  cpuWrite(256 + SP, val);
  SP = SP - 1 & 255;
}

function pull() {
  SP = SP + 1 & 255;
  return cpuRead(256 + SP);
}

function doNmi() {
  push(PC >> 8);
  push(PC & 255);
  push(packP(0));
  flagI = 1;
  PC = cpuRead(65530) + cpuRead(65531) * 256;
  addCycles(7);
}

function doIrq() {
  push(PC >> 8);
  push(PC & 255);
  push(packP(0));
  flagI = 1;
  PC = cpuRead(65534) + cpuRead(65535) * 256;
  addCycles(7);
}

function addrImm() {
  ea = PC;
  PC = PC + 1 & 65535;
}

function addrZp() {
  ea = cpuRead(PC);
  PC = PC + 1 & 65535;
}

function addrZpX() {
  ea = cpuRead(PC) + X & 255;
  PC = PC + 1 & 65535;
}

function addrZpY() {
  ea = cpuRead(PC) + Y & 255;
  PC = PC + 1 & 65535;
}

function addrAbs() {
  let lo = cpuRead(PC);
  PC = PC + 1 & 65535;
  let hi = cpuRead(PC);
  PC = PC + 1 & 65535;
  ea = lo + hi * 256;
}

function addrAbsX(extra) {
  let lo = cpuRead(PC);
  PC = PC + 1 & 65535;
  let hi = cpuRead(PC);
  PC = PC + 1 & 65535;
  ea = lo + hi * 256 + X & 65535;
  if (extra == 1) {
    if (lo + X > 255) {
      addCycles(1);
    }
  }
}

function addrAbsY(extra) {
  let lo = cpuRead(PC);
  PC = PC + 1 & 65535;
  let hi = cpuRead(PC);
  PC = PC + 1 & 65535;
  ea = lo + hi * 256 + Y & 65535;
  if (extra == 1) {
    if (lo + Y > 255) {
      addCycles(1);
    }
  }
}

function addrIzX() {
  let z = cpuRead(PC) + X & 255;
  PC = PC + 1 & 65535;
  ea = cpuRead(z) + cpuRead(z + 1 & 255) * 256;
}

function addrIzY(extra) {
  let z = cpuRead(PC);
  PC = PC + 1 & 65535;
  let lo = cpuRead(z);
  let hi = cpuRead(z + 1 & 255);
  ea = lo + hi * 256 + Y & 65535;
  if (extra == 1) {
    if (lo + Y > 255) {
      addCycles(1);
    }
  }
}

function addrInd() {
  let lo = cpuRead(PC);
  PC = PC + 1 & 65535;
  let hi = cpuRead(PC);
  PC = PC + 1 & 65535;
  let a1 = hi * 256 + lo;
  let a2 = hi * 256 + (lo + 1 & 255);
  ea = cpuRead(a1) + cpuRead(a2) * 256;
}

function addrGroup1(bbb, isWrite) {
  switch (bbb) {
    case 0:
      addrIzX();
      addCycles(6);
      break;
    case 1:
      addrZp();
      addCycles(3);
      break;
    case 2:
      addrImm();
      addCycles(2);
      break;
    case 3:
      addrAbs();
      addCycles(4);
      break;
    case 4:
      addrIzY(1 - isWrite);
      addCycles(5);
      if (isWrite == 1) {
        addCycles(1);
      }
      break;
    case 5:
      addrZpX();
      addCycles(4);
      break;
    case 6:
      addrAbsY(1 - isWrite);
      addCycles(4);
      if (isWrite == 1) {
        addCycles(1);
      }
      break;
    case 7:
      addrAbsX(1 - isWrite);
      addCycles(4);
      if (isWrite == 1) {
        addCycles(1);
      }
      break;
  }
}

function aslDat() {
  flagC = 0;
  if (dat >= 128) {
    flagC = 1;
  }
  dat = dat + dat & 255;
  setZN(dat);
}

function lsrDat() {
  flagC = dat & 1;
  dat = dat >> 1;
  setZN(dat);
}

function rolDat() {
  let newC = 0;
  if (dat >= 128) {
    newC = 1;
  }
  dat = dat + dat & 255;
  if (flagC == 1) {
    dat = dat + 1;
  }
  flagC = newC;
  setZN(dat);
}

function rorDat() {
  let newC = dat & 1;
  dat = dat >> 1;
  if (flagC == 1) {
    dat = dat + 128;
  }
  flagC = newC;
  setZN(dat);
}

function opORA() {
  A = A | cpuRead(ea);
  A = A & 255;
  setZN(A);
}

function opAND() {
  A = A & cpuRead(ea);
  A = A & 255;
  setZN(A);
}

function opEOR() {
  A = A ^ cpuRead(ea);
  A = A & 255;
  setZN(A);
}

function opADCVal(val) {
  let sum = A + val + flagC;
  flagV = 0;
  if (A >= 128) {
    if (val >= 128) {
      if ((sum & 255) < 128) {
        flagV = 1;
      }
    }
  } else {
    if (val < 128) {
      if (sum >= 128) {
        if (sum < 256) {
          flagV = 1;
        }
      }
    }
  }
  flagC = 0;
  if (sum > 255) {
    flagC = 1;
  }
  A = sum & 255;
  setZN(A);
}

function opADC() {
  opADCVal(cpuRead(ea));
}

function opSBC() {
  opADCVal(cpuRead(ea) ^ 255);
}

function opCMPReg(reg) {
  dat = cpuRead(ea);
  flagC = 0;
  if (reg >= dat) {
    flagC = 1;
  }
  let d = reg - dat;
  if (d < 0) {
    d = d + 256;
  }
  setZN(d);
}

function opBIT() {
  dat = cpuRead(ea);
  flagZ = 0;
  if ((A & dat) == 0) {
    flagZ = 1;
  }
  flagV = (dat >> 6) & 1;
  flagN = 0;
  if (dat >= 128) {
    flagN = 1;
  }
}

function doBranch(cond) {
  dat = cpuRead(PC);
  PC = PC + 1 & 65535;
  addCycles(2);
  if (cond == 1) {
    let off = dat;
    if (off >= 128) {
      off = off - 256;
    }
    let oldHi = PC >> 8;
    PC = PC + off + 65536 & 65535;
    addCycles(1);
    if (oldHi != (PC >> 8)) {
      addCycles(1);
    }
  }
}

function execGroup1(aaa, bbb) {
  if (aaa == 4) {
    if (bbb == 2) {
      addrImm();
      addCycles(2);
      return;
    }
    addrGroup1(bbb, 1);
    cpuWrite(ea, A);
    return;
  }
  addrGroup1(bbb, 0);
  switch (aaa) {
    case 0:
      opORA();
      break;
    case 1:
      opAND();
      break;
    case 2:
      opEOR();
      break;
    case 3:
      opADC();
      break;
    case 5:
      A = cpuRead(ea);
      setZN(A);
      break;
    case 6:
      opCMPReg(A);
      break;
    case 7:
      opSBC();
      break;
  }
}

function execUnoffImm(aaa) {
  addrImm();
  dat = cpuRead(ea);
  addCycles(2);
  switch (aaa) {
    case 0:
      A = A & dat;
      A = A & 255;
      setZN(A);
      flagC = flagN;
      break;
    case 1:
      A = A & dat;
      A = A & 255;
      setZN(A);
      flagC = flagN;
      break;
    case 2:
      A = A & dat;
      flagC = A & 1;
      A = A >> 1;
      setZN(A);
      break;
    case 3:
      A = A & dat;
      A = (A >> 1) + flagC * 128;
      flagC = (A >> 6) & 1;
      flagV = flagC ^ ((A >> 5) & 1);
      setZN(A);
      break;
    case 4:
      A = X & dat;
      A = A & 255;
      setZN(A);
      break;
    case 5:
      A = dat;
      X = A;
      setZN(A);
      break;
    case 6:
      let ax = A & X;
      flagC = 0;
      if (ax >= dat) {
        flagC = 1;
      }
      ax = ax - dat;
      if (ax < 0) {
        ax = ax + 256;
      }
      X = ax & 255;
      setZN(X);
      break;
    case 7:
      opADCVal(dat ^ 255);
      break;
  }
}

function execGroup3(aaa, bbb) {
  if (bbb == 2) {
    execUnoffImm(aaa);
    return;
  }
  if (aaa == 4) {
    if (bbb == 4) {
      addrIzY(0);
      addCycles(6);
      cpuWrite(ea, A & X & ((ea >> 8) + 1 & 255));
      return;
    }
    if (bbb == 7) {
      addrAbsY(0);
      addCycles(5);
      cpuWrite(ea, A & X & ((ea >> 8) + 1 & 255));
      return;
    }
    if (bbb == 6) {
      addrAbsY(0);
      addCycles(5);
      SP = A & X;
      cpuWrite(ea, SP & ((ea >> 8) + 1 & 255));
      return;
    }
    if (bbb == 5) {
      addrZpY();
      addCycles(4);
    } else {
      addrGroup1(bbb, 1);
    }
    cpuWrite(ea, A & X);
    return;
  }
  if (aaa == 5) {
    if (bbb == 6) {
      addrAbsY(1);
      addCycles(4);
      A = cpuRead(ea) & SP;
      X = A;
      SP = A;
      setZN(A);
      return;
    }
    if (bbb == 5) {
      addrZpY();
      addCycles(4);
    } else {
      addrGroup1(bbb, 0);
    }
    A = cpuRead(ea);
    X = A;
    setZN(A);
    return;
  }
  addrGroup1(bbb, 1);
  addCycles(2);
  dat = cpuRead(ea);
  switch (aaa) {
    case 0:
      aslDat();
      cpuWrite(ea, dat);
      A = A | dat;
      A = A & 255;
      setZN(A);
      break;
    case 1:
      rolDat();
      cpuWrite(ea, dat);
      A = A & dat;
      A = A & 255;
      setZN(A);
      break;
    case 2:
      lsrDat();
      cpuWrite(ea, dat);
      A = A ^ dat;
      A = A & 255;
      setZN(A);
      break;
    case 3:
      rorDat();
      cpuWrite(ea, dat);
      opADCVal(dat);
      break;
    case 6:
      dat = dat - 1 & 255;
      cpuWrite(ea, dat);
      flagC = 0;
      if (A >= dat) {
        flagC = 1;
      }
      let d = A - dat;
      if (d < 0) {
        d = d + 256;
      }
      setZN(d);
      break;
    case 7:
      dat = dat + 1 & 255;
      cpuWrite(ea, dat);
      opADCVal(dat ^ 255);
      break;
  }
}

function execAcc(aaa) {
  addCycles(2);
  switch (aaa) {
    case 0:
      dat = A;
      aslDat();
      A = dat;
      break;
    case 1:
      dat = A;
      rolDat();
      A = dat;
      break;
    case 2:
      dat = A;
      lsrDat();
      A = dat;
      break;
    case 3:
      dat = A;
      rorDat();
      A = dat;
      break;
    case 4:
      A = X;
      setZN(A);
      break;
    case 5:
      X = A;
      setZN(X);
      break;
    case 6:
      X = X - 1 & 255;
      setZN(X);
      break;
  }
}

function execImpl2(aaa) {
  addCycles(2);
  switch (aaa) {
    case 4:
      SP = X;
      break;
    case 5:
      X = SP;
      setZN(X);
      break;
  }
}

function execImm2(aaa) {
  if (aaa < 4) {
    jam = 1;
    addCycles(2);
    return;
  }
  addrImm();
  addCycles(2);
  if (aaa == 5) {
    X = cpuRead(ea);
    setZN(X);
  }
}

function execGroup2(aaa, bbb) {
  if (bbb == 4) {
    jam = 1;
    addCycles(2);
    return;
  }
  if (bbb == 2) {
    execAcc(aaa);
    return;
  }
  if (bbb == 6) {
    execImpl2(aaa);
    return;
  }
  if (bbb == 0) {
    execImm2(aaa);
    return;
  }
  if (bbb == 1) {
    addrZp();
    addCycles(3);
  }
  if (bbb == 3) {
    addrAbs();
    addCycles(4);
  }
  if (bbb == 5) {
    if (aaa == 4) {
      addrZpY();
    } else {
      if (aaa == 5) {
        addrZpY();
      } else {
        addrZpX();
      }
    }
    addCycles(4);
  }
  if (bbb == 7) {
    if (aaa == 5) {
      addrAbsY(1);
      addCycles(4);
    } else {
      if (aaa == 4) {
        addrAbsY(0);
        addCycles(5);
        cpuWrite(ea, X & ((ea >> 8) + 1 & 255));
        return;
      } else {
        addrAbsX(0);
        addCycles(4);
      }
    }
  }
  if (aaa == 4) {
    cpuWrite(ea, X);
    return;
  }
  if (aaa == 5) {
    X = cpuRead(ea);
    setZN(X);
    return;
  }
  if (bbb == 7) {
    addCycles(3);
  } else {
    addCycles(2);
  }
  dat = cpuRead(ea);
  switch (aaa) {
    case 0:
      aslDat();
      break;
    case 1:
      rolDat();
      break;
    case 2:
      lsrDat();
      break;
    case 3:
      rorDat();
      break;
    case 6:
      dat = dat - 1 & 255;
      setZN(dat);
      break;
    case 7:
      dat = dat + 1 & 255;
      setZN(dat);
      break;
  }
  cpuWrite(ea, dat);
}

function execGroup0(aaa, bbb) {
  switch (bbb) {
    case 0:
      switch (aaa) {
        case 0:
          PC = PC + 1 & 65535;
          push(PC >> 8);
          push(PC & 255);
          push(packP(1));
          flagI = 1;
          PC = cpuRead(65534) + cpuRead(65535) * 256;
          addCycles(7);
          break;
        case 1:
          let lo = cpuRead(PC);
          PC = PC + 1 & 65535;
          push(PC >> 8);
          push(PC & 255);
          PC = lo + cpuRead(PC) * 256;
          addCycles(6);
          break;
        case 2:
          unpackP(pull());
          PC = pull();
          PC = PC + pull() * 256;
          addCycles(6);
          break;
        case 3:
          PC = pull();
          PC = PC + pull() * 256;
          PC = PC + 1 & 65535;
          addCycles(6);
          break;
        case 4:
          addrImm();
          addCycles(2);
          break;
        case 5:
          addrImm();
          Y = cpuRead(ea);
          setZN(Y);
          addCycles(2);
          break;
        case 6:
          addrImm();
          addCycles(2);
          opCMPReg(Y);
          break;
        case 7:
          addrImm();
          addCycles(2);
          opCMPReg(X);
          break;
      }
      break;
    case 1:
      switch (aaa) {
        case 0:
          addrZp();
          addCycles(3);
          break;
        case 1:
          addrZp();
          addCycles(3);
          opBIT();
          break;
        case 2:
          addrZp();
          addCycles(3);
          break;
        case 3:
          addrZp();
          addCycles(3);
          break;
        case 4:
          addrZp();
          addCycles(3);
          cpuWrite(ea, Y);
          break;
        case 5:
          addrZp();
          addCycles(3);
          Y = cpuRead(ea);
          setZN(Y);
          break;
        case 6:
          addrZp();
          addCycles(3);
          opCMPReg(Y);
          break;
        case 7:
          addrZp();
          addCycles(3);
          opCMPReg(X);
          break;
      }
      break;
    case 2:
      addCycles(2);
      switch (aaa) {
        case 0:
          push(packP(1));
          addCycles(1);
          break;
        case 1:
          unpackP(pull());
          addCycles(2);
          break;
        case 2:
          push(A);
          addCycles(1);
          break;
        case 3:
          A = pull();
          setZN(A);
          addCycles(2);
          break;
        case 4:
          Y = Y - 1 & 255;
          setZN(Y);
          break;
        case 5:
          Y = A;
          setZN(Y);
          break;
        case 6:
          Y = Y + 1 & 255;
          setZN(Y);
          break;
        case 7:
          X = X + 1 & 255;
          setZN(X);
          break;
      }
      break;
    case 3:
      switch (aaa) {
        case 0:
          addrAbs();
          addCycles(4);
          break;
        case 1:
          addrAbs();
          addCycles(4);
          opBIT();
          break;
        case 2:
          addrAbs();
          PC = ea;
          addCycles(3);
          break;
        case 3:
          addrInd();
          PC = ea;
          addCycles(5);
          break;
        case 4:
          addrAbs();
          addCycles(4);
          cpuWrite(ea, Y);
          break;
        case 5:
          addrAbs();
          addCycles(4);
          Y = cpuRead(ea);
          setZN(Y);
          break;
        case 6:
          addrAbs();
          addCycles(4);
          opCMPReg(Y);
          break;
        case 7:
          addrAbs();
          addCycles(4);
          opCMPReg(X);
          break;
      }
      break;
    case 4:
      switch (aaa) {
        case 0:
          doBranch(1 - flagN);
          break;
        case 1:
          doBranch(flagN);
          break;
        case 2:
          doBranch(1 - flagV);
          break;
        case 3:
          doBranch(flagV);
          break;
        case 4:
          doBranch(1 - flagC);
          break;
        case 5:
          doBranch(flagC);
          break;
        case 6:
          doBranch(1 - flagZ);
          break;
        case 7:
          doBranch(flagZ);
          break;
      }
      break;
    case 5:
      switch (aaa) {
        case 0:
          addrZpX();
          addCycles(4);
          break;
        case 1:
          addrZpX();
          addCycles(4);
          break;
        case 2:
          addrZpX();
          addCycles(4);
          break;
        case 3:
          addrZpX();
          addCycles(4);
          break;
        case 4:
          addrZpX();
          addCycles(4);
          cpuWrite(ea, Y);
          break;
        case 5:
          addrZpX();
          addCycles(4);
          Y = cpuRead(ea);
          setZN(Y);
          break;
        case 6:
          addrZpX();
          addCycles(4);
          break;
        case 7:
          addrZpX();
          addCycles(4);
          break;
      }
      break;
    case 6:
      addCycles(2);
      switch (aaa) {
        case 0:
          flagC = 0;
          break;
        case 1:
          flagC = 1;
          break;
        case 2:
          flagI = 0;
          break;
        case 3:
          flagI = 1;
          break;
        case 4:
          A = Y;
          setZN(A);
          break;
        case 5:
          flagV = 0;
          break;
        case 6:
          flagD = 0;
          break;
        case 7:
          flagD = 1;
          break;
      }
      break;
    case 7:
      switch (aaa) {
        case 0:
          addrAbsX(1);
          addCycles(4);
          break;
        case 1:
          addrAbsX(1);
          addCycles(4);
          break;
        case 2:
          addrAbsX(1);
          addCycles(4);
          break;
        case 3:
          addrAbsX(1);
          addCycles(4);
          break;
        case 4:
          addrAbsX(0);
          addCycles(5);
          cpuWrite(ea, Y & ((ea >> 8) + 1 & 255));
          break;
        case 5:
          addrAbsX(1);
          addCycles(4);
          Y = cpuRead(ea);
          setZN(Y);
          break;
        case 6:
          addrAbsX(1);
          addCycles(4);
          break;
        case 7:
          addrAbsX(1);
          addCycles(4);
          break;
      }
      break;
  }
}

function cpuStep() {
  if (jam == 1) {
    addCycles(2);
    return;
  }
  if (nmiLatch == 1) {
    nmiLatch = 0;
    doNmi();
    return;
  }
  let op = cpuRead(PC);
  PC = PC + 1 & 65535;
  let cc = op & 3;
  let bbb = (op >> 2) & 7;
  let aaa = op >> 5;
  if (cc == 1) {
    execGroup1(aaa, bbb);
    return;
  }
  if (cc == 3) {
    execGroup3(aaa, bbb);
    return;
  }
  if (cc == 2) {
    execGroup2(aaa, bbb);
    return;
  }
  execGroup0(aaa, bbb);
}

function currentSX() {
  return (t & 31) * 8 + fineX;
}

function currentSY() {
  return ((t >> 5) & 31) * 8 + ((t >> 12) & 7);
}

function currentNT() {
  return (t >> 10) & 3;
}

function sampleBg(nesX, nesY) {
  pix = paletteRam[0] & 63;
  pixOn = 0;
  if (bgOn == 0) {
    return;
  }
  if (bgLeft == 0) {
    if (nesX < 8) {
      return;
    }
  }
  let px = nesX + frameSX;
  let py = nesY + frameSY;
  let tx = px >> 3;
  let ty = py >> 3;
  let fx = px & 7;
  let fy = py & 7;
  let nt = frameNT;
  let ntx = nt & 1;
  let nty = (nt >> 1) & 1;
  ntx = ntx ^ (tx >> 5);
  tx = tx & 31;
  if (ty >= 30) {
    ty = ty - 30;
    nty = 1 - nty;
  }
  if (ty >= 30) {
    ty = ty - 30;
    nty = 1 - nty;
  }
  if (ty > 29) {
    ty = 29;
  }
  let ntAddr = 8192 + (ntx + nty * 2) * 1024 + ty * 32 + tx;
  let tile = ppuRead(ntAddr);
  let attr = ppuRead(8192 + (ntx + nty * 2) * 1024 + 960 + (ty >> 2) * 8 + (tx >> 2));
  let quad = 0;
  if ((tx & 3) >= 2) {
    quad = 2;
  }
  if ((ty & 3) >= 2) {
    quad = quad + 4;
  }
  let palSel = (attr >> quad) & 3;
  let lo = ppuRead(bgTable * 4096 + tile * 16 + fy);
  let hi = ppuRead(bgTable * 4096 + tile * 16 + fy + 8);
  let bit = 7 - fx;
  let p = ((hi >> bit) & 1) * 2 + ((lo >> bit) & 1);
  if (p == 0) {
    pix = paletteRam[0] & 63;
    pixOn = 0;
  } else {
    pix = paletteRam[palSel * 4 + p] & 63;
    pixOn = 1;
  }
}

function evalSprite0() {
  if (sprite0Hit == 1) {
    return;
  }
  if (bgOn == 0) {
    return;
  }
  if (sprOn == 0) {
    return;
  }
  let sy = oam[0];
  let h = 8;
  if (spriteSize == 1) {
    h = 16;
  }
  let row = scanline - sy - 1;
  if (row < 0) {
    return;
  }
  if (row >= h) {
    return;
  }
  let tile = oam[1];
  let attr = oam[2];
  let sx = oam[3];
  if (sx == 255) {
    return;
  }
  frameSX = currentSX();
  frameSY = currentSY();
  frameNT = currentNT();
  let flipX = (attr >> 6) & 1;
  let flipY = (attr >> 7) & 1;
  let tileRow = row;
  if (flipY == 1) {
    tileRow = h - 1 - row;
  }
  let useTile = tile;
  let table = sprTable * 4096;
  if (spriteSize == 1) {
    table = (tile & 1) * 4096;
    useTile = tile & 254;
    if (tileRow >= 8) {
      useTile = useTile + 1;
      tileRow = tileRow - 8;
    }
  }
  let lo = ppuRead(table + useTile * 16 + tileRow);
  let hi = ppuRead(table + useTile * 16 + tileRow + 8);
  let col = 0;
  while (col < 8) {
    if (sprite0Hit == 0) {
      let px = sx + col;
      if (px < 255) {
        if (sprLeft == 1 || px >= 8) {
          let bit = 7 - col;
          if (flipX == 1) {
            bit = col;
          }
          let p = ((hi >> bit) & 1) * 2 + ((lo >> bit) & 1);
          if (p != 0) {
            sampleBg(px, scanline);
            if (pixOn == 1) {
              sprite0Hit = 1;
            }
          }
        }
      }
    }
    col++;
  }
}

function renderBg() {
  frameSX = currentSX();
  frameSY = currentSY();
  frameNT = currentNT();
  let gy = 0;
  while (gy < gfxH) {
    let gx = 0;
    while (gx < gfxW) {
      sampleBg(gx * pixelStep, gy * pixelStep);
      let idx = gy * gfxW + gx;
      gfx[idx] = pix;
      opaque[idx] = pixOn;
      gx++;
    }
    gy++;
  }
}

function drawSprite(n) {
  let sy = oam[n * 4];
  let tile = oam[n * 4 + 1];
  let attr = oam[n * 4 + 2];
  let sx = oam[n * 4 + 3];
  if (sy >= 239) {
    return;
  }
  let palOff = (attr & 3) + 4;
  let behind = (attr >> 5) & 1;
  let flipX = (attr >> 6) & 1;
  let flipY = (attr >> 7) & 1;
  let h = 8;
  if (spriteSize == 1) {
    h = 16;
  }
  let row = 0;
  while (row < h) {
    let py = sy + 1 + row;
    if (py >= 0) {
      if (py < 240) {
        if (lineCount[py] >= 8) {
          spriteOverflow = 1;
        } else {
          lineCount[py] = lineCount[py] + 1;
          let tileRow = row;
          if (flipY == 1) {
            tileRow = h - 1 - row;
          }
          let useTile = tile;
          let table = sprTable * 4096;
          if (spriteSize == 1) {
            table = (tile & 1) * 4096;
            useTile = tile & 254;
            if (tileRow >= 8) {
              useTile = useTile + 1;
              tileRow = tileRow - 8;
            }
          }
          let lo = ppuRead(table + useTile * 16 + tileRow);
          let hi = ppuRead(table + useTile * 16 + tileRow + 8);
          let col = 0;
          while (col < 8) {
            let px = sx + col;
            if (px < 256) {
              if (sprLeft == 1 || px >= 8) {
                let bit = 7 - col;
                if (flipX == 1) {
                  bit = col;
                }
                let p = ((hi >> bit) & 1) * 2 + ((lo >> bit) & 1);
                if (p != 0) {
                  if ((px % pixelStep) == 0) {
                    if ((py % pixelStep) == 0) {
                      let gx = px / pixelStep;
                      let gy = py / pixelStep;
                      if (gx < gfxW) {
                        if (gy < gfxH) {
                          let idx = gy * gfxW + gx;
                          let hide = 0;
                          if (behind == 1) {
                            if (opaque[idx] == 1) {
                              hide = 1;
                            }
                          }
                          if (hide == 0) {
                            gfx[idx] = paletteRam[palOff * 4 + p] & 63;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            col++;
          }
        }
      }
    }
    row++;
  }
}

function renderSprites() {
  let i = 0;
  while (i < 240) {
    lineCount[i] = 0;
    i++;
  }
  let n = 63;
  while (n >= 0) {
    drawSprite(n);
    n--;
  }
}

function plotPixel(x, y, c) {
  goTo(x - 128, 120 - y);
  pen.setColor(pal[c]);
  pen.down();
  changeX(1);
  pen.up();
}

function blit() {
  let i = 0;
  while (i < gfxLen) {
    if (gfx[i] != prev[i]) {
      prev[i] = gfx[i];
      let gx = i % gfxW;
      let gy = Math.floor(i / gfxW);
      plotPixel(gx * pixelStep, gy * pixelStep, gfx[i]);
    }
    i++;
  }
}

function renderFrame() {
  if (bgOn == 0) {
    if (sprOn == 0) {
      let i = 0;
      let c = paletteRam[0] & 63;
      while (i < gfxLen) {
        gfx[i] = c;
        opaque[i] = 0;
        i++;
      }
      blit();
      return;
    }
  }
  renderBg();
  if (sprOn == 1) {
    renderSprites();
  }
  blit();
}

function pollKeys() {
  joyState = 0;
  if (keyPressed("x") || keyPressed("c") || keyPressed("space")) {
    joyState = joyState + 1;
  }
  if (keyPressed("z")) {
    joyState = joyState + 2;
  }
  if (keyPressed("q") || keyPressed("shift")) {
    joyState = joyState + 4;
  }
  if (keyPressed("s") || keyPressed("enter")) {
    joyState = joyState + 8;
  }
  if (keyPressed("up arrow")) {
    joyState = joyState + 16;
  }
  if (keyPressed("down arrow")) {
    joyState = joyState + 32;
  }
  if (keyPressed("left arrow")) {
    joyState = joyState + 64;
  }
  if (keyPressed("right arrow")) {
    joyState = joyState + 128;
  }
}

function bootFill() {
  while (ram.length < 2048) {
    ram.push(0);
  }
  while (vram.length < 2048) {
    vram.push(0);
  }
  while (prgRam.length < 8192) {
    prgRam.push(0);
  }
  while (oam.length < 256) {
    oam.push(0);
  }
  while (paletteRam.length < 32) {
    paletteRam.push(0);
  }
  while (chr.length < 8192) {
    chr.push(0);
  }
  while (lineCount.length < 240) {
    lineCount.push(0);
  }
  gfxW = 256 / pixelStep;
  gfxH = 240 / pixelStep;
  gfxLen = gfxW * gfxH;
  while (gfx.length < gfxLen) {
    gfx.push(0);
    prev.push(0 - 1);
    opaque.push(0);
  }
}

function loadCartridge() {
  mapperOk = 1;
  if (rom.length < 16) {
    mapperOk = 0;
    return;
  }
  if (rom[0] != 78) {
    mapperOk = 0;
    return;
  }
  if (rom[1] != 69) {
    mapperOk = 0;
    return;
  }
  if (rom[2] != 83) {
    mapperOk = 0;
    return;
  }
  if (rom[3] != 26) {
    mapperOk = 0;
    return;
  }
  let prgBanks = rom[4];
  let chrBanks = rom[5];
  let flags6 = rom[6];
  let flags7 = rom[7];
  let mapper = (flags6 >> 4) + (flags7 >> 4) * 16;
  if (mapper != 0) {
    mapperOk = 0;
    return;
  }
  mirrorMode = flags6 & 1;
  let off = 16;
  if ((flags6 & 4) == 4) {
    off = 528;
  }
  let prgSize = prgBanks * 16384;
  if (prgBanks == 1) {
    prgMask = 16383;
  } else {
    prgMask = 32767;
  }
  while (prg.length < prgSize) {
    prg.push(0);
  }
  let i = 0;
  while (i < prgSize) {
    prg[i] = rom[off + i];
    i++;
  }
  off = off + prgSize;
  if (chrBanks == 0) {
    chrIsRam = 1;
    i = 0;
    while (i < 8192) {
      chr[i] = 0;
      i++;
    }
  } else {
    chrIsRam = 0;
    i = 0;
    while (i < 8192) {
      chr[i] = rom[off + i];
      i++;
    }
  }
}

function cpuReset() {
  A = 0;
  X = 0;
  Y = 0;
  SP = 253;
  flagC = 0;
  flagZ = 0;
  flagI = 1;
  flagD = 0;
  flagV = 0;
  flagN = 0;
  jam = 0;
  nmiLatch = 0;
  if (nestestAuto == 1) {
    PC = 49152;
  } else {
    PC = cpuRead(65532) + cpuRead(65533) * 256;
  }
}

function boot() {
  bootFill();
  loadCartridge();
  cpuReset();
  ppuCtrl = 0;
  nmiEnabled = 0;
  spriteSize = 0;
  bgTable = 0;
  sprTable = 0;
  vramInc = 1;
  bgLeft = 0;
  sprLeft = 0;
  bgOn = 0;
  sprOn = 0;
  vblank = 0;
  sprite0Hit = 0;
  spriteOverflow = 0;
  oamAddr = 0;
  w = 0;
  t = 0;
  v = 0;
  fineX = 0;
  ppuBuf = 0;
  ppuDot = 0;
  scanline = 0;
  needRender = 0;
  cpuCycles = 0;
  hide();
  pointInDirection(90);
  pen.clear();
  pen.setSize(pixelStep);
  if (mapperOk == 0) {
    console.log("Need iNES Mapper 0 ROM");
  }
}

function runSlice() {
  let n = 0;
  while (n < STEPS_PER_SLICE) {
    cpuStep();
    n++;
  }
}

boot();
while (true) {
  if (mapperOk == 1) {
    pollKeys();
    runSlice();
    if (needRender == 1) {
      renderFrame();
      needRender = 0;
    }
  }
  wait(0);
}
