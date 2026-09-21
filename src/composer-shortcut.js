// Only a newly typed, standalone slash is a command. Pasted URLs, dates and
// slashes inside words remain ordinary draft text.
export function findPlanShortcut(input, event) {
  if (event.isComposing || event.inputType !== "insertText" || event.data !== "/") return null;
  const end = input.selectionStart;
  const start = end - 1;
  if (input.selectionEnd !== end || input.value[start] !== "/") return null;
  if (start > 0 && !/\s/.test(input.value[start - 1])) return null;
  if (end < input.value.length && !/\s/.test(input.value[end])) return null;
  return { value: input.value, start, end };
}

export function consumePlanShortcut(value, shortcut) {
  if (!shortcut || shortcut.value !== value) return value;
  return value.slice(0, shortcut.start) + value.slice(shortcut.end);
}
