# 肥鱼笔记 / Fatfish Notes 0.9.2

这次更新扩展了宿主兼容范围。插件声明支持 DSH `>=0.2.2-rc.3 <0.2.3-0`。用户可先更新到本版，后续同一 `0.2.2` 系列宿主更新仍在插件的安装和加载范围内。范围内更新的实际表现以对应版本验证为准。

| 宿主与平台 | 验证结果 |
| --- | --- |
| DSH 0.2.2-rc.3 Windows 桌面 | **已实测**。从肥鱼笔记 0.9.1 原地升级，三个入口可用，保存、同步和重启读回通过。 |
| DSH 0.2.2-rc.4 Web | **已实测**。用同一个包安装，实际编辑保存，与桌面资料经指定私库双向同步，并通过重启读回。 |
| DSH 0.2.2-rc.4 Windows 桌面 | **未实测**。 |

下载 `dsh-fatfish-notes-0.9.2.tgz` 安装。从肥鱼笔记 0.9.1 升级时，可在现有 profile 直接安装并重启 DSH，沿用原私库和资料格式。请先完成同步，关闭 DSH 及独立笔记窗口，保留本机笔记备份。发布级类型检查、构建及 407 项全量回归通过。详见[验证记录](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/releases/0.9.2/review.zh.md)。

## English

Fatfish Notes 0.9.2 declares support for DSH `>=0.2.2-rc.3 <0.2.3-0`, so users can update the plugin ahead of other DSH releases in the `0.2.2` series. An in-place upgrade was verified on **rc.3 Windows Desktop**. Installation, editing, saving, private-repository sync and restart were verified on **rc.4 Web**. **rc.4 Windows Desktop verification is pending.**

Install `dsh-fatfish-notes-0.9.2.tgz` into your existing DSH profile to update from 0.9.1. Finish syncing, close DSH and the separate note window, and keep a backup of your notes before upgrading.
