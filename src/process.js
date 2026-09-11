const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// Render only service-provided public process summaries, never infer private reasoning.
export function processHtml(message) {
  const process = message.process;
  if (!process?.steps?.length) return "";
  const completed = process.steps.filter((s) => s.status === "done").length;
  const expanded = process.expanded ?? message.status === "streaming";
  return `<section class="process-panel"><button class="process-toggle" data-process-id="${escape(message.id)}" aria-expanded="${expanded}" aria-controls="process-${escape(message.id)}"><img src="./assets/thinking.svg" alt=""><strong>推理过程</strong><span>${completed ? `已进行 ${completed} 轮推理` : "正在处理"}</span><i aria-hidden="true" class="process-chevron ${expanded ? "open" : ""}"></i></button><div id="process-${escape(message.id)}" class="process-body" ${expanded ? "" : "hidden"}>${process.steps.map((s, i) => `<div class="process-step"><div class="process-step-heading"><span>${i + 1}. ${escape(s.title)}</span><small>${s.status === "done" ? '<img src="./assets/step-done.svg" alt="">已完成' : s.status === "stopped" ? "已中断" : s.status === "error" ? "未完成" : '<i class="spinner"></i>进行中'}</small></div><p>${escape(s.summary)}</p></div>`).join("")}</div></section>`;
}
export function skillHtml(message) {
  return message.skill?.name
    ? `<div class="assistant-head"><img src="./assets/agent-result.svg" alt=""><span>${escape(message.skill.name)}</span></div>`
    : "";
}
export function applyProcessEvent(message, event) {
  if (event.type === "skill") message.skill = event.skill;
  if (event.type === "process") {
    const expanded = message.process?.expanded;
    message.process = {
      steps: event.steps.map((s) => ({ ...s })),
      ...(expanded === undefined ? {} : { expanded }),
    };
  }
}
export function interruptProcess(message, status) {
  for (const step of message.process?.steps || []) {
    if (step.status === "running") step.status = status;
  }
}
