# DSH笔记验证记录

2026-11-06 更新。当前正式版为 `0.5.1`，[GitHub Release](https://github.com/StarWind97/dsh-github-notebook/releases/tag/v0.5.1)已发布。下方保留开发、候选包及正式发布的逐次记录，区分当时状态、本轮实测、既有证据和未覆盖边界。

## 验证环境

已验证 Windows / Node 24.21.0 / DSH 0.2.1-rc.5。真实宿主使用项目内 `.dsh-home/pure-001/` 的隔离 Web 与原生 Desktop，真实 GitHub 使用[项目协作约定](../AGENTS.md#隔离验收与交付)指定的私有测试库。

跨端验证使用同一台 Windows 电脑上的两个独立实例。macOS 和两台物理电脑之间的使用待实测。下文列出的日志与图册是本机忽略资料。

## 首次初始化目录选择

2026-11-06 按[已批准规划](plans/2026-11-06-setup-folder-picker.zh.md)实现父目录弹窗选择、与云端库同名、取消和恢复默认、首次拒绝非空本地资料。首次接入涉及目录与数据边界，按第三档验证。

- 类型检查与构建通过。全量执行 217 项，初次 213 项通过；4 项沿用旧目录初始化方式或旧接口白名单的用例未通过。修订测试准备方式及白名单后，这 4 项分别专项复测通过，没有放宽生产校验。记录为 `.dsh-home/pure-001/setup-folder-tests.log`、`setup-picker-legacy-test.log`、`setup-picker-legacy-upgrade.log`、`setup-picker-focused.log`。
- 新用例验证同名约束、非空拒绝、旧目录标记不能直接接管、预检不创建云端库、确认时再次检查目录以及失败后重启重试。旧未绑定笔记保持原件，不被导入新库；原有绑定、搬迁和 A → B → A 继续工作。
- 隔离 Web 实测取消保留默认或此前自选路径、恢复默认、第二步改名联动、非空目录拒绝和原文件保持不变。自动界面检查中的选目录返回值为模拟，避免操作系统窗口干扰可重复检查；没有把模拟当作原生选择证据。
- 另在当前 DSH 0.2.1-rc.5 的真实 Host 打开系统目录选择窗口，由用户点击「取消」，实际接口返回 `200 / folder: null`。当前桌面控制通道不可用，因此未自动完成系统窗口中的目录确认操作；选择结果后的联动由上述自动检查覆盖。记录为 `setup-picker-native.json`。
- 通过真实 GitHub 指定测试私库预检、确认接入和首次同步，新副本位于 `.dsh-home/pure-001/setup-picker-parent/dsh-community-private-test`，云端笔记可读取。新建远端库的分支由本地 Git 和模拟 GitHub 网关验证，没有另建远端测试库。
- 开发包分别安装到 `release12-desktop` 和 `setup-picker-web`，各 128 个包文件逐项一致。Desktop 实测保留原库与笔记，原生目录选择桥可用。无 Web 页面异常，自建窗口和后台测试进程已关闭。
- 截图图册为 `output/playwright/setup-picker/index.html`，界面记录为 `setup-picker-ui.json`、`setup-picker-desktop.json`。已有 Desktop 体验入口 `.dsh-home/pure-001/Open-Release12.cmd` 已更新；正式发布仍为 `0.5.1`，未发布新包。
- 默认路径及本机系统弹窗已覆盖 Windows。宿主未提供原生选择能力时保留默认位置，并提示在本机 Desktop 选择；macOS 与远程浏览环境未实测。

## 收起目录的箭头右侧间距

2026-11-06 用户决定暂时保留现有双折线样式，将收起状态按钮的右侧定位间距由 26px 减半至 13px；玻璃材质预览未并入插件。

- 按第一档构建并更新隔离 Desktop，126 个安装文件与构建一致；不运行全量回归。
- 1453px、1800px 视口实测右侧定位间距均为 13px。箭头仍为 16px × 44px、垂直居中；点击可展开，展开后的水平中心仍与目录左边框中心重合。
- 在箭头所在高度实际拖动正文滚动条，正文正常滚动且目录保持收起。无页面异常，自建测试窗口已关闭。截图为 `output/playwright/outline-edge-gap/closed-1453.png` 与 `closed-1800.png`，测量记录为 `.dsh-home/pure-001/outline-edge-gap-ui.json`。
- 体验入口仍为 `.dsh-home/pure-001/Open-Release12.cmd`，未发布新版。

## 目录双箭头与留白细化验收

2026-11-06 按[已批准的样式细化](plans/2026-11-05-outline-interaction.zh.md#2026-11-06-箭头样式细化)调整 SVG、样式和悬停文案，既有交互逻辑不变。按第一档构建并查看实际页面，不运行全量回归。

- 构建通过，开发体验包安装到既有隔离 `release12-desktop`，126 个安装文件与构建逐项一致。
- 原生 Desktop 的宽窄窗口、深浅色、展开/收起及悬停共 8 个状态检查通过，无页面异常。双箭头实测 16px × 44px，点击区 24px × 56px；位于正文可视区域垂直中点，展开时水平中心与目录 1px 左边框中心重合，避开正文滚动条。
- 默认透明度 0.45，悬停为 1；两种状态均无边框、无底色。左右方向与开关状态对应，原生悬停提示及无障碍名称分别为「收起目录」「展开目录」。目录左内边距由 28px 减至 8px。
- 证据：`.dsh-home/pure-001/outline-arrow-ui.cjs`、`outline-arrow-ui.json`；9 张实际界面截图和两个箭头局部截图见 `output/playwright/outline-arrow/index.html`。原生系统提示框不保证被页面截图捕获，提示文案另核对实际按钮的 `title` 与无障碍名称。
- 测试自建桌面进程已正常关闭，日常资料未改动。体验入口仍为 `.dsh-home/pure-001/Open-Release12.cmd`。没有升级 DSH、发布新版或另测 macOS；正式包保持 `0.5.1`。

## 目录默认状态、居中开关与滚动跟随验收

2026-11-05 按[已批准方案](plans/2026-11-05-outline-interaction.zh.md)完善目录交互。客户端局部布局和行为按第二档验证，不重跑未受影响的仓库同步全量回归，不发布正式版本。

- 类型检查、构建及 6 项目录/编辑专项用例通过，新增长章节与短结尾章节的滚动位置判断。开发包通过既有宿主 CLI 安装到 `release12-desktop`，126 个安装文件与构建逐项一致。
- 原生 Desktop 实测：宽窗初始展开、窄窗初始收起，跨笔记保持当前选择，离开插件后再进入窄窗恢复收起。宽窗目录移出不关闭；窄窗选章节后继续显示，移出约 200ms 收起，及时移回保持显示，点击外部、Esc、Tab 主动离开均关闭。
- 宽窗展开与收起前后，操作栏及目录开关的位置尺寸完全相同。目录位于操作栏下方；展开/收起两种箭头均在正文可视区域垂直中点，平时透明度 0.45，悬停变为 1。列表滚动条距分栏边缘实测 7px。
- 阅读和编辑中的实际鼠标滚轮均更新单项章节高亮。到文末高亮最后一章，目录条目滚入可见范围；收起后重新展开保持正确章节。编辑态点击章节后编辑器获得光标，但浮层不会误关闭；目录伸缩与窗口缩放前后同一编辑器 DOM，完成编辑仍在原章节位置。
- 覆盖浅色阅读、深色阅读/编辑、窄窗浮层、单栏返回列表、正文与原始素材往返；无页面异常。最终补充 3840px 视口的全宽模式，正文右内边距固定 40px，避免箭头遮挡文字，也不随超宽窗口放大留白。
- 证据：`.dsh-home/pure-001/outline-interaction-ui.cjs`、`outline-interaction-ui.json` 与 `outline-interaction-final.json`；10 张实际状态截图见 `output/playwright/outline-interaction/index.html`。测试结束正常关闭自建桌面进程，未修改日常 DSH 资料，也没有调用模型。macOS 与 DSH 0.2.2-rc.1 未测，本轮宿主保持 0.2.1-rc.5。

## 目录边距与独立滚动开发版验收

2026-11-05 按[已批准规划](plans/2026-11-05-outline-scroll-layout.zh.md)调整目录位置与原生滚动条。属于第二档局部布局和导航行为，未改变保存、同步或存储协议，不运行全量回归，不发布新版本。

- 最终类型检查、构建通过；`paper-outline.test.ts` 与 `paper-editor.test.ts` 共 **5 项专项用例通过**。开发包安装到既有隔离 `release12-desktop`，126 个安装文件与构建逐项一致；正式安装包和 Web 安装保持原版本。
- 原生 Desktop 宽窗实测：目录宽 220px、外侧间距 12px，正文与目录之间也为 12px；正文滚动条位于目录左侧，外层不滚动。窄窗浮层距正文滚动条 12px，章节选择后收起且不挤动正文。
- 正文、目录、左侧列表的原生滚动条均预留 14px 操作区，实际从右边缘内 2px 处成功抓住滑块拖动；目录和列表拖动不改变正文位置。前后截图确认滑块可见宽度由约 6px 加粗到约 10px，悬停时容器宽度不变。
- 实测深浅色、标准/全宽、目录开关、编辑章节跳转和当前章节高亮；缩放和目录开关前后为同一编辑器 DOM。小窗口返回列表及原始素材往返正常，无页面异常。
- 实测发现完成编辑时锚点记录晚于阅读态发布，可能返回先前进入编辑的位置。本轮提前记录当前位置，并按实际固定工具栏边缘选取锚点；复验完成编辑后停留在新选中的章节。
- 证据：`.dsh-home/pure-001/scroll-layout-ui.cjs`、`scroll-layout-ui.json`、`outline-install.log`；实际截图与前后对比为 `output/playwright/scroll-layout/index.html`。测试桌面进程正常退出，体验入口仍为 `.dsh-home/pure-001/Open-Release12.cmd`。只使用隔离测试资料，没有调用付费模型；macOS 未实测。

## 章节目录开发版验收

2026-11-05 用户批准[阅读与编辑共用章节目录](plans/2026-11-05-chapter-outline.zh.md)。本轮只改变客户端阅读布局和编辑导航，按第二档验证，不重跑同步、仓库切换等全量回归，不发布新版本。

- 类型检查和构建通过；`paper-outline.test.ts`、`paper-editor.test.ts`、`notes-client.test.ts` 合计 **14 项专项用例通过**。覆盖 H1—H6、Setext、重复/空标题、代码/表格排除、CRLF 位置映射、标题更新及既有客户端用例。
- 体验包安装到既有隔离 `release12-desktop`，126 个文件逐项核对。安装包放在 `dist/outline/`，采用内容摘要区分测试包，避免同版本本地文件缓存；正式包、标签与 Release 未替换。Web 仍为正式版。
- 原生 Desktop 实测：同名标题分别跳转；标题避开顶部固定栏；宽窗目录约 220px、独立滚动；标准/全宽切换；浅色阅读、深色编辑与阅读；窄窗浮层不挤压正文，选中章节及 Esc 收起；显式开关偏好刷新后保留。
- 编辑态实测光标定位、标题改名后目录更新、跳转后撤销与重做，核对前后是同一个编辑器 DOM。模拟 `compositionstart/end` 验证中文组词期间暂停目录更新；未将此项称为真实系统输入法实测。
- 补充检查空白新建笔记目录空态、已有图文笔记加载后导航、原始素材往返、阅读/编辑切换的章节位置、手动滚动时的当前章节高亮。未更改保存或同步协议。
- 证据：`.dsh-home/pure-001/outline-ui.json`、`outline-extra.json`、`outline-pack.json`、`outline-install.log`；实际截图图册 `output/playwright/outline/index.html`。测试启动的桌面进程正常退出；继续体验使用 `.dsh-home/pure-001/Open-Release12.cmd`，打开「长文阅读与整理 · 章节导航体验」并点击右上角目录图标。

## 0.5.1 正式发布

2026-11-05 用户审核候选包后明确回复「继续」，授权正式发布并更新市场条目。北京时间 **17:26:43** 发布 `v0.5.1`，为正式版，非草稿、非预发布；标签固定到 `8b34e84e3c0be7581c0b88d6e6fc1988b2886813`。未发布 npm，旧版 0.5.0 保留。

- 上传 `dsh-github-notebook-0.5.1.tgz` 与 `SHA256SUMS-0.5.1.txt`，GitHub 返回的包摘要与已审核 SHA-256 一致：`c36081c19495781639b307e12d7cbb0b4e55efa4b9a18c309d3d7a4a58c60b3d`，包大小 14,227,289 字节。
- 无认证下载正式安装包、校验文件、图标和 4 张截图，7 个文件与本机审核来源逐项一致。证据：`.dsh-home/pure-001/release051-public.json`；下载副本位于 `release051-public/`。
- 使用匿名下载的包通过宿主 CLI 安装到既有隔离 `release12-web`，126 个文件哈希全部一致。证据：`release051-public-installed.json`、`release051-public-install.log`。未启动或改动日常 DSH。
- [市场更新 PR #12283](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12283)只修改 `data/plugins/StarWind97__dsh-github-notebook.yml` 的安装包地址，增加一行、删除一行；基于上游 `fa94055bbfacbcbcbc911aa6dba906e54cc17848`，更新提交为 `b8136cb3829f2f5627522ac18eaa29b4266773c1`。不改生成 README。提交后无合并冲突，自动检查正在运行，维护者尚未合并；不宣称市场客户端已经显示 0.5.1。证据：`release051-market-submit.json`。
- 发布使用上一轮已通过第三档验证的同一安装包，没有变更运行代码、依赖或包内容。本轮核对哈希、公开下载、实际安装与文档差异及链接，不因上传发布重复全量回归。

## 0.5.1 候选包验收

2026-11-05 按[已批准范围](plans/2026-11-05-release-0.5.1.zh.md)补齐已绑定笔记库的 GitHub 登录入口，完成 `0.5.1` 候选包。尚未创建正式标签或 Release，待[发布审核](releases/0.5.1/review.zh.md)。

- 按第三档完成最终代码的类型检查、构建及 **207/207 全量回归**，无失败或跳过。日志为 `.dsh-home/pure-001/release051-{typecheck,build,tests}.log`。依赖和笔记存储格式未变。
- 登录界面在实际安装的候选构建中覆盖：当前真实账号识别；受控模拟的未登录、等待验证码、失败重试、错误账号、原账号恢复同步及缺少 GitHub CLI。错误账号不触发同步，原账号成功只恢复一次，无重置、换库或搬迁请求。没有为重复验收退出已有账号；本轮未重新执行人工 OAuth。证据：`release051-login-ui.json`，截图 02–06 明确标为模拟。
- 最终包安装至 `release12-desktop` 与 `release12-web`，各 126 个文件逐项校验一致。普通 Desktop 直接启动签名的 DSH 程序，实际 GitHub CLI 配置路径为系统用户目录，不是 Codex 的应用资料重定向路径；插件能识别已授权的原账号。新建临时实例出现宿主登录页后停止使用，关闭该窗口，改用已登录隔离资料；未复制登录凭据。
- 升级前备份测试笔记与控制资料，用正式 0.5.0 创建并同步带图片、代码和摘要的笔记；安装 0.5.1 后确认正文、标题、摘要、附件及私库绑定保持不变。编辑正文和摘要自动保存，最后改标题后直接正常关闭 DSH，重启恢复最新标题和内容的阅读态。证据：`release051-before-upgrade.json`、`release051-upgrade.json`。
- 真实指定私库双向验收：Desktop 保存后 Web 拉到相同修订，Web 修改摘要并推送后普通 Desktop 再次拉到相同修订；实际图片完成加载。证据：`release051-web.json`、`release051-return.json`。两实例同处一台 Windows 电脑，不称为两台物理设备测试。
- 在最终 Web 实际界面下载 Markdown 图文 ZIP、PDF、长图。ZIP 的正文、摘要、相对图片链接及图片 SHA-256 正确；PDF 可解析为一页，包含中文文字和一张嵌入图片，并已渲染查看；长图为 1080 × 913，图文均在。证据：`release051-artifacts.json` 与 `output/playwright/release051/upgrade-note.*`。最终公开展示截图使用既有合成阅读计划，未包含登录资料。
- 候选包 `dist/dsh-github-notebook-0.5.1.tgz` 为 14,227,289 字节，SHA-256：`c36081c19495781639b307e12d7cbb0b4e55efa4b9a18c309d3d7a4a58c60b3d`。已核对 126 个包内文件及允许的目录清单，无隔离资料、凭据、截图或缓存；安装证据为 `release051-installed.json`。
- 截图图册为 `output/playwright/release051/index.html`，总审核页为 `dist/release-0.5.1-review.html`。体验入口仍为 `.dsh-home/pure-001/Open-Release12.cmd`。测试创建的进程已关闭，日常 DSH 资料未修改。安装与测试中没有调用付费模型。

边界：macOS、两台物理电脑、断电、强制结束进程和新版回退到旧版的完整宿主操作未另测；0.5.0 → 0.5.1 升级已实测。此轮无需再次覆盖未变的会话模型建议及转存流程，保留既有验证记录。若正式发布时包内文件变化，须重新核对包及受影响验证。

同日只读核对：市场 PR #11960 已于 UTC 2026-11-04 17:22:24 合并；当前 GitHub Release 仍仅有 v0.5.0。后续是更新既有条目，不重复新增。未把市场仓库合并等同于本机市场界面已刷新展示。

## 后续复查：普通启动时 GitHub 账号不可见

2026-11-05 用户正常打开 `Open-Release12.cmd` 后再次报错，最近失败为北京时间 16:05 的 `personal_auth_required`。保留窗口现场，通过本机接口确认 Git 与 GitHub CLI 均可用，但账号为空；从 Codex 命令环境检查同一个 CLI 则已登录。

- 在当前普通 Desktop 后台临时开启仅本机 Node 调试，确认使用同一 Windows 用户、同一 GitHub CLI 2.103.3，配置相关环境变量一致。普通进程看不到默认 GitHub CLI 配置目录；Codex 中对相同路径执行实际路径解析，结果位于 `OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Roaming/GitHub CLI`。这是 Codex 应用资料虚拟化导致的两套文件视图。没有读取或复制凭据文件，也没有更改系统权限。
- [GitHub CLI 文档](https://cli.github.com/manual/gh_help_environment)说明 Windows 默认配置目录为 AppData 下的 GitHub CLI；[微软文档](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes)说明打包桌面应用的 AppData 重定向机制。本次路径解析和普通进程内文件存在性检查共同确认了启动环境差异。上轮测试确实成功，但继承了 Codex 环境，没有覆盖用户普通启动的账号可见性；上轮账号误分类修正不是这次现场错误的根因。
- 用户明确同意后，在原先报错的普通 Desktop 实例内发起 GitHub 授权，成功检测到原绑定的 StarWind97 账号。随后实际双向同步约 15 秒完成，北京时间 **16:21** 状态为 idle、pending=false、errorCode=null。没有重建或重新绑定笔记库。临时调试端口已关闭，用户原窗口保留。
- 本轮只补充诊断与验收记录，无产品代码、依赖或安装包变更，不重跑回归。证据为 `.dsh-home/pure-001/sync-auth-context.json` 和 `sync-auth-recovered.json`。后续普通启动验收应核对实际宿主中的账号检测，不能以 Codex 命令环境的检测替代。已绑定设置页缺少直接重新登录入口，作为待规划改进，不在本轮擅自实现。

## 开发版：同步提示与回收站确认

2026-11-05 按[已批准规划](plans/2026-11-05-sync-feedback.zh.md)完成 `0.5.1-dev.5`，尚未发布。状态点击改为提示浮层，设置页共享实时状态；首次完成通知短暂显示，垃圾桶图标先展开轻量确认并保留撤销。同步批量读取 Git 对象，账号检查区分明确认证失败与连接失败，本机保留最近失败的时间及分类。

- 涉及同步，按第三档完成类型检查、构建及 207 项全量回归，无失败、无跳过；新增覆盖账号误分类、字节批量读取的边界、状态映射和设置页轮询。最终仅调整浮层样式与开发版本号后重新构建、打包并验收实际页面，不重复全量回归。日志：`.dsh-home/pure-001/sync-feedback-tests.log`。
- 原生 Desktop 经 Electron 调试入口打开原隔离资料，实测状态悬停、点击、移出和 Esc；点击不导航。设置页显示正在同步后转为已同步，未出现常驻首次完成通知。垃圾桶仅图标，确认不挤动标题，取消、移入、撤销均有效。深色与浅色实际截图均已检查。
- 真实私库验证 Desktop 修改后由 Web 拉取，Web 再修改后由重新启动的 Desktop 拉取，修订标识逐次一致。使用测试笔记的移入与恢复产生修订，未修改正文。四次同步等待段分别约 23、25、45、16 秒，计时起点在界面操作之后，不作为完整启动耗时或严格性能基准；未将其宣称为瞬间完成或固定提速倍数。
- Web 额外用受控接口分别模拟本机已保存待上传、网络失败及账号失败：待上传不旋转，网络重试留在阅读页；账号错误需用户明确点第二级设置按钮才导航。截图 08–10 是模拟状态，其他为真实宿主与同步。没有模拟凭据过期或改动系统网络设置。
- 用户此前窗口提示账号失效，但关闭前未取得底层错误。本轮重启后，Desktop 进程内 GitHub CLI 登录状态正常，插件内检测到账号，真实同步成功，未要求重新登录。修正的是代码中可将配置账号的在线检查失败误判为未登录的路径，不能据此断言此前那一次必然由网络导致。今后保存最近失败分类以便查证，不保存原始凭据或正文。
- `dist/dsh-github-notebook-0.5.1-dev.5.tgz` SHA-256 为 `2b7638cf5a38ef58d82faaf572e398e559ad9c9b030bc5473b6da95215fecd6af`。通过宿主 CLI 安装到 `release12-web` 与 `release12-desktop`，两端各 126 个文件哈希均一致；使用新开发版本避免共享安装硬链接被原地覆盖。未发布 npm 或 GitHub Release。
- 证据位于 `.dsh-home/pure-001/sync-feedback-before.json`、`sync-feedback-native.json`、`sync-feedback-web.json`、`sync-feedback-return.json` 和 `sync-feedback-installed.json`。13 张截图见 `output/playwright/sync-feedback/index.html`，体验入口为 `.dsh-home/pure-001/Open-Release12.cmd`。测试创建的 Web/Desktop 进程已正常关闭，日常 DSH 资料未修改。

## 开发版：自动保存与双向同步

2026-11-05 按[已批准规划](plans/2026-11-05-autosave-and-sync.zh.md)实现 `0.5.1-dev.4`，尚未发布。正文、标题、摘要和标签自动保存；完成编辑、离开和重新进入使用阅读态。编辑中保留撤销、中文输入及图片导入；恢复记录按仓库隔离，保存回执确认后清除。前台每五分钟双向检查，快速本机修订合并同步；顶栏提供转圈、绿色对号与简短错误提示。

- 保存和同步按第三档验证：类型检查、构建及 202 项全量回归全部通过，无跳过。客户端随后补齐事务完成后的工具栏刷新、恢复回执、冲突副本标题与窗口生命周期处理，最终包复验类型、构建和 34 项相关测试通过，没有重跑未受影响的存储与 Git 测试。图片验收以归档完成为准，尚在导入时的退出提醒保留。
- 隔离 Web 实测自动保存各字段、保存后撤销、文件及剪贴板图片归档后即时刷新、切到会话再返回、完成编辑。返回均为阅读态并保留最后文字及图片。网络失败提示采用受控接口模拟；断网保存与重新同步的后端行为由本轮真实本地 Git 回归覆盖。
- 原生 Desktop 从指定真实私库取回 Web 保存的图文；最后一次标题输入后立即正常关闭应用，重启后自动恢复最新标题与正文的阅读态。Desktop 随后修改摘要并推送，Web 成功取回，验证双向传递。中文组词由控制器专项测试覆盖，没有将自动键盘输入宣称为人工输入法测试。
- 最终桌面包实测最小化后恢复为阅读态。测试前关闭 Playwright 的焦点模拟，否则真实窗口事件被工具屏蔽；该失败不作为产品故障。另通过拦截文件选择器并模拟焦点往返，核对选图过程中继续保持编辑态；未宣称人工操作了系统文件对话框。
- 之前的同步失败本轮重开后成功，旧失败详情没有持久化，无法反推为某个确定网络原因。新状态栏以实际状态显示；账号和权限问题不统一解释为网络问题。
- 开发包 `dist/dsh-github-notebook-0.5.1-dev.4.tgz` 的 SHA-256 为 `466234e21a358c455c532a12216de3a0b139c70785898374fb0687fb41f827ef`，两份隔离安装的全部 126 个文件逐项核对一致，未保留临时诊断入口。
- 本轮不调用付费模型、不发布 npm 或 GitHub Release。未测试断电、强制结束进程、macOS 或两台物理电脑；恢复记录依赖当前浏览器／桌面资料，不能代替资料夹及云端备份。
- 证据：`.dsh-home/pure-001/autosave-tests.log`、`autosave-final-focused.log`、`autosave-web.json`、`autosave-native.json`、`autosave-final-web.json`、`autosave-final-native.json` 和 `autosave-installed.json`。图册为 `output/playwright/autosave/index.html`。隔离体验沿用 `.dsh-home/pure-001/Open-Release12.cmd`。

## 开发版：问题与建议入口

2026-11-05 按已批准方案增加顶栏反馈入口，首次初始化和独立插件设置页同样提供。属于第二档局部界面行为：类型检查、构建及现有 9 项客户端专项测试通过，不重复全量回归。未新增依赖或改变保存、同步逻辑；本轮不打包、不替换已发布的 `0.5.0`。

- 隔离 Web 实际点击进入 GitHub 新建 Issue 的登录页面，核对返回地址指向本项目；原页面和未保存标题均保留。笔记库、同步设置及未初始化页面各自只显示一个反馈入口。
- 检查深浅色、常规及窄窗口（笔记库 800 px、初始化 520 px），窄区域显示「反馈」，按钮可见且页面没有新增横向溢出。
- 原生 Desktop 验证键盘激活和独立设置入口。仅在测试实例中拦截 `shell.openExternal`，确认宿主接收到完整 GitHub 目标地址，避免启动日常浏览器；真实网站跳转由上述 Web 测试覆盖。未提交 Issue。
- 三份隔离安装只替换构建后的客户端和中英文文案，旧文件备份于 `.dsh-home/pure-001/feedback-before/`。采用新文件替换方式，未覆盖安装缓存的共享硬链接。未访问日常 DSH 资料，测试进程已关闭。
- 证据为 `.dsh-home/pure-001/feedback-ui.json` 与 `feedback-native.json`。10 张实际截图见 `output/playwright/feedback/index.html`；`.dsh-home/pure-001/Open-Release12.cmd` 可体验本轮开发版界面。

## 第 5 步：正式发布

2026-11-04 用户明确指示进入发布流程，沿用已审核的版本、定位、图标、截图和收录条目。北京时间 17:46 发布 `v0.5.0`，为正式版，非草稿、非预发布。标签固定到 `6ef5d24390faf27f72e89815008f86383f1a9e81`。代码仓库简介和 `dsh-plugin` 等主题已设置；未更改仓库可见性，未发布 npm。

- 已上传 `dsh-github-notebook-0.5.0.tgz` 与 `SHA256SUMS.txt`。安装包大小 14,216,828 字节，SHA-256 为 `e9ab50a0a8f26146a0bfad9b0bb05680c882f3e15c5f38228c94348b6f86b316`，与用户审核文件一致。
- 通过不携带账号认证的公开下载，核对安装包、校验文件、PNG 图标和 4 张截图，7 个文件的哈希均与本机来源一致，证据为 `.dsh-home/pure-001/publish-prep/public-download.json`。
- 用匿名下载的安装包在 `publish05-desktop` 与 `release12-web` 两份隔离 profile 实际安装；两份全部 126 个文件与发布包逐项哈希一致。日志为 `public-install-*.log`，核对结果为 `package-verification.json`。未修改日常 DSH 资料。
- 本次发布没有功能、依赖或存储格式变化，沿用材料准备阶段通过的类型检查、构建及 197 项全量回归，不为上传相同文件重复全量测试。macOS 等未覆盖范围保持下文说明。

[市场收录申请 #11960](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11960)已创建，只新增 `data/plugins/StarWind97__dsh-github-notebook.yml`，8 行，无其他文件改动。申请分支为个人 fork 的 `codex/add-dsh-notebook-0-5-0`，条目提交为 `21675608abda63a5aa426d51d3644af3afd38c8d`。已核对 fork 来源和申请差异。自动校验已启动，结果见 [PR check](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/actions/runs/41811002480)。维护者尚未合并；不视作已在市场上架。

## 第 5 步：发布材料准备

以下为正式发布前的材料审核记录。当时将版本标识改为 `0.5.0`，补充中英文介绍、Release 正文、市场条目、PNG 图标及 4 张展示截图；没有源码、运行构建产物、依赖版本或存储格式变化。审核期间材料留在本机，未提交推送。

用户随后确认展示名称 **DSH Notebook · 私人笔记管理**。已统一首页、发布说明、市场条目及本地审核页，并重新打包：当前待审包为 **14,216,828 字节**，SHA-256 为 `e9ab50a0a8f26146a0bfad9b0bb05680c882f3e15c5f38228c94348b6f86b316`。与下述已安装验收的材料包相比，仅中英文 README 两个文件变化，其余 124 个文件逐项哈希一致，记录为 `publish-prep/name-confirmation.json`。名称修订按文档档检查差异、57 处本地链接和市场条目格式，并查看审核页，不重复全量回归或宿主安装；此前的类型、构建、197 项回归与运行验证继续适用。名称确认不表示正式发布已获批准。

- 按第三档完成类型检查、构建和 197 项全量回归：197 通过，0 失败、0 跳过。日志位于 `.dsh-home/pure-001/publish-prep/checks.log` 与 `regression.log`。本轮一次全量运行通过。
- 名称确认前的首次材料包为 14,216,768 字节，126 个文件，现保留在 `publish-prep/before-name-confirmation/`。SHA-256 为 `af1b09fc2d402642f3c5766ca27dba8d11c7185d9a68e8c6e2a2fe5cc154f7a4`。包清单、文件边界和许可证检查通过；针对常见 GitHub 令牌及私钥头的模式扫描没有发现匹配，不等同于全面安全审计。
- 在全新隔离 `publish05-desktop` 和已有 `release12-web` 安装最终包，两份全部 126 个文件逐项哈希一致。已有 Web 实例可重新打开原示例笔记与归档图片。安装日志与 `package-verification.json`、`upgrade-evidence.json` 位于上述目录。
- 全新原生桌面已打开插件，确认首次设置、准备工具步骤及 GitHub 说明可见，记录为 `fresh-install.json`。测试脚本最初对步骤标题的精确定位不匹配，改为识别实际带序号的标题后通过页面检查；之后原生 `capturePage` 截图调用未返回，核对专用资料路径后关闭该验收实例。该次截图不计入成功证据，未据此修改产品代码。可通过 `.dsh-home/pure-001/Open-Release05.cmd` 重新打开此全新体验入口。
- 在隔离 DSH 制作阅读、深色编辑、导出和会话多轮选材截图，逐张查看；只使用合成会话、示例笔记和本项目生成的流程图，不涉及日常 DSH 资料。示例笔记实际同步至指定私有测试库。市场展示图片位于 `assets/screenshots/`，与忽略目录中的测试证据分开。
- 上游收录项目 `c4261924d2d8845901faaae5d0e6301a75afafa5` 的 `readEntries` / `validateEntries` 校验本地条目通过。图标为 180 × 180 PNG，`screenshots.json` 的 4 张图片路径均存在。尚未执行市场 PR CI；尚未检查发布后才会存在的匿名下载地址。
- 只读确认代码仓库已经公开，本轮未更改可见性；尚无 Release。本轮没有创建标签、Release、市场 PR 或 npm 发布。确认后再进行对外操作，材料与分工见[发布审核清单](releases/0.5.0/review.zh.md)。

本轮不重复真实账号登录、新建远端库、模型付费调用和全部桌面导出流程；相关已验证行为与未覆盖边界沿用下方记录。macOS 与两台物理电脑间的长期使用仍未实测。

## 第 4 步候选

`0.5.0-rc.12` 完成类型检查、构建及 197 项全量回归，全部通过，无跳过。新增 4 项锁恢复用例，覆盖杀死持锁进程、同时恢复、活动与损坏锁保留、失败及取消后释放。既有 3 MiB 正文 HTTP 保存用例本轮通过。

- 全量首次在受限环境执行时，文件硬链接被系统拒绝；定位为 `EPERM` 后，在项目隔离临时目录以正常权限重跑，197 项通过。类型与构建日志为 `release12-checks.log`，最终回归以 `release12-regression.log` 为准。
- 全新 Web、全新 Desktop 和两份既有隔离 profile 已安装候选包；每份全部 124 个文件与包来源逐项核对。安装证据为 `release12-installed.json`，旧候选包保留。
- 全新 Web 实际完成首次接入已有专用私库、资料恢复、手动标题／摘要／标签／Markdown 编辑及本地图片导入。核对取消草稿、标签筛选清除、正倒序、回收站恢复、宿主深浅色、全宽和窄窗口。
- 从笔记实际下载 Markdown、图文 ZIP、PDF、长图和分页图片，核对标签／摘要排除、归档图片与取消弹窗。文件保存在 `output/playwright/release12/files/`。
- 仅切断本轮 Web 宿主的代理连接，实际离线编辑并保存在本机，界面显示尚未同步。恢复代理后未手动触发同步，146 秒后自动上传完成。这是本次网络与重试时序，不是固定同步耗时。
- 实际宿主保留活动进程的同步锁，并成功恢复已退出进程的同步锁。Web 证据为 `release12-web.json`，截图为 `output/playwright/release12/`。
- 从既有合成会话实际导出当前问答、自选 5 条和整个会话 8 条消息，核对图文 ZIP 图片字节、PDF、长图、分页图片和缺图提示；导出前后笔记数量不变。证据为 `release12-export.json`，文件与截图为 `output/playwright/release12-export/`。
- 从真实会话界面选择两轮共 4 条消息和一张图片转存，手动修改正文后核对只读原始素材未变，已同步到指定测试私库。证据为 `release12-capture.json`，截图为 `output/playwright/release12-capture/`。
- 本轮新建的原生 Desktop profile 接入同一测试私库，读回 Web 的相同修订、正文、摘要、标签与图片字节，滚动后确认图片实际显示；原生下载 PDF 完成，并取得阅读、编辑截图。证据为 `release12-native.json`。桌面自动化需将本次隔离窗口置前以正常绘制，窗口渲染等待失败未计为产品通过。
- 在已关闭的 Web 隔离 profile 实际卸载并重装，147 个笔记及控制文件哈希全部不变。证据为 `release12-reinstall.json`。重装后再检查笔记可读取及安装文件一致。

本轮证据文件均位于项目内 `.dsh-home/pure-001/`。上述完整验收对应的基础包 SHA-256 为 `86a799538819ed036a4687befe4204afd0b1116ed830ca402d0649822c966a81`，已保留带哈希名称的副本；当前体验包包含下述样式修补。

### 体验反馈：吸顶区域留白

2026-11-04 将阅读与编辑区顶部留白由随宽度变化的 18–48 像素缩为固定 8 像素，并让吸顶背景覆盖该留白，防止正文透出。只修改 CSS，按第一档完成构建及实际页面检查，未重复全量回归。

- 隔离 Web 先复现旧版顶部正文透出，再检查深色／浅色 1280 像素窗口、深色全宽 2040 像素窗口、浅色窄窗 800 像素。顶部留白均为 8 像素，功能区和格式工具栏衔接，遮挡检查全部通过。截图位于 `output/playwright/sticky12/`，证据为 `sticky12-before.json`、`sticky12-after.json`。
- 更新隔离 Web、`release12-desktop` 与 `desktop-home` 安装；Web 核对客户端文件哈希，两个已关闭的桌面实例各核对包内全部 124 个文件。未改笔记正文或原始素材。安装证据为 `sticky12-installed.json`。
- 当时的样式修补包 SHA-256 为 `e4d3493aadb739de00c90ff378bf491d19d89ebdeda10f353f846fbd05976698`，按哈希保留；当前体验包另含下述新手引导。

### 体验反馈：新手初始化引导

2026-11-04 按用户批准补齐「准备同步工具 → 登录并选择云端笔记库 → 确认保存位置并同步」。解释本机与用户 GitHub 私有库的保存方式，增加注册、工具安装帮助及可见的错误提示，首次使用默认推荐新建。存储格式、身份校验、同步与已有绑定逻辑未改变。

- 按第二档通过类型检查、构建和 `test/notebook-setup.test.ts` 的 2 项专项测试。首次受限运行因本机回环连接被拒绝而失败，以正常权限执行后全部通过。未重复全量回归。日志为 `guide12-checks.log`、`guide12-focused.log`。
- 隔离 Web 用仅影响测试进程的 PATH 与空 GitHub CLI 配置，实测缺少工具、未登录两种环境。安装帮助、注册入口、禁用继续、重新检测均符合状态；没有卸载系统工具或退出用户的 GitHub 登录。
- 登录等待、验证码展示、失败后重试、仓库访问失败及网络失败使用浏览器模拟响应验证。核对等待期间不能重复发起登录，错误提示在 820 像素高的窗口中自动进入可见区域；不把模拟状态算作真实授权成功。
- 真实 GitHub 仅对指定已有测试私库进行预检，进入只读确认页并返回，核对账号、名称、资料夹及未同步状态。未点击确认连接、未新建云端仓库；沿用已有认证。另在已绑定的隔离 Web 中确认显示「已完成首次同步」，原绑定保留。
- 检查默认新建与 `dsh-notes`、名称与默认目录联动、手动目录、返回修改、深浅色及窄窗口无横向溢出。实际页面截图图册为 `output/playwright/guide12/index.html`；证据为 `guide12-ui.json`、`guide12-normal.json`、`guide12-bound.json`。
- 最终包安装到两份隔离 Web 与 `release12-desktop`、`desktop-home` 两份已关闭的桌面资料，各核对 124 个安装文件。证据为 `guide12-installed.json`。未动日常 DSH 资料，测试启动的进程已关闭。

候选尚未发布，版本仍为 `0.5.0-rc.12`。当前 `dist/dsh-github-notebook-0.5.0-rc.12.tgz` 的 SHA-256 为 `311a99c24cd2b4b41233f82c1262672064de821cad2e3bca75f14d0bd244b67c`。此前完整回归与各次体验修补的包按哈希分别保留。

## 此前候选

`0.5.0-rc.11` 在 2026-11-03 完成类型检查、正式构建及会话选材、导出和原保存入口的 60 项专项测试，全部通过。当前候选的全量回归安排在第 4 步。此前 `0.5.0-rc.10` 的 190 项全量回归全部通过，无跳过。

- 隔离 Web 使用四轮合成会话，实际下载当前问答 2 条、自选消息 5 条和整个会话 8 条。核对角色、顺序、含图 ZIP 的相对路径与图片字节，打开 PDF、长图和分页图片 ZIP。故意缺失的图片在下载前提示，用户继续后文件保留缺图说明。
- 隔离原生 Desktop 实际下载当前问答 Markdown，宿主报告下载完成，文件包含预期的两条消息。取消导出与重新打开保存入口后，笔记列表保持原数量，导出过程只生成文件。
- 安装包 `dist/dsh-github-notebook-0.5.0-rc.11.tgz` 的 SHA-256 为 `4211a2a5c9543d577e0b94a0eafef6fd04418a5f761e8315bf2fd7c64c19d2f1`，三份隔离安装的全部 124 个文件已逐项核对。
- 证据为 `.dsh-home/pure-001/export11-final-tests.log`、`export11-ui.json`、`export11-native.json`。图册与实际下载文件入口为 `output/playwright/export11/index.html`。

## 核心流程的既有覆盖

以下均为 2026-11-03 对相应候选版本的验收。

| 范围 | 已覆盖 | 主要证据 |
| --- | --- | --- |
| 仓库默认名与已有绑定 | rc.10 验证默认 `dsh-notes`、目录联动、手填路径优先、真实私库预检及原绑定沿用；190 项全量回归通过 | `repo-name10-ui.json`、`repo-name10-verified.log` |
| 会话选材与转存 | rc.9 验证非末轮发起、单轮、多轮、部分消息、整个会话、返回细选、取消、深浅色及窄窗；逐条核对来源，真实私库与 Desktop 读回一致；189 项全量回归通过 | `capture9-ui.json`、`capture9-native.json`、`capture9-final.log` |
| 返回已有笔记库 | rc.7 用本地真实 Git 与模拟 GitHub 账号验证 A → B → A、原位置复用、重新定位及新位置恢复；原生 Desktop 另验既有真实私库；187 项全量回归通过 | `remember-ui.json`、`remember-desktop.json`、`remember-verified.log` |
| 本机搬迁与断网续写 | rc.6 覆盖跨盘搬迁、待同步修改、失败恢复、断网保存与复网后自动同步；独立 Desktop 读回相同正文和图片；184 项全量回归通过 | `locations-delivery-real.json`、`locations-delivery-desktop.json`、`locations-verified.log` |
| 首次接入 | rc.5 实机检查工具缺失与未认证提示、接入既有专用私库；断网保存后复网自动同步，另一实例读回。新建云端仓库分支使用本地真实 Git 与模拟 GitHub 账号验证 | `setup-final-real.json`、`setup-final-desktop-result.json` |
| 阅读信息与导出 | rc.4 验证时间格式、标签换行及清除筛选；20 份真实导出覆盖五种格式与标签／摘要的四种组合，核对字段、顺序和图片；173 项全量回归通过 | `meta-regression.log`、`meta-desktop-result.json` |
| 手动编辑与模型元信息 | rc.3 实机验证草稿保存、取消、新建贴图及来源保留；会话模型为一组短问答生成标题、摘要和标签，正文及原始素材一致；171 项全量回归及 73 项专项复验通过 | `manual-final-regression.log`、`manual-final-focused.log`、`manual-capture-result.json` |
| 并发与冲突 | 笔记存储验收覆盖双端并发后形成两篇带版本备注的笔记，重复同步保持两篇；本地真实 Git 覆盖推送竞争及三设备重叠修订；回收站验证过撤销与恢复 | `dual-result.json`、`release-smoke.json`、`interaction-result.json` |

表内文件均位于 `.dsh-home/pure-001/`。会话选材的 22 张 Web 与 Desktop 截图位于 `output/playwright/capture9/index.html`。

## 边界与后续核对

- rc.5／rc.8 遗留同步锁的自动恢复路径已补齐。旧隔离 profile 的启动锁另遇到进程编号被其他应用复用，核实后备份并人工清理了这份测试锁；未停止该其他应用。损坏锁、复用 PID 或无法确认的进程仍会被保留，不声称所有异常锁都能自动恢复。
- rc.5 曾有一次 3 MiB 正文保存 HTTP 500；本轮现有用例通过，原先偶发原因仍未复现。
- 本轮沿用本机已认证的 GitHub CLI，未注销账号或重新进行人工设备授权；验证码解析由自动测试覆盖。DSH 模型付费调用未重跑，元信息建议沿用 rc.3 的真实模型证据及本轮自动回归。
- 新建私库分支由本地真实 Git 与模拟 GitHub 账号验证，本轮真实 GitHub 只使用指定已有私有测试仓库。macOS、两台物理电脑间的使用尚未实测。
- 图册为 `output/playwright/release12/index.html`，隔离体验入口为 `.dsh-home/pure-001/Open-Release12.cmd`。开发与验收交付后停下，等待用户体验确认；未执行仓库公开、Release 发布或市场提交。
