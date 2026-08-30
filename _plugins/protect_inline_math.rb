# _plugins/protect_inline_math.rb
#
# kramdown（GFM 模式）会把行内公式里的下划线当成 Markdown 强调处理，
# 导致嵌在中文里的公式被破坏，例如：
#   $\hat{x}_{k-1}$、$P_{k-1}$  →  $\hat{x}<em>{k-1}$、$P</em>{k-1}$
# 公式内容被包进 <em>，渲染出来是斜体、和正文字体不一样。
#
# 本插件在 kramdown 转换之前，先把所有行内 $...$ 替换成无歧义的占位符，
# 等转换完成后再把原始公式还原进生成的 HTML（按 MathJax 约定原样输出 $...$，
# 由浏览器端 MathJax 渲染）。这样 Markdown 永远不会碰到公式内容。
#
# 只保护行内 $...$；展示公式 $$...$$ 本就不会被破坏，保持原样。
#
# 注意：默认的 GitHub Pages 构建以 --safe 运行，不执行本插件。
# 需要搭配 GitHub Actions（或本地构建后推送 _site）才能在线上生效。

module Jekyll
  # 挂在 KramdownParser#convert 上，避免依赖钩子顺序，且对 pages/posts/
  # collections 等所有经 kramdown 转换的内容都生效。
  module ProtectInlineMath
    PREFIX = "JEKYLLMATH"

    def convert(content)
      protected_content, map = protect_math(content)
      html = super(protected_content)
      restore_math(html, map)
    end

    private

    # 找出行内 $...$（排除 $$...$$ 展示块）。内容不跨行、不含 $。
    def protect_math(content)
      map = {}
      index = 0
      protected = content.gsub(/\$(?!\$)([^$\n]+?)\$(?!\$)/) do
        token = "#{PREFIX}#{index}"
        map[token] = Regexp.last_match[0]
        index += 1
        token
      end
      [protected, map]
    end

    # 把占位符还原成原始公式，并对 <>& 做与 kramdown 相同的 HTML 转义。
    def restore_math(html, map)
      map.reduce(html) do |out, (token, math)|
        out.gsub(token, escape_html(math))
      end
    end

    def escape_html(text)
      text.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;")
    end
  end
end

Jekyll::Converters::Markdown::KramdownParser.prepend(Jekyll::ProtectInlineMath)
