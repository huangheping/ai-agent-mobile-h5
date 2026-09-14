import test from "node:test";
import assert from "node:assert/strict";
import { streamReply } from "../src/service.js";
import {
  processHtml,
  skillHtml,
  applyProcessEvent,
  interruptProcess,
} from "../src/process.js";

test("普通对话没有技能标题；过程按事件出现，完成后默认收起，可展开", async () => {
  const m = { id: "test", status: "streaming" };
  assert.equal(processHtml(m), "");
  assert.equal(skillHtml(m), "");
  for await (const e of streamReply({ text: "你好" }, { interval: 0 }))
    applyProcessEvent(m, e);
  assert.equal(m.skill, undefined);
  assert.equal(m.process.steps.length, 1);
  assert.ok(m.process.steps.every((s) => s.status === "done"));
  assert.match(processHtml(m), /aria-expanded="true"/);
  m.status = "done";
  assert.match(processHtml(m), /aria-expanded="false"/);
  m.process.expanded = true;
  assert.match(processHtml(m), /aria-expanded="true"/);
});
test("方案技能有明确调用事件；阶段更新保留手动展开状态，中断不标完成", async () => {
  const m = { id: "test", status: "streaming" };
  for await (const e of streamReply(
    { text: "梳理需求", planId: "hongkong-fna" },
    { interval: 0 },
  )) {
    applyProcessEvent(m, e);
    if (e.type === "process") m.process.expanded = false;
  }
  assert.equal(m.skill.id, "hongkong-fna");
  assert.match(skillHtml(m), /香港保险FNA问卷生成与产品配置方案/);
  assert.equal(m.process.steps.length, 3);
  assert.equal(m.process.expanded, false);
  applyProcessEvent(m, {
    type: "process",
    steps: [
      {
        title: "处理",
        summary: "<script>不应执行</script>",
        status: "running",
      },
    ],
  });
  interruptProcess(m, "stopped");
  assert.equal(m.process.steps[0].status, "stopped");
  assert.match(processHtml(m), /已中断/);
  assert.ok(!processHtml(m).includes("<script>"));
});

test("刷新恢复时未完成的过程步骤不会一直显示进行中", async () => {
  const { loadState } = await import("../src/store.js");
  const restored = loadState({
    getItem: () =>
      JSON.stringify({
        version: 1,
        currentId: "s",
        sessions: [
          {
            id: "s",
            title: "测试",
            messages: [
              {
                id: "m",
                role: "assistant",
                text: "",
                status: "streaming",
                process: {
                  steps: [
                    { title: "处理", summary: "公开步骤", status: "running" },
                  ],
                },
              },
            ],
          },
        ],
      }),
  });
  assert.equal(restored.sessions[0].messages[0].status, "stopped");
  assert.equal(
    restored.sessions[0].messages[0].process.steps[0].status,
    "stopped",
  );
});
