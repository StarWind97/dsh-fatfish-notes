# DSH笔记开发入口

当前候选为 `0.5.0-rc.11`，产品面向会话原样转存、Markdown 图文编辑、文件导出和私有仓库跨设备同步。当前工作分支为 `main`。

[产品设计](notes-design.zh.md)是当前功能与存储行为的依据，[使用说明](user-guide.zh.md)面向日常操作，[验证记录](verification-log.zh.md)区分各版本的实际覆盖范围。

## 首次发布收尾

2026-11-04 已批准[五步规划](plans/2026-11-04-first-release.zh.md)。每步完成后停下、复盘并给出下一步建议，等待用户指示继续。第 1 步文档清理已完成，第 2 步历史重建已获准执行。核对新基线及远端状态后停下，等待第 3 步主分支开发规则的继续指示。后续依次处理功能验收和公开发布。

## 开发验证

按[项目协作约定中的验证范围](../AGENTS.md#验证范围)选择档位。文档检查差异与链接；局部功能检查类型、构建及专项用例；涉及数据安全或对外发布的候选包进行全量回归和实际安装验收。

`src/` 为 TypeScript 源码，`lib/` 由构建生成。包信息与命令以 [package.json](../package.json) 为准。已验证组合为 Windows / Node 24.21.0 / DSH 0.2.1-rc.5，macOS 待实测。

## 本机隔离体验

独立资料位于项目内 `.dsh-home/pure-001/`，指定 GitHub 私有测试仓库见[项目协作约定](../AGENTS.md#隔离验收与交付)。安装包位于 `dist/`，操作截图位于 `output/playwright/`，这些本机资料由 Git 忽略。

在已准备好的这台 Windows 开发机上，关闭旧的隔离窗口后，可通过 [Open-DSH-Notebook.cmd](../scripts/Open-DSH-Notebook.cmd) 启动体验。会话选材图册为 `output/playwright/capture9/index.html`，会话导出图册为 `output/playwright/export11/index.html`。

## 后续备忘

首次发布后优先安排本地 Markdown 文件导入。阅读区右侧操作面板及 AI 选项留待后续规划。宿主具备合适接口后再考虑将笔记直接附加到指定会话。
