// Textured software 3D engine (scanline rasterizer + z-buffer).
// Green flag: walk a cobblestone plaza with buildings, crates, and a pyramid.
// Controls: WASD move, arrows look, Q/E or space/shift up/down.
//
// Display is 480x360 (native stage). Internal buffer is W x H; each pixel is
// pixelStep stage units (W * pixelStep should be 480). Aimed at TurboWarp.
// Textures are TEX x TEX. Scratch Math.sin/cos/tan are degrees.

let W = 240;
let H = 180;
let pixelStep = 2;
let gfxLen = 43200;
let TEX = 64;
let uvPerUnit = 16;
let nearZ = 0.2;
let fov = 57;
let playerR = 0.45;
let bodyDown = 1.5;
let bodyUp = 0.2;

let T_COBBLE = 0;
let T_BRICK = 1;
let T_PLASTER = 2;
let T_CRATE = 3;
let T_SAND = 4;
let T_ROOF = 5;
let T_WOOD = 6;

let vx = [];
let vy = [];
let vz = [];
let i0 = [];
let i1 = [];
let i2 = [];
let u0 = [];
let v0 = [];
let u1 = [];
let v1 = [];
let u2 = [];
let v2 = [];
let texId = [];
let shade = [];
let cx = [];
let cy = [];
let cz = [];
let sx = [];
let sy = [];
let rhw = [];
let tr = [];
let tg = [];
let tb = [];
let texOff = [];
let zbuf = [];
let HEX = "0123456789ABCDEF";

let camX = 0;
let camY = 1.7;
let camZ = -6;
let yaw = 0;
let pitch = 0;
let moveSpeed = 0.22;
let turnSpeed = 3.5;
let sunX = -0.35;
let sunY = 0.85;
let sunZ = 0.4;
let lastVi = 0;
let fi = 0;
let curTex = 0;
let curShade = 1;

let rAx = 0;
let rAy = 0;
let rAw = 0;
let rAuz = 0;
let rAvz = 0;
let rBx = 0;
let rBy = 0;
let rBw = 0;
let rBuz = 0;
let rBvz = 0;
let rCx = 0;
let rCy = 0;
let rCw = 0;
let rCuz = 0;
let rCvz = 0;

let p0x = 0;
let p0y = 0;
let p0w = 0;
let p0uz = 0;
let p0vz = 0;
let p1x = 0;
let p1y = 0;
let p1w = 0;
let p1uz = 0;
let p1vz = 0;
let p2x = 0;
let p2y = 0;
let p2w = 0;
let p2uz = 0;
let p2vz = 0;

let eX = 0;
let eW = 0;
let eUz = 0;
let eVz = 0;
let xL = 0;
let xR = 0;
let wL = 0;
let wR = 0;
let uzL = 0;
let uzR = 0;
let vzL = 0;
let vzR = 0;
let spanX = 0;
let spanY = 0;
let spanLen = 0;
let spanColor = 0;
let fps = 0;
let fpsFrames = 0;
let fpsStamp = 0;

let clipX = [];
let clipY = [];
let clipZ = [];
let clipU = [];
let clipV = [];
let clipCount = 0;


function texPush(r, g, b) {
  if (r < 0) {
    r = 0;
  }
  if (r > 255) {
    r = 255;
  }
  if (g < 0) {
    g = 0;
  }
  if (g > 255) {
    g = 255;
  }
  if (b < 0) {
    b = 0;
  }
  if (b > 255) {
    b = 255;
  }
  tr.push(Math.floor(r));
  tg.push(Math.floor(g));
  tb.push(Math.floor(b));
}

function texRand(x, y, m) {
  let n = x * 1664525 + y * 22695477;
  n = n + x * y * 13 + 1013904223;
  if (n < 0) {
    n = 0 - n;
  }
  return n % m;
}

function texVal(x, y) {
  let x0 = Math.floor(x);
  let y0 = Math.floor(y);
  let fx = x - x0;
  let fy = y - y0;
  let a = texRand(x0, y0, 256);
  let b = texRand(x0 + 1, y0, 256);
  let c = texRand(x0, y0 + 1, 256);
  let d = texRand(x0 + 1, y0 + 1, 256);
  let n0 = a + (b - a) * fx;
  let n1 = c + (d - c) * fx;
  return n0 + (n1 - n0) * fy;
}

