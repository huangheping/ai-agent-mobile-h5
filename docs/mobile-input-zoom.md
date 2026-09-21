# 移动端输入与缩放（2026-09-21）

用户要求：输入文字/提示保持 16px，解决企业微信激活输入框自动放大，并禁止移动端双指缩放。

- viewport 指定初始、最小、最大比例均为 1，user-scalable=no。
- html/body 保留单指横纵滚动手势；捕获多指 touchstart/touchmove 及触屏设备的 iOS gesturestart/gesturechange，取消缩放默认动作。不阻止单指事件、输入事件或语音按钮事件。
- iOS 对未激活输入框的首次单指轻点，同步调用 focus({preventScroll:true})；已激活输入框保留系统光标/选区操作，滑动及多指不由聚焦模块接管。
- 依据：WebKit WKContentViewInteraction.mm 的 _zoomToRevealFocusedElement 在 preventScroll 为真时跳过自动 reveal/zoom；https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/ios/WKContentViewInteraction.mm 。企业微信宿主行为仍需真机确认。
- 验证：DOM 回归覆盖聚焦参数、草稿/选区保留、单指与多指、取消与事件解绑；本地自动测试通过不代表企业微信真机验收。
- 2026-09-21 发布更新：36 项自动测试通过；企业微信真机效果待确认。
