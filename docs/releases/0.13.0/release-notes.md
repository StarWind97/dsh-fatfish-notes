# 肥鱼笔记 / Fatfish Notes 0.13.0

- **全新工作台与外观系统**：精简为三套布局（柔和卡片三栏、经典秩序分栏、目录树双栏）与六套高区分度配色（含「莓紫春芽」），深色模式升级为中性炭黑层级；从旧版升级时，共享配置、本地缓存及未同步的旧布局/配色待写队列均自动平滑迁移。
- **高效阅读、编辑与快捷切换**：新增 `Alt+K`（macOS `⌥K`）全局快速切换与命令面板，支持检索笔记标题、正文、附件名、笔记本、全量标签与常用操作；编辑态顶部元信息收折为「编辑属性」抽屉，减少切换编辑时的正文下跳；正文无章节标题时自动收起空目录列；Markdown 表格采用圆角外框与柔和列线，代码块升级独立顶栏与高对比度「✓ 已复制」提示。
- **会话侧栏与转存体验升级**：会话侧栏列表与阅读共享统一顶栏实现零跳动切换；转存「保存选项」宽窗改为自适应高度，直接展示可用图片缩略图并补齐底部「取消」按钮；首次接入与重置库改为三步向导；「问题与建议」入口收归「设置 → 帮助」。
- **手册与稳健性改进**：随包中英文用户手册升级至内容版本 6（升级保留既有手册修订），修复宽表导出 PNG 裁列保护、样式单例冲突及多项键盘焦点细节。[中文图解](../../user-guide.zh.md) · [验收记录](review.zh.md)

声明支持 DSH `>=0.2.2-rc.3 <0.2.3-0`。先完成同步，在原有 DSH 资料安装版本包，然后重新启动。

## English

- **Refreshed workspace and appearance system**: Streamlined to three layouts (Soft cards, Structured split, Notebook tree) and six distinct palettes (including Berry sprout) with neutral charcoal dark surfaces. Upgrades automatically migrate retired layout and palette values in shared settings, local cache and pending sync queues.
- **Faster reading, editing and quick switching**: Added the global **Alt+K** (**⌥K** on macOS) quick switcher and command palette covering titles, body text, attachment names, notebooks, the full tag catalog and common actions. Editing folds notebook, tags and summary into an **Edit properties** drawer; empty outlines collapse automatically; Markdown tables use rounded outer frames and code blocks feature a dedicated header bar with high-contrast copy feedback.
- **Smoother conversation sidebar and capture**: The conversation sidebar shares a unified zero-jump top bar between list and reading views. Expanded **Save options** adapts to content height, displays live image thumbnails and includes a bottom **Cancel** button. First-time setup and library reset use a three-step wizard, and **Issues & suggestions** now lives under **Settings → Help**.
- **Handbook v6 and reliability fixes**: Updated the bundled Chinese and English handbooks to content version 6 (preserving existing user handbooks on upgrade) and hardened wide-table PNG export protection, stylesheet singleton isolation and keyboard navigation. [Illustrated guide](../../user-guide.en.md) · [Detailed reference](../../user-guide-reference.en.md)

Fatfish Notes declares support for DSH `>=0.2.2-rc.3 <0.2.3-0`. Finish syncing, install the package into the same DSH profile, and restart DSH.
