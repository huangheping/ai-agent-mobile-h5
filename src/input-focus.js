// WebKit's focused-element reveal path skips automatic zoom for preventScroll focus.
// Keep user pinch zoom available; only intercept the first single-finger input tap.
export function initInputFocus(input, win = window) {
  const ios = /iPad|iPhone|iPod/.test(win.navigator.userAgent) ||
    (win.navigator.platform === "MacIntel" && win.navigator.maxTouchPoints > 1);
  if (!ios) return () => {};
  let touch = null;
  function start(event) {
    touch = event.touches.length === 1 && input.ownerDocument.activeElement !== input
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  }
  function move(event) {
    if (!touch || event.touches.length !== 1 ||
        Math.hypot(event.touches[0].clientX - touch.x, event.touches[0].clientY - touch.y) > 10) touch = null;
  }
  function end(event) {
    const tap = touch;
    touch = null;
    if (!tap || event.touches.length || !event.cancelable ||
        input.ownerDocument.activeElement === input || input.disabled || input.readOnly) return;
    // Run synchronously in the user's touch event so the software keyboard can open.
    input.focus({ preventScroll: true });
    if (input.ownerDocument.activeElement === input) event.preventDefault();
  }
  function cancel() { touch = null; }
  input.addEventListener("touchstart", start, { passive: true });
  input.addEventListener("touchmove", move, { passive: true });
  input.addEventListener("touchend", end, { passive: false });
  input.addEventListener("touchcancel", cancel, { passive: true });
  return () => {
    input.removeEventListener("touchstart", start);
    input.removeEventListener("touchmove", move);
    input.removeEventListener("touchend", end);
    input.removeEventListener("touchcancel", cancel);
  };
}
