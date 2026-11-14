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
