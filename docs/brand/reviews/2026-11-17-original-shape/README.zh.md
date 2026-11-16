# 新版品牌完整图册

2026-11-17，按[本轮规划](../../../plans/2026-11-17-brand-gallery-and-original-shape.zh.md)制作。原版与 A 同尺寸同色比较；不将该页展示视为已经更改插件。提亮绿保持已确认选择。

双击 [Open-Fatfish-Brand-Gallery.cmd](../../../../scripts/Open-Fatfish-Brand-Gallery.cmd) 打开 `http://127.0.0.1:8823/`；也可直接打开 [index.html](index.html)，后者反馈仅存当前浏览器。

页面包含小尺寸、任务栏/入口场景、纯图形/方块、完整实底/透明组合、SVG/PNG 下载及自动保存意见。已有真实截图与新场景模拟分别标注。新增意见保存到项目忽略目录 `.dsh-home/pure-001/brand-gallery-20261117/page-state.json`，旧配色评审和反馈不改动。保存不会唤起助手、实施替换或发布，填写后在会话中告知读取即可。

`build-artwork.mjs` 从当前 `assets/brand/` 生成 `artwork.js` 快照，记录源提交；不改产品文件。页面中的历史原墨绿只是实时对比，并不维护第二套当前主色。原版导出根据所选 SVG 保持原轮廓，小尺寸不会自动切 A。

本地服务和自动保存附件来源于当前 interactive-web 的 `serve_page.py`、`page-state.js`；仅监听本机、同源写入、原子保存。启动器只复用同一页面/状态文件，不关闭占用其他端口的服务。反馈、日志及验收截图不加入 Git 或插件安装包。
