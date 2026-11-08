# 肥鱼笔记开发入口

产品为 **肥鱼笔记 / Fatfish Notes**，定位为私人笔记管理。用户确认后，[0.6.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.6.0) 已正式发布，包含 [DSH 0.2.2 适配](plans/2026-11-06-dsh-022-compatibility.zh.md)。未发布 npm；市场收录进度与安装包校验值见[发布记录](releases/0.6.0/review.zh.md)。

代码仓库、包标识统一为 `dsh-fatfish-notes`；控制目录及新建私人库建议名为 `fatfish-notes`。本地工作目录 `D:\DSH-Workspace\dsh-github-notebook` 保留，现有私人库也不强制改名。运行代码不保留旧品牌兼容分支。

[产品设计](notes-design.zh.md)记录当前行为，[使用说明](user-guide.zh.md)面向日常操作，[验证记录](verification-log.zh.md)区分实际覆盖范围。日常在 `main` 开发，按[协作约定](../AGENTS.md)先讨论、批准后实施。

## 当前版本

`0.6.0` 以 DSH 0.2.2-rc.1 为基线，适配新版会话图片读取；包含更名、阅读与编辑章节目录、宽窄布局与章节高亮、独立滚动、首次初始化系统目录选择及取消/恢复默认。首次设置只使用同名新目录或空目录，已有云端库下载为新的本地副本。自动保存、五分钟双向同步、会话选材转存与文件导出继续保留。

0.6.0 已通过公开下载和实际安装核验。[市场条目](marketplace/StarWind97__dsh-fatfish-notes.yml)将原来的 DSH Notebook 条目更名为肥鱼笔记，并更新到正式发布包；GitHub 发布与市场维护者合并分别确认，不将提交 PR 当作已经上架。

2026-11-08 已核对更名 PR 合并及公开目录中的新条目。市场仍存在 GitHub Release 安装关联和宿主声明读取失败的展示问题，已分别反馈 [#1147](https://github.com/dsh-market/dsh-market/issues/1147)、[#1148](https://github.com/dsh-market/dsh-market/issues/1148)。按[修正规划](plans/2026-11-08-market-metadata-and-peers.zh.md)准备的 [0.6.1 候选版](releases/0.6.1/review.zh.md)删除未使用的 Schemastery 直接依赖要求，尚未正式发布。

旧名称下的 `0.5.0`、`0.5.1` 已正式发布，历史包、发布说明和截图保留原样。历史结果见 [0.5.0](releases/0.5.0/review.zh.md)、[0.5.1](releases/0.5.1/review.zh.md)及验证记录；这些文件中的名称描述的是当时版本，不是当前安装入口。

## 开发与验证

`src/` 为 TypeScript 源码，`lib/` 由构建生成。命令以 [package.json](../package.json)为准；依照[三档验证范围](../AGENTS.md#验证范围)选择检查。涉及存储身份或发布候选包时，执行类型检查、构建、全量回归和实际安装验收。

已验证宿主组合为 Windows / Node 24.21.0 / DSH 0.2.2-rc.1。macOS、两台物理设备仍待实测。体验入口不自动更新宿主；DSH 侧栏的「新版本」是宿主更新提示，与插件包版本分别核对。

## 本机隔离体验

真实验收仅使用 `.dsh-home/pure-001/` 和指定私库 `StarWind97/dsh-community-private-test`。不改日常 DSH 资料。

通过 [Open-Fatfish-Notes.cmd](../scripts/Open-Fatfish-Notes.cmd) 打开已安装 0.6.1 候选包的 `release12-desktop` 体验资料；普通安装用户仍使用 0.6.0 正式版。包位于 `dist/`，0.6.0 公开下载核验文件位于 `.dsh-home/pure-001/release060-public/`。本轮证据见 `output/playwright/market061/`；新版宿主既有图册位于 `output/playwright/compat022/index.html`，此前改名截图位于 `output/playwright/rename060/`，迁移前备份位于 `.dsh-home/pure-001/rename060-backup/`，均由 Git 忽略。Web 的跨实例同步证据仍为 0.6.0，未改写为新版本验收。

历史图册保留于 `output/playwright/release051/`、`outline-arrow/` 和 `setup-picker/` 等目录，不作为新版截图。普通桌面启动的 GitHub 账号需在实际宿主核对，不能仅凭 Codex 环境的登录状态判断。

## 后续备忘

优先安排本地 Markdown 文件导入。阅读区右侧操作面板及 AI 选项留待后续规划。宿主具备合适接口后再考虑将笔记直接附加到指定会话。
