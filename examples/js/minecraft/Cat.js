// js2scratch Minecraft (TurboWarp). Scanline voxels + survival.
// WASD move, arrows look, space jump, shift sneak.
// F mine, R place/use/eat, E inventory, 1-9 hotbar, P settings.
// Inventory: click slots to pick up / place (shift-click or R-click moves one).
// Hold R or Shift and drag across slots to spread one item into each.
// Arrows still move the cursor, F take/put, R one, C craft, E close.
// World size is set in Settings and applies the next time you press Play.
//
// Display: Scratch stage is 480x360. Change SCALE and DRAW_FAT_PEN only.
//   SCALE        stage pixels per framebuffer pixel.
//                1=480x360  2=240x180  3=160x120  4=120x90  5=96x72  6=80x60
//   DRAW_FAT_PEN 1 = one stroke with pen size SCALE (fast, round pen can gap)
//                0 = pen size 1, draw SCALE lines per pixel (solid, slower)

let SCALE = 3;
let DRAW_FAT_PEN = 0;
let pixelStep = 3;
let W = 160;
let H = 120;
let gfxLen = 19200;
let TEX = 16;
let nearZ = 0.15;
let fov = 57;
let viewDist = 8;
let dayTick = 2;
let MAX_VERTS = 12000;
let MAX_TRIS = 8000;
let WY = 40;
let SEA = 11;
let CHUNK = 16;
let CHUNK_LEN = 10240;
let MAP_SIDE = 16;
let worldSize = 256;
let worldSizeNext = 256;
let worldSeed = 1;
let worldFill = 0;

let AIR = 0;
let GRASS = 1;
let DIRT = 2;
let STONE = 3;
let COBBLE = 4;
let BEDROCK = 5;
let SAND = 6;
let GRAVEL = 7;
let LOG = 8;
let PLANKS = 9;
let LEAVES = 10;
let WATER = 11;
let GLASS = 12;
let COAL_ORE = 13;
let IRON_ORE = 14;
let GOLD_ORE = 15;
let CRAFT = 16;
let CHEST = 17;
let FURNACE = 18;
let TORCH = 19;
let BRICK = 20;
let FURNACE_ON = 21;

let I_STICK = 32;
let I_COAL = 33;
let I_IRON = 34;
let I_GOLD = 35;
let I_DIAMOND = 36;
let I_APPLE = 37;
let I_BREAD = 38;
let I_PORK = 39;
let I_PORKC = 40;
let I_WSWORD = 41;
let I_WSHOV = 42;
let I_WPICK = 43;
let I_WAXE = 44;
let I_SSWORD = 45;
let I_SSHOV = 46;
let I_SPICK = 47;
let I_SAXE = 48;
let I_ISWORD = 49;
let I_ISHOV = 50;
let I_IPICK = 51;
let I_IAXE = 52;

let packedBlocks = loadList("blocks.txt");
let packedItems = loadList("items.txt");

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
let ir = [];
let ig = [];
let ib = [];
let itemOff = [];
let zbuf = [];
let world = [];
let chunkMap = [];
let invId = [];
let invN = [];
let craftId = [];
let craftN = [];
let boxId = [];
let boxN = [];
let boxX = [];
let boxY = [];
let boxZ = [];
let furnX = [];
let furnY = [];
let furnZ = [];
let furnInId = [];
let furnInN = [];
let furnFuelId = [];
let furnFuelN = [];
let furnOutId = [];
let furnOutN = [];
let furnProg = [];
let furnLeft = [];
let clipX = [];
let clipY = [];
let clipZ = [];
let clipU = [];
let clipV = [];
let DIG = [
  7, 5, 5, 5, 7,
  2, 6, 2, 2, 7,
  7, 1, 7, 4, 7,
  7, 1, 7, 1, 7,
  5, 5, 7, 1, 1,
  7, 4, 7, 1, 7,
  7, 4, 7, 5, 7,
  7, 1, 1, 1, 1,
  7, 5, 7, 5, 7,
  7, 5, 7, 1, 7
];
let FONT = [
  7, 5, 7, 5, 5,
  6, 5, 6, 5, 6,
  7, 4, 4, 4, 7,
  6, 5, 5, 5, 6,
  7, 4, 6, 4, 7,
  7, 4, 6, 4, 4,
  7, 4, 5, 5, 7,
  5, 5, 7, 5, 5,
  7, 2, 2, 2, 7,
  1, 1, 1, 5, 7,
  5, 6, 4, 6, 5,
  4, 4, 4, 4, 7,
  5, 7, 5, 5, 5,
  5, 7, 7, 5, 5,
  7, 5, 5, 5, 7,
  7, 5, 7, 4, 4,
  7, 5, 5, 7, 1,
  7, 5, 6, 5, 5,
  7, 4, 7, 1, 7,
  7, 2, 2, 2, 2,
  5, 5, 5, 5, 7,
  5, 5, 5, 5, 2,
  5, 5, 5, 7, 5,
  5, 5, 2, 5, 5,
  5, 5, 2, 2, 2,
  7, 1, 2, 4, 7
];
let ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let DIGS = "0123456789";
let textDraw = "";

let vertCount = 0;
let triCount = 0;
let lastVi = 0;
let fi = 0;
let curTex = 0;
let curShade = 1;
let clipCount = 0;
let camX = 128;
let camY = 20;
let camZ = 128;
let yaw = 0;
let pitch = 0;
let velY = 0;
let onGround = 0;
let playerR = 0.3;
let eyeH = 1.62;
let moveSpeed = 0.18;
let turnSpeed = 3.5;
let ambient = 1;
let skyBlend = 1;
let worldTime = 4000;
let scene = 0;
let uiMode = 0;
let hotbar = 0;
let meshDirty = 1;
let meshCX = -999;
let meshCZ = -999;
let fps = 0;
let fpsFrames = 0;
let fpsStamp = 0;
let health = 20;
let hunger = 20;
let air = 20;
let hurtCd = 0;
let hungerT = 0;
let spawnX = 128;
let spawnY = 20;
let spawnZ = 128;
let hitOn = 0;
let hitX = 0;
let hitY = 0;
let hitZ = 0;
let placeX = 0;
let placeY = 0;
let placeZ = 0;
let lookX = 0;
let lookY = 0;
let lookZ = 0;
let mineT = 0;
let mineX = 0;
let mineY = 0;
let mineZ = 0;
let wasP = 0;
let settingsBack = 0;
let settingsRow = 0;
let menuSel = 0;
let genCx = 0;
let genCz = 0;
let genX0 = 0;
let genX1 = 0;
let genZ0 = 0;
let genZ1 = 0;
let genDone = 0;
let genTotal = 1;
let wasF = 0;
let wasR = 0;
let wasE = 0;
let wasC = 0;
let wasSpace = 0;
let wasLeft = 0;
let wasRight = 0;
let wasUp = 0;
let wasDown = 0;
let wasMouse = 0;
let lastMx = 0;
let lastMy = 0;
let mx = 0;
let my = 0;
let hitKind = -1;
let hitSlot = 0;
let spreadN = 0;
let spreadMark = [];
let invCur = 0;
let heldId = 0;
let heldN = 0;
let resultId = 0;
let resultN = 0;
let openBox = -1;
let openFurn = -1;
let ov = 0;
let inWater = 0;
let wasInWater = 0;
let fallY = 0;
let giveTmp = 0;
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

function hash3(x, y, z) {
  let n = x * 374761393 + y * 668265263 + z * 1274126177;
  n = n + x * y * 13 + z * 17 + 1013904223;
  n = n + worldSeed * 97;
  if (n < 0) {
    n = 0 - n;
  }
  return n;
}

function chunkId(cx, cz) {
  return cx + cz * MAP_SIDE;
}

function localI(lx, y, lz) {
  return lx + lz * CHUNK + y * 256;
}

function chunksAcross() {
  return Math.floor(worldSize / CHUNK);
}

function worldI(x, y, z) {
  let cx = Math.floor(x / CHUNK);
  let cz = Math.floor(z / CHUNK);
  let id = chunkId(cx, cz);
  let base = chunkMap[id];
  if (base < 0) {
    return -1;
  }
  let lx = x - cx * CHUNK;
  let lz = z - cz * CHUNK;
  return base + localI(lx, y, lz);
}

function getBlock(x, y, z) {
  if (x < 0) {
    return BEDROCK;
  }
  if (z < 0) {
    return BEDROCK;
  }
  if (x >= worldSize) {
    return BEDROCK;
  }
  if (z >= worldSize) {
    return BEDROCK;
  }
  if (y < 0) {
    return BEDROCK;
  }
  if (y >= WY) {
    return AIR;
  }
  let i = worldI(x, y, z);
  if (i < 0) {
    return 0;
  }
  return world[i];
}

function setBlock(x, y, z, b) {
  if (x < 0) {
    return;
  }
  if (y < 0) {
    return;
  }
  if (z < 0) {
    return;
  }
  if (x >= worldSize) {
    return;
  }
  if (y >= WY) {
    return;
  }
  if (z >= worldSize) {
    return;
  }
  ensureChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  let i = worldI(x, y, z);
  if (i < 0) {
    return;
  }
  world[i] = b;
  meshDirty = 1;
}

function isOpaque(b) {
  if (b == AIR) {
    return 0;
  }
  if (b == WATER) {
    return 0;
  }
  if (b == GLASS) {
    return 0;
  }
  if (b == LEAVES) {
    return 0;
  }
  if (b == TORCH) {
    return 0;
  }
  return 1;
}

function isSolid(b) {
  if (b == AIR) {
    return 0;
  }
  if (b == WATER) {
    return 0;
  }
  if (b == TORCH) {
    return 0;
  }
  return 1;
}

function isPlant(b) {
  if (b == LEAVES) {
    return 1;
  }
  if (b == GLASS) {
    return 1;
  }
  if (b == TORCH) {
    return 1;
  }
  return 0;
}

function faceTex(b, face) {
  if (b == GRASS) {
    if (face == 0) {
      return 0;
    }
    if (face == 1) {
      return 2;
    }
    return 3;
  }
  if (b == DIRT) {
    return 2;
  }
  if (b == STONE) {
    return 1;
  }
  if (b == COBBLE) {
    return 5;
  }
  if (b == BEDROCK) {
    return 6;
  }
  if (b == SAND) {
    return 7;
  }
  if (b == GRAVEL) {
    return 8;
  }
  if (b == LOG) {
    if (face < 2) {
      return 10;
    }
    return 9;
  }
  if (b == PLANKS) {
    return 4;
  }
  if (b == LEAVES) {
    return 23;
  }
  if (b == WATER) {
    return 24;
  }
  if (b == GLASS) {
    return 22;
  }
  if (b == COAL_ORE) {
    return 15;
  }
  if (b == IRON_ORE) {
    return 14;
  }
  if (b == GOLD_ORE) {
    return 13;
  }
  if (b == CRAFT) {
    if (face == 0) {
      return 16;
    }
    if (face == 1) {
      return 4;
    }
    if (face == 2) {
      return 17;
    }
    return 18;
  }
  if (b == CHEST) {
    if (face == 2) {
      return 12;
    }
    return 11;
  }
  if (b == FURNACE) {
    if (face == 2) {
      return 20;
    }
    return 19;
  }
  if (b == FURNACE_ON) {
    if (face == 2) {
      return 21;
    }
    return 19;
  }
  if (b == TORCH) {
    return 25;
  }
  if (b == BRICK) {
    return 26;
  }
  return 1;
}

function faceShade(face) {
  if (face == 0) {
    return 1;
  }
  if (face == 1) {
    return 0.5;
  }
  if (face == 2) {
    return 0.8;
  }
  if (face == 3) {
    return 0.8;
  }
  return 0.6;
}

function itemTex(id) {
  if (id == I_STICK) {
    return 0;
  }
  if (id == I_COAL) {
    return 1;
  }
  if (id == I_IRON) {
    return 2;
  }
  if (id == I_GOLD) {
    return 3;
  }
  if (id == I_DIAMOND) {
    return 4;
  }
  if (id == I_APPLE) {
    return 5;
  }
  if (id == I_BREAD) {
    return 6;
  }
  if (id == I_PORK) {
    return 7;
  }
  if (id == I_PORKC) {
    return 8;
  }
  if (id >= I_WSWORD) {
    if (id <= I_IAXE) {
      return 9 + (id - I_WSWORD);
    }
  }
  return -1;
}

function blockItemTex(id) {
  return faceTex(id, 2);
}

