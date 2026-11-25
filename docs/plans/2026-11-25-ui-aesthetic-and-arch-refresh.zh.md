# 肥鱼笔记设计、UI 审美与前端/核心架构综合改进实施规划

- **日期**：2026-11-25
- **分支与目录**：`codex/ui-arch-refresh`（主目录 `D:\DSH-Workspace\dsh-github-notebook`）
- **状态**：已完成全部五批实施、隔离 DSH Web 与 Windows 桌面浅深双语实机验收、指定私有测试库在线读写同步实测及问题修复与全量回归，已合回 `main`（未发版）
- **基线版本**：`0.12.0`（`main` 提交 `eba78b2`）

## 一、目标、非目标与已拍板取舍

### 目标
1. **P0（显性视觉与双语 Bug 快修）**：
   - 修复 `.paper-summary` 双重左竖线与底部 17px 多余灰尾，阅读态改用语义化结构替代无控件关联的 `<label>`；
   - 修复主界面/独立窗口顶栏切页时明暗切换按钮跳到左侧的问题，统一右侧工具组容器；
   - 修复 [NoteOverview.tsx](../../src/client/paper/NoteOverview.tsx) 硬编码中文指南链接，按 `t.language` 切换中英文手册；
   - 修复 `style.ts` 中未定义变量 `--paper-muted`，为同步异常提供清晰语义警示色；
   - 清理 `layout-themes.ts` 中的死选择器 `.paper-feedback-link`。
2. **P1（UI 审美与空间效率跃迁）**：
   - **布局精简与平滑迁移（用户已拍板 A1）**：直接精简为 **3 套精品布局**（`soft` 柔和卡片三栏、`outline` 经典秩序分栏、`tree` 目录树双栏），彻底移除其余 5 套布局（`ribbon`、`dock`、`ink`、`island`、`archive`）的样式和特判代码；在 `domain/appearance.ts` 与 `host/appearance.ts` 对既有 `appearance.json` 与 `localStorage` 旧值做自动迁移映射（`island` → `soft`，其余 4 套 → `outline`），保证老用户零报错平滑升级；
   - **品牌色与深色系统升级（用户已拍板 A3）**：新增 `berry`（莓紫春芽）为首位推荐色板，默认配色仍沿用 `native`（DSH 原生）；概览页配色统一派生自当前色板（品牌鱼形保留莓紫春芽固定双色）；深色模式改用纯净中性炭黑分层（`#111215` / `#18191d` / `#141519` / `#121317` 代码底），消除单色 `color-mix` 导致的墨绿雾色偏；全入口主按钮与语义状态色统一；
   - **现代表单控件**：设置页告别 `<fieldset>/<legend>` 与纯文字 `<select>` 盲选，改用圆角分区卡片、三色圆点色板卡片与分段控件（Segmented Control）；主界面与侧栏列表工具栏将「全部/收藏/最近」改为轻巧分段控件；
   - **空间效率与自适应（用户已拍板 A2）**：
     - 正文无章节标题时自动收起 220px 空目录列（保留手动展开和快捷键），边缘悬浮 `》` 升级为贴边圆角药丸手柄；
     - 会话侧栏阅读态激进瘦身：压缩 5 层头部条带（~188px）至 2 层紧凑工作带（~82px），保留多标签切换、新增与关闭能力，净释放约 100px+ 正文阅读高度，同时修正侧栏列表图钉图标间距；
     - 会话转存宽窗弹窗取消固定 780px 高度，改为 `fit-content` 自适应内容高度并保留最大视口上限，统一主按钮为 `--accent`，补齐图片文件视觉标识/缩略提示。
3. **P2（效率提升与工程减债）**：
   - **全局快速切换 / 命令面板（`Ctrl+K` / `Cmd+K`）**：复用本机列表/最近访问/标签目录缓存与 120ms 防抖查询，支持键盘 `↑/↓/Enter/Esc` 模糊搜笔记、笔记本、标签与快捷动作（新建、切换明暗、同步、跳分类管理/设置），中英文双语完整覆盖；
   - **CSS `@layer` 单例样式架构**：引入单例 `<style data-fatfish-styles>` 注入机制与 `@layer base, layout, components, themes, overrides;`，消除主界面/侧栏重复渲染数百行 `<style>` 标签，清理 `notes-style.ts` 废弃 `.notes-shell`/`.notes-columns` 死样式并大幅消除 `!important`；
   - **核心巨型模块高内聚拆分**：将 `src/notes/repository.ts`（1,029 行）、`src/private-workspace/sync.ts`（676 行）、`src/client/notes-controller.ts`（605 行）、`src/client/ConversationNotes.tsx`（400 行）按职责拆分为清晰子模块，对外契约、存储格式与行为 100% 等价。

