# 肥鱼笔记 0.13.1 发布与验收记录

- [发版规划](../../plans/2026-11-27-release-0131.zh.md) · [双语发布说明](release-notes.md) · [发版 SOP](../../release-sop.zh.md)
- 本轮在 `codex/release-0131` 准备候选，分支基线为 `13bed47ef1d6a368c520970ef24654bd41a4716a`。上一公开版为 [0.13.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.13.0)。

## 三档字重折行后的候选

- 折行后候选的冻结输入为 `858aeb3fd3498d06c81f1dc2e2b0dd6fdfd486b2`，提交后逐文件核对结果见 `output/playwright/release-0131-narrow/post-commit-verify.log`。
- 当前复核使用 `dist/release-0.13.1-narrow/dsh-fatfish-notes.tgz`。固定名与带版本名的 `dsh-fatfish-notes-0.13.1.tgz` 逐字节一致，都是 279 个文件、18,265,036 字节。SHA-256 为 `7365e9a8311c1ed803607beab26158b25eb326520e36c182c13052deabb92419`。
- 与折行前 `55338b322b6e21d03cc5987f72e152f818924a0d3eeaf567bd6953276a22755f` 的候选比较，成员差异只有 `lib/client.js` 和 `lib/standalone.js`。调整限于字重按钮组，由按钮内容所需宽度决定分行。字号按钮仍在一行。首轮生成的 `lib/onboarding/cli.js` 出现四处换行差异，按等价的 LF 检出重建后与前包逐字节一致。
- 使用官方 CLI 重装 `release12-desktop`、`release12-web` 和固定双语桌面、Web 四处隔离资料。`release12-web` 沿用原有 pnpm 10 与本机缓存。`verify:candidate` 核对四处均为 279 个文件，缺失、多余、内容差异均为 0。记录见 `output/playwright/release-0131-narrow/final-candidate-and-installs.log`。
- `npm run typecheck`、`npm run build`、`npm test` 的 448 项全量回归、三个独立浏览器检查与实装 `npm run test:sidebar` 通过。实装侧栏结果位于 `output/playwright/search-sidebar/run-XBIcIO/`。

| 实装页面 | 桌面原生或浏览器宽度 | 中英文结果 |
| --- | --- | --- |
| Windows Desktop，DSH 左栏展开 | 520 × 760，内容宽 240 px | 三档字重各一行，三个字号在同一行，按钮及完整文字在卡片和视口内 |
| Windows Desktop，DSH 左栏展开 | 600 × 760 | 字重按两行排列，较宽设置页及拉宽后一行 |
| Web | 240 × 760 浏览器视口 | 内容宽 240 px，三档字重各一行，按钮及完整文字在卡片和视口内 |
| Web | 520 × 760 浏览器视口及拉宽后 | 字重和字号各组仍为一行 |

四种宿主和语言组合都逐档实测 300、400、500。鼠标切换前两档，从中档按 `Tab` 转至最后一档并按 `Enter` 可切换到 500。预览的实际字重与选中值一致。未捕获页面异常为 0，恢复了原字重、双语资料的简体中文及桌面侧栏状态。原生桌面截图和逐项结果见 `output/playwright/release-0131-narrow/desktop-{zh,en}-narrow.png`、`narrow-desktop.json` 和 `narrow-web.json`。

下面保留折行前候选的广泛验证。两个新旧包只在界面构建成员中有上述差异。私库双向修订、升级和离线性能沿用前包记录。联网空闲性能和双端双语反馈入口由冻结候选补验，见下文。

## 折行前候选的包与实装

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
- 桌面与 Web 两语的实装 `Alt+K` 均通过。实测 `Esc` 退出、再次打开自动聚焦且搜索清空、按 `Enter` 打开所选演示笔记，未捕获页面异常为 0。见 `quick-web/receipt.json` 与 `quick-desktop/receipt.json`。
- 桌面与 Web 两种语言均读到实际生成的 ZIP 和 PNG，四份 ZIP 均含两份附件。见 `flows-desktop-export-receipt.json` 与 `flows-web-export-receipt.json`。

| 宿主 | 语言 | ZIP 字节 | PNG 像素 | PNG 字节 |
| --- | --- | ---: | --- | ---: |
| Desktop | 简体中文 | 4,194,593 | 788 × 794 | 118,438 |
| Desktop | English | 4,194,612 | 788 × 824 | 117,225 |
| Web | 简体中文 | 4,194,593 | 788 × 794 | 117,545 |
| Web | English | 4,194,612 | 788 × 824 | 116,347 |

### 折行前的窄窗复现

