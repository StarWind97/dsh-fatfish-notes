# 真实侧栏交互回归

## 会话侧栏查找

侧栏笔记本选择、查找工具行或共用布局受影响时，可在当前构建安装到项目隔离 Web 后运行 `npm run test:sidebar`。入口使用现有 Playwright 和 Chrome，启动 `.dsh-home/pure-001/release12-web`，校对指定测试库以及安装中的客户端和中文文案。通过「肥鱼笔记 · 会话转存体验」测试会话和「开发手册」笔记本走以下操作。

- 宽栏首次进「查找笔记」时，左侧笔记本直接可用。
- 窄栏可通过范围菜单选择笔记本，结果确实切到选中的范围。Esc 可以关闭菜单并回到范围按钮。
- 矮窗展开筛选后，仍可切换范围、点开结果并返回。

实拍输出到命令所示的 `output/playwright/search-sidebar/` 运行目录。看留白、层次和遮挡时，选择与改动有关的尺寸和状态，对照实际页面。定下新的交互后，在同一轮按需更新、删减或补充检查。可沿用本轮其他验收证据。

本机默认使用隔离验证已有的 DSH、Chrome 与 Codex Playwright 运行路径。其他 Windows 工作站可用 `FATFISH_DSH_EXE`、`FATFISH_CHROME`、`FATFISH_PLAYWRIGHT` 指向现有安装。日常业务回归用 `npm test`。

## 已打开的隔离宿主

`sidebar-interactions.cjs` 的检查函数接受 Playwright `Page`。桌面可以通过已有 Electron CDP 流程连接项目内隔离 DSH 后调用。

- `cancelNew`：先在侧栏打开待测列表。`workspace: true` 使用工作区书名旁的新建入口，否则使用侧栏顶部入口；`withText: true` 输入标题并等待草稿保存后确认丢弃。检查原选项卡、完整已加载列表、滚动位置、搜索和来源筛选，不仅检查编辑器消失。失败抛出断言。
- `cancelRename`：先打开已绑定笔记本的工作区设置。检查输入原地出现、悬浮提示、首个 Esc 退出改名、选用/新建取消、普通状态 Esc 关闭弹窗；不保存名称或创建笔记本。
- `checkFindNotebookLayout`：进入「查找笔记」，等结果显示后调用。按当前侧栏宽窄检查笔记本列表可操作，窄栏检查 Esc 及焦点恢复。

2026-11-12 取消新建、取消改名的运行器和证据位于忽略目录 `.dsh-home/pure-001/inline-actions/`，覆盖范围见[交付记录](../../docs/plans/2026-11-12-sidebar-inline-actions-results.zh.md)。测试后检查编辑器和未确认弹窗是否已退出。仅在交付用户验收时保留指定体验窗口。