### 明确非目标
- 不更改笔记存储格式（notes manifest v3/v4）、Git 同步协议或 HTTP 路由安全栅栏；
- 不新增第三方 UI 组件库或运行时外部依赖；
- 不修改日常 DSH 资料，不自动发版或更新插件市场。

## 二、分批进度与工作记录

| 批次 | 范围 | 状态 | 验证与备注 |
| --- | --- | --- | --- |
| 批次 1（P0） | 5 处客观视觉与双语 Bug 修复 | 已完成 | 提交 `2d3e607`：修复 `.paper-summary` 双竖线与 17px 灰尾、阅读态语义标签、顶栏右侧工具容器 `.paper-top-actions`、概览指南中英文链接、`--paper-muted` 语义警示色与死选择器清理 |
| 批次 2（P1a） | 3 套布局迁移、莓紫春芽色板、深色炭黑重构、现代设置页与分段控件 | 已完成 | 提交 `c287696`：精简为 `soft`/`outline`/`tree` 并透明迁移旧配置；新增 `berry` 推荐色板（默认仍为 `native`）；炭黑深色层级与语义 Token 统一；概览跟随激活色板；圆角分区卡片、三色圆点色板卡、布局线框卡与列表分段控件 |
| 批次 3（P1b） | 空目录自动隐藏、会话侧栏 2 层瘦身、转存弹窗自适应高度 | 已完成 | 提交 `84e9bfb`：正文无标题自动收起空目录列+贴边药丸手柄、`正文/原始素材` 内联到命令条、侧栏阅读态 2 层紧凑头、宽窗转存弹窗 `fit-content` 高度与素材卡片优化 |
| 批次 4（P2a） | `Ctrl+K` 全局快速切换 + CSS `@layer` 单例注入重构 | 已完成 | 提交 `b513fe1`：新增 `QuickSwitcher.tsx` 与中英文词表、120ms 防抖远端搜索与快捷键触发；引入 `src/client/styles/inject.ts` 的 `@layer` 单例注入，清理重复 `<style>` 与旧 `.notes-shell`/`.notes-columns` 死样式 |
| 批次 5（P2b） | 4 个核心巨型模块拆分 + 构建产物同步 + 第三档全量回归验收 | 已完成 | 提交 `f4c45d0`：拆分 `conversation-style.ts`、`ConversationSidebarHeader.tsx`、`notes-controller-helpers.ts`、`private-workspace/config.ts`、`notes/repository-catalog.ts` 并同步 `lib/`；`typecheck`、`build`、439/439 全量回归与浏览器弹窗回归全部通过 |

## 三、影响面与兼容保护

- **外观持久化兼容**：`SharedAppearance.load()` 在读取旧版 `appearance.json` 遇到已退役布局值（`ribbon`/`dock`/`ink`/`island`/`archive`）时自动映射至目标 3 套布局（`island` → `soft`，其余 → `outline`）并透明通过校验，不抛 `appearance_invalid`；新增色板 `berry` 进入 `domain/appearance.ts` 合法集合。
- **双语词表**：同步更新 `locale/zh.json` 与 `locale/en.json`，覆盖新增色板名称、3 套布局描述、分段控件与 `Ctrl+K` 面板全部文案与无障碍属性。
- **性能目标**：100 篇隔离资料与 1,000 篇模拟元数据下，`Ctrl+K` 面板呼出与缓存过滤中位响应 `< 50ms`，不阻塞网络；CSS 单例注入消除跨入口重复解析。

## 四、验证计划与回滚

- **验证范围**：
  - 批次 1–3：运行 `npm run typecheck`、`npm run build`、相关单测、`npm run test:sidebar`、`node test/browser/check-dialog-sizes.mjs`；
  - 批次 4–5：升级为**第三档全量回归（`npm test`）** + 侧栏/弹窗浏览器回归 + 隔离桌面/Web 浅深双语实拍与 5 次样本性能测量；
