// SPDX-License-Identifier: GPL-3.0-or-later · Copyright (C) 2026 Пантелеев Г.Д.
/* Логика тренажёра: колода вопросов, ответы, статистика, вкладка схем. */
Q.forEach((q,i)=>{ q.i=i; });
(function(){ const cnt={}; Q.forEach(q=>{ cnt[q.t]=(cnt[q.t]||0)+1; q.id=q.t+"-"+cnt[q.t]; }); })();
const IMG=k=>"img/slides/"+k+".png";

/* ---------- хранение ---------- */
const KEY="netquiz-v1";
let store={st:{},sel:null,rand:false};
try{ const raw=localStorage.getItem(KEY); if(raw) store=Object.assign(store,JSON.parse(raw)); }catch(e){}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(store)); }catch(e){} }
let sel=new Set(store.sel&&store.sel.length?store.sel:Object.keys(TK).map(Number));
let rand=!!store.rand;

/* ---------- состояние прохода ---------- */
let deck=[], pos=0, right=0, wrong=0, answered=false, mode="all", order=[];
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function build(m){
  mode=m||"all";
  let list=Q.filter(q=>sel.has(q.t));
  if(mode==="wrong") list=list.filter(q=>store.st[q.id]&&store.st[q.id].last===0);
  deck=list.map(q=>q.i); if(rand) shuffle(deck);
  pos=0; right=0; wrong=0; render();
}
const $=id=>document.getElementById(id);

function chips(){
  const box=$("chips"); box.innerHTML="";
  const all=document.createElement("button"); all.className="chip"; all.textContent="Все";
  all.setAttribute("aria-pressed", sel.size===21?"true":"false");
  all.onclick=()=>{ sel=new Set(Object.keys(TK).map(Number)); persistSel(); };
  box.appendChild(all);
  for(let t=1;t<=21;t++){
    const qs=Q.filter(q=>q.t===t), st=qs.map(q=>store.st[q.id]);
    const anyBad=st.some(s=>s&&s.last===0), allOk=st.every(s=>s&&s.last===1);
    const b=document.createElement("button"); b.className="chip"; b.setAttribute("aria-pressed",sel.has(t)?"true":"false");
    b.title=TK[t].join(" · ")+" — "+qs.length+" вопр.";
    b.innerHTML='<span class="dot '+(anyBad?'bad':allOk?'ok':'')+'"></span>'+t;
    b.onclick=()=>{ if(sel.size===21){ sel=new Set([t]); } else if(sel.has(t)){ sel.delete(t); if(!sel.size) sel=new Set(Object.keys(TK).map(Number)); } else sel.add(t); persistSel(); };
    box.appendChild(b);
  }
  const nw=Q.filter(q=>sel.has(q.t)&&store.st[q.id]&&store.st[q.id].last===0).length;
  $("b-wrong").textContent="Повторить ошибки ("+nw+")"; $("b-wrong").disabled=!nw;
  $("b-order").setAttribute("aria-pressed",rand?"true":"false");
}
function persistSel(){ store.sel=[...sel]; save(); chips(); build("all"); }

function fig(k, cap){
  return '<figure class="fig"><img src="'+IMG(k)+'" alt="Слайд лекции '+k+'" loading="lazy" data-z="1" onerror="this.closest(\'figure\').hidden=true"><figcaption>'+(cap||"Слайд из лекции")+' · '+k.replace("_p"," · слайд ")+'</figcaption></figure>';
}
function cardHtml(key, tag){
  const c=C[key]; if(!c) return "";
  return '<div class="cardx">'+(tag?'<div class="tag">'+tag+'</div>':'')+'<h3>'+c.title+'</h3>'+c.html+'</div>';
}

