import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { initInputFocus } from "../src/input-focus.js";

function setup(ua = "iPhone MicroMessenger wxwork") {
  const dom = new JSDOM('<meta name="viewport" content="width=device-width, initial-scale=1"><textarea>已有草稿</textarea>');
  const win = dom.window, input = win.document.querySelector("textarea");
  Object.defineProperty(win.navigator, "userAgent", { value: ua });
  const calls = [], nativeFocus = input.focus.bind(input);
  input.focus = options => { calls.push(options); nativeFocus(options); };
  const dispose = initInputFocus(input, win);
  const fire = (type, touches = [], cancelable = true) => {
    const event = new win.Event(type, { bubbles: true, cancelable });
    Object.defineProperty(event, "touches", { value: touches });
    input.dispatchEvent(event);
    return event;
  };
  return { dom, win, input, calls, fire, dispose };
}
const point = { clientX: 50, clientY: 50 };
test("iOS 首次点按直接聚焦且跳过自动缩放；草稿、选择区和 viewport 不变", () => {
  const { dom, win, input, calls, fire } = setup();
  try {
    input.setSelectionRange(1, 2);
    fire("touchstart", [point]);
    assert.equal(fire("touchend").defaultPrevented, true);
    assert.deepEqual(calls, [{ preventScroll: true }]);
    assert.equal(input.value, "已有草稿");
    assert.equal(input.selectionStart, 1);
    assert.equal(input.selectionEnd, 2);
    assert.equal(win.document.querySelector("meta").content, "width=device-width, initial-scale=1");
    fire("touchstart", [point]);
    assert.equal(fire("touchend").defaultPrevented, false);
    assert.equal(calls.length, 1);
  } finally { dom.window.close(); }
});
test("聚焦模块不接管多指、滑动、取消与非 iOS 输入", () => {
  for (const mode of ["pinch", "move", "cancel", "android", "readonly", "dispose"]) {
    const { dom, input, calls, fire, dispose } = setup(mode === "android" ? "Android wxwork" : undefined);
    try {
      if (mode === "readonly") input.readOnly = true;
      if (mode === "dispose") dispose();
      fire("touchstart", mode === "pinch" ? [point, point] : [point]);
      if (mode === "move") fire("touchmove", [{ clientX: 100, clientY: 50 }]);
      if (mode === "cancel") fire("touchcancel");
      assert.equal(fire("touchend").defaultPrevented, false);
      assert.equal(calls.length, 0, mode);
    } finally { dom.window.close(); }
  }
});
