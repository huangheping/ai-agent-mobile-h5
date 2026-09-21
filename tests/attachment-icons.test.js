import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentKind, attachmentIcon } from '../src/attachment-icons.js';

test('附件类型兼容大写后缀、旧 Office 格式、图片 MIME 和未知文件', () => {
  for (const [name, expected] of [['照片.PNG','image'], ['照片.heic','image'], ['方案.PDF','pdf'], ['说明.doc','word'], ['说明.docx','word'], ['费率.XLS','excel'], ['费率.xlsx','excel'], ['打包.zip','generic'], ['没有后缀','generic']]) {
    assert.equal(attachmentKind({name}), expected, name);
  }
  assert.equal(attachmentKind({name:'相机照片', type:'image/jpeg'}),'image');
  assert.equal(attachmentKind({name:'报告', type:'application/pdf'}),'pdf');
  assert.equal(attachmentKind({name:'报告.pdf', type:'application/octet-stream'}),'pdf');
  assert.equal(attachmentKind({name:'报告.pdf', type:'image/jpeg'}),'pdf');
  assert.equal(attachmentIcon({name:'存档.zip'}),'./assets/attachment-tag.svg');
});
