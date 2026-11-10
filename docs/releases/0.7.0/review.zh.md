# 0.7.0 发布审核

状态：2026-11-09 用户审核通过后，[0.7.0 已正式发布](https://github.com/StarWind97/dsh-fatfish-notes/releases/tag/v0.7.0)。市场更新已提交 [PR #13502](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/13502)，已于 2026-11-10 08:14（北京时间）合并；当前 0.8.0 发布准备已只读复核。不据此宣称用户本机市场缓存已经刷新。

## 正式发布与市场

- 发布时间：2026-11-09 13:26（北京时间）。正式版，非草稿、非预发布；未发布 npm。
- 标签 `v0.7.0` 对应 `c4c786f22af7f475b7dbd68c1d9a5726949b1685`，已从远端复核。
- Release 包含 `dsh-fatfish-notes-0.7.0.tgz` 和 `SHA256SUMS-0.7.0.txt`。匿名下载安装包、校验文件、图标及 6 张截图均成功，逐字节摘要与本地一致。
- 从公开 tarball URL 安装到隔离 `release12-desktop`，139 个包文件全部匹配。仅更新项目隔离体验资料，不修改日常 DSH。
- 公开包实际启动通过：笔记本及原笔记保留、归档图片正常显示、指定私库同步完成（idle / pending=false），无页面异常；测试结束关闭自建 DSH。证据为 `release070-public-smoke.json`，截图为 `output/playwright/release070/06-public-installed.png`。
- 市场 PR 只修改 `data/plugins/StarWind97__dsh-fatfish-notes.yml`，3 行增加、3 行删除：中英文简介与固定版本安装包 URL。保留原条目、类别和名称，不重复收录，不改市场生成的 README。
- PR 未合并前，市场目录仍可能提供 0.6.0。需要立即升级可从上方 GitHub Release 下载；维护者合并后还需市场目录刷新。
- 公开核验证据：`.dsh-home/pure-001/release070-publication.json`、`release070-public.json`、`release070-public-installed.json`；市场证据：`release070-market-submit.json`、`release070-market-status.json`。

## 用户审核材料

- [发布说明](release-notes.md)：正式发布时使用的更新介绍与必要边界。
- [市场更新条目](marketplace-entry.yml)与 [PR 正文](marketplace-pr.md)：更新原条目，不重复收录。
- [使用说明](../../user-guide.zh.md)与[准备规划](../../plans/2026-11-09-release-070.zh.md)。

当前唯一使用者仅完成初始化，没有正式笔记或自建笔记本。本次验证空库升级，不要求用户处理历史内容；不修改日常 DSH。

## 正式包

用户确认后更新中英文 README 的正式版本及下载入口，新增截图加入市场截图清单。最终运行代码与已审核候选包一致，沿用 238 项回归和实际功能验证。

- 正式包：`dist/dsh-fatfish-notes-0.7.0.tgz`，139 文件，14,313,751 字节。
- SHA-256：`9f35c69d5ee1789a14f49269e12cc6d194e76665102887de821d5141dba816c7`。
- 正式说明包及公开 URL 安装均已核对，139 个文件逐项匹配。公开下载与市场提交结果见上方记录。

## 已审核候选包与验证（历史）

- 已审核候选包：139 个文件，14,313,859 字节；保留于 `.dsh-home/pure-001/release070-reviewed-candidate.tgz`。
- 历史候选 SHA-256：`896509c340e8a5094f1c1c1d58bda04c955eaf976249e51805471d820dfcd8f7`。正式包采用上方新摘要，当前校验文件为 `dist/SHA256SUMS-0.7.0.txt`。
- 与上一份已验证 0.6.1 开发包逐文件比较，仅 `package.json` 和中英文 README 改变，运行代码一致；YAML 许可证包含在包中，没有测试资料、缓存或凭据。
- 类型检查、构建及本次发布级 **238/238 全量回归通过**，0 失败、0 跳过，约 12 分 47 秒。按第三档执行，因为本次交付为对外发布候选包。
- **空库升级**：从实际 0.6.0 发布包的存储实现生成空库及 v1 清单，交给 0.7.0 后出现且只出现一个默认本。重开仍无笔记，第一篇新建笔记自动归入默认本。这是隔离离线数据升级验证，没有接管用户日常库。
- **实际安装**：候选包安装到隔离 Desktop，139 个安装文件逐项匹配。原指定私库绑定保留，新建示例笔记通过实际编辑器保存，GitHub 双向同步返回 idle / pending=false；重启后正文和归属保留。GitHub API 另行确认新笔记文档及修订已在远端，证据为 `release070-remote.json`。
- **实际操作**：现有图片正常显示，文章链接跳转/返回正常；最终包的导入预览和导出入口已验。实际导出的 ZIP 含两篇 Markdown、一张图片及两个普通附件。页面未记录异常。
- 最初验收脚本将「导出笔记库」按钮误写为「导出」，已修正脚本并只补验未完成步骤，没有修改产品代码。
- Obsidian 1.10.6 的真实兼容验收沿用相同运行代码的[上一批结果](../../verification-log.zh.md#obsidian-补验2026-11-09)。macOS、两台物理电脑及 Obsidian 1.15.0 不宣称已覆盖。

记录为 `.dsh-home/pure-001/release070-{checks,tests}.log`、`release070-{audit,installed,empty-upgrade,ui}.json`。验收截图在 `output/playwright/release070/`。本批测试结束已关闭自建 DSH；通过 [Open-Fatfish-Notes.cmd](../../../scripts/Open-Fatfish-Notes.cmd) 可重新打开 0.7.0 隔离体验，不涉及日常资料。

### 实际界面

![笔记本管理](../../../assets/screenshots/05-notebooks.png)

![导入前预览](../../../assets/screenshots/06-import-preview.png)

### 当前用户怎样升级

用户已确认只有本人使用，且当前库仅初始化，没有创建笔记或笔记本。正式发布后关闭 DSH、安装 0.7.0、重新打开，核对原绑定和默认笔记本即可；不必先卸载、不必重新初始化，也不需要搬迁内容。此次准备未替用户安装到日常资料。

## 发布边界与验证取舍

先完成用户审核，再更新正式 README、重新打包并核验，随后创建 Release、匿名下载和安装公开包，最后提交市场更新。正式包与已审核包的运行代码一致，只变更中英文 README，因此沿用已完成的类型检查、构建及 238 项回归，不为说明文件重复全量回归。发布使用正式包新摘要，未覆盖历史 0.6.0 资产。
