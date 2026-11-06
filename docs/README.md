# 肥鱼笔记开发入口

产品为 **肥鱼笔记 / Fatfish Notes**，定位为私人笔记管理。当前 `main` 已完成 `0.6.0` 候选版与 [DSH 0.2.2 适配](plans/2026-11-06-dsh-022-compatibility.zh.md)，停在发布审核，不自动发布 npm、GitHub Release 或市场申请。

代码仓库、包标识统一为 `dsh-fatfish-notes`；控制目录及新建私人库建议名为 `fatfish-notes`。本地工作目录 `D:\DSH-Workspace\dsh-github-notebook` 保留，现有私人库也不强制改名。运行代码不保留旧品牌兼容分支。

[产品设计](notes-design.zh.md)记录当前行为，[使用说明](user-guide.zh.md)面向日常操作，[验证记录](verification-log.zh.md)区分实际覆盖范围。日常在 `main` 开发，按[协作约定](../AGENTS.md)先讨论、批准后实施。

## 当前版本

`0.6.0` 以 DSH 0.2.2-rc.1 为基线，适配新版会话图片读取；包含更名、阅读与编辑章节目录、宽窄布局与章节高亮、独立滚动、首次初始化系统目录选择及取消/恢复默认。首次设置只使用同名新目录或空目录，已有云端库下载为新的本地副本。自动保存、五分钟双向同步、会话选材转存与文件导出继续保留。

发布前核对[0.6.0 审核清单](releases/0.6.0/review.zh.md)。市场材料为[新名称条目](marketplace/StarWind97__dsh-fatfish-notes.yml)，它引用尚未发布的候选版本，不能提前提交上游。

旧名称下的 `0.5.0`、`0.5.1` 已正式发布，历史包、发布说明和截图保留原样。历史结果见 [0.5.0](releases/0.5.0/review.zh.md)、[0.5.1](releases/0.5.1/review.zh.md)及验证记录；这些文件中的名称描述的是当时版本，不是当前安装入口。

## 开发与验证

`src/` 为 TypeScript 源码，`lib/` 由构建生成。命令以 [package.json](../package.json)为准；依照[三档验证范围](../AGENTS.md#验证范围)选择检查。涉及存储身份或发布候选包时，执行类型检查、构建、全量回归和实际安装验收。

已验证宿主组合为 Windows / Node 24.21.0 / DSH 0.2.2-rc.1。macOS、两台物理设备仍待实测。体验入口不自动更新宿主；DSH 侧栏的「新版本」是宿主更新提示，与插件包版本分别核对。

## 本机隔离体验

真实验收仅使用 `.dsh-home/pure-001/` 和指定私库 `StarWind97/dsh-community-private-test`。不改日常 DSH 资料。

通过 [Open-Fatfish-Notes.cmd](../scripts/Open-Fatfish-Notes.cmd) 打开 `release12-desktop` 体验资料。候选包位于 `dist/`，新版宿主图册位于 `output/playwright/compat022/index.html`；此前改名截图位于 `output/playwright/rename060/`，迁移前备份位于 `.dsh-home/pure-001/rename060-backup/`，均由 Git 忽略。Web 通过相同版本验证跨实例同步。

历史图册保留于 `output/playwright/release051/`、`outline-arrow/` 和 `setup-picker/` 等目录，不作为新版截图。普通桌面启动的 GitHub 账号需在实际宿主核对，不能仅凭 Codex 环境的登录状态判断。

## 后续备忘

优先安排本地 Markdown 文件导入。阅读区右侧操作面板及 AI 选项留待后续规划。宿主具备合适接口后再考虑将笔记直接附加到指定会话。
