// SPDX-License-Identifier: GPL-3.0-or-later · Copyright (C) 2026 Пантелеев Г.Д.
/* Общие данные и функции для рисования шпаргалок.
   Q — банк вопросов (заполняется файлами data/questions/*.js),
   C — шпаргалки (data/cards.js). */
const Q = [];
const C = {};

/* ---------- хелперы для шпаргалок ---------- */
function card(title){ return {title:title, html:[].slice.call(arguments,1).join("")}; }
function tbl(head, rows){
  let h='<div class="tw"><table class="ct"><thead><tr>'+head.map(x=>'<th>'+x+'</th>').join("")+'</tr></thead><tbody>';
  rows.forEach(r=>{ h+='<tr>'+r.map(x=>'<td>'+x+'</td>').join("")+'</tr>'; });
  return h+'</tbody></table></div>';
}
function chain(items){
  return '<div class="chain">'+items.map((it,i)=>(i?'<span class="arr">→</span>':'')+'<div class="node"><b>'+it[0]+'</b>'+(it[1]?'<span>'+it[1]+'</span>':'')+'</div>').join("")+'</div>';
}
function bits(fields, hl){
  return '<div class="bits">'+fields.map(f=>'<div class="'+(hl&&f[0]==="Тег"?'hl':'')+'" style="flex:'+f[1]+' 1 0"><b title="'+f[0]+'">'+f[0]+'</b>'+(f[2]?'<span>'+f[2]+'</span>':'')+'</div>').join("")+'</div>';
}
function note(t){ return '<p class="cn">'+t+'</p>'; }
function seq(L, R, msgs){
  const W=560, xl=80, xr=480, top=46, step=46, H=top+msgs.length*step+10;
  let s='<div class="tw"><svg class="seq" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Диаграмма обмена '+L+' и '+R+'">';
  s+='<rect x="'+(xl-72)+'" y="4" width="144" height="26" rx="6"/><text x="'+xl+'" y="22" text-anchor="middle" font-size="13" font-weight="600">'+L+'</text>';
  s+='<rect x="'+(xr-72)+'" y="4" width="144" height="26" rx="6"/><text x="'+xr+'" y="22" text-anchor="middle" font-size="13" font-weight="600">'+R+'</text>';
  s+='<line class="life" x1="'+xl+'" y1="30" x2="'+xl+'" y2="'+H+'"/><line class="life" x1="'+xr+'" y1="30" x2="'+xr+'" y2="'+H+'"/>';
  msgs.forEach((m,i)=>{
    const y=top+i*step+16, a=m[0]===">"?xl:xr, b=m[0]===">"?xr:xl, d=m[0]===">"?-1:1;
    s+='<line class="m" x1="'+a+'" y1="'+y+'" x2="'+(b+d*8)+'" y2="'+y+'"/>';
    s+='<polygon points="'+b+','+y+' '+(b+d*9)+','+(y-5)+' '+(b+d*9)+','+(y+5)+'"/>';
    s+='<text x="'+(W/2)+'" y="'+(y-6)+'" text-anchor="middle" font-size="13" font-weight="600">'+m[1]+'</text>';
    if(m[2]) s+='<text class="s" x="'+(W/2)+'" y="'+(y+15)+'" text-anchor="middle">'+m[2]+'</text>';
  });
  return s+'</svg></div>';
}
