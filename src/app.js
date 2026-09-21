import { plans } from "./data.js?v=19";
import { streamReply } from "./service.js?v=19";
import { documentCardsHtml, initDocumentPreview } from "./documents.js?v=20";
import {
  loadState,
  saveState,
  newSession,
  validateFiles,
  selectInitialSession,
} from "./store.js";
import { initHistoryActions } from "./history.js";
import {
  processHtml,
  skillHtml,
  applyProcessEvent,
  interruptProcess,
} from "./process.js";
import { initVoice } from "./voice.js?v=31";
import { initAccountMenu } from "./account.js?v=17";
import { WelcomeAvatar } from "./welcome-avatar.js";
import { initFocusMode } from "./focus.js?v=23";

initFocusMode();

let welcomeOrb = null;

const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem: () => null,
    setItem: () => {
      throw Error("unavailable");
    },
  };
}
const state = selectInitialSession(loadState(storage));
let pending = null,
  toastTimer,
  followTail = true,
  tailFrame,
  saveWarning = false;
const sessionFiles = new Map();
const current = () => state.sessions.find((s) => s.id === state.currentId);
const files = () => sessionFiles.get(state.currentId) || [];
const planFor = (id) => plans.find((p) => p.id === id);
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4200);
}
function persist() {
  if (!saveState(storage, state) && !saveWarning) {
    saveWarning = true;
    toast("浏览器存储不可用，本次会话仅在当前页面保留。");
  }
}
function nearBottom() {
  const el = $("conversation");
  return el.scrollHeight - el.scrollTop - el.clientHeight < 12;
}
function scrollBottom() {
  const el = $("conversation");
  el.scrollTop = el.scrollHeight;
  updateJump();
  cancelAnimationFrame(tailFrame);
  tailFrame = requestAnimationFrame(() => {
    if (followTail) {
      el.scrollTop = el.scrollHeight;
      updateJump();
    }
  });
}
function updateJump() {
  $("jump-bottom").hidden = nearBottom() || !current().messages.length;
}
function resizeInput() {
  const el = $("message");
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 132) + "px";
}
function controls() {
  const active = !!pending;
  const send = $("send-button");
  send.classList.toggle("stop", active);
  send.innerHTML = active
    ? '<span aria-hidden="true">■</span>'
    : '<img src="./assets/send.svg" alt="">';
  send.setAttribute("aria-label", active ? "停止生成" : "发送消息");
  send.disabled = !active && !$("message").value.trim() && !files().length;
  const plan = planFor(current().planId);
  $("selection").innerHTML = plan
    ? `<div class="selected-plan"><img src="./assets/agent-result.svg" alt="" draggable="false"><span>${escape(plan.name)}</span><button type="button" data-action="remove-plan" aria-label="取消所选方案"><img src="./assets/close.svg" alt="" draggable="false"></button></div>`
    : "";
  const planActive = !!plan || $("plans-dialog").open;
  $("plan-button").classList.toggle("selected", planActive);
  $("plan-control").classList.toggle("active", planActive);
  $("plan-clear").hidden = !planActive;
  $("plan-button").setAttribute(
    "aria-expanded",
    String($("plans-dialog").open),
  );
  $("message").placeholder = plan
    ? "补充需求、预算或希望分析的问题…"
    : "有问题，随时问我…";
  $("attachment-tray").innerHTML = files()
    .map(
      (f) =>
        `<div class="attachment-chip"><span>${escape(f.name)}</span><button type="button" data-remove-file="${escape(f.id)}" aria-label="移除附件 ${escape(f.name)}">×</button></div>`,
    )
    .join("");
  $("history-button").disabled = active;
  $("new-button").disabled = active;
}
function tableHtml(table) {
  return `<table class="comparison-table"><caption class="sr-only">${escape(table.title)}，示例数据</caption><thead><tr>${table.columns.map((c) => `<th scope="col">${escape(c)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((v, i) => (i === 0 ? `<th scope="row">${escape(v)}</th>` : `<td>${escape(v)}</td>`)).join("")}</tr>`).join("")}</tbody></table>`;
}
function messageHtml(m) {
  if (m.role === "user")
    return `<article class="message user" data-message-id="${escape(m.id)}">${m.text ? `<div class="bubble">${escape(m.text)}</div>` : ""}${(m.files || []).map((f) => `<div class="file-message"><img src="./assets/attach.svg" alt=""><span>${escape(f.name)}</span><small>演示附件</small></div>`).join("")}</article>`;
  return `<article class="message assistant" data-message-id="${escape(m.id)}"><div class="process-host">${processHtml(m)}</div><div class="skill-host">${skillHtml(m)}</div><div class="message-content">${escape(m.text)}</div>${m.table ? `<div class="table-card"><div class="table-card-header"><strong>${escape(m.table.title)}</strong><button class="expand-table" data-table-id="${escape(m.id)}">展开表格 ↗</button></div><div class="table-scroll" tabindex="0" role="region" aria-label="可横向滚动的方案对比表">${tableHtml(m.table)}</div><div class="table-hint"><span>左右 / 上下滑动 · 示例数据</span><button data-table-id="${escape(m.id)}">全屏查看 ↗</button></div></div>` : ""}${documentCardsHtml(m)}${m.status === "streaming" ? '<div class="response-status"><i class="spinner"></i><span>正在整理回答…</span></div>' : m.status === "stopped" ? '<div class="response-status">已停止生成</div>' : m.status === "error" ? '<div class="response-status">回复失败，请重试</div>' : ""}${m.status !== "streaming" ? `<div class="message-actions">${m.text ? `<button class="text-button" data-copy-id="${escape(m.id)}" aria-label="复制回答"><img src="./assets/copy.svg?v=5" alt=""></button>` : ""}${["stopped", "error"].includes(m.status) ? `<button class="text-button" data-retry-id="${escape(m.id)}">重新生成</button>` : ""}</div>` : ""}${m.status === "done" && m.suggestions?.length ? `<div class="followups">${m.suggestions.map((s) => `<button data-prompt="${escape(s)}">${escape(s)}</button>`).join("")}</div>` : ""}</article>`;
}
function renderConversation() {
  welcomeOrb?.destroy();
  welcomeOrb = null;
  $("conversation-body").innerHTML = current().messages.length
    ? '<div class="conversation-heading">' +
      escape(current().title) +
      "</div>" +
      current().messages.map(messageHtml).join("")
    : `<section class="welcome"><div class="welcome-identity"><button type="button" class="welcome-avatar" id="welcome-avatar" aria-label="切换头像版本"></button><div class="welcome-copy"><h1>GAIP Agent 助手</h1><p class="welcome-intro">我能帮到您自动化 AI 处理方案</p></div></div><h2 class="suggestion-heading-animated">你可以这样问</h2><div class="suggestion-list">${["帮我做一份兼顾子女教育和全球通行的身份规划方案", "查一款适合香港高净值客户、偏稳健、兼顾传承的保险产品"].map((text) => `<button class="suggestion" data-draft="${escape(text)}"><img src="./assets/suggest-arrow.svg" alt=""><span class="label">${escape(text)}</span></button>`).join("")}</div></section>`;
  const orbHost = $("welcome-avatar");
  if (orbHost) welcomeOrb = new WelcomeAvatar(orbHost, storage);
}
function render() {
  followTail = true;
  renderConversation();
  $("message").value = current().draft || "";
  controls();
  resizeInput();
  requestAnimationFrame(() => {
    if (current().messages.length) scrollBottom();
    else $("conversation").scrollTop = 0;
  });
}
function updateReply(message, eventType) {
  const sticky = followTail;
  const node = $("conversation").querySelector(
    `[data-message-id="${message.id}"]`,
  );
  if (node) {
    if (message.status === "streaming" && !message.table) {
      node.querySelector(".message-content").textContent = message.text;
      if (eventType === "process")
        node.querySelector(".process-host").innerHTML = processHtml(message);
      if (eventType === "skill")
        node.querySelector(".skill-host").innerHTML = skillHtml(message);
      const status = node.querySelector(".response-status span");
      if (status)
        status.textContent = message.text ? "正在生成…" : "正在整理回答…";
    } else node.outerHTML = messageHtml(message);
  }
  if (sticky) scrollBottom();
  else updateJump();
}
function openDialog(id) {
  for (const d of document.querySelectorAll("dialog[open]")) d.close();
  $(id).showModal();
}
function showPlans() {
  $("plan-list").innerHTML = plans
    .map(
      (p) =>
        `<button class="plan-option ${current().planId === p.id ? "active" : ""}" data-plan-id="${p.id}" aria-pressed="${current().planId === p.id}"><img src="./assets/agent-result.svg" alt=""><div class="plan-copy"><strong>${escape(p.name)}</strong><p>${escape(p.description)}</p></div><span class="check">${current().planId === p.id ? "✓" : ""}</span></button>`,
    )
    .join("");
  openDialog("plans-dialog");
  controls();
}
function renderHistory() {
  const sessions = state.sessions
    .filter((s) => s.messages.length || s.draft || s.planId || s.titleEdited)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  $("history-list").classList.toggle("is-empty", sessions.length === 0);
  $("history-list").innerHTML = sessions.length
    ? sessions
        .map(
          (s) =>
            `<div class="history-row ${s.id === state.currentId ? "active" : ""}"><button class="history-item" data-session-id="${s.id}" ${s.id === state.currentId ? 'aria-current="true"' : ""}><strong>${escape(s.title)}</strong><small>${new Date(s.updatedAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}${!s.messages.length ? " · 草稿" : ""}${s.id === state.currentId ? " · 当前会话" : ""}</small></button><button class="icon-button history-more" data-history-actions="${s.id}" aria-label="管理会话：${escape(s.title)}" aria-haspopup="dialog"><img src="./assets/more.svg" alt=""></button></div>`,
        )
        .join("")
    : '<p class="history-empty">还没有历史会话。<br>开始一次对话后，会保存在这里。</p>';
}
function showHistory() {
  renderHistory();
  openDialog("history-dialog");
}
function startNew() {
  if (pending) return;
  const empty = state.sessions.find(
    (s) => !s.messages.length && !s.draft && !s.planId && !s.titleEdited,
  );
  const session = empty || newSession();
  if (!empty) state.sessions.unshift(session);
  state.currentId = session.id;
  persist();
  $("history-dialog").close();
  render();
}
async function generate(user, existing) {
  if (pending) return;
  const session = current();
  const response = existing || {
    id: crypto.randomUUID(),
    role: "assistant",
    text: "",
    status: "streaming",
  };
  if (existing) {
    Object.assign(response, {
      text: "",
      table: null,
      documents: [],
      suggestions: [],
      process: null,
      skill: null,
      status: "streaming",
    });
  } else session.messages.push(response);
  const controller = new AbortController();
  pending = { controller, sessionId: session.id };
  followTail = true;
  persist();
  renderConversation();
  controls();
  scrollBottom();
  try {
    for await (const event of streamReply(
      { text: user.text, planId: user.planId, files: user.files },
      { signal: controller.signal },
    )) {
      applyProcessEvent(response, event);
      if (event.type === "text") response.text += event.text;
      if (event.type === "table") response.table = event.table;
      if (event.type === "done") {
        response.status = "done";
        response.suggestions = event.suggestions;
        response.documents = event.documents || [];
      }
      updateReply(response, event.type);
    }
    $("announcement").textContent = "回答已完成";
  } catch (error) {
    response.status = error.name === "AbortError" ? "stopped" : "error";
    interruptProcess(
      response,
      response.status === "stopped" ? "stopped" : "error",
    );
    updateReply(response);
    $("announcement").textContent =
      response.status === "stopped" ? "已停止生成" : "回复失败，可以重试";
  } finally {
    pending = null;
    session.updatedAt = Date.now();
    persist();
    controls();
  }
}
async function send(text) {
  if (pending) return;
  const value = String(text ?? $("message").value).trim();
  if (!value && !files().length) return;
  const session = current();
  const user = {
    id: crypto.randomUUID(),
    role: "user",
    text: value,
    planId: session.planId,
    files: files().map((f) => ({ ...f })),
  };
  if (!session.messages.length && !session.titleEdited)
    session.title = (value || "附件对话").slice(0, 32);
  session.messages.push(user);
  session.draft = "";
  session.updatedAt = Date.now();
  sessionFiles.delete(session.id);
  $("message").value = "";
  resizeInput();
  await generate(user);
}
$("composer").addEventListener("submit", (event) => {
  event.preventDefault();
  if (pending) pending.controller.abort();
  else send();
});
$("message").addEventListener("input", () => {
  current().draft = $("message").value;
  resizeInput();
  controls();
  persist();
});
$("message").addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing &&
    !pending &&
    matchMedia("(pointer:fine)").matches
  ) {
    event.preventDefault();
    send();
  }
});
$("ai-notice-trigger").onclick = () => openDialog("ai-notice-dialog");
$("plan-button").onclick = showPlans;
$("plans-dialog").addEventListener("close", controls);
$("history-button").onclick = showHistory;
$("new-button").onclick = startNew;
$("drawer-new").onclick = startNew;
$("attachment-button").onclick = () => openDialog("attachments-dialog");
$("jump-bottom").onclick = () => {
  followTail = true;
  scrollBottom();
};
let touchY = 0,
  scrollbarDragging = false;