在 Windows DSH `0.2.2-rc.5` 原生窗口设为 520 × 760、保持 DSH 左侧栏打开，以英文检查代码显示卡片。插件区域宽 240 px，卡片宽 180 px。`Medium · 500` 按钮右缘超出卡片约 80 px，超出窗口约 45 px。另两档字重和三档字号均在窗口内。原生窗口与页面坐标记录见 `desktop-minimum-code-pane.json`。后续在同一安装包上补拍左栏展开及收起的对照图。

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

## 冻结候选的联网性能抽查

Windows DSH `0.2.2-rc.5` 隔离 Web 实装冻结候选后连接指定私库。资料列表首批返回 60 条，活动笔记超过 60 篇。主窗口 1540 × 960，独立窗口 1280 × 860。空闲指 `status: idle, pending: false`。

| 操作 | 资料与窗口 | 同步状态 | 计时起止 | 首样本 `n=1` | 后续 `n=5` 中位／最大 |
| --- | --- | --- | --- | ---: | ---: |
| 普通笔记打开 | 4,072 字符，主窗口 | 起止空闲 | 点击已搜到的结果至标题和阅读区出现且结束加载 | 632 ms | 463／475 ms |
| 长文打开 | 16,558 字符，主窗口 | 起止空闲 | 点击已搜到的结果至标题和阅读区出现且结束加载 | 426 ms | 471／485 ms |
| 笔记本切换 | 2 个笔记本，主窗口 | 起止空闲 | 选择笔记本至收到对应列表并在页面显示该列表条目 | 367 ms | 321／386 ms |
| `Alt+K` 打开 | 隔离资料，主窗口 | 起止空闲 | 发送快捷键至面板可见 | 175 ms | 93／110 ms |
| 保存后双窗自动刷新 | 长文测试笔记，主窗口和独立窗口 | 开始空闲，保存后可产生待同步 | 主窗口点击保存至独立窗口自动显示新文本 | 3,775 ms | 2,515／3,142 ms |

同一枚包分三轮完成。保留第一轮有效的普通笔记、长文和快捷面板数据，第二轮补测笔记本切换，第三轮通过实装宿主的独立窗口入口测自动刷新。首样本是各动作在本轮序列的第一次，每项样本数均为 1，后续热测每项 5 次。同步在只读样本中途变为忙碌的记录列于原始结果，不计入表内。

6 次保存后均在独立窗口看到新文本，无需手动刷新。临时独立窗口端点用毕恢复，测试笔记 `01M8F3PBXN24GQ7DDR3CDTQ2MN` 移入回收站并同步，最终为 `idle` 且 `pending: false`，最近成功时间为北京时间 2026-11-28 02:38:16。最后测试未捕获页面异常为 0。结果见 `output/playwright/release-0131-publication/online-idle-performance.json`，复现脚本为同目录 `online-idle-performance{,-follow-up,-passive}.cjs`。

## 独立复核与反馈入口补验

- 两个只读复核分别按仓库约定和发版范围核对，从 `v0.13.0` 至冻结提交 `858aeb3`。约定复核核对了冻结包、图文、词表及样式注入，补写内置字体的样式注入位置。预览里的 Light、Regular、Medium 是两语共用的字重名称。范围复核核对了实装范围、功能差异、退出与撤销路径。两轮复核发现的联网性能、反馈入口、冻结提交和回退前提均已补验或补记。
- Windows Desktop 与 Web 两端均用冻结候选打开中英文「设置 → 帮助」。四种组合的反馈名称、提示、打开新标签的行为属性及 GitHub 目标地址均匹配，未捕获页面异常为 0，测试后恢复中文。核验了入口和链接属性。记录见 `output/playwright/release-0131-publication/feedback-{desktop,web}.json`。
- 隔离 Web 暂停回收站的一次实际查询请求以观察响应缓慢时的界面。待返回时仍显示 27 行，清空入口在这段时间可用。本轮实测零条响应返回后「多选」与「清空回收站」均隐藏。已有确认步骤仍适用，本轮延迟测试只观察控件。详情见 `output/playwright/release-0131-publication/feedback-web.json`。

## 折行前候选的离线性能参考

同一安装包在 Windows DSH `0.2.2-rc.5` 隔离 Web 中实测。主要视口 1540 × 960，独立窗口 1280 × 860。演示资料查询返回 60 条，至少包含 60 篇。资料在断网测试模式下开始时为 `status: error, pending: true`。这是本地交互与刷新观测，作为离线记录保留。

| 操作 | 资料及窗口 | 计时起止 | 首次 `n=1` | 热测 `n=5` 中位／最大 |
| --- | --- | --- | ---: | ---: |
| 普通笔记打开 | 759 字符，主窗口 | 点击已完成搜索的结果至标题和阅读区出现且结束加载 | 569 ms | 360／393 ms |
| 长文打开 | 18,238 字符，主窗口 | 点击已完成搜索的结果至标题和阅读区出现且结束加载 | 461 ms | 422／464 ms |
| 笔记本切换 | 两个演示笔记本，主窗口 | 更改笔记本选择至目标笔记条目可见 | 221 ms | 280／293 ms |
| `Alt+K` 打开 | 演示库，主窗口 | 发送快捷键至面板可见 | 134 ms | 76／98 ms |
| 保存后自动刷新 | 长文测试笔记，主窗口与独立窗口 | 主窗口点击保存至独立窗口显示新增文本 | 2,043 ms | 1,997／2,553 ms |