function genCobble() {
  texOff.push(tr.length);
  let cell = 16;
  let ncell = Math.floor(TEX / cell);
  let y = 0;
  while (y < TEX) {
    let x = 0;
    while (x < TEX) {
      let gx = Math.floor(x / cell);
      let gy = Math.floor(y / cell);
      let best = 99999;
      let best2 = 99999;
      let bestId = 0;
      let oy = -1;
      while (oy <= 1) {
        let ox = -1;
        while (ox <= 1) {
          let hx = gx + ox;
          let hy = gy + oy;
          let wx = hx % ncell;
          if (wx < 0) {
            wx = wx + ncell;
          }
          let wy = hy % ncell;
          if (wy < 0) {
            wy = wy + ncell;
          }
          let jx = texRand(wx, wy, cell);
          let jy = texRand(wx + 19, wy + 41, cell);
          let px = hx * cell + jx * 0.65 + cell * 0.18;
          let py = hy * cell + jy * 0.65 + cell * 0.18;
          let dx = x - px;
          let dy = y - py;
          let dist = dx * dx + dy * dy;
          if (dist < best) {
            best2 = best;
            best = dist;
            bestId = wx * 17 + wy;
          } else {
            if (dist < best2) {
              best2 = dist;
            }
          }
          ox++;
        }
        oy++;
      }
      let edge = Math.sqrt(best2) - Math.sqrt(best);
      let grit = texRand(x, y, 18);
      let tone = texRand(bestId, 3, 36);
      if (edge < 2.2) {
        texPush(78 + grit, 76 + grit, 72 + grit);
      } else {
        let r = 118 + tone + grit;
        let g = 112 + tone * 0.8 + grit;
        let b = 104 + tone * 0.5 + grit / 2;
        if (edge < 4.5) {
          r = r - 22;
          g = g - 22;
          b = b - 20;
        }
        texPush(r, g, b);
      }
      x++;
    }
    y++;
  }
}

function genBrick() {
  texOff.push(tr.length);
  let bw = 32;
  let bh = 16;
  let mortar = 3;
  let y = 0;
  while (y < TEX) {
    let x = 0;
    while (x < TEX) {
      let row = Math.floor(y / bh);
      let off = 0;
      if (row % 2 == 1) {
        off = bw / 2;
      }
      let lx = (x + off) % bw;
      let ly = y % bh;
      let bid = row * 31 + Math.floor((x + off) / bw);
      let grit = texRand(x, y, 14);
      if (lx < mortar) {
        texPush(196 + grit, 188 + grit, 172 + grit / 2);
      } else {
        if (ly < mortar) {
          texPush(196 + grit, 188 + grit, 172 + grit / 2);
        } else {
          let tone = texRand(bid, 9, 28);
          let r = 142 + tone + grit;
          let g = 54 + tone * 0.35 + grit / 2;
          let b = 38 + grit / 3;
          if (lx < mortar + 2) {
            r = r - 28;
            g = g - 14;
            b = b - 8;
          }
          if (ly < mortar + 2) {
            r = r + 26;
            g = g + 14;
            b = b + 8;
          }
          if (lx > bw - 3) {
            r = r - 22;
            g = g - 12;
          }
          if (ly > bh - 3) {
            r = r - 30;
            g = g - 16;
            b = b - 8;
          }
          texPush(r, g, b);
        }
      }
      x++;
    }
    y++;
  }
}

function genPlaster() {
  texOff.push(tr.length);
  let y = 0;
  while (y < TEX) {
    let x = 0;
    while (x < TEX) {
      let blot = texVal(x / 10, y / 12);
      let fine = texVal(x / 2.2, y / 2.2);
      let r = 208 + blot / 8 + fine / 18;
      let g = 192 + blot / 10 + fine / 20;
      let b = 164 + blot / 14;
      if (y > TEX - 18) {
        r = r - 22;
        g = g - 24;
        b = b - 18;
      }
      let crackRow = Math.floor(y / 22);
      if (texRand(Math.floor(x / 3), crackRow, 50) < 4) {
        if (Math.abs(y % 22 - 11) < 1.2) {
          r = r - 40;
          g = g - 38;
          b = b - 30;
        }
      }
      texPush(r, g, b);
      x++;
    }
    y++;
  }
}

