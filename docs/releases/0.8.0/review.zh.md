# 0.8.0 发布审核

状态：2026-11-10，用户明确确认后，**0.8.0 已正式发布，匿名下载与公开 URL 实际安装验证通过**。原市场条目更新 [PR #13891](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/13891)的 `check` 和 `Submission gate` 均已通过；本次核对仍未合并，等待维护者审核，尚未声称市场页面已显示新版。

## 审核材料

- [发布说明](release-notes.md)
- [市场条目](marketplace-entry.yml)与 [PR 正文](marketplace-pr.md)
- [准备规划](../../plans/2026-11-10-release-080.zh.md)、[性能实测](../../plans/2026-11-10-performance-results.zh.md)与[功能验收](../../plans/2026-11-10-bcd-results.zh.md)

上版 0.7.0 的市场更新 [PR #13502](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/13502)已于 2026-11-10 08:14（北京时间）合并。本次更新同一个条目，不重复申请收录。

## 正式发布与公开安装

- [GitHub Release v0.8.0](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.8.0)于 2026-11-10 16:17（北京时间）公开，为正式版及最新发布，非草稿或预发布。
- 发布标签对应源码 `c8128cea16e76b400a258a6c97856a2c30a91ca2`，包含下述最终包的说明更新；后续发布记录按正常提交补充，不移动标签或替换资产。
- 安装包、SHA-256 文件、图标和 8 张展示截图均使用无授权请求下载，内容逐项匹配本机文件。
- 使用公开 Release URL 实际安装至项目内 `release12-desktop` 隔离 profile，全部 151 个安装文件与正式包一致。嵌入笔记页面和独立三栏窗口均打开正常，默认笔记本、既有正文、归档图片、普通附件字节及历史预览通过，无页面错误。
- 2026-11-10 16:27（北京时间）指定私库同步成功，状态 `idle/pending=false`。测试后关闭自建 DSH 和 Chrome；未改动日常资料，也未调用模型额度。
- 本轮证据：`.dsh-home/pure-001/release080/` 中的 `publication.json`、`public.json`、`public-installed.json`、`public-smoke.json` 和 `public-installed.png`。体验入口现为已公开的正式安装包。

## 正式包核对

- 正式包：`dist/dsh-fatfish-notes-0.8.0.tgz`，151 个文件，15,033,583 字节。
- 最终 SHA-256：`359b175cf89f509c41002efbbd94c52b7f7ee101c75c66b7490ade44e23289f9`，对应 `dist/SHA256SUMS-0.8.0.txt`。
- 与下述审核候选包逐文件比较，仅 `README.md` 和 `README.en.md` 改变；运行代码、版本、依赖及其他文件完全相同。说明文件本地链接、8 张截图路径及 Git 差异检查通过，未重复未受影响的全量回归。记录为 `.dsh-home/pure-001/release080/final-audit.json`。

## 最终检查

- 审核候选包：`dist/fatfish-080-candidate-43bdf1002d30.tgz`，151 个文件，15,033,279 字节。
- 候选 SHA-256：`43bdf1002d304d3d588ba64c3f07a9f741bbbd98d0633509ec353ec3a360f3b4`。正式包已更新中英文安装说明并重新核对，最终校验值见上文，不覆盖本候选记录。
- 与用户已体验的性能优化包逐文件比较，仅 `package.json` 和中英文 README 改变；运行代码、依赖和其他打包文件相同。无测试 profile、源码、缓存或凭据，字体与必要许可证均随包分发。
- 已实际安装到 `release12-desktop` 隔离资料，版本为 0.8.0，151 个文件与包逐项一致。
- 按发布第三档依次完成类型检查、构建和全量回归。全量 261 项首次 260 项通过、1 项失败，无跳过，约 13 分 39 秒。失败发生在「切换到已有 B 仓库」测试创建 Git 缓存时，Windows 目录重命名返回 `EPERM`，不是断言差异；具体占用来源未确认。保持代码、断言与测试目录配置不变，该项单独连续复测两次均通过。没有把首次失败改写成一次全绿，也没有放宽校验或修改产品代码。
- 全量日志 `release080/tests.log`、复测日志 `retest-1.log` 和 `retest-2.log`，均位于 `.dsh-home/pure-001/`；运行代码与此前 A—D 和性能专项相同。

## 升级验证

以已匿名下载的公开 0.7.0 安装包为旧实现，先核对其原发布 SHA-256，再创建隔离的空库和有内容的笔记库。0.8.0 读取后，空库保留同一个默认笔记本；已有正文、标签、摘要、笔记本归属、旧修订及图片/普通附件字节保持不变。随后可收藏并保存独立模板，重开仍保留，原文的三次历史修订可读。

这是真实旧版存储实现到候选实现的离线资料升级，实际宿主安装和私库绑定另行验收；没有接管用户日常资料。脚本及结果为 `.dsh-home/pure-001/release080/upgrade.mjs`、`upgrade.json`。

## 备份与回退

安装前已保留隔离笔记、profile 安装配置和上一性能包，备份在 `.dsh-home/pure-001/release080/install-backup-20261110-151645/`。候选版可回到同样支持 A—D 字段的性能包。若需退回公开 0.7.0，须关闭相关窗口并恢复与该版本配套的本地和云端资料备份；不能仅替换程序继续写新版资料。没有重写远端历史。

实际安装与包核对结果为 `.dsh-home/pure-001/release080/installed.json`、`audit.json`。

## 最终宿主与性能抽查

在安装的 0.8.0 候选包上，通过隔离 DSH 侧栏进入笔记，并打开共用同一服务的独立 Chrome 页面。实际读取已有归档图片和普通附件字节、预览历史、编辑并完成保存；另一窗口自动显示最新正文，同篇编辑保护仍生效。指定私库 `StarWind97/dsh-community-private-test`（仓库 ID `1440762952`）同步成功，状态 `idle/pending=false`。关闭后重启精确读回新正文；本轮临时验收笔记通过正常回收站/彻底删除接口清理并再次同步。

最终包的性能抽查沿用 B—D 隔离示例和前次点击到内容绘制完成的口径，在全量回归和复测结束后单独进行：

| 操作 | 样本数 | 中位数 / 最大值 |
| --- | --- | --- |
| DSH 内切换笔记本 | 10 | 104 / 146 ms |
| DSH 内打开普通正文 | 5 | 117 / 134 ms |
| DSH 内打开 1108 字符示例 | 5 | 113 / 128 ms |
| 独立窗口切换笔记本 | 10 | 158 / 183 ms |
| 独立窗口打开普通正文 | 5 | 150 / 167 ms |
| 独立窗口打开 1108 字符示例 | 5 | 164 / 183 ms |

独立页面首次加载单次为 1.269 秒；DSH 侧栏就绪后点击笔记至正文显示单次为 1.736 秒。两项首次加载均不作为稳定性承诺。自动脚本中包含 DSH 侧栏启动等待的 5.943 秒不作为插件首次加载时长。原前后对比及约 4000 字符文章补验沿用相同运行代码的[性能交付](../../plans/2026-11-10-performance-results.zh.md)，不重复测旧版基线，也不推断数千篇资料库速度。

原始记录为 `.dsh-home/pure-001/release080/verification.json`、`candidate.json`、`metrics-summary.json`。测试结束已关闭自建 DSH 和 Chrome；[Open-Fatfish-Notes.cmd](../../../scripts/Open-Fatfish-Notes.cmd)现已换为上述公开正式包。没有操作日常 DSH 或调用模型额度。macOS、两台物理设备、硬断电与大型真实资料库仍未覆盖。

## 实际效果

截图来自本次最终候选包的隔离示例；拍摄时同步尚在进行，随后已完成上述实际同步核验。

![三栏与独立页面](../../../assets/screenshots/07-three-columns.png)

![历史版本预览](../../../assets/screenshots/08-history.png)

## 市场更新

更新原条目的 [PR #13891](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/13891)仅修改 `data/plugins/StarWind97__dsh-fatfish-notes.yml`，更新中英文简介及 0.8.0 安装包地址，保留仓库、名称、分类和图标。核对相对提交时上游主分支只有一个提交、一个文件差异；未编辑生成的 README，也未创建新插件条目。

分支为 `StarWind97:codex/update-fatfish-notes-0-8-0`，提交 `364fae97ffb572566e6d0a02f0bc6b179e60a89d`。证据为 `.dsh-home/pure-001/release080/market-submit.json`；维护者合并和市场目录刷新仍由上游处理。

不发布 npm。市场提交、维护者合并和市场页面可见分别核对，不将提交成功当作已经上架。
