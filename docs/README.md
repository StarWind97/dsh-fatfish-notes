# 肥鱼笔记开发入口

产品为 **肥鱼笔记 / Fatfish Notes**，定位为私人笔记管理。[0.8.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.8.0) 已按用户确认正式发布，包含独立窗口、自适应三栏、查找整理、历史恢复、模板与性能优化，沿用 [DSH 0.2.2 适配](plans/2026-11-06-dsh-022-compatibility.zh.md)。未发布 npm；公开安装、市场更新状态和校验值见[发布记录](releases/0.8.0/review.zh.md)。

代码仓库、包标识统一为 `dsh-fatfish-notes`；控制目录及新建私人库建议名为 `fatfish-notes`。本地工作目录 `D:\DSH-Workspace\dsh-github-notebook` 保留，现有私人库也不强制改名。运行代码不保留旧品牌兼容分支。

[产品设计](notes-design.zh.md)记录当前行为，[使用说明](user-guide.zh.md)面向日常操作，[验证记录](verification-log.zh.md)区分实际覆盖范围。日常在 `main` 开发，按[协作约定](../AGENTS.md)先讨论、批准后实施。

## 当前版本

2026-11-10 用户确认正式发布 0.8.0，并更新原插件市场条目；[准备规划](plans/2026-11-10-release-080.zh.md)已完成。GitHub Release 已公开，市场提交和维护者合并分别记录，不将发布等同于市场已更新。

上版 **0.7.0** 汇总了下述原 0.6.1 开发功能，0.6.1 未单独发布，其发布与市场合并记录[保留](releases/0.7.0/review.zh.md)。

`0.6.0` 以 DSH 0.2.2-rc.1 为基线，适配新版会话图片读取；包含更名、阅读与编辑章节目录、宽窄布局与章节高亮、独立滚动、首次初始化系统目录选择及取消/恢复默认。首次设置只使用同名新目录或空目录，已有云端库下载为新的本地副本。自动保存、五分钟双向同步、会话选材转存与文件导出继续保留。

0.6.0 已通过公开下载和实际安装核验。[市场条目](marketplace/StarWind97__dsh-fatfish-notes.yml)将原来的 DSH Notebook 条目更名为肥鱼笔记，并更新到正式发布包；GitHub 发布与市场维护者合并分别确认，不将提交 PR 当作已经上架。