function unpackBlocks() {
  let i = 0;
  let n = packedBlocks.length;
  while (i < n) {
    let c = packedBlocks[i];
    let r = 0;
    let g = 0;
    let b = 0;
    if (c > 0) {
      r = Math.floor(c / 65536);
      g = Math.floor(c / 256) % 256;
      b = c % 256;
      if (i < 256) {
        r = Math.floor(r * 0.48);
        g = Math.floor(g * 0.82);
        b = Math.floor(b * 0.22);
      }
      if (i >= 5888) {
        if (i < 6144) {
          r = Math.floor(r * 0.35);
          g = Math.floor(g * 0.9);
          b = Math.floor(b * 0.18);
        }
      }
    }
    tr.push(r);
    tg.push(g);
    tb.push(b);
    i++;
  }
  let t = 0;
  while (t < 27) {
    texOff.push(t * 256);
    t++;
  }
}

function unpackItems() {
  let i = 0;
  let n = packedItems.length;
  while (i < n) {
    let c = packedItems[i];
    let r = 0;
    let g = 0;
    let b = 0;
    if (c > 0) {
      r = Math.floor(c / 65536);
      g = Math.floor(c / 256) % 256;
      b = c % 256;
    }
    ir.push(r);
    ig.push(g);
    ib.push(b);
    i++;
  }
  let t = 0;
  while (t < 21) {
    itemOff.push(t * 256);
    t++;
  }
}

function addVert(x, y, z) {
  if (vertCount >= MAX_VERTS) {
    lastVi = 0;
    return;
  }
  vx[vertCount] = x;
  vy[vertCount] = y;
  vz[vertCount] = z;
  lastVi = vertCount;
  vertCount = vertCount + 1;
}

function addTri(a, b, c, ua, va, ub, vb, uc, vc, t, sh) {
  if (triCount >= MAX_TRIS) {
    return;
  }
  i0[triCount] = a;
  i1[triCount] = b;
  i2[triCount] = c;
  u0[triCount] = ua;
  v0[triCount] = va;
  u1[triCount] = ub;
  v1[triCount] = vb;
  u2[triCount] = uc;
  v2[triCount] = vc;
  texId[triCount] = t;
  shade[triCount] = sh;
  triCount = triCount + 1;
}

function addQuadUV(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, t, uu, vv, sh) {
  if (vertCount + 4 > MAX_VERTS) {
    return;
  }
  if (triCount + 2 > MAX_TRIS) {
    return;
  }
  addVert(x0, y0, z0);
  let a = lastVi;
  addVert(x1, y1, z1);
  let b = lastVi;
  addVert(x2, y2, z2);
  let c = lastVi;
  addVert(x3, y3, z3);
  let d = lastVi;
  addTri(a, b, c, 0, vv, uu, vv, uu, 0, t, sh);
  addTri(a, c, d, 0, vv, uu, 0, 0, 0, t, sh);
}

function emitFace(bx, by, bz, face, t, sh) {
  let x0 = bx;
  let y0 = by;
  let z0 = bz;
  let x1 = bx + 1;
  let y1 = by + 1;
  let z1 = bz + 1;
  let uu = TEX;
  let vv = TEX;
  if (face == 0) {
    addQuadUV(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0, t, uu, vv, sh);
  }
  if (face == 1) {
    addQuadUV(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, t, uu, vv, sh);
  }
  if (face == 2) {
    addQuadUV(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, t, uu, vv, sh);
  }
  if (face == 3) {
    addQuadUV(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, t, uu, vv, sh);
  }
  if (face == 4) {
    addQuadUV(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1, t, uu, vv, sh);
  }
  if (face == 5) {
    addQuadUV(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, t, uu, vv, sh);
  }
}

function neighborAir(bx, by, bz, face) {
  let nx = bx;
  let ny = by;
  let nz = bz;
  if (face == 0) {
    ny = by + 1;
  }
  if (face == 1) {
    ny = by - 1;
  }
  if (face == 2) {
    nz = bz + 1;
  }
  if (face == 3) {
    nz = bz - 1;
  }
  if (face == 4) {
    nx = bx + 1;
  }
  if (face == 5) {
    nx = bx - 1;
  }
  if (ny >= WY) {
    return AIR;
  }
  if (nx < 0) {
    return BEDROCK;
  }
  if (nx >= worldSize) {
    return BEDROCK;
  }
  if (nz < 0) {
    return BEDROCK;
  }
  if (nz >= worldSize) {
    return BEDROCK;
  }
  if (ny < 0) {
    return BEDROCK;
  }
  return getBlock(nx, ny, nz);
}

function shouldEmit(b, nb) {
  if (nb == AIR) {
    return 1;
  }
  if (b == WATER) {
    if (nb == WATER) {
      return 0;
    }
    if (isOpaque(nb) == 0) {
      return 1;
    }
    return 0;
  }
  if (isOpaque(nb) == 1) {
    return 0;
  }
  if (b == nb) {
    if (isPlant(b) == 1) {
      return 0;
    }
  }
  return 1;
}

function emitTorch(bx, by, bz) {
  let x0 = bx + 0.4;
  let x1 = bx + 0.6;
  let y0 = by;
  let y1 = by + 0.7;
  let z0 = bz + 0.4;
  let z1 = bz + 0.6;
  let t = 25;
  let sh = 1;
  addQuadUV(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, t, TEX, TEX, sh);
  addQuadUV(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, t, TEX, TEX, sh);
  addQuadUV(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1, t, TEX, TEX, sh);
  addQuadUV(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, t, TEX, TEX, sh);
}

function rebuildMesh() {
  vertCount = 0;
  triCount = 0;
  let px = Math.floor(camX);
  let py = Math.floor(camY);
  let pz = Math.floor(camZ);
  meshCX = px;
  meshCZ = pz;
  let x0 = px - viewDist;
  let x1 = px + viewDist;
  let y0 = py - viewDist;
  let y1 = py + viewDist;
  let z0 = pz - viewDist;
  let z1 = pz + viewDist;
  if (x0 < 0) {
    x0 = 0;
  }
  if (y0 < 0) {
    y0 = 0;
  }
  if (z0 < 0) {
    z0 = 0;
  }
  if (x1 > worldSize - 1) {
    x1 = worldSize - 1;
  }
  if (y1 > WY - 1) {
    y1 = WY - 1;
  }
  if (z1 > worldSize - 1) {
    z1 = worldSize - 1;
  }
  let y = y0;
  while (y <= y1) {
    let z = z0;
    while (z <= z1) {
      let x = x0;
      while (x <= x1) {
        let b = getBlock(x, y, z);
        if (b != AIR) {
          if (b == TORCH) {
            emitTorch(x, y, z);
          } else {
            let face = 0;
            while (face < 6) {
              let nb = neighborAir(x, y, z, face);
              if (shouldEmit(b, nb) == 1) {
                emitFace(x, y, z, face, faceTex(b, face), faceShade(face));
              }
              face++;
            }
          }
        }
        x++;
      }
      z++;
    }
    y++;
  }
  meshDirty = 0;
}

function heightAt(x, z) {
  let s = worldSeed;
  let n = Math.sin((x + s) * 3.1 + z * 1.7) * 4;
  n = n + Math.sin(x * 1.9 + (z + s) * 2.3) * 3;
  n = n + Math.sin(x * 0.41 + z * 0.37 + s * 0.2) * 6;
  n = n + Math.sin(x * 7.3 + z * 5.1) * 1.5;
  let h = 12 + Math.floor(n);
  if (h < 4) {
    h = 4;
  }
  if (h > 28) {
    h = 28;
  }
  return h;
}

function columnBlock(x, y, z) {
  let h = heightAt(x, z);
  if (y == 0) {
    return BEDROCK;
  }
  if (y < h - 3) {
    let hv = hash3(x, y, z) % 80;
    if (hv == 0) {
      return COAL_ORE;
    }
    if (hv == 1) {
      return IRON_ORE;
    }
    if (hv == 2) {
      if (y < 12) {
        return GOLD_ORE;
      }
    }
    return STONE;
  }
  if (y < h) {
    return DIRT;
  }
  if (y == h) {
    if (h < SEA) {
      return SAND;
    }
    return GRASS;
  }
  if (y <= SEA) {
    return WATER;
  }
  return AIR;
}

function fillChunkTerrain(cx, cz, base) {
  let lz = 0;
  while (lz < CHUNK) {
    let lx = 0;
    while (lx < CHUNK) {
      let x = cx * CHUNK + lx;
      let z = cz * CHUNK + lz;
      let y = 0;
      while (y < WY) {
        world[base + localI(lx, y, lz)] = columnBlock(x, y, z);
        y++;
      }
      lx++;
    }
    lz++;
  }
}

function plantChunkTrees(cx, cz) {
  let lz = 0;
  while (lz < CHUNK) {
    let lx = 0;
    while (lx < CHUNK) {
      let x = cx * CHUNK + lx;
      let z = cz * CHUNK + lz;
      if (hash3(x, 99, z) % 18 == 0) {
        let th = heightAt(x, z);
        if (th >= SEA) {
          if (getBlock(x, th, z) == GRASS) {
            placeTree(x, z, th);
          }
        }
      }
      lx++;
    }
    lz++;
  }
}

function ensureChunk(cx, cz) {
  if (cx < 0) {
    return;
  }
  if (cz < 0) {
    return;
  }
  let n = chunksAcross();
  if (cx >= n) {
    return;
  }
  if (cz >= n) {
    return;
  }
  let id = chunkId(cx, cz);
  if (chunkMap[id] >= 0) {
    return;
  }
  if (chunkMap[id] == -2) {
    return;
  }
  chunkMap[id] = -2;
  let base = worldFill;
  while (world.length < base + CHUNK_LEN) {
    world.push(0);
  }
  worldFill = worldFill + CHUNK_LEN;
  chunkMap[id] = base;
  fillChunkTerrain(cx, cz, base);
  plantChunkTrees(cx, cz);
  meshDirty = 1;
}

function resetChunks() {
  let i = 0;
  while (i < chunkMap.length) {
    chunkMap[i] = -1;
    i++;
  }
  worldFill = 0;
}

function ensureAroundPlayer() {
  let pcx = Math.floor(camX / CHUNK);
  let pcz = Math.floor(camZ / CHUNK);
  let r = Math.floor(viewDist / CHUNK) + 1;
  let made = 0;
  let cz = pcz - r;
  while (cz <= pcz + r) {
    let cx = pcx - r;
    while (cx <= pcx + r) {
      if (made < 2) {
        if (cx >= 0) {
          if (cz >= 0) {
            let n = chunksAcross();
            if (cx < n) {
              if (cz < n) {
                let id = chunkId(cx, cz);
                if (chunkMap[id] < 0) {
                  ensureChunk(cx, cz);
                  made = made + 1;
                }
              }
            }
          }
        }
      }
      cx++;
    }
    cz++;
  }
}

function placeTree(x, z, h) {
  let y = h + 1;
  let i = 0;
  while (i < 5) {
    setBlock(x, y + i, z, LOG);
    i++;
  }
  let ly = y + 3;
  while (ly <= y + 5) {
    let oz = -2;
    while (oz <= 2) {
      let ox = -2;
      while (ox <= 2) {
        let skip = 0;
        if (ox == 0) {
          if (oz == 0) {
            skip = 1;
          }
        }
        if (skip == 0) {
          if (Math.abs(ox) + Math.abs(oz) < 4) {
            if (getBlock(x + ox, ly, z + oz) == AIR) {
              setBlock(x + ox, ly, z + oz, LEAVES);
            }
          }
        }
        ox++;
      }
      oz++;
    }
    ly++;
  }
  setBlock(x, y + 5, z, LEAVES);
}

function findSpawn() {
  let x = Math.floor(worldSize / 2);
  let z = Math.floor(worldSize / 2);
  let y = WY - 2;
  let found = 0;
  while (y > 1) {
    if (found == 0) {
      if (isSolid(getBlock(x, y, z)) == 1) {
        found = 1;
        spawnX = x + 0.5;
        spawnY = y + 1 + eyeH;
        spawnZ = z + 0.5;
      }
    }
    y--;
  }
  camX = spawnX;
  camY = spawnY;
  camZ = spawnZ;
}

