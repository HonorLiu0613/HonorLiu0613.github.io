'use strict';
const nativeRequire=require;
const modules={
"./sync-core": function(module,exports,require){
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
"./border-snapshot": function(module,exports,require){
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
"./render-utils": function(module,exports,require){
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
"./git-publisher": function(module,exports,require){
'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {spawn}=require('child_process');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function defaultExecutable() {
  const candidate=path.join(process.env.ProgramFiles||'C:/Program Files','Git/cmd/git.exe');
  return fs.existsSync(candidate)?candidate:'git';
}
function redact(text) {
  return String(text).replace(/(https?:\/\/)[^\s/@]+(?::[^\s/@]+)?@/gi,'$1[credential]@')
    .replace(/\b(?:gh[pousr]_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9_]+)\b/g,'[credential]');
}
function run(root,args,{executable=defaultExecutable(),allowFailure=false,timeout=120000}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{cwd:root,windowsHide:true,shell:false,
      env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never',
        GIT_SSH_COMMAND:process.env.GIT_SSH_COMMAND||'ssh -o BatchMode=yes -o ConnectTimeout=15'}});
    let stdout='',stderr='',timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill();},timeout);
    child.stdout.on('data',data=>{stdout+=data.toString('utf8');});
    child.stderr.on('data',data=>{stderr+=data.toString('utf8');});
    child.on('error',error=>{clearTimeout(timer);reject(new Error('无法运行 Git：'+redact(error.message)));});
    child.on('close',code=>{
      clearTimeout(timer);
      if(timedOut)return reject(new Error('Git 操作超时，请检查网络或登录状态后重新预览。'));
      if(code!==0&&!allowFailure)return reject(new Error(redact((stderr||stdout).trim())||'Git 操作失败，退出码 '+code));
      resolve({stdout,stderr,code});
    });
  });
}
function fileDigest(root,relative) {
  const full=path.resolve(root,relative),rel=path.relative(root,full);
  if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw new Error('无效的网站文件路径。');
  try {
    const stat=fs.lstatSync(full);
    if(stat.isSymbolicLink())return hash('symlink:'+fs.readlinkSync(full));
    if(!stat.isFile())throw new Error('暂不支持发布此文件类型：'+relative);
    return hash(fs.readFileSync(full));
  }catch(error){if(error.code==='ENOENT')return null;throw error;}
}
function signature(plan) {
  return hash(JSON.stringify({root:plan.root,head:plan.head,branch:plan.branch,remote:plan.remote,
    remoteURL:plan.remoteURL,index:plan.indexHash,status:plan.status,files:plan.files}));
}
async function plan(root,settings={}) {
  root=path.resolve(root);
  const options={executable:settings.gitExecutable||defaultExecutable()};
  const git=args=>run(root,args,options);
  const top=(await git(['rev-parse','--show-toplevel'])).stdout.trim();
  if(fs.realpathSync(top).toLowerCase()!==fs.realpathSync(root).toLowerCase())throw new Error('网站目录必须是 Git 仓库根目录。');
  const branch=(await git(['symbolic-ref','--quiet','--short','HEAD'])).stdout.trim();
  const remote=String(settings.gitRemote||'origin').trim();
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(remote))throw new Error('Git 远程名称无效。');
  const remoteURL=(await git(['remote','get-url','--push',remote])).stdout.trim();
  const head=(await git(['rev-parse','HEAD'])).stdout.trim();
  const status=(await git(['-c','status.renames=false','status','--porcelain=v1','-z','--untracked-files=all'])).stdout;
  const indexHash=hash((await git(['ls-files','--stage','-z'])).stdout);
  const files=status.split('\0').filter(Boolean).map(entry=>({status:entry.slice(0,2),path:entry.slice(3)}));
  if(files.some(file=>/[U]/.test(file.status)||file.status==='AA'||file.status==='DD'))throw new Error('仓库存在未解决的合并冲突，请先处理后再发布。');
  for(const file of files)file.hash=fileDigest(root,file.path);
  const tracking='refs/remotes/'+remote+'/'+branch;
  const exists=await run(root,['show-ref','--verify','--quiet',tracking],{...options,allowFailure:true});
  const ahead=exists.code===0?Number((await git(['rev-list','--count',tracking+'..HEAD'])).stdout.trim()):null;
  const behind=exists.code===0?Number((await git(['rev-list','--count','HEAD..'+tracking])).stdout.trim()):null;
  return {root,branch,remote,remoteURL,head,status,indexHash,files,ahead,behind};
}
async function publish(root,settings,expected,message) {
  const current=await plan(root,settings);
  if(signature(current)!==signature(expected))throw new Error('预览后仓库内容、暂存区或分支发生变化，请重新预览。');
  const options={executable:settings.gitExecutable||defaultExecutable()};
  const git=args=>run(root,args,options);
  if(current.behind>0)throw new Error('本地记录显示远程有尚未合入的提交，请先拉取并解决差异，再重新同步与发布。');
  let committed=false,commit=current.head;
  if(current.files.length) {
    const body=String(message||'').trim();
    if(!body)throw new Error('请输入提交说明。');
    await git(['add','--all','--','.']);
    await git(['commit','-m',body]);
    committed=true;commit=(await git(['rev-parse','HEAD'])).stdout.trim();
  }
  try {
    await git(['push','--',current.remote,'HEAD:refs/heads/'+current.branch]);
  }catch(error){
    throw new Error((committed?'本地提交 '+commit.slice(0,7)+' 已保留，推送未成功。':'推送未成功。')+'\n'+error.message+'\n可在解决登录、网络或远程分支差异后重新预览并推送。');
  }
  return {commit,committed,remote:current.remote,branch:current.branch,files:current.files.length};
}
module.exports={defaultExecutable,redact,run,plan,publish,signature};

},
"./main": function(module,exports,require){
'use strict';
const {Plugin,PluginSettingTab,Setting,Notice,Modal,MarkdownRenderer,Component,parseYaml,stringifyYaml}=require('obsidian');
const fs=require('fs');
const path=require('path');
const core=require('./sync-core');
const border=require('./border-snapshot');
const render=require('./render-utils');
const publisher=require('./git-publisher');
const media=require('./media-publisher');
const mediaContent=require('./media-content');
const MEDIA_PLATFORMS={csdn:'CSDN',zhihu:'知乎',xiaohongshu:'小红书',douyin:'抖音图文'};
const DEFAULTS={websitePath:'',rubyExecutable:'',bundlePath:'',buildAfterSync:true,syncMode:'vault-to-web',protectTargetChanges:true,refreshBodyStyles:true,importFolder:'05-闲杂随记',gitExecutable:publisher.defaultExecutable(),gitRemote:'origin',openPushAfterSync:true,buildBeforePush:true,commitMessage:'Update public notes',edgeExecutable:media.defaultEdge(),mediaPlatforms:['csdn','zhihu','xiaohongshu','douyin'],mediaAutoOpen:true,mediaWebsiteUrl:'https://honorliu.top'};
const TODAY=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const readDoc=text=>core.parseDocument(text,parseYaml);
const serialize=doc=>core.serialize(doc,stringifyYaml);
const publicMeta=meta=>Object.fromEntries(Object.entries(meta).filter(([key])=>!core.MANAGED.has(key)));

module.exports=class WebsiteNoteSync extends Plugin {
  async onload() {
    this.data=await this.loadData()||{};
    this.settings={...DEFAULTS,...this.data.settings,mediaPlatforms:[...(this.data.settings?.mediaPlatforms||DEFAULTS.mediaPlatforms)].filter(type=>MEDIA_PLATFORMS[type])};
    this.state=this.data.state||{};
    this.mediaBridge=new media.MediaBridge(async result=>{
      this.data.mediaHistory=[result,...(this.data.mediaHistory||[]).filter(item=>item.sourcePath!==result.sourcePath||item.platform!==result.platform)].slice(0,100);
      await this.save();new Notice((MEDIA_PLATFORMS[result.platform]||result.platform)+' 草稿已保存；请在 Edge 编辑页确认发布。',10000);
    });
    this.addRibbonIcon('layers','打开同步中心',()=>new SyncCenter(this.app,this).open());
    this.addCommand({id:'send-current-note-to-media',name:'将当前笔记发送到媒体平台草稿',callback:()=>this.previewMedia()});
    this.addCommand({id:'draft-current-note-csdn',name:'将当前笔记发送到 CSDN 草稿',callback:()=>this.previewMedia(['csdn'])});
    this.addCommand({id:'draft-current-note-zhihu',name:'将当前笔记发送到知乎草稿',callback:()=>this.previewMedia(['zhihu'])});
    this.addCommand({id:'draft-current-note-xiaohongshu',name:'将当前笔记发送到小红书草稿',callback:()=>this.previewMedia(['xiaohongshu'])});
    this.addCommand({id:'draft-current-note-douyin',name:'将当前笔记发送到抖音图文草稿',callback:()=>this.previewMedia(['douyin'])});
    this.addCommand({id:'push-website',name:'预览改动并推送网站到 GitHub',callback:()=>this.previewPush()});
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
  onunload(){this.mediaBridge?.close();}
  previewMedia(platforms=this.settings.mediaPlatforms){
    const file=this.app.workspace.getActiveFile();
    if(!file||file.extension!=='md')return new Notice('请先打开一篇 Markdown 笔记。');
    if(file.path.startsWith('99-模板/')||file.path.startsWith('.'))return new Notice('请打开正文笔记后再发送。');
    new MediaPreview(this.app,this,file,platforms).open();
  }
  async sendMedia(file,platforms){
    if(this.preparingMedia)throw new Error('正在准备另一篇笔记，请稍后再试。');
    if(!platforms.length)throw new Error('请至少选择一个平台。');
    this.preparingMedia=true;
    try{
      const article=await this.prepareMedia(file);
      const url=await this.mediaBridge.create(article,{...this.settings,mediaPlatforms:platforms});
      await media.openEdge(this.settings.edgeExecutable,url);return url;
    }finally{this.preparingMedia=false;}
  }
  async prepareMedia(file){return mediaContent.prepareArticle(this,file);}
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
  async pendingPublicationNotes() {
    return (await this.plan()).items.filter(item=>!['equal','skip'].includes(item.action));
  }
  async previewPush() {
    if(this.running||this.publishing)return new Notice('正在同步或发布，请完成后再试。');
    try{
      const pending=await this.pendingPublicationNotes();
      if(pending.length)return new PendingPublication(this.app,this,pending).open();
      new PushPreview(this.app,this,await publisher.plan(this.root(),this.settings)).open();
    }
    catch(error){new Notice('无法准备发布：'+error.message,12000);console.error(error);}
  }
  async pushWebsite(expectedPlan,message) {
    if(this.running||this.publishing)throw new Error('正在同步或发布。');
    this.publishing=true;
    try {
      const root=this.root();
      const pending=await this.pendingPublicationNotes();
      if(pending.length)throw new Error('有 '+pending.length+' 篇笔记尚未同步，请先预览同步并处理冲突，再推送网站。');
      if(this.settings.buildBeforePush)await this.buildWebsite(root);
      const current=await publisher.plan(root,this.settings);
      if(publisher.signature(current)!==publisher.signature(expectedPlan))throw new Error('预览后网站仓库有改动，请重新预览。');
      if(current.files.length===0&&current.ahead===0){
        new Notice('没有新版本可发布：网站文件没有改动，也没有待推送提交。',10000);
        return {unchanged:true,commit:current.head,committed:false,files:0,remote:current.remote,branch:current.branch};
      }
      const result=await publisher.publish(root,this.settings,expectedPlan,message);
      this.data.lastPush={...result,time:new Date().toISOString()};await this.save();
      new Notice('已推送到 '+result.remote+'/'+result.branch+'；GitHub Actions 正在部署，请稍后查看线上网站。',12000);
      return result;
    } finally {this.publishing=false;}
  }
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
    if(this.running||this.publishing)throw new Error('正在同步或发布。');
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
      for(const item of plan.items)if(item.action==='conflict') {
        const resolution=resolutions[item.id];
        const withdrawMissing=resolution==='withdraw'&&!item.v&&item.w&&item.base&&plan.mode!=='web-to-vault';
        if(!withdrawMissing&&!allowed.includes(resolution))throw new Error('冲突处理方式不符合当前同步方向。');
        if(resolution==='vault'&&!item.v||resolution==='web'&&!item.w)throw new Error('所选版本已不存在，请选择其他处理方式。');
      }
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
        if(action==='conflict')action=resolutions[item.id]==='web'?'import':resolutions[item.id]==='vault'?'export':resolutions[item.id]==='withdraw'?'withdraw':'skip';
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

class SyncCenter extends Modal {
  constructor(app,plugin){super(app);this.plugin=plugin;}
  onOpen(){
    const el=this.contentEl;el.createEl('h2',{text:'同步中心'});
    el.createEl('p',{text:'选择当前要执行的操作。所有动作都需要你在预览窗口确认；媒体平台只生成草稿，不会自动公开发布。'});
    new Setting(el).setName('同步公开笔记').setDesc('按当前同步模式预览并同步 Obsidian 与网站。').addButton(button=>button.setButtonText('打开').setCta().onClick(()=>{this.close();this.plugin.preview();}));
    new Setting(el).setName('推送网站').setDesc('预览网站仓库改动，提交并推送到 GitHub。').addButton(button=>button.setButtonText('打开').onClick(()=>{this.close();this.plugin.previewPush();}));
    new Setting(el).setName('生成媒体草稿').setDesc('将当前笔记发送到 CSDN、知乎、小红书或抖音图文。').addButton(button=>button.setButtonText('选择平台').onClick(()=>{this.close();this.plugin.previewMedia();}));
    new Setting(el).setName('补充笔记属性').setDesc('为当前笔记补充 title、date、domain、tags 等发布字段。').addButton(button=>button.setButtonText('执行').onClick(()=>{this.close();this.plugin.prepareCurrentNote();}));
  }
  onClose(){this.contentEl.empty();}
}

class MediaPreview extends Modal {
  constructor(app,plugin,file,platforms){super(app);this.plugin=plugin;this.file=file;this.platforms=new Set(platforms||[]);}
  onOpen(){
    const el=this.contentEl;el.createEl('h2',{text:'发送到媒体草稿'});
    el.createEl('p',{text:this.file.basename});
    el.createEl('p',{text:'发送当前笔记的标题、正文和图片，无需 publish 属性，也不带网站分类。下一步在 Edge 检查登录和正文，再生成草稿；最终发布由你确认。'});
    for(const [type,name]of [['csdn','CSDN'],['zhihu','知乎'],['xiaohongshu','小红书'],['douyin','抖音图文']])new Setting(el).setName(name).addToggle(toggle=>toggle.setValue(this.platforms.has(type)).onChange(value=>{if(value)this.platforms.add(type);else this.platforms.delete(type);}));
    const history=(this.plugin.data.mediaHistory||[]).filter(item=>item.sourcePath===this.file.path);
    if(history.length){
      el.createEl('p',{text:'这篇笔记已有草稿记录。再次发送会新建草稿；修改已有草稿请打开下方编辑页。'});
      for(const item of history)new Setting(el).setName(({csdn:'CSDN',zhihu:'知乎',xiaohongshu:'小红书',douyin:'抖音图文'}[item.platform]||item.platform)+' · '+new Date(item.time).toLocaleString()).addButton(button=>button.setButtonText('打开已有草稿').onClick(async()=>{try{await media.openEdge(this.plugin.settings.edgeExecutable,item.url);}catch(error){new Notice(error.message);}}));
    }
    el.createEl('p',{text:'首次使用请在常用 Edge 中安装“文章同步助手”，并登录所选平台。CSDN 保留 LaTeX；知乎公式转成图片；小红书和抖音图文会去掉 Markdown、代码块和公式，只发送纯文本与图片。'});
    const status=el.createEl('p');
    new Setting(el).addButton(button=>button.setButtonText('在 Edge 检查并发送').setCta().onClick(async()=>{
      button.setDisabled(true);status.textContent='正在准备正文和图片…';
      try{await this.plugin.sendMedia(this.file,[...this.platforms]);this.close();new Notice('已在 Edge 打开发送页面，请检查内容后生成草稿。',10000);}
      catch(error){status.textContent=error.message;button.setDisabled(false);console.error(error);}
    }));
  }
  onClose(){this.contentEl.empty();}
}

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
        if(this.plan.mode!=='web-to-vault'&&item.v)options.vault='以 Obsidian 版本更新网站';
        if(this.plan.mode!=='vault-to-web'&&item.w)options.web=item.v?'以网站版本更新 Obsidian':'将网站版本恢复到 Obsidian';
        if(!item.v&&item.w&&item.base&&this.plan.mode!=='web-to-vault')options.withdraw='从网站撤下这篇已删除的笔记';
        options.skip='暂时跳过';
        drop.addOptions(options).onChange(value=>{this.resolutions[item.id]=value;});
      });
    }
    const buttonText=this.plan.mode==='web-to-vault'?'导入到 Obsidian':this.plugin.settings.buildAfterSync?'同步并构建本地网站':'同步笔记';
    new Setting(this.contentEl).addButton(button=>button.setButtonText(buttonText).setCta().onClick(async()=>{
      button.setDisabled(true);
      try{
        await this.plugin.synchronize({resolutions:this.resolutions,onlyPath:this.plan.onlyPath,expectedPlan:this.plan});this.close();
        if(this.plan.mode!=='web-to-vault'&&this.plugin.settings.openPushAfterSync)await this.plugin.previewPush();
      }
      catch(error){new Notice(error.message,10000);console.error(error);button.setDisabled(false);}
    }));
  }
  onClose(){this.contentEl.empty();}
}
class PushPreview extends Modal {
  constructor(app,plugin,plan){super(app);this.plugin=plugin;this.plan=plan;this.message=plugin.settings.commitMessage;}
  onOpen(){
    this.contentEl.createEl('h2',{text:'发布网站到 GitHub'});
    this.contentEl.createEl('p',{text:'目标：'+this.plan.remote+' / '+this.plan.branch+' · '+publisher.redact(this.plan.remoteURL)});
    this.contentEl.createEl('p',{text:'将提交下列全部网站仓库改动（包括已暂存改动），再推送当前分支。忽略目录如 _site 不参与提交。'});
    if(this.plan.ahead!==null)this.contentEl.createEl('p',{text:'待推送本地提交：'+this.plan.ahead+'；本地记录的远程领先提交：'+this.plan.behind+'。'});
    if(this.plan.files.length){
      const list=this.contentEl.createEl('pre');list.style.cssText='max-height:280px;overflow:auto;white-space:pre-wrap;font-size:12px;';
      list.textContent=this.plan.files.map(file=>file.status+'  '+file.path).join('\n');
      new Setting(this.contentEl).setName('提交说明').addText(text=>text.setValue(this.message).onChange(value=>{this.message=value;}));
    }else this.contentEl.createEl('p',{text:this.plan.ahead===0?'没有新版本可发布：网站文件没有改动，也没有待推送提交。':'工作区没有待提交文件；会推送现有本地提交。'});
    const progress=this.contentEl.createEl('p');
    new Setting(this.contentEl).addButton(button=>button.setButtonText(this.plan.files.length?'提交并推送':this.plan.ahead===0?'没有新版本':'推送现有提交').setDisabled(!this.plan.files.length&&this.plan.ahead===0).setCta().onClick(async()=>{
      button.setDisabled(true);progress.textContent=this.plugin.settings.buildBeforePush?'正在构建、提交并推送…':'正在提交并推送…';
      try{
        const result=await this.plugin.pushWebsite(this.plan,this.message);
        if(result.unchanged){progress.textContent='没有新版本可发布。';button.setButtonText('没有新版本');return;}
        progress.textContent='推送成功：'+result.commit.slice(0,7)+'。线上更新还需等待 GitHub Actions 部署完成。';
        button.setButtonText('已推送');
      }catch(error){progress.textContent=error.message;new Notice(error.message,15000);console.error(error);button.setButtonText('关闭后重新预览');}
    })).addButton(button=>button.setButtonText('关闭').onClick(()=>this.close()));
  }
  onClose(){this.contentEl.empty();}
}
class PendingPublication extends Modal {
  constructor(app,plugin,items){super(app);this.plugin=plugin;this.items=items;}
  onOpen(){
    this.contentEl.createEl('h2',{text:'先同步笔记，再发布网站'});
    this.contentEl.createEl('p',{text:'检测到 '+this.items.length+' 篇笔记尚未同步。直接推送网站仓库不会包含这些 Obsidian 修改。'});
    const labels={export:'待导出',import:'待导入',withdraw:'待从网站撤下',conflict:'需要处理版本冲突'};
    for(const item of this.items)new Setting(this.contentEl).setName(item.title).setDesc((labels[item.action]||item.action)+' · '+item.vaultPath);
    new Setting(this.contentEl).addButton(button=>button.setButtonText('先预览同步').setCta().onClick(()=>{this.close();this.plugin.preview();}))
      .addButton(button=>button.setButtonText('关闭').onClick(()=>this.close()));
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
    this.containerEl.createEl('h3',{text:'GitHub 发布'});
    new Setting(this.containerEl).setName('同步后打开推送预览').setDesc('同步成功后展示网站文件改动，点击“提交并推送”才发布。仅导入模式不会打开。').addToggle(toggle=>toggle.setValue(this.plugin.settings.openPushAfterSync).onChange(async value=>{this.plugin.settings.openPushAfterSync=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('推送前构建检查').setDesc('先构建网站；正文过期或构建失败时停止发布。').addToggle(toggle=>toggle.setValue(this.plugin.settings.buildBeforePush).onChange(async value=>{this.plugin.settings.buildBeforePush=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('Git 程序路径').setDesc('使用本机 Git 已有的 SSH 密钥或凭据管理器，不在插件中保存令牌。').addText(text=>text.setValue(this.plugin.settings.gitExecutable).onChange(async value=>{this.plugin.settings.gitExecutable=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('Git 远程名称').setDesc('默认 origin，推送当前所在分支。').addText(text=>text.setValue(this.plugin.settings.gitRemote).onChange(async value=>{this.plugin.settings.gitRemote=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('默认提交说明').addText(text=>text.setValue(this.plugin.settings.commitMessage).onChange(async value=>{this.plugin.settings.commitMessage=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('手动发布网站').setDesc('也可点击左侧上传图标，或运行“预览改动并推送网站到 GitHub”。').addButton(button=>button.setButtonText('预览改动并推送').onClick(()=>this.plugin.previewPush()));
    this.containerEl.createEl('h3',{text:'媒体平台草稿'});
    this.containerEl.createEl('p',{text:'通过 Edge 的“文章同步助手”扩展保存草稿；只发送当前笔记，不依赖网站同步方向或公开属性。登录状态保存在 Edge，不会写入 Obsidian 配置。公开发布请在平台编辑页确认。'});
    const install=this.containerEl.createEl('a',{text:'安装 / 更新文章同步助手',href:'https://wechatsync.com/#install'});install.target='_blank';install.rel='noopener noreferrer';
    new Setting(this.containerEl).setName('Microsoft Edge 程序路径').setDesc('使用平时登录平台的 Edge 个人资料。插件不读取或保存密码、Cookie。').addText(text=>text.setValue(this.plugin.settings.edgeExecutable).onChange(async value=>{this.plugin.settings.edgeExecutable=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('个人网站公开网址').setDesc('将笔记中的公开内部链接转换成完整网址；私有笔记链接仅保留文字。').addText(text=>text.setValue(this.plugin.settings.mediaWebsiteUrl).onChange(async value=>{this.plugin.settings.mediaWebsiteUrl=value;await this.plugin.save();}));
    for(const [type,name]of Object.entries(MEDIA_PLATFORMS))new Setting(this.containerEl).setName('默认选择 '+name).setDesc(type==='xiaohongshu'?'正文上限约 10000 字。':type==='douyin'?'图文正文上限约 8000 字。':'').addToggle(toggle=>toggle.setValue(this.plugin.settings.mediaPlatforms.includes(type)).onChange(async value=>{const selected=new Set(this.plugin.settings.mediaPlatforms);if(value)selected.add(type);else selected.delete(type);if(!selected.size){new Notice('至少保留一个媒体平台。');toggle.setValue(true);return;}this.plugin.settings.mediaPlatforms=[...selected];await this.plugin.save();}));
    new Setting(this.containerEl).setName('保存草稿后打开编辑页').setDesc('Edge 拦截弹出窗口时，点击结果中的“打开编辑页并确认发布”。').addToggle(toggle=>toggle.setValue(this.plugin.settings.mediaAutoOpen).onChange(async value=>{this.plugin.settings.mediaAutoOpen=value;await this.plugin.save();}));
    new Setting(this.containerEl).setName('发送当前笔记').setDesc('也可以点击左侧纸飞机图标，或运行“将当前笔记发送到媒体平台草稿”。小红书正文上限 10000 字，抖音图文正文上限 8000 字。').addButton(button=>button.setButtonText('选择平台并预览').onClick(()=>this.plugin.previewMedia()));
    this.containerEl.createEl('h3',{text:'新文章与笔记属性'});
    this.containerEl.createEl('p',{text:'在新笔记运行 Templater: Open Insert Template modal，选择 website-note；或使用下方按钮给当前笔记补充属性。写好后勾选 publish，设置 domain 和 tags，再预览同步。'});
    new Setting(this.containerEl).setName('当前笔记发布属性').setDesc('只补充缺失字段，不会将草稿自动公开。').addButton(button=>button.setButtonText('补充属性').onClick(()=>this.plugin.prepareCurrentNote()));
    this.containerEl.createEl('p',{text:'最近同步：'+(this.plugin.data.lastSync?new Date(this.plugin.data.lastSync).toLocaleString():'尚未同步')+'。备份位于插件 backups 文件夹。'});
    if(this.plugin.data.lastPush)this.containerEl.createEl('p',{text:'最近推送：'+new Date(this.plugin.data.lastPush.time).toLocaleString()+' · '+this.plugin.data.lastPush.commit.slice(0,7)});
  }
}

},
"./media-content": function(module,exports,require){
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

function socialPost(root,maxImages){
  const source=root.cloneNode(true);
  source.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select,link,meta').forEach(node=>node.remove());
  source.querySelectorAll('.math-inline,.math-display').forEach(node=>node.replaceWith(document.createTextNode('[公式已省略]')));
  const images=[...source.querySelectorAll('img')].slice(0,maxImages).map(image=>image.getAttribute('src')).filter(Boolean);
  source.querySelectorAll('img').forEach(image=>image.remove());
  source.querySelectorAll('pre,table,svg,canvas').forEach(node=>node.replaceWith(document.createTextNode(node.textContent||'')));
  const text=(source.textContent||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  const paragraphs=text.split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>'<p>'+String(line).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</p>');
  const imageMarkup=images.map(src=>'<p><img src="'+String(src).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" alt=""></p>');
  return {content:paragraphs.concat(imageMarkup).join(''),text,images};
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
    const xiaohongshu=socialPost(root,3),douyin=socialPost(root,9);
    const article={title:String(doc.meta.title||file.basename),sourcePath:file.path,fingerprint:core.hash(doc.body),
      posts:{csdn:{title:String(doc.meta.title||file.basename),content:csdn,markdown:markdownBody},zhihu:{title:String(doc.meta.title||file.basename),content:zhihu.innerHTML},xiaohongshu:{title:String(doc.meta.title||file.basename),content:xiaohongshu.content,plainText:xiaohongshu.text,markdown:''},douyin:{title:String(doc.meta.title||file.basename),content:douyin.content,plainText:douyin.text,markdown:''}},
      images:root.querySelectorAll('img').length,formulas:(rendered.html.match(/class="math-(?:inline|display)"/g)||[]).length};
    const limits={xiaohongshu:10000,douyin:8000};
    for(const [platform,limit] of Object.entries(limits)){
      const text=article.posts[platform].plainText||'';
      if([...text].length>limit)throw new Error((platform==='xiaohongshu'?'小红书':'抖音图文')+'正文超过 '+limit+' 字，请拆分笔记后重试。');
    }
    if(Buffer.byteLength(JSON.stringify(article))>40*1024*1024)throw new Error('本次正文和图片超过 40 MB，请拆分笔记或压缩图片。');
    return article;
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
module.exports={prepareArticle,markdown,formulaImage};

},
"./media-page": function(module,exports,require){
'use strict';
const {escapeHtml}=require('./render-utils');

// Runs inside the user's normal Edge profile, where the extension and logins live.
function browserMain(payload){
  const names={csdn:'CSDN',zhihu:'知乎',xiaohongshu:'小红书',douyin:'抖音图文'},status=document.querySelector('#status'),send=document.querySelector('#send'),refresh=document.querySelector('#refresh');
  let accounts=[],busy=false,expired=false,checking=false;
  const saved=new Set(Object.keys(payload.results||{})),inFlight=new Set();
  const text=(id,value)=>{document.querySelector('#'+id).textContent=value;};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const sdk=()=>window.$syncer||window.$poster;
  const safeUrl=(type,value)=>{
    try{const url=new URL(value),hosts={csdn:'editor.csdn.net',zhihu:'zhuanlan.zhihu.com',xiaohongshu:'creator.xiaohongshu.com',douyin:'creator.douyin.com'};return url.protocol==='https:'&&!url.username&&!url.password&&url.hostname===hosts[type]?url.href:null;}catch{return null;}
  };
  // Both old and new SDK callbacks deliver their result as the first argument.
  function call(method,arg,timeout=60000){return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('扩展响应超时，请检查扩展权限与平台登录状态。')),timeout);
    const callback=(first,second)=>{clearTimeout(timer);const result=second===undefined?first:second;if(result?.error)reject(new Error(result.error));else resolve(result);};
    try{if(arg===undefined)sdk()[method](callback);else sdk()[method](arg,callback);}catch(error){clearTimeout(timer);reject(error);}
  });}
  async function check(){
    if(checking||busy||expired)return;checking=true;refresh.disabled=true;send.disabled=true;status.textContent='正在检测扩展和登录状态…';
    try{
      for(let i=0;i<30&&!sdk();i++)await sleep(200);
      if(!sdk()?.getAccounts||!sdk()?.addTask||!sdk()?.uploadImage)throw new Error('未检测到兼容的“文章同步助手”。请在当前 Edge 个人资料中安装扩展，并允许它访问此本机网页，然后刷新页面。');
      const response=await call('getAccounts');accounts=Array.isArray(response)?response:response?.accounts||[];
      for(const type of Object.keys(names)){
        const account=accounts.find(a=>a.type===type),input=document.querySelector('#'+type);
        input.disabled=!account||saved.has(type)||inFlight.has(type);
        text(type+'-account',account?'已登录：'+account.title:'未登录，请先在同一 Edge 个人资料中登录');
      }
      status.textContent='已完成检测。勾选平台后，点击“生成所选平台草稿”。';send.disabled=!accounts.some(a=>names[a.type]);
    }catch(error){status.textContent=error.message;}
    finally{checking=false;refresh.disabled=false;}
  }
  async function uploadImages(post,account){
    const copy={...post},tree=document.createElement('div');tree.innerHTML=copy.content;
    const htmlSources=[...tree.querySelectorAll('img')].map(img=>img.getAttribute('src')).filter(Boolean);
    const markdownSources=copy.markdown?[...copy.markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match=>match[1]):[];
    const sources=[...new Set([...htmlSources,...markdownSources])];
    for(let i=0;i<sources.length;i++){
      const source=sources[i];text(account.type+'-progress','上传图片 '+(i+1)+' / '+sources.length);
      const result=await call('uploadImage',{src:source,account},120000),url=result?.result?.url||result?.url;
      if(!/^https:\/\//i.test(url||''))throw new Error('图片上传没有返回有效地址，已停止创建草稿。');
      for(const image of tree.querySelectorAll('img'))if(image.getAttribute('src')===source)image.setAttribute('src',url);
      if(copy.markdown)copy.markdown=copy.markdown.split(source).join(url);
    }
    copy.content=tree.innerHTML;return copy;
  }
  function createDraft(post,account){return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('草稿保存超时；平台可能已收到内容。请先到草稿箱检查，再决定是否重试。')),240000);
    const handler=task=>{
      const item=task?.accounts?.find(a=>a.type===account.type);if(!item)return;
      text(account.type+'-progress',item.msg||'正在保存草稿…');
      if(item.status==='failed'){clearTimeout(timer);reject(new Error(item.error||'平台保存失败，请检查登录或验证要求。'));}
      if(item.status==='done'){
        clearTimeout(timer);const url=safeUrl(account.type,item.editResp?.draftLink);
        if(url)resolve(url);else reject(new Error('扩展报告完成，但没有返回可信的编辑页链接。请先检查平台草稿箱。'));
      }
    };
    try{sdk().addTask({post,accounts:[account]},handler,error=>{if(error?.error){clearTimeout(timer);reject(new Error(error.error));}});}catch(error){clearTimeout(timer);reject(error);}
  });}
  send.addEventListener('click',async()=>{
    if(busy||expired)return;
    const selected=Object.keys(names).filter(type=>document.querySelector('#'+type).checked&&!saved.has(type)&&!inFlight.has(type));
    if(!selected.length){status.textContent='请至少选择一个已登录的平台。';return;}
    busy=true;send.disabled=true;refresh.disabled=true;
    document.querySelectorAll('input[type=checkbox]').forEach(input=>input.disabled=true);
    let successes=0;
    for(const type of selected){
      const account=accounts.find(a=>a.type===type);if(!account)continue;
      try{
        status.textContent='正在生成 '+names[type]+' 草稿，请保持本页打开…';
        const post=await uploadImages(payload.article.posts[type],account);
        inFlight.add(type);
        const url=await createDraft(post,account);saved.add(type);inFlight.delete(type);successes++;
        const result=document.querySelector('#'+type+'-result');result.replaceChildren();
        const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='打开编辑页并确认发布';result.append(link);
        text(type+'-progress','草稿已保存，尚未公开发布');
        try{
          const response=await fetch('result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:type,url})});
          if(!response.ok)throw new Error('记录失败');
        }catch{result.append(document.createTextNode('（Obsidian 记录未保存，请保留此链接）'));}
        if(payload.autoOpen)window.open(url,'_blank','noopener,noreferrer');
      }catch(error){text(type+'-progress',error.message);}
    }
    busy=false;refresh.disabled=false;
    for(const type of Object.keys(names)){const input=document.querySelector('#'+type);input.disabled=saved.has(type)||inFlight.has(type)||!accounts.some(a=>a.type===type);if(saved.has(type)||inFlight.has(type))input.checked=false;}
    send.disabled=false;
    status.textContent='本次完成 '+successes+' 个草稿。请在各平台编辑页检查图片、公式和正文后确认发布。'+(inFlight.size?' 有平台结果不明确：先检查草稿箱；此页已阻止重复发送。':'');
  });
  refresh.addEventListener('click',check);
  document.querySelector('#article-title').textContent=payload.article.title;
  // Content was sanitized in Obsidian; it remains local until the user clicks send.
  document.querySelector('#preview').innerHTML=payload.article.posts.zhihu.content;
  for(const type of Object.keys(names)){
    document.querySelector('#'+type).checked=payload.platforms.includes(type)&&!saved.has(type);
    const url=safeUrl(type,payload.results?.[type]);
    if(url){
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='打开编辑页并确认发布';document.querySelector('#'+type+'-result').append(link);
      text(type+'-progress','草稿已保存，尚未公开发布');
    }
  }
  check();
  setTimeout(()=>{
    expired=true;send.disabled=true;refresh.disabled=true;
    status.textContent='本次发送窗口已过期，请从 Obsidian 重新打开。已有的草稿链接仍可使用。';
    payload.article.posts={};document.querySelector('#preview').replaceChildren();
  },payload.ttl);
}

function page(payload,nonce){
  const names={csdn:'CSDN',zhihu:'知乎',xiaohongshu:'小红书',douyin:'抖音图文'};
  const json=JSON.stringify(payload).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>发送笔记草稿</title>
  <style>body{margin:0;background:#f4f6fa;color:#202c3c;font:16px/1.65 system-ui,"Microsoft YaHei",sans-serif}main{max-width:960px;margin:32px auto;padding:28px;background:white;border:1px solid #dce3ec;border-radius:16px}h1{font-size:26px;margin:0 0 8px}h2{font-size:21px}p{margin:8px 0 16px}.hint{color:#536174}.platform{padding:16px;border:1px solid #dce3ec;border-radius:10px;margin:12px 0}.platform label{font-size:18px;font-weight:600}.account,.progress{display:block;margin-top:6px;overflow-wrap:anywhere}.account{color:#536174;font-size:14px}button{padding:11px 18px;font:inherit;border:1px solid #b9c9e4;border-radius:8px;cursor:pointer;background:#eff4fc;color:#173a75;margin:8px 8px 8px 0}button.primary{background:#245dc1;color:white}button:disabled{opacity:.55;cursor:default}a{color:#1852ad}#status{padding:14px;background:#edf3fc;border-radius:8px}#preview{padding:20px;border:1px solid #dce3ec;overflow-wrap:anywhere}#preview img{max-width:100%;height:auto;vertical-align:middle}#preview pre{overflow:auto;background:#f3f5f8;padding:14px}#preview table{border-collapse:collapse}#preview td,#preview th{border:1px solid #ccd4df;padding:6px 10px}@media(max-width:640px){main{margin:0;padding:18px;border-radius:0}}</style>
  <main><h1>发送笔记草稿</h1><p class="hint">使用当前 Edge 个人资料的登录状态。仅发送标题、正文和图片；网站分类与笔记属性不会发送。最终公开发布由你在平台确认。</p>
  <p><a href="https://wechatsync.com/#install" target="_blank" rel="noopener noreferrer">安装 / 更新文章同步助手</a> · <a href="https://editor.csdn.net/md/" target="_blank" rel="noopener noreferrer">登录 CSDN</a> · <a href="https://www.zhihu.com/" target="_blank" rel="noopener noreferrer">登录知乎</a> · <a href="https://creator.xiaohongshu.com/" target="_blank" rel="noopener noreferrer">登录小红书</a> · <a href="https://creator.douyin.com/" target="_blank" rel="noopener noreferrer">登录抖音</a></p>
  <div id="status" role="status" aria-live="polite">正在准备…</div>
  ${Object.entries(names).map(([type,name])=>`<div class="platform"><label><input type="checkbox" id="${type}" disabled> ${name}</label><span id="${type}-account" class="account"></span><span id="${type}-progress" class="progress" aria-live="polite"></span><div id="${type}-result"></div></div>`).join('')}
  <button id="refresh">重新检测登录</button><button id="send" class="primary" disabled>生成所选平台草稿</button>
  <p class="hint">图片会逐张上传，失败时停止该平台的草稿创建。每次发送会新建草稿；结果超时请先检查草稿箱。CSDN 保留 LaTeX，知乎公式以图片显示；小红书和抖音图文只发送纯文本与图片，Markdown、代码块和公式会被移除。平台排版以编辑页为准。</p>
  <h2 id="article-title">${escapeHtml(payload.article.title)}</h2><details open><summary>发送内容预览（本机）</summary><article id="preview"></article></details></main>
  <script nonce="${nonce}">(${browserMain.toString()})(${json});</script></html>`;
}
module.exports={page,browserMain};

},
"./media-publisher": function(module,exports,require){
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const {spawn}=require('child_process');
const {page}=require('./media-page');
const TTL=60*60*1000;
function defaultEdge(){
  return [process.env['PROGRAMFILES(X86)'],process.env.PROGRAMFILES,process.env.LOCALAPPDATA].filter(Boolean).map(base=>path.join(base,'Microsoft','Edge','Application','msedge.exe')).find(file=>fs.existsSync(file))||'';
}
function openEdge(executable,url){
  if(!executable||!fs.existsSync(executable))throw new Error('未找到 Microsoft Edge，请在插件设置中填写 Edge 程序路径。');
  return new Promise((resolve,reject)=>{
    const child=spawn(executable,[url],{detached:true,stdio:'ignore',windowsHide:true});
    child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
  });
}
function draftUrl(platform,value){
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(({csdn:'editor.csdn.net',zhihu:'zhuanlan.zhihu.com',xiaohongshu:'creator.xiaohongshu.com',douyin:'creator.douyin.com'}[platform]===url.hostname))?url.href:null;}catch{return null;}
}
class MediaBridge{
  constructor(onResult){this.sessions=new Map();this.onResult=onResult;}
  async start(){
    if(this.server)return;
    const server=http.createServer((req,res)=>this.handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end('Local handoff failed');}));
    server.requestTimeout=15000;server.headersTimeout=10000;
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    this.server=server;this.origin='http://127.0.0.1:'+server.address().port;
    this.timer=setInterval(()=>{for(const [token,s]of this.sessions)if(s.expires<Date.now())this.sessions.delete(token);},60000);this.timer.unref?.();
  }
  async create(article,settings){
    await this.start();
    if(this.sessions.size>=8)throw new Error('已有多个发送窗口，请关闭后重新启用插件再试。');
    const token=crypto.randomBytes(24).toString('hex');
    this.sessions.set(token,{article,platforms:['csdn','zhihu','xiaohongshu','douyin'].filter(type=>settings.mediaPlatforms?.includes(type)),autoOpen:settings.mediaAutoOpen!==false,expires:Date.now()+TTL,results:{}});
    return this.origin+'/'+token+'/';
  }
  async handle(req,res){
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
    if(req.headers.host!==new URL(this.origin).host){res.writeHead(403);res.end();return;}
    const match=/^\/([a-f0-9]{48})\/(result)?$/.exec(req.url),session=match&&this.sessions.get(match[1]);
    if(!session||session.expires<Date.now()){res.writeHead(410);res.end('Session expired. Open it again from Obsidian.');return;}
    if(req.method==='GET'&&!match[2]){
      const nonce=crypto.randomBytes(16).toString('base64');
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}' chrome-extension:; style-src 'unsafe-inline'; img-src data: https:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
      res.end(page({article:session.article,platforms:session.platforms,autoOpen:session.autoOpen,results:session.results,ttl:session.expires-Date.now()},nonce));return;
    }
    if(req.method==='POST'&&match[2]&&req.headers.origin===this.origin&&req.headers['content-type']==='application/json'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>8192){res.writeHead(413);res.end();return;}}
      let result;try{result=JSON.parse(body);}catch{res.writeHead(400);res.end();return;}
      const url=draftUrl(result.platform,result.url);if(!url){res.writeHead(400);res.end();return;}
      if(!session.results[result.platform]){
        await this.onResult({sourcePath:session.article.sourcePath,title:session.article.title,fingerprint:session.article.fingerprint,platform:result.platform,url,time:new Date().toISOString()});
        session.results[result.platform]=url;
      }
      res.writeHead(200,{'Content-Type':'application/json'});res.end('{"saved":true}');return;
    }
    res.writeHead(403);res.end();
  }
  close(){clearInterval(this.timer);this.sessions.clear();this.server?.close();this.server?.closeAllConnections();this.server=null;}
}
module.exports={MediaBridge,defaultEdge,openEdge,draftUrl};

},
};
const cache={};
function load(name){if(!modules[name])return nativeRequire(name);if(!cache[name]){const part={exports:{}};cache[name]=part;modules[name](part,part.exports,load);}return cache[name].exports;}
module.exports=load('./main');
