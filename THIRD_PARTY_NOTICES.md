# 导出依赖与字体

纸页编辑器把 CodeMirror、Lezer、Lucide 和 Markdown 渲染依赖打入 Client factory，React 继续使用宿主实例。这些编辑器依赖的版本、版权声明和许可证收录于 [paper-client.txt](assets/licenses/paper-client.txt)。具体版本以锁文件为准。

Markdown 导入另外使用 YAML 2.9.1 解析基础属性，按 ISC 许可证分发；版权和完整许可证见 [yaml-ISC.txt](assets/licenses/yaml-ISC.txt)，项目为 [eemeli/yaml](https://github.com/eemeli/yaml)。

导出使用锁定依赖，包括 PDFKit 0.20.2、html-to-image 1.11.13、fflate 0.8.3、mdast-util-gfm-table 2.0.0、micromark-extension-gfm-table 2.1.1（均 MIT）；开发类型 @types/pdfkit 0.17.7（MIT）。后两项为既有 mdast-util-from-markdown 增加 GFM 管道表格解析，不启用 HTML。上述五项运行依赖的完整版权与 MIT 许可证另存于随包的 `assets/licenses/*-MIT.txt`；完整依赖树及各依赖自身许可证随 npm 依赖分发，具体锁定见 package-lock.json。

官方项目：[PDFKit](https://github.com/foliojs/pdfkit)、[html-to-image](https://github.com/bubkoo/html-to-image)、[fflate](https://github.com/101arrowz/fflate)、[mdast-util-gfm-table](https://github.com/syntax-tree/mdast-util-gfm-table)、[micromark-extension-gfm-table](https://github.com/micromark/micromark-extension-gfm-table)。

随包携带 `assets/fonts/NotoSansCJKsc-Regular.otf`，Noto Sans CJK SC Regular **2.004**，© 2014–2021 Adobe。根据 SIL Open Font License 1.1 原样再分发，完整版权和许可证在 `assets/fonts/OFL.txt`。

官方 Noto CJK 仓库 release `Sans2.004`，commit `523d033d6cb47f4a80c58a35753646f5c3608a78`，源文件 `Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf`。字体 SHA256 `2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b`；许可证 SHA256 `6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2`。不可变下载地址与版本记录见 `assets/fonts/source.json`。

PDF 字体嵌入和图片字体均取自安装包，运行不依赖系统中文字体、CDN、外部截图服务或捆绑 Chromium。WebP/GIF 静态转换使用宿主 Chromium 的 ImageDecoder 第 0 帧，原图下载保留归档字节。
