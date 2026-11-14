'use strict';
const nativeRequire=require;
const modules={
'./sync-core': function(module,exports,require){
'use strict';
const crypto = require('crypto');
const path = require('path');

const MANAGED = new Set(['rendered_body', 'rendered_source_hash', 'source_vault_path', 'mathjax', 'render_with_liquid']);
function normalized(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(key=>!MANAGED.has(key)).map(key=>[key,normalized(value[key])]));
  return value;
}
function hash(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function canonical(document) { return JSON.stringify({meta:normalized(document.meta),body:document.body.replace(/\r\n/g,'\n').trimEnd()}); }
function fingerprint(document) { return document ? hash(canonical(document)) : null; }
function parseDocument(text, parseYaml) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  return match ? {meta:parseYaml(match[1]) || {},body:text.slice(match[0].length)} : {meta:{},body:text};
}
function serialize(document, stringifyYaml) {
  return '---\n' + stringifyYaml(document.meta).trimEnd() + '\n---\n' + document.body;
}
const MODES = {bidirectional:'双向同步','vault-to-web':'Obsidian → 网站','web-to-vault':'网站 → Obsidian'};
function direction(base, vaultDoc, webDoc, {mode='bidirectional',protectTargetChanges=true}={}) {
  if (!MODES[mode]) throw new Error('Unknown synchronization mode: '+mode);
  if (mode==='vault-to-web') {
    if (!vaultDoc) return 'skip';
    if (vaultDoc.meta.publish!==true) return webDoc?'withdraw':'private';
    if (!webDoc) return 'export';
    if (fingerprint(vaultDoc)===fingerprint(webDoc)) return 'equal';
    if (protectTargetChanges&&(!base||fingerprint(webDoc)!==base.webHash)) return 'conflict';
    return 'export';
  }
  if (mode==='web-to-vault') {
    if (!webDoc) return 'skip';
    if (!vaultDoc) return base&&protectTargetChanges?'conflict':webDoc.meta.publish===true?'import':'private';
    if (fingerprint(vaultDoc)===fingerprint(webDoc)) return 'equal';
    // Imports may add stable identifiers/default fields only to the vault copy.
    // Preserve distinct but unchanged baselines without importing forever.
    if (base&&fingerprint(vaultDoc)===base.vaultHash&&fingerprint(webDoc)===base.webHash) return 'equal';
    if (protectTargetChanges&&(!base||fingerprint(vaultDoc)!==base.vaultHash)) return 'conflict';
    return 'import';
  }
  if (vaultDoc && vaultDoc.meta.publish !== true) return webDoc ? 'withdraw' : 'private';
  if (!vaultDoc && !webDoc) return 'missing';
  if (!vaultDoc) return base ? 'conflict' : 'import';
  if (!webDoc) return 'export';
  const vh = fingerprint(vaultDoc), wh = fingerprint(webDoc);
  if (vh === wh) return 'equal';
  if (!base) return 'conflict';
  const vc = vh !== base.vaultHash, wc = wh !== base.webHash;
  if (vc && wc) return 'conflict';
  if (wc) return 'import';
  if (vc) return 'export';
  return 'equal';
}
function inside(root, relative) {
  const absolute = path.resolve(root, relative);
  const r = path.relative(path.resolve(root), absolute);
  if (!r || r === '..' || r.startsWith('..'+path.sep) || path.isAbsolute(r)) throw new Error('Path is outside the selected root: '+relative);
  return absolute;
}
function safeSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('web_slug must use lowercase English letters, digits, and hyphens.');
  return slug;
}
function slugFromFile(value) {
  const base = path.basename(value, '.md').toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(base) ? base : 'note-'+hash(value).slice(0,8);
}
function safeFolder(value) {
  const folder=String(value||'').trim().replace(/\\/g,'/').replace(/\/$/,'');
  if(!folder||folder.split('/').some(part=>!part||part.startsWith('.')||/[<>:"|?*]/.test(part)))throw new Error('导入目录必须是仓库内的普通相对目录，不能使用隐藏目录或 ..。');
  return folder;
}
function keywords(document, extra='') {
  const tags=Array.isArray(document.meta.tags)?document.meta.tags:[document.meta.tags||''];
  return [document.meta.domain,document.meta['领域'],document.meta.title,extra,...tags].join(' ').toLowerCase();
}
function inferDomain(document, vaultPath='') {
  if(document.meta.domain||document.meta['领域'])return document.meta['领域']||document.meta.domain;
  const text=keywords(document,vaultPath);
  if(/kalman|control|estimat|滤波|控制|估计/.test(text))return 'Control & Estimation';
  if(/deep learning|pytorch|深度学习|神经网络/.test(text))return 'Deep Learning';
  if(/ros2|px4|robotics|无人机|机器人/.test(text))return 'Robotics';
  if(/website|jekyll|wechat|网站|微信|小程序|项目实验/.test(text))return 'Software';
  if(/论文|research/.test(text))return 'Research';
  if(/life|闲杂|随记/.test(text))return 'Life';
  return 'Notes';
}
function classify(document, slug, fallbackFolder='05-闲杂随记') {
  const text = keywords(document,slug);
  if (/kalman|control|estimat|滤波|控制|估计/.test(text)) return '02-知识笔记/3. 控制与估计/'+slug+'.md';
  if (/deep learning|pytorch|深度学习|神经网络/.test(text)) return '02-知识笔记/1. 深度学习/'+slug+'.md';
  if (/ros2|px4|无人机/.test(text)) return '02-知识笔记/2. 无人机 PX4-ROS2/'+slug+'.md';
  if (/website|jekyll|web development|网站/.test(text)) return '04-项目实验/1. 个人网站/'+slug+'.md';
  if (/wechat|微信|小程序/.test(text)) return '04-项目实验/2. 微信小程序/'+slug+'.md';
  return safeFolder(fallbackFolder)+'/'+slug+'.md';
}
module.exports = {hash,canonical,fingerprint,parseDocument,serialize,direction,inside,safeSlug,slugFromFile,classify,normalized,MANAGED,MODES,safeFolder,inferDomain};

},
'./border-snapshot': function(module,exports,require){
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

},
'./render-utils': function(module,exports,require){
'use strict';
const {hash} = require('./sync-core');
const escapeHtml = value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const headingId = text=>text.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\p{L}\p{N}_-]/gu,'') || 'section';

// Keep code fences and inline code literal, and defer math to the website's local MathJax.
function protectMath(source) {
  let output='', i=0; const math=[]; const prefix='OBWEBSYNCMATH'+hash(source).slice(0,8);
  const escaped = index=>{let n=0;while(index>0&&source[--index]==='\\')n++;return n%2===1;};
  while(i<source.length) {
    if(i===0||source[i-1]==='\n') {
      const opening=source.slice(i).match(/^ {0,3}(`{3,}|~{3,})[^\n]*(?:\n|$)/);
      if(opening) {
        const marker=opening[1], start=i; i+=opening[0].length;
        while(i<source.length) {
          const end=source.indexOf('\n',i), stop=end<0?source.length:end+1;
          const line=source.slice(i,stop);
          i=stop;
          if(new RegExp('^ {0,3}'+marker[0]+'{'+marker.length+',}[ \\t]*(?:\\n|$)').test(line))break;
        }
        output+=source.slice(start,i); continue;
      }
    }
    if(source[i]==='`') {
      const token=source.slice(i).match(/^`+/)[0], end=source.indexOf(token,i+token.length);
      if(end>=0) {output+=source.slice(i,end+token.length);i=end+token.length;continue;}
    }
    if(source[i]==='$'&&!escaped(i)) {
      const delimiter=source[i+1]==='$'?'$$':'$'; let end=i+delimiter.length;
      while((end=source.indexOf(delimiter,end))>=0) {
        if(!escaped(end)&&(delimiter==='$$'||source[end+1]!=='$'))break;
        end+=delimiter.length;
      }
      if(end>=0&&(delimiter==='$$'||!source.slice(i+1,end).includes('\n'))) {
        const value=source.slice(i+delimiter.length,end);
        const token=prefix+math.length+'END';
        math.push({token,value,display:delimiter==='$$'});
        output+=token; i=end+delimiter.length; continue;
      }
    }
    output+=source[i++];
  }
  return {source:output, math};
}
function restoreMath(html, math) {
  for(const item of math) {
    const formula=escapeHtml((item.display?'\\[':'\\(')+item.value+(item.display?'\\]':'\\)'));
    html=html.split(item.token).join(`<span class="${item.display?'math-display':'math-inline'}">${formula}</span>`);
  }
  return html;
}
module.exports={escapeHtml,headingId,protectMath,restoreMath};

},
'./main': function(module,exports,require){
'use strict';
const {Plugin,PluginSettingTab,Setting,Notice,Modal,MarkdownRenderer,Component,parseYaml,stringifyYaml}=require('obsidian');
const fs=require('fs');
const path=require('path');
const core=require('./sync-core');
const border=require('./border-snapshot');
const render=require('./render-utils');
const DEFAULTS={websitePath:'',rubyExecutable:'',bundlePath:'',buildAfterSync:true,syncMode:'bidirectional',protectTargetChanges:true,refreshBodyStyles:true,importFolder:'05-闲杂随记'};
const TODAY=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const readDoc=text=>core.parseDocument(text,parseYaml);
const serialize=doc=>core.serialize(doc,stringifyYaml);
const publicMeta=meta=>Object.fromEntries(Object.entries(meta).filter(([key])=>!core.MANAGED.has(key)));

module.exports=class WebsiteNoteSync extends Plugin {
  async onload() {
    this.data=await this.loadData()||{};
    this.settings={...DEFAULTS,...this.data.settings};
    this.state=this.data.state||{};
    this.addRibbonIcon('refresh-cw','预览并同步公开笔记',()=>this.preview());
    this.addCommand({id:'sync-public-notes',name:'预览并同步公开笔记',callback:()=>this.preview()});
    this.addCommand({id:'sync-current-note',name:'预览并同步当前笔记',callback:()=>{
      const file=this.app.workspace.getActiveFile();
      if(!file||file.extension!=='md')return new Notice('请先打开一篇 Markdown 笔记。');
      this.preview(file.path);
    }});
    this.addCommand({id:'prepare-current-note',name:'为当前笔记补充网站发布属性',callback:()=>this.prepareCurrentNote()});
    this.addCommand({id:'toggle-public',name:'切换当前笔记公开状态',callback:async()=>{
      const file=this.app.workspace.getActiveFile();
      if(!file||file.extension!=='md')return;
      await this.app.fileManager.processFrontMatter(file,meta=>{meta.publish=meta.publish!==true;});
      new Notice('公开状态已更新；点击双向同步后应用到网站。');
    }});
    this.settingTab=new SyncSettings(this.app,this);
    this.addSettingTab(this.settingTab);
  }
  async prepareCurrentNote() {
    const file=this.app.workspace.getActiveFile();
    if(!file||file.extension!=='md')return new Notice('请先打开一篇 Markdown 笔记。');
    if(file.path.startsWith('99-模板/')||file.path.startsWith('.'))return new Notice('请在正文笔记中添加属性。');
    await this.app.fileManager.processFrontMatter(file,meta=>{
      if(!meta.title)meta.title=file.basename;
      if(!meta.date)meta.date=TODAY();
      if(!meta.updated)meta.updated=meta.date;
      if(meta.publish===undefined)meta.publish=false;
      if(!meta.domain)meta.domain=core.inferDomain({meta},file.path);
      if(!meta.tags)meta.tags=[];
      if(meta.featured===undefined)meta.featured=false;
      if(meta.excerpt===undefined)meta.excerpt='';
    });
    new Notice('发布属性已补充。写好后勾选 publish，再预览同步。');
  }
  async save() {this.data={...this.data,settings:this.settings,state:this.state};await this.saveData(this.data);}
  root() {
    const root=path.resolve(this.settings.websitePath||'');
    if(!this.settings.websitePath||!fs.existsSync(path.join(root,'_config.yml'))||!fs.existsSync(path.join(root,'_notes')))throw new Error('请在插件设置中选择个人网站仓库目录。');
    return root;
  }
  async plan({onlyPath=null}={}) {
    const root=this.root(), vault=new Map(), web=new Map();
    const mode=this.settings.syncMode;
    if(!core.MODES[mode])throw new Error('请在设置中选择有效的同步模式。');
    core.safeFolder(this.settings.importFolder);
    for(const file of this.app.vault.getMarkdownFiles()) {
      if(file.path.startsWith('99-模板/')||file.path.startsWith('.'))continue;
      const raw=await this.app.vault.read(file),doc=readDoc(raw);
      if(doc.meta.publish!==true&&!doc.meta.web_id)continue;
      const id=String(doc.meta.web_id||doc.meta.web_slug||core.slugFromFile(file.path));
      if(vault.has(id))throw new Error('两篇 Obsidian 笔记使用了同一个 web_id：'+id);
      vault.set(id,{file,raw,doc});
    }
    for(const name of fs.readdirSync(path.join(root,'_notes'))) {
      if(!name.endsWith('.md'))continue;
      const full=core.inside(root,'_notes/'+name),raw=fs.readFileSync(full,'utf8'),doc=readDoc(raw);
      const id=String(doc.meta.web_id||doc.meta.web_slug||name.slice(0,-3));
      if(doc.meta.publish!==true&&!this.state[id])continue;
      if(web.has(id))throw new Error('两篇网站笔记使用了同一个 web_id：'+id);
      web.set(id,{name,full,raw,doc});
    }
    const ids=new Set([...vault.keys(),...web.keys(),...Object.keys(this.state)]),items=[];
    for(const id of ids) {
      const v=vault.get(id),w=web.get(id),base=this.state[id];
      if(!v&&!w)continue;
      const action=core.direction(base,v?.doc,w?.doc,{mode,protectTargetChanges:this.settings.protectTargetChanges});
      if(action==='private'||action==='missing')continue;
      const document=v?.doc||w?.doc;
      const slug=core.safeSlug(document.meta.web_slug||base?.slug||w?.name.slice(0,-3)||core.slugFromFile(v.file.path));
      const vaultPath=v?.file.path||base?.vaultPath||core.classify(document,slug,this.settings.importFolder);
      const webPath='_notes/'+slug+'.md';
      core.inside(this.app.vault.adapter.basePath,vaultPath);core.inside(root,webPath);
      if(!v&&this.app.vault.getAbstractFileByPath(vaultPath))throw new Error('导入路径已有其他文件：'+vaultPath);
      items.push({id,slug,vaultPath,webPath,action,v,w,base,title:String(document.meta.title||v?.file.basename||slug)});
    }
    return {root,mode,onlyPath,allItems:items,items:onlyPath?items.filter(item=>item.vaultPath===onlyPath):items};
  }
  async preview(onlyPath=null) {
    try {
      const plan=await this.plan({onlyPath});
      if(!plan.items.length)return new Notice(onlyPath?'当前笔记尚未公开。请先补充发布属性并勾选 publish。':'没有可同步的公开笔记。');
      new SyncPreview(this.app,this,plan).open();
    }
    catch(error){new Notice(error.message,9000);console.error(error);}
  }
  async backup(relative,content) {
    if(content===undefined)return;
    const target=core.inside(this.backupRoot,relative);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
  }
  async writeVault(relative,text) {
    const current=this.app.vault.getAbstractFileByPath(relative);
    if(current){await this.app.vault.modify(current,text);return current;}
    const parts=relative.split('/');parts.pop();let folder='';
    for(const part of parts){folder=folder?folder+'/'+part:part;if(!this.app.vault.getAbstractFileByPath(folder))await this.app.vault.createFolder(folder);}
    return this.app.vault.create(relative,text);
  }
  writeWeb(root,relative,text) {
    const target=core.inside(root,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);
  }
  async synchronize({resolutions={},build=this.settings.buildAfterSync,onlyPath=null,expectedPlan=null}={}) {
    if(this.running)throw new Error('同步正在进行。');
    this.running=true;
    try {
      const plan=await this.plan({onlyPath});
      if(expectedPlan) {
        const signature=value=>JSON.stringify({root:value.root,mode:value.mode,items:value.items.map(item=>[item.id,item.action,item.vaultPath,item.webPath,item.v?.raw,item.w?.raw])});
        if(signature(plan)!==signature(expectedPlan))throw new Error('预览后笔记或同步设置发生了变化，请关闭窗口并重新预览。');
      }
      const allowed=plan.mode==='vault-to-web'?['vault','skip']:plan.mode==='web-to-vault'?['web','skip']:['vault','web','skip'];
      const conflicts=plan.items.filter(item=>item.action==='conflict'&&!resolutions[item.id]);
      if(conflicts.length)throw new Error('有需要确认的版本冲突，尚未覆盖任何笔记：'+conflicts.map(x=>x.title).join('、'));
      for(const item of plan.items)if(item.action==='conflict'&&!allowed.includes(resolutions[item.id]))throw new Error('冲突处理方式不符合当前同步方向。');
      // Verify the exact versions used to prepare the plan before touching either side.
      for(const item of plan.items) {
        if(item.v&&await this.app.vault.read(item.v.file)!==item.v.raw)throw new Error('笔记正在修改，请重新预览：'+item.title);
        if(item.w&&fs.readFileSync(item.w.full,'utf8')!==item.w.raw)throw new Error('网站文件正在修改，请重新预览：'+item.title);
      }
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      this.backupRoot=core.inside(this.app.vault.adapter.basePath,this.manifest.dir+'/backups/'+stamp);
      fs.mkdirSync(this.backupRoot,{recursive:true});
      const active=[];
      let imported=0,withdrawn=0,skipped=0;
      for(const item of plan.items) {
        let action=item.action;
        if(action==='conflict')action=resolutions[item.id]==='web'?'import':resolutions[item.id]==='vault'?'export':'skip';
        if(action==='skip'){skipped++;continue;}
        if(plan.mode==='web-to-vault'&&action==='equal')continue;
        await this.backup('vault/'+item.vaultPath,item.v?.raw);
        await this.backup('web/'+item.webPath,item.w?.raw);
        if(action==='withdraw') {
          const old=item.w?.full||core.inside(plan.root,item.webPath);
          if(fs.existsSync(old))fs.unlinkSync(old);
          const generated=core.inside(plan.root,'_includes/rendered-notes/'+item.slug+'.html');
          if(fs.existsSync(generated))fs.unlinkSync(generated);
          for(const asset of item.base?.assets||[]){const assetFile=core.inside(plan.root,asset);if(fs.existsSync(assetFile))fs.unlinkSync(assetFile);}
          delete this.state[item.id];
          withdrawn++;
          continue;
        }
        const incoming=action==='import'?item.w?.doc:item.v?.doc;
        if(!incoming)throw new Error('所选版本已不存在：'+item.title);
        const doc={meta:publicMeta(incoming.meta),body:incoming.body};
        doc.meta.web_id=item.id;doc.meta.web_slug=item.slug;
        if(!doc.meta.title)doc.meta.title=item.title;
        if(!doc.meta.date)doc.meta.date=TODAY();
        if(!doc.meta.updated)doc.meta.updated=doc.meta.date;
        doc.meta.domain=core.inferDomain(doc,item.vaultPath);
        if(!Array.isArray(doc.meta.tags))doc.meta.tags=doc.meta.tags?[String(doc.meta.tags)]:[];
        if(plan.mode==='web-to-vault') {
          const file=await this.writeVault(item.vaultPath,serialize(doc));
          const stored=readDoc(await this.app.vault.read(file));
          this.state[item.id]={...item.base,slug:item.slug,vaultPath:file.path,webPath:'_notes/'+item.w.name,
            vaultHash:core.fingerprint(stored),webHash:core.fingerprint(item.w.doc),assets:item.base?.assets||[]};
          imported++;continue;
        }
        // Web-side publish:false explicitly withdraws the existing public note.
        if(doc.meta.publish!==true) {
          await this.writeVault(item.vaultPath,serialize(doc));
          if(item.w&&fs.existsSync(item.w.full))fs.unlinkSync(item.w.full);
          const generated=core.inside(plan.root,'_includes/rendered-notes/'+item.slug+'.html');
          if(fs.existsSync(generated))fs.unlinkSync(generated);
          for(const asset of item.base?.assets||[]){const assetFile=core.inside(plan.root,asset);if(fs.existsSync(assetFile))fs.unlinkSync(assetFile);}
          delete this.state[item.id];withdrawn++;continue;
        }
        if(action!=='equal'&&item.base)doc.meta.updated=TODAY();
        const text=serialize(doc);
        const file=await this.writeVault(item.vaultPath,text);
        active.push({...item,doc,file});
      }
      const routes=new Map(active.map(item=>[item.file.path,'/notes/'+item.slug+'/']));
      // Include skipped public notes in link resolution without exporting their new contents.
      for(const item of plan.allItems)if(item.w?.doc.meta.publish===true&&item.action!=='withdraw'&&!routes.has(item.vaultPath))routes.set(item.vaultPath,'/notes/'+item.slug+'/');
      for(const item of active) {
        const rendered=await this.renderNote(item,plan.root,routes);
        for(const oldAsset of item.base?.assets||[])if(!rendered.assets.includes(oldAsset)){const oldFile=core.inside(plan.root,oldAsset);if(fs.existsSync(oldFile))fs.unlinkSync(oldFile);}
        const renderedPath='rendered-notes/'+item.slug+'.html';
        this.writeWeb(plan.root,'_includes/'+renderedPath,rendered.html);
        const webDoc={meta:{...item.doc.meta,rendered_body:renderedPath,
          rendered_source_hash:core.hash(item.doc.body.replace(/\r\n/g,'\n')),
          source_vault_path:item.file.path,mathjax:true,render_with_liquid:false},body:item.doc.body};
        this.writeWeb(plan.root,item.webPath,serialize(webDoc));
        if(item.w&&path.resolve(item.w.full)!==core.inside(plan.root,item.webPath))fs.unlinkSync(item.w.full);
        const canonicalWeb=readDoc(fs.readFileSync(core.inside(plan.root,item.webPath),'utf8'));
        this.state[item.id]={slug:item.slug,vaultPath:item.file.path,webPath:item.webPath,
          vaultHash:core.fingerprint(item.doc),webHash:core.fingerprint(canonicalWeb),assets:rendered.assets};
      }
      if(plan.mode!=='web-to-vault'&&(this.settings.refreshBodyStyles||!fs.existsSync(path.join(plan.root,'assets/css/border.css')))) {
        const snapshot=border.capture();
        this.writeWeb(plan.root,'assets/css/border.css',border.css(snapshot));
      }
      this.data.lastSync=new Date().toISOString();await this.save();
      const shouldBuild=build&&plan.mode!=='web-to-vault';
      if(shouldBuild)await this.buildWebsite(plan.root);
      const result={mode:plan.mode,notes:active.length+imported,withdrawn,skipped,built:shouldBuild,conflicts:0,actions:plan.items.map(x=>({id:x.id,action:x.action})),backup:this.backupRoot};
      new Notice(core.MODES[plan.mode]+'完成：'+result.notes+' 篇，撤下 '+withdrawn+' 篇，跳过 '+skipped+' 篇'+(shouldBuild?'；本地网站已更新':'')+'。',7000);
      return result;
    } finally {this.running=false;}
  }
  async renderNote(item,root,routes) {
    const protectedMath=render.protectMath(item.doc.body);
    // Note embeds become public links; private embeds never enter exported HTML.
    const source=protectedMath.source.replace(/!\[\[([^\]]+)\]\]/g,(match,target)=>{
      const link=target.split('|')[0].split('#')[0];
      const destination=this.app.metadataCache.getFirstLinkpathDest(link,item.file.path);
      if(destination?.extension==='md')return '[['+target+']]';
      return match;
    });
    const host=document.createElement('div');host.className='markdown-preview-view markdown-rendered';
    host.style.cssText='position:fixed;left:-20000px;top:0;width:750px;visibility:hidden;';
    document.body.append(host);const component=new Component();component.load();
    const assets=[];
    try {
      await MarkdownRenderer.render(this.app,source,host,item.file.path,component);
      // Renderers may use microtasks to attach image sources and link metadata.
      await new Promise(resolve=>setTimeout(resolve,30));
      // Restore formulas only in text nodes; injecting span HTML into data-heading
      // attributes corrupts headings containing inline formulas.
      for(const element of host.querySelectorAll('*'))for(const attr of [...element.attributes]) {
        let value=attr.value;
        for(const math of protectedMath.math)value=value.split(math.token).join(math.value);
        if(value!==attr.value)element.setAttribute(attr.name,value);
      }
      const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT),textNodes=[];
      while(walker.nextNode())if(protectedMath.math.some(math=>walker.currentNode.nodeValue.includes(math.token)))textNodes.push(walker.currentNode);
      for(const text of textNodes) {
        const restored=document.createElement('span');
        restored.innerHTML=render.restoreMath(render.escapeHtml(text.nodeValue),protectedMath.math);
        text.replaceWith(...restored.childNodes);
      }
      const ids=new Set();
      host.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading=>{
        let id=render.headingId(heading.textContent);while(ids.has(id))id+='-';ids.add(id);heading.id=id;
      });
      host.querySelectorAll('.copy-code-button,.heading-collapse-indicator,.collapse-indicator,.metadata-container').forEach(node=>node.remove());
      for(const link of host.querySelectorAll('a')) {
        const href=link.getAttribute('data-href')||link.getAttribute('href')||'';
        if(/^(https?:|mailto:|tel:|#)/i.test(href))continue;
        const [filePart,fragment]=href.split('#');
        const destination=this.app.metadataCache.getFirstLinkpathDest(decodeURIComponent(filePart),item.file.path);
        if(destination?.extension==='md') {
          const route=routes.get(destination.path);
          if(route)link.setAttribute('href',route+(fragment?'#'+encodeURIComponent(render.headingId(fragment)):''));
          else {const plain=document.createElement('span');plain.className='unpublished-link';plain.textContent=link.textContent;link.replaceWith(plain);}
        } else if(destination) {
          const url=await this.copyAsset(destination.path,item,root,assets);link.setAttribute('href',url);
        } else if(/^(obsidian:|zotero:|app:|file:)/i.test(href)||!href.includes(':')) {
          const plain=document.createElement('span');plain.textContent=link.textContent;link.replaceWith(plain);
        }
      }
      for(const node of host.querySelectorAll('img,video,audio,source')) {
        const raw=node.getAttribute('src')||'';
        if(/^(https?:|data:)/i.test(raw))continue;
        const embed=node.closest('.internal-embed');
        let relative=embed?.getAttribute('src')?.split('|')[0]||raw;
        let destination=this.app.metadataCache.getFirstLinkpathDest(relative,item.file.path);
        if(!destination) {
          let decoded=decodeURIComponent(raw.split('?')[0]).replace(/^app:\/\/local\//,'').replace(/^file:\/\/\//,'');
          const vaultRoot=this.app.vault.adapter.basePath;
          if(path.isAbsolute(decoded)) {
            const local=path.relative(vaultRoot,decoded).replace(/\\/g,'/');
            if(!local.startsWith('../'))destination=this.app.vault.getAbstractFileByPath(local);
          }
        }
        if(destination&&destination.extension!=='md')node.setAttribute('src',await this.copyAsset(destination.path,item,root,assets));
        else if(raw.startsWith('/images/')&&fs.existsSync(core.inside(root,raw.slice(1))))continue;
        else throw new Error('图片或附件无法定位：'+relative+'（'+item.title+'）');
      }
      host.querySelectorAll('[data-href]').forEach(node=>node.removeAttribute('data-href'));
      host.querySelectorAll('.internal-embed').forEach(node=>{node.removeAttribute('src');node.removeAttribute('alt');});
      host.querySelectorAll('script').forEach(node=>node.remove());
      let html=host.innerHTML.replace(/\{\{/g,'&#123;{').replace(/\{%/g,'&#123;%');
      return {html,assets};
    } finally {component.unload();host.remove();}
  }
  async copyAsset(relative,item,root,assets) {
    if(relative.startsWith('.'))throw new Error('不会导出隐藏配置文件。');
    const absolute=core.inside(this.app.vault.adapter.basePath,relative);
    const bytes=fs.readFileSync(absolute),ext=path.extname(relative).toLowerCase();
    if(!['.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.pdf','.mp4','.webm','.mp3','.wav','.ogg'].includes(ext))throw new Error('暂不支持导出此附件类型：'+relative);
    const base=path.basename(relative,ext).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'attachment';
    const output='assets/notes/'+item.slug+'/'+core.hash(bytes).slice(0,10)+'-'+base+ext;
    const target=core.inside(root,output);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
    assets.push(output);return '/'+output;
  }
  async buildWebsite(root) {
    const {spawn}=require('child_process');
    const ruby=this.settings.rubyExecutable;
    if(!ruby||!fs.existsSync(ruby))throw new Error('笔记已同步；请在插件设置中配置 Ruby，或在网站仓库手动构建。');
    const bundle=path.join(path.dirname(ruby),'bundle');
    const env={...process.env,BUNDLE_GEMFILE:path.join(root,'Gemfile'),BUNDLE_PATH:this.settings.bundlePath||path.join(root,'vendor/bundle'),
      BUNDLE_USER_HOME:path.join(this.app.vault.adapter.basePath,this.manifest.dir,'bundle-cache'),JEKYLL_ENV:'production',
      PATH:path.dirname(ruby)+path.delimiter+process.env.PATH};
    await new Promise((resolve,reject)=>{
      const child=spawn(ruby,[bundle,'exec','jekyll','build','--trace'],{cwd:root,env,windowsHide:true});let log='';
      child.stdout.on('data',data=>{log+=data;});child.stderr.on('data',data=>{log+=data;});
      child.on('error',reject);child.on('close',code=>{if(code===0)resolve();else{console.error(log);reject(new Error('笔记已同步，但网站构建失败；请查看开发者控制台。'));}});
    });
  }
};

class SyncPreview extends Modal {
  constructor(app,plugin,plan){super(app);this.plugin=plugin;this.plan=plan;this.resolutions={};}
  onOpen(){
    this.contentEl.createEl('h2',{text:core.MODES[this.plan.mode]+(this.plan.onlyPath?' · 当前笔记':' · 公开笔记')});
    this.contentEl.createEl('p',{text:this.plan.mode==='web-to-vault'?'只导入到 Obsidian，不改写或构建网站。同步前会备份笔记。':'同步前会备份笔记；本地构建后仍需通过 Git 发布到线上。'});
    if(this.plan.mode!=='bidirectional'&&!this.plugin.settings.protectTargetChanges)this.contentEl.createEl('p',{text:'接收方修改保护已关闭：不同内容会以同步来源版本覆盖，覆盖前会备份。'});
    const labels={equal:'两边一致',import:'网站 → Obsidian',export:'Obsidian → 网站',withdraw:'从网站撤下',conflict:'存在不同版本，需要确认',skip:'本次方向不处理这一侧独有的笔记'};
    for(const item of this.plan.items){
      const setting=new Setting(this.contentEl).setName(item.title).setDesc(labels[item.action]+' · '+item.vaultPath+' ↔ '+item.webPath);
      if(item.action==='conflict')setting.addDropdown(drop=>{
        const options={'':'请选择处理方式'};
        if(this.plan.mode!=='web-to-vault')options.vault='以 Obsidian 版本更新网站';
        if(this.plan.mode!=='vault-to-web')options.web='以网站版本更新 Obsidian';
        options.skip='暂时跳过';
        drop.addOptions(options).onChange(value=>{this.resolutions[item.id]=value;});
      });
    }
    const buttonText=this.plan.mode==='web-to-vault'?'导入到 Obsidian':this.plugin.settings.buildAfterSync?'同步并构建本地网站':'同步笔记';
    new Setting(this.contentEl).addButton(button=>button.setButtonText(buttonText).setCta().onClick(async()=>{
      button.setDisabled(true);
      try{await this.plugin.synchronize({resolutions:this.resolutions,onlyPath:this.plan.onlyPath,expectedPlan:this.plan});this.close();}
      catch(error){new Notice(error.message,10000);console.error(error);button.setDisabled(false);}
    }));
  }
  onClose(){this.contentEl.empty();}
}
class SyncSettings extends PluginSettingTab {
  constructor(app,plugin){super(app,plugin);this.plugin=plugin;}
  display(){
    this.containerEl.empty();this.containerEl.createEl('h2',{text:'个人网站笔记同步'});
    new Setting(this.containerEl).setName('同步模式').setDesc('Obsidian 是主要写作入口时，推荐 Obsidian → 网站。模式只在手动点击同步时生效。').addDropdown(drop=>drop.addOptions(core.MODES).setValue(this.plugin.settings.syncMode).onChange(async value=>{this.plugin.settings.syncMode=value;await this.plugin.save();this.display();}));
    const descriptions={bidirectional:'比较上次同步记录：单边修改传到另一边，两边不同修改需选择版本。','vault-to-web':'仅将公开笔记及撤下状态传到网站；网站独有笔记会跳过。','web-to-vault':'仅将本地网站笔记导入 Obsidian；不会改写、渲染或构建网站，也不按网站文件的缺失删除笔记。'};
    this.containerEl.createEl('p',{text:descriptions[this.plugin.settings.syncMode]});
    if(this.plugin.settings.syncMode!=='bidirectional')new Setting(this.containerEl).setName('保护接收方的独立修改').setDesc('开启：接收方有不同修改时先确认。关闭：按来源版本覆盖，仍保留 Markdown 备份。').addToggle(toggle=>toggle.setValue(this.plugin.settings.protectTargetChanges).onChange(async value=>{this.plugin.settings.protectTargetChanges=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('网站仓库目录').setDesc('包含 _config.yml 和 _notes 的本地文件夹。').addText(text=>text.setValue(this.plugin.settings.websitePath).onChange(async value=>{this.plugin.settings.websitePath=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('未匹配分类的导入目录').setDesc('仅用于网站新笔记首次导入；不会移动已有笔记。默认 05-闲杂随记。离开输入框时保存。').addText(text=>{
      text.setValue(this.plugin.settings.importFolder);
      text.inputEl.addEventListener('change',async()=>{
        try{this.plugin.settings.importFolder=core.safeFolder(text.getValue());await this.plugin.save();}
        catch(error){text.setValue(this.plugin.settings.importFolder);new Notice(error.message);}
      });
    });
    if(this.plugin.settings.syncMode!=='web-to-vault')new Setting(this.containerEl).setName('同步时刷新正文样式').setDesc('从当前 Obsidian 主题和 Style Settings 更新网站正文 CSS。关闭时保留网站已有正文 CSS。').addToggle(toggle=>toggle.setValue(this.plugin.settings.refreshBodyStyles).onChange(async value=>{this.plugin.settings.refreshBodyStyles=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('Ruby 程序路径').setDesc('用于同步后构建网站；不会自动安装软件。').addText(text=>text.setValue(this.plugin.settings.rubyExecutable).onChange(async value=>{this.plugin.settings.rubyExecutable=value;await this.plugin.save();}));
    if(this.plugin.settings.syncMode!=='web-to-vault')new Setting(this.containerEl).setName('同步后构建本地网站').setDesc('只生成本地预览，不会执行 Git 提交或推送。').addToggle(toggle=>toggle.setValue(this.plugin.settings.buildAfterSync).onChange(async value=>{this.plugin.settings.buildAfterSync=value;await this.plugin.save();}));
    this.containerEl.createEl('h3',{text:'新文章与笔记属性'});
    this.containerEl.createEl('p',{text:'在新笔记运行 Templater: Open Insert Template modal，选择 website-note；或使用下方按钮给当前笔记补充属性。写好后勾选 publish，设置 domain 和 tags，再预览同步。'});
    new Setting(this.containerEl).setName('当前笔记发布属性').setDesc('只补充缺失字段，不会将草稿自动公开。').addButton(button=>button.setButtonText('补充属性').onClick(()=>this.plugin.prepareCurrentNote()));
    this.containerEl.createEl('p',{text:'最近同步：'+(this.plugin.data.lastSync?new Date(this.plugin.data.lastSync).toLocaleString():'尚未同步')+'。备份位于插件 backups 文件夹。'});
  }
}

},
};
const cache={};
function load(name){if(!modules[name])return nativeRequire(name);if(!cache[name]){const part={exports:{}};cache[name]=part;modules[name](part,part.exports,load);}return cache[name].exports;}
module.exports=load("./main");
