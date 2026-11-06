# 0.6.0 肥鱼笔记发布审核

状态：[0.6.0 已正式发布](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.6.0)，北京时间 2026-11-06 23:35:54。产品更名为「肥鱼笔记 / Fatfish Notes」，定位仍是私人笔记管理。

## 本次范围

- 代码仓库、包与插件标识统一为 `dsh-fatfish-notes`。
- 默认私人库名、控制目录统一为 `fatfish-notes`。本地代码工作目录保留原名。
- 旧安装身份及私库格式标记一次性迁移，不提供旧品牌兼容分支。现有私人库名称保持原样。
- 包含上次发布之后完成的阅读/编辑章节目录、章节高亮、独立滚动、首次设置目录选择与取消/恢复默认。
- 直接面向 DSH 0.2.2-rc.1，更新依赖、兼容声明及会话图片读取，不增加旧宿主兼容分支。

## 发布包

本机 `dist/dsh-fatfish-notes-0.6.0.tgz`，128 个文件，14,234,122 字节。

SHA-256：`d77bff6697bb3e05325edc078b1f46f9f59fd68a2d80b9d0b46ae2772a718b00`。

相对已审核候选包，正式包仅将中英文 README 中的候选版说明改为正式安装指引，其他 126 个文件字节一致。已在隔离 Desktop 实际安装并核对全部 128 个文件，不因文档修改重复全量回归。

类型检查、构建、全量回归 218/218 通过。新版宿主验证见[适配记录](../../verification-log.zh.md#dsh-022-适配候选版)，此前的身份迁移见[改名记录](../../verification-log.zh.md#060-改名候选版)。当前覆盖 Windows / DSH 0.2.2-rc.1；macOS、两台物理电脑未实测。会话验收使用合成测试消息，不代表本轮调用模型质量验证。新版初始化界面的目录返回值由测试控制，未将它当作新版系统弹窗实测。

## 发布与收录

1. `v0.6.0` 固定到提交 `4a5013d3906a553959e4cd0a804db8fba5a7c52a`，GitHub Release 为正式版、非草稿，已设为最新版本。[发布正文](release-notes.md)与[安装说明](../../../README.md)已同步。
2. 安装包、校验文件、图标和 4 张截图均匿名下载，7 个文件逐项与本机发布来源一致；下载的安装包通过宿主 CLI 安装到隔离 Web，128 个文件核对通过。证据为 `.dsh-home/pure-001/release060-publication.json`、`release060-public.json` 和 `release060-public-installed.json`。
3. [市场 PR #12722](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12722)已提交，以[市场 YAML](../../marketplace/StarWind97__dsh-fatfish-notes.yml)替换旧名称条目：删除旧文件并加入新文件，各 8 行，只涉及这一插件。当前无合并冲突，自动检查运行中，等待维护者审核；[提交正文](marketplace-pr.md)已留档。没有修改市场生成的 README。
4. 市场收录以维护者合并及客户端刷新后展示分别报告；正式发布不等于市场已经更新。

本次不发布 npm。0.5.x 历史 Release、安装包和提交记录保留。GitHub 仓库重命名保留原仓库身份；不能将再次创建旧名仓库作为后续步骤。

## 开发者资料

仅转换 `.dsh-home/pure-001/` 内四套既有隔离资料；另有一套全新初始化验证。日常 DSH 数据未修改。备份、原始文件摘要及一次性转换脚本保存在该忽略目录的 `rename060-backup/` 及 `rename060-*` 文件中。旧包不能直接读取转换后的私库标记，需整套恢复备份并恢复云端标记后才可回退。

体验入口：[Open-Fatfish-Notes.cmd](../../../scripts/Open-Fatfish-Notes.cmd)。它只启动已安装的隔离资料，不安装、不搬迁、不自动更新宿主。
