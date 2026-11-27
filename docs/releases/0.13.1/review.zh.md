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
- 独立文档检查为 13 份文档、288 个本地链接、81 个锚点，未发现断链。五组公开场景的中英文图尺寸逐对一致，详见 `release-links.json`。

## 双端双语实机

- 本地候选输入提交为 `fd66da0cea7ec5be78327fd03399a08b00175ac1`。提交后重跑包和四处实装校验，仍为 279 个文件且零差异。固定名候选包的 SHA-256 保持一致。见 `post-commit-candidate-verify.log` 与 `candidate-freeze-receipt.json`。
- 全量 `npm test` 共 448 项通过，独立双语词表和配图检查 6 项通过。`npm run test:sidebar` 的实装侧栏回归 `run-sYP8Zj` 通过，宽栏 611 × 882、窄栏 343 × 822、矮栏 343 × 582，笔记本切换后确认 31 条结果。
- 桌面和 Web 两语均通过帮助入口打开已存在的 v6 章节，验证了封面解码、附件名搜索、编辑属性打开后取消，以及同名笔记本的本地化提示。切换至英文后，同一个会话侧栏标签同步变为英文。各轮记录 `pageErrors = 0`，检查的是未捕获页面异常。
- 桌面和 Web 两语均从真实会话转存入口测得对话框宽窗 1280 px 三栏、窄窗 556 px 紧凑布局。确认两张有效缩略图、取消后再打开保存、读回转存笔记及两份图片。Web 两语还验证了侧栏搜索有结果时选择，改为零结果后可查看已选并退出；退出后保留零结果状态。见 `flows-desktop-export-receipt.json`、`flows-web-capture-receipt.json` 与 `flows-web-first-receipt.json`。
- Desktop 与 Web 两语都在编辑、阅读及历史预览中实测对应代码字形。Chromium 记录块级和行内代码确有内置 Cascadia Code 字形参与渲染。
- Desktop 与 Web 两语都在主列表验证了从有结果到零结果隐藏多选、移走最后一个匹配项后仍能撤销、回收站筛空后隐藏清空入口。有结果时可以打开清空确认并取消。四个组合的独立阅读窗口也验证了零结果隐藏多选。两端的会话侧栏两语均验证了搜索后保留已选及退出。独立窗口在隔离浏览器中连接宿主提供的实际页面。记录为 `flows-desktop/receipt.json`、`flows-web/receipt.json`、`flows-desktop-selection-receipt.json` 和 `flows-web-capture-receipt.json`。
- 实机 Web 检查 `Alt+K` 打开、`Esc` 退出和重复呼出。键盘选中与重新打开时清空搜索分别有独立浏览器回归覆盖，仍待补齐双端双语的安装环境交互记录。
- 桌面与 Web 两种语言均读到实际生成的 ZIP 和 PNG，四份 ZIP 均含两份附件。见 `flows-desktop-export-receipt.json` 与 `flows-web-export-receipt.json`。

| 宿主 | 语言 | ZIP 字节 | PNG 像素 | PNG 字节 |
| --- | --- | ---: | --- | ---: |
| Desktop | 简体中文 | 4,194,593 | 788 × 794 | 118,438 |
| Desktop | English | 4,194,612 | 788 × 824 | 117,225 |
| Web | 简体中文 | 4,194,593 | 788 × 794 | 117,545 |
| Web | English | 4,194,612 | 788 × 824 | 116,347 |

### 待处理的窄窗问题

在 Windows DSH `0.2.2-rc.5` 原生窗口设为 520 × 760、保持 DSH 左侧栏打开，以英文检查代码显示卡片。插件区域宽 240 px，卡片宽 180 px。`Medium · 500` 按钮右缘超出卡片约 80 px，超出窗口约 45 px。另两档字重和三档字号均在窗口内。使用 `desktop-minimum-code-pane.json` 的原生窗口与页面坐标作为证据。脚本抓图超时。本轮停在现有候选，窄卡片内的字重排布调整待批准。

