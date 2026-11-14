'use strict';
const FIXTURE = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><h5>Heading 5</h5><h6>Heading 6</h6><p>A paragraph with <strong>bold</strong>, <em>italic</em>, <code>inline code</code>, <a href="https://example.com">a link</a>, and <mark>highlight</mark>.</p><ul><li>First item</li><li>Second item<ul><li>Nested item</li></ul></li></ul><ol><li>Ordered item</li></ol><blockquote><p>A quoted paragraph.</p></blockquote><div class="callout" data-callout="note"><div class="callout-title"><div class="callout-title-inner">Note title</div></div><div class="callout-content"><p>Callout paragraph.</p></div></div><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>One</td><td>Two</td></tr></tbody></table><pre><code class="language-python"><span class="token comment"># Comment</span> <span class="token keyword">def</span> <span class="token function">example</span><span class="token punctuation">(</span><span class="token number">42</span><span class="token punctuation">)</span><span class="token operator">+</span><span class="token string">hello</span></code></pre><hr>';
const PROPS = ['color','background-color','font-family','font-size','font-weight','font-style','font-variant','line-height','letter-spacing','text-decoration-line','text-decoration-color','text-underline-offset','text-indent','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top','border-right','border-bottom','border-left','border-radius','white-space','tab-size','list-style-type','border-collapse'];
const SELECTORS = ['p','h1','h2','h3','h4','h5','h6','strong','em','a',':not(pre)>code','pre','pre code','ul','ol','li','blockquote','blockquote p','table','thead','th','td','hr','mark','.callout','.callout-title','.callout-content','.token.comment','.token.keyword','.token.string','.token.number','.token.function','.token.operator','.token.punctuation'];
function capture() {
  const host = document.createElement('div');
  host.className = 'markdown-preview-view markdown-rendered';
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:750px;visibility:hidden;';
  host.innerHTML = FIXTURE;
  document.body.append(host);
  try {
    const read = element => {const c=getComputedStyle(element);return Object.fromEntries(PROPS.map(p=>[p,c.getPropertyValue(p)]));};
    const styles = Object.fromEntries(SELECTORS.map(selector=>[selector,host.querySelector(selector)?read(host.querySelector(selector)):null]));
    const headings = Object.fromEntries([1,2,3,4,5,6].map(level=>{
      const c=getComputedStyle(host.querySelector('h'+level),'::before');
      return ['h'+level,Object.fromEntries(['content','display','position','width','height','background-color','border-radius','margin-right','left','top'].map(p=>[p,c.getPropertyValue(p)]))];
    }));
    return {hostStyle:read(host),styles,headings};
  } finally {host.remove();}
}
function css(snapshot) {
  const clean = value => String(value).replace(/"\?+",?\s*/g,'').trim();
  const write = (selector, properties) => selector+' { '+Object.entries(properties).filter(([,v])=>v!==undefined&&v!=='').map(([k,v])=>`${k}: ${clean(v)};`).join(' ')+' }';
  const rootProps = Object.fromEntries(['color','font-family','font-size','font-weight','font-style','line-height'].map(key=>[key,snapshot.hostStyle[key]]));
  const lines = ['/* Border reading styles captured from the current Obsidian theme and Style Settings. */',write('.note-body',rootProps)];
  for (const [selector, props] of Object.entries(snapshot.styles)) {
    if (!props) continue;
    const selected = {...props};
    // Inline elements keep the surrounding heading/callout size and line-height.
    if (['strong','em','a','mark'].includes(selector)) {
      for (const key of ['font-size','font-family','line-height','font-variant','letter-spacing','text-indent','white-space']) delete selected[key];
    }
    if (selector.startsWith('.token')) {
      for (const key of Object.keys(selected)) if (!['color','font-style','font-weight','text-decoration-line'].includes(key)) delete selected[key];
    }
    lines.push(write('.note-body '+selector,selected));
  }
  for (const [selector, props] of Object.entries(snapshot.headings)) {
    lines.push(`.note-body ${selector} { position: relative; scroll-margin-top: 28px; }`);
    lines.push(write('.note-body '+selector+'::before',props));
  }
  lines.push('.note-body { overflow-wrap: anywhere; }',
    '.note-body > :first-child { margin-top: 0; }',
    '.note-body img, .note-body video { max-width: 100%; height: auto; }',
    '.note-body pre { overflow-x: auto; }',
    '.note-body table { display: block; max-width: 100%; overflow-x: auto; }',
    '.note-body .math-display { display: block; max-width: 100%; overflow-x: auto; }',
    '.note-body mjx-container[display="true"] { display: block !important; min-width: 0 !important; width: 100%; max-width: 100%; overflow-x: auto; overflow-y: hidden; padding-bottom: 8px; }',
    '.note-body .code-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; border: 1px dashed #dfe0eb; border-bottom: 0; border-radius: 4px 4px 0 0; font: 11px "Segoe UI", sans-serif; color: #6c6c72; }',
    '.note-body .code-toolbar + pre { margin-top: 0; border-radius: 0 0 4px 4px; }',
    '.note-body .code-toolbar button { border: 0; padding: 2px 5px; background: transparent; color: #5f6bf1; font: inherit; cursor: pointer; }',
    '.note-body .unpublished-link { color: inherit; }');
  return lines.join('\n')+'\n';
}
module.exports={capture,css,FIXTURE};
