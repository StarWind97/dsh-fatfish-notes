# 肥鱼笔记 0.13.0 候选验收与发布记录

2026-11-26，`0.13.0` 候选完成二轮独立复核整改（`r3`）、定向补证与 Codex 阶段一终审通过后，已于北京时间 `17:38` 正式公开 GitHub Release `v0.13.0`（标签指向发布提交 `efa638acfeca9c3431dcc304d3e5931897820265`，固定名安装包 SHA-256 `3721bc47b789d3c0cfecc261bd5589f0447bd2d504c3bfbdcfcdb6aeccb0012a`），版本入口与 `latest` 两条匿名公开下载及 `.sha256` 校验全部通过。插件市场上游条目无需 PR，首次实页核查因定时构建尚未重跑仍显示 `0.12.0` 旧缓存（固定安装入口已取得 `0.13.0`），待市场重建后补验中英文新版页面。[发版规划与整改记录](../../plans/2026-11-26-release-0130.zh.md) · [中英文版本说明](release-notes.md) · [发版 SOP](../../release-sop.zh.md) · [GitHub 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.13.0)

---

## 一、候选包体与逐成员对照

- **当前最终候选（r3，定向补证期间保持未变）**：
  - 固定名安装包：`dist/release-0130-r3/dsh-fatfish-notes.tgz`（与同目录 `dsh-fatfish-notes-0.13.0.tgz` 逐字节一致，附绑定固定名 `dsh-fatfish-notes.tgz` 的校验文件 `dsh-fatfish-notes.tgz.sha256`）
  - 规格：**279 个文件**、**18,261,474 字节**
  - 完整 SHA-256：`3721bc47b789d3c0cfecc261bd5589f0447bd2d504c3bfbdcfcdb6aeccb0012a`
  - 与当前工作区比对：**279 / 279 逐字节一致**（`workspaceDiffs: 0`）。注：证据目录中早期的 `dsh-fatfish-notes-0.13.0-bc3eb2f263f6.tgz` 为同步英文 `Edit details` 前的中间包，与最终包相差 `README.en.md` 和 `assets/handbook/en/v6/01-welcome.md`，阶段二仅使用已核准的固定名最终包 `3721bc47...`。
- **前序冻结候选（原样保留便于第二审查者比对）**：
  - 上一枚候选 `r2`：`dist/release-0130-r2/dsh-fatfish-notes.tgz`（`18,261,135` 字节，279 文件，SHA-256 `2ea0b9571993cdb011c09630f94cee09965bd7a2bf77afd49dbc538199dc109d`）。
  - 更早候选 `r1`：`dist/release-0130/dsh-fatfish-notes.tgz`（`18,260,402` 字节，279 文件，SHA-256 `9a529f8ab2f2030fa48413f3fce4109f0aa3570d70c36291edbcebf2c1c7fc30`）。
  - **`r2 → r3` 逐成员精确差异**（证据：`output/playwright/release-0130-r3/candidate-diff-and-install.json`）：新增 `0`、删除 `0`、修改 **`5` 个文件**：
    1. `lib/client.js`（`QuickSwitcher` 移除合成 `onMouseEnter` 与裸 `:hover` 高亮，改为鼠标指针真实位移 `onPointerMove` 且不覆盖已获焦结果按钮；新增列表滚顶与首项入视同步）
    2. `lib/standalone.js`（同上独立窗口打包产物）
    3. `assets/handbook/en/v6/01-welcome.md`（与实机 `locale/en.json` `editorMetaEdit` 对齐：`Edit properties` → `Edit details`）
    4. `README.md`（补充 `v0.12.0` 明确回退版本链接）
    5. `README.en.md`（同步 `Edit details` 按钮名并补充 `v0.12.0` 明确回退版本链接）
  - 其余 **274 个成员**（含全部 Host 同步/存储实现、协议契约、`locale/{zh,en}.json`、全部历史与中文手册、全部实拍图片、`package.json` 及依赖）相对 `r2` **零字节变化**。
- **四处隔离资料官方 CLI 串行安装校验（最终包 `3721bc47...` 实测）**：
  - `.dsh-home/pure-001/release12-web`（`--profile web`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - `.dsh-home/pure-001/release12-desktop`（`--profile desktop`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - `.dsh-home/pure-001/bilingual-20261122/runtime/web`（`--profile web`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - `.dsh-home/pure-001/bilingual-20261122/runtime/desktop`（`--profile desktop`）：279 文件，缺失 `0`、多余 `0`、内容差异 `0`
  - 安装日志与逐文件校验收据位于 `output/playwright/release-0130-r3/`。

