# 肥鱼笔记 0.9.3 发布记录

[发布准备规划](../../plans/2026-11-19-release-rc5-preflight.zh.md) · [新版说明](release-notes.md)

## 隔离验收

前序候选已在 DSH rc.5 Windows 桌面从 0.9.2 升级，在 rc.4 Web 和 rc.5 官方 Windows 包的 Web 模式安装、保存、同步和重启。实际会话可转存并保留来源。发布包增加了新版入门手册和发布说明，单独复核安装与旧手册读回。

随包手册采用内容版本 3。在正式候选包上实际导入三篇，核对两条章节链接与配图。v1、v2 旧手册的稳定身份均纳入回归。在线使用说明配图来自隔离 rc.4 Web，实际输入 `配图提示词.md` 并勾选「含文件附件」，得到同一条附件名结果。

正式候选含 255 个文件。版本名与固定名包 SHA-256 均为 `e62877440590579a86af06f5424cdf7a8afe557ebdf47cd07dbf606bfff2de6e`。与前序候选逐文件核对，变化限于版本元信息、手册及其生成逻辑、安装说明。

类型检查、构建和 414 项全量回归通过。最终候选在隔离 rc.5 Windows 桌面与 rc.4、rc.5 Web 安装或读回，打开旧手册与前序共享笔记。桌面复核主界面、独立窗口、会话侧栏、组合筛选和正文定位。两套安装的 255 个文件均与正式候选一致。rc.5 Web 使用官方 Windows 包自带的 Web 模式。rc.4 Windows 桌面未实测；rc.5 独立 npm Web 发行包留待实测。

## 发布与商店

北京时间 2026-11-19 15:07:09，[GitHub 正式版 0.9.3](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.3)公开并设为最新，标签对应提交 `f4f5ade2f70d0103759c116be7767d029469fc14`。固定名、版本名安装包和校验文件均从公开链接匿名下载并通过摘要核对。正式标签的 manifest、图解说明和搜索实拍也与发布提交一致。

从[固定下载链接](https://github.com/StarWind97/dsh-fatfish-notes/releases/latest/download/dsh-fatfish-notes.tgz)在隔离 rc.5 桌面安装，从带版本的下载链接在 rc.5 Web 安装。两套各 255 个文件与正式包一致，桌面三处入口、旧手册和已同步笔记读回通过。商店更新逻辑按真实发布链接可从 0.9.2 定位到 0.9.3 正式标签下的固定名资产。

[市场 PR #16876](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/16876)已提交，仅更换肥鱼笔记下载地址一行。交付复核时 PR 开放，自动验证正在运行，市场主分支的条目仍指向 0.9.2。合并及应用内目录刷新由市场维护流程完成。

本机证据位于 `.dsh-home/pure-001/release093/`，包括 `test.log`、`fresh-handbook.json`、`publication.json`、`public-downloads.json`、公开安装和读回报告、`public-market-route.json` 与 `market-status.json`。
