# 肥鱼笔记 0.13.0 候选验收记录

2026-11-26，`0.13.0` 候选完成阶段一整改（响应 Codex 独立审核 R1–R8），打出新的最终冻结候选并完成全量工程回归、四处隔离资料全集校验、最终摘要双端双语及独立窗口实机冒烟、真实 `0.12.0 → 0.13.0` 手册升级与 `v6` 实战练习。本轮停在阶段一，交由 Codex 独立复核并等待用户明确批准后再执行阶段二公开发布。[发版规划与整改记录](../../plans/2026-11-26-release-0130.zh.md) · [中英文版本说明](release-notes.md) · [发版 SOP](../../release-sop.zh.md)

---

## 一、候选包体与逐成员对照

- **当前最终冻结候选（r2）**：
  - 固定名安装包：`dist/release-0130-r2/dsh-fatfish-notes.tgz`（与同目录 `dsh-fatfish-notes-0.13.0.tgz` 逐字节一致，附校验文件 `dsh-fatfish-notes.tgz.sha256`）
  - 规格：**279 个文件**、**18,261,135 字节**
  - 完整 SHA-256：`2ea0b9571993cdb011c09630f94cee09965bd7a2bf77afd49dbc538199dc109d`
  - 与冻结工作区比对：**279 / 279 逐字节一致**（`workspaceDiffs: 0`）。
- **上一枚冻结候选（原样保留便于第二审查者比对）**：
  - 路径：`dist/release-0130/dsh-fatfish-notes.tgz`（`18,260,402` 字节，279 文件，SHA-256 `9a529f8ab2f2030fa48413f3fce4109f0aa3570d70c36291edbcebf2c1c7fc30`）。
  - **两包逐成员精确差异**（证据：`output/playwright/release-0130-r2/candidate-diff-and-install.json`）：新增 `0`、删除 `0`、修改 **`6` 个文件**：
    1. `lib/client.js`（`QuickSwitcher` R1 稳定 ID 焦点对齐/越界回收 + R2 方向键滚屏）
    2. `lib/standalone.js`（同上独立窗口打包产物）
    3. `assets/handbook/v6/01-welcome.md`（R3 改为 `项目交付清单.md`、R4 操作顺序/分段/帮助规则修正）
    4. `assets/handbook/en/v6/01-welcome.md`（R4 `Edit properties` → `Done editing`、分段与帮助规则修正）
    5. `README.md`（R5 校准 `01-image.png` 图注）
    6. `README.en.md`（R5 校准 `01-image.png` 图注）
  - 其余 **273 个成员**（含全部 Host 同步/存储实现、协议契约、`locale/{zh,en}.json`、历史手册 `v2–v5` 与 `en/v5`、`package.json` 及依赖）**零字节变化**。
- **四处隔离资料官方 CLI 串行安装校验（本包实测）**：
  - `.dsh-home/pure-001/release12-web`（`--profile web`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - `.dsh-home/pure-001/release12-desktop`（`--profile desktop`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - `.dsh-home/pure-001/bilingual-20261122/runtime/web`（`--profile web`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - `.dsh-home/pure-001/bilingual-20261122/runtime/desktop`（`--profile desktop`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - 安装日志与校验收据位于 `output/playwright/release-0130-r2/`。

---

## 二、宿主版本与兼容声明核对

- **宿主核对（2026-11-25 23:58，Codex 于 2026-11-26 独立复核一致）**：
  - npm 官方 `dist-tags`：`latest = 0.2.2-rc.5`、`next = 0.2.2-rc.5`、`alpha = 0.2.3-alpha.2`
  - 官方 GitHub Releases：最新预发行依次为 `0.2.3-alpha.2`、`0.2.3-alpha.1`、`0.2.2-rc.5`
  - Windows 更新源 `win-x64/nightly.yml`：`0.2.2-rc.5`（`stagingPercentage: 100`，`releaseDate: 2026-11-18T11:35:49.720Z`）
  - 本机实测 DSH CLI：`0.2.2-rc.5`
  - 原生输入框附件固定项：`0.2.3-alpha.2` 的公开 `IConversation` 仍缺少创建草稿附件方法，全链路未就绪。