---

## 二、宿主版本与兼容声明核对

- **宿主核对（2026-11-25 23:58，Codex 于 2026-11-26 17:03 独立复核一致）**：
  - npm 官方 `dist-tags`：`latest = 0.2.2-rc.5`、`next = 0.2.2-rc.5`、`alpha = 0.2.3-alpha.2`
  - 官方 GitHub Releases：最新预发行依次为 `0.2.3-alpha.2`、`0.2.3-alpha.1`、`0.2.2-rc.5`
  - Windows 更新源 `win-x64/nightly.yml`：`0.2.2-rc.5`（`stagingPercentage: 100`，`releaseDate: 2026-11-18T11:35:49.720Z`）
  - 本机实测 DSH CLI：`0.2.2-rc.5`
  - 原生输入框附件固定项：`0.2.3-alpha.2` 的公开 `IConversation` 仍缺少创建草稿附件方法，全链路未就绪。
- **兼容声明**：沿用 `engines.dsh: ">=0.2.2-rc.3 <0.2.3-0"`，不扩大兼容声明。[官方发行](https://github.com/deepseek-ai/deepseek-harness/releases) · [官方 npm 标签](https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags) · [Windows 更新源](https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml)

---

## 三、最终包实测结果（`3721bc47...`）

### 1. 五条混合输入红绿对照与第三档工程回归
- **五条混合输入回归先红后绿证据**（新增进 `test/browser/check-switcher-sidebar.mjs`，使用真实指针静止位置、`Tab`/`Shift+Tab`、方向键与 `Enter`，先在未修改的 `r2` 基线 `d6e5ff3` 取失败证据，再在 `r3` 验证全部转绿）：

| 编号与场景 | 未修改 `r2`（`d6e5ff3`）失败证据（`mixed-5cases-r2-red.json`） | `r3` 修复后通过证据（`mixed-5cases-r3-green.json`） |
| --- | --- | --- |
| 1. `pairkey` 指针停 Alpha、`Tab×3` 至 Beta 后迟到 Gamma 插入 | `focusItemId=note:2`，但 `selectedId=note:3`、`highlightedId=note:3`，`Enter` 打开 `note:2`（错位失败） | `focusItemId=selectedId=highlightedId=note:2`，`Enter` 打开 `note:2`（通过） |
| 2. 同数量重排 `[Alpha,Beta]→[Beta,Alpha]`（指针与焦点在 Beta） | `focusItemId=note:2`，但 `selectedId=note:1`、`highlightedId=note:1`，`Enter` 打开 `note:2`（错位失败） | `focusItemId=selectedId=highlightedId=note:2`，`Enter` 打开 `note:2`（通过） |
| 3. 24 项列表指针停 Alpha，输入框按 `↑` 等两帧再 `Enter` | 滚屏触发合成 `mouseenter` 改选 `note:item-9`（`scrollTop=301`），`Enter` 误开 `note:item-9`（回归失败） | 保持输入框焦点，`selectedId=highlightedId=note:item-22`（可视区 `573..604 ⊂ 126..605`），`Enter` 打开 `note:item-22`（通过） |
| 4. `crowd` `Shift+Tab` 至第 24 项，迟到 `crowd-top` 挤出末项 | 焦点收回输入框但 `scrollTop=309`，首项在屏外 `itemTop=-148..-117`（`selectedVisible=false`） | 焦点收回输入框且 `scrollTop=0`，首项入视 `161..192 ⊂ 126..605`，`Enter` 开 `note:crowd-top`，另测 `Esc` 关闭并归还打开按钮（通过） |
| 5. 输入框按 `↑` 到末项后再逐键输入 `crowd` | 选中重置首项但 `scrollTop=239`，首项在屏外 `itemTop=-78..-47`（`selectedVisible=false`） | `scrollTop=0`，首项 `note:item-1` 入视 `161..192 ⊂ 126..605`，`Enter` 打开 `note:item-1`（通过） |

- `npm run typecheck`：通过。
- `npm run build`：通过（与最终包 `r3` 279/279 逐字节一致）。
- **`npm test`**：**445 / 445 全部通过**（0 失败、0 跳过、0 取消，耗时 1,343.1 秒；完整日志见 `output/playwright/release-0130-r3/npm-test.log`），含同步对齐 `Edit details` 后的 `test/handbook.test.ts` 与全部原有单测。
- **三项独立浏览器回归**（全部通过）：
  - `node test/browser/check-reading-tables.mjs`：通过（15 列宽表窄幅阻断、加宽完整导出、普通表正常导出）。
  - `node test/browser/check-switcher-sidebar.mjs`：通过（12 组完整断言，覆盖上述 5 条混合输入、正常鼠标移动悬停与点击、关闭按钮 `Enter`、首尾循环、`Esc` 归还焦点、24 项上限、旧查询取消、二次打开首帧同步聚焦清空、60+ 标签目录及侧栏/浮层双序挂载）。
  - `node --import tsx test/browser/check-dialog-sizes.mjs`：通过（短内容 `196.375px`、长内容 `780px`、嵌套 `1280/680`、极小窗口 `92×108`，保存按钮可达）。
- **真实 DSH 侧栏回归**：串行运行 `npm run test:sidebar`（`release12-web`，已装最终包 `3721bc47...`）通过，实拍位于 `output/playwright/search-sidebar/run-WEs7g3`（宽 `611×882`、窄 `343×822`、矮 `343×582`，`scopedResults: 31`）。

### 2. 最终摘要四组合实机冒烟（DSH 0.2.2-rc.5，按实际收据严格限定表述）
使用已安装最终候选 `3721bc47...` 的 `bilingual-20261122/runtime/{web,desktop}` 串行执行，结束后自动恢复接手前的 `{ language: "zh", theme: "light" }`（证据：`output/playwright/release-0130-r3/smoke-desktop.json`、`smoke-web.json`）。

> **覆盖边界说明**：
> 1. 独立窗口本次均采用**直接宿主端点 URL 在无头 Chromium 中打开**（`direct-host-endpoint-url-in-headless-chrome`），非通过桌面主界面「独立窗口」按钮拉起。
> 2. 独立窗口实际覆盖项为：`stationaryPointerArrowUp`、重开清空聚焦、空结果提示与 `Esc` 归还焦点（未在独立页重复执行 `Tab` 异步搜索）。
> 3. `stationaryPointerArrowUp` 中，Web 独立页中英文两组末项为**笔记**，脚本在 `Enter` 后实际读回了阅读页 `h1` 标题；其余六组末项为**笔记本（`book:...`）**，脚本验证了 `Enter` 前末项入视、输入框持焦、`aria-selected` 指向该 `book:...` 且 `Enter` 后弹窗关闭，但未读取切入后的活动笔记本 ID，下表按实测证据准确记为“正确选中末项并关闭”（`onOpenBook` 目标回调已由组件单测及 Codex 独立组件复演验证）。
> 4. `realTabAsync` 中，Web 中英文两组在真实 `Tab` 聚焦后观测到列表从 `7→13`、`9→12` 动态变化且焦点/高亮/打开目标未漂移；Desktop 中英文两组列表条目数保持 `17→17`、`11→11` 且采集脚本未绑定 `query` 请求体时序，因此仅证实 `Tab` 聚焦、捕获 `/notes` 200 响应及 `Enter` 打开并读回该笔记标题，不单独据 Desktop 采样宣称该响应晚于聚焦返回（迟到重排由组件可控异步回归及 Web 实机采样共同证实）。

| 宿主 × 语种 | 启动打开已有笔记 | 手册界面实操（`+ 新建`→`编辑属性`/`Edit details`→`完成编辑`/`Done editing`→回读清理） | 可恢复重名笔记本错误提示（`notesBookNameTaken`） | 主界面 `Alt+K`（`↑` 末项 + `Tab` 搜索 + 重开与 `Esc`） | 独立窗口 `Alt+K`（仅测 `↑` 末项 + 重开与 `Esc`） | 帮助入口与打开手册章节 | 空结果提示语种 | 页面异常计数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Windows Desktop × 简体中文 | `窗边工作台的图像记录` | 通过（`编辑属性` / `完成编辑`） | 精确匹配：`已有同名笔记本，请使用其他名称。` | 静止指针 `↑` 滚屏（`scrollTop=482`）正确选中末项 `book:41EV1R...`（`用户手册`）并 `Enter` 关闭；`Tab` 聚焦并观测到 `/notes` 200（`17→17`），`Enter` 打开并读回 `窗边工作台 · 会话转存 · 1795629178892`；重开清空聚焦与 `Esc` 归还通过 | 静止指针 `↑` 滚屏（`scrollTop=482`）正确选中末项 `book:01M70H...`（`阶段 A 体验`）并 `Enter` 关闭；重开与 `Esc` 通过 | 可见 · `opened-existing` · `01 开始使用` | `没有找到匹配的笔记或命令` | `main=0` / `standalone=0` |
| Windows Desktop × English | `An image journal for the window desk` | 通过（实机按钮为 `Edit details` / `Done editing`） | 精确匹配：`A notebook with this name already exists. Choose another name.` | 静止指针 `↑` 滚屏（`scrollTop=482`）正确选中末项 `book:01M7FF...`（`开发手册`）并 `Enter` 关闭；`Tab` 聚焦并观测到 `/notes` 200（`11→11`），`Enter` 打开并读回 `Window desk · Saved conversation · 1795363681062`；重开与 `Esc` 通过 | 静止指针 `↑` 滚屏（`scrollTop=482`）正确选中末项 `book:01M70D...`（`收集与思考`）并 `Enter` 关闭；重开与 `Esc` 通过 | 可见 · `opened-existing` · `01 Getting started` | `No matching notes or commands` | `main=0` / `standalone=0` |
| Web × 简体中文 | `窗边工作台的图像记录` | 通过（`编辑属性` / `完成编辑`） | 精确匹配：`已有同名笔记本，请使用其他名称。` | 静止指针 `↑` 滚屏（`scrollTop=482`）正确选中末项 `book:01M71X...`（`B—D 整理目标`）并 `Enter` 关闭；真实 `Tab` 聚焦后 `/notes` 响应使列表由 `7→13` 变化，焦点/高亮/目标稳锁并读回 `窗边工作台 · 会话转存`；重开与 `Esc` 通过 | 静止指针 `↑` 滚屏（`scrollTop=452`）选中末项笔记并 `Enter` 打开读回 `一封邮件，怎样礼貌又不绕弯`；重开与 `Esc` 通过 | 可见 · `opened-existing` · `01 开始使用` | `没有找到匹配的笔记或命令` | `main=0` / `standalone=0` |
| Web × English | `An image journal for the window desk` | 通过（`Edit details` / `Done editing`） | 精确匹配：`A notebook with this name already exists. Choose another name.` | 静止指针 `↑` 滚屏（`scrollTop=482`）正确选中末项 `book:01M71X...`（`B—D 体验`）并 `Enter` 关闭；真实 `Tab` 聚焦后 `/notes` 响应使列表由 `9→12` 变化，焦点/高亮/目标稳锁并读回 `Window desk · Saved conversation`；重开与 `Esc` 通过 | 静止指针 `↑` 滚屏（`scrollTop=452`）选中末项笔记并 `Enter` 打开读回 `排查问题前，准备这四项信息`；重开与 `Esc` 通过 | 可见 · `opened-existing` · `01 Getting started` | `No matching notes or commands` | `main=0` / `standalone=0` |

### 3. 真实被动「保存后双窗口自动刷新」实测（最终包 `3721bc47...`）
原 `725b8cff...` 记录的 `826 ms` 是在独立窗口点击「全部笔记」后才开始计时，属于主动切换而非被动自动刷新，现已撤下并用最终包 `3721bc47...` 完成**同步空闲（`idle / pending=false`）**与**离线演示态**两组零交互被动自动刷新实测：

- **主签收组：同步空闲资料实测（满足 SOP 第 98 行条件，证据：`output/playwright/release-0130-r3/passive-refresh-idle-sync.json`）**：
  - **资料与同步条件**：Windows 主机、DSH `0.2.2-rc.5` 隔离同步资料 `.dsh-home/pure-001/release12-desktop`（绑定指定测试私库 `StarWind97/dsh-community-private-test`，`repositoryId: 1440762952`），库内 **161 篇活动笔记**。起测时（`2026-11-26T09:19:58.675Z` / `09:20:10.247Z`）以及全部 5 次暖态改名采样前均实测确认为 **`status: idle, pending: false`**。
  - **窗口与操作边界**：发送端 `Desktop 1440×920`（停在「全部笔记」），接收端 `Standalone 1360×920`（通过直接宿主端点 URL 在无头 Chromium 打开并停在「全部笔记」，**接收端全程零点击、零导航、零手动刷新**）。
  - **起止点**：在发送端点击「完成编辑」之前开始计时，至未触碰的接收端列表 `.paper-row` 实际出现新标题并完成双帧渲染为止。
  - **原始观测值与统计**：
    - 首次新建保存（`n=1`）：**`1,972 ms`**
    - 暖态连续改标题保存（**`n=5`**）：原始值 **`[1443, 904, 923, 947, 1394]` ms**，中位 **`947 ms`**，最大 **`1,443 ms`**
  - **清理与同步状态核验**：临时测试笔记 `01M8BJFFK5413DE6G3GK23GTE1` 已通过 Desktop 界面移入回收站并同步完成，清理后实测 **`status: idle, pending: false`**（`lastSuccessAt: 2026-11-26T09:23:46.393Z`），`tempNoteFinalStatus: "trashed"`，活动笔记恢复 **`161` 篇**，`pageErrors=0 / standalonePageErrors=0`。
- **辅助对照：离线演示资料实测（证据：`output/playwright/release-0130-r3/smoke-desktop.json#passiveDualWindowRefresh`）**：
  - `bilingual-20261122/runtime/desktop`（**179 篇活动笔记**、离线演示态 `error / pending=true`），`Desktop 1440×920` → 未触碰 `Standalone 1360×920`（停在目标笔记本列表页）：首次新建 `n=1` 为 **`2,728 ms`**，连续改标题暖态 **`n=5`** 原始值 **`[2755, 2691, 2737, 2682, 2704]` ms**（中位 **`2,704 ms`**，最大 **`2,755 ms`**）。

### 4. 真实 `0.12.0 → 0.13.0` 升级与随包手册 `v6` 实战练习（最终包 `3721bc47...`）
使用留存的真实公开 `0.12.0` 安装包（`dist/i18n-0120/publication/tagged.tgz`，SHA-256 `6a377ac04e4bd66ce148bf1bed11841abd2db2fb1831fc4cf12bfb62fef35ee9`）与解包的最终 `0.13.0` 候选 `r3`（`3721bc47...`）验证（证据：`output/playwright/release-0130-r3/handbook-upgrade-and-v6.json`）：
- **升级保留旧版手册**：真实 `0.12.0` 生成中/英文 `v5` 手册并编辑首页后，交由最终 `0.13.0` 执行打开及尝试添加，均完整保留原 `noteId`（`689PHVY37YT3TFVXXNRG9EDDV9` / `1KBDH74XEY9W2F9WC1GDAA4DGF`）、编辑后标题/正文与 2 条修订历史，活动笔记保持 3 篇，不覆盖、不重复生成。
- **`v6` 自动初始化与手动添加（4 组合）**：`zh-auto`、`zh-manual`、`en-auto`、`en-manual` 均生成 3 章、6 处有效章节内链、封面图（2,070,036 字节）与 2 份可读且字节一致的附件。
- **附件搜索与操作指引核验**：搜索 `项目交付清单.md` 返回 `02 资料与交付`（`hit.field: "file"`）与 `01 开始使用`（`body`）；搜索 `Project handoff checklist.md` 返回 `02 Materials and exports`（`hit.field: "file"`）与 `01 Getting started`（`body`）。中文首页「编辑属性 → 完成编辑」与英文首页 `Edit details → Done editing` 与实机按钮完全一致。

### 5. 文档、SOP、链接核对与隔离资料遗留清理
- **六份面向用户文档核对留档**：`r2` 阶段的六份面向用户文档（`README.md`、`README.en.md`、`docs/user-guide.zh.md`、`docs/user-guide.en.md`、`docs/user-guide-reference.zh.md`、`docs/user-guide-reference.en.md`）完整逐份核对清单见固定提交 `d6e5ff3` 中的 [docs/releases/0.13.0/review.zh.md](../../releases/0.13.0/review.zh.md)（`git show d6e5ff3:docs/releases/0.13.0/review.zh.md` 第三节第 4 项）；`r3` 在此基础上完成以下增量修正：
  - **英文按钮文案同步**：依据实机英文界面的 `Edit details`（`locale/en.json:1136`），对齐 `assets/handbook/en/v6/01-welcome.md`、`README.en.md`、`docs/user-guide.en.md`、`docs/user-guide-reference.en.md`、`docs/releases/0.13.0/release-notes.md` 与 `test/handbook.test.ts`；
  - **明确回退路径与 SOP 补齐**：`README.md`、`README.en.md` 及 `docs/releases/0.13.0/release-notes.md`（中英文）均补全 `v0.12.0` 明确回退版本链接；`docs/release-sop.zh.md` 补充 PowerShell 生成绑定固定名 `dsh-fatfish-notes.tgz` 的 `.sha256` 实际命令；`docs/plans/2026-11-26-release-0130.zh.md` 下一步已与 SOP 对齐为「先核对上游插件市场元数据，仅确需修改时再提 PR」。
- **链接与本地化校验**：`node --import tsx --test test/localization.test.ts` 6/6 通过；独立链接与锚点校验覆盖 14 份文档全部相对链接与页内锚点，0 失效。
- **隔离资料遗留试验笔记清理（证据：`output/playwright/release-0130-r3/cleanup-leftover-note.json`）**：已将 `.dsh-home/pure-001/bilingual-20261122/runtime/desktop` 中早期失败试验遗留的活动笔记 `01M8BE8R6B7KX0RASA235AJYJQ`（标题 `passive-r3-1795680393751-v0`）通过 Desktop 界面移入回收站，并同时核对 API 状态与持久化文档前置头（`status: "trashed"`，`revision: "752dc16619c2b80f20337efab7c3933555c5fb9a669cdeb95c9be22b973a739c"`，`recordedAt: "2026-11-26T09:24:07.474Z"`），库内活动笔记由 `179` 降为 `178`，`remainingActivePassiveNotes: []`。

---

## 四、沿用前包证据（同步、转存/导出、已审实拍与其余性能观测）

以下结果测自本轮同一 `0.13.0` 候选链的前包 `725b8cffa6a93cee300d5e5e4e852bdbab2967f9ee5e86540b5e3d65b5e4c8d6` 及 `r2`（`2ea0b957...`），相对最终包 `3721bc47...`，同步实现、存储格式、协议契约、导出模块、转存逻辑与全部图片资产均**零字节变化**：

### 1. 完整四组合双语布局/转存/导出观测（沿用 `725b8cff...`）
证据：`output/playwright/release-0130/bilingual/{desktop,web}/result.json`（页面错误均为 `0`）：
- 四组合（DSH `0.2.2-rc.5` Desktop/Web × 简体中文/英文）：3 布局、6 配色、独立窗口语种同步、切语种时已打开会话侧栏标签即时更名（切至英文两组 `openTabRetitled: true`）、宽窗转存弹窗 `1280 × 589`（自适应高度与实时缩略图）、窄窗紧凑布局（Desktop `885 × 660` 下弹窗 `556 × 628`；Web `720 × 770` 下弹窗 `556 × 738`）、保存读回两张原图及单篇导出 ZIP（实测 `4,194,593` / `4,194,612` 字节，约 **`4.00 MiB`** / **`4.19 MB`**，含 Markdown 与 2 份附件）。

### 2. 已审实拍图与双尺度目视核查（沿用 `2ea0b957...`，图片资产 0 变化）
- `r2` 中重拍并完成原尺寸与 `780 px / 312 px` 双尺度目视核查的 `tag-management.png`、`conversation-entries.png`、`workspace-map.png`（接触表 `output/playwright/release-0130-r2/display-width-check.png`）及 8 张 `assets/screenshots/0.13.0/` 实拍在 `r3` 中未再改动；`assets/screenshots/0.12.0/` 与 `assets/handbook/{v2..v5,en/v5}/` 原样保留。

### 3. 发版前其余性能抽查（沿用 `725b8cff...`，已按原始脚本精确校对规模与样本数）
环境：同一 Windows 主机、DSH `0.2.2-rc.5` 隔离 Desktop（`release12-desktop`，`1440×950`）与独立窗口（`1360×920`，`柔和卡片三栏`），空闲同步态（原始执行脚本位于会话暂存目录 `scratch/release-0130-live-sync-and-perf.cjs` 与 `scratch/release-0130-long-and-cleanup.cjs`；本版同步空闲与离线演示两套「保存后双窗口自动刷新」实测见上文第三节第 3 项）：

| 操作、资料规模与条件 | 首次 / 首组样本 | 暖态样本与统计 | 备注 |
| --- | --- | --- | --- |
| 打开普通笔记（`配图提示词：把「好看」说具体`，858 字；当次脚本**未记录活动笔记总数**；独立窗口点击至非 loading 双帧完成） | `n=1`：**561 ms** | `n=5`，中位 **167 ms**，最大 **317 ms**（`[317, 167, 150, 150, 167]`） | 沿用 `725b8cff...` 空闲观测 |
| 打开全库最长笔记（`超长图边界 · 验收`，16,692 字；实测时库内 **163 篇活动笔记**，清理后为 161 篇；独立窗口搜索定位点击至非 loading 双帧完成） | `n=1`：**383 ms** | `n=5`，中位 **312 ms**，最大 **320 ms**（`[320, 291, 311, 316, 312]`） | 沿用 `725b8cff...` 空闲观测 |
| 切换笔记本（14 个非空活动笔记本中的 **2 个笔记本间交替切换**；独立窗口至列表标题双帧完成） | `n=1`：**83 ms** | `n=5`，中位 **67 ms**，最大 **107 ms**（`[67, 107, 60, 92, 58]`） | 沿用 `725b8cff...` 空闲观测 |
| `Alt+K` 呼出至输入框获焦（Desktop `1440×950` 帮助页空闲态） | **首组 `n=5`**：端到端 `[97, 25, 27, 27, 24]` ms（中位 27 ms）；页内 `keydown→focusin` `[16.7, 8.3, 8.5, 7.9, 7.3]` ms（中位 8.3 ms） | **暖态 `n=10`**：端到端中位 **24 ms**、最大 **32 ms**（`[24, 24, 23, 23, 24, 25, 24, 32, 26, 32]`）；页内中位 **7.5 ms**（`[7.7, 8.1, 7.3, 7.3, 7, 7.4, 7.5, 11.3, 8.4, 7.5]`） | 仅作本版绝对观测值；**不与跨条件历史 37 ms 做提速对比** |

### 4. 指定私库双向同步与清理闭环（沿用 `725b8cff...`，经 Codex 只读远端复核；本轮被动刷新清理同步另见上文）
目标仓库：`StarWind97/dsh-community-private-test`（`repositoryId: 1440762952`）：
- 跨端双向修订闭环沿用 `725b8cff...`：Desktop（`release12-desktop`）新建并推送 `01M89YZP2BVFJ7B4BRZVJ80T08` → Web（`release12-web`）拉取改名为 v2 并推回 → Desktop 拉取复核一致 → 清理两篇临时笔记至 `trashed`，活动笔记恢复 161 篇（经 Codex 只读 GET 核实远端快照 `1a7b68fd3127f6f154180bda23b129cd9d8d0963`）；
- 本轮最终包 `3721bc47...` 在 `release12-desktop` 补测同步空闲被动双窗刷新后，已将临时笔记 `01M8BJFFK5413DE6G3GK23GTE1` 移入回收站并同步完成（`2026-11-26T09:23:46.393Z`，`status: idle, pending: false`，活动笔记保持 `161` 篇）。

---

## 五、尚未验证边界、后续项与体验入口

- **尚未验证范围**：
  - 未在 macOS、Linux、高 DPI 物理缩放或 DSH `0.2.3-alpha.2` 上实机运行（macOS `⌥K` 仅有源码逻辑依据，无物理键盘实测）；
  - 本轮独立窗口通过直接宿主端点 URL 在无头 Chromium 中启动验证，未额外实测通过桌面主界面「独立窗口」按钮原生拉起窗口的窗口壳层链路；
  - 双语离线演示资料未发起真实 AI 模型建议请求；
  - 插件市场 `awesome-dsh-plugin.com` 在 `v0.13.0` 发布时尚未触发新一轮定时重建，中英文详情页新版正文与 `0.13.0` 截图待市场重建后补验（见下文[发布与市场](#发布与市场)）。
- **已明确登记为非阻塞后续迭代项（本轮不改代码）**：
  - **P3 · `QuickSwitcher` 1 px 指针回入原坐标边界（及触笔悬停）**：输入框保焦时指针停在某结果左边缘 → 移至左侧列表内边距 1 CSS px → 按 `↓` 选中下一项 → 精准移回原坐标且不再向项内移动时，因坐标仅在结果按钮 `onPointerMove` 内记录，未触发新选，按 `Enter` 仍打开键盘选中项（再向项内移 1 px 或直接点击均正常；另 `pointerType === 'mouse'` 会忽略触笔悬停，笔尖点按正常）。后续在列表级记录真实指针离开并区分同坐标合成事件，同时保留已聚焦按钮键盘优先。
  - `test/quick-switcher.test.ts` 的样式注册扫描改用 TypeScript AST 解析导入符号与动态调用；
  - `lib/client.js` 与 `lib/standalone.js` 中 `code-worker.ts` 虚拟模块 esbuild 注释带本机构建根目录绝对路径改为稳定相对标识。
- **隔离体验入口与证据目录**：
  - 桌面隔离体验脚本：`D:\DSH-Workspace\dsh-github-notebook\scripts\Open-Fatfish-Notes.cmd`（指向已安装最终候选 `3721bc47...` 的 `.dsh-home/pure-001/release12-desktop`）。
  - 最终候选包与校验文件：`D:\DSH-Workspace\dsh-github-notebook\dist\release-0130-r3\`（含公开下载核验副本 `publication/`）；前序对照候选：`dist\release-0130-r2\` 与 `dist\release-0130\`；本轮实测收据与日志：`D:\DSH-Workspace\dsh-github-notebook\output\playwright\release-0130-r3\`（含 `passive-refresh-idle-sync.json`、`cleanup-leftover-note.json` 与 `public-download-verify.json`）。
  - 所有自建验收进程均已关闭，日常 DSH 资料未改动。

---

## 发布与市场

- **正式发布（2026-11-26 17:38:44 北京时间 / `09:38:44Z`）**：
  - 仅提交经 Codex 终审的 15 个工作区文件，发布提交完整 SHA：`efa638acfeca9c3431dcc304d3e5931897820265`，已推送至 `origin/main`；
  - 创建并推送附注标签 `v0.13.0`（标签对象 `5bfd2fb6fac40d7fc18cad482836ce89971e6435`，指向发布提交 `efa638acfeca9c3431dcc304d3e5931897820265`）；
  - 使用转换好 `v0.13.0` 绝对链接的中英文版本说明创建 GitHub Release 草稿，仅上传 `dsh-fatfish-notes.tgz`（`18,261,474` 字节，GitHub 记录摘要 `sha256:3721bc47b789d3c0cfecc261bd5589f0447bd2d504c3bfbdcfcdb6aeccb0012a`）与 `dsh-fatfish-notes.tgz.sha256`（`89` 字节，GitHub 记录摘要 `sha256:ccf5bb7fe19de1637ec2529afce0dab44b2defca8ba13b0b0e64964bdcb8da81`），核对全部一致后公开并设为 Latest。[GitHub 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.13.0)
- **双入口匿名公开下载校验（2026-11-26 17:39 北京时间，收据：`output/playwright/release-0130-r3/public-download-verify.json`）**：
  - 版本入口匿名下载：[v0.13.0/dsh-fatfish-notes.tgz](https://github.com/StarWind97/dsh-fatfish-notes/releases/download/v0.13.0/dsh-fatfish-notes.tgz) → `18,261,474` 字节、`279` 文件、包内 `dsh-fatfish-notes@0.13.0`，SHA-256 `3721bc47b789d3c0cfecc261bd5589f0447bd2d504c3bfbdcfcdb6aeccb0012a`（通过）；
  - 最新版入口匿名下载：[latest/download/dsh-fatfish-notes.tgz](https://github.com/StarWind97/dsh-fatfish-notes/releases/latest/download/dsh-fatfish-notes.tgz) → `18,261,474` 字节、`279` 文件、包内 `dsh-fatfish-notes@0.13.0`，SHA-256 `3721bc47b789d3c0cfecc261bd5589f0447bd2d504c3bfbdcfcdb6aeccb0012a`（通过）；
  - 两条公开 `.sha256` 匿名下载内容均为 `3721bc47b789d3c0cfecc261bd5589f0447bd2d504c3bfbdcfcdb6aeccb0012a  dsh-fatfish-notes.tgz`（通过）；
  - GitHub `main` 分支中英文 README（含 `0.13.0` 截图路径、`Edit details` 与 `v0.12.0` 回退链接）及 `assets/screenshots/0.13.0/{zh,en}/` 8 张实拍均已核对在线可见。[中文 README](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/README.md) · [英文 README](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/README.en.md)
- **插件市场元数据与首轮实页观测（2026-11-26 17:41 北京时间，待重建后补验）**：
  - 上游条目 [StarWind97__dsh-fatfish-notes.yml](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/StarWind97__dsh-fatfish-notes.yml) 的中英文描述、分类、图标与固定安装入口（`releases/latest/download/dsh-fatfish-notes.tgz`）均无变化，**无需提交市场 PR**；
  - 实际访问[英文详情页](https://awesome-dsh-plugin.com/p/StarWind97/dsh-fatfish-notes/)、[中文详情页](https://awesome-dsh-plugin.com/zh/p/StarWind97/dsh-fatfish-notes/)并核查 [plugins.json](https://awesome-dsh-plugin.com/plugins.json)：两页与目录 JSON 均**仍展示上一次定时构建（`build-site.yml` run `45742690005`，北京时间 `2026-11-26 10:28–14:23`）缓存的 `0.12.0` 正文（八套布局 / 十种配色）与 4 张 `0.12.0` 截图**；两页共用的预构建安装命令指向 `releases/latest/download/dsh-fatfish-notes.tgz`（已匿名验证为 `0.13.0`），图解主链接指向 `HEAD` 主分支文档；
  - 上游 `build-site.yml` 每日 `02:23 UTC`（北京时间 `10:23`）定时重建或随上游新合并触发。**市场双语实页暂记为“待市场重建后补验”，待看到 `0.13.0` 新版正文与 8 张新实拍生效后再补记完成。**
- 2026-11-28 补验完成。在 0.13.1 发布前，市场中英文详情均已显示 0.13.0 正文、各四张本语言截图及本语言图解入口。0.13.1 公开后的安装地址和市场后续状态见[下一版记录](../0.13.1/review.zh.md#发布与市场)。
