'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const core=require('./sync-core');
const MIME={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.avif':'image/avif'};

function escapeMarkdown(value){return value.replace(/([\\`*_[\]<>])/g,'\\$1');}
// Derive Markdown from the same rendered tree used for HTML, so embeds and links agree.
function markdown(node){
  if(node.nodeType===3)return escapeMarkdown(node.nodeValue);
  if(node.nodeType!==1)return '';
  const tag=node.tagName.toLowerCase(),children=()=>[...node.childNodes].map(markdown).join('');
  if(node.classList.contains('math-inline')||node.classList.contains('math-display')){
    const text=node.textContent,display=node.classList.contains('math-display');
    const formula=text.slice(2,-2);return display?'\n\n$$\n'+formula+'\n$$\n\n':'$'+formula+'$';
  }
  if(tag==='pre'){
    const code=node.querySelector('code')||node,lang=(code.className.match(/language-([\w+-]+)/)||[])[1]||'';
    const text=code.textContent,fence='`'.repeat(Math.max(3,...[...text.matchAll(/`+/g)].map(m=>m[0].length+1)));
    return '\n\n'+fence+lang+'\n'+text.replace(/\n$/,'')+'\n'+fence+'\n\n';
  }
  if(tag==='code'){const text=node.textContent,tick='`'.repeat(Math.max(1,...[...text.matchAll(/`+/g)].map(m=>m[0].length+1)));return tick+' '+text+' '+tick;}
  if(/^h[1-6]$/.test(tag))return '\n\n'+'#'.repeat(Number(tag[1]))+' '+children()+'\n\n';
  if(tag==='img')return '!['+escapeMarkdown(node.getAttribute('alt')||'')+']('+node.getAttribute('src')+')';
  if(tag==='a')return '['+children()+']('+node.getAttribute('href')+')';
  if(tag==='strong'||tag==='b')return '**'+children()+'**';
  if(tag==='em'||tag==='i')return '*'+children()+'*';
  if(tag==='del'||tag==='s')return '~~'+children()+'~~';
  if(tag==='br')return '  \n';
  if(tag==='hr')return '\n\n---\n\n';
  if(tag==='blockquote')return '\n\n'+children().trim().split('\n').map(line=>'> '+line).join('\n')+'\n\n';
  if(tag==='ul'||tag==='ol'){
    return '\n\n'+[...node.children].filter(n=>n.tagName==='LI').map((li,i)=>{
      const prefix=tag==='ol'?(i+1)+'. ':'- ',text=[...li.childNodes].map(markdown).join('').trim();
      return prefix+text.replace(/\n/g,'\n'+' '.repeat(prefix.length));
    }).join('\n')+'\n\n';
  }
  if(tag==='table'){
    const rows=[...node.querySelectorAll('tr')].map(tr=>[...tr.children].map(cell=>[...cell.childNodes].map(markdown).join('').trim().replace(/\|/g,'\\|').replace(/\n+/g,'<br>')));
    if(!rows.length)return '';
    const width=Math.max(...rows.map(row=>row.length)),line=row=>'| '+Array.from({length:width},(_,i)=>row[i]||'').join(' | ')+' |';
    return '\n\n'+[line(rows[0]),line(Array(width).fill('---')),...rows.slice(1).map(line)].join('\n')+'\n\n';
  }
  const content=children();return ['p','div','section','figure'].includes(tag)?'\n\n'+content.trim()+'\n\n':content;
}

async function formulaImage(latex,display){
  // Use a deterministic SVG so it works across Obsidian versions. The source
  // stays in the image alt text and can be edited on the platform.
  const escaped=String(latex).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const width=Math.min(1800,Math.max(240,escaped.length*12+32)),height=display?64:42;
  const svgText=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="16" y="${display?42:28}" font-family="serif" font-size="${display?24:19}" fill="black">${escaped}</text></svg>`;
  return 'data:image/svg+xml;base64,'+Buffer.from(svgText).toString('base64');
}

async function prepareArticle(plugin,file){
  const {parseYaml}=require('obsidian'),doc=core.parseDocument(await plugin.app.vault.read(file),parseYaml);
  if(!doc.body.trim())throw new Error('当前笔记没有正文。');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'obsidian-media-'));
  try{
    const routes=new Map();
    for(const note of plugin.app.vault.getMarkdownFiles()){
      const metadata=plugin.app.metadataCache.getFileCache(note)?.frontmatter;
      if(metadata?.publish===true&&metadata.web_slug)routes.set(note.path,'/notes/'+core.safeSlug(metadata.web_slug)+'/');
    }
    const rendered=await plugin.renderNote({file,doc,slug:'media-preview',title:file.basename},temporary,routes);
    const root=document.createElement('div');root.innerHTML=rendered.html;
    const site=String(plugin.settings.mediaWebsiteUrl||'https://honorliu.top').replace(/\/$/,'');
    if(!/^https?:\/\//.test(site))throw new Error('请在设置里填写有效的网站公开网址。');
    // Only the article tree is sent. Remove active content, style rules and form controls.
    root.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select,link,meta').forEach(n=>n.remove());
    if(root.querySelector('video,audio,source'))throw new Error('媒体草稿暂不支持音视频；请改为公开链接后重试。');
    if(root.querySelector('canvas'))throw new Error('笔记有图表或 Canvas，请先转换为 PNG 图片后发送。');
    // Obsidian may emit SVG for a formula. Those are replaced with the portable
    // formula SVG below; other diagrams are intentionally rejected.
    for(const svg of [...root.querySelectorAll('svg')])if(!svg.closest('.math-inline,.math-display'))throw new Error('笔记有 SVG 图表，请先转换为 PNG 图片后发送。');
    for(const node of root.querySelectorAll('*'))for(const attr of [...node.attributes]){
      if(/^on/i.test(attr.name)||['style','srcset','id'].includes(attr.name))node.removeAttribute(attr.name);
    }
    for(const image of root.querySelectorAll('img')){
      const src=image.getAttribute('src')||'';
      if(src.startsWith('/assets/notes/')){
        const local=core.inside(temporary,src.slice(1)),mime=MIME[path.extname(local).toLowerCase()];
        if(!mime)throw new Error('此图片格式不受支持：'+src);
        const bytes=fs.readFileSync(local);if(bytes.length>15*1024*1024)throw new Error('单张图片超过 15 MB，请先压缩。');
        image.setAttribute('src','data:'+mime+';base64,'+bytes.toString('base64'));
      }else if(src.startsWith('/'))image.setAttribute('src',new URL(src,site).href);
      else if(!/^(https?:\/\/|data:image\/(png|jpeg|gif|webp|svg\+xml|avif);base64,)/i.test(src))throw new Error('图片地址无效。');
    }
    for(const link of root.querySelectorAll('a')){
      const href=link.getAttribute('href')||'';
      if(href.startsWith('/'))link.setAttribute('href',new URL(href,site).href);
      else if(!/^(https?:\/\/|mailto:|tel:|#)/i.test(href))link.replaceWith(document.createTextNode(link.textContent));
      // PDFs and other local files cannot be uploaded by the image integration.
      if(href.startsWith('/assets/notes/'))throw new Error('正文包含本地附件链接；请改成已公开的文件网址后重试。');
    }
    const markdownBody=[...root.childNodes].map(markdown).join('').trim();
    const csdn=root.innerHTML,zhihu=root.cloneNode(true);
    for(const math of zhihu.querySelectorAll('.math-inline,.math-display')){
      const display=math.classList.contains('math-display'),latex=math.textContent.slice(2,-2);
      const image=document.createElement('img');image.src=await formulaImage(latex,display);image.alt=latex;
      if(display){const paragraph=document.createElement('p');paragraph.append(image);math.replaceWith(paragraph);}else math.replaceWith(image);
    }
    const article={title:String(doc.meta.title||file.basename),sourcePath:file.path,fingerprint:core.hash(doc.body),
      posts:{csdn:{title:String(doc.meta.title||file.basename),content:csdn,markdown:markdownBody},zhihu:{title:String(doc.meta.title||file.basename),content:zhihu.innerHTML}},
      images:root.querySelectorAll('img').length,formulas:(rendered.html.match(/class="math-(?:inline|display)"/g)||[]).length};
    if(Buffer.byteLength(JSON.stringify(article))>40*1024*1024)throw new Error('本次正文和图片超过 40 MB，请拆分笔记或压缩图片。');
    return article;
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
module.exports={prepareArticle,markdown,formulaImage};
