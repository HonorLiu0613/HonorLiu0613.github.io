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
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(platform==='csdn'?url.hostname==='editor.csdn.net':platform==='zhihu'&&url.hostname==='zhuanlan.zhihu.com')?url.href:null;}catch{return null;}
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
    this.sessions.set(token,{article,platforms:['csdn','zhihu'].filter(type=>settings.mediaPlatforms?.includes(type)),autoOpen:settings.mediaAutoOpen!==false,expires:Date.now()+TTL,results:{}});
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
