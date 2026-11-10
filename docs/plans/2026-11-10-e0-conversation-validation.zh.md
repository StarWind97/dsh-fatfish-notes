# E0：会话侧栏、关联与直接附加可行性验证

状态：2026-11-10，按用户授权完成 E0。**正式 E 功能尚未开发**；下一步审核 [E 阶段实施方案](2026-11-10-stage-e-implementation.zh.md)。本记录属于[主规划](2026-11-09-product-iteration-roadmap.zh.md)阶段 E，不增加平行路线。

## 结论

| 能力 | 结论 | 实际证据与限制 |
| --- | --- | --- |
| 会话右侧笔记面板 | 可实施 | 公共 tab 注册、正文插槽与打开方法已在隔离 Desktop 实测；与宿主工具页共存，切换会话后身份及布局分别保持。 |
| 显示本会话转存的笔记 | 可实施 | 已有 `NoteContent.sourceId → CaptureSource.sessionId`。只读核对现有资料，找到当前测试会话对应的 5 篇有效笔记。尚未开发查询接口和正式列表。 |
| 手动关联已有笔记 | 可实施，需要插件自身开发 | 宿主提供会话身份，插件提供稳定笔记身份与版本化元数据。无需宿主额外提供「笔记关联」接口；持久化、同步、移除规则仍需按方案实现和验收。 |
| 文件上传到宿主 | 部分可用 | 公共 `fileUpload.upload` 成功上传 67 字节 Markdown，返回 receipt 和文件引用；取消返回 `AbortError`。这不等于已经附加到输入框。 |
| 由插件直接附加笔记到当前草稿 | 暂不进入正式实现 | 公共 `IConversation` / `SessionInput` 缺少创建并登记浏览器附件的入口；上传 receipt、持久文件 ID、草稿附件 ID 不是同一件东西。 |
| 直接附加图片 | 未通过完整验证 | 两次公共 `uploadImage` 调用均报 `background upload transport failed`，捕获到 `/api/session/uploadFileBinary` 的 `net::ERR_UNEXPECTED`；没有完成直接附加和发送后的读图验证。不能推断其他平台也必然失败。 |

推荐先做会话侧栏、来源检索、手动关联和打开笔记。直接附加保留接口待办，不使用内部方法强转、模拟粘贴、操控文件选择器或替换整个宿主输入框作为正式实现。

## 范围与证据来源

