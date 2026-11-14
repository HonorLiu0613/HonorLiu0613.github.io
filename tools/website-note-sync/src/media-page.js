'use strict';
const {escapeHtml}=require('./render-utils');

// Runs inside the user's normal Edge profile, where the extension and logins live.
function browserMain(payload){
  const names={csdn:'CSDN',zhihu:'知乎'},status=document.querySelector('#status'),send=document.querySelector('#send'),refresh=document.querySelector('#refresh');
  let accounts=[],busy=false,expired=false,checking=false;
  const saved=new Set(Object.keys(payload.results||{})),inFlight=new Set();
  const text=(id,value)=>{document.querySelector('#'+id).textContent=value;};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const sdk=()=>window.$syncer||window.$poster;
  const safeUrl=(type,value)=>{
    try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(type==='csdn'?url.hostname==='editor.csdn.net':url.hostname==='zhuanlan.zhihu.com')?url.href:null;}catch{return null;}
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
    const sources=[...new Set([...tree.querySelectorAll('img')].map(img=>img.getAttribute('src')).filter(Boolean))];
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
  const json=JSON.stringify(payload).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>发送笔记草稿</title>
  <style>body{margin:0;background:#f4f6fa;color:#202c3c;font:16px/1.65 system-ui,"Microsoft YaHei",sans-serif}main{max-width:960px;margin:32px auto;padding:28px;background:white;border:1px solid #dce3ec;border-radius:16px}h1{font-size:26px;margin:0 0 8px}h2{font-size:21px}p{margin:8px 0 16px}.hint{color:#536174}.platform{padding:16px;border:1px solid #dce3ec;border-radius:10px;margin:12px 0}.platform label{font-size:18px;font-weight:600}.account,.progress{display:block;margin-top:6px;overflow-wrap:anywhere}.account{color:#536174;font-size:14px}button{padding:11px 18px;font:inherit;border:1px solid #b9c9e4;border-radius:8px;cursor:pointer;background:#eff4fc;color:#173a75;margin:8px 8px 8px 0}button.primary{background:#245dc1;color:white}button:disabled{opacity:.55;cursor:default}a{color:#1852ad}#status{padding:14px;background:#edf3fc;border-radius:8px}#preview{padding:20px;border:1px solid #dce3ec;overflow-wrap:anywhere}#preview img{max-width:100%;height:auto;vertical-align:middle}#preview pre{overflow:auto;background:#f3f5f8;padding:14px}#preview table{border-collapse:collapse}#preview td,#preview th{border:1px solid #ccd4df;padding:6px 10px}@media(max-width:640px){main{margin:0;padding:18px;border-radius:0}}</style>
  <main><h1>发送笔记草稿</h1><p class="hint">使用当前 Edge 个人资料的登录状态。仅发送标题、正文和图片；网站分类与笔记属性不会发送。最终公开发布由你在平台确认。</p>
  <p><a href="https://wechatsync.com/#install" target="_blank" rel="noopener noreferrer">安装 / 更新文章同步助手</a> · <a href="https://editor.csdn.net/md/" target="_blank" rel="noopener noreferrer">登录 CSDN</a> · <a href="https://www.zhihu.com/" target="_blank" rel="noopener noreferrer">登录知乎</a></p>
  <div id="status" role="status" aria-live="polite">正在准备…</div>
  ${['csdn','zhihu'].map(type=>`<div class="platform"><label><input type="checkbox" id="${type}" disabled> ${type==='csdn'?'CSDN':'知乎'}</label><span id="${type}-account" class="account"></span><span id="${type}-progress" class="progress" aria-live="polite"></span><div id="${type}-result"></div></div>`).join('')}
  <button id="refresh">重新检测登录</button><button id="send" class="primary" disabled>生成所选平台草稿</button>
  <p class="hint">图片会逐张上传，失败时停止该平台的草稿创建。每次发送会新建草稿；结果超时请先检查草稿箱。CSDN 保留 LaTeX，知乎公式以图片显示。平台排版以编辑页为准。</p>
  <h2 id="article-title">${escapeHtml(payload.article.title)}</h2><details open><summary>发送内容预览（本机）</summary><article id="preview"></article></details></main>
  <script nonce="${nonce}">(${browserMain.toString()})(${json});</script></html>`;
}
module.exports={page,browserMain};
