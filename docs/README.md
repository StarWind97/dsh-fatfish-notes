# 肥鱼笔记开发入口

产品为 **肥鱼笔记 / Fatfish Notes**，定位为私人笔记管理。用户审核确认后，[0.7.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.7.0) 已正式发布，包含笔记本管理、Markdown 迁入迁出、普通附件、文章互链与批量清理，沿用 [DSH 0.2.2 适配](plans/2026-11-06-dsh-022-compatibility.zh.md)。未发布 npm；市场更新进度与安装包校验值见[发布记录](releases/0.7.0/review.zh.md)。

代码仓库、包标识统一为 `dsh-fatfish-notes`；控制目录及新建私人库建议名为 `fatfish-notes`。本地工作目录 `D:\DSH-Workspace\dsh-github-notebook` 保留，现有私人库也不强制改名。运行代码不保留旧品牌兼容分支。

[产品设计](notes-design.zh.md)记录当前行为，[使用说明](user-guide.zh.md)面向日常操作，[验证记录](verification-log.zh.md)区分实际覆盖范围。日常在 `main` 开发，按[协作约定](../AGENTS.md)先讨论、批准后实施。

## 当前版本

**0.7.0 已在 GitHub 正式发布。** 本次汇总下述原 0.6.1 开发功能，0.6.1 不另行发布。源码及公开安装包已更新；市场 PR、维护者合并与页面可见状态分别记录于[发布记录](releases/0.7.0/review.zh.md)，不将 GitHub 发布等同于市场已更新。

`0.6.0` 以 DSH 0.2.2-rc.1 为基线，适配新版会话图片读取；包含更名、阅读与编辑章节目录、宽窄布局与章节高亮、独立滚动、首次初始化系统目录选择及取消/恢复默认。首次设置只使用同名新目录或空目录，已有云端库下载为新的本地副本。自动保存、五分钟双向同步、会话选材转存与文件导出继续保留。

0.6.0 已通过公开下载和实际安装核验。[市场条目](marketplace/StarWind97__dsh-fatfish-notes.yml)将原来的 DSH Notebook 条目更名为肥鱼笔记，并更新到正式发布包；GitHub 发布与市场维护者合并分别确认，不将提交 PR 当作已经上架。