- **回滚方式**：短期分支 `codex/ui-arch-refresh` 按批次原子提交，任一批次可独立 `git revert`，无不可逆数据迁移。

## 五、实测结果与交付记录

### 1. 第三档全量验证结果（Node v24.21.0 + Windows Chrome）
- `npm run typecheck`：通过（0 错误）
- `npm run build`：通过（`Built Fatfish Notes host and client`，`lib/` 产物已同步提交）
- `npm test`：**439 / 439 项全部通过（0 失败）**，其中重点覆盖：
  - [test/appearance-workspace.test.ts](../../test/appearance-workspace.test.ts)：3 套布局枚举、5 套旧布局映射、`berry` 色板校验与概览联动
  - [test/shared-appearance.test.ts](../../test/shared-appearance.test.ts)：旧版 `appearance.json` 已退役布局透明迁移与持久化兼容
  - [test/quick-switcher.test.ts](../../test/quick-switcher.test.ts)：`Ctrl+K` 1,200 项排序响应、中英文 SSR 渲染、`@layer` 单例样式引用计数挂载与清理
  - [test/localization.test.ts](../../test/localization.test.ts)：`src/client/` 全部组件无硬编码可见文案及中英文词表完整性静态检查
  - 其余仓库存储、同步配置、冲突处理、会话转存、导出与宿主 HTTP 安全栅栏全量回归
- 共享弹窗真实浏览器回归（`npx tsx test/browser/check-dialog-sizes.mjs`）：通过（`Dialog sizes pass with late appearance styles, nested dialogs, and at 104 × 120 CSS px.`），验证了自适应转存宽窗高度、延迟挂载外观样式、嵌套弹窗独立尺寸与极小窗口单列可用性。

### 2. 性能实测（`Ctrl+K` 本机缓存过滤）
- 资料规模与方法：1,201 条模拟缓存项（1,200 篇笔记元数据 + 命令项），覆盖空查询、中文双词、中英混查、标签、笔记本+编号、命令 6 组查询，连续 10 轮共 60 次样本：
  - 首次冷过滤（1 样本）：`0.245 ms`
  - 中位数：`0.384 ms`
  - P95：`0.962 ms`
  - 最大值：`2.851 ms`（远低于 `< 50 ms` 目标，且无阻塞网络请求）

### 3. 核心模块拆分与前端样式架构成果
- `src/notes/repository.ts` → 拆出 [repository-catalog.ts](../../src/notes/repository-catalog.ts)（93 行：批量整理请求解析、标签目录构建、笔记本计数）
- `src/private-workspace/sync.ts` → 拆出 [config.ts](../../src/private-workspace/config.ts)（163 行：本机目录校验、控制配置读写与迁移）
- `src/client/notes-controller.ts` → 拆出 [notes-controller-helpers.ts](../../src/client/notes-controller-helpers.ts)（138 行：状态切换辅助与纯函数）
- `src/client/ConversationNotes.tsx` → 拆出 [ConversationSidebarHeader.tsx](../../src/client/ConversationSidebarHeader.tsx)（73 行：两层紧凑阅读头）与 [conversation-style.ts](../../src/client/conversation-style.ts)（88 行）
- `src/client/styles/inject.ts`（67 行）：统一 `@layer base, layout, components, themes, overrides;` 引用计数单例注入，消除主界面/侧栏/设置页重复 `<style>` JSX 节点，并清理旧 `.notes-shell`/`.notes-columns` 死样式。

### 4. 隔离 DSH 双端实机验收、实机拦下缺陷与指定私库在线同步（2026-11-25 补齐）

使用 `npm pack` 生成统一测试包（`dist/ui-arch-refresh/dsh-fatfish-notes-0.12.0.tgz`，273 文件），通过官方 DSH CLI（`plugin --profile {web,desktop} add`）装入 `.dsh-home/pure-001/release12-{web,desktop}`，两端全部 **273 / 273 个安装文件逐字节 SHA-256 校验一致**（官方宿主版本 DSH `0.2.2-rc.5`）。

