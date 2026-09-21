import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import { initVoice } from "../src/voice.js";
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
function setup(demoMode = true, canOpen = () => true) {
  const dom = new JSDOM(html, { url: "http://localhost" }),
    win = dom.window,
    clock = { value: 0 };
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.performance = { now: () => clock.value };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  win.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  win.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new win.Event("close"));
  };
  win.HTMLElement.prototype.setPointerCapture = () => {};
  const confirmed = [];
  initVoice({
    demoMode,
    canOpen,
    onConfirm: (t) => confirmed.push(t),
    notify: () => {},
  });
  const $ = (id) => win.document.getElementById(id);
  const pointer = (type, y = 500, pointerType = "mouse") => {
    const e = new win.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { button: 0, pointerId: 1, clientY: y, isPrimary: true, pointerType });
    $("voice-button").dispatchEvent(e);
  };
  const touch = (type, { id = 1, screenY = 500, clientY = screenY, target = $("voice-button") } = {}) => {
    const e = new win.Event(type, { bubbles: true, cancelable: true });
    const contact = { identifier: id, screenY, clientY };
    Object.assign(e, {
      changedTouches: [contact],
      touches: ["touchend", "touchcancel"].includes(type) ? [] : [contact],
    });
    target.dispatchEvent(e);
    return e;
  };

  return { dom, win, $, confirmed, clock, pointer, touch };
}

test("输入框聚焦后首次触摸即可开始语音，收起键盘并保留草稿", async () => {
  const { $, dom, win, clock, touch, pointer, confirmed } = setup();
  const input = $("message");
  input.value = "尚未发送的文字";
  input.focus();
  assert.equal(win.document.activeElement, input);
  // iOS delivers pointerdown before touchstart; only touch owns this gesture.
  pointer("pointerdown", 500, "touch");
  assert.equal($("voice-scene").dataset.state, "idle");
  touch("touchstart");
  assert.notEqual(win.document.activeElement, input);
  assert.equal(input.value, "尚未发送的文字");
  assert.equal($("voice-scene").dataset.state, "recording");
  assert.equal($("voice-feedback").hidden, false);

  // Layout/viewport movement must not be mistaken for an upward finger swipe.
  win.dispatchEvent(new win.Event("resize"));
  touch("touchmove", { clientY: 250, screenY: 500, target: win.document });
  assert.equal($("voice-scene").classList.contains("cancel-ready"), false);
  pointer("pointercancel", 250, "touch");
  assert.equal($("voice-scene").dataset.state, "recording");
  clock.value = 1200;
  touch("touchend", { clientY: 250, screenY: 500, target: win.document });
  pointer("pointerup", 250, "touch");
  assert.equal($("voice-scene").dataset.state, "processing");
  await new Promise((r) => setTimeout(r, 880));
  assert.equal(confirmed.length, 1);
  assert.equal(input.value, "尚未发送的文字");
  assert.equal($("voice-scene").dataset.state, "idle");
  dom.window.close();
});

test("只有触摸事件时也能启动，上滑取消和系统中断后可再次长按", () => {
  const { $, dom, touch, clock } = setup();
  $("message").focus();
  touch("touchstart");
  clock.value = 1200;
  touch("touchmove", { screenY: 420 });
  assert.equal($("voice-title").textContent, "松手取消");
  // A second finger ending must not finish the recording finger's gesture.
  touch("touchend", { id: 2 });
  assert.equal($("voice-scene").dataset.state, "recording");
  touch("touchend", { screenY: 420 });
  assert.equal($("voice-scene").dataset.state, "idle");
  touch("touchstart");
  touch("touchcancel");
  assert.equal($("voice-feedback").hidden, true);
  touch("touchstart");
  assert.equal($("voice-scene").dataset.state, "recording");
  touch("touchcancel");
  dom.window.close();
});

