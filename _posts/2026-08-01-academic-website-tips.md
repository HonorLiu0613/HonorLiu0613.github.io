---
title: '搭建个人学术主页的踩坑记录'
date: 2026-08-01
permalink: /posts/2026/08/academic-website-tips/
tags:
  - tutorials
  - web
categories:
  - 
---

搞这个个人网站断断续续花了一段时间，记录一下过程中踩过的坑。

## 为什么选 Jekyll + GitHub Pages

- 🆓 完全免费，不需要买服务器
- 🔧 Markdown 写文章，Git 做版本管理
- 🎨 基于 Minimal Mistakes / AcademicPages 主题，学术风格很好看
- 🚀 推送即部署，不需要自己维护 CI/CD

## 踩过的坑

### 1. 图片路径问题

Jekyll 生成的页面 URL 带尾部斜杠（目录形式），用相对路径 `../images/xxx.jpg` 会解析错误。**解决方案**：统一用绝对路径 `/images/xxx.jpg`。

### 2. 暗色模式切换

主题自带了亮暗切换功能，但我个人偏好固定亮色，就把切换按钮和 JS 逻辑都去掉了。如果你需要保留，记得 `main.min.js` 需要通过 `npm run build:js` 重新构建。

### 3. Collections vs Posts

- `_posts/` — 博客文章，适合经常更新的内容
- `_experience/`、`_portfolio/` — 集合（collection），适合结构化的条目，比如经历、作品

### 4. 本地预览

```bash
bundle exec jekyll serve
```

修改 `_config.yml` 后需要重启服务才能生效。

## 小结

总体来说 Jekyll + GitHub Pages 很适合学术个人主页，折腾一次，长期受益。后续打算加上标签分类和搜索功能，让文章更好找。
