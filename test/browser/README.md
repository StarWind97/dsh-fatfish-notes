# 真实侧栏交互回归

`sidebar-interactions.cjs` 导出接受 Playwright `Page` 的 `cancelNew(page, options)` 与 `cancelRename(page)`，无新依赖。使用已有 Electron CDP 流程连接项目内隔离 DSH 后调用；不允许连接日常资料。

- `cancelNew`：先在侧栏打开待测列表。`workspace: true` 使用工作区书名旁的新建入口，否则使用侧栏顶部入口；`withText: true` 输入标题并等待草稿保存后确认丢弃。检查原选项卡、完整已加载列表、滚动位置、搜索和来源筛选，不仅检查编辑器消失。失败抛出断言。
- `cancelRename`：先打开已绑定笔记本的工作区设置。检查输入原地出现、悬浮提示、首个 Esc 退出改名、选用/新建取消、普通状态 Esc 关闭弹窗；不保存名称或创建笔记本。

`npm test` 不启动桌面应用；这些回归需显式从隔离宿主运行器调用。2026-11-12 实际运行器和证据位于忽略目录 `.dsh-home/pure-001/inline-actions/`，覆盖范围见[交付记录](../../docs/plans/2026-11-12-sidebar-inline-actions-results.zh.md)。测试后检查没有遗留编辑器或未确认弹窗；仅在交付用户验收时保留指定体验窗口。
