# 肥鱼笔记发版准备与验收标准作业程序（SOP）

本文汇总 `AGENTS.md`、[示例与展示准则](demo-content.zh.md)、[手册维护规则](../assets/handbook/README.md)与历次正式发版实践，作为每次准备新版本时的默认执行清单。所有阶段均遵循「先规划获批 → 完成候选与全项验收 → 暂停待复核/确认 → 正式公开与市场复核」的节奏；实践发现缺口时直接修订本文。

---

## 阶段零：发版前核对与规划（改代码前完成，逐项不得省略）

1. **工作区与基线核对**
   - 核对 `git status --short --branch`、`git worktree list` 与 [进行中的任务](README.md#进行中的任务)，确认无未收尾冲突或共享隔离资料占用。
   - 明确上一公开版本与当前候选基线提交号，确定拟定版本号（补丁 / 次版本）及变更范围。
2. **宿主最新可用版本与固定项核对**
   - 分别核对三处来源并记录版本：
     - npm 官方标签：`https://registry.npmjs.org/-/package/@deepseek-ai/dsh/dist-tags`（区分 `latest`、`next`、`alpha`）
     - Windows 更新源：`https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml`（含 `stagingPercentage`）
     - 本机已安装 DSH CLI 版本：`dsh --version`
   - 若发现新版正式/候选宿主，按 `AGENTS.md` 执行兼容、优化与新机会评估，并核对**原生输入框附件固定项**（「接收文件 → 创建有效草稿附件 → 加入指定会话输入框 → 可见、可移除 → 发送后可读取」完整公开链路）。
   - 明确 `engines.dsh` 与 `peerDependencies` 是否沿用，不凭未实测宿主扩大兼容声明。
3. **全量用户文档与随包手册逐章核对（禁止一笔带过）**
   - 必须**通读**以下全部文件正文并逐章列出需更新处，向用户说明目标版本、核对发现、拟更新章节与验证方式：
     - [中文 README](../README.md) 与 [英文 README](../README.en.md)
     - [中文图解使用说明](user-guide.zh.md) 与 [英文图解使用说明](user-guide.en.md)
     - [中文详细操作参考](user-guide-reference.zh.md) 与 [英文详细操作参考](user-guide-reference.en.md)（重点检查顶部/底部适用版本号、布局/配色数量、快捷入口、反馈入口及已退役能力残留）
     - 随包用户手册现行版本全部中英文篇章（见 [src/notes/handbook.ts](../src/notes/handbook.ts) 与 [assets/handbook/README.md](../assets/handbook/README.md)）：判断界面/流程变化是否需要升级内容版本（如 `v5 → v6`）；升级时严禁改写已发布历史种子，必须保留旧版本识别且不覆盖用户已有手册。
     - 项目开发文档：[docs/README.md](README.md)、[docs/notes-design.zh.md](notes-design.zh.md)。
4. **全量公开与图解配图逐张核对（禁止靠记忆判断）**
   - 实际打开查看 [screenshots.json](../screenshots.json)、`assets/screenshots/<上版>/{zh,en}/` 以及 `docs/images/user-guide/` 下全部图片。
   - 逐张判定并记录：**重拍 / 沿用 / 新增**及理由（重点排查已改版 UI、旧按钮、旧顶栏入口、视觉缺陷残留）。
   - 新版公开实拍放入独立版本目录 `assets/screenshots/<目标版本>/{zh,en}/` 并附 `README.md`，保留旧版本目录以便回溯。
5. **规划获批后落盘**
   - 规划获用户批准后，在 `docs/plans/YYYY-MM-DD-release-<版本>.zh.md` 落盘并在 [docs/README.md](README.md#进行中的任务) 登记，再开始修改文件。

---

## 阶段一：实现收尾、图文同步与单一候选完整验收（对外发布前停止）

### 1. 代码收尾、手册升级与版本号对齐
- 完成本轮获批的修复/加固及对应单测、浏览器回归。
- 如需升级随包手册：新增 `assets/handbook/v<N>/` 与 `en/v<N>/`，更新 `src/notes/handbook.ts` 的 `handbookContentVersion` 与历史 `versions` 列表，更新 `assets/handbook/README.md` 及手册回归测试。
- 将 `package.json` 与 `package-lock.json` 根包版本更新至目标版本；创建 `docs/releases/<版本>/release-notes.md`（中英文）与 `docs/releases/<版本>/review.zh.md`。
- 同步更新上述全部 6 份面向用户文档与 `docs/README.md`、`docs/notes-design.zh.md`。

### 2. 打包与第三档工程验证
- 运行 `npm run typecheck`、`npm run build`，核对重建产物无意外差异。
- 运行全量回归 `npm test`（含 `test/localization.test.ts` 双语词表、无硬编码文案、README 双语截图配对与路径校验、手册与存储/同步/安全栅栏全量测试）。
- 运行全部独立浏览器回归入口：
  - `node test/browser/check-reading-tables.mjs`
  - `node test/browser/check-switcher-sidebar.mjs`
  - `node --import tsx test/browser/check-dialog-sizes.mjs`
- 打包正式候选（产出固定名 `dsh-fatfish-notes.tgz`、带版本名 `dsh-fatfish-notes-<版本>.tgz` 及 `dsh-fatfish-notes.tgz.sha256`，二者逐字节一致）：
  ```powershell
  npm pack --ignore-scripts --cache .npm-cache --pack-destination dist/release-<版本>
  ```
- **注意**：若随后重拍的公开截图被计入仓库但不影响安装包内文件（`package.json#files` 不含 `assets/screenshots/` 与 `docs/images/`），确认包内文件与最终提交的 `lib/`、`locale/`、`README*.md`、`assets/handbook/` 等逐字节一致；若在打包后改了任何包内文件，必须**重新打包并重装核对 SHA-256**。

### 3. 隔离宿主实装与逐文件核对（串行使用 `.dsh-home/pure-001/`）
- 确认无残留 DSH/Electron 进程；绝不触碰日常 DSH 资料。
- 使用官方 DSH CLI 将**同一个最终候选包**分别安装到项目隔离资料：
  - `.dsh-home/pure-001/release12-web`（`--profile web`）
  - `.dsh-home/pure-001/release12-desktop`（`--profile desktop`）
- 逐文件比对两端已安装目录与候选包内全部文件的 SHA-256，确认数量与摘要完全一致。

### 4. 实拍更新与视觉质量核对
- 从已安装的**最终候选**（隔离 Web/Desktop）按场景、尺寸、浅深色与语种分别拍摄需更新的公开实拍（`assets/screenshots/<版本>/{zh,en}/`）与图解实拍（`docs/images/user-guide/`），同步 `screenshots.json` 与 `assets/screenshots/<版本>/README.md`。
- 图片、字体、代码高亮、列表计数与目标状态必须在最终取景后重新核验，不可盲等固定延时。
- **每一张新拍图片都必须人工逐张打开查看**（检查原尺寸清晰度、裁切、留白、文案语种、遮挡、截断与状态完整性），确保无中文泄漏到英文图、无旧版 UI 残留。
- 重新运行 `node --import tsx --test test/localization.test.ts` 验证所有本地图文路径、双语配对、`screenshots.json` 一致性与非重复。

### 5. 升级路径与随包手册专项验证
- **旧版升级兼容**：验证从上一公开版升级到当前候选后，旧外观配置与待写队列平滑迁移、已有旧版手册（如 v5/v4/v1）仍保留原修订且可直接打开、不被覆盖或重复生成。
- **新版手册完整性**：用解包的正式候选验证新空库自动初始化与手动按需添加两语种新版手册，逐项核对三章内容、笔记互链、封面图片与两份可下载附件。

### 6. 双语发布四组合实机验收 + 侧栏回归
- 在 DSH 最新官方版本（当前 `0.2.2-rc.5`）的隔离 **Windows 桌面** 与 **Web** 两端，分别以 **简体中文** 与 **英文** 四种组合串行验收：
  - 主界面（导航、列表、阅读、编辑属性抽屉、`Alt+K` 快捷切换、宽/窄窗口）
  - 外观设置（全部布局与色板计数、浅深色、设置 → 帮助反馈入口与语言切换无残留）
  - 随包手册打开/添加
  - 会话侧栏（宽/窄/矮尺寸与 `npm run test:sidebar`）
  - 会话转存（宽窗三栏 / 窄窗紧凑切换、缩略图、取消与保存读回）
  - 独立窗口（语言同步、临时明暗恢复、保存后双窗口刷新）
  - 单篇导出（含带附件 ZIP / PNG 核验）
- 验收完毕将隔离资料恢复为默认中文与浅色，记录 0 页面错误及四组合实测结果。

### 7. 发版前性能抽查（遵循 `AGENTS.md` 性能约定）
- 在同步空闲的同一隔离资料与 `1360 × 920` 独立窗口中抽查（报告资料规模、首次与热切换 ≥ 5 次的中位数和最大值，明确区分接口/渲染与宿主启动时间）：
  - 打开普通笔记
  - 打开长文
  - 切换笔记本
  - `Alt+K` 快捷面板呼出（墙钟与页内 `keydown → focusin`）
  - 保存后的双窗口刷新

### 8. 指定私库在线双向同步验收
- 使用指定私库 `StarWind97/dsh-community-private-test`（`repositoryId: 1440762952`）实测双向闭环：
  - 一端新建/保存测试笔记并联网同步至远端，核对远端修订；
  - 另一端同步读回该笔记，编辑保存并同步上传；
  - 原端及独立窗口读回反向修订；
  - 验收结束后移入回收站并同步清理临时测试笔记，确认无待上传变更。

### 9. 阶段一收尾与待复核冻结（对外发布前停止）
- 关闭全部自建后台进程，确认无残留 DSH/Electron 进程。
- 将包路径、SHA-256、文件总数、宿主版本、四组合验收、升级与手册、性能抽查、私库双向同步、实拍核对、未覆盖边界与隔离体验入口（[Open-Fatfish-Notes.cmd](../scripts/Open-Fatfish-Notes.cmd)）完整写入 `docs/releases/<版本>/review.zh.md` 与当版规划文档，清理 [进行中的任务](README.md#进行中的任务)。
- 提交本地干净变更（**不推送远端、不打正式标签、不创建公开 Release**，确保 GitHub `main` 在发布确认前仍对应上一公开版），输出标准 5 项交接摘要，等待人工或另一 Agent 复核并由用户批准阶段二。

---

## 阶段二：正式公开与市场复核（须用户明确批准后执行）

1. **发版前终检**：再次确认 npm `latest`/`next` 与 Windows 更新源无突发新版；核对待发布提交与已验收候选包 SHA-256 一致。
2. **推送与创建 Release**：
   - `git push origin main` 并确认远端 `main` 包含本轮发布提交；
   - 创建 `v<版本>` 标签并推送；
   - 先创建 GitHub Release 草稿，上传固定名 `dsh-fatfish-notes.tgz`、带版本名 `dsh-fatfish-notes-<版本>.tgz` 及校验文件 `dsh-fatfish-notes.tgz.sha256`，核对 GitHub 附件摘要一致后正式公开并设为 Latest。
3. **公开下载与市场双语复核**：
   - 从版本页与 `releases/latest/download/dsh-fatfish-notes.tgz` 匿名下载并比对 SHA-256 与包内版本号、文件数；
   - 检查 GitHub 主分支中英文 README 及截图展示正常；
   - 检查[肥鱼笔记市场详情页](https://awesome-dsh-plugin.com/p/StarWind97/dsh-fatfish-notes/)中英文正文、配图、图解链接及固定安装入口（若市场尚未定时重建，先记录状态待构建完成后复核）。
4. **交付记录**：将发布提交号、GitHub 发布页、市场详情页及匿名下载校验结果补写进 `docs/releases/<版本>/review.zh.md` 与 `docs/README.md`，并在回复中分别列出 GitHub 发布页与市场详情页。
