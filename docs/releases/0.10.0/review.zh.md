# 肥鱼笔记 0.10.0 发布与验收

北京时间 2026-11-20 21:39:39，[肥鱼笔记 0.10.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.10.0) 已公开设为 GitHub 最新正式版。范围和回退方案见[本轮规划](../../plans/2026-11-20-release-0100.zh.md)。

## 候选包

- 文件名 `dsh-fatfish-notes-0.10.0.tgz`，SHA-256 `6a881e279d17cf35cc375ebc9401437f0c5b21c4a6df6004f465ad141258ebcb`。
- rc.5 Windows 隔离桌面以正式 0.9.3 为升级对照，随后安装候选。rc.5 Web 及官方 rc.3 Web 也完成安装。每处逐一核对全部 261 个文件。rc.3 使用独立宿主资料，避开新旧宿主的安装缓存差异。
- 对照上一轮已实测候选，界面构建产物一致。包内差异集中在版本标记、手册内容和加载代码，新增两个 v4 章节。声明支持 `>=0.2.2-rc.3 <0.2.3-0`，项目依赖沿用原解析。

## 已完成的验收

- 类型检查和构建通过。全量回归 425 项通过，失败、跳过和取消均为零。
- 解包候选后实际导入 v4 手册三篇，检查首页配图、两处篇目内链和两份附件。从 0.9.3 包导入的 v3 样本仍打开原修订。隔离 rc.5 Windows 界面也打开了资料中原有的手册。
- [图解使用说明](../../user-guide.zh.md)和[详细操作参考](../../user-guide-reference.zh.md)已对齐。两张新图在候选的独立窗口重拍，分别显示全库搜索与「有附件」结果，以及标签合并影响和所选笔记正文。合并图仅执行到预览并取消。
- [最低宿主 rc.3](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.3)使用官方 Web 运行时与归属独立的本机资料副本。实际验证进入插件、附件名和正文查找、组合筛选、分类管理及原手册。匿名请求被拒绝，经宿主授权后正常访问。最低版本的实测组合为 Web。
- 隔离 rc.5 Web 保存后本机读回。首次联网核验失败，改用已验证的进程连接路径，从官方 rc.4 Web 续传同一修订。指定测试私库已收到它，rc.5 Windows 主界面与独立窗口打开的是同一版本。桌面随后保存下一版，私库收录，独立 rc.5 Web 读回同一标题、正文和修订。两次上传和两端读回均保留证据。留一篇明示用途的验收样本供复查。

## 正式包复核

发布前已核对官方最新宿主为 [DSH 0.2.2-rc.5](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5)。正式包共 261 个文件，固定名与带版本名安装包的 SHA-256 均为 `eb98487f936e2c5c63d9a7f0ed59e9e69ce3df41bf04f63c6b38cb7248ba1179`。与已验收候选逐文件比对，差异限于两份 README 的发版说明。采用已有 425 项回归和双向同步结果，复核本轮改动及实际安装。

在隔离 rc.5 Windows 桌面与 Web 安装正式包，各 261 个文件与包内一致。桌面主界面、独立窗口和 Web 均读回先前同步的笔记。桌面主界面与 Web 均能打开旧手册，Web 分类管理可打开。Web 匿名请求返回 401，宿主授权后返回 200。

## 发布与市场

标签 `v0.10.0` 对应提交 `8abee274fe293ea93961965f8eef2c134475a2d9`。固定名安装包、带版本名安装包和 `SHA256SUMS-0.10.0.txt` 已从公开地址匿名下载，完整文件与发布前摘要一致。旧版 0.9.3 可从其发布页取得。

[市场的肥鱼笔记条目](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/StarWind97__dsh-fatfish-notes.yml)已采用[固定下载链接](https://github.com/StarWind97/dsh-fatfish-notes/releases/latest/download/dsh-fatfish-notes.tgz)。该入口实际下载了 0.10.0。按[市场升级查找流程](https://github.com/dsh-market/dsh-market/blob/main/src/release-updates.ts)核对了最新版跳转、标签内的版本信息和带标签的安装地址，均指向 0.10.0。

本地证据位于 `.dsh-home/pure-001/release0100/`，包含 `full-test.log`、安装逐文件比对、`handbook-package.json`、`guide-screenshots.json`、`web-minimum.json`、双端修订记录、`publication.json` 和 `public-downloads.json`。本轮启动的宿主验收进程已关闭。

发布后仓库说明已按正式版补齐。README 浅深 Logo、功能概览、实拍和维护规则见[公开说明补齐记录](../../plans/2026-11-20-public-doc-refresh.zh.md)。

[启动已安装的隔离桌面候选](../../../scripts/Open-Fatfish-Notes.cmd)
