import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { initViewportGestures } from "../src/viewport-gestures.js";

test("移动端拦截双指缩放，保留单指滚动与输入", () => {
  const dom = new JSDOM('<main><textarea></textarea></main>');
  const { window: win } = dom;
  Object.defineProperty(win.navigator, "maxTouchPoints", { value: 5 });
  const dispose = initViewportGestures(win.document, win);
  const target = win.document.querySelector("textarea");
  function fire(type, fingers) {
    const event = new win.Event(type, { bubbles: true, cancelable: true });
    if (fingers !== undefined) Object.defineProperty(event, "touches", { value: Array(fingers).fill({}) });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }
  try {
    for (const type of ["touchstart", "touchmove"]) {
      assert.equal(fire(type, 1), false);
      assert.equal(fire(type, 2), true);
      assert.equal(fire(type, 3), true);
    }
    assert.equal(fire("gesturestart"), true);
    assert.equal(fire("gesturechange"), true);
    assert.equal(fire("input"), false);
    dispose();
    assert.equal(fire("touchmove", 2), false);
    assert.equal(fire("gesturestart"), false);
  } finally { win.close(); }
});
