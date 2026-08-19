/* js2scratch sprite builtins. Installed onto the worker global. */
var JS2S = (function () {
  "use strict";

  var STAGE_W = 480;
  var STAGE_H = 360;
  var HALF_W = STAGE_W / 2;
  var HALF_H = STAGE_H / 2;
  var DEG = Math.PI / 180;
  var RAD = 180 / Math.PI;

  var nativeSin = Math.sin;
  var nativeCos = Math.cos;
  var nativeTan = Math.tan;
  var nativeAsin = Math.asin;
  var nativeAcos = Math.acos;
  var nativeAtan = Math.atan;
  var nativeRandom = Math.random;

  var pixels = null;
  var pixels32 = null;
  var keysArr = null;
  var syncArr = null;
  var projectBase = "/project/";
  var shownVars = [];
  var timerStart = 0;

  var x = 0;
  var y = 0;
  var direction = 90;
  var visible = true;
  var penDown = false;
  var penSize = 1;
  var penRgb = [0, 0, 255];
  var penHsv = [0.66, 1, 1];
  var penTransparency = 0;
  var penColor32 = 0xff0000ff;

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  function hsvToRgb(h, s, v) {
    var i, f, p, q, t;
    h = ((h % 1) + 1) % 1;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        return [v, t, p];
      case 1:
        return [q, v, p];
      case 2:
        return [p, v, t];
      case 3:
        return [p, q, v];
      case 4:
        return [t, p, v];
      default:
        return [v, p, q];
    }
  }

  function rgbToHsv(r, g, b) {
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    var s = max === 0 ? 0 : d / max;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, s, max];
  }

  function parseColor(color) {
    if (typeof color === "number") {
      var n = color >>> 0;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var s = String(color).trim();
    if (s.charAt(0) === "#") {
      var hex = s.slice(1);
      if (hex.length === 3) {
        return [
          parseInt(hex.charAt(0) + hex.charAt(0), 16),
          parseInt(hex.charAt(1) + hex.charAt(1), 16),
          parseInt(hex.charAt(2) + hex.charAt(2), 16),
        ];
      }
      if (hex.length >= 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
        ];
      }
    }
    return [0, 0, 255];
  }

  function packColor() {
    var a = Math.round((1 - clamp(penTransparency, 0, 100) / 100) * 255);
    var r = penRgb[0] | 0;
    var g = penRgb[1] | 0;
    var b = penRgb[2] | 0;
    penColor32 = (r & 255) | ((g & 255) << 8) | ((b & 255) << 16) | ((a & 255) << 24);
  }

  function setPenRgb(rgb) {
    penRgb = [rgb[0], rgb[1], rgb[2]];
    penHsv = rgbToHsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    packColor();
  }

  function setPenHsv() {
    var rgb = hsvToRgb(penHsv[0], penHsv[1], penHsv[2]);
    penRgb = [Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255)];
    packColor();
  }

  function fillAlignedRect(left, top, right, bottom) {
    if (!pixels32) return;
    var x0 = left | 0;
    var y0 = top | 0;
    var x1 = right | 0;
    var y1 = bottom | 0;
    if (x0 < 0) x0 = 0;
    if (y0 < 0) y0 = 0;
    if (x1 > STAGE_W - 1) x1 = STAGE_W - 1;
    if (y1 > STAGE_H - 1) y1 = STAGE_H - 1;
    if (x0 > x1 || y0 > y1) return;
    var color = penColor32;
    var py, px, row;
    for (py = y0; py <= y1; py++) {
      row = py * STAGE_W;
      for (px = x0; px <= x1; px++) {
        pixels32[row + px] = color;
      }
    }
  }

  function strokeTo(nx, ny) {
    if (!penDown || !pixels32) return;
    var x0 = x + HALF_W;
    var y0 = HALF_H - y;
    var x1 = nx + HALF_W;
    var y1 = HALF_H - ny;
    var half = Math.max(Number(penSize) || 0, 0) / 2;
    if (half < 0.5) half = 0.5;
    var dx = x1 - x0;
    var dy = y1 - y0;
    if (dy * dy < 1e-8) {
      var xa = x0 < x1 ? x0 : x1;
      var xb = x0 < x1 ? x1 : x0;
      fillAlignedRect(xa - half, y0 - half, xb + half, y0 + half);
      return;
    }
    if (dx * dx < 1e-8) {
      var ya = y0 < y1 ? y0 : y1;
      var yb = y0 < y1 ? y1 : y0;
      fillAlignedRect(x0 - half, ya - half, x0 + half, yb + half);
      return;
    }
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = dist | 0;
    if (steps < 1) steps = 1;
    var i, t, px, py;
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      px = x0 + dx * t;
      py = y0 + dy * t;
      fillAlignedRect(px - half, py - half, px + half, py + half);
    }
  }

  function postPose() {
    postMessage({ type: "pose", x: x, y: y, direction: direction, visible: visible });
  }

  function present() {
    if (!pixels) return;
    var copy = new Uint8ClampedArray(pixels);
    postMessage(
      { type: "frame", buffer: copy.buffer, width: STAGE_W, height: STAGE_H },
      [copy.buffer]
    );
    postPose();
  }

  function wrapMath() {
    Math.sin = function (deg) {
      return nativeSin(Number(deg) * DEG);
    };
    Math.cos = function (deg) {
      return nativeCos(Number(deg) * DEG);
    };
    Math.tan = function (deg) {
      return nativeTan(Number(deg) * DEG);
    };
    Math.asin = function (n) {
      return nativeAsin(Number(n)) * RAD;
    };
    Math.acos = function (n) {
      return nativeAcos(Number(n)) * RAD;
    };
    Math.atan = function (n) {
      return nativeAtan(Number(n)) * RAD;
    };
    Math.random = function () {
      return nativeRandom();
    };
  }

  function resolveUrl(path) {
    return new URL(String(path), new URL(projectBase, self.location.origin)).href;
  }

  function syncGet(path, type) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", resolveUrl(path), false);
    xhr.responseType = type;
    xhr.send(null);
    if (xhr.status !== 200) {
      throw new Error("cannot read " + path + ": HTTP " + xhr.status);
    }
    return xhr.response;
  }

  function parseListLine(line) {
    var text = String(line).replace(/^\s+|\s+$/g, "");
    if (text === "") return "";
    if (/^[+-]?\d+$/.test(text)) return parseInt(text, 10);
    if (/^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/.test(text)) return parseFloat(text);
    return text;
  }

  function loadList(path) {
    var text = syncGet(path, "text");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    var lines = String(text).split(/\r?\n/);
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    var out = [];
    for (var i = 0; i < lines.length; i++) out.push(parseListLine(lines[i]));
    return out;
  }

  function loadBin(path) {
    var buf = syncGet(path, "arraybuffer");
    var bytes = new Uint8Array(buf);
    var words = Math.floor((bytes.length + 3) / 4);
    var view = new DataView(new ArrayBuffer(words * 4));
    for (var i = 0; i < bytes.length; i++) view.setUint8(i, bytes[i]);
    return new Uint32Array(view.buffer);
  }

  function move(steps) {
    steps = Number(steps) || 0;
    var nx = x + steps * nativeSin(direction * DEG);
    var ny = y + steps * nativeCos(direction * DEG);
    strokeTo(nx, ny);
    x = nx;
    y = ny;
  }

  function turnRight(deg) {
    direction += Number(deg) || 0;
  }

  function turnLeft(deg) {
    direction -= Number(deg) || 0;
  }

  function goTo(nx, ny) {
    nx = Number(nx) || 0;
    ny = Number(ny) || 0;
    strokeTo(nx, ny);
    x = nx;
    y = ny;
  }

  function setX(nx) {
    goTo(Number(nx) || 0, y);
  }

  function setY(ny) {
    goTo(x, Number(ny) || 0);
  }

  function changeX(dx) {
    goTo(x + (Number(dx) || 0), y);
  }

  function changeY(dy) {
    goTo(x, y + (Number(dy) || 0));
  }

  function pointInDirection(deg) {
    direction = Number(deg) || 0;
  }

  function bounce() {
    var hitX = false;
    var hitY = false;
    if (x > HALF_W) {
      x = HALF_W;
      hitX = true;
    } else if (x < -HALF_W) {
      x = -HALF_W;
      hitX = true;
    }
    if (y > HALF_H) {
      y = HALF_H;
      hitY = true;
    } else if (y < -HALF_H) {
      y = -HALF_H;
      hitY = true;
    }
    if (hitX) direction = 180 - direction;
    if (hitY) direction = -direction;
  }

  function hide() {
    visible = false;
  }

  function show() {
    visible = true;
  }

  function wait(seconds) {
    flushMonitors();
    present();
    var ms = Math.max(0, Number(seconds) * 1000);
    if (!syncArr) return;
    Atomics.store(syncArr, 0, 0);
    postMessage({ type: "wait", ms: ms });
    Atomics.wait(syncArr, 0, 0);
  }

  function xPosition() {
    return x;
  }

  function yPosition() {
    return y;
  }

  function directionReporter() {
    return direction;
  }

  function keyPressed(name) {
    if (!keysArr) return false;
    var key = String(name).toLowerCase();
    var idx = JS2S_KEY_INDEX[key];
    if (idx === undefined) return false;
    return Atomics.load(keysArr, idx) !== 0;
  }

  function timer() {
    return (performance.now() - timerStart) / 1000;
  }

  function resetTimer() {
    timerStart = performance.now();
  }

  function showVariable(name) {
    name = String(name);
    if (shownVars.indexOf(name) < 0) shownVars.push(name);
    flushMonitors();
  }

  function flushMonitors() {
    for (var i = 0; i < shownVars.length; i++) {
      var name = shownVars[i];
      postMessage({ type: "monitor", name: name, value: self[name] });
    }
  }

  var pen = {
    clear: function () {
      if (pixels32) pixels32.fill(0);
    },
    eraseAll: function () {
      pen.clear();
    },
    down: function () {
      penDown = true;
    },
    up: function () {
      penDown = false;
    },
    stamp: function () {
      var half = 8;
      var ang = (90 - direction) * DEG;
      var c = nativeCos(ang);
      var s = nativeSin(ang);
      var pts = [
        [16, 0],
        [-10, 10],
        [-10, -10],
      ];
      var i, px, py, qx, qy;
      for (i = 0; i < pts.length; i++) {
        px = pts[i][0];
        py = pts[i][1];
        qx = x + px * c - py * s;
        qy = y + px * s + py * c;
        fillAlignedRect(
          qx + HALF_W - half,
          HALF_H - qy - half,
          qx + HALF_W + half,
          HALF_H - qy + half
        );
      }
    },
    setColor: function (color) {
      setPenRgb(parseColor(color));
    },
    setSize: function (n) {
      penSize = Number(n) || 0;
    },
    changeSize: function (n) {
      penSize += Number(n) || 0;
    },
    setParam: function (param, value) {
      param = String(param).toLowerCase();
      value = Number(value) || 0;
      if (param === "color") penHsv[0] = ((value % 100) + 100) % 100 / 100;
      else if (param === "saturation") penHsv[1] = clamp(value, 0, 100) / 100;
      else if (param === "brightness") penHsv[2] = clamp(value, 0, 100) / 100;
      else if (param === "transparency") penTransparency = value;
      setPenHsv();
    },
    changeParam: function (param, value) {
      param = String(param).toLowerCase();
      value = Number(value) || 0;
      if (param === "color") pen.setParam("color", (((penHsv[0] * 100 + value) % 100) + 100) % 100);
      else if (param === "saturation") pen.setParam("saturation", penHsv[1] * 100 + value);
      else if (param === "brightness") pen.setParam("brightness", penHsv[2] * 100 + value);
      else if (param === "transparency") pen.setParam("transparency", penTransparency + value);
    },
  };

  function install(data) {
    projectBase = data.projectBase || "/project/";
    keysArr = new Int32Array(data.keys);
    syncArr = new Int32Array(data.sync);
    x = data.x || 0;
    y = data.y || 0;
    direction = data.direction == null ? 90 : data.direction;
    visible = data.visible !== false;
    timerStart = performance.now();
    wrapMath();
    packColor();
    pixels = new Uint8ClampedArray(STAGE_W * STAGE_H * 4);
    pixels32 = new Uint32Array(pixels.buffer);

    var g = self;
    g.move = move;
    g.turnRight = turnRight;
    g.turnLeft = turnLeft;
    g.goTo = goTo;
    g.setX = setX;
    g.setY = setY;
    g.changeX = changeX;
    g.changeY = changeY;
    g.pointInDirection = pointInDirection;
    g.bounce = bounce;
    g.hide = hide;
    g.show = show;
    g.wait = wait;
    g.xPosition = xPosition;
    g.yPosition = yPosition;
    g.direction = directionReporter;
    g.keyPressed = keyPressed;
    g.timer = timer;
    g.resetTimer = resetTimer;
    g.showVariable = showVariable;
    g.loadList = loadList;
    g.loadBin = loadBin;
    g.pen = pen;
    g.console = {
      log: function () {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) parts.push(String(arguments[i]));
        var text = parts.join(" ");
        postMessage({ type: "say", text: text });
      },
    };
    postPose();
  }

  function flush() {
    flushMonitors();
    present();
  }

  return { install: install, flush: flush };
})();