## 指定私库双向同步

同一候选在 `release12-web` 和 `release12-desktop` 的实装服务模块串行连接仓库 ID `1440762952`。隔离 UI 驱动的首次同步请求曾超时，后续用已安装模块直接调用保存和同步。下表记录服务层往返及最终状态。桌面和 Web 实机的读写界面另见上面的验收。测试笔记 ID 为 `01M8EY4AN8JMBW1P6N1DRD4K5F`。

| 2026-11-28 北京时间 | 已核对的步骤 | 修订 | 同步状态 |
| --- | --- | --- | --- |
| 00:42:06 | Web 新建、保存并推送 | `4530384f836d0bd0556264ac92a8b7234ee5b9dde63d1743be3404fa312f8b03` | `idle`，`pending: false` |
| 00:46:12 | Desktop 拉取 Web 修订，修改后推送 | `a8e2d1fccceda9ec1113e78f953b1e09b59ba58afe7676befcba94c2542eecf4` | `idle`，`pending: false` |
| 00:49:01 | Web 读回同一 Desktop 修订 | `a8e2d1fccceda9ec1113e78f953b1e09b59ba58afe7676befcba94c2542eecf4` | `idle`，`pending: false` |
| 00:49:50 | Web 将测试笔记移入回收站并同步 | `8a8f1b5a4a822c5d689f6c5b4db39014c2a66a7fdd029461d113b53108ad9142` | `idle`，`pending: false` |
| 00:53:59 | Desktop 拉取并确认已移入回收站 | `8a8f1b5a4a822c5d689f6c5b4db39014c2a66a7fdd029461d113b53108ad9142` | `idle`，`pending: false` |

原始记录为 `online-service-receipt.json`。一次 Web 实机验收重启遇到测试进程遗留的写锁。核对进程退出后归档原锁，再继续使用同一候选。

## 发版前性能抽查

同一安装包在 Windows DSH `0.2.2-rc.5` 隔离 Web 中实测。主要视口 1540 × 960，独立窗口 1280 × 860。演示资料查询返回 60 条，至少包含 60 篇。资料在断网测试模式下开始时为 `status: error, pending: true`。这是本地交互与刷新观测，同步空闲条件仍待复测。

| 操作 | 资料及窗口 | 计时起止 | 首次 `n=1` | 热测 `n=5` 中位／最大 |
| --- | --- | --- | ---: | ---: |
| 普通笔记打开 | 759 字符，主窗口 | 点击已完成搜索的结果至标题和阅读区出现且结束加载 | 569 ms | 360／393 ms |
| 长文打开 | 18,238 字符，主窗口 | 点击已完成搜索的结果至标题和阅读区出现且结束加载 | 461 ms | 422／464 ms |
| 笔记本切换 | 两个演示笔记本，主窗口 | 更改笔记本选择至目标笔记条目可见 | 221 ms | 280／293 ms |
| `Alt+K` 打开 | 演示库，主窗口 | 发送快捷键至面板可见 | 134 ms | 76／98 ms |
| 保存后自动刷新 | 长文测试笔记，主窗口与独立窗口 | 主窗口点击保存至独立窗口显示新增文本 | 2,043 ms | 1,997／2,553 ms |

每个动作的首样本为本次序列第一次，热测为后续五次。原始样本和清理状态见 `offline-ui-performance.json`，脚本为 `offline-ui-performance.cjs`。长文测试笔记已清理。当前数据仅列当版观测值。

## 候选交接

候选在本地分支留待独立复核。双语测试资料已恢复中文浅色及原有代码偏好，验收窗口关闭，四处插件写锁与对应的 .acquire 文件和两处 Electron 锁共十个路径均无残留。520 px 原生窄窗问题待决定修复范围。正式发布待阶段二确认。隔离桌面入口装有本候选，使用 `release12-desktop` 及配套 `release12-shell`。[Open-Fatfish-Notes.cmd](../../../scripts/Open-Fatfish-Notes.cmd)
