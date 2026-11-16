# 品牌设计素材与维护索引

2026-11-16 归档。本目录保留设计依据、编辑数据与导出素材；**当前使用的矢量源稿统一在 [assets/brand/](../../assets/brand/)**。用途和尺寸见[品牌规则](../brand.zh.md)，接入与验证见[专项交接](../handoffs/2026-11-16-brand-logo.zh.md)。本目录不进入插件安装包。

## 已确认的设计过程

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
| [纯图形素材预览](preview.html)、[品牌组合预览](brand-square-preview.html) | 本地直接打开；引用当前 SVG，提供实际尺寸与 PNG 下载 |

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
| `fatfish-mark-small-mono.svg` → [generate-brand.ts](../../scripts/generate-brand.ts) | `src/client/brand-artwork.ts` 的 `smallMark` 和 `assets/brand/favicon.svg` |
| `fatfish-mark.svg` → 同一脚本 | `brand-artwork.ts` 的 `colorMark` |
| `fatfish-brand-square-light.svg` → 同一脚本 | `brand-artwork.ts` 的 `brandSignature`；去掉底矩形，墨色由当前视图提供 |
| 浅深两份 `fatfish-brand-square-*.svg` → 同一脚本 | 两份 `fatfish-brand-transparent-*.svg` |
| 其他需手动同步的导出 | 根目录 `icon.svg`、`assets/icon-180.png`、favicon 16／32 PNG 及本目录 PNG；上述脚本不会更新这些文件 |

品牌路径或排布调整后，在项目根目录运行 `npx tsx scripts/generate-brand.ts`，再按实际影响构建、检查页面；`lib/` 始终由正常构建生成。若只调整放置位置，改 [Brand.tsx](../../src/client/Brand.tsx) 的使用处和相关布局；当前明暗逻辑见 [appearance.tsx](../../src/client/paper/appearance.tsx)，具体入口文件见[交接](../handoffs/2026-11-16-brand-logo.zh.md#后续修改从哪里入手)。

复核要点：SVG 不引入字体、嵌入图片或外部资源；浅深两版保持同一几何，透明版没有整张底矩形，眼孔和层间可透出页面。微型图标检查 16／17／20 px，完整组合检查浅深、窄窗和矮窗；PNG 核对所需尺寸及 Alpha。色值与场景规则统一见[品牌使用](../brand.zh.md)，避免在多个文档另设标准。

## 实际界面与历史预览

2026-11-16 新增[微型鱼形两版评审](reviews/2026-11-16-small-mark/README.zh.md)：A 保留叠页、B 轮廓优先，与现版并排展示实际尺寸浅深效果。候选尚未选定或接入，不替代以上已确认资源与维护依据。

当前真实界面使用[隔离体验入口](../../scripts/Open-Fatfish-Notes.cmd)。本机[实际图册](../../.dsh-home/pure-001/brand-logo-20261116/design-preview/actual.html)与[实施前场景预览](../../.dsh-home/pure-001/brand-logo-20261116/design-preview/index.html)已复制到项目的忽略目录，保留真实／模拟／合成标注。历史方案中的 `127.0.0.1:8816` 只是当时临时服务地址，后续不依赖它。

运行截图、日志、安装包属于本机证据，不随 Git 克隆；必要的设计原图、编辑输入、导出素材与说明在本目录受版本管理。当前归档与实现均未推送，换工作树或电脑前先核对文件同步情况。
