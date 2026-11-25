# 肥鱼笔记 0.13.0 候选验收记录

2026-11-26，`0.13.0` 候选完成阶段一全部代码加固、随包手册 v6、全量中英文文档与实拍同步，以及全量回归与隔离 DSH 双端双语验收。本轮按约定在正式发布前停下，等待独立复核与用户确认后再执行阶段二公开发布。[发版规划与工作记录](../../plans/2026-11-26-release-0130.zh.md) · [中英文版本说明](release-notes.md) · [发版 SOP](../../release-sop.zh.md)

## 候选与宿主环境

- **最终安装包**：`dist/release-0130/dsh-fatfish-notes.tgz`（与同目录 `dsh-fatfish-notes-0.13.0.tgz` 逐字节一致，附校验文件 `dsh-fatfish-notes.tgz.sha256`），共 **279 个文件**，**18,260,402 字节**，SHA-256 为 `9a529f8ab2f2030fa48413f3fce4109f0aa3570d70c36291edbcebf2c1c7fc30`。
  - 说明：首轮打包候选（SHA-256 `725b8cffa6a93cee300d5e5e4e852bdbab2967f9ee5e86540b5e3d65b5e4c8d6`，18,260,377 字节，279 文件）通过全部 4 组合双语、侧栏、性能抽查与真实私库双向同步验收后，在文档终检中将 `README.md` 与 `README.en.md` 中的三套布局名称严格对齐词表（`柔和卡片三栏 / 经典秩序分栏 / 目录树双栏` 与 `Soft cards / Structured split / Notebook tree`），随后重新打包生成最终候选 `9a529f8a...`。两包除两份 README 的布局名称外，全部 `lib/`、`locale/`、`assets/handbook/` 与 `package.json` 零字节变化；最终包已重新通过官方 CLI 装入全部 4 处隔离资料（`release12-web`、`release12-desktop`、`bilingual-web`、`bilingual-desktop`）并逐文件校验 **279/279** SHA-256 一致。
- **宿主核对（2026-11-25 23:58）**：npm 官方 `latest` / `next`、Windows 更新源 `win-x64/nightly.yml`（`stagingPercentage: 100`，`releaseDate: 2026-11-18T11:35:49.720Z`）与本机已装 DSH CLI 均为 **`0.2.2-rc.5`**。`alpha` 为 `0.2.3-alpha.2`（超出现有声明，且公开 `IConversation` 仍缺创建原生草稿附件接口）。因此 `engines.dsh` 维持 `>=0.2.2-rc.3 <0.2.3-0`，本轮不扩大兼容声明。[官方 npm 标签](https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags) · [Windows 更新源](https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml)

## 工程回归与浏览器专项

- `npm run typecheck`：通过。
- `npm run build`：通过（重建后与最终候选包内 `lib/` 逐文件一致）。
- **`npm test`**：**445 / 445 全部通过**（0 失败、0 跳过、0 取消，耗时 1,087.9 秒），包含新增的样式单例冲突抛错与全库 `src/client/` 键唯一性静态扫描、升级后外观队列 `.set({ size: 20 })` 及非法值拦截、随包中英文手册 v6 生成与旧版保留、双语图文配对与路径校验。
- 独立浏览器回归（全部通过）：
  - `node test/browser/check-reading-tables.mjs`：通过（15 列宽表窄幅阻断、加宽完整导出、普通表正常导出）。
  - `node test/browser/check-switcher-sidebar.mjs`：通过（含正文/附件名检索、连续改词防乱序、24 项上限、60+ 标签目录、Enter/`Tab` 焦点同步高亮、侧栏与浮层双序挂载）。
  - `node --import tsx test/browser/check-dialog-sizes.mjs`：通过（短内容 `196.375px`、长内容 `780px`、嵌套 `1280/680`、极小窗口 `92×108`，保存按钮可达）。
- 真实 DSH 侧栏回归 `npm run test:sidebar`（隔离 `release12-web`）：通过（宽 `611×882`、窄 `343×822`、矮 `343×582`，`scopedResults: 31`）。

## 双端双语四组合验收（DSH 0.2.2-rc.5）

使用隔离演示资料 `.dsh-home/pure-001/bilingual-20261122/runtime/{web,desktop}` 完成以下四组合实测，页面错误均为 `0`：

| 宿主 | 简体中文 | 英文 | 窄窗尺寸 | 转存弹窗宽 / 窄 | 导出 ZIP |
| --- | --- | --- | --- | --- | --- |
| Windows 桌面 | 通过 | 通过 | 885 × 660 | 1280 × 589 / 556 × 628 | ~4.19 MiB（含 2 份附件） |
| Web | 通过 | 通过 | 720 × 770 | 1280 × 589 / 556 × 738 | ~4.19 MiB（含 2 份附件） |

- 四组均实测：主界面、独立窗口语言同步、`Alt+K` 快速切换器界面词表（无跨语种泄露）、设置页 3 套布局与 6 套配色、「设置 → 帮助」反馈入口与随包手册入口、列表筛选与导出 ZIP、转存「保存选项」宽窗自适应高度/实时缩略图/底部「取消」及窄窗紧凑布局切换（保留标题与选择）、会话侧栏读回原图及语言切换时已打开侧栏标签即时更名（`openTabRetitled: true`）。

## `0.12.0 → 0.13.0` 升级与随包手册 v6