function genCrate() {
  texOff.push(tr.length);
  let edge = Math.floor(TEX * 10 / 128);
  if (edge < 3) {
    edge = 3;
  }
  let brace = Math.floor(TEX * 6 / 128);
  if (brace < 2) {
    brace = 2;
  }
  let plank = Math.floor(TEX * 28 / 128);
  if (plank < 8) {
    plank = 8;
  }
  let bolt = Math.floor(TEX * 32 / 128);
  if (bolt < 8) {
    bolt = 8;
  }
  let hole = Math.floor(TEX * 6 / 128);
  if (hole < 2) {
    hole = 2;
  }
  let y = 0;
  while (y < TEX) {
    let x = 0;
    while (x < TEX) {
      let grain = texRand(Math.floor(x / 2), y, 22);
      let wave = texVal(x / 7, y / 1.6);
      let r = 158 + grain + wave / 16;
      let g = 108 + grain * 0.7 + wave / 22;
      let b = 54 + grain / 4;
      if ((y - edge) % plank < 3) {
        if (y > edge) {
          if (y < TEX - edge) {
            r = 96;
            g = 62;
            b = 30;
          }
        }
      }
      let d1 = Math.abs(x - y);
      let d2 = Math.abs(x - (TEX - 1 - y));
      if (d1 < brace) {
        r = 72 + grain / 3;
        g = 48 + grain / 4;
        b = 24;
      }
      if (d2 < brace) {
        r = 72 + grain / 3;
        g = 48 + grain / 4;
        b = 24;
      }
      if (x < edge) {
        r = 118;
        g = 118;
        b = 124;
      }
      if (x > TEX - 1 - edge) {
        r = 118;
        g = 118;
        b = 124;
      }
      if (y < edge) {
        r = 118;
        g = 118;
        b = 124;
      }
      if (y > TEX - 1 - edge) {
        r = 118;
        g = 118;
        b = 124;
      }
      if (x < edge) {
        if (y % bolt < hole) {
          if (y % bolt > 1) {
            r = 72;
            g = 74;
            b = 80;
          }
        }
      }
      if (x > TEX - 1 - edge) {
        if (y % bolt < hole) {
          if (y % bolt > 1) {
            r = 72;
            g = 74;
            b = 80;
          }
        }
      }
      if (y < edge) {
        if (x % bolt < hole) {
          if (x % bolt > 1) {
            r = 72;
            g = 74;
            b = 80;
          }
        }
      }
      if (y > TEX - 1 - edge) {
        if (x % bolt < hole) {
          if (x % bolt > 1) {
            r = 72;
            g = 74;
            b = 80;
          }
        }
      }
      texPush(r, g, b);
      x++;
    }
    y++;
  }
}

function genSand() {
  texOff.push(tr.length);
  let y = 0;
  while (y < TEX) {
    let x = 0;
    while (x < TEX) {
      let band = Math.floor(y / 10);
      let shift = texRand(band, 2, 18);
      let grit = texRand(x, y, 16);
      let strata = texVal(x / 9, y / 18);
      let r = 186 + shift + grit + strata / 14;
      let g = 148 + shift * 0.6 + grit + strata / 18;
      let b = 86 + grit / 2;
      if (y % 10 == 0) {
        r = r - 24;
        g = g - 20;
        b = b - 12;
      }
      if (texRand(x, y, 80) < 3) {
        r = r - 35;
        g = g - 30;
        b = b - 18;
      }
      texPush(r, g, b);
      x++;
    }
    y++;
  }
}

function genRoof() {
  texOff.push(tr.length);
  let tw = 16;
  let th = 12;
  let y = 0;
  while (y < TEX) {
    let x = 0;
    while (x < TEX) {
      let row = Math.floor(y / th);
      let off = 0;
      if (row % 2 == 1) {
        off = tw / 2;
      }
      let lx = (x + off) % tw;
      let ly = y % th;
      let tid = row * 29 + Math.floor((x + off) / tw);
      let tone = texRand(tid, 4, 22);
      let grit = texRand(x, y, 10);
      let r = 168 + tone + grit;
      let g = 64 + tone * 0.4 + grit / 2;
      let b = 48 + grit / 3;
      if (ly < 3) {
        r = r + 28;
        g = g + 12;
        b = b + 8;
      }
      if (ly > th - 3) {
        r = r - 36;
        g = g - 16;
        b = b - 10;
      }
      if (lx < 2) {
        r = r - 40;
        g = g - 18;
        b = b - 12;
      }
      if (lx > tw - 2) {
        r = r - 18;
        g = g - 8;
      }
      texPush(r, g, b);
      x++;
    }
    y++;
  }
}

function genWood() {
  texOff.push(tr.length);
  let y = 0;
  while (y < TEX) {
    let x = 0;
    while (x < TEX) {
      let plank = Math.floor(x / 18);
      let lx = x % 18;
      let grain = texRand(plank, y, 20);
      let wave = texVal(plank * 3 + x / 20, y / 2.4);
      let r = 108 + grain + wave / 12;
      let g = 68 + grain * 0.65 + wave / 18;
      let b = 32 + grain / 4;
      if (lx < 2) {
        r = 62;
        g = 38;
        b = 18;
      }
      if (texRand(plank, Math.floor(y / 9), 70) < 3) {
        if (Math.abs(lx - 9) < 3) {
          r = r - 18;
          g = g - 12;
        }
      }
      texPush(r, g, b);
      x++;
    }
    y++;
  }
}

function initTextures() {
  genCobble();
  genBrick();
  genPlaster();
  genCrate();
  genSand();
  genRoof();
  genWood();
}

function addVert(x, y, z) {
  vx.push(x);
  vy.push(y);
  vz.push(z);
  lastVi = vx.length - 1;
}