2026-11-08 已核对更名 PR 合并及公开目录中的新条目。当时诊断的 GitHub Release 安装关联和宿主声明读取失败分别反馈为 [#1147](https://github.com/dsh-market/dsh-market/issues/1147)、[#1148](https://github.com/dsh-market/dsh-market/issues/1148)，市场侧修复进度以对方仓库为准。按[修正规划](plans/2026-11-08-market-metadata-and-peers.zh.md)删除未使用的 Schemastery 直接依赖要求，现随 0.7.0 发布；[0.6.1](releases/0.6.1/review.zh.md)仅保留历史开发记录。

旧名称下的 `0.5.0`、`0.5.1` 已正式发布，历史包、发布说明和截图保留原样。历史结果见 [0.5.0](releases/0.5.0/review.zh.md)、[0.5.1](releases/0.5.1/review.zh.md)及验证记录；这些文件中的名称描述的是当时版本，不是当前安装入口。

## 开发与验证

2026-11-09 已实现[笔记迁入迁出、普通附件与回收站完善](plans/2026-11-09-portability-and-attachments.zh.md)：视频等下载型附件、体积限制、多选与彻底删除、文章互链、整库/单本导出及 Markdown 文件/文件夹/ZIP 导入。图册见 `output/playwright/portability/index.html`，使用方法见[操作指引](user-guide.zh.md)。已用本机 Obsidian 1.10.6 的独立测试资料完成实际窗口验收：正文、属性、图片与笔记互链通过，附件路径和字节保持；另行下载的 1.15.0 启动失败，尚未覆盖该版本。不与其他软件共同编辑内部资料目录。

当前版本已完成[默认笔记本与移除规则](plans/2026-11-08-default-notebook.zh.md)：默认归属、默认本设置同步及移除时保留/移入回收站。该功能批次通过类型检查、构建和 227 项全量回归，已在隔离 DSH 完成实际安装、操作、指定私库同步和重启读回。2026-11-09 又完成[笔记本独立选项卡](plans/2026-11-09-notebooks-tab.zh.md)，按第二档通过类型检查、构建、46 项相关客户端测试和隔离 DSH 交互验收。迁入迁出批次及 0.7.0 发布前检查各通过 238 项全量回归。上述功能统一随 0.7.0 发布。

`src/` 为 TypeScript 源码，`lib/` 由构建生成。命令以 [package.json](../package.json)为准；依照[三档验证范围](../AGENTS.md#验证范围)选择检查。涉及存储身份或发布候选包时，执行类型检查、构建、全量回归和实际安装验收。

已验证宿主组合为 Windows / Node 24.21.0 / DSH 0.2.2-rc.1。macOS、两台物理设备仍待实测。体验入口不自动更新宿主；DSH 侧栏的「新版本」是宿主更新提示，与插件包版本分别核对。

## 本机隔离体验

真实验收仅使用 `.dsh-home/pure-001/` 和指定私库 `StarWind97/dsh-community-private-test`。不改日常 DSH 资料。

通过 [Open-Fatfish-Notes.cmd](../scripts/Open-Fatfish-Notes.cmd) 打开 `release12-desktop` 隔离体验资料；公开安装入口为 0.7.0。实际安装状态和包摘要见 [0.7.0 发布记录](releases/0.7.0/review.zh.md)，原 0.6.1 构建记录[保留](releases/0.6.1/review.zh.md)。本版图册为 `output/playwright/release070/index.html`，默认笔记本此前截图位于 `output/playwright/default-books/`，记录及备份位于 `.dsh-home/pure-001/`。此前市场诊断证据见 `output/playwright/market061/`；新版宿主既有图册位于 `output/playwright/compat022/index.html`，此前改名截图位于 `output/playwright/rename060/`，均由 Git 忽略。Web 的跨实例宿主同步证据仍为 0.6.0；本轮另验证了两个本地 Git 副本的默认本同步，不将其称为两个真实宿主或两台物理设备验收。

本轮选项卡截图见 `output/playwright/notebooks-tab/index.html`，记录和包核对见 `.dsh-home/pure-001/notebooks-tab-*`。历史图册保留于 `output/playwright/release051/`、`outline-arrow/` 和 `setup-picker/` 等目录，不作为新版截图。普通桌面启动的 GitHub 账号需在实际宿主核对，不能仅凭 Codex 环境的登录状态判断。

## 后续备忘

2026-11-09 已更新[常用功能与迭代参考规划](plans/2026-11-09-product-iteration-roadmap.zh.md)，补充已读到的语雀官方帮助并按必要性、可行性调整取舍。用户已批准先做[独立窗口小范围验证](plans/2026-11-09-independent-window-validation.zh.md)，解决笔记与 DSH 会话并行使用的问题；再补查找、整理与历史恢复。三栏正式界面、会话侧栏及 AI 输出仍需单独讨论确认。

独立窗口验证已完成：Chrome 应用窗口与隔离 DSH 共用同一笔记服务，保存、关闭重开及会话图文转存可行；补充本机刷新后新笔记可自动出现。正式实现仍需窗口重用、主题跟随、连接中断与恢复，以及编辑归属处理。证据与可重启入口见验证文档，当前公开版尚无此入口。

已按用户确认的规则形成[自适应三栏与独立窗口正式规划](plans/2026-11-09-adaptive-layout-and-independent-window.zh.md)：两种窗口均按实际宽度展开三栏，双窗口都可操作，同篇笔记只允许一处编辑并通过保存后交接。**当前仅规划落盘，实施尚待用户允许。** 后续分五步推进，每步完成后停下复盘，收到继续指示再进入下一步。

会话侧栏及笔记关联、宿主 AI 分析与输出延续此前[备忘](plans/2026-11-08-default-notebook.zh.md#后续备忘未进入详细规划)，具体接口和使用场景仍需验证。Markdown 导入已在 0.7.0 完成；直接附加到会话保留为待验证项，不因宿主内部存在附件方法就承诺已经可以集成。
