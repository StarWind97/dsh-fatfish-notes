# DSH Notebook 开发入口

产品展示名称为 **DSH Notebook · 私人笔记管理**，中文简称仍为 DSH笔记。[0.5.0 正式版](https://github.com/StarWind97/dsh-github-notebook/releases/tag/v0.5.0)已发布。

当前开发版本为 `0.5.1-dev.5`（未发布），正式版为 `0.5.0`，产品面向会话原样转存、Markdown 图文编辑、文件导出和私有仓库跨设备同步。日常在 `main` 开发，临时分支通过相应验证后及时合并；具体见[分支与提交规则](../AGENTS.md#分支与提交)。

[产品设计](notes-design.zh.md)是当前功能与存储行为的依据，[使用说明](user-guide.zh.md)面向日常操作，[验证记录](verification-log.zh.md)区分各版本的实际覆盖范围。

## 首次发布收尾

2026-11-04 已批准[五步规划](plans/2026-11-04-first-release.zh.md)。第 1 至 4 步已完成，第 5 步已发布 GitHub Release 0.5.0；匿名下载与隔离安装核验通过。[市场收录申请 #11960](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11960)已提交，等待维护者审核，尚未上架。发布与收录分别记录，见[发布审核清单](releases/0.5.0/review.zh.md)和[验证记录](verification-log.zh.md)。

## 开发验证

当前 `main` 按[已批准规划](plans/2026-11-05-autosave-and-sync.zh.md)实现自动保存和双向同步状态：完成编辑或离开后返回阅读态，前台每五分钟检查远端。另新增顶栏「问题与建议」入口，初始化页和独立设置页同样可用；点击打开 GitHub 新建反馈页面。此项为尚未发布的开发版改动，已发布的 `0.5.0` 安装包保持不变。操作见[问题反馈](user-guide.zh.md#限制与问题反馈)。

本轮进一步按[同步提示与回收站确认规划](plans/2026-11-05-sync-feedback.zh.md)完善状态浮层、设置页实时状态和图标删除确认，修正账号检查误分类并减少同步中的 Git 进程开销。

隔离体验使用 `.dsh-home/pure-001/Open-Release12.cmd`，最新图册位于 `output/playwright/sync-feedback/index.html`，本轮验证范围见[同步提示与回收站验收](verification-log.zh.md#开发版同步提示与回收站确认)。自动保存和反馈入口的旧图册仍保留。

按[项目协作约定中的验证范围](../AGENTS.md#验证范围)选择档位。文档检查差异与链接；局部功能检查类型、构建及专项用例；涉及数据安全或对外发布的候选包进行全量回归和实际安装验收。

`src/` 为 TypeScript 源码，`lib/` 由构建生成。包信息与命令以 [package.json](../package.json) 为准。已验证组合为 Windows / Node 24.21.0 / DSH 0.2.1-rc.5，macOS 待实测。

## 本机隔离体验

独立资料位于项目内 `.dsh-home/pure-001/`，指定 GitHub 私有测试仓库见[项目协作约定](../AGENTS.md#隔离验收与交付)。安装包位于 `dist/`，操作截图位于 `output/playwright/`，这些本机资料由 Git 忽略。

在已准备好的这台 Windows 开发机上，关闭旧的隔离窗口后，可通过 [Open-DSH-Notebook.cmd](../scripts/Open-DSH-Notebook.cmd) 启动体验。会话选材图册为 `output/playwright/capture9/index.html`，会话导出图册为 `output/playwright/export11/index.html`。

第 4 步的全新桌面体验入口为 `.dsh-home/pure-001/Open-Release12.cmd`，本轮实际截图图册为 `output/playwright/release12/index.html`。图册包含阅读、编辑、首次接入、转存、导出、断网提示及深浅色布局。新实例已从测试私库恢复资料，不含复制的 DSH 账户登录信息。

体验反馈中的顶部留白与吸顶遮挡已修复，两个桌面体验入口均已更新。样式修补截图位于 `output/playwright/sticky12/`，该次修补的专项检查范围见[验证记录](verification-log.zh.md#体验反馈吸顶区域留白)。

首次设置已补齐面向新手的三步引导，操作见[首次设置说明](user-guide.zh.md#首次设置)。各阶段实际页面图册为 `output/playwright/guide12/index.html`；当前体验包的安装与验证范围见[新手引导验收](verification-log.zh.md#体验反馈新手初始化引导)。

## 后续备忘

首次发布后优先安排本地 Markdown 文件导入。阅读区右侧操作面板及 AI 选项留待后续规划。宿主具备合适接口后再考虑将笔记直接附加到指定会话。
