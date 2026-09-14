// Browser :focus-visible heuristics can retain rings after touch-triggered
// dialogs and focus restoration. Track navigation intent without blurring inputs.
export function initFocusMode(doc = document) {
  const root = doc.documentElement;
  const pointer = () => { root.dataset.inputMode = "pointer"; };
  const keyboard = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const editable = event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
    if (event.key === "Tab" || (!editable && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " ", "Home", "End"].includes(event.key))) {
      root.dataset.inputMode = "keyboard";
    }
  };
  pointer();
  const options = { capture: true, passive: true };
  for (const type of ["pointerdown", "touchstart", "mousedown"]) doc.addEventListener(type, pointer, options);
  doc.addEventListener("keydown", keyboard, true);
  return () => {
    for (const type of ["pointerdown", "touchstart", "mousedown"]) doc.removeEventListener(type, pointer, options);
    doc.removeEventListener("keydown", keyboard, true);
  };
}
