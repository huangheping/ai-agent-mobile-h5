const feedbackTimers = new WeakMap();

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Older embedded browsers may only expose the synchronous copy command.
    const active = document.activeElement;
    const selection = window.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
    const input = document.createElement("textarea");
    input.value = text;
    input.readOnly = true;
    input.style.cssText = "position:fixed;top:0;left:-9999px;font-size:16px;";
    document.body.appendChild(input);
    try {
      input.select();
      if (!document.execCommand("copy")) throw new Error("Copy unavailable");
    } finally {
      input.remove();
      active?.focus?.({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        ranges.forEach((range) => selection.addRange(range));
      }
    }
  }
}

export function showCopySuccess(button) {
  clearTimeout(feedbackTimers.get(button));
  const image = button.querySelector("img");
  const label = button.dataset.copyLabel;
  image.src = "./assets/message-copied.svg?v=52";
  button.setAttribute("aria-label", "已复制");
  button.title = "已复制";
  feedbackTimers.set(button, setTimeout(() => {
    image.src = "./assets/message-copy.svg";
    button.setAttribute("aria-label", label);
    button.title = label;
    feedbackTimers.delete(button);
  }, 2000));
}
