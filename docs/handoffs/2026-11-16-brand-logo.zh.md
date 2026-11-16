# Logo 设计与接入交接

2026-11-16。本记录供主开发会话继续迭代，专项状态以之后的源码和[开发入口](../README.md)为准。接手先遵循 [AGENTS.md](../../AGENTS.md)，再读[产品设计](../notes-design.zh.md)和[主规划](../plans/2026-11-09-product-iteration-roadmap.zh.md)；本交接不另设开发路线。

## 本轮已交付

实现提交为 `976b87c`（`feat: 接入肥鱼品牌图标与帮助页标识`），基于设置面板修正 `60253c8`。保留后续提交与工作区改动，接续不回退到这些历史提交。

用户确认「墨鱼·叠页」鱼形，补充鱼形＋肥鱼笔记＋Fatfish Notes 的正方形组合；中英字形按用户指定概念图重绘为路径。已完成透明边缘、小尺寸轮廓及浅深版本。具体选择过程、原图与制作数据见[设计素材索引](../brand/README.zh.md)，场景和主题规则见[品牌规则](../brand.zh.md)。

批准接入已完成：DSH 16 px、会话 17 px、主／独立窗口 20 px 纯图标；首次接入等使用原容器中的 28 px 图标；欢迎区 64 px 双色鱼形；设置 → 帮助底部使用透明完整组合，最大宽 480 px，随当前视图明暗和窗口大小适配。书本、设置齿轮等功能图标保留。包图标、180 px PNG、favicon 与本地 README 已更新。

设置界面在设计期间变成五分类且独占内容面板，因此没有恢复已隐藏的同步表单图标。侧栏设置仍为三个分类；帮助页大品牌是用户明确追加的位置。方案已考虑这些调整，不能根据旧截图恢复旧设置结构。

## 后续修改从哪里入手

| 修改对象 | 文件入口 |
| --- | --- |
| 当前 SVG、微型轮廓、浅深组合 | [assets/brand/](../../assets/brand/)；输入与派生关系见[素材维护说明](../brand/README.zh.md#修改与派生关系) |
| 客户端品牌路径生成／渲染 | [generate-brand.ts](../../scripts/generate-brand.ts)、[Brand.tsx](../../src/client/Brand.tsx)；`brand-artwork.ts` 为生成常量 |
| DSH 入口与会话入口 | [index.tsx](../../src/client/index.tsx)、[ConversationNotes.tsx](../../src/client/ConversationNotes.tsx) |
| 主界面、首次接入、帮助页 | [NotesPage.tsx](../../src/client/NotesPage.tsx)、[SettingsPage.tsx](../../src/client/SettingsPage.tsx)、[SettingsWorkspace.tsx](../../src/client/SettingsWorkspace.tsx)、[SettingsTabs.tsx](../../src/client/SettingsTabs.tsx) |
| 当前视图明暗与品牌色 | [appearance.tsx](../../src/client/paper/appearance.tsx) |
| 独立页 favicon 固定资源 | [standalone-assets.ts](../../src/host/standalone-assets.ts)、[相关测试](../../test/standalone-assets.test.ts) |

字形参考图的鱼是单层原形；只借用其字形，当前鱼形保持叠页稿。文字已转曲，不能换成系统字体后声称保持原字形。16 px 主要靠轮廓识别；与通用书本相比有品牌区分度，但没有进行用户辨识实验。后续设计调整按项目约定先规划、获批，再改源稿及受影响派生资源。

## 验证与体验边界

按第二档完成类型检查、构建和 28 项相关测试；32 个真实布局／明暗检查点及 1 个 390 px 模拟点通过。首次接入接口完全模拟；微型图形的像素倍率模拟不等同于物理系统缩放测试。没有重复全量回归，Windows 任务栏图标未单独验收。详细证据、安装包哈希、回退方法统一见[交付记录](../plans/2026-11-16-brand-logo-results.zh.md)。

双击 [Open-Fatfish-Notes.cmd](../../scripts/Open-Fatfish-Notes.cmd)，进入肥鱼笔记 → 设置 → 帮助。运行资料属于项目的隔离测试环境；日常 DSH 未改动。正式版仍为 `0.8.0`，本轮没有发布、推送公开品牌资源或启动 F。

本机实际界面图册已归档到 [.dsh-home/pure-001/brand-logo-20261116/design-preview/actual.html](../../.dsh-home/pure-001/brand-logo-20261116/design-preview/actual.html)；同目录 `index.html` 是实施前场景预览，两者用途不同。截图、测试日志、安装包按项目约定留在忽略目录，其他电脑需另行获取或重新生成。

## 本次文档归档

当前 SVG 保持单一维护位置；概念原图、字形裁片、轮廓／排布数据、58 个 PNG 与独立素材预览已入 `docs/brand/`，文件来源和哈希见其清单。旧方案标记为历史，防止把其中“待批准”误当成当前状态。开发入口增加按任务导航，主规划和品牌规则均链接本交接。

这次归档仅改变素材与文档，核对文件哈希、素材尺寸、相对链接、SVG 与编辑数据关系、Git 差异；不重装插件、不重复功能测试。其他会话使用同一目录即可读取，其他工作树或电脑需先同步这些文件。未推送状态不能当成远端已具备材料。

归档检查：105 个复制文件哈希一致，58 个 PNG 尺寸正确，鱼形与文字编辑数据和当前浅深 SVG 路径一致，两份素材预览与本机图册的静态文件链接有效。导航检查覆盖根 `AGENTS.md` 与 `docs/` 下共 117 份 Markdown：708 条相对链接目标存在，这些文档均能沿文件链接从 `AGENTS.md` 到达；同时补上两份早期发布材料的历史入口。此检查证明本机文件可发现，不等于逐项重审全部历史结论、验证外网链接或保证每个 AI 都会自动读完。
