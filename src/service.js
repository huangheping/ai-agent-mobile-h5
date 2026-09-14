import { createReply, plans } from "./data.js?v=10";

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("已停止", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

// UI depends only on this event contract; replace this adapter after confirming real APIs.
export async function* streamReply(request, { signal, interval = 32 } = {}) {
  yield { type: "status", text: "正在整理回答…" };
  const plan = plans.find((p) => p.id === request.planId);
  const result = createReply(request);
  const steps = plan
    ? [
        {
          title: "整理需求",
          summary: "演示步骤：检查本次输入的目标与待补充资料。",
        },
        {
          title: "调用方案技能",
          summary: `演示步骤：使用「${plan.name}」展示方案整理流程，尚未调用真实业务服务。`,
        },
        {
          title: "整理输出",
          summary: "演示步骤：汇总现有信息，列出后续需要确认的项目。",
        },
      ]
    : [
        {
          title: "理解问题",
          summary: "演示步骤：根据当前输入整理回复；本轮未调用方案技能。",
        },
      ];
  if (plan) yield { type: "skill", skill: { id: plan.id, name: plan.name } };
  for (let i = 0; i < steps.length; i++) {
    yield {
      type: "process",
      steps: steps
        .slice(0, i + 1)
        .map((s, j) => ({ ...s, status: j === i ? "running" : "done" })),
    };
    await delay(interval * 16, signal);
  }
  yield {
    type: "process",
    steps: steps.map((s) => ({ ...s, status: "done" })),
  };
  for (let i = 0; i < result.text.length; i += 5) {
    await delay(interval, signal);
    yield { type: "text", text: result.text.slice(i, i + 5) };
  }
  if (result.table) yield { type: "table", table: result.table };
  if (result.after) yield { type: "text", text: "\n\n" + result.after };
  yield { type: "done", suggestions: result.suggestions || [] };
}
