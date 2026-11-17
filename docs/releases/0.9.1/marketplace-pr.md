# 更新肥鱼笔记至 0.9.1，补齐 DSH 访问检查

> 本地准备稿；需在 0.9.1 正式发布并通过公开下载/安装检查后提交。

更新已有 `data/plugins/StarWind97__dsh-fatfish-notes.yml`，将下载地址改为 0.9.1。保留现有名称、分类、Windows 验证范围及 GitHub 账号、Git/GitHub CLI 前提。

按 [#15913 的合并反馈](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15913#issuecomment-6924418217)，全部 66 条宿主原始 HTTP 路由现先调用 `ctx.connection.requestRejection(req)`，再进入业务；原有 loopback、Host、Origin 与 Fetch Metadata 校验保留。缺少服务不注册，检查异常拒绝请求。真实 Web 验证匿名请求返回 401、异常来源返回 403，正常登录返回 200。独立窗口自身本机入口的边界见发布记录，不宣称其经过 DSH 登录认证。

因此申请移除条目中“HTTP 路由没有 DSH 的访问检查”的旧版提醒。0.9.1 同时更新已经确认的品牌与 Windows 任务栏图标，不涉及新资料格式。

发布级验证、安装包摘要及未覆盖场景：[0.9.1 发布审核](https://github.com/StarWind97/dsh-fatfish-notes/blob/main/docs/releases/0.9.1/review.zh.md)。提交时只修改该条目，不改工作流或维护者整理的其他内容。