- 解包正式候选验证 `zh-v6` 与 `en-v6` 首次/手动添加均生成 3 章、6 处章节内链、封面与 2 份附件，且中英文内容与 `0.13.0` 新交互（`+ 新建`、「编辑属性」抽屉、`Alt+K`/`⌥K`、分段控件、保存选项缩略图与底部「取消」、空目录自动收起、「设置 → 帮助」）一致。
- 在已有 `v5` 中/英文手册资料上升级打开：保留用户既有 `v5` 手册修订，不强行覆盖。
- 旧版 `appearance.json`（含已退役 `island` 布局与 `lilac` 配色及待写队列）升级后平滑迁移，且新写入操作顺序、重放与非法值拦截均符合预期。

## 发版前性能抽查

测试环境：同一 Windows 主机、DSH `0.2.2-rc.5` 隔离 Desktop（`release12-desktop`）及对应独立窗口（`1360×920`，`柔和卡片三栏`），资料规模 **161 篇活动笔记、14 个活动笔记本**，空闲同步态。

| 操作 | 首次 | 热切换中位数（5 次） | 热切换最大值 | 备注 |
| --- | --- | --- | --- | --- |
| 打开普通笔记（`配图提示词：把「好看」说具体`，858 字） | 561 ms | 167 ms | 317 ms | 独立窗口点击到正文非 loading 渲染完成 |
| 打开全库最长笔记（`超长图边界 · 验收`，16,692 字） | 383 ms | 312 ms | 320 ms | 独立窗口切换长文至渲染完成 |
| 切换笔记本（14 个活动笔记本间切换） | 83 ms | 67 ms | 107 ms | 列表标题更新并完成双帧绘制 |
| 保存后双窗口自动刷新（Desktop → 独立窗口） | 826 ms | — | — | 单次新建保存观测 |
| `Alt+K` 聚焦输入框（`QuickSwitcher` B 同步聚焦后） | 97 ms（端到端）/ 16.7 ms（页内） | **24 ms**（暖态 10 次端到端）/ **7.5 ms**（页内） | 32 ms（暖态 10 次） | 前 5 次端到端中位数 27 ms、页内 8.3 ms；改造前同环境端到端中位数 37 ms |

## 指定私库双向同步闭环

目标仓库：`StarWind97/dsh-community-private-test`（`repositoryId: 1440762952`），全程校验仓库身份，未触碰日常 DSH 资料。

1. **Desktop 新建并推送 v1**：在 `release12-desktop` UI 新建笔记 `01M89YZP2BVFJ7B4BRZVJ80T08`（`0.13.0 双向同步临时验收 ...`），独立窗口 826 ms 内自动刷新可见；推送至 GitHub 完成（`lastSuccessAt: 2026-11-25T18:20:43.827Z`，`status: idle, pending: false`）。
2. **Web 拉取、编辑并推回 v2**：在 `release12-web` 拉取并读取 `01M89YZP2BVFJ7B4BRZVJ80T08`（v1 标题一致），通过 UI 改名为 `0.13.0 双向同步已由Web更新 ...`（`revision: 91c5395516ef1f11d37cefd3f6c9892e58092551d9d81aa4f432301b27c28833`），推回 GitHub 完成（`lastSuccessAt: 2026-11-25T18:29:31.891Z`）。
3. **Desktop 拉取复核并清理**：重启 `release12-desktop` 拉取（`2026-11-25T18:36:00.842Z`），核对标题与修订号均与 Web v2 逐字一致；随后将本轮产生的两篇临时测试笔记（`01M89YH93HDGXKFRF5T94041C5`、`01M89YZP2BVFJ7B4BRZVJ80T08`）移入回收站并同步清理完成（`lastSuccessAt: 2026-11-25T18:37:10.112Z`，活动笔记恢复为 `161` 篇，`status: idle, pending: false`）。

## 双语文档与实拍核对

- 更新全部 6 份中英文使用文档（`README.md`、`README.en.md`、`docs/user-guide.zh.md`、`docs/user-guide.en.md`、`docs/user-guide-reference.zh.md`、`docs/user-guide-reference.en.md`）及 `screenshots.json`、`docs/notes-design.zh.md`、`docs/releases/0.13.0/release-notes.md`；核对 13 份文档内全部相对链接 0 失效。
- 公开实拍 8 张（`assets/screenshots/0.13.0/{zh,en}/0{1..4}-*.png`）与图解实拍 7 张（`docs/images/user-guide/{conversation-entries,reuse-in-conversation,workspace-map,tag-management}.png`、`docs/images/user-guide/{zh,en}/save-options.png`、`docs/images/user-guide/en/tags.png`）全部基于 `0.13.0` 候选重拍，并已逐张人工目视核查（字数统计完整显示、同步绿点清晰、无中文/英文串语、无缺图或冲突后缀残留）。历史 `assets/screenshots/0.12.0/` 与 `assets/handbook/{v2..v5,en/v5}/` 均原样保留。

## 边界说明与本地体验入口

- **实测边界**：真机验收限定在 Windows 100% 缩放与 DSH `0.2.2-rc.5` Desktop/Web，未覆盖 macOS、Linux、高 DPI 物理缩放或 DSH `0.2.3-alpha.2`；双语离线演示资料未发起真实 AI 模型请求。
- **阶段二未执行项**：本轮未执行 `git push`、未创建/推送 `v0.13.0` 标签、未发布 GitHub Release、未提交市场 PR，等待独立复核与用户确认后再继续。
- **本地隔离体验入口**：`D:\DSH-Workspace\dsh-github-notebook\scripts\Open-Fatfish-Notes.cmd`（指向已安装最终候选 `9a529f8a...` 的 `.dsh-home/pure-001/release12-desktop`）。所有验收用后台进程均已关闭，日常 DSH 资料未改动。
- **本机证据目录**：最终包与校验文件位于 `dist/release-0130/`，双端双语截图与安装收据位于 `output/playwright/release-0130/`。
