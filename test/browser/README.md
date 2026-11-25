# 浏览器回归

在项目根目录运行 `npm ci`，安装锁定版本的 Playwright。两项检查都使用本机 Chrome，可用 `FATFISH_CHROME` 指定可执行文件路径。需要对照其他 Playwright 版本时，可用 `FATFISH_PLAYWRIGHT` 指定该 npm 包目录。

## 共享弹窗尺寸

改动共享弹窗、外观或转存尺寸后，运行 `node --import tsx test/browser/check-dialog-sizes.mjs`。检查后挂载的外观样式、嵌套弹窗的独立尺寸、宽窗三栏和极小窗口单列。此检查直接加载项目 CSS，实际入口和操作另在隔离宿主验收。

## 会话侧栏查找

侧栏笔记本选择、查找工具行或共用布局受影响时，可在当前构建安装到项目隔离 Web 后运行 `npm run test:sidebar`。入口启动 `.dsh-home/pure-001/release12-web`，校对指定测试库以及安装中的客户端和中文文案。若在独立 worktree 中运行，脚本会自动通过 `git rev-parse --git-common-dir` 回退定位主目录的 `.dsh-home/pure-001`，也可用 `FATFISH_QA_ROOT` 显式指向该隔离目录；隔离资料为共享互斥资源，真实宿主验收按顺序串行执行。可用 `FATFISH_DSH_EXE` 指定 DSH 可执行文件路径。通过「肥鱼笔记 · 会话转存体验」测试会话和「开发手册」笔记本走以下操作。

- 宽栏首次进「查找笔记」时，左侧笔记本直接可用。
- 窄栏可通过范围菜单选择笔记本，结果确实切到选中的范围。Esc 可以关闭菜单并回到范围按钮。
- 矮窗展开筛选后，仍可切换范围、点开结果并返回。

实拍输出到命令所示的 `output/playwright/search-sidebar/` 运行目录。看留白、层次和遮挡时，选择与改动有关的尺寸和状态，对照实际页面。定下新的交互后，在同一轮按需更新、删减或补充检查。可沿用本轮其他验收证据。

日常业务回归用 `npm test`。

## 已打开的隔离宿主

`sidebar-interactions.cjs` 的检查函数接受 Playwright `Page`。桌面可以通过已有 Electron CDP 流程连接项目内隔离 DSH 后调用。

- `cancelNew`：先在侧栏打开待测列表。`workspace: true` 使用工作区书名旁的新建入口，否则使用侧栏顶部入口；`withText: true` 输入标题并等待草稿保存后确认丢弃。检查原选项卡、完整已加载列表、滚动位置、搜索和来源筛选，不仅检查编辑器消失。失败抛出断言。
- `cancelRename`：先打开已绑定笔记本的工作区设置。检查输入原地出现、悬浮提示、首个 Esc 退出改名、选用/新建取消、普通状态 Esc 关闭弹窗；不保存名称或创建笔记本。
- `checkFindNotebookLayout`：进入「查找笔记」，等结果显示后调用。按当前侧栏宽窄检查笔记本列表可操作，窄栏检查 Esc 及焦点恢复。

2026-11-12 取消新建、取消改名的运行器和证据位于忽略目录 `.dsh-home/pure-001/inline-actions/`，覆盖范围见[交付记录](../../docs/plans/2026-11-12-sidebar-inline-actions-results.zh.md)。测试后检查编辑器和未确认弹窗是否已退出。仅在交付用户验收时保留指定体验窗口。
