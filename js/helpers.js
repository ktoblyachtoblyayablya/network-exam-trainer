// SPDX-License-Identifier: GPL-3.0-or-later · Copyright (C) 2026 Пантелеев Г.Д.
/* Общие данные и функции движка. Файл одинаковый во всех тренажёрах;
   всё, что относится к конкретному курсу, лежит в data/course.js (объект COURSE).
   Q — банк вопросов (data/questions/*.js), A — ответы-билеты (data/answers/*.js),
   C — шпаргалки (data/cards.js), FC — подписи к картинкам (data/figs.js). */
const Q = [];
const A = {};
const C = {};
const FC = {};

/* ---------- картинки ---------- */
function IMGSRC(k){ return COURSE.img(k); }
function figSource(k){ return COURSE.figSource ? COURSE.figSource(k) : ""; }
function figCap(k, cap){ const c=cap||FC[k]||"", s=figSource(k); return c&&s?c+" · "+s:(c||s); }
/* F — картинка внутри текста билета */
function F(k, cap){
  return '<figure class="fig"><img src="'+IMGSRC(k)+'" alt="'+(cap||FC[k]||k).replace(/"/g,"&quot;")+'" loading="lazy" data-z="1" onerror="this.closest(\'figure\').hidden=true"><figcaption>'+figCap(k,cap)+'</figcaption></figure>';
}
/* F2 — две картинки рядом */
function F2(a, ca, b, cb){ return '<div class="fig2">'+F(a,ca)+F(b,cb)+'</div>'; }
/* GAL — сетка небольших картинок */
function GAL(keys){ return '<div class="gal">'+keys.map(k=>F(k)).join("")+'</div>'; }
/* CARD — шпаргалка внутри билета */
function CARD(k){ const c=C[k]; return c?'<div class="cardx" data-card="'+k+'"><h3>'+c.title+'</h3>'+c.html+'</div>':''; }
/* L — ссылка на другой билет */
function L(id, text){ return '<a class="tlink" href="#'+id+'" data-t="'+id+'">'+(text||tlabel(id))+'</a>'; }
/* tlabel — короткая подпись темы: «№ 5», «Лаба 3», «Билет 12» */
function tlabel(id){ return COURSE.tlabel(id); }
/* H — подзаголовок внутри билета, N — заметка «на экзамене / на защите» */
function H(t){ return '<h4>'+t+'</h4>'; }
function N(t){ return '<p class="tip">'+t+'</p>'; }
function UL(items){ return '<ul>'+items.map(x=>'<li>'+x+'</li>').join("")+'</ul>'; }
function OL(items){ return '<ol>'+items.map(x=>'<li>'+x+'</li>').join("")+'</ol>'; }
/* CODE — листинг; спецсимволы HTML экранируются, поэтому в листинги можно писать <, >, & как есть. */
function esc(t){ return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function CODE(t){ return '<pre class="code">'+esc(t)+'</pre>'; }
/* K — код, команда или имя файла в тексте */
function K(t){ return '<code>'+esc(t)+'</code>'; }
/* FX — формула отдельной строкой (HTML: <sub>, <sup>, &omega; и т. п.) */
function FX(t){ return '<p class="fx">'+t+'</p>'; }

/* ---------- сверка введённого ответа ----------
   Правила задаются в COURSE.input (все поля необязательные):
     prompt — регулярка приглашения, которое срезается в начале (>>, $, #);
     sudo   — не учитывать префикс sudo;
     quotes — не различать ' и ";
     times  — × и · считать за *;
     lists  — в [ ] запятые и пробелы между элементами равнозначны;
     flags  — порядок букв в слитных ключах не важен (ss -tulnp = ss -lntup);
     seps   — знаки, вокруг которых не учитываются пробелы;
     numbers, units, pow, bytes — сравнивать числа по значению (допуск 0,5 %),
       units — регулярка единиц в конце, pow — степени (2^20), bytes — КиБ/МиБ/… ещё и в байтах.
   Регистр важен, если у вопроса нет флага ci. Точка с запятой в конце не учитывается. */
const INP = Object.assign({prompt:null, sudo:false, quotes:false, times:false, lists:false, flags:false,
  seps:"=,;:(){}[]+*/^<>|&~-", numbers:false, units:null, pow:false, bytes:false}, (typeof COURSE!=="undefined"&&COURSE.input)||{});
const SEPRE = new RegExp("\\s*(["+INP.seps.replace(/[\]\\^-]/g,"\\$&")+"])\\s*","g");
function norm(s, ci){
  s=String(s)
    .replace(/[‘’‚‛′`]/g,"'")
    .replace(/[“”„«»]/g,'"')
    .replace(/[–—−]/g,"-");
  if(INP.times) s=s.replace(/[×·]/g,"*");
  s=s.replace(/\u00a0/g," ").trim();
  if(INP.prompt) s=s.replace(INP.prompt,"");
  if(INP.sudo) s=s.replace(/^sudo\s+/,"");
  if(INP.quotes) s=s.replace(/'/g,'"');
  if(INP.lists) s=s.replace(/\[([^\]]*)\]/g,(m,x)=>"["+x.replace(/,/g," ").replace(/\s+/g," ").trim()+"]");
  s=s.replace(/\s+/g," ");
  if(INP.flags) s=s.split(" ").map(w=>/^-[A-Za-z]{2,}$/.test(w)?"-"+w.slice(1).split("").sort().join(""):w).join(" ");
  if(INP.seps) s=s.replace(SEPRE,"$1");
  if(INP.lists) s=s.replace(/\[\s+/g,"[").replace(/\s+\]/g,"]");
  s=s.replace(/;+$/,"");
  return ci ? s.toLowerCase() : s;
}
/* Множители для объёмов памяти: «2 КиБ» сравнивается и как 2, и как 2048 байт. */
const BYTEMUL={"киб":[1024],"kib":[1024],"миб":[1048576],"mib":[1048576],"гиб":[1073741824],"gib":[1073741824],
  "кб":[1e3,1024],"kb":[1e3,1024],"мб":[1e6,1048576],"mb":[1e6,1048576],"гб":[1e9,1073741824],"gb":[1e9,1073741824]};
function parseNum(t){
  if(/^[-+]?\d+,\d+$/.test(t)) t=t.replace(",",".");
  if(/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return parseFloat(t);
  let m=t.match(/^([-+]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if(m&&+m[2]) return parseFloat(m[1])/parseFloat(m[2]);
  if(!INP.pow) return null;
  m=t.match(/^(\d+)\^(\d+)$/);
  if(m) return Math.pow(+m[1], +m[2]);
  m=t.match(/^(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)\^(\d+)$/);
  if(m) return parseFloat(m[1])*Math.pow(+m[2], +m[3]);
  return null;
}
/* Все числовые прочтения ответа: число без единиц и, для КиБ/МиБ/…, то же в байтах. */
function toNums(s){
  if(!INP.numbers) return [];
  const t=String(s).trim().replace(/[–—−]/g,"-").replace(/\s+/g,"").replace(/^≈/,"");
  const u=INP.units?t.match(INP.units):null, unit=u?u[0].toLowerCase():"";
  const x=parseNum(u?t.slice(0,t.length-u[0].length):t);
  if(x===null) return [];
  return [x].concat(INP.bytes?(BYTEMUL[unit]||[]).map(k=>x*k):[]);
}
function toNum(s){ const v=toNums(s); return v.length?v[0]:null; }
function checkInput(q, val){
  const v=norm(val,q.ci); if(!v) return false;
  const xs=toNums(val);
  return q.a.some(x=>{
    if(norm(x,q.ci)===v) return true;
    const ys=toNums(x);
    return xs.some(a=>ys.some(b=>Math.abs(a-b)<=Math.max(1e-9,Math.abs(b)*0.005)));
  });
}

/* ---------- хелперы для шпаргалок ---------- */
function card(title){ return {title:title, html:[].slice.call(arguments,1).join("")}; }
function tbl(head, rows){
  let h='<div class="tw"><table class="ct"><thead><tr>'+head.map(x=>'<th>'+x+'</th>').join("")+'</tr></thead><tbody>';
  rows.forEach(r=>{ h+='<tr>'+r.map(x=>'<td>'+x+'</td>').join("")+'</tr>'; });
  return h+'</tbody></table></div>';
}
/* chain — цепочка шагов [[заголовок, подпись], …] */
function chain(items){
  return '<div class="chain">'+items.map((it,i)=>(i?'<span class="arr">→</span>':'')+'<div class="node"><b>'+it[0]+'</b>'+(it[1]?'<span>'+it[1]+'</span>':'')+'</div>').join("")+'</div>';
}
/* bits — поля заголовка [[имя, ширина, подпись], …]; hl — имена полей, которые подсветить */
function bits(fields, hl){
  return '<div class="bits">'+fields.map(f=>'<div class="'+(hl&&hl.indexOf(f[0])>=0?'hl':'')+'" style="flex:'+f[1]+' 1 0"><b title="'+f[0]+'">'+f[0]+'</b>'+(f[2]?'<span>'+f[2]+'</span>':'')+'</div>').join("")+'</div>';
}
function note(t){ return '<p class="cn">'+t+'</p>'; }
/* seq — диаграмма обмена двух сторон; msgs: [[">" или "<", подпись, пояснение], …] */
function seq(L_, R_, msgs){
  const W=560, xl=80, xr=480, top=46, step=46, Hh=top+msgs.length*step+10;
  let s='<div class="tw"><svg class="seq" viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="Диаграмма обмена '+L_+' и '+R_+'">';
  s+='<rect x="'+(xl-72)+'" y="4" width="144" height="26" rx="6"/><text x="'+xl+'" y="22" text-anchor="middle" font-size="13" font-weight="600">'+L_+'</text>';
  s+='<rect x="'+(xr-72)+'" y="4" width="144" height="26" rx="6"/><text x="'+xr+'" y="22" text-anchor="middle" font-size="13" font-weight="600">'+R_+'</text>';
  s+='<line class="life" x1="'+xl+'" y1="30" x2="'+xl+'" y2="'+Hh+'"/><line class="life" x1="'+xr+'" y1="30" x2="'+xr+'" y2="'+Hh+'"/>';
  msgs.forEach((m,i)=>{
    const y=top+i*step+16, a=m[0]===">"?xl:xr, b=m[0]===">"?xr:xl, d=m[0]===">"?-1:1;
    s+='<line class="m" x1="'+a+'" y1="'+y+'" x2="'+(b+d*8)+'" y2="'+y+'"/>';
    s+='<polygon points="'+b+','+y+' '+(b+d*9)+','+(y-5)+' '+(b+d*9)+','+(y+5)+'"/>';
    s+='<text x="'+(W/2)+'" y="'+(y-6)+'" text-anchor="middle" font-size="13" font-weight="600">'+m[1]+'</text>';
    if(m[2]) s+='<text class="s" x="'+(W/2)+'" y="'+(y+15)+'" text-anchor="middle">'+m[2]+'</text>';
  });
  return s+'</svg></div>';
}
