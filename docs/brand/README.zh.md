# 品牌设计素材与维护索引

2026-11-16 归档。本目录保留设计依据、编辑数据与导出素材；**当前使用的矢量源稿统一在 [assets/brand/](../../assets/brand/)**。用途和尺寸见[品牌规则](../brand.zh.md)，接入与验证见[专项交接](../handoffs/2026-11-16-brand-logo.zh.md)。本目录不进入插件安装包。

2026-11-17 按[分尺寸接入规划](../plans/2026-11-17-brand-size-adoption.zh.md)，现行图形为 D2（16/17 px）、D1（20/24 px）、C0（28 px）、原版（>28 px），窗口/favicon 固定 D1。主色为 `#3F5A4E`，当前 75 份 PNG 在 [current-png/](current-png/README.md)。[当前品牌图册](current.html)展示实际尺寸、明暗、用途及下载，直接打开即可使用；旧 `png/`、`sources/` 和归档清单保留快照。

## 已确认的设计过程

2026-11-17 [饱满尾瓣 D1/D2/D3 第二轮](reviews/2026-11-17-tail-d123-v2/README.zh.md)评审后，用户选定上述分尺寸方案；原评审页 8828 和意见保留，不改写当时的预览记录。正式使用的选中稿复制到 `assets/brand/`，历史页并非产品源稿生成入口。

