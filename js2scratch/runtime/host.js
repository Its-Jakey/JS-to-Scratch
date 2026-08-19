(function () {
  "use strict";

  var STAGE_W = 480;
  var STAGE_H = 360;
  var titleEl = document.getElementById("title");
  var flagBtn = document.getElementById("flag");
  var stopBtn = document.getElementById("stop");
  var stageWrap = document.getElementById("stage-wrap");
  var costumeCanvas = document.getElementById("costume-layer");
  var costumeCtx = costumeCanvas.getContext("2d");
  var sayEl = document.getElementById("say");
  var monitorsEl = document.getElementById("monitors");
  var logEl = document.getElementById("log");

  if (typeof SharedArrayBuffer === "undefined" || !crossOriginIsolated) {
    logEl.textContent =
      "This page is not cross-origin isolated, so SharedArrayBuffer is unavailable.\n" +
      "Use python -m js2scratch.run (it sends COOP/COEP headers). Do not open index.html as a file.\n";
    flagBtn.disabled = true;
    return;
  }

  var manifest = null;
  var running = false;
  var workers = [];
  var spriteCanvases = [];
  var poses = [];
  var keysSAB = new SharedArrayBuffer(JS2S_KEY_NAMES.length * 4);
  var keysArr = new Int32Array(keysSAB);
  var anyIndex = JS2S_KEY_INDEX["any"];

  function log(line, isError) {
    if (isError) {
      logEl.innerHTML += '<span id="error"></span>';
    }
    logEl.appendChild(document.createTextNode(line + "\n"));
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setKey(name, down) {
    var idx = JS2S_KEY_INDEX[name];
    if (idx === undefined) return;
    Atomics.store(keysArr, idx, down ? 1 : 0);
    var any = 0;
    for (var i = 0; i < keysArr.length; i++) {
      if (i !== anyIndex && Atomics.load(keysArr, i)) {
        any = 1;
        break;
      }
    }
    Atomics.store(keysArr, anyIndex, any);
  }

  window.addEventListener("keydown", function (event) {
    if (event.repeat) return;
    var name = js2sScratchKeyFromEvent(event);
    if (!name) return;
    if (name === "tab" || name === "space") event.preventDefault();
    setKey(name, true);
  });
  window.addEventListener("keyup", function (event) {
    var name = js2sScratchKeyFromEvent(event);
    if (!name) return;
    setKey(name, false);
  });
  window.addEventListener("blur", function () {
    for (var i = 0; i < keysArr.length; i++) Atomics.store(keysArr, i, 0);
  });

  function drawCostumes() {
    costumeCtx.clearRect(0, 0, STAGE_W, STAGE_H);
    costumeCtx.save();
    costumeCtx.translate(STAGE_W / 2, STAGE_H / 2);
    costumeCtx.scale(1, -1);
    for (var i = 0; i < poses.length; i++) {
      var p = poses[i];
      if (!p || !p.visible) continue;
      costumeCtx.save();
      costumeCtx.translate(p.x, p.y);
      costumeCtx.rotate(((90 - p.direction) * Math.PI) / 180);
      costumeCtx.fillStyle = "#ff8c1a";
      costumeCtx.beginPath();
      costumeCtx.moveTo(16, 0);
      costumeCtx.lineTo(-10, 10);
      costumeCtx.lineTo(-10, -10);
      costumeCtx.closePath();
      costumeCtx.fill();
      costumeCtx.restore();
    }
    costumeCtx.restore();
  }

  function showSay(text) {
    sayEl.textContent = text;
    sayEl.style.display = text ? "block" : "none";
  }

  function setMonitor(spriteName, varName, value) {
    var id = "m-" + spriteName + "-" + varName;
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.className = "monitor";
      el.id = id;
      el.innerHTML = '<div class="name"></div><div class="value"></div>';
      el.querySelector(".name").textContent = spriteName + ": " + varName;
      monitorsEl.appendChild(el);
    }
    el.querySelector(".value").textContent = String(value);
  }

  function stop() {
    running = false;
    for (var i = 0; i < workers.length; i++) {
      try {
        workers[i].terminate();
      } catch (e) {}
    }
    workers = [];
    flagBtn.disabled = false;
    stopBtn.disabled = true;
  }

  function onWorkerMessage(index, event) {
    var data = event.data;
    if (!data || !data.type) return;
    if (data.type === "wait") {
      var worker = workers[index];
      var sync = worker.__sync;
      var resume = function () {
        Atomics.store(sync, 0, 1);
        Atomics.notify(sync, 0);
      };
      if (data.ms <= 0) {
        requestAnimationFrame(resume);
      } else {
        setTimeout(resume, data.ms);
      }
      return;
    }
    if (data.type === "say") {
      showSay(data.text);
      log(data.text);
      return;
    }
    if (data.type === "frame") {
      var ctx = workers[index] && workers[index].__ctx;
      if (ctx && data.buffer) {
        var img = new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
        ctx.putImageData(img, 0, 0);
      }
      return;
    }
    if (data.type === "pose") {
      poses[index] = data;
      drawCostumes();
      return;
    }
    if (data.type === "monitor") {
      setMonitor(manifest.sprites[index].name, data.name, data.value);
      return;
    }
    if (data.type === "error") {
      log(data.message, true);
      return;
    }
    if (data.type === "done") {
      log(manifest.sprites[index].name + " finished.");
    }
  }

  function start() {
    if (running) stop();
    running = true;
    flagBtn.disabled = true;
    stopBtn.disabled = false;
    showSay("");
    monitorsEl.innerHTML = "";
    logEl.textContent = "";
    poses = [];

    spriteCanvases.forEach(function (c) {
      c.remove();
    });
    spriteCanvases = [];
    workers = [];

    manifest.sprites.forEach(function (sprite, index) {
      var canvas = document.createElement("canvas");
      canvas.width = STAGE_W;
      canvas.height = STAGE_H;
      canvas.style.zIndex = String(index + 1);
      stageWrap.insertBefore(canvas, costumeCanvas);
      spriteCanvases.push(canvas);
      poses[index] = {
        x: sprite.x || 0,
        y: sprite.y || 0,
        direction: sprite.direction == null ? 90 : sprite.direction,
        visible: sprite.visible !== false && !sprite.isStage,
      };

      var syncSAB = new SharedArrayBuffer(8);
      var worker = new Worker("/runtime/worker.js");
      worker.__sync = new Int32Array(syncSAB);
      worker.__ctx = canvas.getContext("2d");
      worker.onmessage = function (event) {
        onWorkerMessage(index, event);
      };
      worker.onerror = function (event) {
        log((event.message || "worker error") + " (" + (event.filename || "") + ":" + (event.lineno || "") + ")", true);
      };
      workers.push(worker);
      worker.postMessage({
        type: "init",
        scriptUrl: sprite.script,
        projectBase: "/project/",
        keys: keysSAB,
        sync: syncSAB,
        x: sprite.x || 0,
        y: sprite.y || 0,
        direction: sprite.direction == null ? 90 : sprite.direction,
        visible: sprite.visible !== false && !sprite.isStage,
        isStage: !!sprite.isStage,
      });
    });
    drawCostumes();
  }

  flagBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);

  fetch("/manifest.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      manifest = data;
      titleEl.textContent = data.name + " — js2scratch runner";
      document.title = data.name + " — js2scratch runner";
      start();
    })
    .catch(function (err) {
      log(String(err), true);
    });
})();