function addTri(a, b, c, ua, va, ub, vb, uc, vc, t) {
  i0.push(a);
  i1.push(b);
  i2.push(c);
  u0.push(ua);
  v0.push(va);
  u1.push(ub);
  v1.push(vb);
  u2.push(uc);
  v2.push(vc);
  texId.push(t);
  let e1x = vx[b] - vx[a];
  let e1y = vy[b] - vy[a];
  let e1z = vz[b] - vz[a];
  let e2x = vx[c] - vx[a];
  let e2y = vy[c] - vy[a];
  let e2z = vz[c] - vz[a];
  let nx = e1y * e2z - e1z * e2y;
  let ny = e1z * e2x - e1x * e2z;
  let nz = e1x * e2y - e1y * e2x;
  let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  let sh = 0.45;
  if (len > 0.0001) {
    nx = nx / len;
    ny = ny / len;
    nz = nz / len;
    let nd = nx * sunX + ny * sunY + nz * sunZ;
    if (nd < 0) {
      nd = 0;
    }
    sh = 0.42 + 0.58 * nd;
  }
  shade.push(sh);
}

function addQuadUV(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, t, uu, vv) {
  addVert(x0, y0, z0);
  let a = lastVi;
  addVert(x1, y1, z1);
  let b = lastVi;
  addVert(x2, y2, z2);
  let c = lastVi;
  addVert(x3, y3, z3);
  let d = lastVi;
  addTri(a, b, c, 0, vv, uu, vv, uu, 0, t);
  addTri(a, c, d, 0, vv, uu, 0, 0, 0, t);
}

function addBox(x, y, z, w, h, d, tWall, tTop) {
  let x0 = x;
  let y0 = y;
  let z0 = z;
  let x1 = x + w;
  let y1 = y + h;
  let z1 = z + d;
  let uuW = w * uvPerUnit;
  let uuH = h * uvPerUnit;
  let uuD = d * uvPerUnit;
  if (tWall == T_CRATE) {
    uuW = TEX;
    uuH = TEX;
    uuD = TEX;
  }
  let uuTopW = w * uvPerUnit;
  let uuTopD = d * uvPerUnit;
  if (tTop == T_CRATE) {
    uuTopW = TEX;
    uuTopD = TEX;
  }
  addQuadUV(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, tWall, uuW, uuH);
  addQuadUV(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, tWall, uuW, uuH);
  addQuadUV(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1, tWall, uuD, uuH);
  addQuadUV(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, tWall, uuD, uuH);
  addQuadUV(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0, tTop, uuTopW, uuTopD);
}

function addPyramid(x, y, z, w, h, t) {
  let hw = w / 2;
  addVert(x, y + h, z);
  let apex = lastVi;
  addVert(x - hw, y, z - hw);
  let b0 = lastVi;
  addVert(x + hw, y, z - hw);
  let b1 = lastVi;
  addVert(x + hw, y, z + hw);
  let b2 = lastVi;
  addVert(x - hw, y, z + hw);
  let b3 = lastVi;
  addTri(b0, apex, b1, 0, TEX, TEX / 2, 0, TEX, TEX, t);
  addTri(b1, apex, b2, 0, TEX, TEX / 2, 0, TEX, TEX, t);
  addTri(b2, apex, b3, 0, TEX, TEX / 2, 0, TEX, TEX, t);
  addTri(b3, apex, b0, 0, TEX, TEX / 2, 0, TEX, TEX, t);
}

function addGround() {
  let gz = 0;
  while (gz < 4) {
    let gx = 0;
    while (gx < 4) {
      let x0 = -10 + gx * 5;
      let z0 = -8 + gz * 5;
      let x1 = x0 + 5;
      let z1 = z0 + 5;
      addQuadUV(x0, 0, z1, x1, 0, z1, x1, 0, z0, x0, 0, z0, T_COBBLE, 5 * uvPerUnit, 5 * uvPerUnit);
      gx++;
    }
    gz++;
  }
}

function buildScene() {
  addGround();
  addBox(-9, 0, 4, 4, 6, 4, T_BRICK, T_ROOF);
  addQuadUV(-7.4, 0, 8.04, -6.2, 0, 8.04, -6.2, 2.4, 8.04, -7.4, 2.4, 8.04, T_WOOD, TEX, TEX);
  addBox(5.2, 0, 3.5, 4.5, 5, 4, T_PLASTER, T_ROOF);
  addBox(-4, 0, 9, 8, 7, 3, T_BRICK, T_ROOF);
  addBox(1.4, 0, 0.4, 1.2, 1.2, 1.2, T_CRATE, T_CRATE);
  addBox(-1.6, 0, 1.6, 1, 1, 1, T_CRATE, T_CRATE);
  addPyramid(2.4, 0, 6.2, 3.2, 3.4, T_SAND);
}