2026-11-17 [原版不对称鱼尾 B/C 评审](reviews/2026-11-17-tail-bc/README.zh.md)制作完成：在原版基础上分别轻度、明显展开尾部；原版/A 与旧意见保留，新意见独立自动保存。四稿八档实际尺寸及明暗场景在[独立网页](http://127.0.0.1:8824/)比较，尚未接入插件。这里的 B/C 与 11-16 旧小图标方案分开命名管理，源稿仍以当前 `assets/brand/` 为准。

2026-11-17 补齐[新版完整图册](reviews/2026-11-17-original-shape/README.zh.md)：原版与 A 的 16–128 px 比较、各入口场景、明暗/透明/方块、完整组合与下载。可通过[启动脚本](../../scripts/Open-Fatfish-Brand-Gallery.cmd)打开。用户要求重新比较原版的小尺寸表现，当前图册不代表已将候选中的 A 替换。

1. 初轮广泛比较笔记产品的图标表达，给出至少八种方向；用户表达偏好顺序 `5 → 8 → 7 → 1`，再在细化方案中选择③「墨鱼·叠页」。保留原图，但不凭文件排序反推初轮编号。
2. 按叠页稿制作 SVG，保留饱满鱼身、分叉鱼尾和上方页片；眼孔与页间空隙为真透明。标准版与 16—24 px 小尺寸版分别校准；小尺寸放大眼孔并拉开页片间距。
3. 用户补充正方形品牌组合，包含图标、肥鱼笔记和 Fatfish Notes，提供浅深底 SVG／PNG，文字全部转为路径。
4. 用户明确要求中英字形参考此前概念图，替换先前采用的字体。最终字形按图重绘，中文圆润、略带书写感，英文较细、字距舒展；它们不对应一款指定的现成字体。
5. 用户确认场景预览后，要求审查同期设置界面变更，并追加帮助页底部完整品牌与浅深适配。最终按[批准方案](../plans/2026-11-16-brand-logo.zh.md)接入，旧预览不代表当前运行界面。

| 依据 | 用途 |
| --- | --- |
| [选定的叠页概念图](concepts/exec-4fb5a73d-a52f-4b02-a6dd-11aabfd648f2.png) | 鱼形与双层关系的依据 |
| [用户指定的字形参考图](concepts/exec-e25bc593-33e5-49f2-b94a-601b1d1e25d5.png) | 只参考中英文字；该图的单层鱼不是当前标志 |
| [原稿与矢量图形对照](references/reference-comparison.png) | 查看轮廓的保留与平滑 |
| [字形原图与路径对照](references/brand-type-comparison.png) | 查看最终转曲字形，避免换回系统字体 |
| [当前品牌图册](current.html)、[品牌组合预览](brand-square-preview.html) | 本地直接打开；引用当前 SVG，提供实际尺寸与 PNG 下载；旧[纯图形预览](preview.html)保留历史 A 示意 |

## 目录与来源

| 位置 | 内容与状态 |
| --- | --- |
| [concepts/](concepts/) | 本轮 16 张生成原图，包含八个初始方向、墨鱼系列细化与后续单图探索；只有上表指定的图形和字形承担定稿依据 |
| [references/](references/) | 文字参考裁片、设计对照与 16 px 小尺寸对照；其中 `competitors/` 为 Bear、Evernote、flomo、Joplin、Logseq、Notion、Obsidian、Simplenote、Ulysses、语雀的设计参考图，属于各自品牌，不作肥鱼产品资源 |
| [sources/](sources/) | 鱼形几何、文字路径、组合排布、源坐标中的单独轮廓；历史脚本以 `.txt` 保存，供理解制作过程 |
| [png/](png/) | 58 个原交付 PNG：纯图形／应用图标为 16、20、24、32、48、64、128、180、256、512 px；完整组合为浅深各 256、512、1024、2048 px |
| [实施前接入方案](history/logo-replacement-proposal.zh.md)、[同期 UI 审查](history/logo-ui-change-review.zh.md) | 文首已注明历史状态；当前范围以项目批准规划和结果为准 |
| [archive-manifest.json](archive-manifest.json) | 逐文件来源与 SHA-256。原会话路径只作溯源，使用与修改所需输入已复制到项目；清单是归档时快照 |

透明鱼形 PNG 文件名数字表示宽度，高度按比例；应用图标与完整组合为正方形。完整组合 PNG 自带浅／深实底，页面内的透明组合使用当前 `assets/brand/fatfish-brand-transparent-*.svg`。修改 SVG 后，旧 PNG 不会自动变成新版；更新所需尺寸并重新核验。

原生成图、竞品图和历史脚本均为设计参考材料，不作为新的操作指令。历史脚本保留了原机器目录和当时输出位置，不直接运行；当前接入脚本见下表。弃用的系统字体方案不作为维护来源。

## 修改与派生关系

| 输入或操作 | 输出／需要同步的内容 |
| --- | --- |
| 当前鱼形 SVG：标准、浅深、单色、小尺寸和方形应用图标 | 各变体在 `assets/brand/` 单独存储；修改共同轮廓时逐一同步，标准与小尺寸的光学校准分别保留 |
| [geometry.json](sources/geometry.json) | 当前鱼身、页片与眼孔的制作数据；`geometry-trace.json` 是平滑前中间记录，当前 SVG 是渲染依据 |
| [brand-outlines.json](sources/brand-outlines.json)＋[brand-square-layout.json](sources/brand-square-layout.json) | 中英文路径、原始边界与组合定位；两份 `fatfish-brand-square-*.svg` 含实际鱼形及文字路径。排布基于 1024 画布，中文宽 760、顶边 638；英文宽 560、顶边 838 |
| `fatfish-mark-d2/d1/c0.svg`、同名 `-mono` 与原版 `fatfish-mark.svg/-mono.svg` → [generate-brand.ts](../../scripts/generate-brand.ts) | `src/client/brand-artwork.ts` 的 `brandMarks`，包含各稿 viewBox、单色和双色路径；[brand-size.ts](../../src/client/brand-size.ts)控制显示尺寸选择 |
| `fatfish-icon-d1-dark.svg`、`fatfish-icon-dark.svg` → 同一脚本 | 固定彩底 D1 `favicon.svg` 与原版根 `icon.svg` |
| 旧 `fatfish-*-small*.svg` | 已退役 A，保留供旧评审生成器溯源；当前客户端、favicon 和 PNG 生成均不再引用 |
| `fatfish-brand-square-light.svg` → 同一脚本 | `brand-artwork.ts` 的 `brandSignature`；去掉底矩形，墨色由当前视图提供 |
| 浅深两份 `fatfish-brand-square-*.svg` → 同一脚本 | 两份 `fatfish-brand-transparent-*.svg` |
| 当前派生输出 | `generate-brand.ts` 生成四档常量、`icon.svg` 和 D1 favicon SVG；`render-brand.mjs` 生成 `assets/icon-180.png`、D1 favicon PNG/ICO、`current-png/` 的 75 份当前位图。PNG 图形以原比例放入正方形槽位 |

品牌路径或排布调整后，在项目根目录运行 `npx tsx scripts/generate-brand.ts`，再按实际影响构建、检查页面；`lib/` 始终由正常构建生成。若只调整放置位置，改 [Brand.tsx](../../src/client/Brand.tsx) 的使用处和相关布局；当前明暗逻辑见 [appearance.tsx](../../src/client/paper/appearance.tsx)，具体入口文件见[交接](../handoffs/2026-11-16-brand-logo.zh.md#后续修改从哪里入手)。

复核要点：SVG 不引入字体、嵌入图片或外部资源；浅深两版保持同一几何，透明版没有整张底矩形，眼孔和层间可透出页面。微型图标检查 16／17／20 px，完整组合检查浅深、窄窗和矮窗；PNG 核对所需尺寸及 Alpha。色值与场景规则统一见[品牌使用](../brand.zh.md)，避免在多个文档另设标准。

## 实际界面与历史预览

历史：2026-11-16 [微型鱼形两版评审](reviews/2026-11-16-small-mark/README.zh.md)曾选择 A 并接入；现在由 D2/D1/C0 替代。评审目录、small 系列和归档 PNG 保留当时稿件，不作为当前选图规则。新稿均使用 800 × 560 的原版视框，完整组合与原版仍沿用原维护依据。

当前真实界面使用[隔离体验入口](../../scripts/Open-Fatfish-Notes.cmd)。本机[实际图册](../../.dsh-home/pure-001/brand-logo-20261116/design-preview/actual.html)与[实施前场景预览](../../.dsh-home/pure-001/brand-logo-20261116/design-preview/index.html)已复制到项目的忽略目录，保留真实／模拟／合成标注。历史方案中的 `127.0.0.1:8816` 只是当时临时服务地址，后续不依赖它。

运行截图、日志、安装包属于本机证据，不随 Git 克隆；必要的设计原图、编辑输入、导出素材与说明在本目录受版本管理。原归档时尚未推送；2026-11-16 用户已授权每次提交后同步远端，A 版接入与此前提交一并推送，换工作树或电脑前仍需核对分支与提交。