$("conversation").addEventListener(
  "wheel",
  (e) => {
    if (e.deltaY < 0) followTail = false;
  },
  { passive: true },
);
$("conversation").addEventListener(
  "touchstart",
  (e) => {
    touchY = e.touches[0]?.clientY || 0;
  },
  { passive: true },
);
$("conversation").addEventListener(
  "touchmove",
  (e) => {
    const y = e.touches[0]?.clientY || 0;
    if (y > touchY + 2) followTail = false;
    touchY = y;
  },
  { passive: true },
);
$("conversation").addEventListener("keydown", (e) => {
  if (["ArrowUp", "PageUp", "Home"].includes(e.key)) followTail = false;
});
$("conversation").addEventListener("pointerdown", (e) => {
  const r = $("conversation").getBoundingClientRect();
  if (e.clientX >= r.right - 14) {
    scrollbarDragging = true;
    followTail = false;
  }
});
window.addEventListener("pointerup", () => {
  scrollbarDragging = false;
});
$("conversation").addEventListener(
  "scroll",
  () => {
    if (scrollbarDragging) followTail = nearBottom();
    else if (nearBottom()) followTail = true;
    updateJump();
  },
  { passive: true },
);
new ResizeObserver(() => {
  if (followTail) scrollBottom();
  else updateJump();
}).observe($("conversation-body"));
document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.classList.contains("close-dialog"))
    button.closest("dialog").close();
  if (button.dataset.processId) {
    const m = current().messages.find((m) => m.id === button.dataset.processId);
    if (m?.process) {
      followTail = false;
      m.process.expanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(m.process.expanded));
      button
        .querySelector(".process-chevron")
        .classList.toggle("open", m.process.expanded);
      $("process-" + m.id).hidden = !m.process.expanded;
      persist();
      updateJump();
    }
  }
  if (button.hasAttribute("data-open-plans")) showPlans();
  if (button.dataset.planId) {
    current().planId = button.dataset.planId;
    persist();
    controls();
    $("plans-dialog").close();
    $("announcement").textContent = "已选择" + planFor(current().planId).name;
  }
  if (button.dataset.action === "remove-plan") {
    $("plans-dialog").close();
    current().planId = null;
    persist();
    controls();
    $("plan-button").focus({ preventScroll: true });
    $("announcement").textContent = "已退出做方案";
  }
  if (button.dataset.draft) {
    $("message").value = button.dataset.draft;
    current().draft = button.dataset.draft;
    persist();
    controls();
    resizeInput();
    $("message").focus();
  }
  if (button.dataset.prompt) {
    if (pending) {
      toast("请等待当前回答完成，或先停止生成。");
      return;
    }
    send(button.dataset.prompt);
  }
  if (button.dataset.sessionId) {
    if (pending) return;
    state.currentId = button.dataset.sessionId;
    persist();
    $("history-dialog").close();
    render();
  }
  if (button.dataset.removeFile) {
    sessionFiles.set(
      state.currentId,
      files().filter((f) => f.id !== button.dataset.removeFile),
    );
    controls();
  }
  if (button.dataset.fileSource) {
    $("attachments-dialog").close();
    $(button.dataset.fileSource + "-input").click();
  }
  if (button.dataset.tableId) {
    const m = current().messages.find((m) => m.id === button.dataset.tableId);
    $("table-title").textContent = m.table.title;
    $("full-table").innerHTML = tableHtml(m.table);
    openDialog("table-dialog");
    $("full-table").scrollTop = 0;
    $("full-table").scrollLeft = 0;
  }
  if (button.dataset.copyId) {
    const m = current().messages.find((m) => m.id === button.dataset.copyId);
    const text =
      m.text +
      (m.table
        ? "\n\n" +
          [m.table.columns, ...m.table.rows]
            .map((row) => row.join("\t"))
            .join("\n")
        : "");
    try {
      await navigator.clipboard.writeText(text);
      toast("回答已复制");
    } catch {
      toast("复制不可用，请长按回答选择文字。");
    }
  }
  if (button.dataset.retryId) {
    if (pending) return;
    const index = current().messages.findIndex(
      (m) => m.id === button.dataset.retryId,
    );
    const user = current()
      .messages.slice(0, index)
      .reverse()
      .find((m) => m.role === "user");
    if (user) generate(user, current().messages[index]);
  }
});
for (const source of ["camera", "photos", "files"])
  $(source + "-input").addEventListener("change", (event) => {
    const result = validateFiles(
      Array.from(event.target.files || []),
      files().length,
    );
    sessionFiles.set(state.currentId, [...files(), ...result.accepted]);
    event.target.value = "";
    controls();
    if (result.errors.length) toast(result.errors.join("；"));
  });
