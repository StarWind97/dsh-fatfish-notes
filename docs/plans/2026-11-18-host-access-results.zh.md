# DSH HTTP 访问检查修复：验证记录

2026-11-18，按[正式规划](2026-11-18-host-access-review.zh.md)实施。内部候选仍标识 0.9.0，尚未发布；已公开 0.9.0 的资产未替换。

## 反馈与修复

[市场 PR #15913](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15913) 已合并。[维护者反馈](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15913#issuecomment-6924418217)属实：原来的 `webServer.register` 入口没有自动执行 DSH 登录/来源检查。本插件原有的本机、Host、Origin 和 Fetch Metadata 防护有效，但不能替代宿主身份认证。

现在宿主的 66 条原始路由统一先调用官方 `connection.requestRejection(req)`。缺少 Connection 时不注册；拒绝时不解析正文或调用业务；检查异常返回 503，不泄漏内部异常。通过后继续执行本插件原有校验。注册失败会撤销先前注册项，宿主服务撤销时路由一并释放。

只增加已存在的同版 Connection peer/dev 声明，没有升级宿主、改接口地址、存储 schema 或同步方式。独立窗口仍有单独的本机 listener，其自身防护保留；没有将它描述为采用 DSH 登录认证。

用户同时确认「莓紫春芽＋深色小幅提亮」为品牌基线，记录已更新；本轮未再次修改品牌素材。

## 实际验证

环境：Windows、DSH 0.2.2-rc.3、Node 24.21.0；项目 `.dsh-home/pure-001/` 的 Desktop 和既有 Web 测试资料。日常 DSH 未修改。

| 项目 | 结果 |
| --- | --- |
| 类型检查、构建 | 通过 |
| 新增访问测试与 peer 检查 | 5 项通过；66 条路径分别测试 401 与 403，此外覆盖正常业务、原有 fence、异常关闭和注册回退 |
| 全量回归 | 407 通过，0 失败、0 取消、0 跳过，约 20 分 44 秒；身份边界覆盖保存/同步接口，因此采用项目第三档 |
| 隔离安装 | Desktop 和 Web 各 254 个包文件逐一与构建源码/产物核对一致；Web 按修复前/后各安装候选进行对比 |
| Desktop 与独立窗口 | 两端笔记读取、文档 Worker、导入 Worker、导出字体共 8 项通过 |
| 实际业务操作 | 主页面编辑并完成保存、独立窗口自动读到新修订、宿主 Markdown 导出、独立窗口实际下载并关闭弹窗、会话侧栏阅读、DSH 重启后读回修订均通过 |
| 指定测试私库同步 | 同步一度持续处理中，未放宽断言；使用现有操作等待/重试后完成，最终 idle、pending=false、errorCode=null |

Web 为真实 TCP 请求，不使用 mock 认证判定；通过官方启动入口在临时浏览器会话登录，不读取或打印凭据。测试仅清除了这个一次性浏览器 context 的 Cookie，未动原测试/日常认证数据。

| 请求 | 修复前 | 修复后 |
| --- | --- | --- |
| 匿名读取 `/notes`、`/personal`、文档 Worker | 200 | 401 |
| 匿名 POST 保存与同步（空对象） | 未在旧版发写操作 | 401，未进入业务 |
| 正常登录浏览器读取上述三项 | — | 200 |
| 移除临时浏览器会话后读取笔记 | — | 401 |
| 伪造 Host、外站 Origin、null Origin、cross-site | 403 | 403 |

## 响应抽查与范围

同一 Desktop 资料、宿主、入口，首页 50 条、159 篇有效笔记和 25 个笔记本。各五次 `/notes` 读取，完成标准为接口响应返回，不是正文绘制。

| 阶段 | 中位 | 最大 |
| --- | --- | --- |
| 修复前 | 79.84 ms | 142.90 ms |
| 修复后 | 110.67 ms | 163.76 ms |

两组抽查均在全量回归同时运行时进行，包含宿主转发/调度波动，不能把差值完全归因于认证。最大值仍低于 200 ms；入口只增加同步身份检查，无新增网络往返、磁盘扫描、轮询或缓存。未重复 Logo 全场景/高 DPI 验收。

验证途中处理了三处验收问题：手动启动的测试实例没有调试端口，核对无待保存后重启；Node fetch 不按预期发自定义 Host，改用原生 HTTP 精确发头；侧栏测试起初用了主列表选择器，改用真实侧栏结构后补验。均未通过放宽产品检查来绕过。

## 证据、体验与后续

- [启动隔离体验](../../scripts/Open-Fatfish-Notes.cmd)，已装内部修复候选。验收窗口与本轮 Web 宿主已关闭，旧评审服务未改动。
- 本机证据：`.dsh-home/pure-001/host-access-20261118/` 中的 `maintainer-feedback.json`、`baseline.json`、`web-before.json`、`web-after.json`、`smoke.json`、`flows.json`、`pack.json`、安装日志和 `tests.log`。截图与测试产物不随 Git 分发。
- 内部安装包：`dist/fatfish-host-access-b1a7f422.tgz`，18,055,491 字节；npm shasum `b1a7f422e26fe5ec391ec52e569cd90d257eb91d`。
- 包 SHA-256：`d719f0d841e239d39fa58b964026cf1b38e45fcbf03ce05113314451f0651d8e`，两 profile 的文件核对记录见 `package-audit.json`。
- 安装前副本：证据目录 `installed-before/`。必要时构建基线 `d39404c` 内部包或新增回退提交，不移动发布标签、不重写历史。
- 未覆盖 Mac、远程宿主部署、第三方修改的认证配置；不扩大既有 Windows/rc.3 声明。本轮真实 GitHub 范围只限指定测试私库。
- 市场当前提醒针对已公开 0.9.0，先保留。建议接受本轮后，将访问修复与已确认品牌基线纳入下一修订版，再依发布流程提交市场说明更正；本轮没有发布或向维护者发消息。
