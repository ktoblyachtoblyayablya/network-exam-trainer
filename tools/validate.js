#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later · Copyright (C) 2026 Пантелеев Г.Д.
/* Проверка банка вопросов: node tools/validate.js
   Ошибки (код выхода 1): битый формат вопроса, нет картинки, нет шпаргалки, повтор вопроса.
   Предупреждения: неиспользуемые шпаргалки и слайды. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
// Берём файлы данных в том же порядке, что и index.html (без js/app.js — ему нужен DOM).
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map(m => m[1])
  .filter(f => f !== "js/app.js");

const code = files.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n")
  + "\n;({ Q, C, TK });";
let data;
try {
  data = vm.runInNewContext(code, {}, { filename: "bank.js" });
} catch (e) {
  console.error("Ошибка в файлах данных:", e.message);
  process.exit(1);
}
const { Q, C, TK } = data;

const errors = [];
const warn = [];
const seen = new Map();
const perTicket = {};
const slideDir = path.join(root, "img", "slides");
const slides = fs.existsSync(slideDir) ? new Set(fs.readdirSync(slideDir).map(f => f.replace(/\.png$/, ""))) : null;

Q.forEach((q, i) => {
  const where = `билет ${q.t}, «${String(q.q).slice(0, 50)}…»`;
  if (!TK[q.t]) errors.push(`#${i}: неизвестный билет ${q.t}`);
  if (typeof q.q !== "string" || !q.q.trim()) errors.push(`${where}: пустой вопрос`);
  if (!Array.isArray(q.o) || q.o.length < 2) errors.push(`${where}: нужно минимум 2 варианта`);
  else if (new Set(q.o).size !== q.o.length) errors.push(`${where}: повторяются варианты`);
  if (typeof q.e !== "string" || !q.e.trim()) errors.push(`${where}: нет пояснения (e)`);
  if (q.fb && !q.f) errors.push(`${where}: fb без картинки f`);
  if (q.f && slides && !slides.has(q.f)) errors.push(`${where}: нет файла img/slides/${q.f}.png`);
  if (q.c && !C[q.c]) errors.push(`${where}: нет шпаргалки «${q.c}» в data/cards.js`);
  if (seen.has(q.q)) errors.push(`${where}: такой вопрос уже есть`);
  seen.set(q.q, true);
  perTicket[q.t] = (perTicket[q.t] || 0) + 1;
});

Object.keys(TK).forEach(t => { if (!perTicket[t]) errors.push(`Билет ${t}: нет ни одного вопроса`); });
const usedCards = new Set(Q.map(q => q.c).filter(Boolean));
Object.keys(C).forEach(k => { if (!usedCards.has(k)) warn.push(`шпаргалка «${k}» не привязана ни к одному вопросу`); });
if (slides) {
  const usedSlides = new Set(Q.map(q => q.f).filter(Boolean));
  slides.forEach(s => { if (!usedSlides.has(s)) warn.push(`слайд img/slides/${s}.png не используется`); });
} else {
  warn.push("папки img/slides нет — вопросы покажутся без слайдов");
}

console.log(`Вопросов: ${Q.length} · со слайдами: ${Q.filter(q => q.f).length} · шпаргалок: ${Object.keys(C).length}`);
console.log("По билетам: " + Object.keys(TK).map(t => `${t}:${perTicket[t] || 0}`).join("  "));
warn.forEach(w => console.log("Предупреждение: " + w));
if (errors.length) {
  errors.forEach(e => console.error("Ошибка: " + e));
  process.exit(1);
}
console.log("Всё в порядке.");
