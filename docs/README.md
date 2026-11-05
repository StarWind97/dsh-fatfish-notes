# DSH Notebook 开发入口

产品展示名称为 **DSH Notebook · 私人笔记管理**，中文简称仍为 DSH笔记。[0.5.1 正式版](https://github.com/StarWind97/dsh-github-notebook/releases/tag/v0.5.1)已发布。

当前正式版本为 `0.5.1`，产品面向会话原样转存、Markdown 图文编辑、文件导出和私有仓库跨设备同步。日常在 `main` 开发，临时分支通过相应验证后及时合并；具体见[分支与提交规则](../AGENTS.md#分支与提交)。

[产品设计](notes-design.zh.md)是当前功能与存储行为的依据，[使用说明](user-guide.zh.md)面向日常操作，[验证记录](verification-log.zh.md)区分各版本的实际覆盖范围。

## 首次发布收尾

2026-11-04 已批准[五步规划](plans/2026-11-04-first-release.zh.md)。第 1 至 4 步已完成，第 5 步已发布 GitHub Release 0.5.0；匿名下载与隔离安装核验通过。[市场收录申请 #11960](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11960)已于 UTC 2026-11-04 17:22 合并，条目已收录到上游仓库；本机市场界面刷新后的搜索展示另行确认。发布与收录分别记录，见[发布审核清单](releases/0.5.0/review.zh.md)和[验证记录](verification-log.zh.md)。

## 0.5.1 发布结果

按[本轮已批准范围](plans/2026-11-05-release-0.5.1.zh.md)补齐已连接笔记库的 GitHub 登录恢复入口，发布自动保存与同步体验更新。用户审核确认后，2026-11-05 17:26（北京时间）正式发布 `v0.5.1`；公开下载与隔离安装通过。安装包和升级说明见[0.5.1 发布清单](releases/0.5.1/review.zh.md)。[市场版本更新 #12283](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12283)已提交，等待上游检查与合并；正式包可直接从 GitHub Release 安装。

## 开发验证

当前 `main` 已按[已批准的章节目录方案](plans/2026-11-05-chapter-outline.zh.md)加入阅读与编辑导航：宽窗右栏、窄窗浮层、章节跳转和标题自动更新。此项为 `0.5.1` 发布后的开发改进，正式 Release 安装包保持不变。实际截图见本机 `output/playwright/outline/index.html`，覆盖范围见[章节目录验收](verification-log.zh.md#章节目录开发版验收)。

按体验反馈完成[目录边距与独立滚动调整](plans/2026-11-05-outline-scroll-layout.zh.md)，继续实施[目录默认状态与居中开关](plans/2026-11-05-outline-interaction.zh.md)：宽窗默认展开、窄窗默认收起，窄窗选章节后保持显示直到离开，居中半透明箭头控制开关，顶部操作栏固定，目录随阅读/编辑位置高亮。列表滚动条外侧留白进一步缩小。2026-11-06 细化为跨在目录边界上的无边框双箭头，缩小目录左侧留白，悬停显示「展开目录」「收起目录」。最新图册为本机 `output/playwright/outline-arrow/index.html`。

当前 `main` 按[已批准规划](plans/2026-11-05-autosave-and-sync.zh.md)实现自动保存和双向同步状态：完成编辑或离开后返回阅读态，前台每五分钟检查远端。另新增顶栏「问题与建议」入口，初始化页和独立设置页同样可用；点击打开 GitHub 新建反馈页面。这些改进已包含在 `0.5.1`；旧版 `0.5.0` 安装包保持不变。操作见[问题反馈](user-guide.zh.md#限制与问题反馈)。

本轮进一步按[同步提示与回收站确认规划](plans/2026-11-05-sync-feedback.zh.md)完善状态浮层、设置页实时状态和图标删除确认，修正账号检查误分类并减少同步中的 Git 进程开销。

隔离体验使用 `.dsh-home/pure-001/Open-Release12.cmd`，当前 Desktop 已安装含最新目录交互的开发体验包；Web 保留公开正式包 `0.5.1`。最新图册为 `output/playwright/outline-arrow/index.html`，此前图册保留在 `output/playwright/outline-interaction/index.html`、`output/playwright/scroll-layout/index.html` 和 `output/playwright/outline/index.html`；正式版图册保留在 `output/playwright/release051/index.html`，正式版验证范围见[候选包验收](verification-log.zh.md#051-候选包验收)与[正式发布核验](verification-log.zh.md#051-正式发布)。体验脚本只启动指定资料，不自动升级宿主或插件；DSH 侧栏的「新版本」提示属于宿主，和插件开发包是否已更新分别核对。

本机普通启动的账号问题已[现场复查并恢复同步](verification-log.zh.md#后续复查普通启动时-github-账号不可见)：Codex 的 GitHub 登录资料被应用目录重定向，普通 DSH 看不到该配置。现已在用户正常启动的隔离 Desktop 内完成 GitHub 授权；以后验收需在实际宿主确认账号，不能仅依据 Codex 命令环境。

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
