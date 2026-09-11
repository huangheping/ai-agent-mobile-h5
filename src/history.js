import { renameSession, deleteSession } from "./store.js";

export function initHistoryActions({ state, canEdit, onChange }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("history-actions-dialog");
  let selectedId = null;
  let trigger = null;
  function panel(mode) {
    $("history-actions-menu").hidden = mode !== "menu";
    $("history-rename-form").hidden = mode !== "rename";
    $("history-delete-panel").hidden = mode !== "delete";
    $("history-actions-title").textContent = {
      menu: "会话管理",
      rename: "编辑名称",
      delete: "删除会话？",
    }[mode];
  }
  function validate() {
    const value = $("history-name").value.trim();
    $("history-name-error").textContent = !value
      ? "请输入会话名称"
      : value.length > 60
        ? "会话名称不能超过 60 个字"
        : "";
    $("history-name").setAttribute(
      "aria-invalid",
      String(!value || value.length > 60),
    );
    $("history-save").disabled = !value || value.length > 60;
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-actions]");
    if (!button || !canEdit()) return;
    const session = state.sessions.find(
      (s) => s.id === button.dataset.historyActions,
    );
    if (!session) return;
    trigger = button;
    selectedId = session.id;
    $("history-action-name").textContent = session.title;
    $("history-name").value = session.title;
    $("history-name-error").textContent = "";
    panel("menu");
    dialog.showModal();
  });
  $("history-rename").onclick = () => {
    panel("rename");
    validate();
    $("history-name").focus();
    $("history-name").select();
  };
  $("history-delete").onclick = () => {
    panel("delete");
    $("history-delete-cancel").focus();
  };
  $("history-name").addEventListener("input", validate);
  $("history-rename-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (
      !canEdit() ||
      !renameSession(state, selectedId, $("history-name").value)
    )
      return;
    const id = selectedId;
    dialog.close();
    onChange({ type: "rename", id });
  });
  $("history-delete-confirm").onclick = () => {
    if (!canEdit() || !deleteSession(state, selectedId)) return;
    const id = selectedId;
    dialog.close();
    onChange({ type: "delete", id });
  };
  for (const button of dialog.querySelectorAll("[data-history-dismiss]")) {
    button.onclick = () => dialog.close();
  }
  dialog.addEventListener("close", () => {
    selectedId = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
}