#### 实机拦下并当场修复的 5 项问题
1. **旧版 `appearance.json` 键顺序触发 `appearance_invalid`（严重升级兼容问题）**：此前调整 `defaultAppearance` 字段排布导致 `fontCjk`/`fontLatin` 位于 `reading` 之前，而服务端 `SharedAppearance.load()` 使用键序敏感的 `JSON.stringify` 比对，导致既有 0.12.0 真实用户的 `appearance.json` 报 400。已恢复原键序，并将 `SharedAppearance.load()` 改为键序无关的键值比对，补进 [test/shared-appearance.test.ts](../../test/shared-appearance.test.ts) 回归。
2. **列表每条笔记重复挂载 `<style>` 标签**：实机 DOM 巡检发现 [RowMenu.tsx](../../src/client/RowMenu.tsx) 在每行列表项内联 `<style>`，单页挂载 53 个 `<style>` 节点；已迁入 `@layer` 单例注入，页内内联 `<style>` 降至 2 个。
3. **侧栏「全部 / 收藏 / 最近访问」分段控件左对齐且等宽拉伸**：查看 `npm run test:sidebar` 实拍后，将 `.paper-segmented-sm` 改为 `inline-flex` 居中自适应并对齐右侧下拉框 `28 px` 高度。
4. **设置页三张布局卡片标题对齐不一致**：在 `.appearance-layouts button` 补齐 `align-items: stretch; justify-content: flex-start`，三张卡片在中英文下均统一左对齐。
5. **列表工具栏紧凑间距**：微调 `.paper-list-tools` 与 `.paper-segmented-sm button` 内边距，改善中文窄栏排版。

#### 隔离双端实机与在线同步实测结果
- **会话侧栏浏览器回归（`npm run test:sidebar`）**：通过（实拍目录 `output/playwright/search-sidebar/run-xqtoeD`），宽栏 `611 × 882`、窄栏 `343 × 822`、矮窗 `343 × 582` 范围切换、Esc 聚焦恢复与打开/返回列表均通过（`scopedResults: 31`）。
- **隔离 DSH Web（`release12-web`，11 张浅深双语实拍 `output/playwright/ui-arch-refresh/web/`）**：零页面错误（`errors: []`）；实测旧配置 `island → soft` 透明迁移通过、`@layer` 单例 13 份去重、`topbar` 切页主题按钮水平跳动 `0 px`、设置页 0 个 `<fieldset>` / 3 张布局卡 / 11 张三点色板卡 / 分段控件、英文设置零中文残留、概览中英文分别指向 `user-guide.zh.md` 与 `user-guide.en.md`、深色炭黑表面与代码底色 `#111216`、`Ctrl+K` 面板呼出 `50 ms`（24 项命中）、侧栏阅读态头部总高 `88 px`（`39 + 42`）、转存宽窗自适应高度 `1280 × 595`。
- **隔离 Windows 桌面（DSH `0.2.2-rc.5` Electron CDP，`release12-desktop`，11 张浅深双语实拍 `output/playwright/ui-arch-refresh/desktop/`）**：零页面错误（`errors: []`）；上述全项检查与双端实拍核对一致，顶栏切页跳动 `0 px`，`Ctrl+K` 呼出 `78 ms`，侧栏阅读态头部 `88 px`，转存弹窗 `1280 × 595`。
- **指定私有测试库在线读写与双向同步（`StarWind97/dsh-community-private-test`，`repositoryId: 1440762952`，`output/playwright/ui-arch-refresh/live-sync/`）**：在隔离 Web `1800 × 920` 视口完成端到端 UI 闭环——冷启动全量同步 `已同步`（`lastSuccessAt: 2026-11-25T06:57:13Z`）→ 真实界面新建含 H2 标题与 TypeScript 代码块的笔记并保存 → 验证宽窗章节目录自动展开与深色代码底色 `rgb(17, 18, 22)`（实拍 `dark-code-and-outline.png`）→ 推送同步至指定私库 `已同步`（32s，`2026-11-25T06:57:51Z`）→ 移入回收站清理临时笔记并再次同步 `已同步`（34s，`2026-11-25T06:58:26Z`）。

