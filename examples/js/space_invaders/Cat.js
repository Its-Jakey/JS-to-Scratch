// CHIP-8 emulator running David Winter's Space Invaders (0.91).
// Green flag: the game starts and a simple autopilot plays.
// You can also play: left/right arrows (or A/D or 4/6) to move,
// space / W / 5 to shoot and to start.

let mem = [];
let V = [];
let stack = [];
let keys = [];
let gfx = [];
let prev = [];
let pc = 512;
let I = 0;
let sp = 0;
let delayTimer = 0;
let soundTimer = 0;
let waiting = 0;
let waitReg = 0;
let drawFlag = 0;
let clsFlag = 0;
let op1 = 0;
let x = 0;
let y = 0;
let n = 0;
let kk = 0;
let nnn = 0;
let font = loadList("font.txt");
let rom = loadList("rom.txt");

function fillBg() {
  pen.setColor("#071018");
  pen.setSize(80);
  let gy = 160;
  while (gy > -160) {
    goTo(-240, gy);
    pen.down();
    goTo(240, gy);
    pen.up();
    gy = gy - 40;
  }
  pen.setSize(6);
}

function plotPixel(col, row, on) {
  goTo(col * 6 - 189, 93 - row * 6);
  if (on == 1) {
    pen.setColor("#7CFF6B");
  } else {
    pen.setColor("#071018");
  }
  pen.down();
  changeX(1);
  pen.up();
}

function render() {
  let i = 0;
  if (clsFlag == 1) {
    pen.clear();
    fillBg();
    i = 0;
    while (i < 2048) {
      prev[i] = 0;
      i++;
    }
    clsFlag = 0;
  }
  i = 0;
  while (i < 2048) {
    if (gfx[i] != prev[i]) {
      prev[i] = gfx[i];
      plotPixel(i & 63, i >> 6, gfx[i]);
    }
    i++;
  }
  drawFlag = 0;
}

function autoplay() {
  keys[4] = 0;
  keys[5] = 1;
  keys[6] = 0;
  let ship = -1;
  let col = 0;
  while (col < 64) {
    if (gfx[1984 + col] == 1) {
      if (ship < 0) {
        ship = col;
      }
    }
    col++;
  }
  if (ship < 0) {
    return;
  }
  let best = 999;
  let aim = ship;
  col = 0;
  while (col < 64) {
    let row = 0;
    let hit = 0;
    while (row < 28) {
      if (gfx[row * 64 + col] == 1) {
        hit = 1;
      }
      row++;
    }
    if (hit == 1) {
      let dist = col - ship;
      if (dist < 0) {
        dist = 0 - dist;
      }
      if (dist < best) {
        best = dist;
        aim = col;
      }
    }
    col++;
  }
  if (aim < ship + 2) {
    keys[4] = 1;
  }
  if (aim > ship + 5) {
    keys[6] = 1;
  }
}

function exec0() {
  let i = 0;
  switch (kk) {
    case 224:
      while (i < 2048) {
        gfx[i] = 0;
        i++;
      }
      clsFlag = 1;
      drawFlag = 1;
      break;
    case 238:
      sp = sp - 1;
      if (sp < 0) {
        sp = 0;
      }
      pc = stack[sp];
      break;
  }
}

function exec8() {
  let sum = 0;
  let vx = 0;
  let vy = 0;
  let src = 0;
  switch (n) {
    case 0:
      V[x] = V[y];
      break;
    case 1:
      V[x] = V[x] | V[y];
      break;
    case 2:
      V[x] = V[x] & V[y];
      break;
    case 3:
      V[x] = V[x] ^ V[y];
      break;
    case 4:
      sum = V[x] + V[y];
      V[x] = sum & 255;
      V[15] = 0;
      if (sum > 255) {
        V[15] = 1;
      }
      break;
    case 5:
      vx = V[x];
      vy = V[y];
      V[15] = 0;
      if (vx >= vy) {
        V[15] = 1;
        V[x] = vx - vy;
      } else {
        V[x] = (vx - vy) & 255;
      }
      break;
    case 6:
      src = V[x];
      V[x] = src >> 1;
      V[15] = src & 1;
      break;
    case 7:
      vx = V[x];
      vy = V[y];
      V[15] = 0;
      if (vy >= vx) {
        V[15] = 1;
        V[x] = vy - vx;
      } else {
        V[x] = (vy - vx) & 255;
      }
      break;
    case 14:
      src = V[x];
      V[15] = src >> 7;
      V[x] = src << 1 & 255;
      break;
  }
}

function execD() {
  let px = V[x] & 63;
  let py = V[y] & 31;
  V[15] = 0;
  let row = 0;
  while (row < n) {
    let yy = py + row;
    if (yy < 32) {
      let addr = I + row & 4095;
      let sprite = mem[addr];
      let bit = 128;
      let col = 0;
      while (col < 8) {
        let xx = px + col;
        if (xx < 64) {
          if (sprite & bit) {
            let idx = yy * 64 + xx;
            if (gfx[idx] == 1) {
              V[15] = 1;
            }
            gfx[idx] = gfx[idx] ^ 1;
            drawFlag = 1;
          }
        }
        bit = bit >> 1;
        col++;
      }
    }
    row++;
  }
}

