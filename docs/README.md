# 肥鱼笔记开发入口

## 当前状态

- 2026-11-28 **0.13.1 已正式发布并设为 GitHub Latest。** 发布提交 `518f7ffb4485a84728a4f297cdf76202179e984e`，标签 `v0.13.1`。两个公开入口均已匿名校验为同一枚冻结包。新版提供独立代码显示卡片、窄窗字重折行和空列表操作调整。市场安装链接已取得本版，两语详情仍显示上一版图文。[GitHub 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.13.1) · [验收与发布记录](releases/0.13.1/review.zh.md#发布与市场) · [市场详情](https://awesome-dsh-plugin.com/zh/p/StarWind97/dsh-fatfish-notes/)

- 2026-11-26 **0.13.0 已正式发布。** 0.13.1 发布前已补验市场中英文正文、图解和各四张 0.13.0 配图。更早的工作台、三布局六配色、`Alt+K` 与手册 v6 验收见对应记录。[GitHub 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.13.0) · [发布与市场记录](releases/0.13.0/review.zh.md#发布与市场)

- 2026-11-25 **已完成[UI 审美与前端/核心架构综合改进](plans/2026-11-25-ui-aesthetic-and-arch-refresh.zh.md)（首轮 P0+P1+P2、[二轮原型逐项对齐](plans/2026-11-25-ui-aesthetic-and-arch-refresh.zh.md#六二轮原型逐项对齐整改2026-11-25)与[三轮原型收尾与交互精修](plans/2026-11-25-ui-aesthetic-and-arch-refresh.zh.md#七三轮原型收尾与交互精修2026-11-25)）及隔离 DSH 双端实机验收，已合回 `main` 待体验（未发版）。** 三轮累计完成三套布局精简、6 套高区分度双行色板与炭黑深色分层、现代设置页与分段控件（含绿点已同步状态）、圆角外框 Markdown 表格、选中行 `3 px` 左竖条、胶囊标签、`Alt+K` 全局快速切换、代码块独立顶栏与高对比度 `✓ 已复制` 胶囊、主色 `+ 新建` 与 `28 px` 零像素对齐列表工具栏（去除重复笔记本后缀、轻边框无箭头排序选择器）、编辑态属性单行摘要 + 按需展开抽屉（`B4-B`）、首次接入/重置三步 Stepper 向导、反馈入口收回帮助页、会话侧栏 `0 px` 零跳动切换、转存弹窗 `GET /notes/capture-preview` 真实缩略图 + 底部「取消」+ 选中轮次高亮、以及全量 `useStyleSheet` `@layer` 单例注入（主应用与弹窗内 `0` 行内 `<style>`）。440/440 全量回归、弹窗尺寸检查、`npm run test:sidebar`、官方 DSH `0.2.2-rc.5` 隔离 Web 与 Windows 桌面双端实装（每端 16 张浅深双语实拍 + 全部原子 DOM/CSS 断言）及指定私库同步闭环均已通过。[实施与验收记录](plans/2026-11-25-ui-aesthetic-and-arch-refresh.zh.md) · [隔离体验](../scripts/Open-Fatfish-Notes.cmd)

- 2026-11-23 **0.12.0 已正式发布，市场双语详情已验收。** 市场中文和英文页都已显示新版正文、配图及图解入口。两页共用的公开安装包与通过隔离桌面和 Web 验收的候选摘要一致。[GitHub 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.12.0) · [发布与市场验证](releases/0.12.0/review.zh.md#发布与市场) · [市场详情](https://awesome-dsh-plugin.com/p/StarWind97/dsh-fatfish-notes/)

- 2026-11-22 正式发布 [0.11.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.11.0)。公开安装包与已通过 428 项全量及双端验收的候选逐字节一致。[发布与市场验证](releases/0.11.0/review.zh.md#发布与市场)

- 2026-11-21 [会话转存布局与纯文字 AI 建议](plans/2026-11-21-capture-layout-and-text-suggestions.zh.md)完成隔离桌面和 Web 验证。宽窗并排三栏，窄窗默认紧凑，手动展开后从上到下排成一列。极小窗口也保留收起和关闭按钮。已有会话标题预填。桌面多图会话的真实模型建议和按所选范围归档读回通过。

- 2026-11-20 正式发布 [0.10.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.10.0)。425 项全量回归及 Web 与 Windows 桌面的双向同步通过，正式包已在 rc.5 桌面和 Web 实装。[发布与验收](releases/0.10.0/review.zh.md) · [实施规划](plans/2026-11-20-release-0100.zh.md) · [公开说明补齐](plans/2026-11-20-public-doc-refresh.zh.md)。配套交付：[统一搜索与侧栏宽窄布局](plans/2026-11-20-unified-search-ui.zh.md)、[常用标签随空间排布](plans/2026-11-20-adaptive-search-tags.zh.md)、[分类管理三栏与标签核对](plans/2026-11-20-classification-layout.zh.md)、[会话侧栏笔记列表标签](plans/2026-11-19-conversation-list-tab.zh.md)、[从笔记主界面切换 DSH 明暗](plans/2026-11-16-theme-follow-and-actions.zh.md#dsh-全局明暗快捷切换)。

- [图解使用说明](user-guide.zh.md)包含会话保存、侧栏引用、查找筛选与标签核对；[详细操作参考](user-guide-reference.zh.md)按需查阅。后续发版按[回归安排](../AGENTS.md#验证范围)和[宿主更新约定](../AGENTS.md#宿主更新检查兼容优化与新机会)执行；新宿主可用后按[实测结果](../AGENTS.md#兼容声明)确定兼容范围。
- 后续功能及优先级见[主规划](plans/2026-11-09-product-iteration-roadmap.zh.md#候选清单)，F 待用户选择范围并批准。`0.9.3` 及更早版本交付、品牌多轮评审与阶段快照已归档至[历史交付与评审归档](history.zh.md)。

### 进行中的任务

| 任务 | 负责智能体 | 分支、目录与涉及范围 | 进度与下一步 |
| --- | --- | --- | --- |
| [0.13.1 插件市场详情页补验](releases/0.13.1/review.zh.md#发布与市场) | Codex | `main`，市场公开页面 | 固定安装入口已取得 0.13.1。最新构建失败，两语页面仍展示 0.13.0 图文，待市场成功重建后核对正文和新版配图。 |

按[多智能体与多会话协作约定](../AGENTS.md#多智能体与多会话协作)维护本表。根据工作区差异、`git worktree list` 和专项记录核对实际进度。

## 接手与按任务查找

按[协作约定](../AGENTS.md)从当前工作区接手，结合[当前状态](#当前状态)和现场差异，再按任务读取下列材料。有日期的交接、规划和验证是当时快照，当前行为还需与对应源码核对。

| 当前任务 | 先查哪里 |
| --- | --- |
| 理解产品范围、当前行为、数据与运行边界 | [产品设计](notes-design.zh.md)；日常操作见[使用说明](user-guide.zh.md) |
| 规划功能、界面或内部重构 | [功能与界面设计](#功能与界面设计)、[产品设计](notes-design.zh.md)和对应专项规划 |
| 判断现有任务是否影响新需求 | [进行中的任务](#进行中的任务)、当前工作区差异、`git worktree list` 及相关专项规划 |
| 查候选项、优先级和授权范围 | [主规划](plans/2026-11-09-product-iteration-roadmap.zh.md)及该任务的专项规划 |
| 查历史交付、早期版本或品牌选型经过 | [历史交付与评审归档](history.zh.md)、[0.9.1 开发交接](handoffs/2026-11-18-development.zh.md)及[前序开发交接](handoffs/2026-11-12-development.zh.md) |
| 修改 Logo、字形、品牌颜色、放置位置或尺寸 | [品牌规则](brand.zh.md) → [Logo 交接](handoffs/2026-11-16-brand-logo.zh.md)与[设计素材索引](brand/README.zh.md) |
| 修改界面、主题、设置、阅读或导出 | [产品设计](notes-design.zh.md)对应章节及本页链接的最近专项。组件见 `src/client/`，导出见 `src/notes/export/` |
| 排查保存、同步、仓库或宿主问题 | [产品设计](notes-design.zh.md)的存储与运行边界；实现见 `src/notes/`、`src/private-workspace/`、`src/git/`、`src/host/`，结合相关专项和[验证记录](verification-log.zh.md) |
| 选择检查、打开体验或准备发布 | [发版 SOP](release-sop.zh.md)、[验证约定](../AGENTS.md#验证范围)、[验证记录](verification-log.zh.md)、[图文核对清单](demo-content.zh.md#用户文档与公开展示同步)、[本机隔离体验](#本机隔离体验)及[当前状态](#当前状态)链接的当版发布记录。命令见 [package.json](../package.json) |
| 修改手册或体验示例 | [示例内容准则](demo-content.zh.md)、[使用说明](user-guide.zh.md)与 `assets/handbook/` |

关键决定和修改依据应进入对应专题，并从本入口或主规划链接；当前行为更新产品设计，实际覆盖范围更新交付／验证记录。这样接续依赖项目文件，不依赖某个聊天窗口。无需每次通读所有历史文档。

当前工作区中的未提交改动可以用 Git 查看，改动归属、取舍和验证进度查进行中条目及专项。`.dsh-home/`、`output/playwright/`、`dist/` 中的本机证据和安装包按需核对。发现文档与源码不一致时记录差异并修正受影响入口。

### 功能与界面设计

设计功能或界面时，先广泛调研同类产品的功能、界面和操作流程，了解其设计取舍，结合肥鱼笔记的使用场景提出方案。稍大的改动，例如新增主要操作流程、调整核心布局或改变关键交互，先提供多个有实质差异的原型。用并排图稿、操作流程示意或可交互预览展示各方案，让用户比较同一任务在不同方案里怎么完成，一起讨论和修改。纯内部重构则先讨论技术方案、取舍、影响范围和验证方式。

讨论后说明本次做什么、影响哪里、怎样验收，请用户明确批准实施范围。上述较大改动获批后，先把正式规划写入项目，并从开发入口或主规划链接，再开始试验和开发。详见[项目协作约定](../AGENTS.md#复杂修改必须以落盘规划持续推进)。

改版时根据影响核对原有关键操作和测试。经确认改变的交互，可随改版一并调整、合并或删除旧检查，按需补新的关键操作。验收可复用已有证据，结合本轮风险选择自动检查或代表尺寸的实拍对照。会话侧栏、查找和相关共用布局可按需运行[侧栏浏览器回归](../test/browser/README.md#会话侧栏查找)。

## 开发与验证

产品为 **肥鱼笔记 / Fatfish Notes**，定位为私人笔记管理。代码仓库、包标识统一为 `dsh-fatfish-notes`；控制目录及新建私人库建议名为 `fatfish-notes`。本机工作目录名与现有私人库均不强制改名，运行代码不保留旧品牌兼容分支。

`src/` 为 TypeScript 源码，`lib/` 由构建生成。命令见 [package.json](../package.json)。依照[验证范围](../AGENTS.md#验证范围)安排检查和发布验收；多智能体并行开发时的分支与 worktree 规则见[多智能体与多会话协作](../AGENTS.md#多智能体与多会话协作)。

**新版 DSH 兼容性检查固定项（2026-11-13 用户明确要求）**：每次检查新版兼容性，都要核对是否新增了普通插件可用的公开接口，可将笔记文件直接添加到会话输入框的原生附件栏。核对完整的「接收文件 → 创建有效草稿附件 → 加入指定会话输入框 → 可见、可移除 → 发送后可读取」链路，并记录宿主版本、公开接口依据、实测范围和缺口；单有上传、文本插入或 `addAttachments` 方法不算条件齐备。确认条件已经具备时，主动提示用户可以优化现有引用实现，先规划并获批准后再实施，不自动升级、改用内部接口或发布。复查备忘见[主规划](plans/2026-11-09-product-iteration-roadmap.zh.md#宿主接口开放后补齐直接附加)。

**兼容、优化与新机会评估（2026-11-16 用户补充）**：每次宿主更新还要做[兼容、优化与新机会评估](../AGENTS.md#宿主更新检查兼容优化与新机会)。既检查现有功能的利弊和优化空间，也主动发现旧规划之外的新实用功能/创意；按价值、接口成熟度、成本和风险提出建议，获批准后再开发。

性能检查随影响范围进入规划、开发和验收，遵循[性能约定](../AGENTS.md#性能贯穿规划开发与验收)。DSH 侧栏的「新版本」是宿主更新提示，与插件包版本分别核对；体验入口使用当次已验证的宿主。

## 本机隔离体验

真实验收仅使用项目主目录内 `.dsh-home/pure-001/` 的隔离 Web/Desktop 资料和指定私库 `StarWind97/dsh-community-private-test`，不修改日常 DSH 资料。该隔离资料与测试私库为多智能体共享的互斥资源，真实宿主验收按顺序串行使用。

- 桌面隔离体验入口：[Open-Fatfish-Notes.cmd](../scripts/Open-Fatfish-Notes.cmd)（打开 `release12-desktop` 隔离体验资料）。
- 侧栏查找浏览器回归：`npm run test:sidebar`，详见[浏览器回归说明](../test/browser/README.md#会话侧栏查找)（在独立 worktree 中支持自动回退定位主目录 `.dsh-home/pure-001`，也可通过 `FATFISH_QA_ROOT` 指定）。
- 每轮涉及界面/客户端/宿主可见行为的开发、重构或发版合回 `main` 并完成隔离实装验收后，由 Agent 关闭测试后台进程、主动执行 `scripts\Open-Fatfish-Notes.cmd` 自动打开隔离体验窗口，并在交付回复中同时给出体验脚本的可点击 `file://` 链接与绝对路径（如 `[Open-Fatfish-Notes.cmd](file:///d:/DSH-Workspace/dsh-github-notebook/scripts/Open-Fatfish-Notes.cmd)` 与 `D:\DSH-Workspace\dsh-github-notebook\scripts\Open-Fatfish-Notes.cmd`）；若 Agent 终端受限于隐藏沙箱桌面（如 Windows `WinSta0\exebox-*`）无法在用户桌面显示窗口，则不绕过沙箱、不滞留隐藏进程占用 `release12-shell\lockfile`，确认进程清理干净后如实说明原因并直接给出上述链接与路径；下一轮更新前主动核对隔离窗口、保存与传输状态，决定是否关闭并重开。纯文档讨论无需启动或重启。具体边界见[体验窗口交付约定](plans/2026-11-11-stage-e-follow-up.zh.md#体验窗口交付约定用户已确认)。
- 历史验证图册、证据和备份保留在 `output/playwright/` 与 `.dsh-home/pure-001/`，均由 Git 忽略。普通桌面启动的 GitHub 账号需在实际宿主核对，不能仅凭 Agent 终端或沙箱环境的登录状态判断。
- 早期 0.5–0.9 与 E 阶段的历史交付和体验快照已归档至[历史交付与评审归档](history.zh.md)。
