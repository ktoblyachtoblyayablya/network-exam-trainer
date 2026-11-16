// SPDX-License-Identifier: GPL-3.0-or-later · Copyright (C) 2026 Пантелеев Г.Д.
/* Настройки курса для общего движка (js/app.js, js/helpers.js). */
const COURSE = {
  key: "netquiz-v2",
  title: "Сети и телекоммуникации",
  credit: "По материалам курса «Сети и телекоммуникации» (Шмелева О.В.). Автор: Пантелеев Г.Д.",
  /* Слайды лекций — img/slides/KEY.png, например L02_p30.png (лекция 2, слайд 30) или ETH_p04.png. */
  img: k => "img/slides/" + k + ".png",
  figSource: k => {
    const m = k.match(/^([A-Z]+?)(\d*)_p(\d+)$/);
    if (!m) return "";
    return (m[1] === "L" && m[2] ? "лекция " + (+m[2]) : "слайды " + m[1] + m[2]) + ", слайд " + (+m[3]);
  },
  tlabel: id => "Билет " + id.split("-")[1],
  figWord: "Схема",
  schemesRepeat: true,                       // у каждого билета показывать все его слайды
  schemesNote: "Все схемы из лекций и шпаргалки, разложенные по билетам. Перед ответом на билет пролистайте его раздел.",
  sub: s => s.plural(s.n, ["вопрос", "вопроса", "вопросов"]) + " по всем билетам · " + s.nf + " со схемами из лекций · " +
    s.plural(s.nc, ["шпаргалка", "шпаргалки", "шпаргалок"]) + ". После каждого ответа — пояснение и схема.",
  /* Статистика старой версии тренажёра (ключи вида «5-1» — билет и номер вопроса) переносится в новый формат. */
  legacy: {
    key: "netquiz-v1",
    convert: (o, posId) => {
      const st = {};
      Object.keys(o.st || {}).forEach(k => { const m = k.match(/^(\d+)-(\d+)$/), id = m && posId("b-" + m[1], +m[2]); if (id) st[id] = o.st[k]; });
      return { st: st, sel: (o.sel || []).map(n => "b-" + n), rand: !!o.rand };
    }
  }
};