for (const dialog of document.querySelectorAll("dialog"))
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
function viewport() {
  const sticky = followTail && current().messages.length;
  const vv = window.visualViewport;
  document.documentElement.style.setProperty(
    "--app-height",
    (vv?.height || window.innerHeight) + "px",
  );
  document.documentElement.style.setProperty(
    "--app-top",
    (vv?.offsetTop || 0) + "px",
  );
  if (sticky) requestAnimationFrame(scrollBottom);
}
window.visualViewport?.addEventListener("resize", viewport);
window.visualViewport?.addEventListener("scroll", viewport);
window.addEventListener("resize", viewport);
window.addEventListener("pagehide", persist);
render();
viewport();
new ResizeObserver(() => {
  if (followTail) scrollBottom();
  $("app").style.setProperty(
    "--composer-height",
    $("composer").closest("footer").getBoundingClientRect().height + "px",
  );
}).observe($("composer").closest("footer"));
new ResizeObserver(() => {
  $("app").style.setProperty(
    "--topbar-height",
    document.querySelector(".topbar").getBoundingClientRect().height + "px",
  );
}).observe(document.querySelector(".topbar"));
initVoice({
  demoMode: new URLSearchParams(location.search).get("voice") !== "live",
  canOpen: () => !pending,
  onConfirm: (text) => {
    const prefix = $("message").value.trim();
    $("message").value = prefix ? prefix + "\n" + text : text;
    current().draft = $("message").value;
    persist();
    controls();
    resizeInput();
    $("announcement").textContent = "语音文字已填入输入框";
  },
  notify: toast,
});

initHistoryActions({
  state,
  canEdit: () => !pending,
  onChange: ({ type, id }) => {
    if (type === "delete") sessionFiles.delete(id);
    persist();
    render();
    renderHistory();
    const focus =
      type === "rename"
        ? $("history-list").querySelector(`[data-history-actions="${id}"]`)
        : $("history-list").querySelector(
            `[data-session-id="${state.currentId}"]`,
          );
    (focus || $("drawer-new")).focus({ preventScroll: true });
    $("announcement").textContent =
      type === "rename" ? "会话名称已保存" : "会话已删除";
  },
});

initAccountMenu();

initDocumentPreview();