### 5. 未覆盖边界、后续发版前提与体验/回退入口
- **未覆盖边界**：本次**未**执行对外发版（`npm publish` / GitHub Release）或插件市场更新，**未**触碰日常 DSH 资料，**未**替换仓库公开宣传截图与中英文 README 配图；独立窗口（Chrome/Edge 外部应用窗）及 macOS/双机并发同步沿用既有回归覆盖，未在本轮重拍。
- **对外发版前提**：如后续决定基于本轮改动发布新版，须在用户单独确认后按[图文核对清单](../demo-content.zh.md#用户文档与公开展示同步)更新中英文公开截图、执行双语发布检查并走正式发版与市场更新流程。
- **体验与回退入口**：当前隔离资料 `.dsh-home/pure-001/release12-desktop` 已安装最新构建，可直接通过 [Open-Fatfish-Notes.cmd](../../scripts/Open-Fatfish-Notes.cmd) 打开体验；全部提交均保留完整线性历史，可按需 `git revert`，无不可逆数据结构变更。

## 六、二轮原型逐项对齐整改（2026-11-25）

- **分支与目录**：`codex/ui-prototype-alignment`（主目录 `D:\DSH-Workspace\dsh-github-notebook`），已合回 `main`
- **状态**：已完成实现、第三档全量回归、双端官方重装与逐像素实拍核对（未发版）
- **核定 6 项改动清单（已全部落地）**：
  1. **快捷键改为 `Alt+K`**：彻底避开 DSH 宿主左侧会话搜索（`Ctrl+K`）与编辑态插入链接（`Ctrl+K`），更新顶栏徽标与双语快捷键说明（macOS 展示为 `⌥K`）；
  2. **代码块独立顶栏 + 清晰「✓ 已复制」**：新增 `paper-code-head` 顶栏；常态保留纯图标 + 悬停提示，点击后使用高对比度 `--success-soft`/`--success` 语义胶囊显示「✓ 已复制」（浅色 `rgb(29, 131, 72)`、深色 `rgb(93, 214, 141)`，`opacity: 1`）；
  3. **6 套高差异色板 + 原型卡片 + 统一分段控件**：精简为 `berry`（莓紫春芽 / Berry sprout）、`native`（DSH 原生 / DSH default，默认）、`pine`（松青 / Pine green）、`amber`（暖琥珀 / Warm amber）、`rose`（莓红 / Warm rose）、`graphite`（石墨 / Graphite）6 套（3 列 × 2 行左对齐双行卡片，3 色圆点补细描边），旧版已移除色板（`clearblue`/`lilac`/`mint`/`blue`/`inkwhite`）在读写两端均透明重置为 `native`；设置页与列表页分段控件统一为「灰槽 + 白滑块」风格；
  4. **列表主色 `+ 新建`、单行工具栏与主次层次**：列表头部改为主色胶囊 `+ 新建`，第三分段文案精简为「最近 / Recent」消除「多选」孤立换行，正文「编辑」按钮加柔和主色底，顶栏「已同步」加柔和绿底小胶囊；英文 1440px 窗口同步收紧反馈按钮短文案断点（`< 1200px`），消除顶栏右缘裁切；
  5. **会话侧栏零跳动统一顶栏**：列表态与阅读态共享顶部同一条固定高度/宽度的 `.conversation-top-bar`（`NoteTabBar` + 右侧固定三图标），`返回列表` 内嵌至 `.paper-doc-head`，从「笔记列表」切到任意笔记标签实现 `0 px` 垂直位移与 `0 px` 宽度变化；
  6. **转存弹窗真实图片缩略图 + 底部「取消」按钮**：新增插件服务端只读接口 `GET /notes/capture-preview`（加入 `routePaths` 与 `READ_ONLY`，自动受 `connection.requestRejection` + `fence()` loopback/Host/Origin/`sec-fetch-site` + `no-store`/`nosniff`/`CSP: default-src 'none'` 保护，底层复用 DSH 官方公开 `@deepseek-ai/dsh-attachment` `AttachmentStore` 与 `validateAsset`），为可用图片展示 `48 × 36` 圆角缩略图，缺失/不可用图平稳降级为虚线占位图标；弹窗右下角补齐 `取消`（退出转存）+ `保存到笔记`，标题栏增紧凑统计胶囊。

### 二轮实测与逐像素实拍核对结果（2026-11-25）

- **类型检查、构建、弹窗尺寸与第三档全量回归**：`npm run typecheck`、`npm run build`、`npx tsx test/browser/check-dialog-sizes.mjs`（含 `104 × 120 CSS px`）与 `npm test` **440 / 440 全部通过**（新增旧色板 `lilac → native` 迁移与 `capture-preview` 单测，英文双语微调后补跑 `localization` / `quick-switcher` / `appearance-workspace` 27/27 通过）。
- **会话侧栏浏览器回归（`npm run test:sidebar`）**：通过（实拍 `output/playwright/search-sidebar/run-FlVp1S`），宽 `611 × 882`、窄 `343 × 822`、矮 `343 × 582` 全绿（`scopedResults: 31`）。
- **官方打包与双隔离宿主实装（DSH `0.2.2-rc.5`）**：统一打包 `dist/ui-align-r2/dsh-fatfish-notes-align-*.tgz`（273 文件），通过官方 CLI 重装入 `.dsh-home/pure-001/release12-{web,desktop}` 并逐文件 SHA-256 核对一致。
- **Web + Windows 桌面实机全项断言与实拍复查（各 13 张浅深双语截图 `output/playwright/ui-arch-refresh/{web,desktop}/`）**：
  - 零页面错误（`errors: []`）；注入旧配置 `layout: "island", palette: "lilac"` 启动透明迁移为 `soft` + `native`；
  - 设置页 6 张双行左对齐色板卡 + 3 张布局卡 + 统一分段控件，中英文均无裁切或中文泄漏（`enSettingsHanLeak: []`）；
  - 列表页 `+ 新建` 主色胶囊 + `[全部 / 收藏 / 最近]` 排序与「多选」单行对齐（`toolsSingleRow: true`）；
  - 代码块独立顶栏 `.paper-code-head` 常态纯图标、点击后浅/深色 `✓ 已复制` 清晰高亮（`opacity: 1`）；
  - 按 `Alt+K` 呼出面板（Web `53 ms` / 桌面 `63 ms`），聚焦在面板输入框内且 DSH 左侧「搜索会话名称」保持关闭未触发（`focused: false`, `opacity: "0"`）；
  - 会话侧栏多标签切换实测 `deltaTop: 0 px`、`deltaWidth: 0 px`、`tabCount` 不变、阅读态顶区总高 `88 px`；
  - 转存弹窗切至「整个会话」实测 `地出.jpg` 缩略图加载成功（`complete: true`, `1280 × 730`），`缺失.jpg` 平稳降级为虚线占位徽标，底部 `取消` + `保存到笔记` 完整可见且点击「取消」干净退出转存。
- **未覆盖边界与发版前提**：本次仍**未**执行对外发版、插件市场更新或公开 README 配图替换，**未**触碰日常 DSH 资料。隔离体验入口仍为 [Open-Fatfish-Notes.cmd](../../scripts/Open-Fatfish-Notes.cmd)。

---

## 七、三轮原型收尾与交互精修（2026-11-25）

- **分支与目录**：`antigravity/ui-round3-polish`（主目录 `D:\DSH-Workspace\dsh-github-notebook`），已合回 `main`
- **状态**：已完成全部 12 项实施、第三档全量回归、双端官方重装、原子 DOM/CSS 断言与逐图人工复查（未发版）
- **核定实施范围与原子断言矩阵（12/12 全部通过）**：
  - **A0 列表状态行去掉冗余笔记本名**：主列表已展示当前笔记本标题时，`.paper-search-status` 仅显示篇数（如 `31 篇笔记`）与「改搜全部笔记」，不再重复拼接 `· 当前笔记本名`；
  - **A1 正文表格柔和圆角外框**：`NoteMarkdown` 表格外层提供 `.paper-table-wrap`（`border-radius: 10px; border: 1px solid var(--rule); overflow: auto`），内部 `table` 使用 `border-collapse: separate; border-spacing: 0`、表头浅底（`var(--shelf)`）、柔和横竖分隔线（`border-bottom` + 略淡 `border-inline-end`，末行末列不重叠外框），兼容宽表横向滚动及长图/PDF 导出；
  - **A2 恢复列表选中行左侧 3px 主题竖条**：移除 `appearance-style.ts` 对 `.paper-row[aria-current=true]` `box-shadow` 的意外覆盖，保留 `inset 3px 0 0 var(--accent)` 竖条；
  - **A3 统一顶栏「标准宽度 / 全宽」分段控件**：`.paper-width` 改为与设置页、列表页完全一致的「灰槽 + 白滑块 + 微阴影」；
  - **A4 正文标签改为圆角胶囊 + 细描边**：`.paper-tags button` 改为 `border-radius: 999px`、细描边，激活筛选态带主题色底与描边；
  - **A5 转存弹窗 AI 建议胶囊 + 勾选轮次高亮 + 范围分段统一**：AI 建议按钮改为主题浅底胶囊、已勾选轮次行带 `data-checked=true` 柔和强调底与边框、`.capture-scope` 统一使用主题语义 Token；
  - **A7 设置页「外观设置已同步」状态语义色**：同步完成态展示绿色状态点与 `--success` 语义色（`rgb(29, 131, 72)`）；
  - **A8 全量清理运行期 JSX 行内 `<style>` 与非分层注入**：除原本计划的 4 处外，实机 A8 断言进一步查出并迁移了 `NoteBackupStatus`、`WorkspaceNotice`、`CaptureAppearance`、`CaptureNotebook`、`NoteMaterialChoices`、`NoteSelectionRow`、`TransferProgress`、`TransientNotice`、`use-note-reference`、`WorkspaceBookDialog`、`DocumentTools`、`PaperWriting` 共 12 处局部行内 `<style>`，以及 `src/client/index.tsx` 中最后 1 处无 `@layer` 直接挂载的 `captureCss`（改用 `acquireStyleSheet('capture-base', captureCss, 'components')`）；主界面与弹窗 DOM 内行内 `<style>` 全部降至 `0`（仅离线 PNG 导出专用脱离容器 `note-reading-image.tsx` 按需保留）；
  - **B1 列表排序改为轻边框无箭头样式并同高对齐**：`SearchOrderPicker` 去除原生箭头（`appearance: none`）、固定 `height: 28px`，并消除 `@layer components` 中 `.paper-quick-view` 与 `.paper-batch` 残留的垂直外/内边距，实测 `[全部 / 收藏 / 最近]`、`[⇅ 排序]`、`[多选]` 三者高度均为 `28 px`、`top: 201 px`、`midY: 215 px`（`0 px` 对齐）；
  - **B2 顶栏「问题与建议」收回设置页「帮助」**：移除主工作台顶栏中的 `FeedbackLink`（`topFeedbackCount: 0`），保留「设置 → 帮助」（`helpFeedbackCount: 1`）与首次接入页的反馈入口；
  - **B3 首次接入页改为三步 Stepper**：`SettingsPage.tsx` 改造为「1. 同步工具 → 2. 账号与云端库 → 3. 位置与首次同步」三步向导，环境就绪时自动定位到未完成步骤，支持点回前序步骤修改，完整保留设备码登录、目录选择器及重置/恢复路径；
  - **B4（选定 B4-B）编辑态顶部元信息全折叠抽屉**：进入编辑态时标题下方仅显示一行紧凑属性摘要 + `[编辑属性 ▾]` 开关，点击原地展开笔记本、标签与摘要表单，最大限度消除点击编辑时的正文下跳。
- **明确不做**：A6（阅读与代码 3 项下拉保持 `<select>`）、B5（列表不显示底部 `#标签`）、B6（不引入全库代码格式化器）；不发版、不更新市场、不触碰日常 DSH 资料。

### 三轮实测过程中实机拦截并即时修复的 4 个隐蔽缺陷

1. **`SettingsPage.tsx` React Hook 顺序缺陷**：B3 新增的 `useEffect` 初版写在 `if (sync?.ready && children) return ...` 之后，已绑定账号切换就绪状态时触发 Hook 数量不一致；`npm run test:sidebar` 第一时间拦截，已将 `useEffect` 移至早返回前。
2. **12 处残留行内 `<style>`**：实机 A8 断言在 `.paper-app` 内查出 2 处未清理的行内 `<style>`，顺藤摸瓜清查全量 `src/client/**/*.tsx`，将其余 12 处运行期局部样式一并迁入 `useStyleSheet`。
3. **`index.tsx` 无 `@layer` 注入 `captureCss` 覆盖弹窗定位**：因 CSS Cascade Layers 规范中无层样式优先级高于任何 `@layer`，迁移后旧的 `document.head.append(sheet)` 覆盖了 `@layer components` 中的 `.capture-save-panel { position: static }`，把转存弹窗主体推到视口外；实机 Web 验收立即暴露，改用 `acquireStyleSheet('capture-base', captureCss, 'components')` 并提高 `.paper-dialog.capture-save .capture-save-panel` 优先级彻底根治。
4. **列表工具栏 `5 px` 垂直错位**：人工复查实机截图时发现 `[全部 / 收藏 / 最近]` 比右侧排序框低 `5 px`，定位为 `organization-style.ts` 的 `.paper-quick-view { margin: 10px 0 0 }` 与 `NoteAttachments.tsx` 的 `.paper-batch { padding: 8px 0 }` 在 `@layer components` 中覆盖了 `paperCss` 归零规则；修复后补充 `<= 1 px` 逐像素垂直居中断言并通过双端实测。

### 三轮最终验收结果（2026-11-25）

- **类型检查、构建、弹窗尺寸与第三档全量回归**：`npm run typecheck`、`npm run build`、`npx tsx test/browser/check-dialog-sizes.mjs`（含 `104 × 120 CSS px`）与 `npm test` **440 / 440 全部通过**。
- **会话侧栏浏览器回归（`npm run test:sidebar`）**：通过（宽 `611 × 882`、窄 `343 × 822`、矮 `343 × 582` 全绿，`scopedResults: 31`）。
- **官方打包与双隔离宿主实装（DSH `0.2.2-rc.5`）**：打包 `dist/ui-round3/dsh-fatfish-notes-r3-20261125-1934*.tgz`（273 文件），通过官方 CLI 重装入 `.dsh-home/pure-001/release12-{web,desktop}` 并逐文件核对 `lib/client.js`、`lib/standalone.js`、`locale/zh.json`、`locale/en.json` SHA-256 一致。
- **Web + Windows 桌面实机 12 项原子断言 + 各 16 张浅深双语实拍核对（`output/playwright/ui-arch-refresh/{web,desktop}/`）**：
  - 零页面错误（`errors: []`）；`inlineAppStyles: 0`、`inlineDialogStyles: 0`、`singletonCount: 17`（唯一 ID 17 个）；
  - A0 `statusText: "31 篇笔记"`（`statusRepeatsBook: false`）；A1 `tableRadius: "10px"`、`tdRightBorder: "0px"`、表头浅底与单元格清晰区分；A2 `currentRowShadow` 含 `rgb(145, 49, 142) 3px 0px 0px 0px inset`；A3 `.paper-width` 激活滑块与 `.paper-segmented` 一致；A4 `tagRadius: 999`、`tagBorderWidth: "1px"`；A5 转存弹窗 `aiBtnRadius: 999`、`checkedTurns: 4`、`地出.jpg` 真实缩略图（`1280 × 730`）+ `取消` 干净关闭；A7 `syncStatusState: "saved"`、`syncStatusColor: "rgb(29, 131, 72)"`；
  - B1 三控件同为 `height: 28`、`midY` 偏差 `0 px`、`orderSelectAppearance: "none"`；B2 `topFeedbackCount: 0`、`helpFeedbackCount: 1`；B3 三步 Stepper 完整渲染（`1. 同步工具` / `2. 账号与云端库` / `3. 位置与首次同步`）；B4-B 编辑态初始折叠（`expanded: "false", hasDrawer: false`），点击后原地展开笔记本/标签/摘要抽屉（`expanded: "true", hasDrawer: true`）；
  - 英文界面零中文泄漏（`enSettingsHanLeak: []`）、`Alt+K` 零冲突、会话侧栏 `0 px` 零跳动均保持全绿。
- **未覆盖边界与体验入口**：本次**未**执行发版、插件市场更新或公开 README 配图替换，**未**触碰日常 DSH 资料。最新隔离桌面体验入口：[Open-Fatfish-Notes.cmd](../../scripts/Open-Fatfish-Notes.cmd)。
