import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import {
  newSession,
  renameSession,
  deleteSession,
  loadState,
  saveState,
} from "../src/store.js";
import { initHistoryActions } from "../src/history.js";
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
function fixture() {
  const session = {
    ...newSession(),
    draft: "保留草稿",
    planId: "plan-a",
    messages: [{ role: "user", text: "原始内容" }],
  };
  return { version: 1, currentId: session.id, sessions: [session] };
}
test("编辑名称不改变消息、草稿或方案，拒绝空白及超长名称，保存后可恢复", () => {
  const state = fixture(),
    original = structuredClone(state.sessions[0]),
    id = state.currentId;
  assert.equal(renameSession(state, id, "   "), false);
  assert.equal(renameSession(state, id, "a".repeat(61)), false);
  assert.equal(renameSession(state, id, "  家庭保障计划  "), true);
  const s = state.sessions[0];
  assert.equal(s.title, "家庭保障计划");
  assert.deepEqual(s.messages, original.messages);
  assert.equal(s.draft, original.draft);
  assert.equal(s.planId, original.planId);
  let saved;
  const storage = {
    getItem: () => saved,
    setItem: (_, v) => {
      saved = v;
    },
  };
  saveState(storage, state);
  assert.equal(loadState(storage).sessions[0].title, "家庭保障计划");
});
test("删除非当前会话保留当前草稿；删除当前会话选择其他历史；最后一条删除后仍能新建", () => {
  const state = fixture(),
    first = state.currentId;
  const other = { ...newSession(), draft: "另一个草稿", updatedAt: 1 };
  state.sessions.push(other);
  assert.equal(deleteSession(state, other.id), true);
  assert.equal(state.currentId, first);
  assert.equal(state.sessions[0].draft, "保留草稿");
  state.sessions.push(other);
  assert.equal(deleteSession(state, first), true);
  assert.equal(state.currentId, other.id);
  assert.equal(deleteSession(state, other.id), true);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].messages.length, 0);
  assert.equal(state.currentId, state.sessions[0].id);
  assert.equal(deleteSession(state, "missing"), false);
});
test("菜单不切换会话；取消编辑/删除不修改记录；只有确认删除才移除", () => {
  const dom = new JSDOM(html),
    win = dom.window;
  globalThis.document = win.document;
  win.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  win.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new win.Event("close"));
  };
  const $ = (id) => win.document.getElementById(id),
    state = fixture(),
    id = state.currentId,
    changes = [];
  const other = newSession();
  state.sessions.push(other);
  state.currentId = other.id;
  const trigger = win.document.createElement("button");
  trigger.dataset.historyActions = id;
  win.document.body.append(trigger);
  initHistoryActions({
    state,
    canEdit: () => true,
    onChange: (change) => changes.push(change),
  });
  trigger.click();
  assert.equal(state.currentId, other.id);
  $("history-rename").click();
  $("history-name").value = "";
  $("history-name").dispatchEvent(new win.Event("input"));
  assert.equal($("history-save").disabled, true);
  $("history-rename-form").querySelector("[data-history-dismiss]").click();
  assert.equal(state.sessions[0].title, "新对话");
  trigger.click();
  $("history-rename").click();
  $("history-name").value = "修改后的标题";
  $("history-name").dispatchEvent(new win.Event("input"));
  $("history-rename-form").dispatchEvent(
    new win.Event("submit", { cancelable: true }),
  );
  assert.equal(state.sessions[0].title, "修改后的标题");
  assert.equal(changes.length, 1);
  trigger.click();
  $("history-delete").click();
  $("history-delete-cancel").click();
  assert.equal(state.sessions.length, 2);
  trigger.click();
  $("history-delete").click();
  $("history-delete-confirm").click();
  assert.equal(
    state.sessions.some((s) => s.id === id),
    false,
  );
  assert.equal(state.currentId, other.id);
  assert.equal(changes.length, 2);
  dom.window.close();
});
