importScripts("/runtime/keys.js");
importScripts("/runtime/builtins.js");

self.onmessage = function (event) {
  var data = event.data;
  if (!data || data.type !== "init") return;
  try {
    JS2S.install(data);
    importScripts(data.scriptUrl);
    JS2S.flush();
    postMessage({ type: "done" });
  } catch (err) {
    postMessage({
      type: "error",
      message: (err && err.stack) || String(err),
    });
  }
};
