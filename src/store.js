const STORAGE_KEY = "gaip-mobile-chat-v1";
export function newSession() {
  return {
    id: globalThis.crypto.randomUUID(),
    title: "新对话",
    updatedAt: Date.now(),
    messages: [],
    draft: "",
    planId: null,
  };
}
export function loadState(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    if (parsed?.version !== 1 || !Array.isArray(parsed.sessions))
      throw new Error("invalid");
    const sessions = parsed.sessions
      .filter(
        (s) =>
          typeof s.id === "string" &&
          typeof s.title === "string" &&
          Array.isArray(s.messages),
      )
      .map((s) => ({
        ...s,
        draft: typeof s.draft === "string" ? s.draft : "",
        messages: s.messages
          .filter(
            (m) =>
              m &&
              typeof m.text === "string" &&
              ["user", "assistant"].includes(m.role),
          )
          .map((m) => ({
            ...m,
            status: m.status === "streaming" ? "stopped" : m.status,
            process: Array.isArray(m.process?.steps)
              ? {
                  ...m.process,
                  steps: m.process.steps.map((step) => ({
                    ...step,
                    status: step.status === "running" ? "stopped" : step.status,
                  })),
                }
              : undefined,
          })),
      }));
    if (!sessions.length) throw new Error("empty");
    return {
      version: 1,
      sessions,
      currentId: sessions.some((s) => s.id === parsed.currentId)
        ? parsed.currentId
        : sessions[0].id,
    };
  } catch {
    const session = newSession();
    return { version: 1, currentId: session.id, sessions: [session] };
  }
}
export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function validateFiles(files, currentCount = 0) {
  const accepted = [],
    errors = [];
  for (const file of files) {
    if (currentCount + accepted.length >= 5) {
      errors.push("每条消息最多添加 5 个附件");
      break;
    }
    if (!(
      /\.(pdf|docx?|xlsx?|csv|txt|png|jpe?g|webp|gif|heic|heif)$/i.test(
        file.name,
      ) || file.type?.startsWith("image/")
    )) {
      errors.push(`${file.name}：暂不支持此类型`);
      continue;
    }
    if (file.size > 20 * 1024 * 1024) {
      errors.push(`${file.name}：超过 20 MB`);
      continue;
    }
    accepted.push({
      id: globalThis.crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }
  return { accepted, errors };
}

export function selectInitialSession(state) {
  const empty = state.sessions.find(
    (s) => !s.messages.length && !s.draft && !s.planId && !s.titleEdited,
  );
  const session = empty || newSession();
  if (!empty) state.sessions.unshift(session);
  state.currentId = session.id;
  return state;
}

export function renameSession(state, id, value) {
  const session = state.sessions.find((s) => s.id === id);
  const title = String(value ?? "").trim();
  if (!session || !title || title.length > 60) return false;
  session.title = title;
  session.titleEdited = true;
  session.updatedAt = Date.now();
  return true;
}

export function deleteSession(state, id) {
  const index = state.sessions.findIndex((s) => s.id === id);
  if (index < 0) return false;
  state.sessions.splice(index, 1);
  if (state.currentId === id) {
    const next = [...state.sessions]
      .filter((s) => s.messages.length || s.draft || s.planId || s.titleEdited)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (next) state.currentId = next.id;
    else selectInitialSession(state);
  }
  return true;
}