function render(){
  chips();
  const n=deck.length, done=right+wrong;
  $("s-pos").innerHTML=n?(pos<n?'Вопрос <b>'+(pos+1)+'</b> из '+n:'Пройдено <b>'+n+'</b> из '+n)+(mode==="wrong"?' · работа над ошибками':''):'';
  $("s-score").innerHTML=done?'Верно <b>'+right+'</b> · ошибок <b>'+wrong+'</b>':'';
  const bar=$("bar").children; bar[0].style.width=(n?right/n*100:0)+"%"; bar[1].style.width=(n?wrong/n*100:0)+"%";
  const stage=$("stage");
  if(!n){ stage.innerHTML='<div class="box">В выбранных билетах нет вопросов для повтора. Выберите другие билеты или начните заново.</div>'; return; }
  if(pos>=n){ finish(); return; }
  const q=Q[deck[pos]]; answered=false;
  order=shuffle(q.o.map((_,i)=>i));
  let h='<article class="qcard"><div class="tkt"><span class="n">Билет '+q.t+'</span><span class="t">'+TK[q.t].join(" · ")+'</span></div>';
  h+='<p class="q">'+q.q+'</p>';
  if(q.f&&q.fb) h+=fig(q.f,"Схема к вопросу");
  h+='<div class="opts">'+order.map((oi,k)=>'<button class="opt" data-k="'+k+'"><span class="k">'+(k+1)+'</span><span>'+q.o[oi]+'</span></button>').join("")+'</div>';
  h+='<div id="fbk"></div></article>';
  stage.innerHTML=h;
  stage.querySelectorAll(".opt").forEach(b=>b.onclick=()=>answer(+b.dataset.k));
}
function answer(k){
  if(answered) return; answered=true;
  const q=Q[deck[pos]], ok=order[k]===0;
  if(ok) right++; else wrong++;
  const s=store.st[q.id]||{r:0,w:0}; if(ok) s.r++; else s.w++; s.last=ok?1:0; store.st[q.id]=s; save();
  document.querySelectorAll(".opt").forEach((b,i)=>{ b.disabled=true; if(order[i]===0) b.classList.add("right"); else if(i===k) b.classList.add("wrong"); else b.classList.add("dim"); });
  let h='<div class="fb"><div class="verdict '+(ok?'ok':'bad')+'">'+(ok?'Верно.':'Неверно. Правильный ответ: '+q.o[0])+'</div><p class="expl">'+q.e+'</p>';
  if(q.f&&!q.fb) h+=fig(q.f,"Схема для запоминания");
  if(q.c) h+=cardHtml(q.c,"Шпаргалка");
  h+='<button class="btn primary next" id="b-next">'+(pos+1<deck.length?'Следующий вопрос →':'Показать итоги')+'</button></div>';
  $("fbk").innerHTML=h;
  const n=deck.length;
  $("s-score").innerHTML='Верно <b>'+right+'</b> · ошибок <b>'+wrong+'</b>';
  const bar=$("bar").children; bar[0].style.width=(right/n*100)+"%"; bar[1].style.width=(wrong/n*100)+"%";
  $("b-next").onclick=next; $("b-next").focus({preventScroll:true});
  chips();
}
function next(){ pos++; render(); const s=$("stage"); if(s.getBoundingClientRect().top<0) s.scrollIntoView({block:"start"}); }
function finish(){
  const n=deck.length, pct=Math.round(right/n*100);
  const per={}; deck.forEach(i=>{ const q=Q[i]; per[q.t]=per[q.t]||{n:0,bad:0}; per[q.t].n++; const s=store.st[q.id]; if(s&&s.last===0) per[q.t].bad++; });
  let h='<div class="box res"><div class="label">Итог прохода</div><div class="big">'+right+' из '+n+' · '+pct+'%</div>';
  h+='<div class="tlist">'+Object.keys(per).map(t=>'<div class="tl '+(per[t].bad?'bad':'ok')+'"><span>Билет '+t+'</span><span>'+(per[t].bad?'ошибок '+per[t].bad:'всё верно')+'</span></div>').join("")+'</div>';
  h+='<div class="row"><button class="btn primary" id="f-wrong">Пройти ошибки ещё раз</button><button class="btn" id="f-again">Пройти заново</button></div></div>';
  $("stage").innerHTML=h;
  const nw=deck.filter(i=>{ const s=store.st[Q[i].id]; return s&&s.last===0; }).length;
  $("f-wrong").disabled=!nw; $("f-wrong").onclick=()=>build("wrong"); $("f-again").onclick=()=>build("all");
}