- **兼容声明**：沿用 `engines.dsh: ">=0.2.2-rc.3 <0.2.3-0"`，不扩大兼容声明。[官方发行](https://github.com/deepseek-ai/deepseek-harness/releases) · [官方 npm 标签](https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags) · [Windows 更新源](https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml)

---

## 三、本包实测结果（最终候选 `2ea0b957...`）

### 1. 第三档工程回归与独立浏览器回归
- `npm run typecheck`：通过。
- `npm run build`：通过（构建产物与最终候选包内 279 文件逐字节一致）。
- **`npm test`**：**445 / 445 全部通过**（0 失败、0 跳过、0 取消，耗时 1,186.2 秒；完整日志见 `output/playwright/release-0130-r2/npm-test.log`），包含拆分后的独立待写队列非法 `layout` 与未知 `palette` 拒绝用例及校正范围说明后的样式注册字面量扫描用例。
- **三项独立浏览器回归**（全部通过，且先在 `c90d5b3` 旧实现上确认可稳定检出 R1 插入错位/同数量重排/24 项末项挤出焦点逃逸 `BODY` 与 R2 滚屏 `scrollTop=0`）：
  - `node test/browser/check-reading-tables.mjs`：通过（15 列宽表窄幅阻断、加宽完整导出、普通表正常导出）。
  - `node test/browser/check-switcher-sidebar.mjs`：通过（覆盖 R1 迟到正文插入、同数量重排、满 24 项 `Shift+Tab` 末项挤出焦点回收与 `Esc` 归还、R2 首尾方向键滚入可视区且输入框保焦、二次打开首帧同步聚焦与清空、关闭按钮 `Enter`、24 项上限、旧查询取消、60+ 标签目录及侧栏/浮层双序挂载）。
  - `node --import tsx test/browser/check-dialog-sizes.mjs`：通过（短内容 `196.375px`、长内容 `780px`、嵌套 `1280/680`、极小窗口 `92×108`，保存按钮可达）。
- **真实 DSH 侧栏回归**：串行运行 `npm run test:sidebar`（`release12-web`，已装最终包 `2ea0b957...`）通过，实拍位于 `output/playwright/search-sidebar/run-dPXqlx`（宽 `611×882`、窄 `343×822`、矮 `343×582`，`scopedResults: 31`）。

### 2. 最终摘要四组合实机冒烟（DSH 0.2.2-rc.5，含独立窗口）
使用已安装最终候选 `2ea0b957...` 的 `bilingual-20261122/runtime/{web,desktop}` 串行执行，结束后自动恢复接手前的中文与浅色状态（证据：`output/playwright/release-0130-r2/smoke-web.json`、`smoke-desktop.json`）：

| 宿主 × 语种 | 启动打开已有笔记 | 主界面 `Alt+K` 键盘选开 / 重开清空聚焦 / `Esc` | 独立窗口 `Alt+K` 同路径 | 帮助入口可见 | 实际打开手册章节 | 空结果提示语种 | 页面异常计数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Web × 简体中文 | `窗边工作台的图像记录` | 通过 | 通过 | 通过 | `opened-existing` · `01 开始使用` | `没有找到匹配的笔记或命令` | `pageErrors=0` / `standalone=0` |
| Web × English | `An image journal for the window desk` | 通过 | 通过 | 通过 | `opened-existing` · `01 Getting started` | `No matching notes or commands` | `pageErrors=0` / `standalone=0` |
| Windows Desktop × 简体中文 | `窗边工作台的图像记录` | 通过 | 通过 | 通过 | `opened-existing` · `01 开始使用` | `没有找到匹配的笔记或命令` | `pageErrors=0` / `standalone=0` |
| Windows Desktop × English | `An image journal for the window desk` | 通过 | 通过 | 通过 | `opened-existing` · `01 Getting started` | `No matching notes or commands` | `pageErrors=0` / `standalone=0` |

注：`pageErrors=0` 仅说明未发生未捕获页面异常，各项功能与语种结果均已独立核对并分项记证。

### 3. 真实 `0.12.0 → 0.13.0` 升级与随包手册 `v6` 实战练习
使用留存的真实公开 `0.12.0` 安装包（`dist/i18n-0120/publication/tagged.tgz`，SHA-256 `6a377ac04e4bd66ce148bf1bed11841abd2db2fb1831fc4cf12bfb62fef35ee9`）与解包的最终 `0.13.0` 候选（`2ea0b957...`）验证（证据：`output/playwright/release-0130-r2/handbook-upgrade-and-v6.json`）：
- **升级保留旧版手册**：真实 `0.12.0` 生成中/英文 `v5` 手册并编辑首页后，交由最终 `0.13.0` 执行打开及尝试添加，均完整保留原 `noteId`（`689PHVY37YT3TFVXXNRG9EDDV9` / `1KBDH74XEY9W2F9WC1GDAA4DGF`）、编辑后标题/正文与 2 条修订历史，活动笔记保持 3 篇，不覆盖、不重复生成。
- **`v6` 自动初始化与手动添加（4 组合）**：`zh-auto`、`zh-manual`、`en-auto`、`en-manual` 均生成 3 章、6 处有效章节内链、封面图（2,070,036 字节）与 2 份可读且字节一致的附件。
- **附件搜索实战练习（R3）**：对新生成的 `v6` 手册执行真实检索，搜索 `项目交付清单.md` 返回 `02 资料与交付`（`hit.field: "file"`，附件名命中）与 `01 开始使用`（`body`）；搜索 `Project handoff checklist.md` 返回 `02 Materials and exports`（`hit.field: "file"`）与 `01 Getting started`（`body`）。首页操作顺序（先编辑态「编辑属性」/ **Edit properties**，再「完成编辑」/ **Done editing**）、「全部 / 收藏 / 最近」本机含义与帮助页打开/添加规则均已核验一致。

### 4. 双语文档逐份核对与双尺度实拍目视核查
- **六份面向用户文档逐份核对结果**：
  - `README.md`、`README.en.md`：本轮更新 `01-image.png` 图注以准确描述画面可见控件（去除画面未拍入的 `Alt+K` 顶栏与英文单行声明）；其余章节核对与 `0.13.0` 一致。
  - `docs/user-guide.zh.md`：本轮更新写作顺序补齐「完成编辑」、补充「最近」本机含义，并同步更新 `workspace-map.png` 与 `tag-management.png` 的示例文件名/合并标签及图注。
  - `docs/user-guide.en.md`：本轮修正 `Done` → `Done editing`、补充 `Recent` 本机含义、校准 `01-image.png` 与 `en/tags.png`（明确为标签目录视图）图注。
  - `docs/user-guide-reference.zh.md`：本轮修正第 11 行“实际发布与市场状态”不再指向 `0.9.0`，改为区分当前 `0.13.0` 开发入口/验收记录与 `0.9.0` 品牌接入历史记录；其余章节核对沿用。
  - `docs/user-guide-reference.en.md`：逐章核对三布局/六配色、快捷切换、编辑属性、保存选项与反馈入口，内容准确沿用。
  - 另同步更新 `docs/releases/0.13.0/release-notes.md`（英文补齐重置库三步向导）、`assets/screenshots/0.13.0/README.md`、`docs/release-sop.zh.md`、`docs/plans/2026-11-26-release-0130.zh.md` 与 `docs/README.md`。
- **链接与本地化测试**：`node --import tsx --test test/localization.test.ts` 6/6 通过（仅覆盖词表完整、无硬编码 UI 文案与 README/英文图解图片路径配对）；另通过独立链接与锚点脚本核对 14 份文档共 **282 处相对路径与页内锚点全部有效（0 失效）**。
- **实拍重拍与双尺度目视核查**：基于最终候选 `2ea0b957...` 重拍 `docs/images/user-guide/tag-management.png`（改为 `#图片复核 → #图像记录` 合并预览，0 冲突标题）、`docs/images/user-guide/conversation-entries.png`（精简为单条清晰关联记录，0 同名重复）与 `docs/images/user-guide/workspace-map.png`（展示 `双语实拍 · 工作台` 附件名命中 `工作台-修改后.png` 与标签筛选，0 `隔离测试` 标签）。所有新拍及受影响图片均已按**原尺寸**与 **`780 px / 312 px` 近似 README/市场展示宽度**（接触表见 `output/playwright/release-0130-r2/display-width-check.png`）逐张目视核对通过。`assets/screenshots/0.12.0/` 与 `assets/handbook/{v2..v5,en/v5}/` 原样保留。

---

## 四、沿用前包证据（同步、完整转存/导出与性能观测）

以下结果测自本轮同一 `0.13.0` 候选链的前包 `725b8cffa6a93cee300d5e5e4e852bdbab2967f9ee5e86540b5e3d65b5e4c8d6`（相对最终包 `2ea0b957...`，同步实现、存储格式、协议契约、导出模块与转存逻辑**零字节变化**）：

### 1. 完整四组合双语布局/转存/导出观测（沿用 `725b8cff...`）
证据：`output/playwright/release-0130/bilingual/{desktop,web}/result.json`（页面错误均为 `0`）：
- 四组合（DSH `0.2.2-rc.5` Desktop/Web × 简体中文/英文）：3 布局、6 配色、独立窗口语种同步、切语种时已打开会话侧栏标签即时更名（切至英文两组 `openTabRetitled: true`）、宽窗转存弹窗 `1280 × 589`（自适应高度与实时缩略图）、窄窗紧凑布局（Desktop `885 × 660` 下弹窗 `556 × 628`；Web `720 × 770` 下弹窗 `556 × 738`）、保存读回两张原图及单篇导出 ZIP（实测 `4,194,593` / `4,194,612` 字节，约 **`4.00 MiB`** / **`4.19 MB`**，含 Markdown 与 2 份附件）。

### 2. 发版前性能抽查（沿用 `725b8cff...`，仅作本版绝对观测值）
环境：同一 Windows 主机、DSH `0.2.2-rc.5` 隔离 Desktop（`release12-desktop`，`1440×950`）与独立窗口（`1360×920`，`柔和卡片三栏`），**161 篇活动笔记、14 个活动笔记本**，空闲同步态（原始执行脚本位于会话暂存目录 `scratch/release-0130-live-sync-and-perf.cjs` 与 `scratch/release-0130-long-and-cleanup.cjs`，以下列出完整样本数组）：

| 操作与条件 | 首次（`n=1`） | 暖态样本与统计 | 备注 |
| --- | --- | --- | --- |
| 打开普通笔记（`配图提示词：把「好看」说具体`，858 字，独立窗口点击至非 loading 双帧完成） | 561 ms | `n=5`，中位 **167 ms**，最大 **317 ms**（`[317, 167, 150, 150, 167]`） | 本版空闲观测 |
| 打开全库最长笔记（`超长图边界 · 验收`，16,692 字，独立窗口搜索定位点击至非 loading 双帧完成） | 383 ms | `n=5`，中位 **312 ms**，最大 **320 ms**（`[320, 291, 311, 316, 312]`） | 本版空闲观测 |
| 切换笔记本（14 个活动笔记本间切换，独立窗口至列表标题双帧完成） | 83 ms | `n=5`，中位 **67 ms**，最大 **107 ms**（`[67, 107, 60, 92, 58]`） | 本版空闲观测 |
| 保存后双窗口自动刷新（Desktop 保存至独立窗口列表出现） | 826 ms | 仅单次观测（`n=1`） | 未取多样本中位数 |
| `Alt+K` 呼出至输入框获焦（Desktop `1440×950` 帮助页空闲态） | 端到端首 5 次 `[97, 25, 27, 27, 24]`（中位 27 ms）；页内 `keydown→focusin` `[16.7, 8.3, 8.5, 7.9, 7.3]`（中位 8.3 ms） | 暖态 `n=10` 端到端中位 **24 ms**、最大 **32 ms**（`[24, 24, 23, 23, 24, 25, 24, 32, 26, 32]`）；页内中位 **7.5 ms**（`[7.7, 8.1, 7.3, 7.3, 7, 7.4, 7.5, 11.3, 8.4, 7.5]`） | 仅作本版绝对观测值；因冷热口径、同步状态与页面条件不同，**不与历史 37 ms 做前后提速对比** |

### 3. 指定私库双向同步与清理闭环（沿用 `725b8cff...`，经 Codex 只读远端复核）
目标仓库：`StarWind97/dsh-community-private-test`（`repositoryId: 1440762952`）。因本轮整改未改动同步实现、协议与绑定，按约定沿用该闭环证据且本轮不再向私库写入：
- Desktop（`release12-desktop`）新建并推送 `01M89YZP2BVFJ7B4BRZVJ80T08`（`2026-11-25T18:20:43.827Z`）→ Web（`release12-web`）拉取读回、编辑改名为 v2（`revision: 91c5395516ef1f11d37cefd3f6c9892e58092551d9d81aa4f432301b27c28833`）并推回（`2026-11-25T18:29:31.891Z`）→ Desktop 拉取复核逐字一致（`2026-11-25T18:36:00.842Z`）→ 将两篇临时测试笔记（`01M89YH93HDGXKFRF5T94041C5`、`01M89YZP2BVFJ7B4BRZVJ80T08`）移入回收站并同步清理（`2026-11-25T18:37:10.112Z`，Desktop 活动笔记恢复 161 篇，`status: idle, pending: false`；Codex 已通过 GitHub 只读 GET 核实远端快照 `1a7b68fd3127f6f154180bda23b129cd9d8d0963` 中两篇均为 `trashed`）。

---

## 五、尚未验证边界、后续项与体验入口

- **尚未验证范围**：
  - 未在 macOS、Linux、高 DPI 物理缩放或 DSH `0.2.3-alpha.2` 上实机运行（macOS `⌥K` 仅有源码逻辑依据，无物理键盘实测）；
  - 双语离线演示资料未发起真实 AI 模型建议请求；
  - 阶段二操作（`git push`、创建/推送 `v0.13.0` 标签、创建 GitHub Release、公开链接匿名下载校验、插件市场双语实页复核）**均尚未执行**，等待 Codex 独立复核与用户批准。
- **已明确列入后续迭代（本轮不扩大范围）**：
  - `test/quick-switcher.test.ts` 的样式注册扫描已校正测试名称与覆盖边界说明；改用 TypeScript AST 解析导入符号与动态调用列为后续项（Codex 静态类型检查已确认当前 47 个注册点、34 个键无实际冲突）。
  - `lib/client.js` 与 `lib/standalone.js` 中 `code-worker.ts` 虚拟模块 esbuild 注释带本机构建根目录绝对路径（不影响运行行为），改为稳定相对标识列为后续项。
- **隔离体验入口与证据目录**：
  - 桌面隔离体验脚本：`D:\DSH-Workspace\dsh-github-notebook\scripts\Open-Fatfish-Notes.cmd`（指向已安装最终候选 `2ea0b957...` 的 `.dsh-home/pure-001/release12-desktop`）。
  - 最终候选包与校验文件：`D:\DSH-Workspace\dsh-github-notebook\dist\release-0130-r2\`；上一枚对照候选：`D:\DSH-Workspace\dsh-github-notebook\dist\release-0130\`；本轮实测收据与日志：`D:\DSH-Workspace\dsh-github-notebook\output\playwright\release-0130-r2\`。
  - 所有自建验收进程均已关闭，日常 DSH 资料未改动。
