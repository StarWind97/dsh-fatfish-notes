# 肥鱼笔记 0.13.1 候选验收记录

- [发版规划](../../plans/2026-11-27-release-0131.zh.md) · [双语发布说明](release-notes.md) · [发版 SOP](../../release-sop.zh.md)
- 本轮在 `codex/release-0131` 准备候选，分支基线为 `13bed47ef1d6a368c520970ef24654bd41a4716a`。上一公开版为 [0.13.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.13.0)。

## 候选包与实装

- 固定名 `dist/release-0.13.1/dsh-fatfish-notes.tgz` 和带版本名的 `dsh-fatfish-notes-0.13.1.tgz` 逐字节一致，附绑定固定名的 `.sha256` 文件。279 个成员，18,264,931 字节，SHA-256 为 `55338b322b6e21d03cc5987f72e152f818924a0d3eeaf567bd6953276a22755f`。
- 上一公开包有 279 个文件，18,261,474 字节，SHA-256 为 `3721bc47b789d3c0cfecc261bd5589f0447bd2d504c3bfbdcfcdb6aeccb0012a`。与本包比较仅内容调整 9 项，分别为 `README.md`、`README.en.md`、`lib/client.js`、`lib/standalone.js`、`lib/domain/localization.d.ts`、`lib/import-worker.js`、`locale/zh.json`、`locale/en.json`、`package.json`。
- 初包 SHA-256 为 `4ccb1a31691885e5a6264abbbf87820f1cce9be08b5ee2dd983d2e44d2a2a499`，18,264,933 字节，保存在 `dist/release-0.13.1-r1/`。重打恢复 40 个随包文本的上一公包字节，同时将两份已改 README 的换行与上一包对齐。初包到候选只有这 42 项逐成员换行差异。与 0.13.0 比较，历史手册种子、示例附件、宿主依赖和 patch 文件字节一致。
- 官方 DSH CLI 串行安装四套隔离资料。双语资料使用它们现有的 pnpm 11。通过 `verify:candidate` 核对工作区、两份包及以下四处实装，均为 279 个文件，缺失、多余、内容差异都是 0。

| 主机资料 | profile |
| --- | --- |
| `.dsh-home/pure-001/release12-desktop` | desktop |
| `.dsh-home/pure-001/release12-web` | web |
| `.dsh-home/pure-001/bilingual-20261122/runtime/desktop` | desktop |
| `.dsh-home/pure-001/bilingual-20261122/runtime/web` | web |

工件日志在本轮 worktree 的 `output/playwright/release-0131/`，包括 `candidate-and-installed.log`、`candidate-r1-to-r2.log` 与四处安装记录。

## 宿主与兼容范围

- npm 的 `latest`、`next` 与 Windows nightly 更新源均为 `0.2.2-rc.5`，更新比例 100%。本机 CLI 和桌面文件版本相同。官方 GitHub 与 npm alpha 最新为 `0.2.3-alpha.2`，与上一版发版时相同。
- 本候选实测宿主为 Windows DSH `0.2.2-rc.5`，沿用 `engines.dsh` 与 DSH peer 区间 `>=0.2.2-rc.3 <0.2.3-0`。上版核对了 alpha.2 的原生输入附件接口，参见[宿主与兼容声明记录](../0.13.0/review.zh.md#二宿主版本与兼容声明核对)。
- 发版准备时，上游市场条目固定安装路径指向 GitHub Latest。双语市场页均返回 200，且引用本语种 0.13.0 的现行配图。[官方 DSH Releases](https://github.com/deepseek-ai/deepseek-harness/releases) · [市场条目](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/StarWind97__dsh-fatfish-notes.yml)

## 已核对的工程、实机与文档

- `npm run typecheck`、`npm run build`、三个独立浏览器入口通过。分别覆盖 PNG 表格宽度、快速切换混合输入和空列表、转存与共享弹窗的极小尺寸。
- 隔离 Desktop 与 Web 各走简体中文、英文。四个组合都实测三布局和六配色入口、代码显示两卡、字重 300/500 与字号 12/16 px 联动、折行、行号、深色阅读代码块，并经 Chromium CSS 查询确认内置 Cascadia Code 实际参与渲染。Web 用 520 px 视口，代码卡宽 470 px。Desktop 用 860 px 原生视口，代码卡宽 520 px。上述宽度均测得开启折行时无横向代码溢出、选项在卡片内、未捕获页面异常为 0。恢复双语资料至验证前的中文浅色显示和原代码偏好。原证据见 `appearance-{web,desktop}/receipt.json`。
- 解包两枚真实安装包，通过本地裸 Git 库验证简体中文和英文的 0.13.0 → 0.13.1 升级。现有 v6 笔记的 ID、修改后的正文和历史版本保留。另在新库验证自动初始化及手动添加，两语各三章、六个有效内链、一张可解码 PNG 封面、两份可读附件，且 CSV 文件名检索仅命中资料章节。外观旧配置值、相同操作 ID 去重及按旧存储 ID 应用排队设置通过。见 `upgrade-and-handbook.json`。
- 两种语言的代码设置和深色代码阅读图来自同一枚包的隔离 Web 实拍。原尺寸分别为 1000 × 405 和 1244 × 938，亦以约 735 px 展示宽度逐张核对。取景保留三篇互不重复的演示笔记，英文设置、标签页和正文呈现一致。实际字形、代码、表格和文件项与图注相符。[本轮实拍](../../../assets/screenshots/0.13.1/README.md)
- 首轮文档检查为 13 份文档、283 个本地链接、80 个锚点。五组公开场景的中英文图尺寸逐对一致，详见 `release-links.json`。

## 进行中的候选验收

全量回归、实装侧栏回归、双语真实流程、指定私库往返及性能抽查持续补录。候选准备完成后留在本地分支供独立复核。隔离桌面入口见 [Open-Fatfish-Notes.cmd](../../../scripts/Open-Fatfish-Notes.cmd)。