function allocFrame() {
  let n = vx.length;
  while (cx.length < n) {
    cx.push(0);
    cy.push(0);
    cz.push(0);
    sx.push(0);
    sy.push(0);
    rhw.push(0);
  }
  gfxLen = W * H;
  while (zbuf.length < gfxLen) {
    zbuf.push(0);
  }
  while (clipX.length < 8) {
    clipX.push(0);
    clipY.push(0);
    clipZ.push(0);
    clipU.push(0);
    clipV.push(0);
  }
}

function fillSky() {
  let gy = 180;
  let band = 0;
  while (gy > -180) {
    if (band < 2) {
      pen.setColor(7259381);
    } else {
      if (band < 4) {
        pen.setColor(9359607);
      } else {
        pen.setColor(12117242);
      }
    }
    pen.setSize(50);
    goTo(-240, gy);
    pen.down();
    goTo(240, gy);
    pen.up();
    gy = gy - 40;
    band = band + 1;
  }
  pen.setSize(Math.max(pixelStep, 2));
}

function clearZ() {
  let zi = 0;
  while (zi < gfxLen) {
    zbuf[zi] = 0;
    zi++;
  }
}

function plotSpan() {
  goTo(spanX * pixelStep - 240 + pixelStep / 2, 180 - spanY * pixelStep - pixelStep / 2);
  pen.setColor(spanColor);
  pen.down();
  if (spanLen <= 1) {
    changeX(1);
  } else {
    changeX((spanLen - 1) * pixelStep);
  }
  pen.up();
}

function drawCrosshair() {
  pen.setColor(0);
  pen.setSize(2);
  goTo(-8, 0);
  pen.down();
  goTo(8, 0);
  pen.up();
  goTo(0, -8);
  pen.down();
  goTo(0, 8);
  pen.up();
  pen.setSize(Math.max(pixelStep, 2));
}

function interpEdge(x0, y0, w0, uz0, vz0, x1, y1, w1, uz1, vz1, y) {
  let dy = y1 - y0;
  if (Math.abs(dy) < 0.0001) {
    eX = x0;
    eW = w0;
    eUz = uz0;
    eVz = vz0;
    return;
  }
  let t = (y - y0) / dy;
  eX = x0 + (x1 - x0) * t;
  eW = w0 + (w1 - w0) * t;
  eUz = uz0 + (uz1 - uz0) * t;
  eVz = vz0 + (vz1 - vz0) * t;
}

function swapP0P1() {
  let tmp = p0x;
  p0x = p1x;
  p1x = tmp;
  tmp = p0y;
  p0y = p1y;
  p1y = tmp;
  tmp = p0w;
  p0w = p1w;
  p1w = tmp;
  tmp = p0uz;
  p0uz = p1uz;
  p1uz = tmp;
  tmp = p0vz;
  p0vz = p1vz;
  p1vz = tmp;
}

function swapP1P2() {
  let tmp = p1x;
  p1x = p2x;
  p2x = tmp;
  tmp = p1y;
  p1y = p2y;
  p2y = tmp;
  tmp = p1w;
  p1w = p2w;
  p2w = tmp;
  tmp = p1uz;
  p1uz = p2uz;
  p2uz = tmp;
  tmp = p1vz;
  p1vz = p2vz;
  p2vz = tmp;
}

function drawSpan() {
  let x0 = Math.floor(xL);
  let x1 = Math.floor(xR);
  if (x0 < 0) {
    x0 = 0;
  }
  if (x1 > W - 1) {
    x1 = W - 1;
  }
  if (x0 > x1) {
    return;
  }
  let dx = xR - xL;
  let x = x0;
  let have = 0;
  spanLen = 0;
  spanX = x0;
  while (x <= x1) {
    let t = 0;
    if (Math.abs(dx) > 0.0001) {
      t = (x + 0.5 - xL) / dx;
    }
    let rhwP = wL + (wR - wL) * t;
    let zi = spanY * W + x;
    if (rhwP > zbuf[zi]) {
      zbuf[zi] = rhwP;
      let uz = uzL + (uzR - uzL) * t;
      let vz = vzL + (vzR - vzL) * t;
      let u = 0;
      let v = 0;
      if (Math.abs(rhwP) > 0.0000001) {
        u = uz / rhwP;
        v = vz / rhwP;
      }
      let tx = Math.floor(u) % TEX;
      if (tx < 0) {
        tx = tx + TEX;
      }
      let ty = Math.floor(v) % TEX;
      if (ty < 0) {
        ty = ty + TEX;
      }
      let idx = texOff[curTex] + ty * TEX + tx;
      let sr = Math.floor(tr[idx] * curShade);
      let sg = Math.floor(tg[idx] * curShade);
      let sb = Math.floor(tb[idx] * curShade);
      let col = (sr * 65536) + (sg * 256) + sb;
      if (have == 1) {
        if (col == spanColor) {
          spanLen = spanLen + 1;
        } else {
          plotSpan();
          spanX = x;
          spanLen = 1;
          spanColor = col;
        }
      } else {
        have = 1;
        spanX = x;
        spanLen = 1;
        spanColor = col;
      }
    } else {
      if (have == 1) {
        plotSpan();
        have = 0;
      }
    }
    x++;
  }
  if (have == 1) {
    plotSpan();
  }
}

