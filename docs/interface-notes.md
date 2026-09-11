# 当前来源代码与接口观察

仅从本地静态预览代码读取，不能当作线上接口契约已经确认。

## 来源

- Web `index.html` 同时加载 Umi 基线、AI Agent CSS、改版 CSS、本地 Mock 和公共模块。
- `AI Agent/AI Agent改版.css` 使用桌面两列弹窗（360px 历史栏）；980px 以下仍至少保留 260px 侧栏。
- `AI Agent/AI Agent本地Mock.js` 混合了模拟接口与 DOM 适配，并使用 Web 打包类名。
- 方案列表来自 `agentProposalCenterTemplates` 常量，包含五种模板。原版同时请求客户列表；移动端不带入该请求。

## 在本地 Mock 中观察到的路径

| 功能     | 路径/事件                                  | 本轮结论                                                                 |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| 发送     | `/api/gaip/agent/chat/send`                | Mock 读取 `sessionId`、`message`；新会话使用 0。真实鉴权、必填参数待核对 |
| 列表     | `/api/gaip/agent/chat/session/list`        | Mock 分页字段为 `curPage`、`pageSize`，返回 `list`、`total`              |
| 会话详情 | `/api/gaip/agent/chat/session/{id}`        | Mock 返回 messages、sessionId、title、status                             |
| 重命名   | `/api/gaip/agent/chat/session/rename`      | 已提供本地编辑名称，真实接口待接入                                             |
| 删除     | `/api/gaip/agent/chat/session/delete/{id}` | 已提供本地确认删除，真实接口待接入                                               |
| 方案     | 本地常量模板                               | 没有足够证据确认真实注册表接口                                           |
| 客户     | `/api/gaip/client/list`                    | 明确排除，不进入 H5                                                      |
| 语音     | 未确认 ASR 接口                            | 只实现本地录音和明确区分的转写动效演示                                   |
| 附件     | 未确认上传解析契约                         | 只实现选择、大小/类型校验与展示                                          |

## 本地 SSE 观察

来源模拟响应为 `data: JSON\n\n`，事件包括 `meta`、`answer_start`、`reasoning_start`、`reasoning_delta`、`reasoning_done`、`answer_chunk`，结束为 `[DONE]`。

移动端暂用 UI 自有 `status / skill / process / text / table / done` 事件契约。`skill` 明确触发技能标题；`process.steps` 提供可展示的过程摘要与 running/done 状态，不从回复正文推断技能，也不生成或暴露私有推理。正式接入时应在 service 适配层转换服务端事件，而不是让页面直接耦合来源 Mock。

## 正式接入仍需核对

1. 鉴权与请求环境、错误结构、会话归属、取消是否需要服务端停止端点。
2. 方案 ID 的正式字段与可用列表、是否允许不传客户 ID；不传客户的支持应由服务端确认。
3. 回答消息的 Markdown/表格/文件输出规范，以及 HTML 清理和链接规则。
4. 文件上传、解析状态、取消重试、语音格式及转写接口。
5. 历史分页、重复发送保护与网络重连。

这些确认不要求修改现有 Web 前端，但如果后端尚不支持相应能力，需要在后端另行评估。
