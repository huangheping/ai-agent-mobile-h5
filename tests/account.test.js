import test from 'node:test';
import assert from 'node:assert/strict';
import { installGuideFor } from '../src/account.js';

test('微信和企业微信先引导到浏览器，不能当作 Safari 直接添加', () => {
  for (const userAgent of ['iPhone MicroMessenger', 'iPhone wxwork', 'Android MicroMessenger wxwork']) {
    const guide = installGuideFor({ userAgent });
    assert.equal(guide.title, '先在浏览器打开');
    assert.match(guide.steps[0], /浏览器打开/);
    assert.match(guide.steps.at(-1), /复制链接/);
  }
});
test('苹果、桌面模式 iPad、安卓和电脑显示各自的添加指引', () => {
  for (const env of [{ userAgent: 'iPhone Safari' }, { userAgent: 'Macintosh Safari', platform: 'MacIntel', maxTouchPoints: 5 }]) {
    assert.equal(installGuideFor(env).title, '添加到主屏幕');
  }
  assert.equal(installGuideFor({ userAgent: 'Android Chrome' }).title, '添加到桌面');
  assert.equal(installGuideFor({ userAgent: 'Macintosh Chrome', platform: 'MacIntel', maxTouchPoints: 0 }).title, '在手机上添加');
});
