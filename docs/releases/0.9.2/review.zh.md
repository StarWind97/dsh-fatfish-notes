# 肥鱼笔记 0.9.2 发布记录

北京时间 2026-11-18 16:20:33，[0.9.2 正式版](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.2)已公开。标签固定指向 `abb86cc7e5ad0367c01f865ca6bd3f9fe342e89d`。兼容范围为 `>=0.2.2-rc.3 <0.2.3-0`，实测组合为 rc.3 Windows 桌面及 rc.4 Web，rc.4 Windows 桌面未实测。[实施规划、候选证据与体验](../../plans/2026-11-18-dsh-compatibility-range-092.zh.md) · [发布说明](release-notes.md)

## 候选验收

同一个 254 文件候选包已在两个隔离宿主实际安装。类型检查、构建及 407 项全量回归通过。rc.3 Windows 上从 0.9.1 原地升级，保留原有笔记，三入口、双窗口刷新和重启读回通过。rc.4 Web 使用实际编辑器保存，两个本机副本经指定私库双向同步，两条正式修订经远端核实。

## 正式包与公开安装

正式包 `dsh-fatfish-notes-0.9.2.tgz` 共 254 文件、18,055,695 字节，SHA-256 为 `7ee75f3a75cdec96e5a69fca7416ffd13564520bb8ecd588918db2b9cfa6e3bc`。与通过实测的候选逐文件比对，仅 `README.md` 和 `README.en.md` 的正式下载与兼容说明不同。发布验证沿用候选的运行证据，另复核公开 URL 下载和实际安装。候选保留于 `dist/fatfish-092-candidate-926ff48612c7.tgz`。

已从 GitHub 匿名下载公开包和 `SHA256SUMS-0.9.2.txt`。首次包下载超时后分段取回剩余字节，完整文件 SHA-256 和公开校验文件均与正式发布前结果一致。

沿用同一公开 URL，通过官方安装器重装到项目内 rc.3 Windows Desktop 和 rc.4 Web 隔离资料。两套各 254 文件全部与发布包一致。Desktop 主页面、独立窗口、会话侧栏打开正常，既有验收笔记读回 `6aae1a45…`。Web 匿名请求返回 401，登录后返回 200，读回同一修订。指定私库 ID `1440762952`，两套均无待上传修改。验证进程结束后可从[隔离体验入口](../../plans/2026-11-18-dsh-compatibility-range-092.zh.md#体验与证据)重新打开。

本机证据在 `.dsh-home/pure-001/release092/`，包括 `publication.json`、`public-download.json`、`public-installed.json`、`desktop-public.json`、`web-restart.json` 及市场状态 JSON。安装复核使用隔离资料，桌面和浏览器交互由自动化定向执行。

## 插件市场

[市场更新 PR #16568](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/16568) 于北京时间 2026-11-19 00:59:21 合并。远端差异只改 `data/plugins/StarWind97__dsh-fatfish-notes.yml` 的 `tarball` 一行。合并后主分支与网页目录已指向 0.9.2，当日首次排查时 npm 官方和国内镜像的目录仍指向 0.9.1。后续固定文件名切换见[新版发布准备](../../plans/2026-11-19-release-rc5-preflight.zh.md)。

## 2026-11-19 补验

用同一公开包在官方 rc.5 Windows Desktop 安装并实际打开主界面、独立窗口和会话侧栏。已有笔记、保存后独立窗口刷新和指定私库同步通过，远端确认收到新修订。官方 rc.5 Windows 包的 Web 模式也通过真实隔离安装、登录和跨端读回。rc.4 Windows Desktop 未实测。[新版准备与证据](../../plans/2026-11-19-release-rc5-preflight.zh.md#实施记录)
