/*
 * Maqsat — интерфейс: профиль → возможности → план → календарь.
 * Данные хранятся только на устройстве (localStorage), без регистрации и сервера.
 */
(function () {
  const M = window.M;
  const app = document.getElementById('app');
  const live = document.getElementById('live');
  const KEY = 'maqsat.v1';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const announce = t => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 50); };

  /* «Сегодня» можно подменить параметром ?today=YYYY-MM-DD — для демо и тестов. */
  function today() {
    const q = new URLSearchParams(location.search).get('today');
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? M.date.parse(q) : M.date.parse(M.date.iso(new Date()));
  }
  M.today = today;

  /* ---------- состояние ---------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && typeof s === 'object') return { profile: s.profile || null, picks: s.picks || {}, done: s.done || {} };
    } catch (e) { /* повреждённые данные или приватный режим */ }
    return { profile: null, picks: {}, done: {} };
  }
  const state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* без сохранения */ }
    updateBadge();
  }
  M.state = state;

  function updateBadge() {
    const n = Object.keys(state.picks).length;
    const b = document.getElementById('plan-count');
    b.hidden = !n; b.textContent = n;
  }

  const COLORS = ['#2f3fbf', '#0c7a5c', '#b3312f', '#9a5200', '#5b48c9', '#0b6e99', '#8a3b8f', '#3d6b1f', '#b0475f', '#446078', '#7a5c00', '#1f7a7a', '#6b4e2e'];
  const colorOf = id => COLORS[M.OPPORTUNITIES.findIndex(o => o.id === id) % COLORS.length];

  const DEMO = { birthYear: 2010, birthMonth: 3, status: 'g10', kz: true, english: 2, ielts: null, avg: 4.6, city: 'almaty', interests: ['abroad', 'summer', 'olymp'], onlyFree: false };

  /* ---------- Главная ---------- */
  function viewHome() {
    app.innerHTML = `
      <section class="hero">
        <h1>От возможности — к результату</h1>
        <p class="lead">Олимпиады, стипендии, летние и обменные программы, бесплатные IT-школы. Maqsat за минуту подберёт то, что подходит именно тебе, покажет, чего не хватает, и построит план назад от дедлайна — чтобы не узнать о конкурсе после закрытия регистрации.</p>
        <div class="row">
          <a class="btn primary" href="#profile">${state.profile ? 'Изменить профиль' : 'Заполнить профиль — 1 минута'}</a>
          ${state.profile ? '<a class="btn" href="#matches">Мои возможности</a>' : '<button class="btn" id="demo">Посмотреть на примере</button>'}
        </div>
      </section>
      <section class="pillars" aria-label="Как это работает">
        <div class="pillar"><span class="num">1</span><b>Подбор с проверкой условий</b><p>Не просто список: для каждой возможности видно, подходишь ли ты по возрасту, классу, языку и баллу — и чего именно не хватает.</p></div>
        <div class="pillar"><span class="num">2</span><b>План назад от дедлайна</b><p>Когда записываться на IELTS, когда просить рекомендации, когда сдавать эссе. Если два дедлайна наложились — предупредим.</p></div>
        <div class="pillar"><span class="num">3</span><b>Напоминания в телефоне</b><p>Один файл — и все шаги с напоминаниями в Google/Apple Календаре. Отмечай выполненное и видь прогресс.</p></div>
      </section>
      <section class="trust">
        <b>Мы не выдумываем даты.</b> У каждой возможности — ссылка на первоисточник и дата проверки. Если организатор ещё не объявил срок нового цикла, мы пишем «ориентировочно» и показываем, на чём основана оценка. <a href="#data">Как мы проверяем данные →</a>
      </section>`;
    const d = app.querySelector('#demo');
    if (d) d.addEventListener('click', () => { state.profile = Object.assign({}, DEMO); save(); location.hash = '#matches'; });
  }

  /* ---------- Профиль ---------- */
  function viewProfile() {
    const p = state.profile || { birthYear: 2010, birthMonth: 1, status: 'g10', kz: true, english: 1, ielts: null, avg: null, city: 'other', interests: [], onlyFree: false };
    const years = []; for (let y = 2014; y >= 1996; y--) years.push(y);
    const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    app.innerHTML = `
      <section class="card narrow">
        <h1>Профиль</h1>
        <p class="muted">Нужен только для подбора. Хранится на твоём устройстве — никуда не отправляется, регистрации нет.</p>
        <form id="pf" novalidate>
          <div class="two">
            <label class="field"><span>Месяц рождения</span><select name="birthMonth">${months.map((m, i) => `<option value="${i + 1}" ${p.birthMonth === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
            <label class="field"><span>Год рождения</span><select name="birthYear">${years.map(y => `<option ${p.birthYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span>Где учишься сейчас</span><select name="status">${M.STATUSES.map(s => `<option value="${s.id}" ${p.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
          <div class="two">
            <label class="field"><span>Английский</span><select name="english">${M.ENGLISH.map(e => `<option value="${e.id}" ${p.english === e.id ? 'selected' : ''}>${e.label}</option>`).join('')}</select></label>
            <label class="field"><span>IELTS <span class="hint">(если сдавал)</span></span><input type="number" name="ielts" min="1" max="9" step="0.5" inputmode="decimal" value="${p.ielts == null ? '' : p.ielts}" placeholder="например, 6.0"></label>
          </div>
          <div class="two">
            <label class="field"><span>Средний балл <span class="hint">(из 5, необязательно)</span></span><input type="number" name="avg" min="2" max="5" step="0.1" inputmode="decimal" value="${p.avg == null ? '' : p.avg}" placeholder="например, 4.5"></label>
            <label class="field"><span>Город</span><select name="city">${M.CITIES.map(c => `<option value="${c.id}" ${p.city === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
          </div>
          <label class="switch"><input type="checkbox" name="kz" ${p.kz ? 'checked' : ''}> Гражданство или ВНЖ Казахстана</label>
          <fieldset>
            <legend>Что тебе интересно <span class="hint">(можно несколько)</span></legend>
            <div class="chips">${M.INTERESTS.map(i => `<label class="chip-check"><input type="checkbox" name="interests" value="${i.id}" ${(p.interests || []).includes(i.id) ? 'checked' : ''}><span>${i.label}</span></label>`).join('')}</div>
          </fieldset>
          <label class="switch"><input type="checkbox" name="onlyFree" ${p.onlyFree ? 'checked' : ''}> Только бесплатные или с финансовой поддержкой</label>
          <p id="err" class="small" role="alert" style="color:var(--bad)"></p>
          <button class="btn primary" type="submit">Подобрать возможности</button>
        </form>
      </section>`;
    app.querySelector('#pf').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const num = (v, min, max) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= min && n <= max ? n : NaN; };
      const ielts = num(f.get('ielts'), 1, 9);
      const avg = num(f.get('avg'), 2, 5);
      const err = app.querySelector('#err');
      if (Number.isNaN(ielts)) { err.textContent = 'IELTS — число от 1 до 9, например 6.0'; return; }
      if (Number.isNaN(avg)) { err.textContent = 'Средний балл — число от 2 до 5, например 4.5'; return; }
      state.profile = {
        birthYear: Number(f.get('birthYear')), birthMonth: Number(f.get('birthMonth')), status: f.get('status'),
        kz: !!f.get('kz'), english: Number(f.get('english')), ielts, avg, city: f.get('city'),
        interests: f.getAll('interests'), onlyFree: !!f.get('onlyFree')
      };
      save();
      location.hash = '#matches';
    });
  }

  /* ---------- Возможности ---------- */
  const LABEL = { fit: 'Подходишь', almost: 'Почти', later: 'Позже', no: 'Не подходит' };
  let filter = 'all';

  function deadlineBlock(r) {
    const o = r.opp;
    if (r.deadline) {
      const d = M.date.parse(r.deadline.date);
      const soon = r.daysLeft != null && r.daysLeft <= 21;
      return `<div class="dl ${soon ? 'soon' : ''}">
        <span>${esc(r.deadline.label)}:</span> <b>${M.fmt(d)}</b>
        <span class="left">${r.daysLeft === 0 ? 'сегодня' : `через ${r.daysLeft} ${M.plural(r.daysLeft, 'день', 'дня', 'дней')}`}</span>
        ${r.deadline.exact ? '' : `<span class="est" title="${esc(r.deadline.basis || '')}">ориентировочно</span><span class="tiny muted" style="flex-basis:100%">${esc(r.deadline.basis || '')}</span>`}
      </div>`;
    }
    if (o.rolling) return `<div class="dl"><b>Набор открыт</b><span class="tiny muted" style="flex-basis:100%">${esc(o.rolling)}</span></div>`;
    return `<div class="dl none"><b>Срок не опубликован</b><span class="tiny muted" style="flex-basis:100%">${esc(o.unknownDeadline || '')}</span></div>`;
  }

  function confTag(c) {
    if (c === 'secondary') return '<span class="conf conf-secondary" title="По открытым источникам — уточните на официальном сайте">уточните</span>';
    if (c === 'estimate') return '<span class="conf conf-estimate" title="Организатор не называет точный уровень — это наша оценка">наша оценка</span>';
    return '';
  }
  const ICON = { ok: '✓', gap: '△', warn: '!', hard: '✗' };

  function oppCard(r) {
    const o = r.opp;
    const picked = !!state.picks[o.id];
    const gaps = r.checks.filter(c => c.level === 'gap').length;
    const statusText = r.status === 'fit' ? '✓ Подходишь' : r.status === 'almost' ? `△ Почти: ${gaps} ${M.plural(gaps, 'пробел', 'пробела', 'пробелов')}` : r.status === 'later' ? `⏳ Станет доступно в ${r.laterYear}` : '✗ Не подходит';
    const canPick = r.status === 'fit' || r.status === 'almost';
    const multi = o.deadlineChoice && o.deadlines.filter(d => M.date.parse(d.date) >= today()).length > 1;
    return `<article class="opp" aria-labelledby="t-${o.id}">
      <div class="opp-head">
        <span class="status st-${r.status}">${statusText}</span>
        <h3 id="t-${o.id}">${esc(o.title)}</h3>
        <div class="org">${esc(o.org)}</div>
        <div class="tags"><span class="tag">${esc(o.kind)}</span><span class="tag">${esc(o.place)}</span>${o.free ? '<span class="tag free">Бесплатно</span>' : ''}</div>
      </div>
      <div class="opp-body">
        ${deadlineBlock(r)}
        <ul class="checks">${r.checks.map(c => `<li class="lv-${c.level}"><span class="i" aria-hidden="true">${ICON[c.level]}</span><span>${esc(c.text)}${confTag(c.conf)}</span></li>`).join('')}</ul>
        <details class="more"><summary>Подробнее и как проходит отбор</summary>
          <p>${esc(o.summary)}</p>
          ${o.aid ? `<p><b>Деньги:</b> ${esc(o.aid)}</p>` : ''}
          <p><b>Отбор:</b> ${esc(o.selection)}</p>
          ${o.req && o.req.note ? `<p class="small muted">${esc(o.req.note.text)}${confTag(o.req.note.conf)}</p>` : ''}
        </details>
      </div>
      <div class="opp-foot">
        <span class="src">Источник: <a href="${esc(o.source.url)}" target="_blank" rel="noopener">${esc(o.source.name)}</a> · проверено ${M.fmt(M.date.parse(M.VERIFIED))}</span>
        ${canPick ? `<div class="row">
          ${multi && !picked ? `<label class="sr-only" for="dl-${o.id}">Какой срок</label><select id="dl-${o.id}" class="small" style="width:auto;min-height:38px">${o.deadlines.map((d, i) => M.date.parse(d.date) >= today() ? `<option value="${i}">${esc(d.label)} — ${M.fmt(M.date.parse(d.date))}</option>` : '').join('')}</select>` : ''}
          <button class="btn small ${picked ? '' : 'primary'}" data-pick="${o.id}" aria-pressed="${picked}">${picked ? '✓ В плане' : '+ В мой план'}</button>
        </div>` : ''}
      </div>
    </article>`;
  }

  function viewMatches() {
    if (!state.profile) { location.hash = '#profile'; return; }
    const t = today();
    const res = M.matchAll(state.profile, t, state.picks);
    const count = s => res.filter(r => r.status === s).length;
    const shown = res.filter(r => filter === 'all' ? r.status !== 'no' : r.status === filter);
    app.innerHTML = `
      <h1>Возможности для тебя</h1>
      <p class="muted">Проверили ${res.length} ${M.plural(res.length, 'возможность', 'возможности', 'возможностей')} по твоему профилю. <a href="#profile">Изменить профиль</a></p>
      <div class="summary" role="group" aria-label="Фильтр">
        ${[['all', `Все подходящие · ${res.length - count('no')}`], ['fit', `Подходишь · ${count('fit')}`], ['almost', `Почти · ${count('almost')}`], ['later', `Позже · ${count('later')}`], ['no', `Не подходит · ${count('no')}`]]
          .map(([k, l]) => `<button class="filter" data-f="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}
      </div>
      ${shown.length ? `<div class="opps">${shown.map(oppCard).join('')}</div>` : '<p class="card">В этой группе пусто.</p>'}`;
    announce(`Найдено: подходишь — ${count('fit')}, почти — ${count('almost')}, позже — ${count('later')}`);
    app.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; viewMatches(); }));
    app.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.pick;
      if (state.picks[id]) { delete state.picks[id]; announce('Убрано из плана'); }
      else {
        const sel = app.querySelector(`#dl-${id}`);
        state.picks[id] = { deadline: sel ? Number(sel.value) : null };
        announce(`${M.OPP[id].title} добавлено в план`);
      }
      save(); viewMatches();
      const again = app.querySelector(`[data-pick="${id}"]`); if (again) again.focus();
    }));
  }

  /* ---------- План ---------- */
  function viewPlan() {
    if (!state.profile) { location.hash = '#profile'; return; }
    const t = today();
    const ids = Object.keys(state.picks);
    if (!ids.length) {
      app.innerHTML = `<section class="card narrow"><h1>Мой план</h1><p>Пока пусто. Добавь 1–3 возможности — и здесь появится пошаговый план с датами.</p><a class="btn primary" href="#matches">Выбрать возможности</a></section>`;
      return;
    }
    const plan = M.buildPlan(state.profile, state.picks, t);
    const next = M.nextAction(plan, state.done, t);
    const overdue = s => !state.done[s.id] && s.date < t;

    // Группировка по неделям; просроченные — отдельно сверху
    const groups = [];
    const late = plan.steps.filter(overdue);
    if (late.length) groups.push({ title: 'Просрочено', steps: late });
    const rest = plan.steps.filter(s => !overdue(s));
    const thisWeek = M.date.iso(M.weekStart(t));
    const nextWeek = M.date.iso(M.date.addDays(M.weekStart(t), 7));
    rest.forEach(s => {
      const k = M.date.iso(M.weekStart(s.date));
      const title = k === thisWeek ? 'Эта неделя' : k === nextWeek ? 'Следующая неделя' : `Неделя с ${M.fmt(M.weekStart(s.date))}`;
      const g = groups.find(x => x.key === k) || (groups.push({ key: k, title, steps: [] }), groups[groups.length - 1]);
      g.steps.push(s);
    });

    const stepRow = s => {
      const o = M.OPP[s.opp];
      const d = state.done[s.id];
      return `<div class="step ${d ? 'done' : ''} ${overdue(s) ? 'overdue' : ''} ${s.deadline ? 'is-deadline' : ''}">
        <input type="checkbox" id="c-${esc(s.id)}" data-done="${esc(s.id)}" ${d ? 'checked' : ''}>
        <label for="c-${esc(s.id)}"><span class="t">${esc(s.text)}</span><br><span class="meta"><span class="dot" style="background:${colorOf(s.opp)}" aria-hidden="true"></span>${esc(o.title)}${s.moved ? ' · сжато под текущую дату' : ''}${s.manual ? ' · перенесено вами' : ''}</span></label>
        <span class="date">${s.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
      </div>`;
    };

    app.innerHTML = `
      <h1>Мой план</h1>
      <div class="plan-top">
        <section class="today" aria-live="polite">
          ${next ? `<div class="eyebrow">${next.date < t ? 'Просрочено — сделай сегодня' : M.date.daysBetween(t, next.date) === 0 ? 'Сделай сегодня' : 'Следующий шаг'}</div>
            <h2>${esc(next.text)}</h2>
            <div>${esc(M.OPP[next.opp].title)} · ${M.fmt(next.date)}</div>
            <button class="btn" data-done="${esc(next.id)}" data-quick="1">Готово ✓</button>
            ${(() => { const wk = plan.steps.filter(s => !state.done[s.id] && s.id !== next.id && M.date.iso(M.weekStart(s.date)) === thisWeek).length; return wk ? `<div class="more">Ещё ${wk} ${M.plural(wk, 'шаг', 'шага', 'шагов')} на этой неделе</div>` : ''; })()}` : '<div class="eyebrow">Все шаги выполнены</div><h2>План закрыт. Отличная работа!</h2>'}
        </section>
        <section class="card" style="margin:0">
          <h2>Цели</h2>
          <ul class="goals-list">${plan.items.map(it => {
            const pr = M.progress(it, state.done);
            const o = it.opp;
            return `<li>
              <div class="goal-row"><b><span class="dot" style="background:${colorOf(o.id)}" aria-hidden="true"></span>${esc(o.title)}</b><button class="btn ghost small" data-remove="${o.id}" aria-label="Убрать ${esc(o.title)} из плана">Убрать</button></div>
              <div class="small muted">${it.deadline ? `${esc(it.deadline.label)}: ${M.fmt(M.date.parse(it.deadline.date))}${it.deadline.exact ? '' : ' (ориентировочно)'}` : 'Срок не опубликован'} · ${pr.d} из ${pr.n}</div>
              <div class="bar" role="progressbar" aria-valuenow="${pr.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Прогресс: ${esc(o.title)}"><i style="width:${pr.pct}%"></i></div>
              ${!o.deadlines.length || !it.deadline || it.deadline.manual ? `<div class="manual"><label class="small" for="md-${o.id}">${it.deadline && it.deadline.manual ? 'Изменить дату' : 'Указать дедлайн, когда его объявят'}</label><input type="date" id="md-${o.id}" data-manual="${o.id}" value="${state.picks[o.id].manualDate || ''}" min="${M.date.iso(t)}"></div>` : ''}
            </li>`;
          }).join('')}</ul>
        </section>
      </div>
      ${plan.warnings.length ? `<ul class="warns" aria-label="Предупреждения">${plan.warnings.map(w => `<li>${esc(w.text)}${w.alt != null ? ` <button class="btn small" data-alt="${w.opp}" data-idx="${w.alt}">Перейти на ${esc(M.OPP[w.opp].deadlines[w.alt].label)}</button>` : ''}</li>`).join('')}</ul>` : ''}
      <div class="row no-print" style="margin-bottom:18px">
        <button class="btn primary" id="ics" ${plan.steps.length ? '' : 'disabled'}>📅 Добавить все шаги в календарь</button>
        <button class="btn" id="print">🖨 Распечатать для родителей / учителя</button>
      </div>
      <p class="small muted">Сроки шагов — рекомендуемый запас до дедлайна, а не требования организаторов. Официальный дедлайн всегда сверяй по ссылке-источнику.</p>
      ${groups.map(g => `<section class="week"><h3>${esc(g.title)}</h3>${g.steps.map(stepRow).join('')}</section>`).join('')}`;

    const toggle = id => { if (state.done[id]) delete state.done[id]; else state.done[id] = true; save(); viewPlan(); announce(state.done[id] ? 'Шаг выполнен' : 'Отметка снята'); };
    app.querySelectorAll('input[data-done]').forEach(c => c.addEventListener('change', () => toggle(c.dataset.done)));
    app.querySelectorAll('button[data-quick]').forEach(b => b.addEventListener('click', () => toggle(b.dataset.done)));
    app.querySelectorAll('[data-alt]').forEach(b => b.addEventListener('click', () => {
      state.picks[b.dataset.alt].deadline = Number(b.dataset.idx); save(); viewPlan();
      announce(`Срок изменён: ${M.OPP[b.dataset.alt].deadlines[Number(b.dataset.idx)].label}`);
    }));
    app.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { delete state.picks[b.dataset.remove]; save(); viewPlan(); announce('Убрано из плана'); }));
    app.querySelectorAll('[data-manual]').forEach(inp => inp.addEventListener('change', () => {
      const v = inp.value;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) state.picks[inp.dataset.manual].manualDate = v; else delete state.picks[inp.dataset.manual].manualDate;
      save(); viewPlan();
    }));
    const ics = app.querySelector('#ics');
    if (ics) ics.addEventListener('click', () => {
      const blob = new Blob([M.toICS(plan)], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'maqsat-plan.ics'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      announce('Файл календаря скачан. Открой его — шаги добавятся с напоминаниями.');
    });
    app.querySelector('#print').addEventListener('click', () => window.print());
  }

  /* ---------- Откуда данные ---------- */
  function viewData() {
    app.innerHTML = `
      <section class="card">
        <h1>Откуда данные</h1>
        <p>Кейс финала требует: «не выдавайте предполагаемые результаты и синтетические данные за реальные». Поэтому в Maqsat три уровня достоверности, и они видны прямо в карточках:</p>
        <ul>
          <li><b>Без пометки</b> — сверено с официальным сайтом организатора ${M.fmt(M.date.parse(M.VERIFIED))}.</li>
          <li><span class="conf conf-secondary">уточните</span> — по открытым источникам или СМИ; проверьте на официальном сайте перед подачей.</li>
          <li><span class="conf conf-estimate">наша оценка</span> — организатор не называет конкретного значения (например, уровень английского), и это наш ориентир.</li>
          <li><span class="est">ориентировочно</span> — дедлайн нового цикла ещё не объявлен; показываем дату по прошлому циклу и пишем, на чём она основана.</li>
        </ul>
        <p>Если срок не опубликован вовсе, мы не придумываем его: в плане можно указать дату самому, когда её объявят.</p>
      </section>
      <section class="card">
        <h2>Все возможности в базе (${M.OPPORTUNITIES.length})</h2>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Возможность</th><th>Дедлайн</th><th>Источник</th></tr></thead>
          <tbody>${M.OPPORTUNITIES.map(o => `<tr>
            <td><b>${esc(o.title)}</b><br><span class="small muted">${esc(o.kind)}</span></td>
            <td>${o.deadlines.length ? o.deadlines.map(d => `${esc(d.label)}: ${M.fmt(M.date.parse(d.date))}${d.exact ? ' <span class="small" style="color:var(--ok)">официально</span>' : ` <span class="est">ориентировочно</span><br><span class="tiny muted">${esc(d.basis || '')}</span>`}`).join('<br>') : esc(o.rolling || o.unknownDeadline || 'не опубликован')}</td>
            <td><a href="${esc(o.source.url)}" target="_blank" rel="noopener">${esc(o.source.name)}</a></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  }

  /* ---------- Роутер ---------- */
  function route() {
    const view = (location.hash.replace('#', '') || 'home').split('/')[0];
    document.querySelectorAll('[data-nav]').forEach(a => {
      const on = a.dataset.nav === view;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (view === 'profile') viewProfile();
    else if (view === 'matches') viewMatches();
    else if (view === 'plan') viewPlan();
    else if (view === 'data') viewData();
    else if (view === 'demo') { state.profile = Object.assign({}, DEMO); save(); location.hash = '#matches'; return; }
    else viewHome();
    window.scrollTo(0, 0);
    const h = app.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    updateBadge();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
