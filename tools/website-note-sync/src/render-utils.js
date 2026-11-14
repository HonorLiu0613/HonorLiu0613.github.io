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