function startNewWorld() {
  worldSize = worldSizeNext;
  worldSeed = Math.floor(timer() * 9973) % 100000 + 1;
  resetChunks();
  let i = 0;
  while (i < 27) {
    invId[i] = 0;
    invN[i] = 0;
    i++;
  }
  i = 0;
  while (i < 9) {
    craftId[i] = 0;
    craftN[i] = 0;
    i++;
  }
  heldId = 0;
  heldN = 0;
  health = 20;
  hunger = 20;
  air = 20;
  worldTime = 4000;
  velY = 0;
  yaw = 0;
  pitch = 0;
  uiMode = 0;
  hotbar = 0;
  meshCX = -999;
  meshCZ = -999;
  i = 0;
  while (i < 12) {
    boxZ[i] = -1;
    furnZ[i] = -1;
    furnInId[i] = 0;
    furnInN[i] = 0;
    furnFuelId[i] = 0;
    furnFuelN[i] = 0;
    furnOutId[i] = 0;
    furnOutN[i] = 0;
    furnProg[i] = 0;
    furnLeft[i] = 0;
    i++;
  }
  let mid = Math.floor(worldSize / 2);
  let x0 = mid - 64;
  let x1 = mid + 64;
  if (x0 < 0) {
    x0 = 0;
  }
  if (x1 > worldSize) {
    x1 = worldSize;
  }
  genX0 = Math.floor(x0 / CHUNK);
  genX1 = Math.floor((x1 - 1) / CHUNK);
  genZ0 = genX0;
  genZ1 = genX1;
  let z0 = mid - 64;
  let z1 = mid + 64;
  if (z0 < 0) {
    z0 = 0;
  }
  if (z1 > worldSize) {
    z1 = worldSize;
  }
  genZ0 = Math.floor(z0 / CHUNK);
  genZ1 = Math.floor((z1 - 1) / CHUNK);
  genCx = genX0;
  genCz = genZ0;
  genDone = 0;
  genTotal = (genX1 - genX0 + 1) * (genZ1 - genZ0 + 1);
  if (genTotal < 1) {
    genTotal = 1;
  }
  scene = 3;
}

function genStartFrame() {
  let n = 0;
  while (n < 2) {
    if (genCz > genZ1) {
      n = 2;
    } else {
      ensureChunk(genCx, genCz);
      genDone = genDone + 1;
      genCx = genCx + 1;
      if (genCx > genX1) {
        genCx = genX0;
        genCz = genCz + 1;
      }
      n++;
    }
  }
  if (genCz > genZ1) {
    findSpawn();
    giveItem(PLANKS, 16);
    giveItem(I_WPICK, 1);
    giveItem(I_APPLE, 3);
    giveItem(I_BREAD, 2);
    meshDirty = 1;
    rebuildMesh();
    scene = 1;
    uiMode = 0;
    console.log("WASD look arrows  F mine  R use  E inv  P settings");
  }
}

function allocAll() {
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
  while (vx.length < MAX_VERTS) {
    vx.push(0);
    vy.push(0);
    vz.push(0);
    cx.push(0);
    cy.push(0);
    cz.push(0);
    sx.push(0);
    sy.push(0);
    rhw.push(0);
  }
  while (i0.length < MAX_TRIS) {
    i0.push(0);
    i1.push(0);
    i2.push(0);
    u0.push(0);
    v0.push(0);
    u1.push(0);
    v1.push(0);
    u2.push(0);
    v2.push(0);
    texId.push(0);
    shade.push(1);
  }
  while (chunkMap.length < MAP_SIDE * MAP_SIDE) {
    chunkMap.push(-1);
  }
  while (invId.length < 27) {
    invId.push(0);
    invN.push(0);
  }
  while (craftId.length < 9) {
    craftId.push(0);
    craftN.push(0);
  }
  while (boxX.length < 12) {
    boxX.push(0);
    boxY.push(0);
    boxZ.push(-1);
    furnX.push(0);
    furnY.push(0);
    furnZ.push(-1);
    furnInId.push(0);
    furnInN.push(0);
    furnFuelId.push(0);
    furnFuelN.push(0);
    furnOutId.push(0);
    furnOutN.push(0);
    furnProg.push(0);
    furnLeft.push(0);
  }
  while (boxId.length < 324) {
    boxId.push(0);
    boxN.push(0);
  }
}

function mixRGB(c0, c1, k) {
  if (k < 0) {
    k = 0;
  }
  if (k > 1) {
    k = 1;
  }
  let r0 = Math.floor(c0 / 65536);
  let g0 = Math.floor(c0 / 256) % 256;
  let b0 = c0 % 256;
  let r1 = Math.floor(c1 / 65536);
  let g1 = Math.floor(c1 / 256) % 256;
  let b1 = c1 % 256;
  let r = Math.floor(r0 + (r1 - r0) * k);
  let g = Math.floor(g0 + (g1 - g0) * k);
  let b = Math.floor(b0 + (b1 - b0) * k);
  return r * 65536 + g * 256 + b;
}

function fillSky() {
  let gy = 180;
  let sky1 = 7259381;
  let sky2 = 12117242;
  let k = 0;
  if (skyBlend >= 0.5) {
    k = (skyBlend - 0.5) * 2;
    sky1 = mixRGB(9335603, 7259381, k);
    sky2 = mixRGB(13335347, 12117242, k);
  } else {
    k = skyBlend * 2;
    sky1 = mixRGB(1318440, 9335603, k);
    sky2 = mixRGB(2236962, 13335347, k);
  }
  let band = 0;
  while (gy > -180) {
    if (band < 3) {
      pen.setColor(sky1);
    } else {
      pen.setColor(sky2);
    }
    pen.setSize(50);
    goTo(-240, gy);
    pen.down();
    goTo(240, gy);
    pen.up();
    gy = gy - 40;
    band = band + 1;
  }
  resetDrawPen();
}

function applyScale() {
  pixelStep = SCALE;
  if (pixelStep < 1) {
    pixelStep = 1;
  }
  W = Math.floor(480 / pixelStep);
  H = Math.floor(360 / pixelStep);
  if (W < 1) {
    W = 1;
  }
  if (H < 1) {
    H = 1;
  }
  gfxLen = W * H;
  fov = W / 2 / Math.tan(35);
}

function resetDrawPen() {
  if (DRAW_FAT_PEN == 1) {
    pen.setSize(pixelStep + 1);
  } else {
    pen.setSize(2);
  }
}

function paintRun(x, yTop, w, h, col) {
  pen.setColor(col);
  if (DRAW_FAT_PEN == 1) {
    pen.setSize(h + 1);
    goTo(x + h / 2, yTop - h / 2);
    pen.down();
    if (w <= h) {
      changeX(1);
    } else {
      goTo(x + w - h / 2, yTop - h / 2);
    }
    pen.up();
  } else {
    pen.setSize(2);
    let row = 0;
    let x1 = x + w;
    if (x1 < x + 1) {
      x1 = x + 1;
    }
    while (row < h) {
      goTo(x, yTop - row - 0.5);
      pen.down();
      goTo(x1, yTop - row - 0.5);
      pen.up();
      row++;
    }
  }
}

function clearZ() {
  let zi = 0;
  while (zi < gfxLen) {
    zbuf[zi] = 0;
    zi++;
  }
}

function plotSpan() {
  paintRun(spanX * pixelStep - 240, 180 - spanY * pixelStep, spanLen * pixelStep, pixelStep, spanColor);
}