function execE() {
  let key = V[x] & 15;
  switch (kk) {
    case 158:
      if (keys[key] == 1) {
        pc = pc + 2 & 4095;
      }
      break;
    case 161:
      if (keys[key] == 0) {
        pc = pc + 2 & 4095;
      }
      break;
  }
}

function execF() {
  let val = 0;
  let r = 0;
  let addr = 0;
  switch (kk) {
    case 7:
      V[x] = delayTimer;
      break;
    case 10:
      waiting = 1;
      waitReg = x;
      break;
    case 21:
      delayTimer = V[x];
      break;
    case 24:
      soundTimer = V[x];
      break;
    case 30:
      I = I + V[x] & 4095;
      break;
    case 41:
      I = 80 + (V[x] & 15) * 5;
      break;
    case 51:
      val = V[x];
      mem[I] = Math.floor(val / 100);
      mem[I + 1] = Math.floor(val / 10) % 10;
      mem[I + 2] = val % 10;
      break;
    case 85:
      r = 0;
      while (r < x + 1) {
        addr = I + r & 4095;
        mem[addr] = V[r];
        r++;
      }
      I = I + x + 1 & 4095;
      break;
    case 101:
      r = 0;
      while (r < x + 1) {
        addr = I + r & 4095;
        V[r] = mem[addr];
        r++;
      }
      I = I + x + 1 & 4095;
      break;
  }
}

function step() {
  if (waiting == 1) {
    let k = 0;
    let found = -1;
    while (k < 16) {
      if (keys[k] == 1) {
        found = k;
      }
      k++;
    }
    if (found < 0) {
      return;
    }
    V[waitReg] = found;
    waiting = 0;
  }
  let hi = mem[pc];
  let lo = mem[pc + 1];
  pc = pc + 2 & 4095;
  op1 = hi >> 4;
  x = hi & 15;
  y = lo >> 4;
  n = lo & 15;
  kk = lo;
  nnn = (hi & 15) << 8 | lo;
  switch (op1) {
    case 0:
      exec0();
      break;
    case 1:
      pc = nnn;
      break;
    case 2:
      stack[sp] = pc;
      sp = sp + 1;
      pc = nnn;
      break;
    case 3:
      if (V[x] == kk) {
        pc = pc + 2 & 4095;
      }
      break;
    case 4:
      if (V[x] != kk) {
        pc = pc + 2 & 4095;
      }
      break;
    case 5:
      if (n == 0) {
        if (V[x] == V[y]) {
          pc = pc + 2 & 4095;
        }
      }
      break;
    case 6:
      V[x] = kk;
      break;
    case 7:
      V[x] = V[x] + kk & 255;
      break;
    case 8:
      exec8();
      break;
    case 9:
      if (n == 0) {
        if (V[x] != V[y]) {
          pc = pc + 2 & 4095;
        }
      }
      break;
    case 10:
      I = nnn;
      break;
    case 11:
      pc = nnn + V[0] & 4095;
      break;
    case 12:
      V[x] = Math.floor(Math.random() * 256) & kk;
      break;
    case 13:
      execD();
      break;
    case 14:
      execE();
      break;
    case 15:
      execF();
      break;
  }
}

function boot() {
  let i = 0;
  while (i < 4096) {
    mem.push(0);
    i++;
  }
  i = 0;
  while (i < 16) {
    V.push(0);
    stack.push(0);
    keys.push(0);
    i++;
  }
  i = 0;
  while (i < 2048) {
    gfx.push(0);
    prev.push(0);
    i++;
  }
  i = 0;
  while (i < font.length) {
    mem[80 + i] = font[i];
    i++;
  }
  i = 0;
  while (i < rom.length) {
    mem[512 + i] = rom[i];
    i++;
  }
  pc = 512;
  I = 0;
  sp = 0;
  delayTimer = 0;
  soundTimer = 0;
  waiting = 0;
  hide();
  pointInDirection(90);
  pen.clear();
  fillBg();
}

boot();
while (true) {
  keys[4] = 0;
  keys[5] = 0;
  keys[6] = 0;
  if (keyPressed("left arrow")) {
    keys[4] = 1;
  }
  if (keyPressed("a")) {
    keys[4] = 1;
  }
  if (keyPressed("4")) {
    keys[4] = 1;
  }
  if (keyPressed("right arrow")) {
    keys[6] = 1;
  }
  if (keyPressed("d")) {
    keys[6] = 1;
  }
  if (keyPressed("6")) {
    keys[6] = 1;
  }
  if (keyPressed("space")) {
    keys[5] = 1;
  }
  if (keyPressed("w")) {
    keys[5] = 1;
  }
  if (keyPressed("5")) {
    keys[5] = 1;
  }
  if (keys[4] == 0) {
    if (keys[5] == 0) {
      if (keys[6] == 0) {
        autoplay();
      }
    }
  }
  let nstep = 0;
  while (nstep < 10) {
    step();
    nstep++;
  }
  if (delayTimer > 0) {
    delayTimer = delayTimer - 1;
  }
  if (soundTimer > 0) {
    soundTimer = soundTimer - 1;
  }
  if (drawFlag == 1) {
    render();
  }
  if (clsFlag == 1) {
    render();
  }
  wait(0);
}
