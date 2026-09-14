import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initFocusMode } from '../src/focus.js';

test('触摸及弹窗焦点恢复不切换为键盘模式，Tab 后可恢复键盘提示', () => {
  const { window } = new JSDOM('<button id="open">打开</button><input id="name">');
  const doc = window.document;
  const cleanup = initFocusMode(doc);
  const button = doc.getElementById('open');
  const input = doc.getElementById('name');
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  assert.equal(doc.documentElement.dataset.inputMode, 'keyboard');
  button.dispatchEvent(new window.Event('touchstart', { bubbles: true }));
  input.focus();
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(doc.documentElement.dataset.inputMode, 'pointer');
  assert.equal(doc.activeElement, input);
  button.focus();
  assert.equal(doc.documentElement.dataset.inputMode, 'pointer');
  button.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  assert.equal(doc.documentElement.dataset.inputMode, 'keyboard');
  button.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  assert.equal(doc.documentElement.dataset.inputMode, 'pointer');
  cleanup(); window.close();
});