2026-11-08 已核对更名 PR 合并及公开目录中的新条目。当时诊断的 GitHub Release 安装关联和宿主声明读取失败分别反馈为 [#1147](https://github.com/dsh-market/dsh-market/issues/1147)、[#1148](https://github.com/dsh-market/dsh-market/issues/1148)，市场侧修复进度以对方仓库为准。按[修正规划](plans/2026-11-08-market-metadata-and-peers.zh.md)删除未使用的 Schemastery 直接依赖要求，现随 0.7.0 发布；[0.6.1](releases/0.6.1/review.zh.md)仅保留历史开发记录。

旧名称下的 `0.5.0`、`0.5.1` 已正式发布，历史包、发布说明和截图保留原样。历史结果见 [0.5.0](releases/0.5.0/review.zh.md)、[0.5.1](releases/0.5.1/review.zh.md)及验证记录；这些文件中的名称描述的是当时版本，不是当前安装入口。

## 开发与验证

2026-11-09 已实现[笔记迁入迁出、普通附件与回收站完善](plans/2026-11-09-portability-and-attachments.zh.md)：视频等下载型附件、体积限制、多选与彻底删除、文章互链、整库/单本导出及 Markdown 文件/文件夹/ZIP 导入。图册见 `output/playwright/portability/index.html`，使用方法见[操作指引](user-guide.zh.md)。已用本机 Obsidian 1.10.6 的独立测试资料完成实际窗口验收：正文、属性、图片与笔记互链通过，附件路径和字节保持；另行下载的 1.15.0 启动失败，尚未覆盖该版本。不与其他软件共同编辑内部资料目录。

当前版本已完成[默认笔记本与移除规则](plans/2026-11-08-default-notebook.zh.md)：默认归属、默认本设置同步及移除时保留/移入回收站。该功能批次通过类型检查、构建和 227 项全量回归，已在隔离 DSH 完成实际安装、操作、指定私库同步和重启读回。2026-11-09 又完成[笔记本独立选项卡](plans/2026-11-09-notebooks-tab.zh.md)，按第二档通过类型检查、构建、46 项相关客户端测试和隔离 DSH 交互验收。迁入迁出批次及 0.7.0 发布前检查各通过 238 项全量回归。上述功能统一随 0.7.0 发布。

`src/` 为 TypeScript 源码，`lib/` 由构建生成。命令以 [package.json](../package.json)为准；依照[三档验证范围](../AGENTS.md#验证范围)选择检查。涉及存储身份或发布候选包时，执行类型检查、构建、全量回归和实际安装验收。

已验证宿主组合为 Windows / Node 24.21.0 / DSH 0.2.2-rc.1。macOS、两台物理设备仍待实测。体验入口不自动更新宿主；DSH 侧栏的「新版本」是宿主更新提示，与插件包版本分别核对。

性能检查随影响范围进入规划、开发和验收，遵循[性能约定](../AGENTS.md#性能贯穿规划开发与验收)。2026-11-10 已完成[读取与切换优化](plans/2026-11-10-performance.zh.md)，作为 A—D 集中验收前的修正；[实际耗时与体验入口](plans/2026-11-10-performance-results.zh.md)记录同一资料的前后对比。该优化已随 0.8.0 正式发布。

## 本机隔离体验

真实验收仅使用 `.dsh-home/pure-001/` 和指定私库 `StarWind97/dsh-community-private-test`。不改日常 DSH 资料。

通过 [Open-Fatfish-Notes.cmd](../scripts/Open-Fatfish-Notes.cmd) 打开 `release12-desktop` 隔离体验资料。此入口现安装 E 阶段开发候选包，供集中验收，正式版仍为 0.8.0；新功能、实际验证和体验步骤见 [E 阶段交付](plans/2026-11-11-stage-e-results.zh.md)。功能说明与图册见 [B—D 交付](plans/2026-11-10-bcd-results.zh.md)和 `output/playwright/bcd/index.html`。历史验证图册保留在 `output/playwright/`，证据及备份位于 `.dsh-home/pure-001/`，均由 Git 忽略。Windows 已验证；不将同机副本称为两台物理设备验收。

本轮选项卡截图见 `output/playwright/notebooks-tab/index.html`，记录和包核对见 `.dsh-home/pure-001/notebooks-tab-*`。历史图册保留于 `output/playwright/release051/`、`outline-arrow/` 和 `setup-picker/` 等目录，不作为新版截图。普通桌面启动的 GitHub 账号需在实际宿主核对，不能仅凭 Codex 环境的登录状态判断。

## 后续备忘

由[主规划](plans/2026-11-09-product-iteration-roadmap.zh.md)统一维护顺序和阶段状态：**A—D 与性能优化已随 0.8.0 发布 → E 会话复用 → 候选清单回顾与取舍 → 按确认补齐选中项目或接续 F AI 输出**。原 E 已提前并编号为 D，原 D 顺延为 E；普通功能集中发布，保存和同步的实际问题优先处理。

**用户已体验认可 A—D 及性能优化，并确认正式发布 0.8.0。** [B—D 方案](plans/2026-11-10-bcd-implementation.zh.md)、[交付](plans/2026-11-10-bcd-results.zh.md)和[阶段 A 交付](plans/2026-11-10-stage-a-results.zh.md)保留功能与验证证据，原型和内部包记录作为历史材料。

由 Agent 跟踪进度、安排实现与验证、提供效果和体验指引；用户参与验收、必要取舍及正式发布确认，无需维护节点。用户已授权连续实施 B、C、D，完成后集中体验；已批准范围不重复求授权。本轮正式发布已获确认，市场进度以发布记录为准。2026-11-10 已按授权完成 [E0 可行性验证](plans/2026-11-10-e0-conversation-validation.zh.md)：侧栏和关联具备实施条件，直接附加暂受公共接口限制。[E1—E3 具体方案](plans/2026-11-10-stage-e-implementation.zh.md)已获本轮授权，现已接入会话侧栏、关联、文件选择、后台导入和材料引用，已完成隔离验收，待用户集中体验；F AI 输出未启动。

常用功能统一维护于主规划的[候选清单](plans/2026-11-09-product-iteration-roadmap.zh.md#候选清单)，允许根据反馈和验证结果增删改。2026-11-10 用户确认：E 完成实施与验收后，Agent 在阶段交付中主动发起回顾，按必要性、可行性提出补齐、保留或移除建议，由用户决定选取范围和顺序。候选项不自动获得实施授权，也不要求全部完成后才能进入 F。

用户另行要求保留[直接附加到输入框附件栏的复查备忘](plans/2026-11-09-product-iteration-roadmap.zh.md#宿主接口开放后补齐直接附加)：DSH 新版兼容性检查、E 后回顾和 F 详细规划时主动核查公共接口；条件具备时提醒用户并建议补验、规划补齐，不要求用户再次提醒。

[独立窗口小范围验证](plans/2026-11-09-independent-window-validation.zh.md)是 A1 之前的证据：Chrome 应用窗口与隔离 DSH 共用同一笔记服务，保存、同地址关闭重开及会话图文转存可行；补充本机刷新后新笔记可自动出现。前期原型结果见 A1 记录；正式编辑保护、主题跟随与独立入口已随 0.8.0 发布。

会话侧栏及笔记关联已从此前[备忘](plans/2026-11-08-default-notebook.zh.md#后续备忘未进入详细规划)进入已批准的 E 专项实施与集中验收；AI 分析与输出仍属 F。Markdown 导入已在 0.7.0 完成；原生直接附加尚不具备完整公共接入条件，继续延期，不新增下载后手工附加入口。[材料引用补验](plans/2026-11-10-e0-material-reference-validation.zh.md)已验证宿主保存副本、输入框插入说明、模型读图文和重启恢复；“引用到当前会话”已在 E 开发版接入，本项不额外解决会话材料跨设备同步。

[普通附件与交付文件补验](plans/2026-11-10-e0-conversation-files-validation.zh.md)也已通过，包含两轮 8 项材料、33 MiB 分块读取及重启完整性。用户确认工作区对应笔记本为可改选的默认，不设置会话专用本；普通笔记归属仍可修改。上述规则、侧栏编辑、文件选择及引用已统一写入 [E 整合方案](plans/2026-11-10-stage-e-implementation.zh.md)，已按用户授权完成实现并进行集中验收。

本轮按授权完成[图片/附件限制参考与常见规模小测](plans/2026-11-10-e-import-size-reference.zh.md)，以单个大小、合计大小及数量为重点。后续容量建议已获接受；固定单次 200 MiB 封顶按用户意见撤回。E 方案明确采用 Web Worker 执行导入重计算，异步分块处理文件，提供进度及有效取消；收起面板可继续任务，关闭运行窗口保留已完成结果。E2 内部依次完成线程/传输基础、容量与存储联动、会话材料流转，最后 E3 集中验收。单文件、图片预览、数量及整库规则统一见专项；E 开发版已经采用新规则并安装到隔离资料；公开安装包仍为 0.8.0，正式发布另行确认。
