# Obsidian 与网站笔记同步

Obsidian 是日常写作入口。网站保留可编辑的 Markdown，作为公开笔记的分享页面。
同步是手动触发的，不会在每次保存时运行，也不会自动执行 Git 推送。

## 同步如何实现

插件用稳定的 `web_id` 对应两份 Markdown，用上次同步时记录的 SHA-256 内容指纹判断
哪一边有修改。指纹比较正文和笔记属性，忽略插件生成的渲染字段。
这不是按最后保存时间直接覆盖，也不是逐句合并；发生冲突时选整篇保留哪一份，或跳过。
操作前备份要改写的 Markdown；图片按内容哈希导出；正文由 Obsidian 原生渲染器生成。

在 **设置 → Website Note Sync → 同步模式** 选择：

| 模式 | 行为 |
| --- | --- |
| Obsidian → 网站 | 导出公开笔记；不把网站改动导入 Obsidian；网站独有笔记跳过 |
| 网站 → Obsidian | 从本地网站导入；不改写网站文件、不刷新网站样式、不构建网站 |
| 双向同步 | 单边修改传到另一边；两边有不同修改时需要选择版本 |

当前保留原来的双向模式。以 Obsidian 为主要写作入口时，推荐选择 **Obsidian → 网站**。
单向模式默认开启“保护接收方的独立修改”；接收方被改过时仍需确认，避免丢失内容。
关闭该开关后，不同内容直接以来源版本覆盖，覆盖前仍保留备份。
预览后又修改文章或切换模式，需要关闭窗口重新预览。

## 日常操作

1. 在 Obsidian 编辑笔记，或在本地网站仓库的 `_notes/*.md` 编辑同一篇笔记。
2. 点击 Obsidian 左侧的循环箭头图标，或打开命令面板，运行
   `Website Note Sync: 预览并同步公开笔记`。
3. 查看预览。单边修改会传到另一边；两边同时有不同修改时，选择保留
   Obsidian 版本、保留网站版本，或暂时跳过。未选择时不会覆盖任何笔记。
4. 点击同步按钮，插件会备份公开笔记、同步内容、导出图片和 Border 正文样式，
   然后按设置构建本地 `_site`。导入模式只更新 Obsidian。检查本地预览后，再按原来的 Git 流程发布网站。

只更新当前文章时，运行 `Website Note Sync: 预览并同步当前笔记`；不会同时改写其他笔记。

同步对象是本地网站文件夹。线上网站更新仍需要 Git 提交、推送及 Actions 部署。
如在 GitHub 修改了 Markdown，先将修改拉到本地，再在 Obsidian 点击同步。
网页正文没有在线编辑器。

## 新文章：Templater 模板

已在 `99-模板/website-note.md` 安装模板，样式与现有知识笔记模板一致：
顶部是可编辑的笔记属性，下面是“一句话理解、背景与问题、核心内容、推导与例子、
最小代码、容易弄错的地方、参考资料”。

1. 在合适的 Obsidian 文件夹新建一篇**空白笔记**，先给文件命名。
2. 按 `Ctrl+P`，搜索 `Templater`，选择 **Open Insert Template modal**，再选择 `website-note`。
3. 模板自动填写 `title`、`date`、`updated` 和创建时间，默认 `publish: false`。
   这些字段会像截图一样显示在标题下方的“笔记属性”中。
4. 填写“领域”、`tags` 和 `excerpt`；写好后再勾选 `publish`。
5. 如需易读网址，第一次同步前将 `web_slug` 填为英文，例如 `pid-control`。
   留空也能发布，插件会生成安全的英文文件标识。
6. 点击循环箭头预览同步。只在本地同步后线上还不会更新；需要将网站仓库的改动
   提交并推送到 GitHub，等待 Pages 工作流部署。

模板本身的日期仍显示 `<% ... %>` 是正常的；通过 Templater 插入新笔记时才会执行。
不要用复制粘贴或 Obsidian 自带 Templates 命令代替 Templater。
已有正文的文章可运行 `Website Note Sync: 为当前笔记补充网站发布属性`，只补缺失属性，
不会重复插入正文结构，也不会自动公开草稿。

“笔记属性”实际存储在 Markdown 文件顶部两行 `---` 之间的 YAML 中。
可以直接点属性值修改，也可以用“添加笔记属性”添加；切换源码模式能看到原始 YAML。
如果整个属性区域被隐藏，在 Obsidian 设置 → 编辑器中，将“文档中的属性”设置为显示。

## 公开范围

只有 YAML 属性 `publish: true` 的笔记会首次导出。已导入的网站 5 篇笔记保留公开状态，
原有其他笔记保持私人状态。

```yaml
---
title: 笔记标题
publish: true
domain: Control & Estimation
tags: [Control, Mathematics]
featured: false
excerpt: 用几句话说明这篇文章的内容。
web_slug: pid-control
---
```

也可以运行 `Website Note Sync: 切换当前笔记公开状态`，然后手动同步。
撤下已公开的笔记时，将 `publish` 改成 `false`，使用 Obsidian → 网站或双向模式同步；插件会移除网站副本及生成正文，
保留 Obsidian 原稿。既往 Git 历史中的内容需要另外处理。
导出或双向模式中，删除网站文件会由 Obsidian 副本恢复。
双向模式中删除 Obsidian 副本会提示冲突；单向模式不会自动传播来源端的文件删除。

