# DSH笔记验证记录

2026-11-04 更新。当前候选为 `0.5.0-rc.12`，按[首次发布规划](plans/2026-11-04-first-release.zh.md)第 4 步完成发布前检查；以下区分本轮实测、既有证据和未覆盖边界。

## 验证环境

已验证 Windows / Node 24.21.0 / DSH 0.2.1-rc.5。真实宿主使用项目内 `.dsh-home/pure-001/` 的隔离 Web 与原生 Desktop，真实 GitHub 使用[项目协作约定](../AGENTS.md#隔离验收与交付)指定的私有测试库。

跨端验证使用同一台 Windows 电脑上的两个独立实例。macOS 和两台物理电脑之间的使用待实测。下文列出的日志与图册是本机忽略资料。

## 当前候选

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

本轮证据文件均位于项目内 `.dsh-home/pure-001/`。候选安装包为 `dist/dsh-github-notebook-0.5.0-rc.12.tgz`，SHA-256 为 `86a799538819ed036a4687befe4204afd0b1116ed830ca402d0649822c966a81`。

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
