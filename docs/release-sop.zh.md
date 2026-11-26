# 肥鱼笔记发版准备与验收标准作业程序（SOP）

本文汇总 `AGENTS.md`、[示例与展示准则](demo-content.zh.md)、[手册维护规则](../assets/handbook/README.md)与历次正式发版实践，作为每次准备新版本时的默认执行清单。所有阶段均遵循「先规划获批 → 完成候选与全项验收 → 暂停待复核/确认 → 正式公开与市场复核」的节奏；实践发现缺口需要修订本文时，按 `AGENTS.md` 约定提出并与用户确认后更新。

---

## 阶段零：发版前核对与规划（改代码前完成，逐项不得省略）

1. **工作区与基线核对**
   - 核对 `git status --short --branch`、`git worktree list` 与 [进行中的任务](README.md#进行中的任务)，确认无未收尾冲突或共享隔离资料占用。
   - 明确上一公开版本、当前远端 `origin/main` 与本地候选基线提交号，确定拟定版本号（补丁 / 次版本）及变更范围。
2. **宿主最新可用版本与固定项核对**
   - 分别核对并独立记录以下来源的版本，不混为一谈：
     - npm 官方标签：`https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags`（区分 `latest`、`next`、`alpha`）
     - 官方 GitHub Release：`https://github.com/deepseek-ai/deepseek-harness/releases`
     - Windows 更新源：`https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml`（含 `stagingPercentage` 与 `releaseDate`）
     - 本机已安装 DSH CLI 实测版本：`dsh --version`
     - 插件市场兼容判断规则（核对 `engines.dsh` 与 `peerDependencies`）
   - 若发现新版正式/候选宿主，按 `AGENTS.md` 执行兼容、优化与新机会评估，并核对**原生输入框附件固定项**（「接收文件 → 创建有效草稿附件 → 加入指定会话输入框 → 可见、可移除 → 发送后可读取」完整公开链路）。
   - 明确 `engines.dsh` 与 `peerDependencies` 是否沿用。**扩大兼容声明须用户另行明确批准**，且必须用同一候选包在目标新版 DSH 的隔离 Windows 桌面与 Web 两端实测安装、笔记读写、同步与会话转存。
3. **六份用户文档与随包手册逐份核对（禁止一笔带过）**
   - 必须**逐份通读**以下文档正文，按文件登记「需更新处」或「核对后沿用依据」，并在界面上按文档步骤实际走一遍关键按钮、附件示例与图注：
     - [中文 README](../README.md) 与 [英文 README](../README.en.md)
     - [中文图解使用说明](user-guide.zh.md) 与 [英文图解使用说明](user-guide.en.md)
     - [中文详细操作参考](user-guide-reference.zh.md) 与 [英文详细操作参考](user-guide-reference.en.md)（重点检查版本号、状态链接是否误指旧版、布局/配色数量、按钮原名、快捷入口、反馈入口及已退役能力残留）
     - 随包用户手册现行版本全部中英文篇章（见 [src/notes/handbook.ts](../src/notes/handbook.ts) 与 [assets/handbook/README.md](../assets/handbook/README.md)）：判断界面/操作变化是否需要升级内容版本（如 `v5 → v6`）；升级时严禁改写已发布历史种子，必须保留旧版本识别且不覆盖用户已有手册。
     - 项目开发文档：[docs/README.md](README.md)、[docs/notes-design.zh.md](notes-design.zh.md)。
4. **全量公开与图解配图逐张核对（禁止靠记忆判断）**
   - 实际打开查看 [screenshots.json](../screenshots.json)、`assets/screenshots/<上版>/{zh,en}/` 以及 `docs/images/user-guide/` 下全部图片。
   - 逐张判定并记录：**重拍 / 沿用 / 新增**及理由（重点排查已改版 UI、旧按钮、重复演示条目、冲突标题后缀、测试标签、裁掉图注所述关键控件等问题）。
   - 新版公开实拍放入独立版本目录 `assets/screenshots/<目标版本>/{zh,en}/` 并附 `README.md`，历史版本目录原样保留。
5. **规划获批后落盘**
   - 规划获用户批准后，在 `docs/plans/YYYY-MM-DD-release-<版本>.zh.md` 落盘并在 [docs/README.md](README.md#进行中的任务) 登记，再开始修改文件。

---

## 阶段一：实现收尾、图文同步与单一候选完整验收（对外发布前停止）

### 1. 代码收尾、手册升级与版本号对齐
- 完成本轮获批的修复/加固及对应单测、浏览器回归。
- 如需升级随包手册：新增 `assets/handbook/v<N>/` 与 `en/v<N>/`，更新 `src/notes/handbook.ts` 的 `handbookContentVersion` 与历史 `versions` 列表，更新 `assets/handbook/README.md` 及手册回归测试。
- 将 `package.json` 与 `package-lock.json` 根包版本更新至目标版本；创建 `docs/releases/<版本>/release-notes.md`（中英文）与 `docs/releases/<版本>/review.zh.md`。
- 逐份核对并按需更新上述 6 份面向用户文档与 `docs/README.md`、`docs/notes-design.zh.md`；内容仍然正确的文档注明沿用依据。

### 2. 第三档工程验证与单一候选打包
- 运行 `npm run typecheck`、`npm run build`，核对重建产物无意外差异。
- 运行全量回归 `npm test`，并运行全部独立浏览器回归入口：
  - `node test/browser/check-reading-tables.mjs`
  - `node test/browser/check-switcher-sidebar.mjs`
  - `node --import tsx test/browser/check-dialog-sizes.mjs`
- **说明**：`test/localization.test.ts` 负责校验证书级词表完整、无硬编码可见文案及 README/英文图解图片路径配对，**不等同于**验证全部正文相对链接、页内锚点或图注语义一致性；正文链接、锚点与图文语义须单独核查。
- **反例自查与表述克制**：涉及界面交互或异步逻辑改动时，冻结前不仅测顺畅路径，须主动用打断与边界场景自查（如操作中途后台数据返回、长列表滚动后再改条件、键盘与鼠标同时存在、重复操作或取消）；验收表与文字结论须与脚本或人工实际检查的步骤 1:1 对应，不写超出实测范围的总结。
- 准备独立输出目录 `dist/release-<版本>`（保留上一枚候选便于独立复核对照），打包带版本名归档，复制出逐字节一致的固定名 `dsh-fatfish-notes.tgz` 并生成校验文件 `dsh-fatfish-notes.tgz.sha256`：
  ```powershell
  New-Item -ItemType Directory -Force dist/release-<版本> | Out-Null
  npm pack --ignore-scripts --cache .npm-cache --pack-destination dist/release-<版本>
  Copy-Item -Force dist/release-<版本>/dsh-fatfish-notes-<版本>.tgz dist/release-<版本>/dsh-fatfish-notes.tgz
  $hash = (Get-FileHash -Algorithm SHA256 dist/release-<版本>/dsh-fatfish-notes.tgz).Hash.ToLower()
  "$hash  dsh-fatfish-notes.tgz" | Set-Content -Encoding ascii dist/release-<版本>/dsh-fatfish-notes.tgz.sha256
  ```
  - 记录冻结提交号、完整 SHA-256、精确字节数、总文件数，校验 `dsh-fatfish-notes.tgz` 与 `dsh-fatfish-notes-<版本>.tgz` 逐字节一致，且包内文件集合与冻结工作区匹配 `package.json#files`（无遗漏、无多余、无敏感文件）。
  - 从项目根目录运行 `npm run verify:candidate -- dist/release-<版本>`（需要 Python 3.8+ 的 `python` 命令及可写的临时目录）。脚本核对两份包和校验文件，用 npm 离线预览冻结工作区的打包清单，并逐文件比对内容。默认使用当前工作区，核验历史包时用 `--workspace <对应冻结目录>`。更换候选时追加 `--previous <上一枚候选.tgz>`，报告中的新旧差异供判断复测范围。
- **重打包与证据承接规则**：
  - 每次更换候选都须列出新旧包完整 SHA-256 与逐成员差异清单。
  - 若**仅修改 `README*.md`** 且所有 `lib/`、`locale/`、`assets/handbook/`、`package.json` 及依赖逐字节一致，可沿用前包的交互、性能与私库同步证据，但仍须重装全部隔离资料、核验完整文件集合与 SHA-256，并在最终摘要下至少补一次桌面/Web 启动与读回冒烟，在验收记录中写清「前包实测、最终包重装等价及最终包冒烟范围」。
  - 若修改了任意 JS、词表、手册资源、宿主清单或依赖，必须按影响面重新构建、跑第三档回归、重装全部隔离资料，并用**最终摘要**实测受影响交互与两端双语入口。

### 3. 隔离宿主实装与完整文件集合核对（串行使用 `.dsh-home/pure-001/`）
- 按隔离资料路径筛查确认无占用目标隔离资料的宿主或自建自动化进程（主机上其他无关 Electron 应用不妨碍验收）；绝不触碰日常 DSH 资料。
- 使用官方 DSH CLI 将**同一枚最终候选包**串行装入全部参与验收的隔离资料：
  - `.dsh-home/pure-001/release12-web`（`--profile web`）
  - `.dsh-home/pure-001/release12-desktop`（`--profile desktop`）
  - `.dsh-home/pure-001/bilingual-20261122/runtime/web`（`--profile web`）
  - `.dsh-home/pure-001/bilingual-20261122/runtime/desktop`（`--profile desktop`）
- 逐处比对已安装 `node_modules/dsh-fatfish-notes` 与最终候选包的**完整文件集合与内容 SHA-256**，明确核查缺失文件、多余文件与内容差异三类均为 `0`。
  在上述核验命令后为每处实装追加一个 `--installed <插件安装目录>`，例如 `--installed .dsh-home/pure-001/release12-web/profiles/web/node_modules/dsh-fatfish-notes`。命令列出各处差异。工作区、包或实装核验失败时返回非零退出码。

### 4. 实拍更新与原尺寸 / 展示宽度双尺度目视核对
- 从已安装候选按场景、尺寸、浅深色与语种分别拍摄需更新的公开实拍（`assets/screenshots/<版本>/{zh,en}/`）与图解实拍（`docs/images/user-guide/`），同步 `screenshots.json` 与 `assets/screenshots/<版本>/README.md`。
- 图片、字体、代码高亮、字数统计与目标状态必须在最终取景后重新核验，不可盲等固定延时。
- **每一张新拍与受影响图片都必须人工逐张查看**，并分别按**原尺寸**与**接近 README / 市场页面的展示宽度**核对（见 [demo-content.zh.md](demo-content.zh.md#用户文档与公开展示同步)）：
  - 核查清晰度、裁切、字数统计、外观同步状态、无跨语种泄露（英文图不可仅凭路径含 `/en/` 放行）、无重复同名占位、无冲突标题后缀或无关测试标签；
  - 从图注反查画面，确认图注中提到的每一个按钮、布局形态和入口都在画面内清晰可见；未拍入的快捷入口只在操作正文说明。
- 重新运行 `node --import tsx --test test/localization.test.ts`，并独立校验受影响文档的全部相对路径链接、图片路径与页内锚点。

### 5. 升级路径与随包手册专项验证
- **旧版升级兼容**：用留存的上一公开安装包（如 `0.12.0`）生成并编辑中英文旧版手册，再交由**最终候选包**打开/添加，确认保留既有笔记 ID、内容与修订历史且不被覆盖；验证旧版 `appearance.json` 与待写队列平滑迁移。
- **新版手册完整性**：用解包的最终候选分别验证中英文新空库自动初始化与手动添加，确认各自 3 章、6 处有效章节内链、封面图片与 2 份可读附件，并**实际按手册正文步骤**执行附件搜索与编辑属性练习（核对搜出附件名命中而非仅命中正文提及）。

### 6. 双端双语实机验收 + 侧栏回归
- 在当轮阶段零核定的最新官方 DSH 宿主版本（以当版 `review.zh.md` 实记为准）的隔离 **Windows 桌面** 与 **Web** 两端，分别以 **简体中文** 与 **英文** 四种组合串行验收：
  - 主界面与独立窗口（启动打开已有笔记、导航、编辑属性抽屉、`Alt+K` 快捷切换与键盘选择/`Esc`/二次打开清空、宽/窄窗口）
  - 外观设置（全部布局与色板计数、浅深色、设置 → 帮助反馈入口与语言切换无残留）
  - 随包手册与错误提示：**分项记证**「帮助入口可见」「实际打开已有章节或添加新副本」「典型失败提示在双语及切换后语种正确」「`pageErrors` 计数为 `0`」（说明 `pageErrors = 0` 仅证明无未捕获页面异常）
  - 会话侧栏（宽/窄/矮尺寸及串行运行 `npm run test:sidebar`）
  - 会话转存（宽窗三栏 / 窄窗紧凑切换、缩略图、取消与保存读回）
  - 单篇导出（含带附件 ZIP / PNG 核验，容量统一标注准确单位如 `MiB` 或 `MB`）
- 验收完毕按接手前记录的语言与主题恢复隔离资料（固定演示资料按其预设恢复）。

### 7. 发版前性能抽查（遵循 `AGENTS.md` 性能约定）
- 在同步空闲的隔离资料中抽查普通笔记打开、长文打开、切换笔记本、`Alt+K` 快捷面板呼出与保存后双窗口刷新。
- 性能表**逐行注明**：宿主与窗口尺寸、资料规模、同步状态、计时起止点、首次样本数 `n`（不足 5 次明确注明）、热切换样本数 `n`（常用操作 ≥ 5 次，报中位数与最大值）及原始记录/脚本位置。
- **严禁将不同冷热口径、窗口尺寸、页面或同步状态的历史数据拼作前后提速对比**；若要宣称优化提速，必须使用同宿主、同资料、同页面、同尺寸、同同步状态与同冷热口径做可比对照，否则仅报告本版观测值。

### 8. 指定私库在线双向同步验收
- 使用指定私库 `StarWind97/dsh-community-private-test`（`repositoryId: 1440762952`）实测双向闭环：一端新建/保存并同步至远端 → 另一端同步读回、编辑保存并推回 → 原端读回反向修订 → 将临时测试笔记移入回收站并同步清理，确认 `status: idle, pending: false`。
- 记录仅保留仓库 ID、笔记/修订号、最终状态与同步时间，不打印或保存任何凭据。
- 若本轮后续整改未改动同步实现、协议与仓库绑定，可沿用同一轮已核实的私库双向修订与远端清理证据，并在 `review.zh.md` 中标明来源与适用范围；若改动同步或存储，必须重新实测。

### 9. 阶段一收尾与待复核冻结（对外发布前停止）
- 关闭全部自建验收进程，按隔离资料路径复核无残留隔离 DSH 进程。
- 将冻结提交号、包路径、SHA-256、字节数、文件数、宿主实查记录、工程与浏览器回归、四组合验收、升级与手册、性能表、私库同步、实拍双尺度核对、未覆盖边界与隔离体验入口（[Open-Fatfish-Notes.cmd](../scripts/Open-Fatfish-Notes.cmd)）完整写入 `docs/releases/<版本>/review.zh.md` 与当版规划文档，明确区分**「本包实测」「沿用前包证据」「尚未验证」**。
- 在 [docs/README.md](README.md#进行中的任务) **保留「待独立复核 / 待阶段二发布确认」条目**（待阶段二全部完成后再清理）。
- 提交本地干净变更（**不推送远端、不打正式标签、不创建 Release 草稿或正式版、不改动市场**），核对本轮发布提交是否已推送（不假设远端 `origin/main` 必须停在上一公开版），输出标准 5 项交接摘要并**附上隔离体验脚本 `scripts/Open-Fatfish-Notes.cmd` 的绝对路径**，等待独立复核与用户批准阶段二。

---

## 阶段二：正式公开与市场复核（须用户明确批准后执行）

1. **发版前终检**：再次核对 npm `latest`/`next`、GitHub Releases 与 Windows 更新源无突发新版；核对待发布提交与已验收最终候选 `dsh-fatfish-notes.tgz` 的 SHA-256 一致。
2. **推送与创建 Release**：
   - 将本轮已验收提交推送至 `origin/main` 并确认远端 `main` 已包含目标提交号；
   - 创建 `v<版本>` 标签并推送；
   - 准备 Release 正文：将 `docs/releases/<版本>/release-notes.md` 中的**仓库相对链接全部转换为指向 `v<版本>` 标签或 `main` 分支的 GitHub 绝对链接**（参考 `dist/i18n-0120/publication/release-notes.md`）；
   - 先创建 GitHub Release 草稿，**仅上传固定名 `dsh-fatfish-notes.tgz` 与校验文件 `dsh-fatfish-notes.tgz.sha256`**（带版本名 `dsh-fatfish-notes-<版本>.tgz` 仅作本机留存），核对 GitHub 附件摘要一致后正式公开并设为 Latest。
3. **公开下载与市场双语复核**：
   - 分别从版本页下载链接与 `releases/latest/download/dsh-fatfish-notes.tgz` 匿名下载安装包，并下载公开的 `dsh-fatfish-notes.tgz.sha256`，独立校验 SHA-256、字节数、包内版本号与文件数全部一致；
   - 检查 GitHub 主分支中英文 README 及截图展示正常；
   - **市场更新决策**：核对上游 `awesome-dsh-plugin` 条目元数据（描述、截图清单、安装入口、兼容声明等）是否需要修改；仅当元数据有变化时提交市场 PR，否则沿用既有条目等待定时构建。
   - 市场构建完成后，实际访问[肥鱼笔记市场详情页](https://awesome-dsh-plugin.com/p/StarWind97/dsh-fatfish-notes/)并切换中英文，核对两语正文、配图、图解链接及固定安装入口（若市场尚未定时重建，先记录状态待重建后补验）。
4. **交付记录**：将发布提交号、GitHub 发布页、市场详情页及匿名下载校验结果补写进 `docs/releases/<版本>/review.zh.md` 与 `docs/README.md`，清理 [进行中的任务](README.md#进行中的任务)（市场尚未重建时可暂留重建补验一条），并在回复中分别列出 **GitHub 发布页、市场详情页与本机隔离体验脚本 `scripts/Open-Fatfish-Notes.cmd` 的绝对路径**。

---

## 回退与止损说明

- **回退依据与数据兼容**：每版发布说明与 README 均指明上一公开版本发布页与回退前提。`0.10.0–0.13.0` 共享同一笔记与私库存储结构，但涉及版本迁移（如自 `0.8.0` 升级至 v3/v4 资料或外观配置迁移）时，回退须配套兼容宿主与升级前备份（本机笔记资料夹及 `DSH_HOME/fatfish-notes`）。备份、历史修订与冲突恢复步骤见 [安装与升级](../README.md#安装与升级)、[详细操作参考 · 安装、升级与卸载](user-guide-reference.zh.md#安装升级与卸载) 与 [详细操作参考 · 备份与恢复](user-guide-reference.zh.md#备份与恢复)。
- **发布异常止损**：若公开后匿名下载校验失败、包内文件异常或宿主兼容故障，立即停止后续市场宣传与 PR 合并，在 `docs/releases/<版本>/review.zh.md` 记录异常摘要与时间，通知用户决定撤下/替换草稿或发布修补版；若仅插件市场定时重建尚未刷新，记录当前线上观测状态并在重建完成后补验，不以旧缓存冒充已生效。
