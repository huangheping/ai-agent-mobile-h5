// The mobile product intentionally keeps the page at its initial scale.
// iOS WebViews may ignore viewport limits, so also cancel pinch gestures.
export function initViewportGestures(doc = document, win = window) {
  function preventPinch(event) {
    if (event.touches?.length > 1 && event.cancelable) event.preventDefault();
  }
  function preventGesture(event) {
    if (win.navigator.maxTouchPoints > 0 && event.cancelable) event.preventDefault();
  }
  const options = { passive: false, capture: true };
  doc.addEventListener("touchstart", preventPinch, options);
  doc.addEventListener("touchmove", preventPinch, options);
  doc.addEventListener("gesturestart", preventGesture, options);
  doc.addEventListener("gesturechange", preventGesture, options);
  return () => {
    doc.removeEventListener("touchstart", preventPinch, true);
    doc.removeEventListener("touchmove", preventPinch, true);
    doc.removeEventListener("gesturestart", preventGesture, true);
    doc.removeEventListener("gesturechange", preventGesture, true);
  };
}
