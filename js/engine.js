/*
 * Maqsat Engine
 *   match(profile, opp, today)  → подходит ли возможность и чего не хватает
 *   buildPlan(profile, picks, today) → шаги с датами, обратный отсчёт от дедлайна
 *   toICS(plan)                 → календарь для телефона / Google Calendar
 */
(function () {
  const M = window.M;
  const DAY = 86400000;

  /* ---------- даты (все даты — локальные, без времени) ---------- */
  function parse(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addYears(d, n) { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }
  function daysBetween(a, b) { return Math.round((parse(iso(b)) - parse(iso(a))) / DAY); }
  M.date = { parse, iso, addDays, addYears, daysBetween };

  const STATUS = Object.fromEntries(M.STATUSES.map(s => [s.id, s]));
  /*
   * Переход в следующий учебный год. В 12-летней школе после 11 класса идёт 12-й.
   * После школы считаем, что ученик поступает в вуз: это типичный путь, и прогноз «станет доступно»
   * для вузовских программ дополнительно оговаривается условием (opp.laterCondition).
   */
  function nextStatus(st, profile) {
    if (st === 'g11') return profile.school12 ? 'g12' : 'uni';
    return { g8: 'g9', g9: 'g10', g10: 'g11', g12: 'uni', col1: 'col2', col2: 'col2', uni: 'uni', grad: 'grad' }[st];
  }
  M.nextStatus = nextStatus;
  const finalGrade = (profile, st) => (profile.school12 || st === 'g12' ? 12 : 11);

  /* Подходит ли статус: классы школы — относительно выпускного, остальное — по списку. */
  function statusAllowed(r, profile, st) {
    const s = STATUS[st];
    if (s.school && r.schoolRel) return r.schoolRel.includes(finalGrade(profile, st) - s.school);
    return (r.status || []).includes(st);
  }
  function allowedText(r, profile, st) {
    const parts = [];
    if (r.schoolRel) {
      const fin = finalGrade(profile, st);
      const grades = r.schoolRel.map(k => fin - k).sort((a, b) => a - b);
      parts.push(grades.length > 1 ? `${grades[0]}–${grades[grades.length - 1]} класс` : `${grades[0]} класс (выпускной)`);
    }
    (r.status || []).forEach(x => parts.push(STATUS[x].label));
    return parts.join(', ');
  }
  M.OPP = Object.fromEntries(M.OPPORTUNITIES.map(o => [o.id, o]));

  /* Возраст в полных годах на дату. Дата рождения известна до месяца — считаем от 1-го числа. */
  function ageAt(profile, date) {
    let age = date.getFullYear() - profile.birthYear;
    if (date.getMonth() + 1 < profile.birthMonth) age--;
    return age;
  }
  M.ageAt = ageAt;

  /* Соответствие IELTS → CEFR по официальной шкале IELTS: 4.0–5.0 ≈ B1, 5.5–6.5 ≈ B2, 7.0+ ≈ C1. */
  function ieltsToCefr(band) { return band >= 7 ? 4 : band >= 5.5 ? 3 : band >= 4 ? 2 : 1; }
  M.ieltsToCefr = ieltsToCefr;

  /* Целевой дедлайн: выбранный пользователем, иначе ближайший, который ещё не прошёл. */
  function targetDeadline(opp, today, pick) {
    if (pick && pick.manualDate) return { label: 'Дата, указанная вами', date: pick.manualDate, exact: true, manual: true };
    const future = opp.deadlines.filter(d => parse(d.date) >= parse(iso(today)));
    if (opp.deadlineChoice && pick && pick.deadline != null && opp.deadlines[pick.deadline] && future.includes(opp.deadlines[pick.deadline])) return opp.deadlines[pick.deadline];
    return future[0] || null;
  }
  M.targetDeadline = targetDeadline;

  function conf(opp, key) { return (opp.reqConf && opp.reqConf[key]) || 'official'; }

  /* Проверка требований на конкретную дату. hardOnly — для прогноза «станет доступно». */
  function checkReqs(profile, opp, onDate, statusId) {
    const r = opp.req || {};
    const checks = [];
    const push = (kind, level, text) => checks.push({ kind, level, text, conf: conf(opp, kind) });

    if (r.age) {
      const at = r.age.at ? parse(r.age.at) : onDate;
      const a = ageAt(profile, at);
      const okMin = r.age.min == null || a >= r.age.min;
      const okMax = r.age.max == null || a <= r.age.max;
      const range = r.age.min != null && r.age.max != null ? `${r.age.min}–${r.age.max} лет` : r.age.min != null ? `от ${r.age.min} лет` : `до ${r.age.max} лет`;
      push('age', okMin && okMax ? 'ok' : 'hard', `Возраст ${range}: вам будет ${a} ${plural(a, 'год', 'года', 'лет')}${r.age.at ? ` на ${fmt(at)}` : ''}`);
    }
    if (r.status || r.schoolRel) {
      const ok = statusAllowed(r, profile, statusId);
      push('status', ok ? 'ok' : 'hard', ok ? `Статус подходит: ${STATUS[statusId].label}` : `Нужно: ${allowedText(r, profile, statusId)} — у вас ${STATUS[statusId].label}`);
    }
    if (r.gate) push('gate', 'warn', r.gate);
    if (r.kz) push('kz', profile.kz ? 'ok' : 'hard', profile.kz ? 'Гражданство или ВНЖ Казахстана' : 'Нужно гражданство или ВНЖ Казахстана');
    if (r.english) {
      const need = r.english;
      const have = profile.ielts ? Math.max(profile.english, ieltsToCefr(profile.ielts)) : profile.english;
      if (need.ielts) {
        if (profile.ielts && profile.ielts >= need.ielts) push('english', 'ok', `IELTS ${profile.ielts} — не ниже требуемых ${need.ielts.toFixed(1)}`);
        else if (profile.ielts) push('english', 'gap', `Нужен IELTS ${need.ielts.toFixed(1)}, у вас ${profile.ielts} — нужна пересдача`);
        else push('english', 'gap', `Нужен сертификат IELTS ${need.ielts.toFixed(1)}${have >= need.cefr ? ' — уровень у вас, похоже, есть, осталось сдать экзамен' : ` и уровень примерно ${M.ENGLISH[need.cefr].label.split(' ')[0]}`}`);
      } else {
        push('english', have >= need.cefr ? 'ok' : 'gap', have >= need.cefr ? `Английский: достаточно (${M.ENGLISH[have].label})` : `Английский: нужен уровень около ${M.ENGLISH[need.cefr].label}, у вас ${M.ENGLISH[have].label}`);
      }
    }
    if (r.avg) {
      if (profile.avg == null) push('avg', 'gap', `Нужен средний балл не ниже ${r.avg} из 5 — укажите свой в профиле`);
      else push('avg', profile.avg >= r.avg ? 'ok' : 'gap', `Средний балл ${r.avg}+: у вас ${profile.avg}`);
    }
    if (r.city) {
      const ok = r.city.includes(profile.city);
      push('city', ok ? 'ok' : 'warn', ok ? `Очно в вашем городе` : `Занятия очно: ${r.city.map(c => M.CITIES.find(x => x.id === c).label).join(', ')} — придётся ездить или переехать`);
    }
    return checks;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  M.plural = plural;
  function fmt(d) { return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); }
  M.fmt = fmt;

  /*
   * Итог: fit — всё выполнено; almost — есть устранимые пробелы (язык, балл, город);
   * later — сейчас нельзя, но станет можно через 1–3 года; no — не подходит.
   */
  function match(profile, opp, today, pick) {
    const dl = targetDeadline(opp, today, pick);
    const onDate = dl ? parse(dl.date) : today;
    const checks = checkReqs(profile, opp, onDate, profile.status);
    if (profile.onlyFree && opp.free !== true) {
      if (opp.free === null) checks.push({ kind: 'free', level: 'warn', text: 'Стоимость участия не указана — уточните', conf: 'secondary' });
      else checks.push({ kind: 'free', level: opp.aid ? 'warn' : 'gap', text: opp.aid ? `Платно, но: ${opp.aid}` : 'Платная программа', conf: 'official' });
    }
    const hard = checks.filter(c => c.level === 'hard');
    const gaps = checks.filter(c => c.level === 'gap');
    let status = hard.length ? 'no' : gaps.length ? 'almost' : 'fit';
    let laterYear = null;
    if (status === 'no') {
      // Прогноз: пересчитать профиль на 1–3 учебных года вперёд
      let st = profile.status;
      for (let k = 1; k <= 3; k++) {
        st = nextStatus(st, profile);
        const future = addYears(onDate, k);
        const shifted = Object.assign({}, opp, { req: Object.assign({}, opp.req, opp.req.age && opp.req.age.at ? { age: Object.assign({}, opp.req.age, { at: iso(addYears(parse(opp.req.age.at), k)) }) } : {}) });
        const fc = checkReqs(profile, shifted, future, st);
        if (!fc.some(c => c.level === 'hard')) { status = 'later'; laterYear = future.getFullYear(); break; }
      }
    }
    const relevance = (opp.tags || []).filter(t => (profile.interests || []).includes(t)).length;
    const daysLeft = dl ? daysBetween(today, parse(dl.date)) : null;
    return { opp, status, checks, deadline: dl, daysLeft, relevance, laterYear };
  }
  M.match = match;

  const ORDER = { fit: 0, almost: 1, later: 2, no: 3 };
  M.matchAll = function (profile, today, picks) {
    return M.OPPORTUNITIES.map(o => match(profile, o, today, picks && picks[o.id]))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.relevance - a.relevance ||
        (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft));
  };

  /* ---------- план ---------- */
  function stepKeys(profile, opp, today) {
    const m = checkReqs(profile, opp, today, profile.status);
    const eng = m.find(c => c.kind === 'english');
    return opp.steps.filter(k => {
      if (k === 'ielts') return eng && eng.level !== 'ok';
      if (k === 'english') return eng && eng.level !== 'ok';
      return true;
    });
  }

  /*
   * Рекомендуемый график считается назад от дедлайна. Если часть шагов «должна была»
   * начаться в прошлом, они равномерно сжимаются между сегодня и следующим шагом —
   * и план честно помечается как сжатый.
   */
  function planFor(profile, opp, today, pick) {
    const dl = targetDeadline(opp, today, pick);
    // Свои задачи пользователя (например, «спросить у выпускника про собеседование») — есть даже без дедлайна
    const custom = ((pick && pick.custom) || []).filter(c => c && c.text && /^\d{4}-\d{2}-\d{2}$/.test(c.date))
      .map(c => ({ id: `${opp.id}:custom:${c.id}`, opp: opp.id, text: c.text, date: parse(c.date), weeks: null, custom: true, cid: c.id }));
    if (!dl) return { opp, deadline: null, steps: custom.sort((a, b) => a.date - b.date), compressed: false };
    const end = parse(dl.date);
    const steps = [];
    stepKeys(profile, opp, today).forEach(key => {
      M.STEP_TEMPLATES[key].forEach((t, i) => {
        steps.push({ id: `${opp.id}:${key}:${i}`, opp: opp.id, text: t.t, date: addDays(end, -7 * t.w), weeks: t.w, deadline: !!t.deadline, school: !!t.school, post: t.w < 0 });
      });
    });
    // У конкурсов и олимпиад нет шага «отправить заявку» — сам этап становится финальной точкой плана
    if (!steps.some(s => s.deadline)) steps.push({ id: `${opp.id}:event:0`, opp: opp.id, text: dl.label, date: end, weeks: 0, deadline: true });
    steps.sort((a, b) => a.date - b.date || a.weeks - b.weeks);
    const t0 = parse(iso(today));
    const past = steps.filter(s => s.date < t0);
    let compressed = false;
    if (past.length) {
      compressed = true;
      const anchor = (steps.find(s => s.date >= t0) || { date: end }).date;
      const span = Math.max(0, daysBetween(t0, anchor));
      past.forEach((s, i) => { s.date = addDays(t0, Math.floor((span * i) / (past.length + 1))); s.moved = true; });
    }
    // Ручные переносы шагов
    steps.forEach(s => {
      if (pick && pick.moved && pick.moved[s.id]) { s.date = parse(pick.moved[s.id]); s.manual = true; }
    });
    steps.push(...custom);
    steps.sort((a, b) => a.date - b.date);
    return { opp, deadline: dl, steps, compressed };
  }

  M.buildPlan = function (profile, picks, today) {
    const items = Object.keys(picks).filter(id => M.OPP[id]).map(id => planFor(profile, M.OPP[id], today, picks[id]));
    const all = items.flatMap(it => it.steps).sort((a, b) => a.date - b.date);
    // Перегруженные недели и близкие дедлайны
    const weeks = {};
    all.forEach(s => { const k = weekKey(s.date); (weeks[k] = weeks[k] || []).push(s); });
    const warnings = [];
    Object.entries(weeks).forEach(([k, list]) => {
      if (list.length >= 4) warnings.push({ type: 'busy', week: k, text: `Неделя с ${fmt(weekStart(list[0].date))}: ${list.length} ${plural(list.length, 'дело', 'дела', 'дел')} — начните часть заранее`, steps: list.map(s => s.id) });
    });
    const dls = all.filter(s => s.deadline);
    for (let i = 1; i < dls.length; i++) {
      if (daysBetween(dls[i - 1].date, dls[i].date) <= 7) {
        warnings.push({ type: 'clash', text: `Два дедлайна за одну неделю: ${M.OPP[dls[i - 1].opp].title} (${fmt(dls[i - 1].date)}) и ${M.OPP[dls[i].opp].title} (${fmt(dls[i].date)})`, steps: [dls[i - 1].id, dls[i].id] });
      }
    }
    items.forEach(it => {
      if (it.compressed) {
        const later = it.opp.deadlineChoice && it.deadline && !it.deadline.manual && it.opp.deadlines.find(d => parse(d.date) > parse(it.deadline.date));
        warnings.push({ type: 'late', opp: it.opp.id, alt: later ? it.opp.deadlines.indexOf(later) : null,
          text: `${it.opp.title}: рекомендуемый график уже начался — первые шаги сжаты до ближайших дней.` + (later ? ` Есть более поздний срок: ${later.label} — ${fmt(parse(later.date))}` : '') });
      }
      if (!it.deadline) warnings.push({ type: 'nodate', text: `${it.opp.title}: срок не опубликован — укажите дату, когда её объявят.`, opp: it.opp.id });
    });
    return { items, steps: all, warnings };
  };

  function weekStart(d) { const x = parse(iso(d)); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); }
  function weekKey(d) { return iso(weekStart(d)); }
  M.weekStart = weekStart;

  /* «Сделай сегодня»: ближайший невыполненный шаг, просроченные — первыми. */
  M.nextAction = function (plan, done, today) {
    return plan.steps.find(s => !done[s.id]) || null;
  };

  M.preSubmitSteps = function (item) {
    return item.steps.filter(s => !s.custom && !s.post);
  };

  M.progress = function (item, done) {
    const n = item.steps.length;
    const d = item.steps.filter(s => done[s.id]).length;
    return { n, d, pct: n ? Math.round((d / n) * 100) : 0 };
  };

  /* ---------- iCalendar (RFC 5545) ---------- */
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) {
    // Строки длиннее 75 октетов переносятся (UTF-8: считаем байты, не символы)
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    const out = []; let cur = ''; let bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

  M.toICS = function (plan, now) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maqsat//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Maqsat — мой план'];
    plan.steps.forEach(s => {
      const o = M.OPP[s.opp];
      const d = iso(s.date).replace(/-/g, '');
      const d2 = iso(addDays(s.date, 1)).replace(/-/g, '');
      lines.push('BEGIN:VEVENT', `UID:${s.id.replace(/:/g, '-')}@maqsat`, `DTSTAMP:${stamp(now || new Date())}`,
        `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2}`,
        fold(`SUMMARY:${icsEscape((s.deadline ? '⏰ ' : '') + o.title + ': ' + s.text)}`),
        fold(`DESCRIPTION:${icsEscape('Источник: ' + o.source.url)}`),
        fold(`URL:${o.source.url}`),
        'BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${icsEscape(o.title + ': ' + s.text)}`), 'TRIGGER:-PT12H', 'END:VALARM',
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  };
})();