function rasterTri() {
  p0x = rAx;
  p0y = rAy;
  p0w = rAw;
  p0uz = rAuz;
  p0vz = rAvz;
  p1x = rBx;
  p1y = rBy;
  p1w = rBw;
  p1uz = rBuz;
  p1vz = rBvz;
  p2x = rCx;
  p2y = rCy;
  p2w = rCw;
  p2uz = rCuz;
  p2vz = rCvz;
  if (p0y > p1y) {
    swapP0P1();
  }
  if (p1y > p2y) {
    swapP1P2();
  }
  if (p0y > p1y) {
    swapP0P1();
  }
  if (p2y < p0y + 0.5) {
    return;
  }
  let y = Math.floor(p0y);
  if (y < 0) {
    y = 0;
  }
  let yEnd = Math.floor(p2y);
  if (yEnd > H - 1) {
    yEnd = H - 1;
  }
  while (y <= yEnd) {
    let yc = y + 0.5;
    if (yc >= p0y) {
      if (yc <= p2y) {
        interpEdge(p0x, p0y, p0w, p0uz, p0vz, p2x, p2y, p2w, p2uz, p2vz, yc);
        xL = eX;
        wL = eW;
        uzL = eUz;
        vzL = eVz;
        if (yc < p1y) {
          interpEdge(p0x, p0y, p0w, p0uz, p0vz, p1x, p1y, p1w, p1uz, p1vz, yc);
        } else {
          interpEdge(p1x, p1y, p1w, p1uz, p1vz, p2x, p2y, p2w, p2uz, p2vz, yc);
        }
        xR = eX;
        wR = eW;
        uzR = eUz;
        vzR = eVz;
        if (xL > xR) {
          let tmp = xL;
          xL = xR;
          xR = tmp;
          tmp = wL;
          wL = wR;
          wR = tmp;
          tmp = uzL;
          uzL = uzR;
          uzR = tmp;
          tmp = vzL;
          vzL = vzR;
          vzR = tmp;
        }
        spanY = y;
        drawSpan();
      }
    }
    y++;
  }
}

function clipEmit(x, y, z, u, v) {
  clipX[clipCount] = x;
  clipY[clipCount] = y;
  clipZ[clipCount] = z;
  clipU[clipCount] = u;
  clipV[clipCount] = v;
  clipCount = clipCount + 1;
}

function clipSeg(ax, ay, az, au, av, bx, by, bz, bu, bv) {
  let aIn = 0;
  let bIn = 0;
  let t = 0;
  if (az >= nearZ) {
    aIn = 1;
  }
  if (bz >= nearZ) {
    bIn = 1;
  }
  if (aIn == 1) {
    if (bIn == 1) {
      clipEmit(bx, by, bz, bu, bv);
    } else {
      t = (nearZ - az) / (bz - az);
      clipEmit(ax + (bx - ax) * t, ay + (by - ay) * t, nearZ, au + (bu - au) * t, av + (bv - av) * t);
    }
  } else {
    if (bIn == 1) {
      t = (nearZ - az) / (bz - az);
      clipEmit(ax + (bx - ax) * t, ay + (by - ay) * t, nearZ, au + (bu - au) * t, av + (bv - av) * t);
      clipEmit(bx, by, bz, bu, bv);
    }
  }
}

function loadRasterA(i) {
  let w = 1 / clipZ[i];
  rAx = clipX[i] * w * fov + W / 2;
  rAy = H / 2 - clipY[i] * w * fov;
  rAw = w;
  rAuz = clipU[i] * w;
  rAvz = clipV[i] * w;
}

function loadRasterB(i) {
  let w = 1 / clipZ[i];
  rBx = clipX[i] * w * fov + W / 2;
  rBy = H / 2 - clipY[i] * w * fov;
  rBw = w;
  rBuz = clipU[i] * w;
  rBvz = clipV[i] * w;
}

function loadRasterC(i) {
  let w = 1 / clipZ[i];
  rCx = clipX[i] * w * fov + W / 2;
  rCy = H / 2 - clipY[i] * w * fov;
  rCw = w;
  rCuz = clipU[i] * w;
  rCvz = clipV[i] * w;
}

