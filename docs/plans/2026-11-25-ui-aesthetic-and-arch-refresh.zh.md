# 肥鱼笔记设计、UI 审美与前端/核心架构综合改进实施规划

- **日期**：2026-11-25
- **分支与目录**：`codex/ui-arch-refresh`（主目录 `D:\DSH-Workspace\dsh-github-notebook`）
- **状态**：已获用户明确批准（2026-11-25，三批全选并采用既定取舍，按 P0 → P1 → P2 连续实施并统一验证交付）
- **基线版本**：`0.12.0`（`main` 提交 `eba78b2`）

## 一、目标、非目标与已拍板取舍

### 目标
1. **P0（显性视觉与双语 Bug 快修）**：
   - 修复 `.paper-summary` 双重左竖线与底部 17px 多余灰尾，阅读态改用语义化结构替代无控件关联的 `<label>`；
   - 修复主界面/独立窗口顶栏切页时明暗切换按钮跳到左侧的问题，统一右侧工具组容器；
   - 修复 [NoteOverview.tsx](../../src/client/paper/NoteOverview.tsx) 硬编码中文指南链接，按 `t.language` 切换中英文手册；
   - 修复 `style.ts` 中未定义变量 `--paper-muted`，为同步异常提供清晰语义警示色；
   - 清理 `layout-themes.ts` 中的死选择器 `.paper-feedback-link`。
2. **P1（UI 审美与空间效率跃迁）**：
   - **布局精简与平滑迁移（用户已拍板 A1）**：直接精简为 **3 套精品布局**（`soft` 柔和卡片三栏、`outline` 经典秩序分栏、`tree` 目录树双栏），彻底移除其余 5 套布局（`ribbon`、`dock`、`ink`、`island`、`archive`）的样式和特判代码；在 `domain/appearance.ts` 与 `host/appearance.ts` 对既有 `appearance.json` 与 `localStorage` 旧值做自动迁移映射（`island` → `soft`，其余 4 套 → `outline`），保证老用户零报错平滑升级；
   - **品牌色与深色系统升级（用户已拍板 A3）**：新增 `berry`（莓紫春芽）为首位推荐色板，默认配色仍沿用 `native`（DSH 原生）；概览页配色统一派生自当前色板（品牌鱼形保留莓紫春芽固定双色）；深色模式改用纯净中性炭黑分层（`#111215` / `#18191d` / `#141519` / `#121317` 代码底），消除单色 `color-mix` 导致的墨绿雾色偏；全入口主按钮与语义状态色统一；
   - **现代表单控件**：设置页告别 `<fieldset>/<legend>` 与纯文字 `<select>` 盲选，改用圆角分区卡片、三色圆点色板卡片与分段控件（Segmented Control）；主界面与侧栏列表工具栏将「全部/收藏/最近」改为轻巧分段控件；
   - **空间效率与自适应（用户已拍板 A2）**：
     - 正文无章节标题时自动收起 220px 空目录列（保留手动展开和快捷键），边缘悬浮 `》` 升级为贴边圆角药丸手柄；
     - 会话侧栏阅读态激进瘦身：压缩 5 层头部条带（~188px）至 2 层紧凑工作带（~82px），保留多标签切换、新增与关闭能力，净释放约 100px+ 正文阅读高度，同时修正侧栏列表图钉图标间距；
     - 会话转存宽窗弹窗取消固定 780px 高度，改为 `fit-content` 自适应内容高度并保留最大视口上限，统一主按钮为 `--accent`，补齐图片文件视觉标识/缩略提示。
3. **P2（效率提升与工程减债）**：
   - **全局快速切换 / 命令面板（`Ctrl+K` / `Cmd+K`）**：复用本机列表/最近访问/标签目录缓存与 120ms 防抖查询，支持键盘 `↑/↓/Enter/Esc` 模糊搜笔记、笔记本、标签与快捷动作（新建、切换明暗、同步、跳分类管理/设置），中英文双语完整覆盖；
   - **CSS `@layer` 单例样式架构**：引入单例 `<style data-fatfish-styles>` 注入机制与 `@layer base, layout, components, themes, overrides;`，消除主界面/侧栏重复渲染数百行 `<style>` 标签，清理 `notes-style.ts` 废弃 `.notes-shell`/`.notes-columns` 死样式并大幅消除 `!important`；
   - **核心巨型模块高内聚拆分**：将 `src/notes/repository.ts`（1,029 行）、`src/private-workspace/sync.ts`（676 行）、`src/client/notes-controller.ts`（605 行）、`src/client/ConversationNotes.tsx`（400 行）按职责拆分为清晰子模块，对外契约、存储格式与行为 100% 等价。

### 明确非目标
- 不更改笔记存储格式（notes manifest v3/v4）、Git 同步协议或 HTTP 路由安全栅栏；
- 不新增第三方 UI 组件库或运行时外部依赖；
- 不修改日常 DSH 资料，不自动发版或更新插件市场。

## 二、分批进度与工作记录

| 批次 | 范围 | 状态 | 验证与备注 |
| --- | --- | --- | --- |
| 批次 1（P0） | 5 处客观视觉与双语 Bug 修复 | 进行中 | 待完成 |
| 批次 2（P1a） | 3 套布局迁移、莓紫春芽色板、深色炭黑重构、现代设置页与分段控件 | 待开始 | 待完成 |
| 批次 3（P1b） | 空目录自动隐藏、会话侧栏 2 层瘦身、转存弹窗自适应高度 | 待开始 | 待完成 |
| 批次 4（P2a） | `Ctrl+K` 全局快速切换 + CSS `@layer` 单例注入重构 | 待开始 | 待完成 |
| 批次 5（P2b） | 4 个核心巨型模块拆分 + 第三档全量回归与视觉实拍验收 | 待开始 | 待完成 |

## 三、影响面与兼容保护

- **外观持久化兼容**：`SharedAppearance.load()` 在读取旧版 `appearance.json` 遇到已退役布局值（`ribbon`/`dock`/`ink`/`island`/`archive`）时自动映射至目标 3 套布局（`island` → `soft`，其余 → `outline`）并透明通过校验，不抛 `appearance_invalid`；新增色板 `berry` 进入 `domain/appearance.ts` 合法集合。
- **双语词表**：同步更新 `locale/zh.json` 与 `locale/en.json`，覆盖新增色板名称、3 套布局描述、分段控件与 `Ctrl+K` 面板全部文案与无障碍属性。
- **性能目标**：100 篇隔离资料与 1,000 篇模拟元数据下，`Ctrl+K` 面板呼出与缓存过滤中位响应 `< 50ms`，不阻塞网络；CSS 单例注入消除跨入口重复解析。

## 四、验证计划与回滚

- **验证范围**：
  - 批次 1–3：运行 `npm run typecheck`、`npm run build`、相关单测、`npm run test:sidebar`、`node test/browser/check-dialog-sizes.mjs`；
  - 批次 4–5：升级为**第三档全量回归（`npm test`）** + 侧栏/弹窗浏览器回归 + 隔离桌面/Web 浅深双语实拍与 5 次样本性能测量；
- **回滚方式**：短期分支 `codex/ui-arch-refresh` 按批次原子提交，任一批次可独立 `git revert`，无不可逆数据迁移。

## 五、实测结果与交付记录

> 随各批次完成持续补充实际命令结果、测试数、性能样本与视觉截图证据。
