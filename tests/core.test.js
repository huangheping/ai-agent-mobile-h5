import test from "node:test";
import assert from "node:assert/strict";
import { plans, createReply } from "../src/data.js";
import { streamReply } from "../src/service.js";
import { loadState, saveState, validateFiles } from "../src/store.js";
import { gestureOutcome, formatDuration } from "../src/voice.js";

test("方案请求不需要客户 ID，全部方案可单独进入对话", () => {
  for (const p of plans) {
    const reply = createReply({ text: "帮我梳理需求", planId: p.id });
    assert.ok(reply.text.includes(p.name));
    assert.ok(reply.text.includes("无需先选择客户"));
    assert.equal("clientId" in p, false);
  }
});
test("宽表格保留完整的五列且所有行长度一致", () => {
  const reply = createReply({ text: "对比三份方案" });
  assert.equal(reply.table.columns.length, 5);
  assert.equal(reply.table.rows.length, 9);
  assert.ok(reply.table.rows.every((r) => r.length === 5));
});
test("取消流式生成后不继续输出后续内容或完成事件", async () => {
  const controller = new AbortController();
  const events = [];
  await assert.rejects(
    async () => {
      for await (const e of streamReply(
        { text: "你好" },
        { signal: controller.signal, interval: 1 },
      )) {
        events.push(e);
        if (e.type === "text") controller.abort();
      }
    },
    (e) => e.name === "AbortError",
  );
  assert.equal(events.filter((e) => e.type === "text").length, 1);
  assert.ok(!events.some((e) => e.type === "done"));
});
test("流式回答完成时提供完整表格和追问", async () => {
  const events = [];
  for await (const e of streamReply({ text: "对比三份方案" }, { interval: 0 }))
    events.push(e);
  assert.equal(events[0].type, "status");
  assert.ok(events.some((e) => e.type === "table"));
  assert.equal(events.at(-1).type, "done");
});
test("刷新恢复草稿、方案与会话；未完成生成恢复为已停止", () => {
  const data = new Map();
  const storage = {
    getItem: (k) => data.get(k),
    setItem: (k, v) => data.set(k, v),
  };
  const state = loadState(storage),
    s = state.sessions[0];
  s.draft = "未发送的需求";
  s.planId = plans[0].id;
  s.messages.push({ role: "assistant", text: "部分回复", status: "streaming" });
  assert.equal(saveState(storage, state), true);
  const restored = loadState(storage);
  assert.equal(restored.sessions[0].draft, s.draft);
  assert.equal(restored.sessions[0].planId, s.planId);
  assert.equal(restored.sessions[0].messages[0].status, "stopped");
  assert.equal(restored.currentId, s.id);
});
test("损坏或禁用的存储不会阻断页面", () => {
  assert.equal(loadState({ getItem: () => "{invalid" }).sessions.length, 1);
  assert.equal(
    saveState(
      {
        setItem: () => {
          throw Error();
        },
      },
      {},
    ),
    false,
  );
});
test("附件类型、20MB上限与数量独立校验", () => {
  const files = [
    { name: "large.pdf", size: 21 * 1024 * 1024 },
    { name: "script.exe", size: 100 },
    { name: "plan.pdf", size: 1000 },
  ];
  const result = validateFiles(files);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.errors.length, 2);
  assert.equal(
    validateFiles(
      [
        { name: "a.pdf", size: 1 },
        { name: "b.pdf", size: 1 },
      ],
      4,
    ).accepted.length,
    1,
  );
});
test("手势区分误触短按、松开转写与上滑取消，取消优先", () => {
  assert.equal(gestureOutcome({ duration: 100, dy: 0 }), "short");
  assert.equal(gestureOutcome({ duration: 750, dy: -30 }), "finish");
  assert.equal(gestureOutcome({ duration: 100, dy: -90 }), "cancel");
  assert.equal(formatDuration(60), "01:00");
});

test("首次打开显示空白会话，保留已有会话和草稿，重复打开不堆积空白会话", async () => {
  const { selectInitialSession, newSession } = await import("../src/store.js");
  const old = { ...newSession(), draft: "未发送的草稿" };
  const state = { sessions: [old], currentId: old.id };
  selectInitialSession(state);
  assert.notEqual(state.currentId, old.id);
  assert.equal(state.sessions.length, 2);
  assert.equal(
    state.sessions.find((s) => s.id === old.id).draft,
    "未发送的草稿",
  );
  selectInitialSession(state);
  assert.equal(state.sessions.length, 2);
});
