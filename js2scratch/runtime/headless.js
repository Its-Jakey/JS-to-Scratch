#!/usr/bin/env node
/**
 * Headless js2scratch runner for agents: no browser, turbo wait(0), dump artifacts.
 *
 *   node headless.mjs --root DIR --script FILE.js --out DIR --frames 5
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  if (i < 0 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

function argList(name) {
  const raw = arg(name, "");
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const root = path.resolve(arg("root", "."));
const scriptPath = path.resolve(arg("script", ""));
const outDir = path.resolve(arg("out", "."));
const maxFrames = Math.max(0, Number(arg("frames", "3")) || 0);
const timeoutMs = Math.max(1000, Number(arg("timeout-ms", "60000")) || 60000);
const heldKeys = argList("keys");
const runtimeDir = path.resolve(arg("runtime", path.dirname(__filename)));

if (!scriptPath || !fs.existsSync(scriptPath)) {
  console.error("headless: missing --script");
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });

const started = Date.now();
const logs = [];
const vars = {};
let lastFrame = null;
let lastWidth = 480;
let lastHeight = 360;
let frames = 0;
let pose = null;
let stopped = false;

class StopRun extends Error {
  constructor() {
    super("JS2S_STOP");
    this.name = "JS2S_STOP";
  }
}

function readProjectFile(rel, type) {
  const resolved = path.resolve(root, String(rel));
  const relToRoot = path.relative(root, resolved);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) {
    throw new Error("cannot read " + rel + ": outside project root");
  }
  if (type === "text") {
    return fs.readFileSync(resolved, "utf8");
  }
  const buf = fs.readFileSync(resolved);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function onMessage(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === "say") {
    logs.push(String(msg.text));
    return;
  }
  if (msg.type === "monitor") {
    vars[msg.name] = msg.value;
    return;
  }
  if (msg.type === "pose") {
    pose = { x: msg.x, y: msg.y, direction: msg.direction, visible: msg.visible };
    return;
  }
  if (msg.type === "frame" && msg.buffer) {
    lastFrame = Buffer.from(msg.buffer);
    lastWidth = msg.width || lastWidth;
    lastHeight = msg.height || lastHeight;
    return;
  }
  if (msg.type === "error") {
    logs.push(String(msg.message));
  }
}

function writeArtifacts(summary) {
  fs.writeFileSync(path.join(outDir, "run.log"), logs.join("\n") + (logs.length ? "\n" : ""), "utf8");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  if (summary.error) {
    fs.writeFileSync(path.join(outDir, "error.txt"), summary.error, "utf8");
  }
  if (lastFrame) {
    fs.writeFileSync(path.join(outDir, "last-frame.rgba"), lastFrame);
    fs.writeFileSync(
      path.join(outDir, "last-frame.json"),
      JSON.stringify({ width: lastWidth, height: lastHeight, bytes: lastFrame.length }),
      "utf8"
    );
  }
}

function finish(error, exitCode) {
  if (stopped) return;
  stopped = true;
  const summary = {
    ok: !error,
    frames,
    elapsed_ms: Date.now() - started,
    logs,
    vars,
    pose,
    error: error ? String(error.stack || error) : null,
    stop: error && error.name === "JS2S_STOP" ? "frames" : error ? "error" : "return",
    width: lastWidth,
    height: lastHeight,
  };
  if (summary.stop === "frames") {
    summary.ok = true;
    summary.error = null;
  }
  try {
    writeArtifacts(summary);
  } catch (e) {
    console.error(e);
  }
  process.exit(exitCode);
}

const sandbox = {
  console: {
    log: function () {
      const text = Array.prototype.slice.call(arguments).join(" ");
      logs.push(text);
    },
    error: function () {
      logs.push(Array.prototype.slice.call(arguments).join(" "));
    },
  },
  postMessage: onMessage,
  JS2S_readFile: readProjectFile,
  performance: { now: function () { return Date.now() - started; } },
  location: { origin: "http://js2s.local" },
  URL,
  SharedArrayBuffer,
  Atomics,
  ArrayBuffer,
  DataView,
  Uint8Array,
  Uint8ClampedArray,
  Uint32Array,
  Int32Array,
  Float32Array,
  Float64Array,
  Int8Array,
  Uint16Array,
  Int16Array,
  Map,
  Set,
  JSON,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Error,
  TypeError,
  RangeError,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  NaN,
  Infinity,
  undefined,
  decodeURIComponent,
  encodeURIComponent,
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

vm.createContext(sandbox);

function runFile(file, filename) {
  const code = fs.readFileSync(file, "utf8");
  vm.runInContext(code, sandbox, { filename: filename || path.basename(file) });
}

runFile(path.join(runtimeDir, "keys.js"), "keys.js");
runFile(path.join(runtimeDir, "builtins.js"), "builtins.js");

const keyCount = sandbox.JS2S_KEY_NAMES.length;
const keysSAB = new SharedArrayBuffer(keyCount * 4);
const keysArr = new Int32Array(keysSAB);
const mouseSAB = new SharedArrayBuffer(12);
heldKeys.forEach(function (name) {
  const idx = sandbox.JS2S_KEY_INDEX[name];
  if (idx !== undefined) Atomics.store(keysArr, idx, 1);
});
if (heldKeys.length) {
  const any = sandbox.JS2S_KEY_INDEX.any;
  if (any !== undefined) Atomics.store(keysArr, any, 1);
}

sandbox.JS2S.install({
  projectBase: "http://js2s.local/",
  keys: keysSAB,
  mouse: mouseSAB,
  sync: new SharedArrayBuffer(8),
  x: 0,
  y: 0,
  direction: 90,
  visible: true,
});

sandbox.JS2S_afterWait = function () {
  frames += 1;
  if (maxFrames > 0 && frames >= maxFrames) {
    throw new StopRun();
  }
};

const timer = setTimeout(function () {
  finish(new Error("timeout after " + timeoutMs + "ms (" + frames + " frames)"), 1);
}, timeoutMs);
if (typeof timer.unref === "function") timer.unref();

try {
  runFile(scriptPath, path.basename(scriptPath));
  if (typeof sandbox.JS2S.flush === "function") sandbox.JS2S.flush();
  clearTimeout(timer);
  finish(null, 0);
} catch (err) {
  clearTimeout(timer);
  if (err && err.name === "JS2S_STOP") {
    finish(err, 0);
    return;
  }
  finish(err, 1);
}