test("回答生成期间拒绝语音，不打断当前文字输入", () => {
  const { $, dom, win, touch } = setup(true, () => false);
  $("message").focus();
  touch("touchstart");
  assert.equal(win.document.activeElement, $("message"));
  assert.equal($("voice-scene").dataset.state, "idle");
  dom.window.close();
});
test("默认演示不会自动录音，短按不进入免持或转写", () => {
  const { $, win, confirmed, dom, pointer, clock } = setup();

  assert.equal($("voice-scene").dataset.state, "idle");
  pointer("pointerdown");
  assert.equal($("voice-scene").dataset.state, "recording");
  clock.value = 100;
  pointer("pointerup");
  assert.equal($("voice-scene").dataset.state, "idle");
  assert.equal($("voice-feedback").hidden, true);
  assert.equal(confirmed.length, 0);
  win.dispatchEvent(new win.Event("pagehide"));
  dom.window.close();
});
test("轻微移动不变色，超过缓冲距离渐变，达到取消距离后才取消", () => {
  const { $, dom, pointer } = setup();
  const scene = $("voice-scene");
  const progress = () => Number(scene.style.getPropertyValue("--cancel-progress"));
  pointer("pointerdown", 500);
  for (const y of [505, 496, 484, 476]) {
    pointer("pointermove", y);
    assert.equal(progress(), 0);
    assert.equal(scene.classList.contains("cancel-ready"), false);
  }
  pointer("pointermove", 470);
  assert.ok(progress() > 0 && progress() < 0.1);
  pointer("pointermove", 452);
  assert.equal(progress(), 0.5);
  assert.equal(scene.classList.contains("cancel-ready"), false);
  pointer("pointermove", 428);
  assert.equal(progress(), 1);
  assert.equal(scene.classList.contains("cancel-ready"), true);
  pointer("pointermove", 490);
  assert.equal(progress(), 0);
  assert.equal(scene.classList.contains("cancel-ready"), false);
  pointer("pointercancel");
  dom.window.close();
});
test("上移后松开取消，没有转写结果", () => {
  const { $, win, confirmed, dom, pointer, clock } = setup();

  pointer("pointerdown");
  clock.value = 1500;
  pointer("pointermove", 400);
  assert.equal($("voice-scene").classList.contains("cancel-ready"), true);
  pointer("pointerup", 400);
  assert.equal($("voice-scene").dataset.state, "idle");
  assert.equal($("voice-feedback").hidden, true);
  assert.equal(confirmed.length, 0);
  win.dispatchEvent(new win.Event("pagehide"));
  dom.window.close();
});
test("直接长按麦克风，上移移回继续；松开自动回填输入框，无第二次确认", async () => {
  const { $, win, confirmed, dom, pointer, clock } = setup();

  pointer("pointerdown");
  clock.value = 1500;
  pointer("pointermove", 400);
  pointer("pointermove", 495);
  assert.equal($("voice-scene").classList.contains("cancel-ready"), false);
  assert.equal($("voice-scene").dataset.state, "recording");
  pointer("pointerup", 495);
  assert.equal($("voice-scene").dataset.state, "processing");
  await new Promise((r) => setTimeout(r, 880));
  assert.equal($("voice-feedback").hidden, true);
  assert.equal(confirmed.length, 1);
  assert.match(confirmed[0], /语音演示/);
  dom.window.close();
});
test("系统打断手势时取消采集", () => {
  const { $, win, dom, pointer } = setup();

  pointer("pointerdown");
  pointer("pointercancel");
  assert.equal($("voice-scene").dataset.state, "idle");
  assert.equal($("voice-feedback").hidden, true);
  win.dispatchEvent(new win.Event("pagehide"));
  dom.window.close();
});
test("关闭等待授权面板后，迟到的麦克风流会立即释放", async () => {
  const { $, win, dom, pointer } = setup(false);
  let resolveMedia,
    stopped = 0;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () => new Promise((r) => (resolveMedia = r)),
      },
    },
  });
  win.MediaRecorder = class {};
  pointer("pointerdown");
  assert.equal($("voice-scene").dataset.state, "permission");
  win.dispatchEvent(new win.Event("pagehide"));
  resolveMedia({ getTracks: () => [{ stop: () => stopped++ }] });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(stopped, 1);
  assert.equal($("voice-feedback").hidden, true);
  dom.window.close();
});
test("授权等待期间已经松开，授权成功后不自动开始采集", async () => {
  const { $, win, dom, pointer, clock } = setup(false);
  let resolveMedia,
    stopped = 0;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () => new Promise((r) => (resolveMedia = r)),
      },
    },
  });
  win.MediaRecorder = class {};
  pointer("pointerdown");
  clock.value = 1000;
  pointer("pointerup");
  resolveMedia({ getTracks: () => [{ stop: () => stopped++ }] });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(stopped, 1);
  assert.equal($("voice-scene").dataset.state, "idle");
  assert.match($("voice-status").textContent, /重新按住/);
  win.dispatchEvent(new win.Event("pagehide"));
  dom.window.close();
});

test("长按图标不会启动原生拖拽或菜单，手势仍可上移取消", () => {
  const { $, win, dom, pointer, clock, confirmed } = setup();
  pointer("pointerdown");
  const icon = $("voice-button").querySelector("img");
  assert.equal(icon.draggable, false);
  for (const type of ["dragstart", "contextmenu", "touchstart", "touchmove"]) {
    const event = new win.Event(type, { bubbles: true, cancelable: true });
    icon.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  }
  assert.equal($("voice-scene").dataset.state, "recording");
  assert.equal($("voice-title").textContent, "松手后为您转文字");
  assert.equal($("voice-status").textContent, "上移取消");
  clock.value = 1500;
  pointer("pointermove", 400);
  assert.equal($("voice-title").textContent, "松手取消");
  pointer("pointerup", 400);
  assert.equal($("voice-feedback").hidden, true);
  assert.equal(confirmed.length, 0);
  win.dispatchEvent(new win.Event("pagehide"));
  dom.window.close();
});
