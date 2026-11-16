#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later · Copyright (C) 2026 Пантелеев Г.Д.
/* Проверка банка вопросов и билетов: node tools/validate.js
   Файл одинаковый во всех тренажёрах.
   Ошибки (код выхода 1): битый формат вопроса, нет картинки, нет шпаргалки, повтор вопроса,
   повтор ответа после нормализации, нет ответа на билет, ссылка на несуществующий билет,
   остатки шаблонов в тексте, правильный вариант слишком часто самый длинный (больше 40 %).
   Предупреждения: неиспользуемые шпаргалки и картинки, правильный вариант часто самый длинный (больше 30 %)
   или заметно длиннее остальных, правильный вариант слишком часто на одном месте по длине. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(f => f !== "js/app.js");
const code = files.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;({ Q, C, A, TK, SEC, FC, norm });";
let data;
try { data = vm.runInNewContext(code, {}, { filename: "bank.js" }); }
catch (e) { console.error("Ошибка в файлах данных:", e.message); process.exit(1); }
const { Q, C, A, TK, SEC, FC, norm } = data;

const errors = [], warn = [];
const imgDir = d => fs.existsSync(path.join(root, "img", d)) ? fs.readdirSync(path.join(root, "img", d)) : [];
const imgs = new Set([
  ...imgDir("slides").filter(f => /\.(webp|png)$/.test(f)).map(f => f.replace(/\.(webp|png)$/, "")),
  ...imgDir("svg").filter(f => f.endsWith(".svg")).map(f => f.replace(/\.svg$/, ""))]);
const HAS_A = Object.keys(A).length > 0;
const used = new Set();
const seen = new Map();
const per = {};
const known = new Set(["t", "q", "o", "a", "e", "f", "fb", "c", "ci", "h", "pr"]);

Q.forEach((q, i) => {
  const where = `${q.t}, «${String(q.q).replace(/<[^>]+>/g, "").slice(0, 50)}…»`;
  Object.keys(q).forEach(k => { if (!known.has(k)) errors.push(`${where}: неизвестное поле ${k}`); });
  if (!TK[q.t]) errors.push(`#${i}: неизвестная тема ${q.t}`);
  if (typeof q.q !== "string" || !q.q.trim()) errors.push(`${where}: пустой вопрос`);
  if (q.a !== undefined && q.o !== undefined) errors.push(`${where}: одновременно o и a`);
  if (q.a !== undefined) {
    if (!Array.isArray(q.a) || !q.a.length || q.a.some(x => typeof x !== "string")) errors.push(`${where}: a — непустой массив строк`);
    else {
      const ns = q.a.map(x => norm(x, q.ci));
      if (ns.some(x => !x)) errors.push(`${where}: пустой ответ после нормализации`);
      if (new Set(ns).size !== ns.length) errors.push(`${where}: ответы совпадают после нормализации: ${q.a.join(" | ")}`);
    }
  } else {
    if (!Array.isArray(q.o) || q.o.length < 2) errors.push(`${where}: нужно минимум 2 варианта`);
    else if (new Set(q.o).size !== q.o.length) errors.push(`${where}: повторяются варианты`);
    if (q.o && q.o.length > 5) errors.push(`${where}: больше 5 вариантов — клавиш 1–5 не хватит`);
    if (q.ci || q.h || q.pr) errors.push(`${where}: ci/h/pr бывают только у вопросов с вводом`);
  }
  if (typeof q.e !== "string" || !q.e.trim()) errors.push(`${where}: нет пояснения`);
  if (q.fb && !q.f) errors.push(`${where}: fb без картинки`);
  (q.f ? (Array.isArray(q.f) ? q.f : [q.f]) : []).forEach(k => { used.add(k); if (!imgs.has(k)) errors.push(`${where}: нет картинки ${k}`); });
  if (q.c && !C[q.c]) errors.push(`${where}: нет шпаргалки «${q.c}»`);
  if (seen.has(q.q)) errors.push(`${where}: такой вопрос уже есть`);
  seen.set(q.q, true);
  per[q.t] = (per[q.t] || 0) + 1;
});

Object.keys(TK).forEach(t => {
  const s = t.split("-")[0];
  const sec = SEC.find(x => x.id === s);
  if (!sec) errors.push(`${t}: неизвестный раздел`);
  if (sec && !sec.testless && !per[t]) errors.push(`${t}: нет ни одного вопроса`);
  if (HAS_A && !A[t]) errors.push(`${t}: нет билета с ответом`);
});
const junk = s => /\$\{|undefined|\[object |NaN/.test(s.replace(/<pre class="code">[\s\S]*?<\/pre>/g, ""));
Object.keys(A).forEach(t => {
  if (!TK[t]) errors.push(`билет ${t}: нет такой темы`);
  const h = A[t];
  if (junk(h)) errors.push(`билет ${t}: остатки шаблона в тексте`);
  for (const m of h.matchAll(/img\/(?:slides|svg)\/([^"']+?)\.(?:webp|png|svg)/g)) { used.add(m[1]); if (!imgs.has(m[1])) errors.push(`билет ${t}: нет картинки ${m[1]}`); }
  for (const m of h.matchAll(/data-t="([^"]+)"/g)) if (!TK[m[1]]) errors.push(`билет ${t}: ссылка на несуществующий билет ${m[1]}`);
  for (const m of h.matchAll(/data-card="([^"]+)"/g)) if (!C[m[1]]) errors.push(`билет ${t}: нет шпаргалки ${m[1]}`);
});
Object.keys(C).forEach(k => { if (junk(C[k].html + C[k].title)) errors.push(`шпаргалка ${k}: остатки шаблона`); });
const usedCards = new Set(Q.map(q => q.c).filter(Boolean));
Object.keys(A).forEach(t => { for (const m of A[t].matchAll(/data-card="([^"]+)"/g)) usedCards.add(m[1]); });
Object.keys(C).forEach(k => { if (!usedCards.has(k)) warn.push(`шпаргалка «${k}» не привязана ни к одному вопросу`); });
const withCaps = Object.keys(FC).length > 0;
imgs.forEach(k => { if (!used.has(k)) warn.push(`картинка ${k} нигде не используется`); if (withCaps && !FC[k]) warn.push(`у картинки ${k} нет подписи в data/figs.js`); });

const bySec = {}, inSec = {};
Q.forEach(q => { const s = q.t.split("-")[0]; bySec[s] = (bySec[s] || 0) + 1; if (q.a) inSec[s] = (inSec[s] || 0) + 1; });
const ni = Q.filter(q => q.a).length;
console.log(`Вопросов: ${Q.length} (выбор ${Q.length - ni}, ввод ${ni}) · с картинками: ${Q.filter(q => q.f).length} · шпаргалок: ${Object.keys(C).length} · билетов: ${Object.keys(A).length} · картинок: ${imgs.size}`);
console.log("По разделам (всего / ввод): " + Object.keys(bySec).map(s => `${s}: ${bySec[s]}/${inSec[s] || 0}`).join("  "));

/* Угадывание по длине: если правильный вариант обычно самый длинный, тест проходится без знаний. */
const mc = Q.filter(q => Array.isArray(q.o) && q.o.length > 1), len = s => String(s).replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, "x").length;
const longest = mc.filter(q => q.o.slice(1).every(o => len(q.o[0]) > len(o)));
const much = mc.filter(q => len(q.o[0]) >= 1.5 * Math.max(...q.o.slice(1).map(len)) && len(q.o[0]) - Math.max(...q.o.slice(1).map(len)) >= 10);
const pct = n => mc.length ? Math.round(n / mc.length * 100) : 0;
console.log(`Правильный вариант самый длинный: ${longest.length} из ${mc.length} (${pct(longest.length)} %), в полтора раза длиннее остальных: ${much.length} (${pct(much.length)} %)`);
if (pct(longest.length) > 40) errors.push(`правильный вариант самый длинный в ${pct(longest.length)} % вопросов (можно не больше 40 %) — его угадывают по длине`);
else if (pct(longest.length) > 30) warn.push(`правильный вариант самый длинный в ${pct(longest.length)} % вопросов — лучше держать около 25 %`);
if (pct(much.length) > 10) warn.push(`в ${much.length} вопросах правильный вариант в полтора раза длиннее остальных`);
/* Место правильного варианта по длине (1 — самый длинный): если одно место встречается слишком часто, это тоже подсказка. */
const rk = [0, 0, 0, 0, 0, 0];
mc.forEach(q => { const L = q.o.map(len); rk[Math.min(5, 1 + L.slice(1).filter(x => x > L[0]).length)]++; });
console.log("Место правильного по длине: " + [1, 2, 3, 4, 5].filter(r => rk[r]).map(r => `${r}-е — ${pct(rk[r])} %`).join(", "));
const top = rk.indexOf(Math.max(...rk));
if (mc.length >= 20 && pct(rk[1]) < 10) warn.push(`правильный вариант бывает самым длинным лишь в ${pct(rk[1])} % вопросов — это тоже подсказка: самый длинный можно сразу отбросить`);
if (mc.length >= 20 && top > 1 && pct(rk[top]) > 45) warn.push(`правильный вариант в ${pct(rk[top])} % вопросов ${top}-й по длине — по этому его можно угадать`);
if (process.argv.includes("--long")) much.forEach(q => console.log(`  длинный ответ: ${q.t} «${String(q.q).replace(/<[^>]+>/g, "").slice(0, 70)}»`));

const thin = Object.keys(per).filter(t => per[t] < 3);
if (thin.length) console.log("Мало вопросов (<3): " + thin.join(", "));
warn.forEach(w => console.log("Предупреждение: " + w));
if (errors.length) { errors.forEach(e => console.error("Ошибка: " + e)); process.exit(1); }
console.log("Всё в порядке.");
