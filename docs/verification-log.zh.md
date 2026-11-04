# DSH笔记验证记录

2026-11-04 更新。当前正式版为 `0.5.0`，[GitHub Release](https://github.com/StarWind97/dsh-github-notebook/releases/tag/v0.5.0)已发布。第 5 步发布核验、第 5 步材料准备及第 4 步候选记录分别保留在下方，区分本轮实测、既有证据和未覆盖边界。

## 验证环境

已验证 Windows / Node 24.21.0 / DSH 0.2.1-rc.5。真实宿主使用项目内 `.dsh-home/pure-001/` 的隔离 Web 与原生 Desktop，真实 GitHub 使用[项目协作约定](../AGENTS.md#隔离验收与交付)指定的私有测试库。

跨端验证使用同一台 Windows 电脑上的两个独立实例。macOS 和两台物理电脑之间的使用待实测。下文列出的日志与图册是本机忽略资料。

## 第 5 步：正式发布

2026-11-04 用户明确指示进入发布流程，沿用已审核的版本、定位、图标、截图和收录条目。北京时间 17:46 发布 `v0.5.0`，为正式版，非草稿、非预发布。标签固定到 `6ef5d24390faf27f72e89815008f86383f1a9e81`。代码仓库简介和 `dsh-plugin` 等主题已设置；未更改仓库可见性，未发布 npm。

- 已上传 `dsh-github-notebook-0.5.0.tgz` 与 `SHA256SUMS.txt`。安装包大小 14,216,828 字节，SHA-256 为 `e9ab50a0a8f26146a0bfad9b0bb05680c882f3e15c5f38228c94348b6f86b316`，与用户审核文件一致。
- 通过不携带账号认证的公开下载，核对安装包、校验文件、PNG 图标和 4 张截图，7 个文件的哈希均与本机来源一致，证据为 `.dsh-home/pure-001/publish-prep/public-download.json`。
- 用匿名下载的安装包在 `publish05-desktop` 与 `release12-web` 两份隔离 profile 实际安装；两份全部 126 个文件与发布包逐项哈希一致。日志为 `public-install-*.log`，核对结果为 `package-verification.json`。未修改日常 DSH 资料。
- 本次发布没有功能、依赖或存储格式变化，沿用材料准备阶段通过的类型检查、构建及 197 项全量回归，不为上传相同文件重复全量测试。macOS 等未覆盖范围保持下文说明。

[市场收录申请 #11960](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11960)已创建，只新增 `data/plugins/StarWind97__dsh-github-notebook.yml`，8 行，无其他文件改动。申请分支为个人 fork 的 `codex/add-dsh-notebook-0-5-0`，条目提交为 `21675608abda63a5aa426d51d3644af3afd38c8d`。已核对 fork 来源和申请差异。自动校验已启动，结果见 [PR check](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/actions/runs/41811002480)。维护者尚未合并；不视作已在市场上架。

## 第 5 步：发布材料准备

以下为正式发布前的材料审核记录。当时将版本标识改为 `0.5.0`，补充中英文介绍、Release 正文、市场条目、PNG 图标及 4 张展示截图；没有源码、运行构建产物、依赖版本或存储格式变化。审核期间材料留在本机，未提交推送。

用户随后确认展示名称 **DSH Notebook · 私人笔记管理**。已统一首页、发布说明、市场条目及本地审核页，并重新打包：当前待审包为 **14,216,828 字节**，SHA-256 为 `e9ab50a0a8f26146a0bfad9b0bb05680c882f3e15c5f38228c94348b6f86b316`。与下述已安装验收的材料包相比，仅中英文 README 两个文件变化，其余 124 个文件逐项哈希一致，记录为 `publish-prep/name-confirmation.json`。名称修订按文档档检查差异、57 处本地链接和市场条目格式，并查看审核页，不重复全量回归或宿主安装；此前的类型、构建、197 项回归与运行验证继续适用。名称确认不表示正式发布已获批准。

- 按第三档完成类型检查、构建和 197 项全量回归：197 通过，0 失败、0 跳过。日志位于 `.dsh-home/pure-001/publish-prep/checks.log` 与 `regression.log`。本轮一次全量运行通过。
- 名称确认前的首次材料包为 14,216,768 字节，126 个文件，现保留在 `publish-prep/before-name-confirmation/`。SHA-256 为 `af1b09fc2d402642f3c5766ca27dba8d11c7185d9a68e8c6e2a2fe5cc154f7a4`。包清单、文件边界和许可证检查通过；针对常见 GitHub 令牌及私钥头的模式扫描没有发现匹配，不等同于全面安全审计。
- 在全新隔离 `publish05-desktop` 和已有 `release12-web` 安装最终包，两份全部 126 个文件逐项哈希一致。已有 Web 实例可重新打开原示例笔记与归档图片。安装日志与 `package-verification.json`、`upgrade-evidence.json` 位于上述目录。
- 全新原生桌面已打开插件，确认首次设置、准备工具步骤及 GitHub 说明可见，记录为 `fresh-install.json`。测试脚本最初对步骤标题的精确定位不匹配，改为识别实际带序号的标题后通过页面检查；之后原生 `capturePage` 截图调用未返回，核对专用资料路径后关闭该验收实例。该次截图不计入成功证据，未据此修改产品代码。可通过 `.dsh-home/pure-001/Open-Release05.cmd` 重新打开此全新体验入口。
- 在隔离 DSH 制作阅读、深色编辑、导出和会话多轮选材截图，逐张查看；只使用合成会话、示例笔记和本项目生成的流程图，不涉及日常 DSH 资料。示例笔记实际同步至指定私有测试库。市场展示图片位于 `assets/screenshots/`，与忽略目录中的测试证据分开。
- 上游收录项目 `c4261924d2d8845901faaae5d0e6301a75afafa5` 的 `readEntries` / `validateEntries` 校验本地条目通过。图标为 180 × 180 PNG，`screenshots.json` 的 4 张图片路径均存在。尚未执行市场 PR CI；尚未检查发布后才会存在的匿名下载地址。
- 只读确认代码仓库已经公开，本轮未更改可见性；尚无 Release。本轮没有创建标签、Release、市场 PR 或 npm 发布。确认后再进行对外操作，材料与分工见[发布审核清单](releases/0.5.0/review.zh.md)。

本轮不重复真实账号登录、新建远端库、模型付费调用和全部桌面导出流程；相关已验证行为与未覆盖边界沿用下方记录。macOS 与两台物理电脑间的长期使用仍未实测。

## 第 4 步候选

`0.5.0-rc.12` 完成类型检查、构建及 197 项全量回归，全部通过，无跳过。新增 4 项锁恢复用例，覆盖杀死持锁进程、同时恢复、活动与损坏锁保留、失败及取消后释放。既有 3 MiB 正文 HTTP 保存用例本轮通过。

- 全量首次在受限环境执行时，文件硬链接被系统拒绝；定位为 `EPERM` 后，在项目隔离临时目录以正常权限重跑，197 项通过。类型与构建日志为 `release12-checks.log`，最终回归以 `release12-regression.log` 为准。
- 全新 Web、全新 Desktop 和两份既有隔离 profile 已安装候选包；每份全部 124 个文件与包来源逐项核对。安装证据为 `release12-installed.json`，旧候选包保留。
- 全新 Web 实际完成首次接入已有专用私库、资料恢复、手动标题／摘要／标签／Markdown 编辑及本地图片导入。核对取消草稿、标签筛选清除、正倒序、回收站恢复、宿主深浅色、全宽和窄窗口。
- 从笔记实际下载 Markdown、图文 ZIP、PDF、长图和分页图片，核对标签／摘要排除、归档图片与取消弹窗。文件保存在 `output/playwright/release12/files/`。
- 仅切断本轮 Web 宿主的代理连接，实际离线编辑并保存在本机，界面显示尚未同步。恢复代理后未手动触发同步，146 秒后自动上传完成。这是本次网络与重试时序，不是固定同步耗时。
- 实际宿主保留活动进程的同步锁，并成功恢复已退出进程的同步锁。Web 证据为 `release12-web.json`，截图为 `output/playwright/release12/`。
- 从既有合成会话实际导出当前问答、自选 5 条和整个会话 8 条消息，核对图文 ZIP 图片字节、PDF、长图、分页图片和缺图提示；导出前后笔记数量不变。证据为 `release12-export.json`，文件与截图为 `output/playwright/release12-export/`。
- 从真实会话界面选择两轮共 4 条消息和一张图片转存，手动修改正文后核对只读原始素材未变，已同步到指定测试私库。证据为 `release12-capture.json`，截图为 `output/playwright/release12-capture/`。
- 本轮新建的原生 Desktop profile 接入同一测试私库，读回 Web 的相同修订、正文、摘要、标签与图片字节，滚动后确认图片实际显示；原生下载 PDF 完成，并取得阅读、编辑截图。证据为 `release12-native.json`。桌面自动化需将本次隔离窗口置前以正常绘制，窗口渲染等待失败未计为产品通过。
- 在已关闭的 Web 隔离 profile 实际卸载并重装，147 个笔记及控制文件哈希全部不变。证据为 `release12-reinstall.json`。重装后再检查笔记可读取及安装文件一致。

本轮证据文件均位于项目内 `.dsh-home/pure-001/`。上述完整验收对应的基础包 SHA-256 为 `86a799538819ed036a4687befe4204afd0b1116ed830ca402d0649822c966a81`，已保留带哈希名称的副本；当前体验包包含下述样式修补。

### 体验反馈：吸顶区域留白

2026-11-04 将阅读与编辑区顶部留白由随宽度变化的 18–48 像素缩为固定 8 像素，并让吸顶背景覆盖该留白，防止正文透出。只修改 CSS，按第一档完成构建及实际页面检查，未重复全量回归。

- 隔离 Web 先复现旧版顶部正文透出，再检查深色／浅色 1280 像素窗口、深色全宽 2040 像素窗口、浅色窄窗 800 像素。顶部留白均为 8 像素，功能区和格式工具栏衔接，遮挡检查全部通过。截图位于 `output/playwright/sticky12/`，证据为 `sticky12-before.json`、`sticky12-after.json`。
- 更新隔离 Web、`release12-desktop` 与 `desktop-home` 安装；Web 核对客户端文件哈希，两个已关闭的桌面实例各核对包内全部 124 个文件。未改笔记正文或原始素材。安装证据为 `sticky12-installed.json`。
- 当时的样式修补包 SHA-256 为 `e4d3493aadb739de00c90ff378bf491d19d89ebdeda10f353f846fbd05976698`，按哈希保留；当前体验包另含下述新手引导。

### 体验反馈：新手初始化引导

2026-11-04 按用户批准补齐「准备同步工具 → 登录并选择云端笔记库 → 确认保存位置并同步」。解释本机与用户 GitHub 私有库的保存方式，增加注册、工具安装帮助及可见的错误提示，首次使用默认推荐新建。存储格式、身份校验、同步与已有绑定逻辑未改变。

- 按第二档通过类型检查、构建和 `test/notebook-setup.test.ts` 的 2 项专项测试。首次受限运行因本机回环连接被拒绝而失败，以正常权限执行后全部通过。未重复全量回归。日志为 `guide12-checks.log`、`guide12-focused.log`。
- 隔离 Web 用仅影响测试进程的 PATH 与空 GitHub CLI 配置，实测缺少工具、未登录两种环境。安装帮助、注册入口、禁用继续、重新检测均符合状态；没有卸载系统工具或退出用户的 GitHub 登录。
- 登录等待、验证码展示、失败后重试、仓库访问失败及网络失败使用浏览器模拟响应验证。核对等待期间不能重复发起登录，错误提示在 820 像素高的窗口中自动进入可见区域；不把模拟状态算作真实授权成功。
- 真实 GitHub 仅对指定已有测试私库进行预检，进入只读确认页并返回，核对账号、名称、资料夹及未同步状态。未点击确认连接、未新建云端仓库；沿用已有认证。另在已绑定的隔离 Web 中确认显示「已完成首次同步」，原绑定保留。
- 检查默认新建与 `dsh-notes`、名称与默认目录联动、手动目录、返回修改、深浅色及窄窗口无横向溢出。实际页面截图图册为 `output/playwright/guide12/index.html`；证据为 `guide12-ui.json`、`guide12-normal.json`、`guide12-bound.json`。
- 最终包安装到两份隔离 Web 与 `release12-desktop`、`desktop-home` 两份已关闭的桌面资料，各核对 124 个安装文件。证据为 `guide12-installed.json`。未动日常 DSH 资料，测试启动的进程已关闭。

候选尚未发布，版本仍为 `0.5.0-rc.12`。当前 `dist/dsh-github-notebook-0.5.0-rc.12.tgz` 的 SHA-256 为 `311a99c24cd2b4b41233f82c1262672064de821cad2e3bca75f14d0bd244b67c`。此前完整回归与各次体验修补的包按哈希分别保留。

## 此前候选

`0.5.0-rc.11` 在 2026-11-03 完成类型检查、正式构建及会话选材、导出和原保存入口的 60 项专项测试，全部通过。当前候选的全量回归安排在第 4 步。此前 `0.5.0-rc.10` 的 190 项全量回归全部通过，无跳过。

- 隔离 Web 使用四轮合成会话，实际下载当前问答 2 条、自选消息 5 条和整个会话 8 条。核对角色、顺序、含图 ZIP 的相对路径与图片字节，打开 PDF、长图和分页图片 ZIP。故意缺失的图片在下载前提示，用户继续后文件保留缺图说明。
- 隔离原生 Desktop 实际下载当前问答 Markdown，宿主报告下载完成，文件包含预期的两条消息。取消导出与重新打开保存入口后，笔记列表保持原数量，导出过程只生成文件。
- 安装包 `dist/dsh-github-notebook-0.5.0-rc.11.tgz` 的 SHA-256 为 `4211a2a5c9543d577e0b94a0eafef6fd04418a5f761e8315bf2fd7c64c19d2f1`，三份隔离安装的全部 124 个文件已逐项核对。
- 证据为 `.dsh-home/pure-001/export11-final-tests.log`、`export11-ui.json`、`export11-native.json`。图册与实际下载文件入口为 `output/playwright/export11/index.html`。

## 核心流程的既有覆盖

以下均为 2026-11-03 对相应候选版本的验收。

| 范围 | 已覆盖 | 主要证据 |
| --- | --- | --- |
| 仓库默认名与已有绑定 | rc.10 验证默认 `dsh-notes`、目录联动、手填路径优先、真实私库预检及原绑定沿用；190 项全量回归通过 | `repo-name10-ui.json`、`repo-name10-verified.log` |
| 会话选材与转存 | rc.9 验证非末轮发起、单轮、多轮、部分消息、整个会话、返回细选、取消、深浅色及窄窗；逐条核对来源，真实私库与 Desktop 读回一致；189 项全量回归通过 | `capture9-ui.json`、`capture9-native.json`、`capture9-final.log` |
| 返回已有笔记库 | rc.7 用本地真实 Git 与模拟 GitHub 账号验证 A → B → A、原位置复用、重新定位及新位置恢复；原生 Desktop 另验既有真实私库；187 项全量回归通过 | `remember-ui.json`、`remember-desktop.json`、`remember-verified.log` |
| 本机搬迁与断网续写 | rc.6 覆盖跨盘搬迁、待同步修改、失败恢复、断网保存与复网后自动同步；独立 Desktop 读回相同正文和图片；184 项全量回归通过 | `locations-delivery-real.json`、`locations-delivery-desktop.json`、`locations-verified.log` |
| 首次接入 | rc.5 实机检查工具缺失与未认证提示、接入既有专用私库；断网保存后复网自动同步，另一实例读回。新建云端仓库分支使用本地真实 Git 与模拟 GitHub 账号验证 | `setup-final-real.json`、`setup-final-desktop-result.json` |
| 阅读信息与导出 | rc.4 验证时间格式、标签换行及清除筛选；20 份真实导出覆盖五种格式与标签／摘要的四种组合，核对字段、顺序和图片；173 项全量回归通过 | `meta-regression.log`、`meta-desktop-result.json` |
| 手动编辑与模型元信息 | rc.3 实机验证草稿保存、取消、新建贴图及来源保留；会话模型为一组短问答生成标题、摘要和标签，正文及原始素材一致；171 项全量回归及 73 项专项复验通过 | `manual-final-regression.log`、`manual-final-focused.log`、`manual-capture-result.json` |
| 并发与冲突 | 笔记存储验收覆盖双端并发后形成两篇带版本备注的笔记，重复同步保持两篇；本地真实 Git 覆盖推送竞争及三设备重叠修订；回收站验证过撤销与恢复 | `dual-result.json`、`release-smoke.json`、`interaction-result.json` |

表内文件均位于 `.dsh-home/pure-001/`。会话选材的 22 张 Web 与 Desktop 截图位于 `output/playwright/capture9/index.html`。

## 边界与后续核对

- rc.5／rc.8 遗留同步锁的自动恢复路径已补齐。旧隔离 profile 的启动锁另遇到进程编号被其他应用复用，核实后备份并人工清理了这份测试锁；未停止该其他应用。损坏锁、复用 PID 或无法确认的进程仍会被保留，不声称所有异常锁都能自动恢复。
- rc.5 曾有一次 3 MiB 正文保存 HTTP 500；本轮现有用例通过，原先偶发原因仍未复现。
- 本轮沿用本机已认证的 GitHub CLI，未注销账号或重新进行人工设备授权；验证码解析由自动测试覆盖。DSH 模型付费调用未重跑，元信息建议沿用 rc.3 的真实模型证据及本轮自动回归。
- 新建私库分支由本地真实 Git 与模拟 GitHub 账号验证，本轮真实 GitHub 只使用指定已有私有测试仓库。macOS、两台物理电脑间的使用尚未实测。
- 图册为 `output/playwright/release12/index.html`，隔离体验入口为 `.dsh-home/pure-001/Open-Release12.cmd`。开发与验收交付后停下，等待用户体验确认；未执行仓库公开、Release 发布或市场提交。