每个动作的首样本为本次序列第一次，热测为后续五次。原始样本和清理状态见 `offline-ui-performance.json`，脚本为 `offline-ui-performance.cjs`。长文测试笔记已清理。当前数据仅列当版观测值。

折行前曾在联网隔离 Web 观察 40 秒，期间同步仍忙碌。该轮仅保留状态记录，见 `idle-ui-performance-probe.json`。折行后的有效空闲抽样见上节。

## 候选交接

冻结候选的独立复核与补验已完成。双语测试资料已恢复中文浅色及原有代码偏好，验收窗口关闭，四处插件写锁与对应的 .acquire 文件和两处 Electron 锁共十个路径均无残留。修订后的 520 px 原生窄窗字重已完成双语复测。用户已批准通过发版复核后直接发布。隔离桌面入口装有本候选，使用 `release12-desktop` 及配套 `release12-shell`。[Open-Fatfish-Notes.cmd](../../../scripts/Open-Fatfish-Notes.cmd)

## 发布与市场

- 北京时间 2026-11-28 02:43:12 正式公开并设为 GitHub Latest。发布提交 `518f7ffb4485a84728a4f297cdf76202179e984e` 已合入并推送至 `main`。附注标签 `v0.13.1` 的标签对象 `0bc80011cb15ae954cb775e697d89818288d5a93` 指向该提交。冻结提交之后只补充说明和验收文档。发布前再次核对 npm、官方 GitHub 和 Windows 更新源，Windows 实测宿主仍为 `0.2.2-rc.5`。记录见 `output/playwright/release-0131-publication/official-dsh-preflight.json`。[GitHub 发布页](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.13.1)
- 草稿仅上传固定名安装包及 SHA-256 文件。GitHub 返回的两个摘要分别与本地冻结包和校验文件一致。发布后从版本入口及 Latest 分别匿名下载两个文件，两份安装包均为 18,265,036 字节、279 个文件，包内版本为 `0.13.1`，SHA-256 为 `7365e9a8311c1ed803607beab26158b25eb326520e36c182c13052deabb92419`。两个校验文件均为 89 字节且内容与冻结包匹配。记录见 `output/playwright/release-0131-publication/public-downloads-verified.json`。[版本安装包](https://github.com/StarWind97/dsh-fatfish-notes/releases/download/v0.13.1/dsh-fatfish-notes.tgz) · [最新版安装包](https://github.com/StarWind97/dsh-fatfish-notes/releases/latest/download/dsh-fatfish-notes.tgz) · [版本校验文件](https://github.com/StarWind97/dsh-fatfish-notes/releases/download/v0.13.1/dsh-fatfish-notes.tgz.sha256)
- GitHub `main` 的中英文 README 渲染均已核对，两语各有五张截图及对应图解链接。十个线上截图对象与仓库相同，两种语言的代码阅读和代码设置图均采用本版实拍。正式发布说明中的 8 处链接均为 GitHub 绝对地址。记录见 `output/playwright/release-0131-publication/github-readme-verified.json`。[中文 README](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/README.md) · [英文 README](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/README.en.md)
- 北京时间 2026-11-28 02:44:49 实查市场中英文详情均为 HTTP 200。页面仍显示 `0.13.0` 正文和各四张配图，图解各自链接对应语言。两页及市场 `plugins.json` 的安装入口均为已验证下载到 `0.13.1` 的 GitHub Latest 固定地址。上游条目沿用现有安装位置。记录见 `output/playwright/release-0131-publication/market-after-publication.json` 与同目录 `market-listing-verified.json`。[中文市场页](https://awesome-dsh-plugin.com/zh/p/StarWind97/dsh-fatfish-notes/) · [英文市场页](https://awesome-dsh-plugin.com/p/StarWind97/dsh-fatfish-notes/) · [市场条目](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/StarWind97__dsh-fatfish-notes.yml) · [市场公开目录](https://awesome-dsh-plugin.com/plugins.json)
- 市场上游最近构建在本版公开前已结束，结果为失败。市场中英文正文和新增配图待下一次成功重建后核对。市场网页目录收录本插件的 GitHub 安装地址。市场另设的 format 1 索引目前只导出带 npm 版本的条目，本插件通过 GitHub 安装包发布。宿主内出现可更新提示的时机未用日常资料实测。[市场构建](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/actions/runs/46035749542) · [format 1 生成逻辑](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/scripts/lib/market-index.mjs)
