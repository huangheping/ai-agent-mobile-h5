import test from "node:test";
import assert from "node:assert/strict";
import { findPlanShortcut, consumePlanShortcut } from "../src/composer-shortcut.js";

const typed = { inputType: "insertText", data: "/", isComposing: false };
const input = (value, caret = value.length) => ({ value, selectionStart: caret, selectionEnd: caret });

test("空输入和草稿中的独立斜杠可呼出方案，选中只移除指令字符", () => {
  for (const value of ["/", "预算五万元 /", "第一行\n/", "预算 / 期限"]) {
    const caret = value.indexOf("/") + 1;
    const command = findPlanShortcut(input(value, caret), typed);
    assert.ok(command);
    assert.equal(consumePlanShortcut(value, command), value.replace("/", ""));
  }
});

test("网址、日期、普通斜杠、粘贴与输入法组合不触发方案", () => {
  for (const value of ["https:/", "2026/", "保额/", "//"]) {
    assert.equal(findPlanShortcut(input(value), typed), null);
  }
  for (const event of [{ ...typed, inputType: "insertFromPaste" }, { ...typed, isComposing: true }, { ...typed, inputType: "deleteContentBackward" }]) {
    assert.equal(findPlanShortcut(input("/"), event), null);
  }
});

test("取消选择或草稿发生变化时不误删内容", () => {
  assert.equal(consumePlanShortcut("预算 /", null), "预算 /");
  const command = findPlanShortcut(input("预算 /"), typed);
  assert.equal(consumePlanShortcut("预算 / 已修改", command), "预算 / 已修改");
});