/* ---------- схемы ---------- */
function schemes(){
  const v=$("v-sch"); let h='<p class="cn">Все схемы из лекций и шпаргалки, разложенные по билетам. Перед ответом на билет пролистайте его раздел.</p>';
  const seen=new Set();
  for(let t=1;t<=21;t++){
    const qs=Q.filter(q=>q.t===t), figs=[...new Set(qs.filter(q=>q.f).map(q=>q.f))], cs=[...new Set(qs.filter(q=>q.c).map(q=>q.c))].filter(c=>!seen.has(c));
    cs.forEach(c=>seen.add(c));
    h+='<section class="sec" id="t'+t+'"><h2><span class="n">Билет '+t+'</span>'+TK[t][0]+'</h2><p class="topics">2. '+TK[t][1]+'</p>';
    if(figs.length) h+='<div class="thumbs">'+figs.map(k=>'<figure><img src="'+IMG(k)+'" alt="Слайд '+k+'" loading="lazy" data-z="1" onerror="this.closest(\'figure\').hidden=true"><figcaption>'+k.replace("_p"," · слайд ")+'</figcaption></figure>').join("")+'</div>';
    if(cs.length) h+='<div class="cards">'+cs.map(c=>cardHtml(c)).join("")+'</div>';
    h+='</section>';
  }
  v.innerHTML=h;
}
function show(which){
  const t=which==="schemes";
  $("v-test").hidden=t; $("v-sch").hidden=!t;
  $("tab-test").setAttribute("aria-selected",t?"false":"true"); $("tab-sch").setAttribute("aria-selected",t?"true":"false");
  if(t&&!$("v-sch").innerHTML) schemes();
}
$("tab-test").onclick=()=>{ location.hash="test"; show("test"); };
$("tab-sch").onclick=()=>{ location.hash="schemes"; show("schemes"); };
window.addEventListener("hashchange",()=>show(location.hash==="#schemes"?"schemes":"test"));

/* ---------- кнопки, клавиши, лайтбокс ---------- */
$("b-order").onclick=()=>{ rand=!rand; store.rand=rand; save(); build(mode==="wrong"?"wrong":"all"); };
$("b-wrong").onclick=()=>build("wrong");
$("b-restart").onclick=()=>build("all");
$("b-reset").onclick=()=>{ const b=$("b-reset"); if(b.dataset.c){ store.st={}; save(); b.dataset.c=""; b.textContent="Сбросить статистику"; build("all"); } else { b.dataset.c="1"; b.textContent="Точно сбросить? Нажмите ещё раз"; setTimeout(()=>{ b.dataset.c=""; b.textContent="Сбросить статистику"; },4000); } };
document.addEventListener("keydown",e=>{
  if($("lb").classList.contains("on")){ if(e.key==="Escape") $("lb").classList.remove("on"); return; }
  if($("v-test").hidden||e.ctrlKey||e.metaKey||e.altKey) return;
  if(!answered&&/^[1-4]$/.test(e.key)){ const b=document.querySelector('.opt[data-k="'+(+e.key-1)+'"]'); if(b){ e.preventDefault(); b.click(); } }
  else if(answered&&e.key==="Enter"&&document.activeElement&&document.activeElement.id!=="b-next"){ const b=$("b-next"); if(b){ e.preventDefault(); b.click(); } }
});
document.addEventListener("click",e=>{ const im=e.target.closest("img[data-z]"); if(im){ $("lbimg").src=im.src; $("lb").classList.add("on"); } });
$("lb").onclick=()=>$("lb").classList.remove("on");

const nf=Q.filter(q=>q.f).length;
$("sub").textContent=Q.length+" вопросов по всем билетам · "+nf+" со схемами из лекций · "+Object.keys(C).length+" шпаргалок. После каждого ответа — пояснение и схема.";
build("all");
show(location.hash==="#schemes"?"schemes":"test");