- 当前正式插件 0.8.0，源码基线 `f061652edd2f735aaabaa095c78921cc97de35ee`；Windows / Node 24.21.0 / DSH Desktop 0.2.2-rc.1。
- 只使用 `.dsh-home/pure-001/release12-desktop`、其独立 shell 和现有测试笔记目录。没有修改日常 DSH，没有向模型发送消息或消费推理额度，也没有发起笔记写入或测试私库推送操作。
- 核对项目现有官方 SDK 类型、当前宿主安装包中的客户端实现，以及通过 npm 获取的同版本 [右侧栏包](https://www.npmjs.com/package/@deepseek-ai/dsh-client-ui-sidebar-right/v/0.2.2-rc.1)和 [Session UI 包](https://www.npmjs.com/package/@deepseek-ai/dsh-client-ui-session/v/0.2.2-rc.1)。网页读取未成功，改读发布包内的官方 README、类型和实现。宿主打包文件与 npm 文件并非逐字相同，因此运行结果以实际 Desktop 为准，不把声明检查当作运行验收。
- 临时验证插件通过隔离 profile 的正常插件加载与公共插槽注册运行；Electron CDP / Playwright 仅用于点击、观察和记录。没有修改宿主安装文件，没有调用内部 `createDrafts`。

## 1. 会话侧栏

官方扩展路径已验证：

1. `ctx.sidebarRightTabs.register` 声明独立的 tab 类型。
2. `sidebar.right.pane.tab` 注册正文，通过标准 `sessionId` 和 `useTabInfo()` 取得会话与面板身份。
3. `ctx.sidebarRight.openTab` 打开或聚焦该页；`guide` 可提供宿主工具页入口。
4. 已开始会话可在 `conversation.session.header.utilities` 增加入口。空白会话的这组工具可能被宿主隐藏，仍可使用宿主右栏工具页；没有有效会话时不开放关联操作。

隔离验证实际完成：

- 从会话工具按钮打开笔记验证 tab；原会话仍可阅读、输入。
- 同一面板同时保留笔记 tab 和宿主 `guide` tab，切换不会替换掉另一项。
- A 会话打开侧栏，切到 B 会话后得到 B 的身份和独立折叠状态；B 打开后再回 A，恢复 A 的 tab 和未发送草稿。
- 原会话输入文字、附件列表未被上传试验覆盖。最终恢复空草稿，移除临时附件。

边界：本次验证的是与宿主内置工具页共存，没有逐个安装第三方右栏插件。采用同一公开 tab 注册路径可降低冲突，但不能承诺所有第三方插件兼容。窄窗口是否覆盖会话由宿主的右侧栏布局规则决定；需要持续并排操作时可使用已有的肥鱼独立窗口。

## 2. 笔记关联

来源编号已随原始选材保存在私库中。对测试资料的只读核对包含 83 个笔记对象、71 个有效非模板当前头、28 份不同来源、5 个来源会话，当前测试会话匹配 5 篇笔记。按来源哈希校验后建立映射可行。

一次来源读取与映射用时约 7.8 ms，但只测了 28 份本机来源文件，操作系统缓存未清空；**这不是正式侧栏的加载耗时，也不是性能承诺**。正式开发需在服务端复用验证和缓存，不让客户端逐篇请求正文/来源，也不在每次切换会话时遍历全部历史。

手动关联建议作为笔记自身的可选会话编号集合，与不可变原始来源分开。会话不存在于另一台设备时，笔记仍可阅读；不按会话标题或工作目录猜测关系，不承诺同步 DSH 会话本身。关系只是组织材料，不等于 AI 已读取材料。

尚未验证的正式行为：手动关系的写入与解除、私库双向同步、冲突、恢复、复制和删除。上述属于待批准的 E2，而非本次完成项。

## 3. 上传与草稿附件的区别

当前公开合同：

| 接口 | 可以做什么 | 不能据此承诺什么 |
| --- | --- | --- |
| `fileUpload.upload` / `uploadImage` | 上传会话所属文件，返回宿主 receipt / 持久附件引用 | 不负责把浏览器 `File` 登记到输入框附件集合。 |
| `SessionInput.addAttachments` / `InputActions.addAttachments` | 将已经登记的草稿附件 ID 加入当前输入 | 不能把上传 receipt 或持久文件 ID 当作草稿 ID。 |
| `ConversationController.createDrafts` | 宿主实现内有完整创建路径 | 未在插件面向的 `IConversation` 中公开，不能作为稳定集成合同。 |
| `conversation.input.attachments` 的 `onAddFiles` | 宿主传给附件展示组件的接收回调 | 属于单占位组件的 owner props，不是侧栏或普通插件共用入口；取得它需要接管该组件。 |

同版本类型探针通过：侧栏注册、文件上传和 `addAttachments` 调用可按公共类型编译；对 `IConversation.createDrafts`、`SessionInput.addFiles` 的禁止访问断言也成立。

实际上传 Markdown 后，输入框仍为 0 个附件；已有文字完整保留。故不能把「上传成功」展示成「已附加」。对不存在的草稿 ID，`addAttachments` 当下甚至返回 true；这只表示列表接受编号，不能证明附件对象存在。本次立即移除测试编号，没有尝试发送。

作为对照，通过宿主自带文件选择器加入测试 Markdown 和 PNG 后，两项出现在草稿附件栏，也可各自移除。这证明宿主自身拥有接收流程，**不证明第三方插件可通过公开接口完成同一流程**，也没有验证模型实际读取了它们。图片公共上传的传输错误另行保留证据；本次不扩大为宿主上传修复。

直接附加重新进入实施前，至少需要公开的文件接收/草稿登记入口，覆盖成功、失败、取消、会话切换、保留已有输入、重复点击与图片材料，并验证由用户发送后的模型可读性。当前不新增下载后手工附加入口，不自动发送或用正文粘贴替代已讨论的附件体验。

## 验证文件与收尾

本机忽略目录 `.dsh-home/pure-001/e0/` 保留 `client.jsx`、类型探针、官方包、`result.json`、`association-audit.json`、`attachment-baseline.json`、`cleanup.json` 和配置备份；截图在 `output/playwright/e0/`：

- `01-session-sidebar.png`：实际宿主侧栏注册。
- `02-upload-without-composer-registration.png`：上传与草稿附件数量分离。
- `03-coexisting-host-tools.png`：与宿主工具页共存。
- `04-session-switch.png`：另一会话的独立面板。
- `05-native-attachment-baseline.png`：宿主文件选择器对照。

这些是临时接口验证界面，不是待采用的产品样式。测试脚本曾因图片错误中止一次、因把「新建会话」定位成「新会话」超时一次；补验已完成其余步骤，图片失败如实保留，没有计为通过。

临时插件已撤下，profile 配置逐字恢复，正式安装仍为 0.8.0；草稿及测试附件已清理，自建 Desktop 已关闭。上传产生的少量隔离宿主暂存对象留待宿主自身管理，不修改其内部存储来强行清理。

本次只做接口探针、真实隔离操作、只读资料核对与文档差异/链接检查；产品代码和依赖没有变化，因此没有重跑产品全量回归。Web、macOS、跨物理设备及模型发送后的读取未覆盖。