function rasterClipped() {
  if (clipCount < 3) {
    return;
  }
  loadRasterA(0);
  let k = 1;
  while (k + 1 < clipCount) {
    loadRasterB(k);
    loadRasterC(k + 1);
    let minx = rAx;
    if (rBx < minx) {
      minx = rBx;
    }
    if (rCx < minx) {
      minx = rCx;
    }
    let maxx = rAx;
    if (rBx > maxx) {
      maxx = rBx;
    }
    if (rCx > maxx) {
      maxx = rCx;
    }
    let miny = rAy;
    if (rBy < miny) {
      miny = rBy;
    }
    if (rCy < miny) {
      miny = rCy;
    }
    let maxy = rAy;
    if (rBy > maxy) {
      maxy = rBy;
    }
    if (rCy > maxy) {
      maxy = rCy;
    }
    if (maxx >= 0) {
      if (minx < W) {
        if (maxy >= 0) {
          if (miny < H) {
            rasterTri();
          }
        }
      }
    }
    k++;
  }
}

function drawFace() {
  let ia = i0[fi];
  let ib = i1[fi];
  let ic = i2[fi];
  let e1x = cx[ib] - cx[ia];
  let e1y = cy[ib] - cy[ia];
  let e1z = cz[ib] - cz[ia];
  let e2x = cx[ic] - cx[ia];
  let e2y = cy[ic] - cy[ia];
  let e2z = cz[ic] - cz[ia];
  let nx = e1y * e2z - e1z * e2y;
  let ny = e1z * e2x - e1x * e2z;
  let nz = e1x * e2y - e1y * e2x;
  let dp = nx * cx[ia] + ny * cy[ia] + nz * cz[ia];
  if (dp >= 0) {
    return;
  }
  curTex = texId[fi];
  curShade = shade[fi];
  if (cz[ia] >= nearZ) {
    if (cz[ib] >= nearZ) {
      if (cz[ic] >= nearZ) {
        rAx = sx[ia];
        rAy = sy[ia];
        rAw = rhw[ia];
        rAuz = u0[fi] * rAw;
        rAvz = v0[fi] * rAw;
        rBx = sx[ib];
        rBy = sy[ib];
        rBw = rhw[ib];
        rBuz = u1[fi] * rBw;
        rBvz = v1[fi] * rBw;
        rCx = sx[ic];
        rCy = sy[ic];
        rCw = rhw[ic];
        rCuz = u2[fi] * rCw;
        rCvz = v2[fi] * rCw;
        drawProjected();
        return;
      }
    }
  }
  clipCount = 0;
  clipSeg(cx[ia], cy[ia], cz[ia], u0[fi], v0[fi], cx[ib], cy[ib], cz[ib], u1[fi], v1[fi]);
  clipSeg(cx[ib], cy[ib], cz[ib], u1[fi], v1[fi], cx[ic], cy[ic], cz[ic], u2[fi], v2[fi]);
  clipSeg(cx[ic], cy[ic], cz[ic], u2[fi], v2[fi], cx[ia], cy[ia], cz[ia], u0[fi], v0[fi]);
  rasterClipped();
}

function drawProjected() {
  let minx = rAx;
  if (rBx < minx) {
    minx = rBx;
  }
  if (rCx < minx) {
    minx = rCx;
  }
  let maxx = rAx;
  if (rBx > maxx) {
    maxx = rBx;
  }
  if (rCx > maxx) {
    maxx = rCx;
  }
  let miny = rAy;
  if (rBy < miny) {
    miny = rBy;
  }
  if (rCy < miny) {
    miny = rCy;
  }
  let maxy = rAy;
  if (rBy > maxy) {
    maxy = rBy;
  }
  if (rCy > maxy) {
    maxy = rCy;
  }
  if (maxx < 0) {
    return;
  }
  if (minx >= W) {
    return;
  }
  if (maxy < 0) {
    return;
  }
  if (miny >= H) {
    return;
  }
  rasterTri();
}

function transformVerts() {
  let cY = Math.cos(yaw);
  let sY = Math.sin(yaw);
  let cP = Math.cos(pitch);
  let sP = Math.sin(pitch);
  let i = 0;
  let n = vx.length;
  while (i < n) {
    let dx = vx[i] - camX;
    let dy = vy[i] - camY;
    let dz = vz[i] - camZ;
    let tx = dx * cY - dz * sY;
    let tz = dx * sY + dz * cY;
    let ty = dy;
    let ty2 = ty * cP - tz * sP;
    let tz2 = ty * sP + tz * cP;
    cx[i] = tx;
    cy[i] = ty2;
    cz[i] = tz2;
    if (tz2 < 0.001) {
      rhw[i] = 0;
      sx[i] = 0;
      sy[i] = 0;
    } else {
      rhw[i] = 1 / tz2;
      sx[i] = tx * rhw[i] * fov + W / 2;
      sy[i] = H / 2 - ty2 * rhw[i] * fov;
    }
    i++;
  }
}

