/* Scratch key names shared by the host and sprite workers. */
var JS2S_KEY_NAMES = [
  "space",
  "left arrow",
  "right arrow",
  "up arrow",
  "down arrow",
  "enter",
  "shift",
  "control",
  "backspace",
  "tab",
  "escape",
  "any",
];
(function () {
  var i;
  for (i = 0; i < 26; i++) JS2S_KEY_NAMES.push(String.fromCharCode(97 + i));
  for (i = 0; i < 10; i++) JS2S_KEY_NAMES.push(String(i));
  var extra = ["-", "=", ",", ".", "/", ";", "'", "[", "]", "\\", "`"];
  for (i = 0; i < extra.length; i++) JS2S_KEY_NAMES.push(extra[i]);
})();

var JS2S_KEY_INDEX = {};
(function () {
  for (var i = 0; i < JS2S_KEY_NAMES.length; i++) {
    JS2S_KEY_INDEX[JS2S_KEY_NAMES[i]] = i;
  }
})();

function js2sScratchKeyFromEvent(event) {
  var key = event.key;
  if (key === " ") return "space";
  if (key === "ArrowLeft") return "left arrow";
  if (key === "ArrowRight") return "right arrow";
  if (key === "ArrowUp") return "up arrow";
  if (key === "ArrowDown") return "down arrow";
  if (key === "Enter") return "enter";
  if (key === "Shift") return "shift";
  if (key === "Control") return "control";
  if (key === "Backspace") return "backspace";
  if (key === "Tab") return "tab";
  if (key === "Escape") return "escape";
  if (key && key.length === 1) return key.toLowerCase();
  return "";
}