function drawCrosshair() {
  pen.setColor(16777215);
  pen.setSize(2);
  goTo(-6, 0);
  pen.down();
  goTo(6, 0);
  pen.up();
  goTo(0, -6);
  pen.down();
  goTo(0, 6);
  pen.up();
  resetDrawPen();
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
      let pr = tr[idx];
      let pg = tg[idx];
      let pb = tb[idx];
      if (pr + pg + pb == 0) {
        if (have == 1) {
          plotSpan();
          have = 0;
        }
      } else {
        zbuf[zi] = rhwP;
        let sr = Math.floor(pr * curShade);
        let sg = Math.floor(pg * curShade);
        let sb = Math.floor(pb * curShade);
        let col = sr * 65536 + sg * 256 + sb;
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
  curShade = shade[fi] * ambient;
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

function transformVerts() {
  let cY = Math.cos(yaw);
  let sY = Math.sin(yaw);
  let cP = Math.cos(pitch);
  let sP = Math.sin(pitch);
  let i = 0;
  while (i < vertCount) {
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
  while (f < triCount) {
    fi = f;
    drawFace();
    f++;
  }
}

function overlapsSolid() {
  ov = 0;
  let x0 = Math.floor(camX - playerR);
  let x1 = Math.floor(camX + playerR);
  let y0 = Math.floor(camY - eyeH);
  let y1 = Math.floor(camY + 0.18);
  let z0 = Math.floor(camZ - playerR);
  let z1 = Math.floor(camZ + playerR);
  let y = y0;
  while (y <= y1) {
    let z = z0;
    while (z <= z1) {
      let x = x0;
      while (x <= x1) {
        if (isSolid(getBlock(x, y, z)) == 1) {
          ov = 1;
        }
        x++;
      }
      z++;
    }
    y++;
  }
}

function feetWater() {
  let x = Math.floor(camX);
  let y = Math.floor(camY - eyeH + 0.2);
  let z = Math.floor(camZ);
  if (getBlock(x, y, z) == WATER) {
    return 1;
  }
  if (getBlock(x, Math.floor(camY), z) == WATER) {
    return 1;
  }
  return 0;
}

function headWater() {
  if (getBlock(Math.floor(camX), Math.floor(camY), Math.floor(camZ)) == WATER) {
    return 1;
  }
  return 0;
}

function tryStepX(dx) {
  camX = camX + dx;
  overlapsSolid();
  if (ov == 0) {
    return;
  }
  camX = camX - dx;
  camY = camY + 1.08;
  camX = camX + dx;
  overlapsSolid();
  if (ov == 1) {
    camX = camX - dx;
    camY = camY - 1.08;
  }
}

function tryStepZ(dz) {
  camZ = camZ + dz;
  overlapsSolid();
  if (ov == 0) {
    return;
  }
  camZ = camZ - dz;
  camY = camY + 1.08;
  camZ = camZ + dz;
  overlapsSolid();
  if (ov == 1) {
    camZ = camZ - dz;
    camY = camY - 1.08;
  }
}

function movePlayer(dx, dy, dz) {
  tryStepX(dx);
  camY = camY + dy;
  overlapsSolid();
  if (ov == 1) {
    if (dy < 0) {
      onGround = 1;
      if (inWater == 0) {
        if (fallY > 3.5) {
          let dmg = Math.floor(fallY - 3);
          health = health - dmg;
        }
      }
      fallY = 0;
    }
    camY = camY - dy;
    velY = 0;
  } else {
    if (inWater == 1) {
      fallY = 0;
    } else {
      if (dy < 0) {
        onGround = 0;
        fallY = fallY - dy;
      }
    }
  }
  tryStepZ(dz);
}

function updateLook() {
  let cP = Math.cos(pitch);
  lookX = Math.sin(yaw) * cP;
  lookY = Math.sin(pitch);
  lookZ = Math.cos(yaw) * cP;
}

function raycast() {
  updateLook();
  hitOn = 0;
  let t = 0.2;
  let lastX = Math.floor(camX);
  let lastY = Math.floor(camY);
  let lastZ = Math.floor(camZ);
  while (t < 6) {
    if (hitOn == 0) {
      let px = camX + lookX * t;
      let py = camY + lookY * t;
      let pz = camZ + lookZ * t;
      let bx = Math.floor(px);
      let by = Math.floor(py);
      let bz = Math.floor(pz);
      let b = getBlock(bx, by, bz);
      if (b != AIR) {
        if (b != WATER) {
          hitOn = 1;
          hitX = bx;
          hitY = by;
          hitZ = bz;
          placeX = lastX;
          placeY = lastY;
          placeZ = lastZ;
        }
      }
      lastX = bx;
      lastY = by;
      lastZ = bz;
    }
    t = t + 0.08;
  }
}

function hardness(b) {
  if (b == LEAVES) {
    return 8;
  }
  if (b == TORCH) {
    return 4;
  }
  if (b == GLASS) {
    return 10;
  }
  if (b == GRASS) {
    return 16;
  }
  if (b == DIRT) {
    return 16;
  }
  if (b == SAND) {
    return 14;
  }
  if (b == GRAVEL) {
    return 16;
  }
  if (b == LOG) {
    return 22;
  }
  if (b == PLANKS) {
    return 20;
  }
  if (b == CHEST) {
    return 24;
  }
  if (b == CRAFT) {
    return 24;
  }
  if (b == BRICK) {
    return 40;
  }
  if (b == STONE) {
    return 45;
  }
  if (b == COBBLE) {
    return 40;
  }
  if (b == COAL_ORE) {
    return 50;
  }
  if (b == IRON_ORE) {
    return 55;
  }
  if (b == GOLD_ORE) {
    return 55;
  }
  if (b == FURNACE) {
    return 40;
  }
  if (b == FURNACE_ON) {
    return 40;
  }
  if (b == BEDROCK) {
    return 9999;
  }
  return 20;
}

function handId() {
  return invId[hotbar];
}

function toolTier() {
  let id = handId();
  if (id == I_WPICK) {
    return 1;
  }
  if (id == I_SPICK) {
    return 2;
  }
  if (id == I_IPICK) {
    return 3;
  }
  if (id == I_WAXE) {
    return 1;
  }
  if (id == I_SAXE) {
    return 1;
  }
  if (id == I_IAXE) {
    return 2;
  }
  if (id == I_WSHOV) {
    return 1;
  }
  if (id == I_SSHOV) {
    return 1;
  }
  if (id == I_ISHOV) {
    return 2;
  }
  return 0;
}

function canHarvest(b) {
  if (b == STONE) {
    if (toolTier() < 1) {
      return 0;
    }
  }
  if (b == COBBLE) {
    if (toolTier() < 1) {
      return 0;
    }
  }
  if (b == COAL_ORE) {
    if (toolTier() < 1) {
      return 0;
    }
  }
  if (b == IRON_ORE) {
    if (toolTier() < 2) {
      return 0;
    }
  }
  if (b == GOLD_ORE) {
    if (toolTier() < 3) {
      return 0;
    }
  }
  if (b == FURNACE) {
    if (toolTier() < 1) {
      return 0;
    }
  }
  if (b == FURNACE_ON) {
    if (toolTier() < 1) {
      return 0;
    }
  }
  if (b == BRICK) {
    if (toolTier() < 1) {
      return 0;
    }
  }
  return 1;
}

function dropOf(b) {
  if (b == GRASS) {
    return DIRT;
  }
  if (b == STONE) {
    return COBBLE;
  }
  if (b == COAL_ORE) {
    return I_COAL;
  }
  if (b == GLASS) {
    return 0;
  }
  if (b == LEAVES) {
    if (hash3(hitX, hitY, hitZ) % 20 == 0) {
      return I_APPLE;
    }
    return 0;
  }
  if (b == FURNACE_ON) {
    return FURNACE;
  }
  return b;
}

function giveItem(id, n) {
  if (id == 0) {
    return;
  }
  if (n <= 0) {
    return;
  }
  let i = 0;
  let add = 0;
  let room = 0;
  while (i < 27) {
    if (invId[i] == id) {
      if (invN[i] < 64) {
        room = 64 - invN[i];
        add = n;
        if (add > room) {
          add = room;
        }
        invN[i] = invN[i] + add;
        n = n - add;
      }
    }
    i++;
  }
  i = 0;
  while (i < 27) {
    if (n > 0) {
      if (invId[i] == 0) {
        invId[i] = id;
        add = n;
        if (add > 64) {
          add = 64;
        }
        invN[i] = add;
        n = n - add;
      }
    }
    i++;
  }
}

function takeHand(n) {
  if (invN[hotbar] > n) {
    invN[hotbar] = invN[hotbar] - n;
  } else {
    invId[hotbar] = 0;
    invN[hotbar] = 0;
  }
}

function findChest(x, y, z) {
  let i = 0;
  while (i < 12) {
    if (boxZ[i] >= 0) {
      if (boxX[i] == x) {
        if (boxY[i] == y) {
          if (boxZ[i] == z) {
            return i;
          }
        }
      }
    }
    i++;
  }
  return -1;
}

function allocChest(x, y, z) {
  let i = 0;
  while (i < 12) {
    if (boxZ[i] < 0) {
      boxX[i] = x;
      boxY[i] = y;
      boxZ[i] = z;
      let s = 0;
      while (s < 27) {
        boxId[i * 27 + s] = 0;
        boxN[i * 27 + s] = 0;
        s++;
      }
      return i;
    }
    i++;
  }
  return -1;
}

function freeChest(x, y, z) {
  let i = findChest(x, y, z);
  if (i >= 0) {
    let s = 0;
    while (s < 27) {
      if (boxId[i * 27 + s] != 0) {
        giveItem(boxId[i * 27 + s], boxN[i * 27 + s]);
      }
      s++;
    }
    boxZ[i] = -1;
  }
}

function findFurn(x, y, z) {
  let i = 0;
  while (i < 12) {
    if (furnZ[i] >= 0) {
      if (furnX[i] == x) {
        if (furnY[i] == y) {
          if (furnZ[i] == z) {
            return i;
          }
        }
      }
    }
    i++;
  }
  return -1;
}

function allocFurn(x, y, z) {
  let i = 0;
  while (i < 12) {
    if (furnZ[i] < 0) {
      furnX[i] = x;
      furnY[i] = y;
      furnZ[i] = z;
      furnInId[i] = 0;
      furnInN[i] = 0;
      furnFuelId[i] = 0;
      furnFuelN[i] = 0;
      furnOutId[i] = 0;
      furnOutN[i] = 0;
      furnProg[i] = 0;
      furnLeft[i] = 0;
      return i;
    }
    i++;
  }
  return -1;
}

function freeFurn(x, y, z) {
  let i = findFurn(x, y, z);
  if (i >= 0) {
    giveItem(furnInId[i], furnInN[i]);
    giveItem(furnFuelId[i], furnFuelN[i]);
    giveItem(furnOutId[i], furnOutN[i]);
    furnZ[i] = -1;
  }
}

function playerInside(x, y, z) {
  let x0 = camX - playerR;
  let x1 = camX + playerR;
  let y0 = camY - eyeH;
  let y1 = camY + 0.18;
  let z0 = camZ - playerR;
  let z1 = camZ + playerR;
  if (x1 <= x) {
    return 0;
  }
  if (x0 >= x + 1) {
    return 0;
  }
  if (y1 <= y) {
    return 0;
  }
  if (y0 >= y + 1) {
    return 0;
  }
  if (z1 <= z) {
    return 0;
  }
  if (z0 >= z + 1) {
    return 0;
  }
  return 1;
}

function breakHit() {
  let b = getBlock(hitX, hitY, hitZ);
  if (b == BEDROCK) {
    return;
  }
  if (b == AIR) {
    return;
  }
  if (canHarvest(b) == 1) {
    let d = dropOf(b);
    if (d != 0) {
      giveItem(d, 1);
    }
  }
  if (b == CHEST) {
    freeChest(hitX, hitY, hitZ);
  }
  if (b == FURNACE) {
    freeFurn(hitX, hitY, hitZ);
  }
  if (b == FURNACE_ON) {
    freeFurn(hitX, hitY, hitZ);
  }
  setBlock(hitX, hitY, hitZ, AIR);
}

function placeBlock() {
  let id = handId();
  if (id < 1) {
    return;
  }
  if (id > 21) {
    return;
  }
  if (id == WATER) {
    return;
  }
  if (id == BEDROCK) {
    return;
  }
  if (id == FURNACE_ON) {
    return;
  }
  if (getBlock(placeX, placeY, placeZ) != AIR) {
    return;
  }
  if (playerInside(placeX, placeY, placeZ) == 1) {
    return;
  }
  setBlock(placeX, placeY, placeZ, id);
  if (id == CHEST) {
    allocChest(placeX, placeY, placeZ);
  }
  if (id == FURNACE) {
    allocFurn(placeX, placeY, placeZ);
  }
  takeHand(1);
}

function isFood(id) {
  if (id == I_APPLE) {
    return 1;
  }
  if (id == I_BREAD) {
    return 1;
  }
  if (id == I_PORKC) {
    return 1;
  }
  if (id == I_PORK) {
    return 1;
  }
  return 0;
}

function foodHunger(id) {
  if (id == I_APPLE) {
    return 4;
  }
  if (id == I_BREAD) {
    return 5;
  }
  if (id == I_PORKC) {
    return 8;
  }
  if (id == I_PORK) {
    return 2;
  }
  return 0;
}

function eatHand() {
  let id = handId();
  if (isFood(id) == 0) {
    return;
  }
  hunger = hunger + foodHunger(id);
  if (hunger > 20) {
    hunger = 20;
  }
  if (id == I_APPLE) {
    health = health + 2;
    if (health > 20) {
      health = 20;
    }
  }
  takeHand(1);
}

function openInteract() {
  let b = getBlock(hitX, hitY, hitZ);
  if (b == CHEST) {
    openBox = findChest(hitX, hitY, hitZ);
    if (openBox < 0) {
      openBox = allocChest(hitX, hitY, hitZ);
    }
    uiMode = 2;
    invCur = 0;
    return 1;
  }
  if (b == CRAFT) {
    uiMode = 3;
    invCur = 0;
    return 1;
  }
  if (b == FURNACE) {
    openFurn = findFurn(hitX, hitY, hitZ);
    if (openFurn < 0) {
      openFurn = allocFurn(hitX, hitY, hitZ);
    }
    uiMode = 4;
    invCur = 0;
    return 1;
  }
  if (b == FURNACE_ON) {
    openFurn = findFurn(hitX, hitY, hitZ);
    if (openFurn < 0) {
      openFurn = allocFurn(hitX, hitY, hitZ);
    }
    uiMode = 4;
    invCur = 0;
    return 1;
  }
  return 0;
}

function mineNeed() {
  let b = getBlock(hitX, hitY, hitZ);
  let h = hardness(b);
  let id = handId();
  if (id == I_WPICK) {
    if (b == STONE) {
      h = Math.floor(h * 0.6);
    }
    if (b == COBBLE) {
      h = Math.floor(h * 0.6);
    }
    if (b == COAL_ORE) {
      h = Math.floor(h * 0.6);
    }
  }
  if (id == I_SPICK) {
    h = Math.floor(h * 0.45);
  }
  if (id == I_IPICK) {
    h = Math.floor(h * 0.3);
  }
  if (id == I_WAXE) {
    if (b == LOG) {
      h = Math.floor(h * 0.5);
    }
    if (b == PLANKS) {
      h = Math.floor(h * 0.5);
    }
  }
  if (id == I_WSHOV) {
    if (b == DIRT) {
      h = Math.floor(h * 0.5);
    }
    if (b == GRASS) {
      h = Math.floor(h * 0.5);
    }
    if (b == SAND) {
      h = Math.floor(h * 0.5);
    }
  }
  if (h < 4) {
    h = 4;
  }
  return h;
}

function gridCount(id) {
  let c = 0;
  let n = 4;
  if (uiMode == 3) {
    n = 9;
  }
  let i = 0;
  while (i < n) {
    if (craftId[i] == id) {
      c = c + craftN[i];
    }
    i++;
  }
  return c;
}

function gridUsed() {
  let c = 0;
  let n = 4;
  if (uiMode == 3) {
    n = 9;
  }
  let i = 0;
  while (i < n) {
    if (craftId[i] != 0) {
      c = c + 1;
    }
    i++;
  }
  return c;
}

function consumeId(id, n) {
  let left = n;
  let slots = 4;
  if (uiMode == 3) {
    slots = 9;
  }
  let i = 0;
  while (i < slots) {
    if (left > 0) {
      if (craftId[i] == id) {
        if (craftN[i] > left) {
          craftN[i] = craftN[i] - left;
          left = 0;
        } else {
          left = left - craftN[i];
          craftId[i] = 0;
          craftN[i] = 0;
        }
      }
    }
    i++;
  }
}

function cell(i) {
  return craftId[i];
}

function matchTool(top, stick) {
  if (uiMode != 3) {
    return 0;
  }
  if (cell(0) != top) {
    return 0;
  }
  if (cell(1) != top) {
    return 0;
  }
  if (cell(2) != top) {
    return 0;
  }
  if (cell(4) != stick) {
    return 0;
  }
  if (cell(7) != stick) {
    return 0;
  }
  if (cell(3) != 0) {
    return 0;
  }
  if (cell(5) != 0) {
    return 0;
  }
  if (cell(6) != 0) {
    return 0;
  }
  if (cell(8) != 0) {
    return 0;
  }
  return 1;
}

function matchAxe(top, stick) {
  if (uiMode != 3) {
    return 0;
  }
  if (cell(0) != top) {
    return 0;
  }
  if (cell(1) != top) {
    return 0;
  }
  if (cell(3) != top) {
    return 0;
  }
  if (cell(4) != stick) {
    return 0;
  }
  if (cell(7) != stick) {
    return 0;
  }
  if (cell(2) != 0) {
    return 0;
  }
  if (cell(5) != 0) {
    return 0;
  }
  if (cell(6) != 0) {
    return 0;
  }
  if (cell(8) != 0) {
    return 0;
  }
  return 1;
}

function matchShovel(top, stick) {
  if (uiMode != 3) {
    return 0;
  }
  if (cell(1) != top) {
    return 0;
  }
  if (cell(4) != stick) {
    return 0;
  }
  if (cell(7) != stick) {
    return 0;
  }
  if (cell(0) != 0) {
    return 0;
  }
  if (cell(2) != 0) {
    return 0;
  }
  if (cell(3) != 0) {
    return 0;
  }
  if (cell(5) != 0) {
    return 0;
  }
  if (cell(6) != 0) {
    return 0;
  }
  if (cell(8) != 0) {
    return 0;
  }
  return 1;
}

function updateCraft() {
  resultId = 0;
  resultN = 0;
  let logs = gridCount(LOG);
  let planks = gridCount(PLANKS);
  let sticks = gridCount(I_STICK);
  let cobble = gridCount(COBBLE);
  let coal = gridCount(I_COAL);
  let used = gridUsed();
  if (logs == 1) {
    if (used == 1) {
      resultId = PLANKS;
      resultN = 4;
    }
  }
  if (planks == 2) {
    if (used == 1) {
      resultId = I_STICK;
      resultN = 4;
    }
    if (used == 2) {
      if (logs == 0) {
        resultId = I_STICK;
        resultN = 4;
      }
    }
  }
  if (planks == 4) {
    if (used == 4) {
      resultId = CRAFT;
      resultN = 1;
    }
  }
  if (uiMode == 3) {
    if (planks == 8) {
      if (used == 8) {
        resultId = CHEST;
        resultN = 1;
      }
    }
    if (cobble == 8) {
      if (used == 8) {
        resultId = FURNACE;
        resultN = 1;
      }
    }
    if (coal >= 1) {
      if (sticks >= 1) {
        if (used == 2) {
          resultId = TORCH;
          resultN = 4;
        }
      }
    }
    if (matchTool(PLANKS, I_STICK) == 1) {
      resultId = I_WPICK;
      resultN = 1;
    }
    if (matchTool(COBBLE, I_STICK) == 1) {
      resultId = I_SPICK;
      resultN = 1;
    }
    if (matchTool(I_IRON, I_STICK) == 1) {
      resultId = I_IPICK;
      resultN = 1;
    }
    if (matchAxe(PLANKS, I_STICK) == 1) {
      resultId = I_WAXE;
      resultN = 1;
    }
    if (matchAxe(COBBLE, I_STICK) == 1) {
      resultId = I_SAXE;
      resultN = 1;
    }
    if (matchAxe(I_IRON, I_STICK) == 1) {
      resultId = I_IAXE;
      resultN = 1;
    }
    if (matchShovel(PLANKS, I_STICK) == 1) {
      resultId = I_WSHOV;
      resultN = 1;
    }
    if (matchShovel(COBBLE, I_STICK) == 1) {
      resultId = I_SSHOV;
      resultN = 1;
    }
    if (matchShovel(I_IRON, I_STICK) == 1) {
      resultId = I_ISHOV;
      resultN = 1;
    }
  }
}

function takeResult() {
  if (resultId == 0) {
    return;
  }
  if (matchTool(PLANKS, I_STICK) == 1) {
    consumeId(PLANKS, 3);
    consumeId(I_STICK, 2);
  } else {
    if (matchTool(COBBLE, I_STICK) == 1) {
      consumeId(COBBLE, 3);
      consumeId(I_STICK, 2);
    } else {
      if (matchTool(I_IRON, I_STICK) == 1) {
        consumeId(I_IRON, 3);
        consumeId(I_STICK, 2);
      } else {
        if (matchAxe(PLANKS, I_STICK) == 1) {
          consumeId(PLANKS, 3);
          consumeId(I_STICK, 2);
        } else {
          if (matchAxe(COBBLE, I_STICK) == 1) {
            consumeId(COBBLE, 3);
            consumeId(I_STICK, 2);
          } else {
            if (matchAxe(I_IRON, I_STICK) == 1) {
              consumeId(I_IRON, 3);
              consumeId(I_STICK, 2);
            } else {
              if (matchShovel(PLANKS, I_STICK) == 1) {
                consumeId(PLANKS, 1);
                consumeId(I_STICK, 2);
              } else {
                if (matchShovel(COBBLE, I_STICK) == 1) {
                  consumeId(COBBLE, 1);
                  consumeId(I_STICK, 2);
                } else {
                  if (matchShovel(I_IRON, I_STICK) == 1) {
                    consumeId(I_IRON, 1);
                    consumeId(I_STICK, 2);
                  } else {
                    if (resultId == PLANKS) {
                      consumeId(LOG, 1);
                    } else {
                      if (resultId == I_STICK) {
                        consumeId(PLANKS, 2);
                      } else {
                        if (resultId == CRAFT) {
                          consumeId(PLANKS, 4);
                        } else {
                          if (resultId == CHEST) {
                            consumeId(PLANKS, 8);
                          } else {
                            if (resultId == FURNACE) {
                              consumeId(COBBLE, 8);
                            } else {
                              if (resultId == TORCH) {
                                consumeId(I_COAL, 1);
                                consumeId(I_STICK, 1);
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  giveItem(resultId, resultN);
  updateCraft();
}

function fuelTime(id) {
  if (id == I_COAL) {
    return 80;
  }
  if (id == PLANKS) {
    return 30;
  }
  if (id == LOG) {
    return 40;
  }
  if (id == I_STICK) {
    return 10;
  }
  return 0;
}

function smeltOf(id) {
  if (id == IRON_ORE) {
    return I_IRON;
  }
  if (id == GOLD_ORE) {
    return I_GOLD;
  }
  if (id == I_PORK) {
    return I_PORKC;
  }
  return 0;
}

function tickFurnaces() {
  let i = 0;
  while (i < 12) {
    if (furnZ[i] >= 0) {
      let out = smeltOf(furnInId[i]);
      if (furnLeft[i] <= 0) {
        if (out != 0) {
          if (fuelTime(furnFuelId[i]) > 0) {
            furnLeft[i] = fuelTime(furnFuelId[i]);
            if (furnFuelN[i] > 1) {
              furnFuelN[i] = furnFuelN[i] - 1;
            } else {
              furnFuelId[i] = 0;
              furnFuelN[i] = 0;
            }
            setBlock(furnX[i], furnY[i], furnZ[i], FURNACE_ON);
          }
        }
      }
      if (furnLeft[i] > 0) {
        furnLeft[i] = furnLeft[i] - 1;
        if (out != 0) {
          furnProg[i] = furnProg[i] + 1;
          if (furnProg[i] >= 40) {
            furnProg[i] = 0;
            if (furnOutId[i] == 0) {
              furnOutId[i] = out;
              furnOutN[i] = 1;
            } else {
              if (furnOutId[i] == out) {
                furnOutN[i] = furnOutN[i] + 1;
              }
            }
            if (furnInN[i] > 1) {
              furnInN[i] = furnInN[i] - 1;
            } else {
              furnInId[i] = 0;
              furnInN[i] = 0;
            }
          }
        }
        if (furnLeft[i] <= 0) {
          setBlock(furnX[i], furnY[i], furnZ[i], FURNACE);
        }
      } else {
        furnProg[i] = 0;
      }
    }
    i++;
  }
}

function slotGetId(kind, i) {
  if (kind == 0) {
    return invId[i];
  }
  if (kind == 1) {
    return craftId[i];
  }
  if (kind == 2) {
    return boxId[openBox * 27 + i];
  }
  if (kind == 3) {
    if (i == 0) {
      return furnInId[openFurn];
    }
    if (i == 1) {
      return furnFuelId[openFurn];
    }
    return furnOutId[openFurn];
  }
  return 0;
}

function slotGetN(kind, i) {
  if (kind == 0) {
    return invN[i];
  }
  if (kind == 1) {
    return craftN[i];
  }
  if (kind == 2) {
    return boxN[openBox * 27 + i];
  }
  if (kind == 3) {
    if (i == 0) {
      return furnInN[openFurn];
    }
    if (i == 1) {
      return furnFuelN[openFurn];
    }
    return furnOutN[openFurn];
  }
  return 0;
}

function slotSet(kind, i, id, n) {
  if (kind == 0) {
    invId[i] = id;
    invN[i] = n;
  }
  if (kind == 1) {
    craftId[i] = id;
    craftN[i] = n;
  }
  if (kind == 2) {
    boxId[openBox * 27 + i] = id;
    boxN[openBox * 27 + i] = n;
  }
  if (kind == 3) {
    if (i == 0) {
      furnInId[openFurn] = id;
      furnInN[openFurn] = n;
    }
    if (i == 1) {
      furnFuelId[openFurn] = id;
      furnFuelN[openFurn] = n;
    }
    if (i == 2) {
      furnOutId[openFurn] = id;
      furnOutN[openFurn] = n;
    }
  }
}

function clickSlot(kind, i, one) {
  if (kind == 3) {
    if (i == 2) {
      if (heldId == 0) {
        heldId = slotGetId(kind, i);
        heldN = slotGetN(kind, i);
        slotSet(kind, i, 0, 0);
      }
      return;
    }
  }
  let sid = slotGetId(kind, i);
  let sn = slotGetN(kind, i);
  if (heldId == 0) {
    if (sid != 0) {
      if (one == 1) {
        heldId = sid;
        heldN = 1;
        if (sn <= 1) {
          slotSet(kind, i, 0, 0);
        } else {
          slotSet(kind, i, sid, sn - 1);
        }
      } else {
        heldId = sid;
        heldN = sn;
        slotSet(kind, i, 0, 0);
      }
    }
  } else {
    if (sid == 0) {
      if (one == 1) {
        slotSet(kind, i, heldId, 1);
        heldN = heldN - 1;
        if (heldN <= 0) {
          heldId = 0;
        }
      } else {
        slotSet(kind, i, heldId, heldN);
        heldId = 0;
        heldN = 0;
      }
    } else {
      if (sid == heldId) {
        let room = 64 - sn;
        let add = heldN;
        if (one == 1) {
          add = 1;
        }
        if (add > room) {
          add = room;
        }
        slotSet(kind, i, sid, sn + add);
        heldN = heldN - add;
        if (heldN <= 0) {
          heldId = 0;
        }
      } else {
        slotSet(kind, i, heldId, heldN);
        heldId = sid;
        heldN = sn;
      }
    }
  }
  if (kind == 1) {
    updateCraft();
  }
}

function fillRect(x0, y0, x1, y1, col) {
  let xa = x0;
  let xb = x1;
  let ya = y0;
  let yb = y1;
  if (xb < xa) {
    xa = x1;
    xb = x0;
  }
  if (yb < ya) {
    ya = y1;
    yb = y0;
  }
  pen.setColor(col);
  pen.setSize(2);
  let y = ya;
  while (y <= yb) {
    goTo(xa, y);
    pen.down();
    goTo(xb, y);
    pen.up();
    y = y + 1;
  }
  resetDrawPen();
}

function drawFrame(x0, y0, x1, y1, col) {
  fillRect(x0, y0, x1, y0 + 1, col);
  fillRect(x0, y1 - 1, x1, y1, col);
  fillRect(x0, y0, x0 + 1, y1, col);
  fillRect(x1 - 1, y0, x1, y1, col);
}

let blitBase = 0;
let blitSrc = 0;
let blitSx = 0;
let blitSy = 0;
let blitSc = 1;
let slotX = 0;
let slotY = 0;

function blitPaint(rx, run, y, col) {
  paintRun(blitSx + rx * blitSc, blitSy + (y + 1) * blitSc, run * blitSc, blitSc, col);
}

function blitRow(y) {
  let x = 0;
  let have = 0;
  let run = 0;
  let rx = 0;
  let col = 0;
  while (x < TEX) {
    let idx = blitBase + (TEX - 1 - y) * TEX + x;
    let r = 0;
    let g = 0;
    let b = 0;
    if (blitSrc == 0) {
      r = tr[idx];
      g = tg[idx];
      b = tb[idx];
    } else {
      r = ir[idx];
      g = ig[idx];
      b = ib[idx];
    }
    if (r + g + b == 0) {
      if (have == 1) {
        blitPaint(rx, run, y, col);
        have = 0;
      }
    } else {
      let c = r * 65536 + g * 256 + b;
      if (have == 1) {
        if (c == col) {
          run = run + 1;
        } else {
          blitPaint(rx, run, y, col);
          rx = x;
          run = 1;
          col = c;
        }
      } else {
        have = 1;
        rx = x;
        run = 1;
        col = c;
      }
    }
    x++;
  }
  if (have == 1) {
    blitPaint(rx, run, y, col);
  }
}

function blitIcon() {
  let y = 0;
  while (y < TEX) {
    blitRow(y);
    y++;
  }
  resetDrawPen();
}

function drawItemIcon(id, sx, sy, sc) {
  if (id <= 0) {
    return;
  }
  blitSx = sx;
  blitSy = sy;
  blitSc = sc;
  let it = itemTex(id);
  if (it >= 0) {
    blitSrc = 1;
    blitBase = itemOff[it];
    blitIcon();
  } else {
    blitSrc = 0;
    blitBase = texOff[blockItemTex(id)];
    blitIcon();
  }
}

function drawDigit(n, sx, sy, col) {
  if (n < 0) {
    n = 0;
  }
  if (n > 9) {
    n = 9;
  }
  let row = 0;
  while (row < 5) {
    let bits = DIG[n * 5 + row];
    let colx = 0;
    while (colx < 3) {
      let on = 0;
      if (colx == 0) {
        if (bits >= 4) {
          on = 1;
        }
      }
      if (colx == 1) {
        if (Math.floor(bits / 2) % 2 == 1) {
          on = 1;
        }
      }
      if (colx == 2) {
        if (bits % 2 == 1) {
          on = 1;
        }
      }
      if (on == 1) {
        pen.setColor(col);
        pen.setSize(2);
        goTo(sx + colx * 2, sy + (4 - row) * 2);
        pen.down();
        changeX(1);
        pen.up();
      }
      colx++;
    }
    row++;
  }
  resetDrawPen();
}

function drawBitsRow(bits, sx, sy, col) {
  let colx = 0;
  while (colx < 3) {
    let on = 0;
    if (colx == 0) {
      if (bits >= 4) {
        on = 1;
      }
    }
    if (colx == 1) {
      if (Math.floor(bits / 2) % 2 == 1) {
        on = 1;
      }
    }
    if (colx == 2) {
      if (bits % 2 == 1) {
        on = 1;
      }
    }
    if (on == 1) {
      pen.setColor(col);
      pen.setSize(2);
      goTo(sx + colx * 2, sy);
      pen.down();
      changeX(1);
      pen.up();
    }
    colx++;
  }
}

function drawGlyphFont(g, sx, sy, col) {
  let row = 0;
  while (row < 5) {
    drawBitsRow(FONT[g * 5 + row], sx, sy + (4 - row) * 2, col);
    row++;
  }
}

function drawChar(ch, sx, sy, col) {
  let d = 0;
  while (d < 10) {
    if (ch == DIGS[d]) {
      drawDigit(d, sx, sy, col);
      return;
    }
    d++;
  }
  let g = 0;
  while (g < 26) {
    if (ch == ABC[g]) {
      drawGlyphFont(g, sx, sy, col);
      return;
    }
    g++;
  }
}

function drawText(sx, sy, col) {
  let i = 0;
  let x = sx;
  while (i < textDraw.length) {
    let ch = textDraw[i];
    if (ch != " ") {
      drawChar(ch, x, sy, col);
    }
    x = x + 8;
    i++;
  }
  resetDrawPen();
}

function drawNumber(n, sx, sy, col) {
  if (n < 0) {
    n = 0;
  }
  if (n >= 100) {
    drawDigit(Math.floor(n / 100), sx, sy, col);
    drawDigit(Math.floor(n / 10) % 10, sx + 8, sy, col);
    drawDigit(n % 10, sx + 16, sy, col);
  } else {
    if (n < 10) {
      drawDigit(n, sx, sy, col);
    } else {
      drawDigit(Math.floor(n / 10), sx, sy, col);
      drawDigit(n % 10, sx + 8, sy, col);
    }
  }
}

function drawSlot(sx, sy, id, n, sel) {
  fillRect(sx, sy, sx + 20, sy + 20, 14540253);
  fillRect(sx + 1, sy + 1, sx + 19, sy + 19, 3552822);
  if (sel == 1) {
    drawFrame(sx - 2, sy - 2, sx + 22, sy + 22, 16777215);
  }
  drawItemIcon(id, sx + 2, sy + 2, 1);
  if (n > 1) {
    drawNumber(n, sx + 11, sy + 2, 16777215);
  }
}

function drawHearts() {
  let i = 0;
  while (i < 10) {
    let x = -108 + i * 10;
    let y = -138;
    let col = 4210752;
    if (i * 2 < health) {
      col = 14680064;
    }
    fillRect(x, y, x + 8, y + 7, col);
    i++;
  }
}

function drawHunger() {
  let i = 0;
  while (i < 10) {
    let x = 10 + i * 10;
    let y = -138;
    let col = 4210752;
    if (i * 2 < hunger) {
      col = 10249250;
    }
    fillRect(x, y, x + 8, y + 7, col);
    i++;
  }
}

function drawHotbar() {
  fillRect(-112, -176, 112, -148, 1118481);
  drawFrame(-113, -177, 113, -147, 0);
  let i = 0;
  while (i < 9) {
    let sx = -108 + i * 24;
    let sel = 0;
    if (i == hotbar) {
      sel = 1;
    }
    drawSlot(sx, -174, invId[i], invN[i], sel);
    i++;
  }
  drawHearts();
  drawHunger();
}

function invSlotPos(i) {
  let col = 0;
  let row = 0;
  if (i < 9) {
    col = i;
    slotX = -108 + col * 24;
    slotY = -78;
  } else {
    col = (i - 9) % 9;
    row = Math.floor((i - 9) / 9);
    slotX = -108 + col * 24;
    slotY = 62 - row * 24;
  }
}

function drawInvGrid() {
  fillRect(-130, -108, 130, 108, 13027014);
  fillRect(-126, -104, 126, 104, 8947848);
  drawFrame(-130, -108, 130, 108, 0);
  let i = 0;
  while (i < 27) {
    invSlotPos(i);
    let sel = 0;
    if (invCur == i) {
      sel = 1;
    }
    drawSlot(slotX, slotY, invId[i], invN[i], sel);
    i++;
  }
}

function drawCraftGrid() {
  let n = 4;
  if (uiMode == 3) {
    n = 9;
  }
  let i = 0;
  while (i < n) {
    craftSlotPos(i);
    let sel = 0;
    if (invCur == 27 + i) {
      sel = 1;
    }
    drawSlot(slotX, slotY, craftId[i], craftN[i], sel);
    i++;
  }
  let rsel = 0;
  if (invCur == 40) {
    rsel = 1;
  }
  drawSlot(56, -20, resultId, resultN, rsel);
}

function drawChestUi() {
  fillRect(-130, -108, 130, 108, 13027014);
  fillRect(-126, -104, 126, 104, 8947848);
  drawFrame(-130, -108, 130, 108, 0);
  let i = 0;
  let col = 0;
  let row = 0;
  let sx = 0;
  let sy = 0;
  let sel = 0;
  while (i < 27) {
    col = i % 9;
    row = Math.floor(i / 9);
    sx = -108 + col * 24;
    sy = 74 - row * 24;
    sel = 0;
    if (invCur == i) {
      sel = 1;
    }
    drawSlot(sx, sy, boxId[openBox * 27 + i], boxN[openBox * 27 + i], sel);
    i++;
  }
  i = 0;
  while (i < 27) {
    col = i % 9;
    if (i < 9) {
      sy = -78;
      sx = -108 + col * 24;
    } else {
      row = Math.floor((i - 9) / 9);
      col = (i - 9) % 9;
      sx = -108 + col * 24;
      sy = -8 - row * 24;
    }
    sel = 0;
    if (invCur == 27 + i) {
      sel = 1;
    }
    drawSlot(sx, sy, invId[i], invN[i], sel);
    i++;
  }
}

function drawFurnUi() {
  fillRect(-130, -108, 130, 108, 13027014);
  fillRect(-126, -104, 126, 104, 8947848);
  drawFrame(-130, -108, 130, 108, 0);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  if (invCur == 0) {
    s0 = 1;
  }
  if (invCur == 1) {
    s1 = 1;
  }
  if (invCur == 2) {
    s2 = 1;
  }
  drawSlot(-24, 70, furnInId[openFurn], furnInN[openFurn], s0);
  drawSlot(-24, 38, furnFuelId[openFurn], furnFuelN[openFurn], s1);
  drawSlot(40, 54, furnOutId[openFurn], furnOutN[openFurn], s2);
  fillRect(4, 58, 4 + furnProg[openFurn], 64, 16755200);
  let i = 0;
  let col = 0;
  let row = 0;
  let sx = 0;
  let sy = 0;
  while (i < 27) {
    col = i % 9;
    if (i < 9) {
      sx = -108 + col * 24;
      sy = -78;
    } else {
      row = Math.floor((i - 9) / 9);
      col = (i - 9) % 9;
      sx = -108 + col * 24;
      sy = -8 - row * 24;
    }
    let sel = 0;
    if (invCur == 3 + i) {
      sel = 1;
    }
    drawSlot(sx, sy, invId[i], invN[i], sel);
    i++;
  }
}

function pointInSlot(sx, sy) {
  if (mx < sx) {
    return 0;
  }
  if (mx >= sx + 20) {
    return 0;
  }
  if (my < sy) {
    return 0;
  }
  if (my >= sy + 20) {
    return 0;
  }
  return 1;
}

function hitPlayerInv() {
  let i = 0;
  while (i < 27) {
    invSlotPos(i);
    if (pointInSlot(slotX, slotY) == 1) {
      hitKind = 0;
      hitSlot = i;
      invCur = i;
    }
    i++;
  }
}

function craftSlotPos(i) {
  let cols = 2;
  let ox = -24;
  let oy = -8;
  if (uiMode == 3) {
    cols = 3;
    ox = -36;
    oy = 10;
  }
  let col = i % cols;
  let row = Math.floor(i / cols);
  slotX = ox + col * 24;
  slotY = oy - row * 24;
}

function hitCraftGrid() {
  let n = 4;
  if (uiMode == 3) {
    n = 9;
  }
  let i = 0;
  while (i < n) {
    craftSlotPos(i);
    if (pointInSlot(slotX, slotY) == 1) {
      hitKind = 1;
      hitSlot = i;
      invCur = 27 + i;
    }
    i++;
  }
  if (pointInSlot(56, -20) == 1) {
    hitKind = 4;
    hitSlot = 0;
    invCur = 40;
  }
}

function hitChestInv() {
  let i = 0;
  let col = 0;
  let row = 0;
  let sx = 0;
  let sy = 0;
  while (i < 27) {
    col = i % 9;
    row = Math.floor(i / 9);
    sx = -108 + col * 24;
    sy = 74 - row * 24;
    if (pointInSlot(sx, sy) == 1) {
      hitKind = 2;
      hitSlot = i;
      invCur = i;
    }
    i++;
  }
  i = 0;
  while (i < 27) {
    col = i % 9;
    if (i < 9) {
      sy = -78;
      sx = -108 + col * 24;
    } else {
      row = Math.floor((i - 9) / 9);
      col = (i - 9) % 9;
      sx = -108 + col * 24;
      sy = -8 - row * 24;
    }
    if (pointInSlot(sx, sy) == 1) {
      hitKind = 0;
      hitSlot = i;
      invCur = 27 + i;
    }
    i++;
  }
}

function hitFurnUi() {
  if (pointInSlot(-24, 70) == 1) {
    hitKind = 3;
    hitSlot = 0;
    invCur = 0;
  }
  if (pointInSlot(-24, 38) == 1) {
    hitKind = 3;
    hitSlot = 1;
    invCur = 1;
  }
  if (pointInSlot(40, 54) == 1) {
    hitKind = 3;
    hitSlot = 2;
    invCur = 2;
  }
  let i = 0;
  let col = 0;
  let row = 0;
  let sx = 0;
  let sy = 0;
  while (i < 27) {
    col = i % 9;
    if (i < 9) {
      sx = -108 + col * 24;
      sy = -78;
    } else {
      row = Math.floor((i - 9) / 9);
      col = (i - 9) % 9;
      sx = -108 + col * 24;
      sy = -8 - row * 24;
    }
    if (pointInSlot(sx, sy) == 1) {
      hitKind = 0;
      hitSlot = i;
      invCur = 3 + i;
    }
    i++;
  }
}

function findUiHit() {
  hitKind = -1;
  hitSlot = 0;
  if (uiMode == 1) {
    hitPlayerInv();
    hitCraftGrid();
  }
  if (uiMode == 3) {
    hitPlayerInv();
    hitCraftGrid();
  }
  if (uiMode == 2) {
    hitChestInv();
  }
  if (uiMode == 4) {
    hitFurnUi();
  }
}

function applyUiClick() {
  if (hitKind < 0) {
    return;
  }
  let one = 0;
  if (spreadKey() == 1) {
    one = 1;
  }
  if (hitKind == 4) {
    takeResult();
  } else {
    clickSlot(hitKind, hitSlot, one);
  }
}

function spreadKey() {
  if (keyPressed("r")) {
    return 1;
  }
  if (keyPressed("shift")) {
    return 1;
  }
  return 0;
}

function alreadySpread() {
  let code = hitKind * 64 + hitSlot;
  let i = 0;
  while (i < spreadN) {
    if (spreadMark[i] == code) {
      return 1;
    }
    i++;
  }
  return 0;
}

function markSpread() {
  let code = hitKind * 64 + hitSlot;
  if (spreadN < spreadMark.length) {
    spreadMark[spreadN] = code;
  } else {
    spreadMark.push(code);
  }
  spreadN = spreadN + 1;
}

function trySpread() {
  if (heldId == 0) {
    return;
  }
  if (hitKind < 0) {
    return;
  }
  if (hitKind == 4) {
    return;
  }
  if (hitKind == 3) {
    if (hitSlot == 2) {
      return;
    }
  }
  if (alreadySpread() == 1) {
    return;
  }
  clickSlot(hitKind, hitSlot, 1);
  markSpread();
}

function handleUiMouse() {
  mx = mouseX();
  my = mouseY();
  let moved = 0;
  if (mx != lastMx) {
    moved = 1;
  }
  if (my != lastMy) {
    moved = 1;
  }
  lastMx = mx;
  lastMy = my;
  let down = 0;
  if (mouseDown()) {
    down = 1;
  }
  if (moved == 1) {
    findUiHit();
  }
  if (down == 1) {
    if (wasMouse == 0) {
      findUiHit();
      spreadN = 0;
      if (spreadKey() == 1) {
        if (heldId != 0) {
          trySpread();
        } else {
          applyUiClick();
        }
      } else {
        applyUiClick();
      }
    } else {
      if (spreadKey() == 1) {
        if (heldId != 0) {
          findUiHit();
          trySpread();
        }
      }
    }
  } else {
    spreadN = 0;
  }
  wasMouse = down;
}

function drawHeld() {
  if (heldId == 0) {
    return;
  }
  if (uiMode == 0) {
    return;
  }
  drawItemIcon(heldId, mouseX() - 8, mouseY() - 8, 1);
  if (heldN > 1) {
    drawNumber(heldN, mouseX() + 4, mouseY() - 8, 16777215);
  }
}

function handleUiKeys() {
  let downP = 0;
  if (keyPressed("p")) {
    downP = 1;
  }
  if (downP == 1) {
    if (wasP == 0) {
      settingsBack = 1;
      settingsRow = 0;
      scene = 2;
    }
  }
  wasP = downP;
  if (scene == 2) {
    return;
  }
  let downE = 0;
  if (keyPressed("e")) {
    downE = 1;
  }
  if (downE == 1) {
    if (wasE == 0) {
      uiMode = 0;
      openBox = -1;
      openFurn = -1;
    }
  }
  wasE = downE;
  let dx = 0;
  let dy = 0;
  let left = 0;
  let right = 0;
  let up = 0;
  let down = 0;
  if (keyPressed("left arrow")) {
    left = 1;
  }
  if (keyPressed("right arrow")) {
    right = 1;
  }
  if (keyPressed("up arrow")) {
    up = 1;
  }
  if (keyPressed("down arrow")) {
    down = 1;
  }
  if (left == 1) {
    if (wasLeft == 0) {
      dx = -1;
    }
  }
  if (right == 1) {
    if (wasRight == 0) {
      dx = 1;
    }
  }
  if (up == 1) {
    if (wasUp == 0) {
      dy = -1;
    }
  }
  if (down == 1) {
    if (wasDown == 0) {
      dy = 1;
    }
  }
  wasLeft = left;
  wasRight = right;
  wasUp = up;
  wasDown = down;
  if (dx != 0) {
    invCur = invCur + dx;
  }
  if (dy != 0) {
    if (uiMode == 4) {
      invCur = invCur + dy;
    } else {
      invCur = invCur + dy * 9;
    }
  }
  if (invCur < 0) {
    invCur = 0;
  }
  handleUiMouse();
  let downF = 0;
  if (keyPressed("f")) {
    downF = 1;
  }
  let downR = 0;
  if (keyPressed("r")) {
    downR = 1;
  }
  let downC = 0;
  if (keyPressed("c")) {
    downC = 1;
  }
  if (uiMode == 1) {
    if (invCur > 40) {
      invCur = 40;
    }
    if (downF == 1) {
      if (wasF == 0) {
        if (invCur == 40) {
          takeResult();
        } else {
          if (invCur >= 27) {
            clickSlot(1, invCur - 27, 0);
          } else {
            clickSlot(0, invCur, 0);
          }
        }
      }
    }
    if (downR == 1) {
      if (wasR == 0) {
        if (invCur < 27) {
          clickSlot(0, invCur, 1);
        } else {
          if (invCur < 40) {
            clickSlot(1, invCur - 27, 1);
          }
        }
      }
    }
    if (downC == 1) {
      if (wasC == 0) {
        takeResult();
      }
    }
    updateCraft();
  }
  if (uiMode == 2) {
    if (invCur > 53) {
      invCur = 53;
    }
    if (downF == 1) {
      if (wasF == 0) {
        if (invCur < 27) {
          clickSlot(2, invCur, 0);
        } else {
          clickSlot(0, invCur - 27, 0);
        }
      }
    }
    if (downR == 1) {
      if (wasR == 0) {
        if (invCur < 27) {
          clickSlot(2, invCur, 1);
        } else {
          clickSlot(0, invCur - 27, 1);
        }
      }
    }
  }
  if (uiMode == 3) {
    if (invCur > 40) {
      invCur = 40;
    }
    if (downF == 1) {
      if (wasF == 0) {
        if (invCur == 40) {
          takeResult();
        } else {
          if (invCur >= 27) {
            clickSlot(1, invCur - 27, 0);
          } else {
            clickSlot(0, invCur, 0);
          }
        }
      }
    }
    if (downC == 1) {
      if (wasC == 0) {
        takeResult();
      }
    }
    if (downR == 1) {
      if (wasR == 0) {
        if (wasMouse == 0) {
          if (invCur < 27) {
            clickSlot(0, invCur, 1);
          } else {
            if (invCur < 36) {
              clickSlot(1, invCur - 27, 1);
            }
          }
        }
      }
    }
    updateCraft();
  }
  if (uiMode == 4) {
    if (invCur > 20) {
      invCur = 20;
    }
    if (downF == 1) {
      if (wasF == 0) {
        if (invCur < 3) {
          clickSlot(3, invCur, 0);
        } else {
          clickSlot(0, invCur - 3, 0);
        }
      }
    }
  }
  wasF = downF;
  wasR = downR;
  wasC = downC;
}

function updateDay() {
  worldTime = worldTime + dayTick;
  if (worldTime > 24000) {
    worldTime = worldTime - 24000;
  }
  let t = worldTime;
  let u = 0;
  ambient = 1;
  skyBlend = 1;
  if (t >= 10000) {
    if (t < 12000) {
      u = (t - 10000) / 2000;
      ambient = 1 - u * 0.25;
      skyBlend = 1 - u * 0.5;
    } else {
      if (t < 14000) {
        u = (t - 12000) / 2000;
        ambient = 0.75 - u * 0.3;
        skyBlend = 0.5 - u * 0.5;
      } else {
        if (t < 20000) {
          ambient = 0.45;
          skyBlend = 0;
        } else {
          if (t < 22000) {
            u = (t - 20000) / 2000;
            ambient = 0.45 + u * 0.3;
            skyBlend = u * 0.5;
          } else {
            u = (t - 22000) / 2000;
            ambient = 0.75 + u * 0.25;
            skyBlend = 0.5 + u * 0.5;
          }
        }
      }
    }
  }
}

function survivalTick() {
  inWater = feetWater();
  if (headWater() == 1) {
    air = air - 1;
    if (air < 0) {
      air = 0;
      if (hurtCd <= 0) {
        health = health - 2;
        hurtCd = 20;
      }
    }
  } else {
    air = 20;
  }
  hungerT = hungerT + 1;
  if (hungerT > 400) {
    hungerT = 0;
    if (hunger > 0) {
      hunger = hunger - 1;
    }
  }
  if (hunger <= 0) {
    if (hurtCd <= 0) {
      health = health - 1;
      hurtCd = 40;
    }
  }
  if (hunger >= 18) {
    if (health < 20) {
      if (hurtCd <= 0) {
        health = health + 1;
        hurtCd = 50;
      }
    }
  }
  if (hurtCd > 0) {
    hurtCd = hurtCd - 1;
  }
  if (health <= 0) {
    health = 20;
    hunger = 20;
    camX = spawnX;
    camY = spawnY;
    camZ = spawnZ;
    velY = 0;
    meshDirty = 1;
  }
}

function handleHotbarKeys() {
  if (keyPressed("1")) {
    hotbar = 0;
  }
  if (keyPressed("2")) {
    hotbar = 1;
  }
  if (keyPressed("3")) {
    hotbar = 2;
  }
  if (keyPressed("4")) {
    hotbar = 3;
  }
  if (keyPressed("5")) {
    hotbar = 4;
  }
  if (keyPressed("6")) {
    hotbar = 5;
  }
  if (keyPressed("7")) {
    hotbar = 6;
  }
  if (keyPressed("8")) {
    hotbar = 7;
  }
  if (keyPressed("9")) {
    hotbar = 8;
  }
}

function handleHotbarMouse() {
  mx = mouseX();
  my = mouseY();
  let down = 0;
  if (mouseDown()) {
    down = 1;
  }
  if (down == 1) {
    if (wasMouse == 0) {
      let i = 0;
      while (i < 9) {
        let sx = -108 + i * 24;
        if (pointInSlot(sx, -174) == 1) {
          hotbar = i;
        }
        i++;
      }
    }
  }
  wasMouse = down;
}

function updateGame() {
  ensureAroundPlayer();
  handleHotbarKeys();
  handleHotbarMouse();
  let downP = 0;
  if (keyPressed("p")) {
    downP = 1;
  }
  if (downP == 1) {
    if (wasP == 0) {
      settingsBack = 1;
      settingsRow = 0;
      scene = 2;
    }
  }
  wasP = downP;
  if (scene == 2) {
    return;
  }
  let downE = 0;
  if (keyPressed("e")) {
    downE = 1;
  }
  if (downE == 1) {
    if (wasE == 0) {
      uiMode = 1;
      invCur = 0;
      updateCraft();
    }
  }
  wasE = downE;
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
  let spd = moveSpeed;
  if (keyPressed("shift")) {
    spd = spd * 0.4;
  }
  if (inWater == 1) {
    spd = spd * 0.5;
  }
  let fx = Math.sin(yaw);
  let fz = Math.cos(yaw);
  let dx = 0;
  let dz = 0;
  if (keyPressed("w")) {
    dx = dx + fx * spd;
    dz = dz + fz * spd;
  }
  if (keyPressed("s")) {
    dx = dx - fx * spd;
    dz = dz - fz * spd;
  }
  if (keyPressed("a")) {
    dx = dx - fz * spd;
    dz = dz + fx * spd;
  }
  if (keyPressed("d")) {
    dx = dx + fz * spd;
    dz = dz - fx * spd;
  }
  if (inWater == 1) {
    velY = velY - 0.025;
    if (keyPressed("space")) {
      velY = 0.26;
    }
    if (velY < -0.14) {
      velY = -0.14;
    }
    if (velY > 0.3) {
      velY = 0.3;
    }
  } else {
    velY = velY - 0.028;
    if (velY < -0.4) {
      velY = -0.4;
    }
    let sp = 0;
    if (keyPressed("space")) {
      sp = 1;
    }
    if (sp == 1) {
      if (onGround == 1) {
        if (wasSpace == 0) {
          velY = 0.28;
          onGround = 0;
        }
      } else {
        if (wasInWater == 1) {
          velY = 0.38;
        }
      }
    }
    wasSpace = sp;
  }
  wasInWater = inWater;
  if (inWater == 1) {
    fallY = 0;
  }
  onGround = 0;
  movePlayer(dx, velY, dz);
  raycast();
  let downF = 0;
  if (keyPressed("f")) {
    downF = 1;
  }
  let downR = 0;
  if (keyPressed("r")) {
    downR = 1;
  }
  if (downF == 1) {
    if (hitOn == 1) {
      if (hitX == mineX) {
        if (hitY == mineY) {
          if (hitZ == mineZ) {
            mineT = mineT + 1;
          } else {
            mineT = 1;
            mineX = hitX;
            mineY = hitY;
            mineZ = hitZ;
          }
        } else {
          mineT = 1;
          mineX = hitX;
          mineY = hitY;
          mineZ = hitZ;
        }
      } else {
        mineT = 1;
        mineX = hitX;
        mineY = hitY;
        mineZ = hitZ;
      }
      if (mineT >= mineNeed()) {
        breakHit();
        mineT = 0;
      }
    } else {
      mineT = 0;
    }
  } else {
    mineT = 0;
  }
  if (downR == 1) {
    if (wasR == 0) {
      if (hitOn == 1) {
        let used = openInteract();
        if (used == 0) {
          if (handId() >= 1) {
            if (handId() <= 21) {
              placeBlock();
            } else {
              eatHand();
            }
          }
        }
      } else {
        eatHand();
      }
    }
  }
  wasF = downF;
  wasR = downR;
  survivalTick();
  tickFurnaces();
  updateDay();
  let cxn = Math.floor(camX / 4);
  let czn = Math.floor(camZ / 4);
  if (meshDirty == 1) {
    rebuildMesh();
  } else {
    if (cxn != Math.floor(meshCX / 4)) {
      rebuildMesh();
    } else {
      if (czn != Math.floor(meshCZ / 4)) {
        rebuildMesh();
      }
    }
  }
}

function renderHud() {
  if (uiMode == 0) {
    drawCrosshair();
    drawHotbar();
  }
  if (uiMode == 1) {
    drawInvGrid();
    drawCraftGrid();
  }
  if (uiMode == 2) {
    drawChestUi();
  }
  if (uiMode == 3) {
    drawInvGrid();
    drawCraftGrid();
  }
  if (uiMode == 4) {
    drawFurnUi();
  }
  drawHeld();
}

function render() {
  fillSky();
  clearZ();
  transformVerts();
  drawMesh();
  drawWaterTint();
  renderHud();
}

function drawWaterTint() {
  if (headWater() == 0) {
    return;
  }
  pen.setColor(2003199);
  pen.setSize(2);
  let y = 180;
  while (y > -180) {
    goTo(-240, y);
    pen.down();
    goTo(240, y);
    pen.up();
    y = y - 3;
  }
  resetDrawPen();
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

function inBox(x0, y0, x1, y1) {
  if (mx < x0) {
    return 0;
  }
  if (mx > x1) {
    return 0;
  }
  if (my < y0) {
    return 0;
  }
  if (my > y1) {
    return 0;
  }
  return 1;
}

function drawMenuButton(x0, y0, x1, y1, sel) {
  fillRect(x0, y0, x1, y1, 3552822);
  if (sel == 1) {
    drawFrame(x0 - 2, y0 - 2, x1 + 2, y1 + 2, 16777215);
  } else {
    drawFrame(x0, y0, x1, y1, 8947848);
  }
}

function drawMainMenu() {
  fillSky();
  goTo(0, 80);
  pen.stamp();
  resetDrawPen();
  let psel = 0;
  let ssel = 0;
  if (menuSel == 0) {
    psel = 1;
  } else {
    ssel = 1;
  }
  drawMenuButton(-90, -10, 90, 22, psel);
  textDraw = "PLAY";
  drawText(-16, 0, 16777215);
  drawMenuButton(-90, -52, 90, -20, ssel);
  textDraw = "SETTINGS";
  drawText(-32, -42, 16777215);
}

function drawGenScreen() {
  fillSky();
  fillRect(-130, -24, 130, 24, 3552822);
  drawFrame(-130, -24, 130, 24, 0);
  let w = 0;
  if (genTotal > 0) {
    w = Math.floor(248 * genDone / genTotal);
  }
  if (w < 0) {
    w = 0;
  }
  if (w > 248) {
    w = 248;
  }
  fillRect(-124, -16, -124 + w, 16, 65280);
  textDraw = "GENERATING";
  drawText(-40, 40, 16777215);
}

function drawSettings() {
  fillRect(-150, -140, 150, 130, 13027014);
  fillRect(-146, -136, 146, 126, 8947848);
  drawFrame(-150, -140, 150, 130, 0);
  textDraw = "SETTINGS";
  drawText(-32, 112, 16777215);
  let i = 0;
  let y = 78;
  let val = 0;
  while (i < 5) {
    let sel = 0;
    if (settingsRow == i) {
      sel = 1;
    }
    drawMenuButton(-140, y - 14, 140, y + 14, sel);
    if (i == 0) {
      textDraw = "WORLD SIZE";
      drawText(-132, y - 5, 16777215);
      val = worldSizeNext;
      drawNumber(val, 70, y - 5, 16777215);
    }
    if (i == 1) {
      textDraw = "DISTANCE";
      drawText(-132, y - 5, 16777215);
      val = viewDist;
      drawNumber(val, 70, y - 5, 16777215);
    }
    if (i == 2) {
      textDraw = "SCALE";
      drawText(-132, y - 5, 16777215);
      val = SCALE;
      drawNumber(val, 70, y - 5, 16777215);
    }
    if (i == 3) {
      textDraw = "PEN";
      drawText(-132, y - 5, 16777215);
      if (DRAW_FAT_PEN == 1) {
        textDraw = "FAT";
        drawText(70, y - 5, 16777215);
      } else {
        textDraw = "SOLID";
        drawText(54, y - 5, 16777215);
      }
    }
    if (i == 4) {
      textDraw = "DAY SPEED";
      drawText(-132, y - 5, 16777215);
      val = dayTick;
      drawNumber(val, 70, y - 5, 16777215);
    }
    y = y - 32;
    i++;
  }
  let bsel = 0;
  if (settingsRow == 5) {
    bsel = 1;
  }
  drawMenuButton(-70, -128, 70, -100, bsel);
  textDraw = "BACK";
  drawText(-16, -120, 16777215);
}

function nudgeViewDist(dir) {
  if (dir > 0) {
    if (viewDist < 8) {
      viewDist = 8;
    } else {
      if (viewDist < 12) {
        viewDist = 12;
      } else {
        viewDist = 16;
      }
    }
  } else {
    if (viewDist > 12) {
      viewDist = 12;
    } else {
      if (viewDist > 8) {
        viewDist = 8;
      } else {
        viewDist = 6;
      }
    }
  }
  meshDirty = 1;
}

function nudgeDayTick(dir) {
  if (dir > 0) {
    if (dayTick < 2) {
      dayTick = 2;
    } else {
      if (dayTick < 4) {
        dayTick = 4;
      } else {
        dayTick = 8;
      }
    }
  } else {
    if (dayTick > 4) {
      dayTick = 4;
    } else {
      if (dayTick > 2) {
        dayTick = 2;
      } else {
        dayTick = 1;
      }
    }
  }
}

function applySetting(dir) {
  if (settingsRow == 0) {
    if (worldSizeNext == 128) {
      worldSizeNext = 256;
    } else {
      worldSizeNext = 128;
    }
  }
  if (settingsRow == 1) {
    nudgeViewDist(dir);
  }
  if (settingsRow == 2) {
    SCALE = SCALE + dir;
    if (SCALE < 2) {
      SCALE = 2;
    }
    if (SCALE > 6) {
      SCALE = 6;
    }
    applyScale();
    while (zbuf.length < gfxLen) {
      zbuf.push(0);
    }
    meshDirty = 1;
  }
  if (settingsRow == 3) {
    if (DRAW_FAT_PEN == 0) {
      DRAW_FAT_PEN = 1;
    } else {
      DRAW_FAT_PEN = 0;
    }
    resetDrawPen();
  }
  if (settingsRow == 4) {
    nudgeDayTick(dir);
  }
}

function closeSettings() {
  if (settingsBack == 1) {
    scene = 1;
  } else {
    scene = 0;
  }
}

function handleSettings() {
  mx = mouseX();
  my = mouseY();
  let down = 0;
  if (mouseDown()) {
    down = 1;
  }
  let left = 0;
  let right = 0;
  let up = 0;
  let dn = 0;
  let act = 0;
  if (keyPressed("left arrow")) {
    left = 1;
  }
  if (keyPressed("right arrow")) {
    right = 1;
  }
  if (keyPressed("up arrow")) {
    up = 1;
  }
  if (keyPressed("down arrow")) {
    dn = 1;
  }
  if (keyPressed("space")) {
    act = 1;
  }
  if (keyPressed("f")) {
    act = 1;
  }
  let downP = 0;
  if (keyPressed("p")) {
    downP = 1;
  }
  if (downP == 1) {
    if (wasP == 0) {
      closeSettings();
    }
  }
  wasP = downP;
  if (up == 1) {
    if (wasUp == 0) {
      settingsRow = settingsRow - 1;
      if (settingsRow < 0) {
        settingsRow = 5;
      }
    }
  }
  if (dn == 1) {
    if (wasDown == 0) {
      settingsRow = settingsRow + 1;
      if (settingsRow > 5) {
        settingsRow = 0;
      }
    }
  }
  if (left == 1) {
    if (wasLeft == 0) {
      if (settingsRow < 5) {
        applySetting(-1);
      }
    }
  }
  if (right == 1) {
    if (wasRight == 0) {
      if (settingsRow < 5) {
        applySetting(1);
      }
    }
  }
  if (act == 1) {
    if (wasSpace == 0) {
      if (settingsRow == 5) {
        closeSettings();
      } else {
        applySetting(1);
      }
    }
  }
  if (down == 1) {
    if (wasMouse == 0) {
      let row = 0;
      let y = 78;
      while (row < 5) {
        if (inBox(-140, y - 14, 140, y + 14) == 1) {
          settingsRow = row;
          if (mx < 0) {
            applySetting(-1);
          } else {
            applySetting(1);
          }
        }
        y = y - 32;
        row++;
      }
      if (inBox(-70, -128, 70, -100) == 1) {
        settingsRow = 5;
        closeSettings();
      }
    }
  }
  wasLeft = left;
  wasRight = right;
  wasUp = up;
  wasDown = dn;
  wasSpace = act;
  wasMouse = down;
}

function handleMenu() {
  mx = mouseX();
  my = mouseY();
  let down = 0;
  if (mouseDown()) {
    down = 1;
  }
  let up = 0;
  let dn = 0;
  let act = 0;
  if (keyPressed("up arrow")) {
    up = 1;
  }
  if (keyPressed("down arrow")) {
    dn = 1;
  }
  if (keyPressed("space")) {
    act = 1;
  }
  if (keyPressed("f")) {
    act = 1;
  }
  if (up == 1) {
    if (wasUp == 0) {
      menuSel = 0;
    }
  }
  if (dn == 1) {
    if (wasDown == 0) {
      menuSel = 1;
    }
  }
  if (act == 1) {
    if (wasSpace == 0) {
      if (menuSel == 0) {
        startNewWorld();
      } else {
        settingsBack = 0;
        settingsRow = 0;
        scene = 2;
      }
    }
  }
  if (down == 1) {
    if (wasMouse == 0) {
      if (inBox(-90, -10, 90, 22) == 1) {
        menuSel = 0;
        startNewWorld();
      }
      if (inBox(-90, -52, 90, -20) == 1) {
        menuSel = 1;
        settingsBack = 0;
        settingsRow = 0;
        scene = 2;
      }
    }
  }
  wasUp = up;
  wasDown = dn;
  wasSpace = act;
  wasMouse = down;
}

function boot() {
  applyScale();
  hide();
  pointInDirection(90);
  pen.clear();
  resetDrawPen();
  unpackBlocks();
  unpackItems();
  allocAll();
  resetTimer();
  fpsStamp = 0;
  showVariable("fps");
  console.log("Play or Settings");
}

boot();
while (true) {
  if (scene == 0) {
    handleMenu();
    drawMainMenu();
  } else {
    if (scene == 3) {
      genStartFrame();
      if (scene == 3) {
        drawGenScreen();
      } else {
        render();
        tickFps();
      }
    } else {
      if (scene == 2) {
        handleSettings();
        if (settingsBack == 1) {
          render();
          drawSettings();
        } else {
          fillSky();
          goTo(0, 80);
          pen.stamp();
          resetDrawPen();
          drawSettings();
        }
      } else {
        if (uiMode == 0) {
          updateGame();
        } else {
          handleUiKeys();
          tickFurnaces();
          updateDay();
        }
        if (scene == 1) {
          render();
        }
        tickFps();
      }
    }
  }
  wait(0);
}