function drawMesh() {
  let f = 0;
  let n = i0.length;
  while (f < n) {
    fi = f;
    drawFace();
    f++;
  }
}

function render() {
  fillSky();
  clearZ();
  transformVerts();
  drawMesh();
  drawCrosshair();
}

function blockAABB(x0, y0, z0, x1, y1, z1) {
  let ex0 = x0 - playerR;
  let ex1 = x1 + playerR;
  let ey0 = y0 - bodyUp;
  let ey1 = y1 + bodyDown;
  let ez0 = z0 - playerR;
  let ez1 = z1 + playerR;
  if (camX > ex0) {
    if (camX < ex1) {
      if (camY > ey0) {
        if (camY < ey1) {
          if (camZ > ez0) {
            if (camZ < ez1) {
              let pL = camX - ex0;
              let pR = ex1 - camX;
              let pDn = camY - ey0;
              let pUp = ey1 - camY;
              let pB = camZ - ez0;
              let pF = ez1 - camZ;
              let m = pL;
              let side = 0;
              if (pR < m) {
                m = pR;
                side = 1;
              }
              if (pB < m) {
                m = pB;
                side = 2;
              }
              if (pF < m) {
                m = pF;
                side = 3;
              }
              if (pDn < m) {
                m = pDn;
                side = 4;
              }
              if (pUp < m) {
                m = pUp;
                side = 5;
              }
              if (side == 0) {
                camX = ex0;
              }
              if (side == 1) {
                camX = ex1;
              }
              if (side == 2) {
                camZ = ez0;
              }
              if (side == 3) {
                camZ = ez1;
              }
              if (side == 4) {
                camY = ey0;
              }
              if (side == 5) {
                camY = ey1;
              }
            }
          }
        }
      }
    }
  }
}

function collide() {
  if (camX < -9.4) {
    camX = -9.4;
  }
  if (camX > 9.4) {
    camX = 9.4;
  }
  if (camZ < -7.4) {
    camZ = -7.4;
  }
  if (camZ > 11.4) {
    camZ = 11.4;
  }
  if (camY < 0.35) {
    camY = 0.35;
  }
  if (camY > 8) {
    camY = 8;
  }
  blockAABB(-9, 0, 4, -5, 6, 8);
  blockAABB(5.2, 0, 3.5, 9.7, 5, 7.5);
  blockAABB(-4, 0, 9, 4, 7, 12);
  blockAABB(1.4, 0, 0.4, 2.6, 1.2, 1.6);
  blockAABB(-1.6, 0, 1.6, -0.6, 1, 2.6);
  blockAABB(0.8, 0, 4.6, 4, 3.4, 7.8);
}

function updateCam() {
  if (keyPressed("left arrow")) {
    yaw = yaw - turnSpeed;
  }
  if (keyPressed("right arrow")) {
    yaw = yaw + turnSpeed;
  }
  if (keyPressed("up arrow")) {
    pitch = pitch + turnSpeed;
  }
  if (keyPressed("down arrow")) {
    pitch = pitch - turnSpeed;
  }
  if (pitch > 70) {
    pitch = 70;
  }
  if (pitch < -70) {
    pitch = -70;
  }
  let fx = Math.sin(yaw);
  let fz = Math.cos(yaw);
  if (keyPressed("w")) {
    camX = camX + fx * moveSpeed;
    camZ = camZ + fz * moveSpeed;
  }
  if (keyPressed("s")) {
    camX = camX - fx * moveSpeed;
    camZ = camZ - fz * moveSpeed;
  }
  if (keyPressed("a")) {
    camX = camX - fz * moveSpeed;
    camZ = camZ + fx * moveSpeed;
  }
  if (keyPressed("d")) {
    camX = camX + fz * moveSpeed;
    camZ = camZ - fx * moveSpeed;
  }
  if (keyPressed("q") || keyPressed("shift")) {
    camY = camY - moveSpeed;
  }
  if (keyPressed("e") || keyPressed("space")) {
    camY = camY + moveSpeed;
  }
  collide();
}

function tickFps() {
  fpsFrames = fpsFrames + 1;
  let now = timer();
  let dt = now - fpsStamp;
  if (dt >= 1) {
    fps = Math.round(fpsFrames / dt * 10) / 10;
    fpsFrames = 0;
    fpsStamp = now;
  }
}

function boot() {
  fov = W / 2 / Math.tan(35);
  hide();
  pointInDirection(90);
  pen.clear();
  pen.setSize(Math.max(pixelStep, 2));
  initTextures();
  buildScene();
  allocFrame();
  console.log("WASD move, arrows look, Q/E up/down");
  resetTimer();
  fpsStamp = 0;
  fpsFrames = 0;
  fps = 0;
  showVariable("fps");
}

boot();
while (true) {
  updateCam();
  render();
  tickFps();
  wait(0);
}
