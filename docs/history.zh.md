# 肥鱼笔记历史交付与评审归档

本文档归档自[开发入口](README.md)，完整保留 `0.9.3` 及更早版本的状态快照、早期品牌多轮评审记录、E 阶段交付流水账与历史备忘。当前状态、进行中任务和常用入口见[开发入口](README.md#当前状态)。

## 0.9.x 与更早版本状态快照

- 2026-11-19 [阅读区标签、概览与拖动排序](plans/2026-11-19-browser-style-reading-tabs.zh.md)已完成隔离验收，待体验。短竖线分隔，概览原位打开笔记，末尾「+」再开概览。悬停使用普通箭头。rc.5 Windows Desktop 和独立窗口实测通过。用[隔离体验入口](../scripts/Open-Fatfish-Notes.cmd)重开。
- 2026-11-19 正式发布 [0.9.3](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.3)。414 项全量回归通过，rc.5 Windows 桌面与 rc.4、rc.5 Web 验收完成，两套公开链接安装各 255 文件一致。固定链接的市场切换 PR #16876 已提交。见[发布记录](releases/0.9.3/review.zh.md)和[兼容验收](plans/2026-11-19-release-rc5-preflight.zh.md)。
- 2026-11-19 [本机搜索与统一筛选](plans/2026-11-19-local-search.zh.md)随 0.9.3 发布。支持先搜索或先选笔记本、在同一面板查标签、按附件名查找和定位正文原句。
- 2026-11-18 正式发布 [0.9.2](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.2)。同一候选包通过 rc.3 Windows Desktop 从 0.9.1 升级、rc.4 Web 安装及双向保存同步，407 项全量回归通过。rc.4 Windows Desktop 未实测。见[发布与市场状态](releases/0.9.2/review.zh.md)及[隔离体验](plans/2026-11-18-dsh-compatibility-range-092.zh.md#体验与证据)。
- [概览界面精修](plans/2026-11-18-overview-polish.zh.md)随 0.9.3 发布。两组最近笔记宽窗并列、窄窗纵排。81 项专项、rc.3 Windows Desktop、独立窗及 rc.4 Web 通过。四字入口「使用说明」另经[文案专项验证](plans/2026-11-18-overview-polish.zh.md#文案微调)。
- [阅读区概览与笔记标签](plans/2026-11-18-reading-overview.zh.md)记录 0.9.3 的概览数据、近况分组和标签行为基线。每组按空间显示 5／10／15 篇。上一轮的独立候选和 84 项专项证据保留用于回退。
- [列表底栏与条目菜单](plans/2026-11-18-list-footer-and-row-menus.zh.md)随 0.9.3 发布。13 项相关测试及实际界面通过。选中笔记本默认显示数量，选中笔记的菜单随实际交互显示。

### 0.9.1 与品牌选型记录

2026-11-18 的 [0.9.1 开发交接](handoffs/2026-11-18-development.zh.md)保留交互、品牌、验证证据及后续候选的历史依据。0.9.1 市场 PR #16375 已合并。

2026-11-18 正式发布：[0.9.1](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.1)，见[发布规划](plans/2026-11-18-release-091.zh.md)与[审核、市场状态和体验入口](releases/0.9.1/review.zh.md)。407 项全量、两套实际安装各 254 文件、真实 Web 访问检查、三入口及保存/下载/同步/重启和响应抽查已通过；最终公开包仅 README 变化，匿名下载摘要、公开 URL 安装的 254 文件及三入口复核通过。[市场更新 PR #16375](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/16375)已提交，审核状态见发布记录。

2026-11-18 已完成并随 0.9.1 发布：[市场合并反馈与 DSH HTTP 访问检查修复](plans/2026-11-18-host-access-review.zh.md)，见[验证与隔离体验](plans/2026-11-18-host-access-results.zh.md)。66 条宿主路径补齐官方身份/来源检查，407 项回归、真实 Web 匿名/已登录对照、三入口保存/下载/重启及指定私库同步通过；两套 254 文件安装一致。市场旧版提醒的更正随本次 PR 申请。

2026-11-18 用户确认：下述「莓紫春芽＋深色小幅提亮」接入结果成为后续品牌基线。形状、尺寸和各位置分工沿用[品牌规则](brand.zh.md)。

2026-11-18 已完成并随 0.9.1 发布：[莓紫春芽品牌接入与任务栏清晰度修正](plans/2026-11-17-berry-brand-adoption.zh.md)。三轮已完成，[验证与体验入口](plans/2026-11-18-berry-brand-results.zh.md)包括实际任务栏、明暗界面与性能。保留旧评审，沿用已接受的公开场景截图。

2026-11-17 设计已选定：[莓紫春芽＋深色小幅提亮](plans/2026-11-17-brand-families-review.zh.md#本轮已选定方案)。用户已保存 `lift4_choice=lift` 并确认本轮采用；各位置颜色分工已汇总，停止继续扩散配色。旧方案和意见保留；此记录保留选稿依据。

2026-11-17 最新评审：按[莓紫深色小幅提亮规划](plans/2026-11-17-brand-families-review.zh.md#莓紫深色小幅提亮用户要求直接输出结果)，已交付[浅色／现版深色／提亮深色三列对比](http://127.0.0.1:8835/#berry-lift)。依据「整套更统一、深色稍暗」意见，只提亮鱼身和上弧；12 组合、尺寸／下载／窄屏及独立反馈专项通过。原方案与意见保留，仍未接入或发布。

2026-11-17 前序评审：按[莓紫春芽稳定配色规划](plans/2026-11-17-brand-families-review.zh.md#莓紫春芽稳定配色用户已批准)，已交付[整套预览](http://127.0.0.1:8835/#stable-review)：鱼形明暗保持原色，字标深莓／暖白，任务栏固定配色；四场景、实际尺寸和自动保存专项通过。当时仍是阶段偏好。

### 0.9.0 及更早版本记录

2026-11-16 用户确认正式发布 0.9.0，并更新原插件市场条目，见[本轮规划](plans/2026-11-16-release-090.zh.md)。GitHub Release 已公开，市场提交和维护者合并分别记录，不将发布等同于市场已更新。此前 0.8.0 的[发布与升级记录](releases/0.8.0/review.zh.md)继续保留。

上版 **0.7.0** 汇总了下述原 0.6.1 开发功能，0.6.1 未单独发布，其发布与市场合并记录[保留](releases/0.7.0/review.zh.md)。

`0.6.0` 以 DSH 0.2.2-rc.1 为基线，适配新版会话图片读取；包含更名、阅读与编辑章节目录、宽窄布局与章节高亮、独立滚动、首次初始化系统目录选择及取消/恢复默认。首次设置只使用同名新目录或空目录，已有云端库下载为新的本地副本。自动保存、五分钟双向同步、会话选材转存与文件导出继续保留。

0.6.0 已通过公开下载和实际安装核验。[市场条目](marketplace/StarWind97__dsh-fatfish-notes.yml)将原来的 DSH Notebook 条目更名为肥鱼笔记，并更新到正式发布包；GitHub 发布与市场维护者合并分别确认，不将提交 PR 当作已经上架。

2026-11-08 已核对更名 PR 合并及公开目录中的新条目。当时诊断的 GitHub Release 安装关联和宿主声明读取失败分别反馈为 [#1147](https://github.com/dsh-market/dsh-market/issues/1147)、[#1148](https://github.com/dsh-market/dsh-market/issues/1148)，市场侧修复进度以对方仓库为准。按[修正规划](plans/2026-11-08-market-metadata-and-peers.zh.md)删除未使用的 Schemastery 直接依赖要求，现随 0.7.0 发布；[0.6.1](releases/0.6.1/review.zh.md)仅保留历史开发记录。

旧名称下的 `0.5.0`、`0.5.1` 已正式发布，历史包、发布说明和截图保留原样。历史结果见 [0.5.0](releases/0.5.0/review.zh.md)、[0.5.1](releases/0.5.1/review.zh.md)及验证记录；这些文件中的名称描述的是当时版本，不是当前安装入口。

---

## 2026-11-12 至 2026-11-18 历史交付与评审流水

2026-11-18 已验证[新会话接手与并行协作约定](../AGENTS.md#多智能体与多会话协作)。在同一主目录启动关闭记忆的只读 Codex 命令行空白会话，只给出帮助页补充列表菜单说明和开发入口链接的需求。会话自行找到候选验收、源码及现有使用说明，识别开发入口的未提交改动并提出保留这些改动的方案，等用户批准后才实施。本次覆盖同目录的只读接手和规划。

2026-11-17 评审补充：[前三套深色保留紫色](plans/2026-11-17-brand-families-review.zh.md#深色保留紫色补充用户已批准)，见[对照页](http://127.0.0.1:8835/#dark-purple)。每套增加彩色鱼身搭配浅紫／中性浅字，与原浅色及旧反白并列；用户「浅色环境目前更喜欢莓紫春芽」记录为阶段偏好。42 SVG／18 PNG、45 场景组合、下载与新增独立反馈字段通过；261 个既有素材及实拍字节不变，未接入或发布。

2026-11-17 展示交付：[六套品牌场景组合](plans/2026-11-17-brand-families-review.zh.md)，见[网页](http://127.0.0.1:8835/)与[结果／边界](brand/reviews/2026-11-17-brand-families/README.zh.md)。紫色和绿色各三套，覆盖完整字标、明暗鱼形、入口、图标及封面；96 SVG／108 PNG／6 ICO 和页面／保存专项通过。用户恢复桌面后已补齐六套共 12 张 Windows 100% 深色任务栏实拍，原生图源、画面及页面专项通过。新旧反馈分开且保留，临时清晰图像实验未接入正式窗口，未发布。

2026-11-17 展示交付：[图标纯色配色与结构对照](plans/2026-11-17-icon-color-directions.zh.md)已完成，见[评审页](http://127.0.0.1:8833/)和[结果与维护](brand/reviews/2026-11-17-color-directions/README.zh.md)。鲜明绿加十二组纯色候选、三种结构、真实任务栏和独立自动保存意见已交付；不同方案逐档变化，单个图标不使用渐变。300 PNG、15 ICO、30 实屏及页面／保存专项通过；旧页与反馈保持，未接入产品或发布。

2026-11-17 展示交付：[任务栏清晰度与同色系配色评审](plans/2026-11-17-taskbar-clarity-review.zh.md)已完成，见[结果与维护](brand/reviews/2026-11-17-taskbar-clarity/README.zh.md)及[评审页](http://127.0.0.1:8830/)。定位到 Chrome 应用窗口输出更接近小 favicon 放大的额外柔化，补尺寸／换格式未解决；临时原生图像实验与两档绿色配色提供实际任务栏对照。保留 D1 几何，新意见独立自动保存，未接入正式资源或发布。

2026-11-17 展示交付：[实际使用记录与四张场景截图](plans/2026-11-17-showcase-practical-scenes.zh.md)已完成并获用户接受，见[评审结论、验证与入口](plans/2026-11-17-showcase-practical-scenes-results.zh.md)。生图记录为主图，会话侧栏、代码资料和设置为补图；按后续指示已更新中英文 README 和公开截图清单，旧图保留，未另发插件版本。原图字节、图片解码及两页本地排版通过；原 166 篇笔记与旧反馈保持。后续较大版本发布前按[内容准则](demo-content.zh.md#较大版本发布时的宣传图片)重新规划宣传图片，优先介绍插件特性与用法，够用即可。

2026-11-17 最新交付：[品牌分尺寸接入](plans/2026-11-17-brand-size-adoption.zh.md)已完成，见[验证与隔离体验](plans/2026-11-17-brand-size-adoption-results.zh.md)。D2 用于 16/17 px，D1 用于 20/24 px，28 px C0，更大用原版；原生窗口图标固定 D1。23 项回归、249 文件安装核对、真实三入口和任务栏重启通过；修复旧 favicon 缓存，并提供[当前品牌图册](brand/current.html)。保留原有提交历史，正常提交推送，未发布。

2026-11-17 展示交付：[简化背景弧线与三档鱼尾](plans/2026-11-17-clean-arc-tail-variants.zh.md)已按途中反馈完成[饱满尾瓣第二轮](brand/reviews/2026-11-17-tail-d123-v2/README.zh.md)。保留 C 的曲线节奏，尾部面积逐档增加、下尾加厚，弧线独立；首轮细长稿被否定，原稿和各轮意见保留。最新网页 8828，默认常驻原版/A/C0/D1/D2/D3 便于判断尺寸分界；512 个显示组合、12 次下载、保存恢复与曲线专项，以及追加默认六稿布局通过。待评审，未接入或发布。

2026-11-17 展示交付：[原版不对称鱼尾 B／C 预览](plans/2026-11-17-asymmetric-tail-preview.zh.md)已完成，等待评审。四稿八档尺寸、明暗和典型位置一并对比，[本轮网页与维护说明](brand/reviews/2026-11-17-tail-bc/README.zh.md)提供独立自动保存意见。256 个显示组合、8 次素材下载、反馈保存/读回/失败重试及窄屏通过；未接入插件或发布。

2026-11-17 展示补充：[新版品牌图册与原版小尺寸对照](plans/2026-11-17-brand-gallery-and-original-shape.zh.md)已完成，可通过[启动脚本](../scripts/Open-Fatfish-Brand-Gallery.cmd)查看。优先展示原版鱼形，保留 A 的八档尺寸、明暗、透明/方块、任务栏和入口比较；完整组合与素材下载集中展示，新增意见自动保存。288 个显示组合及下载、保存读回/恢复、窄屏通过。提亮绿已确认，产品图标暂未再次替换，未发布。

2026-11-17 最新交付：[品牌主色统一与任务栏图标](plans/2026-11-16-brand-color-and-taskbar.zh.md)已完成，见[验证与体验入口](plans/2026-11-16-brand-color-and-taskbar-results.zh.md)。现行品牌统一提亮绿，按场景使用微型 A、标准稿和完整品牌；22 项回归、232 文件安装核对、三入口 14 个明暗检查点通过。实际 Windows 任务栏在正常重开及宿主重启后保持彩色，历史原稿和宣传截图保留；未发布。

2026-11-16 展示评审：[正式规划](plans/2026-11-16-showcase-visual-review.zh.md)的第一轮已完成，见[三种展示方向与验证](plans/2026-11-16-showcase-visual-results.zh.md)。按用户最终选择整理七篇 AI 使用笔记，提供三种实际主题、六张截图、本地评审与隔离体验。内容、内链、文件、旧资料保持和反馈保存已核对；等待用户取舍，不替换公开展示图片。

2026-11-16 正式发布：[0.9.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.9.0)已公开，适配 DSH 0.2.2-rc.3；[发布规划](plans/2026-11-16-release-090.zh.md)与[验证及市场状态](releases/0.9.0/review.zh.md)统一记录本轮结果。397 项回归、实际 0.8.0 资料升级、231 文件安装核对、三入口、保存与双窗口刷新、私库同步及重启读回通过。[隔离入口](../scripts/Open-Fatfish-Notes.cmd)继续使用测试资料，日常 DSH 不自动更新。

2026-11-16 最新交付：[DSH 0.2.2-rc.3 适配规划](plans/2026-11-16-dsh-rc3-compatibility-check.zh.md)已按用户批准完成，见[验证与隔离体验](plans/2026-11-16-dsh-rc3-results.zh.md)。依赖与兼容声明对齐 rc.3，类型、构建、397 项全量回归、实际三入口、旧会话文件转存、导出、指定私库同步与重启读回通过；231 个安装文件一致。原隔离启动入口可用，未公开发布。今后升级同时评估兼容利弊、现有功能优化和新用途；完整原生输入附件公共接入条件仍未具备。

2026-11-16 最新交付：用户选择小 Logo A，已按[微型鱼形接入规划](plans/2026-11-16-small-logo-a.zh.md)同步微型源稿与入口派生，完整品牌保持；[验证与隔离体验](plans/2026-11-16-small-logo-a-results.zh.md)覆盖类型检查、构建、2 项相关测试和实际浅深 10 个检查点。用户已要求每次提交后推送远端，本轮同步 main，仍不创建版本发布；测试仓库改名继续待批准。

2026-11-16 最新交付：[导航稳定、入口命名与微型 Logo 评审](plans/2026-11-16-navigation-clarity-and-small-logo.zh.md)已完成批准范围，见[验证与隔离体验](plans/2026-11-16-navigation-clarity-and-small-logo-results.zh.md)。顶栏「笔记 / 笔记本管理 / 设置」与下方折叠入口通过 16 项相关测试、实际两入口 96 个位置检查点及 10 组键盘折叠检查；隔离启动认证积累问题经单独授权处理后重启通过。两版微型 Logo 仅预览待选，[测试仓库改名](plans/2026-11-16-test-repository-rename.zh.md)仅单独规划，均不自动接入或执行。未发布、未推送。

2026-11-16 最新交付：[管理页导航与侧栏设置精简](plans/2026-11-16-navigation-and-sidebar.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-navigation-and-sidebar-results.zh.md)。笔记本导航仅用于笔记库，管理/设置使用完整面板；侧栏移除全局外观入口，保留工作区设置和共享外观。类型检查、构建、23 项相关测试、实际两入口 101 个布局检查点及侧栏专项通过，原隔离入口已更新；未发布或推送公开品牌资源。

2026-11-16 文档接续：已将 Logo 概念原图、字形依据、编辑数据、PNG 和素材预览归档到[项目素材目录](brand/README.zh.md)，并补充[主开发会话交接](handoffs/2026-11-16-brand-logo.zh.md)。当前 SVG 继续统一维护于 `assets/brand/`；本次只整理素材与文档，没有改变运行行为。

2026-11-16 最新交付：[品牌图标接入](plans/2026-11-16-brand-logo.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-brand-logo-results.zh.md)。小入口纯鱼形、帮助页透明完整组合与 favicon 已接入，保留功能图标及视图明暗。类型检查、构建、28 项相关测试与 32 个真实／1 个模拟布局明暗点通过；原隔离入口已更新，未发布或推送公开品牌资源。

2026-11-16 最新交付：[设置页独占内容面板](plans/2026-11-16-settings-full-panel.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-settings-full-panel-results.zh.md)。设置页隐藏笔记本导航、分隔条和展开按钮，返回后保留原状态；类型检查、构建、13 项相关测试及实际两入口 53 个布局检查点通过，原隔离入口已更新，未发布。

2026-11-16 最新交付：[设置分类与整面板滚动](plans/2026-11-16-settings-categories.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-settings-categories-results.zh.md)。五分类、侧栏三分类和留白滚轮通过；类型检查、构建、20 项相关测试及实际窗口/窄屏补验通过。保留明暗和同步规则，原隔离入口已更新，未发布；验收脚本误移测试资料的恢复证据一并记录。

2026-11-16 最新交付：[设置页与主界面面板间距一致性](plans/2026-11-16-panel-spacing.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-panel-spacing-results.zh.md)。类型检查、构建及实际窗口 219 个布局检查点通过；设置/管理页紧凑间距与主界面统一为 10 px，隐藏栏不再留白，明暗规则保持。原隔离入口已更新，未发布。

2026-11-16 最新交付：[跨窗口外观设置同步](plans/2026-11-16-shared-appearance.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-shared-appearance-results.zh.md)。主界面/侧栏/独立窗口共享偏好，保留两端旧值并采用变更通知；实际双向显示中位 102/76 ms，全量加补验覆盖 395 项通过。原隔离入口已更新，未发布。

2026-11-16 最新交付：[内容菜单不占位与笔记标题单行](plans/2026-11-16-overlay-menus-and-single-line-titles.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-overlay-menus-and-single-line-titles-results.zh.md)。19 项相关测试、八布局 32 组合及实际 DSH 主界面/窄侧栏通过；菜单覆盖内容、不再预留宽度，列表标题统一单行省略。原隔离入口已更新，未发布。

2026-11-16 最新交付：[明暗跟随、会话引用与图片菜单](plans/2026-11-16-theme-follow-and-actions.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-theme-follow-and-actions-results.zh.md)。21 项相关测试、主界面/会话侧栏及独立页面验收通过；侧栏始终跟随 DSH，主视图临时切换，引用图标与图片菜单已调整。原隔离入口已更新，未发布。

2026-11-16 最新交付：[阅读空间、列表组织与操作精简](plans/2026-11-15-reading-organization-refinement.zh.md)已完成，见[验证与隔离体验](plans/2026-11-16-reading-organization-results.zh.md)。底栏与资料面板、标签收纳、收藏/置顶/手工顺序、模板移除兼容、正文字体和三篇精简手册已实现；387 项全量通过，实际三入口和指定私库恢复已验，原隔离入口已更新，未发布。

2026-11-15 前序交付：[开发手册、用户手册与首次使用体验](plans/2026-11-15-handbooks-onboarding.zh.md)已按批准规划完成，见[验证与隔离体验](plans/2026-11-15-handbooks-onboarding-results.zh.md)。两册归并、六章原生图文手册、首次接入一次性加入与设置入口已实现；382 项全量回归、实际三入口与指定私库恢复通过。隔离入口已更新，未发布。

2026-11-15 示例内容已整理：[规划](plans/2026-11-15-demo-content-refresh.zh.md)与[交付和体验](plans/2026-11-15-demo-content-results.zh.md)。新增三个笔记本、十二篇技术和使用说明笔记（含两次实际会话转存）、配图与有效附件；旧资料保持，未发布。后续示例统一遵循[内容准则](demo-content.zh.md)。

2026-11-15 最新交付：[界面主题、阅读排版与工作区规划](plans/2026-11-15-appearance-reading-workspace.zh.md)已完成，见[验证与隔离体验](plans/2026-11-15-appearance-reading-workspace-results.zh.md)及[分轮记录](plans/2026-11-15-appearance-reading-workspace-worklog.zh.md)。八主题、十配色、代码与阅读、资料面板、临时标签已落到三种实际入口；366 项全量及收尾 25 项专项通过，原隔离入口已更新，未发布。

2026-11-14 最新交付：[导出完成、失败与取消交互规划](plans/2026-11-14-export-completion.zh.md)已完成，见[验证与体验](plans/2026-11-14-export-completion-results.zh.md)。四类导出发起下载后关闭并轻提示，失败保留参数，生成中可取消；正文/列表共用提示，图片明确区分当前阅读宽度与默认 740 px。35 项相关测试及三种界面实际验收通过，原隔离入口已更新，未发布。

2026-11-14 前序交付：[移除分页图片导出规划](plans/2026-11-14-single-image-export.zh.md)已完成，见[验证与体验](plans/2026-11-14-single-image-export-results.zh.md)。图片只输出单张 PNG，PDF 文档分页和 Markdown 资源包保持；35 项相关测试及主界面、独立窗口、会话侧栏实际验收通过，原隔离入口已更新，未发布。网页导出只记为候选，暂不开发。

2026-11-14 前序交付：[界面体验、会话转存与导出简化规划](plans/2026-11-13-experience-capture-export.zh.md)已完成，见[验证与隔离体验](plans/2026-11-13-experience-capture-export-results.zh.md)。覆盖主界面、独立窗口和会话侧栏实际操作；357 项全量通过，最后局部收尾另通过 17 项专项及实际验收。上传文件原位链接、引用计数/分页、阅读键及阅读式 PNG 导出已装入原体验入口；未发布，AI 会话写入继续暂缓。

2026-11-13 前序交付：[图片展示切换与笔记多选规划](plans/2026-11-13-image-presentation-and-selection.zh.md)及[验证与体验记录](plans/2026-11-13-image-presentation-and-selection-results.zh.md)。已实施截图 / 纯图片默认展示、混合文件默认链接、正文单处双向切换及所有笔记列表整行多选。348 项全量通过，已在隔离入口完成安装、交互、导出、指定私库同步与重启验收；未发布。

2026-11-13 前序交付：[本机数据访问与同步调度规划](plans/2026-11-13-local-data-path.zh.md)及[验证与交付记录](plans/2026-11-13-local-data-path-results.zh.md)。已按「规划落盘 → 试验 → 测试调整 → 实施验收」完成，最终 340 项全量通过；保留现有技术栈和存储格式，未发布。性能、正确性证据和隔离候选以这两份记录为准；复杂修改持续维护落盘规划已成为显式项目准则。此前交付记录仍是各自时点的验证快照。

新会话接续如需了解更早阶段，可查阅 [2026-11-12 开发交接](handoffs/2026-11-12-development.zh.md)。

---

## 早期开发、E 阶段体验与历史备忘（2026-11-08 至 2026-11-13）

2026-11-09 已实现[笔记迁入迁出、普通附件与回收站完善](plans/2026-11-09-portability-and-attachments.zh.md)：视频等下载型附件、体积限制、多选与彻底删除、文章互链、整库/单本导出及 Markdown 文件/文件夹/ZIP 导入。图册见 `output/playwright/portability/index.html`，使用方法见[操作指引](user-guide.zh.md)。已用本机 Obsidian 1.10.6 的独立测试资料完成实际窗口验收：正文、属性、图片与笔记互链通过，附件路径和字节保持；另行下载的 1.15.0 启动失败，尚未覆盖该版本。不与其他软件共同编辑内部资料目录。

2026-11-08/09 完成[默认笔记本与移除规则](plans/2026-11-08-default-notebook.zh.md)与[笔记本独立选项卡](plans/2026-11-09-notebooks-tab.zh.md)，随 0.7.0 发布。

2026-11-10 已完成[读取与切换优化](plans/2026-11-10-performance.zh.md)与[实际耗时对比](plans/2026-11-10-performance-results.zh.md)，随 0.8.0 正式发布。

0.9.2 已验证 Windows / Node 24.21.0 上的 DSH rc.3 桌面和 rc.4 Web。macOS、两台物理设备未实测。历史发布包沿用各自的验证记录。

### E 阶段开发与隔离体验快照

2026-11-13 已按[同步资源优化规划](plans/2026-11-13-sync-resources.zh.md)实现未变化资源校验复用、缺失资源分批接收及共享资源保留。[交付与验证](plans/2026-11-13-sync-resources-results.zh.md)分别报告实际显示和受控接收耗时，保留初版回退修正与全部样本。

2026-11-13 已按[批准规划](plans/2026-11-13-file-add-performance.zh.md)完成小文件单次接收和限定旧任务扫描。照片加文本同条件五次基线中位 1418 ms，同步空闲后的五次中位 872 ms；同步繁忙首轮中位 2472 ms，仍有排队。[交付与验证](plans/2026-11-13-file-add-performance-results.zh.md)保留全部样本和后续同步优化候选。

2026-11-12 已补齐[正文与补充区粘贴、拖放](plans/2026-11-12-paste-and-drop.zh.md)，实际验证及体验步骤见[交付记录](plans/2026-11-12-paste-and-drop-results.zh.md)。

2026-11-12 已实现[正文材料、补充附件与标签区修正](plans/2026-11-12-body-and-supplements.zh.md)，交付与验证见[体验记录](plans/2026-11-12-body-and-supplements-results.zh.md)。

2026-11-12 已完成[会话引用入口、多选与追加](plans/2026-11-12-conversation-reference.zh.md)，[交付与实测](plans/2026-11-12-conversation-reference-results.zh.md)包含体验步骤、深浅色截图和前后耗时。

2026-11-12 已完成[笔记本名称唯一性修正](plans/2026-11-12-notebook-names.zh.md)，[交付记录](plans/2026-11-12-notebook-names-results.zh.md)包含验证与体验步骤。

2026-11-12 已完成[工作区笔记本原地操作与取消新建返回修正](plans/2026-11-12-sidebar-inline-actions.zh.md)，[交付记录](plans/2026-11-12-sidebar-inline-actions-results.zh.md)包含第二档 45 项测试、真实侧栏回归和体验步骤。

2026-11-12 已完成[本机编辑草稿](plans/2026-11-12-local-edit-drafts.zh.md)，保存实测中位 457 → 18 ms，见[交付与体验步骤](plans/2026-11-12-local-edit-drafts-results.zh.md)。

2026-11-12 已完成 [E 体验修正](plans/2026-11-12-stage-e-refinement.zh.md)，连续关联实测中位从 918 ms 降至 297 ms，见[交付与体验入口](plans/2026-11-12-stage-e-refinement-results.zh.md)。

2026-11-11 前一轮体验为 [E 验收修正版](plans/2026-11-11-stage-e-review-results.zh.md)与[已批准规划](plans/2026-11-11-stage-e-review.zh.md)，截图见 `output/playwright/e-review/index.html`。同日完成[侧栏与转存流程、后台 AI 建议修正规划](plans/2026-11-11-stage-e-follow-up.zh.md)及[本轮结果](plans/2026-11-11-stage-e-follow-up-results.zh.md)。

历次阶段功能说明见 [E 阶段交付](plans/2026-11-11-stage-e-results.zh.md)、[B—D 交付](plans/2026-11-10-bcd-results.zh.md)、[B—D 方案](plans/2026-11-10-bcd-implementation.zh.md)和[阶段 A 交付](plans/2026-11-10-stage-a-results.zh.md)；rc.4 Web 入口与正式版证据见[兼容验收](plans/2026-11-18-dsh-compatibility-range-092.zh.md#体验与证据)。

### 阶段演进备忘

由[主规划](plans/2026-11-09-product-iteration-roadmap.zh.md)统一维护顺序和阶段状态：**A—D 与性能优化已随 0.8.0 发布 → E 会话复用 → 候选清单回顾与取舍 → 按确认补齐选中项目或接续 F AI 输出**。原 E 已提前并编号为 D，原 D 顺延为 E；普通功能集中发布，保存和同步的实际问题优先处理。

2026-11-10 已按授权完成 [E0 可行性验证](plans/2026-11-10-e0-conversation-validation.zh.md)、[材料引用补验](plans/2026-11-10-e0-material-reference-validation.zh.md)、[普通附件与交付文件补验](plans/2026-11-10-e0-conversation-files-validation.zh.md)、[图片/附件限制参考与常见规模小测](plans/2026-11-10-e-import-size-reference.zh.md)及[E1—E3 具体方案](plans/2026-11-10-stage-e-implementation.zh.md)。此前 A1 之前的证据见[独立窗口小范围验证](plans/2026-11-09-independent-window-validation.zh.md)，早期侧栏备忘见[默认笔记本规划](plans/2026-11-08-default-notebook.zh.md#后续备忘未进入详细规划)。

常用功能统一维护于主规划的[候选清单](plans/2026-11-09-product-iteration-roadmap.zh.md#候选清单)，允许根据反馈和验证结果增删改；候选项不自动获得实施授权，也不要求全部完成后才能进入 F。用户另行要求保留[直接附加到输入框附件栏的复查备忘](plans/2026-11-09-product-iteration-roadmap.zh.md#宿主接口开放后补齐直接附加)：DSH 新版兼容性检查、E 后回顾和 F 详细规划时主动核查公共接口；条件具备时提醒用户并建议补验、规划补齐。