插件自动补充稳定的 `web_id`、`web_slug`。这两个属性用于对应两边的同一篇笔记，
不要手动更改。新笔记的中文文件名可以保留，网站文件会生成英文安全标识；
需要可读网址时，可在第一次同步前设置英文 `web_slug`，例如 `pid-control`。

`rendered_body`、`rendered_source_hash`、`source_vault_path`、`mathjax` 和
`render_with_liquid` 由插件管理，不要手工编辑。
编辑网站 Markdown 后务必先同步；构建会拒绝正文过期的导出，防止继续显示旧内容。
请编辑 `_notes/*.md`，不要编辑 `_includes/rendered-notes/*.html` 或 `_site`。

## 本次分类

| 笔记文件名 | Obsidian 目录 |
| --- | --- |
| `kalman-filter-derivation.md` | `02-知识笔记/3. 控制与估计/` |
| `personal-website.md` | `04-项目实验/1. 个人网站/` |
| `wechat-family-menu.md` | `04-项目实验/2. 微信小程序/` |
| `hello-world.md` | `05-闲杂随记/` |
| `recommendation-preparation.md` | `05-闲杂随记/` |

新的网站笔记首次导入时按领域、标题、标签分类；主题不明确的进入 `05-闲杂随记`。
已经对应的笔记以稳定标识关联，可以在 Obsidian 中移动文件夹。

这些是关键词规则，不是 AI 自动判断正文：

| 匹配词示例 | 首次导入目录 |
| --- | --- |
| Kalman、Control、滤波、控制、估计 | `02-知识笔记/3. 控制与估计/` |
| Deep Learning、PyTorch、深度学习、神经网络 | `02-知识笔记/1. 深度学习/` |
| ROS2、PX4、无人机 | `02-知识笔记/2. 无人机 PX4-ROS2/` |
| Website、Jekyll、网站 | `04-项目实验/1. 个人网站/` |
| WeChat、微信、小程序 | `04-项目实验/2. 微信小程序/` |
| 未匹配 | 设置中的“未匹配分类的导入目录”，默认 `05-闲杂随记` |

匹配时按表中从上到下的顺序选择第一个规则。它只用于网站新文章导入，
不会将你在 Obsidian 中已经整理好的文章搬到其他文件夹。

网站列表分类由 `domain` 与 `tags` 决定。模板中的中文“领域”优先映射到 `domain`；
如果“领域”和 `domain` 都为空，首次同步会参考标题、标签和 Obsidian 所在目录补全领域。
例如可填写“控制与估计”，并添加 `Kalman`、`Control` 标签。`tags` 请使用列表类型。
`featured` 勾选后，该文章可以进入首页精选笔记；`excerpt` 是笔记卡片摘要。

## 图片、公式和样式

笔记由 Obsidian 自身渲染，保留常用 Markdown、代码高亮、表格、引用和 callout 结构。
公式交给网站自带的 MathJax 渲染，保留行内公式与独立公式。
代码块请注明语言，例如 `python`、`sh`、`c`；网站会显示语言标签和复制按钮。

图片和附件以 Obsidian 仓库中的文件为来源，修改或新增附件请在 Obsidian 操作。
本次导入的附件位于 `91-附件/website/notes/`。
每次同步将所引用的附件复制到网站 `assets/notes/<slug>/`，文件名包含内容哈希。
网站 Markdown 沿用仓库附件链接，请不要把生成资源目录当作第二个附件编辑入口。
附件二进制内容不做双向合并。
公开笔记之间的链接转为网页链接，未公开笔记的链接和嵌入仅显示文字，不导出其正文。

正文 CSS 在每次同步时从 Obsidian 当前启用的主题与 Style Settings 中提取，
只应用于 `.note-body`。当前使用 Akifyss 的
[Border 1.13.9](https://github.com/Akifyss/obsidian-border)。
主页、导航、卡片和时间线继续使用网站样式。
字体还取决于访问者电脑中安装的字体；需要插件运行时交互的图表或特殊视图不保证等效。

## 设置、备份与源码

Obsidian → 设置 → Website Note Sync：

- 网站目录：`E:\My-Personal-Website\HonorLiu0613.github.io`
- Ruby 程序：已配置本机便携版 Ruby；移动或更换电脑后请重新选择 `ruby.exe`。
- 同步模式：提供两个单向模式和双向模式。
- 保护接收方的独立修改：单向模式默认开启。
- 未匹配分类的导入目录：仅作用于新导入的文章。
- 同步时刷新正文样式：默认开启；关闭可保留网站现有 CSS。
- 同步后构建本地网站：已开启。构建报错时，笔记同步可能已经完成，请先检查提示。

每次同步的笔记备份位于：
`.obsidian/plugins/website-note-sync/backups/<时间>/vault/` 和 `web/`。
备份保留被改写前的 Markdown，不包含附件历史。恢复时先将所需版本复制回来，再同步。
首次导入前的备份另外保存在本次工作目录的 `vault-before-sync-install.zip`。

源码在 `tools/website-note-sync/src/`。运行：

```sh
python tools/website-note-sync/build.py
```

将生成的 `main.js` 与 `manifest.json` 放入仓库
`.obsidian/plugins/website-note-sync/` 后，重新启用插件。
插件只支持 Obsidian 桌面版；使用本机文件系统和 Ruby。
`tools`、`docs`、`scripts` 均不会复制到生成的公开网站。

模板源码也保存在网站仓库 `tools/website-note-sync/templates/website-note.md`，便于维护。
