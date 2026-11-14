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
