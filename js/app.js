/*
 * Maqsat — интерфейс: профиль → возможности → план → календарь.
 * Данные хранятся только на устройстве (localStorage), без регистрации и сервера.
 * Все тексты интерфейса проходят через t() — русский или казахский (js/i18n.js).
 */
(function () {
  const M = window.M;
  const t = M.t;
  const app = document.getElementById('app');
  const live = document.getElementById('live');
  const KEY = 'maqsat.v1';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const announce = msg => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 50); };
  const short = d => M.fmtShort(d);
  const ru = (n, a, b, c) => M.plural(n, a, b, c);

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
      if (s && typeof s === 'object') return { profile: s.profile || null, picks: s.picks || {}, done: s.done || {}, metrics: s.metrics || {} };
    } catch (e) { /* повреждённые данные или приватный режим */ }
    return { profile: null, picks: {}, done: {}, metrics: {} };
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

  /* Юзабилити-замер: время от открытия профиля до первой цели в плане (для тестов с пользователями). */
  function markStart() { if (!state.metrics.start) { state.metrics.start = Date.now(); save(); } }
  function markFirstGoal() {
    if (!state.metrics.start || state.metrics.firstGoal) return false;
    state.metrics.firstGoal = Date.now(); save(); return true;
  }
  const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const COLORS = ['#2f3fbf', '#0c7a5c', '#b3312f', '#9a5200', '#5b48c9', '#0b6e99', '#8a3b8f', '#3d6b1f', '#b0475f', '#446078', '#7a5c00', '#1f7a7a', '#6b4e2e'];
  const colorOf = id => COLORS[M.OPPORTUNITIES.findIndex(o => o.id === id) % COLORS.length];

  const DEMO = { birthYear: 2010, birthMonth: 3, status: 'g10', kz: true, english: 2, ielts: null, avg: 4.6, city: 'almaty', interests: ['abroad', 'summer', 'olymp'], onlyFree: false };

  /* Пометка для казахского интерфейса: описания программ пока на русском. */
  const kkNote = () => (M.lang === 'kk' ? `<p class="small muted">${t('Описания программ пока на русском. В каждой карточке — ссылка на официальный источник.')}</p>` : '');

  /* ---------- Главная ---------- */
  function viewHome() {
    app.innerHTML = `
      <section class="hero">
        <h1>${t('От возможности — к результату')}</h1>
        <p class="lead">${t('Олимпиады, стипендии, летние и обменные программы, бесплатные IT-школы. Maqsat за минуту подберёт то, что подходит именно тебе, покажет, чего не хватает, и построит план назад от дедлайна — чтобы не узнать о конкурсе после закрытия регистрации.')}</p>
        <div class="row">
          <a class="btn primary" href="#profile">${state.profile ? t('Изменить профиль') : t('Заполнить профиль — 1 минута')}</a>
          ${state.profile ? `<a class="btn" href="#matches">${t('Мои возможности')}</a>` : `<button class="btn" id="demo">${t('Посмотреть на примере')}</button>`}
        </div>
      </section>
      <section class="pillars" aria-label="${t('Как это работает')}">
        <div class="pillar"><span class="num">1</span><b>${t('Подбор с проверкой условий')}</b><p>${t('Не просто список: для каждой возможности видно, подходишь ли ты по возрасту, классу, языку и баллу — и чего именно не хватает.')}</p></div>
        <div class="pillar"><span class="num">2</span><b>${t('План назад от дедлайна')}</b><p>${t('Когда записываться на IELTS, когда просить рекомендации, когда сдавать эссе. Если два дедлайна наложились — предупредим.')}</p></div>
        <div class="pillar"><span class="num">3</span><b>${t('Напоминания в телефоне')}</b><p>${t('Один файл — и все шаги с напоминаниями в Google/Apple Календаре. Отмечай выполненное и видь прогресс.')}</p></div>
      </section>
      <section class="trust">
        <b>${t('Мы не выдумываем даты.')}</b> ${t('У каждой возможности — ссылка на первоисточник и дата проверки. Если организатор ещё не объявил срок нового цикла, мы пишем «ориентировочно» и показываем, на чём основана оценка.')} <a href="#data">${t('Как мы проверяем данные →')}</a>
      </section>`;
    const d = app.querySelector('#demo');
    if (d) d.addEventListener('click', () => { state.profile = Object.assign({}, DEMO); save(); location.hash = '#matches'; });
  }

  /* ---------- Профиль ---------- */
  function viewProfile() {
    markStart();
    const p = state.profile || { birthYear: 2010, birthMonth: 1, status: 'g10', kz: true, english: 1, ielts: null, avg: null, city: 'other', interests: [], onlyFree: false };
    const years = []; for (let y = 2014; y >= 1996; y--) years.push(y);
    const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    app.innerHTML = `
      <section class="card narrow">
        <h1>${t('Профиль')}</h1>
        <p class="muted">${t('Нужен только для подбора. Хранится на твоём устройстве — никуда не отправляется, регистрации нет.')}</p>
        <form id="pf" novalidate>
          <div class="two">
            <label class="field"><span>${t('Месяц рождения')}</span><select name="birthMonth">${months.map((m, i) => `<option value="${i + 1}" ${p.birthMonth === i + 1 ? 'selected' : ''}>${t(m)}</option>`).join('')}</select></label>
            <label class="field"><span>${t('Год рождения')}</span><select name="birthYear">${years.map(y => `<option ${p.birthYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span>${t('Где учишься сейчас')}</span><select name="status">${M.STATUSES.map(s => `<option value="${s.id}" ${p.status === s.id ? 'selected' : ''}>${t(s.label)}</option>`).join('')}</select></label>
          <div class="two">
            <label class="field"><span>${t('Английский')}</span><select name="english">${M.ENGLISH.map(e => `<option value="${e.id}" ${p.english === e.id ? 'selected' : ''}>${t(e.label)}</option>`).join('')}</select></label>
            <label class="field"><span>IELTS <span class="hint">${t('(если сдавал)')}</span></span><input type="number" name="ielts" min="1" max="9" step="0.5" inputmode="decimal" value="${p.ielts == null ? '' : p.ielts}" placeholder="${t('например, 6.0')}"></label>
          </div>
          <div class="two">
            <label class="field"><span>${t('Средний балл')} <span class="hint">${t('(из 5, необязательно)')}</span></span><input type="number" name="avg" min="2" max="5" step="0.1" inputmode="decimal" value="${p.avg == null ? '' : p.avg}" placeholder="${t('например, 4.5')}"></label>
            <label class="field"><span>${t('Город')}</span><select name="city">${M.CITIES.map(c => `<option value="${c.id}" ${p.city === c.id ? 'selected' : ''}>${t(c.label)}</option>`).join('')}</select></label>
          </div>
          <label class="switch"><input type="checkbox" name="school12" ${p.school12 ? 'checked' : ''}> ${t('В моей школе 12 классов (например, НИШ)')}</label>
          <label class="switch"><input type="checkbox" name="kz" ${p.kz ? 'checked' : ''}> ${t('Гражданство или ВНЖ Казахстана')}</label>
          <fieldset>
            <legend>${t('Что тебе интересно')} <span class="hint">${t('(можно несколько)')}</span></legend>
            <div class="chips">${M.INTERESTS.map(i => `<label class="chip-check"><input type="checkbox" name="interests" value="${i.id}" ${(p.interests || []).includes(i.id) ? 'checked' : ''}><span>${t(i.label)}</span></label>`).join('')}</div>
          </fieldset>
          <label class="switch"><input type="checkbox" name="onlyFree" ${p.onlyFree ? 'checked' : ''}> ${t('Только бесплатные или с финансовой поддержкой')}</label>
          <p id="err" class="small" role="alert" style="color:var(--bad)"></p>
          <button class="btn primary" type="submit">${t('Подобрать возможности')}</button>
        </form>
      </section>`;
    app.querySelector('#pf').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const num = (v, min, max) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= min && n <= max ? n : NaN; };
      const ielts = num(f.get('ielts'), 1, 9);
      const avg = num(f.get('avg'), 2, 5);
      const err = app.querySelector('#err');
      if (Number.isNaN(ielts)) { err.textContent = t('IELTS — число от 1 до 9, например 6.0'); return; }
      if (Number.isNaN(avg)) { err.textContent = t('Средний балл — число от 2 до 5, например 4.5'); return; }
      state.profile = {
        birthYear: Number(f.get('birthYear')), birthMonth: Number(f.get('birthMonth')), status: f.get('status'),
        kz: !!f.get('kz'), school12: !!f.get('school12') || f.get('status') === 'g12', english: Number(f.get('english')), ielts, avg, city: f.get('city'),
        interests: f.getAll('interests'), onlyFree: !!f.get('onlyFree')
      };
      save();
      location.hash = '#matches';
    });
  }

  /* ---------- Возможности ---------- */
  let filter = 'all';

  function deadlineBlock(r) {
    const o = r.opp;
    if (r.deadline) {
      const d = M.date.parse(r.deadline.date);
      const soon = r.daysLeft != null && r.daysLeft <= 21;
      return `<div class="dl ${soon ? 'soon' : ''}">
        <span>${esc(r.deadline.label)}:</span> <b>${M.fmt(d)}</b>
        <span class="left">${r.daysLeft === 0 ? t('сегодня') : t('через {n} {what}', { n: r.daysLeft, what: ru(r.daysLeft, 'день', 'дня', 'дней') })}</span>
        ${r.deadline.exact ? '' : `<span class="est" title="${esc(r.deadline.basis || '')}">${t('ориентировочно')}</span><span class="tiny muted" style="flex-basis:100%">${esc(r.deadline.basis || '')}</span>`}
      </div>`;
    }
    if (o.rolling) return `<div class="dl"><b>${t('Набор открыт')}</b><span class="tiny muted" style="flex-basis:100%">${esc(o.rolling)}</span></div>`;
    return `<div class="dl none"><b>${t('Срок не опубликован')}</b><span class="tiny muted" style="flex-basis:100%">${esc(o.unknownDeadline || '')}</span></div>`;
  }

  function confTag(c) {
    if (c === 'secondary') return `<span class="conf conf-secondary" title="${t('По открытым источникам — уточните на официальном сайте')}">${t('уточните')}</span>`;
    if (c === 'estimate') return `<span class="conf conf-estimate" title="${t('Организатор не называет точный уровень — это наша оценка')}">${t('наша оценка')}</span>`;
    return '';
  }
  const ICON = { ok: '✓', gap: '△', warn: '!', hard: '✗' };

  /* Сообщение об ошибке в карточке — через GitHub Issues. В ссылке только данные карточки, без профиля пользователя. */
  function reportUrl(o) {
    const title = `Ошибка в карточке: ${o.title}`;
    const body = `Возможность: ${o.title} (${o.id})\nИсточник в карточке: ${o.source.url}\nПроверено: ${M.VERIFIED}\n\nЧто неверно:\n\nСсылка, где указано правильно:\n`;
    return `${M.REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }

  function oppCard(r) {
    const o = r.opp;
    const picked = !!state.picks[o.id];
    const gaps = r.checks.filter(c => c.level === 'gap').length;
    const statusText = r.status === 'fit' ? t('✓ Подходишь')
      : r.status === 'almost' ? t('△ Почти: {n} {what}', { n: gaps, what: ru(gaps, 'пробел', 'пробела', 'пробелов') })
      : r.status === 'later' ? t('⏳ Станет доступно в {year}', { year: r.laterYear }) : t('✗ Не подходит');
    const canPick = r.status === 'fit' || r.status === 'almost';
    const canPlanLater = r.status === 'later' && r.laterShift && o.deadlines.length;
    const multi = o.deadlineChoice && o.deadlines.filter(d => M.date.parse(d.date) >= today()).length > 1;
    return `<article class="opp" aria-labelledby="t-${o.id}">
      <div class="opp-head">
        <span class="status st-${r.status}">${statusText}</span>
        ${r.status === 'later' && o.laterCondition ? `<div class="small muted" style="margin:-4px 0 6px">— ${esc(o.laterCondition)}</div>` : ''}
        <h3 id="t-${o.id}">${esc(o.title)}</h3>
        <div class="org">${esc(o.org)}</div>
        <div class="tags"><span class="tag">${esc(o.kind)}</span><span class="tag">${esc(o.place)}</span>${o.free === true ? `<span class="tag free">${t('Бесплатно')}</span>` : ''}</div>
      </div>
      <div class="opp-body">
        ${deadlineBlock(r)}
        ${o.cost ? `<p class="cost"><b>${t('Стоимость:')}</b> ${esc(o.cost.text)}${confTag(o.cost.conf)}</p>` : ''}
        <ul class="checks">${r.checks.map(c => `<li class="lv-${c.level}"><span class="i" aria-hidden="true">${ICON[c.level]}</span><span>${esc(c.text)}${confTag(c.conf)}</span></li>`).join('')}</ul>
        <details class="more"><summary>${t('Подробнее и как проходит отбор')}</summary>
          <p>${esc(o.summary)}</p>
          ${o.aid ? `<p><b>${t('Деньги:')}</b> ${esc(o.aid)}</p>` : ''}
          <p><b>${t('Отбор:')}</b> ${esc(o.selection)}</p>
          ${o.req && o.req.note ? `<p class="small muted">${esc(o.req.note.text)}${confTag(o.req.note.conf)}</p>` : ''}
        </details>
      </div>
      <div class="opp-foot">
        <span class="src">${t('Источник:')} <a href="${esc(o.source.url)}" target="_blank" rel="noopener">${esc(o.source.name)}</a> · ${t('проверено {date}', { date: M.fmt(M.date.parse(M.VERIFIED)) })} · <a href="${esc(reportUrl(o))}" target="_blank" rel="noopener">${t('Нашли ошибку?')}</a></span>
        ${canPick ? `<div class="row">
          ${multi && !picked ? `<label class="sr-only" for="dl-${o.id}">${t('Какой срок')}</label><select id="dl-${o.id}" class="small" style="width:auto;min-height:38px">${o.deadlines.map((d, i) => M.date.parse(d.date) >= today() ? `<option value="${i}">${esc(d.label)} — ${M.fmt(M.date.parse(d.date))}</option>` : '').join('')}</select>` : ''}
          <button class="btn small ${picked ? '' : 'primary'}" data-pick="${o.id}" aria-pressed="${picked}">${picked ? t('✓ В плане') : t('+ В мой план')}</button>
        </div>` : ''}
        ${canPlanLater ? `<button class="btn small ${picked ? '' : 'primary'}" data-pick="${o.id}" data-shift="${r.laterShift}" aria-pressed="${picked}">${picked ? t('✓ Цель на {year}', { year: r.laterYear }) : t('+ Цель на {year}', { year: r.laterYear })}</button>` : ''}
      </div>
    </article>`;
  }

  function viewMatches() {
    if (!state.profile) { location.hash = '#profile'; return; }
    const tdy = today();
    const res = M.matchAll(state.profile, tdy, state.picks);
    const count = s => res.filter(r => r.status === s).length;
    const shown = res.filter(r => filter === 'all' ? r.status !== 'no' : r.status === filter);
    app.innerHTML = `
      <h1>${t('Возможности для тебя')}</h1>
      <p class="muted">${t('Проверили {n} {what} по твоему профилю.', { n: res.length, what: ru(res.length, 'возможность', 'возможности', 'возможностей') })} <a href="#profile">${t('Изменить профиль')}</a></p>
      ${kkNote()}
      <div class="summary" role="group" aria-label="${t('Фильтр')}">
        ${[['all', t('Все · {n}', { n: res.length - count('no') })], ['fit', t('Подходишь · {n}', { n: count('fit') })], ['almost', t('Почти · {n}', { n: count('almost') })], ['later', t('Позже · {n}', { n: count('later') })], ['no', t('Не подходит · {n}', { n: count('no') })]]
          .map(([k, l]) => `<button class="filter" data-f="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}
      </div>
      ${shown.length ? `<div class="opps">${shown.map(oppCard).join('')}</div>` : `<p class="card">${t('В этой группе пусто.')}</p>`}`;
    announce(t('Найдено: подходишь — {a}, почти — {b}, позже — {c}', { a: count('fit'), b: count('almost'), c: count('later') }));
    app.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; viewMatches(); }));
    app.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.pick;
      if (state.picks[id]) { delete state.picks[id]; announce(t('Убрано из плана')); }
      else {
        const sel = app.querySelector(`#dl-${id}`);
        state.picks[id] = b.dataset.shift ? { shift: Number(b.dataset.shift) } : { deadline: sel ? Number(sel.value) : null };
        state.metrics.goal = state.metrics.goal || id;
        if (markFirstGoal() && state.metrics.test) { save(); location.hash = '#test-done'; return; }
        announce(t('{title} добавлено в план', { title: M.OPP[id].title }));
      }
      save(); viewMatches();
      const again = app.querySelector(`[data-pick="${id}"]`); if (again) again.focus();
    }));
  }

  /* ---------- План ---------- */
  function viewPlan() {
    if (!state.profile) { location.hash = '#profile'; return; }
    const tdy = today();
    const ids = Object.keys(state.picks);
    if (!ids.length) {
      app.innerHTML = `<section class="card narrow"><h1>${t('Мой план')}</h1><p>${t('Пока пусто. Добавь 1–3 возможности — и здесь появится пошаговый план с датами.')}</p><a class="btn primary" href="#matches">${t('Выбрать возможности')}</a></section>`;
      return;
    }
    const plan = M.buildPlan(state.profile, state.picks, tdy);
    const next = M.nextAction(plan, state.done, tdy);
    const overdue = s => !state.done[s.id] && s.date < tdy;

    // Группировка: просроченные сверху, ближайшие 8 недель — по неделям, дальше — по месяцам
    const groups = [];
    const late = plan.steps.filter(overdue);
    if (late.length) groups.push({ title: t('Просрочено'), steps: late });
    const rest = plan.steps.filter(s => !overdue(s));
    const thisWeek = M.date.iso(M.weekStart(tdy));
    const nextWeek = M.date.iso(M.date.addDays(M.weekStart(tdy), 7));
    rest.forEach(s => {
      const far = M.date.daysBetween(tdy, s.date) > 56;
      const k = far ? `m${s.date.getFullYear()}-${s.date.getMonth()}` : M.date.iso(M.weekStart(s.date));
      const title = far ? M.fmtMonth(s.date) : k === thisWeek ? t('Эта неделя') : k === nextWeek ? t('Следующая неделя') : t('Неделя с {date}', { date: M.fmt(M.weekStart(s.date)) });
      const g = groups.find(x => x.key === k) || (groups.push({ key: k, title, steps: [] }), groups[groups.length - 1]);
      g.steps.push(s);
    });

    const stepRow = s => {
      const o = M.OPP[s.opp];
      const d = state.done[s.id];
      return `<div class="step ${d ? 'done' : ''} ${overdue(s) ? 'overdue' : ''} ${s.deadline ? 'is-deadline' : ''}">
        <input type="checkbox" id="c-${esc(s.id)}" data-done="${esc(s.id)}" ${d ? 'checked' : ''}>
        <label for="c-${esc(s.id)}"><span class="t">${esc(s.text)}</span>${s.school ? ` <span class="pill school">${t('🏫 через школу')}</span>` : ''}${s.custom ? ` <span class="pill mine">${t('ваша задача')}</span>` : ''}<br><span class="meta"><span class="dot" style="background:${colorOf(s.opp)}" aria-hidden="true"></span>${esc(o.title)}${s.moved ? t(' · сжато под текущую дату') : ''}${s.manual ? t(' · перенесено вами') : ''}${s.post ? t(' · после подачи заявки') : ''}</span></label>
        <span class="date">${short(s.date)}${s.custom ? `<br><button class="btn ghost small" data-delc="${esc(s.opp)}" data-cid="${esc(s.cid)}" aria-label="${esc(t('Удалить задачу {text}', { text: s.text }))}">${t('удалить')}</button>` : ''}</span>
      </div>`;
    };

    const moreThisWeek = next ? plan.steps.filter(s => !state.done[s.id] && s.id !== next.id && M.date.iso(M.weekStart(s.date)) === thisWeek).length : 0;
    app.innerHTML = `
      <h1>${t('Мой план')}</h1>
      <div class="plan-top">
        <section class="today" aria-live="polite">
          ${next ? `<div class="eyebrow">${next.date < tdy ? t('Просрочено — сделай сегодня') : M.date.daysBetween(tdy, next.date) === 0 ? t('Сделай сегодня') : t('Следующий шаг')}</div>
            <h2>${esc(next.text)}</h2>
            <div>${esc(M.OPP[next.opp].title)} · ${M.fmt(next.date)}${next.school ? t(' · 🏫 нужно обратиться в школу') : ''}</div>
            <button class="btn" data-done="${esc(next.id)}" data-quick="1">${t('Готово ✓')}</button>
            ${moreThisWeek ? `<div class="more">${t('Ещё {n} {what} на этой неделе', { n: moreThisWeek, what: ru(moreThisWeek, 'шаг', 'шага', 'шагов') })}</div>` : ''}`
          : `<div class="eyebrow">${t('Все шаги выполнены')}</div><h2>${t('План закрыт. Отличная работа!')}</h2>`}
        </section>
        <section class="card" style="margin:0">
          <h2>${t('Цели')}</h2>
          <ul class="goals-list">${plan.items.map(it => {
            const pr = M.progress(it, state.done);
            const o = it.opp;
            const pick = state.picks[o.id];
            const dlText = it.deadline ? `${esc(it.deadline.label)}: ${M.fmt(M.date.parse(it.deadline.date))}${it.deadline.exact ? '' : it.deadline.future ? t(' (прогноз)') : t(' (ориентировочно)')}` : t('Срок не опубликован');
            return `<li>
              <div class="goal-row"><b><span class="dot" style="background:${colorOf(o.id)}" aria-hidden="true"></span>${esc(o.title)}</b><button class="btn ghost small" data-remove="${o.id}" aria-label="${esc(t('Убрать {title} из плана', { title: o.title }))}">${t('Убрать')}</button></div>
              ${it.future ? `<span class="pill mine">${t('долгосрочная цель')}</span>` : ''}
              <div class="small muted">${dlText} · ${t('{d} из {n}', { d: pr.d, n: pr.n })}</div>
              <div class="bar" role="progressbar" aria-valuenow="${pr.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(t('Прогресс: {title}', { title: o.title }))}"><i style="width:${pr.pct}%"></i></div>
              <div class="row" style="margin-top:8px">
                <button class="btn small" data-submitted="${o.id}" aria-pressed="${!!pick.submitted}">${pick.submitted ? t('✓ Заявка отправлена {date}', { date: short(M.date.parse(pick.submitted)) }) : t('Отметить: заявка отправлена')}</button>
              </div>
              <details class="add-task"><summary>${t('+ Своя задача')}</summary>
                <form class="manual" data-addtask="${o.id}">
                  <label class="small" for="tt-${o.id}">${t('Что сделать')}</label><input id="tt-${o.id}" name="text" maxlength="120" required placeholder="${t('например, спросить выпускника про собеседование')}">
                  <label class="small" for="td-${o.id}">${t('Когда')}</label><input id="td-${o.id}" name="date" type="date" required min="${M.date.iso(tdy)}">
                  <button class="btn small primary" type="submit">${t('Добавить')}</button>
                </form>
              </details>
              ${!o.deadlines.length || !it.deadline || it.deadline.manual ? `<div class="manual"><label class="small" for="md-${o.id}">${it.deadline && it.deadline.manual ? t('Изменить дату') : t('Указать дедлайн, когда его объявят')}</label><input type="date" id="md-${o.id}" data-manual="${o.id}" value="${pick.manualDate || ''}" min="${M.date.iso(tdy)}"></div>` : ''}
            </li>`;
          }).join('')}</ul>
        </section>
      </div>
      ${plan.warnings.length ? `<ul class="warns" aria-label="${t('Предупреждения')}">${plan.warnings.map(w => `<li>${esc(w.text)}${w.alt != null ? ` <button class="btn small" data-alt="${w.opp}" data-idx="${w.alt}">${esc(t('Перейти на {label}', { label: M.OPP[w.opp].deadlines[w.alt].label }))}</button>` : ''}</li>`).join('')}</ul>` : ''}
      <div class="row no-print" style="margin-bottom:18px">
        <button class="btn primary" id="ics" ${plan.steps.length ? '' : 'disabled'}>${t('📅 Добавить все шаги в календарь')}</button>
        <button class="btn" id="print">${t('🖨 Распечатать для родителей / учителя')}</button>
      </div>
      <p class="small muted">${t('Сроки шагов — рекомендуемый запас до дедлайна, а не требования организаторов. Официальный дедлайн всегда сверяй по ссылке-источнику.')}</p>
      ${groups.map(g => `<section class="week"><h3>${esc(g.title)}</h3>${g.steps.map(stepRow).join('')}</section>`).join('')}`;

    const toggle = id => { if (state.done[id]) delete state.done[id]; else state.done[id] = true; save(); viewPlan(); announce(state.done[id] ? t('Шаг выполнен') : t('Отметка снята')); };
    app.querySelectorAll('input[data-done]').forEach(c => c.addEventListener('change', () => toggle(c.dataset.done)));
    app.querySelectorAll('button[data-quick]').forEach(b => b.addEventListener('click', () => toggle(b.dataset.done)));
    app.querySelectorAll('[data-alt]').forEach(b => b.addEventListener('click', () => {
      state.picks[b.dataset.alt].deadline = Number(b.dataset.idx); save(); viewPlan();
      announce(t('Срок изменён: {label}', { label: M.OPP[b.dataset.alt].deadlines[Number(b.dataset.idx)].label }));
    }));
    app.querySelectorAll('[data-submitted]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.submitted;
      const pick = state.picks[id];
      if (pick.submitted) { delete pick.submitted; announce(t('Отметка снята')); }
      else {
        pick.submitted = M.date.iso(tdy);
        // Подготовка до дедлайна больше не нужна — закрываем эти шаги; шаги после подачи (отбор) остаются
        const it = plan.items.find(x => x.opp.id === id);
        if (it) M.preSubmitSteps(it).forEach(s => { state.done[s.id] = true; });
        announce(t('Заявка отмечена как отправленная'));
      }
      save(); viewPlan();
    }));
    app.querySelectorAll('[data-addtask]').forEach(f => f.addEventListener('submit', e => {
      e.preventDefault();
      const id = f.dataset.addtask;
      const text = f.elements.text.value.trim(); const date = f.elements.date.value;
      if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const pick = state.picks[id];
      pick.custom = (pick.custom || []).concat([{ id: String(Date.now()), text: text.slice(0, 120), date }]);
      save(); viewPlan(); announce(t('Задача добавлена'));
    }));
    app.querySelectorAll('[data-delc]').forEach(b => b.addEventListener('click', () => {
      const pick = state.picks[b.dataset.delc];
      pick.custom = (pick.custom || []).filter(c => c.id !== b.dataset.cid);
      save(); viewPlan(); announce(t('Задача удалена'));
    }));
    app.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { delete state.picks[b.dataset.remove]; save(); viewPlan(); announce(t('Убрано из плана')); }));
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
      announce(t('Файл календаря скачан. Открой его — шаги добавятся с напоминаниями.'));
    });
    app.querySelector('#print').addEventListener('click', () => window.print());
  }

  /* ---------- Откуда данные ---------- */
  function viewData() {
    const m = state.metrics;
    const spent = m.start && m.firstGoal ? Math.round((m.firstGoal - m.start) / 1000) : null;
    app.innerHTML = `
      <section class="card">
        <h1>${t('Откуда данные')}</h1>
        <p>${t('Кейс финала требует: «не выдавайте предполагаемые результаты и синтетические данные за реальные». Поэтому в Maqsat три уровня достоверности, и они видны прямо в карточках:')}</p>
        <ul>
          <li><b>${t('Без пометки')}</b> ${t('— сверено с официальным сайтом организатора {date}.', { date: M.fmt(M.date.parse(M.VERIFIED)) })}</li>
          <li><span class="conf conf-secondary">${t('уточните')}</span> ${t('— по открытым источникам или СМИ; проверьте на официальном сайте перед подачей.')}</li>
          <li><span class="conf conf-estimate">${t('наша оценка')}</span> ${t('— организатор не называет конкретного значения (например, уровень английского), и это наш ориентир.')}</li>
          <li><span class="est">${t('ориентировочно')}</span> ${t('— дедлайн нового цикла ещё не объявлен; показываем дату по прошлому циклу и пишем, на чём она основана.')}</li>
        </ul>
        <p>${t('Если срок не опубликован вовсе, мы не придумываем его: в плане можно указать дату самому, когда её объявят.')}</p>
        ${kkNote()}
      </section>
      <section class="card">
        <h2>${t('Все возможности в базе ({n})', { n: M.OPPORTUNITIES.length })}</h2>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>${t('Возможность')}</th><th>${t('Дедлайн')}</th><th>${t('Источник')}</th></tr></thead>
          <tbody>${M.OPPORTUNITIES.map(o => `<tr>
            <td><b>${esc(o.title)}</b><br><span class="small muted">${esc(o.kind)}</span></td>
            <td>${o.deadlines.length ? o.deadlines.map(d => `${esc(d.label)}: ${M.fmt(M.date.parse(d.date))}${d.exact ? ` <span class="small" style="color:var(--ok)">${t('официально')}</span>` : ` <span class="est">${t('ориентировочно')}</span><br><span class="tiny muted">${esc(d.basis || '')}</span>`}`).join('<br>') : esc(o.rolling || o.unknownDeadline || t('не опубликован'))}</td>
            <td><a href="${esc(o.source.url)}" target="_blank" rel="noopener">${esc(o.source.name)}</a></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>
      <section class="card no-print">
        <h2>${t('Юзабилити-тест')}</h2>
        <p class="small muted">${t('Для проверки с пользователями: время от открытия профиля до первой цели в плане. Замер хранится только на этом устройстве.')}</p>
        <p><b>${spent == null ? t('Замера пока нет') : t('{m} мин {s} с', { m: Math.floor(spent / 60), s: spent % 60 })}</b></p>
        <button class="btn small" id="newtest">${t('Начать новый тест (очистить профиль и план)')}</button>
        <p class="small">${t('Тест на расстоянии: отправьте ученику ссылку ниже. Приложение само засечёт время, задаст 3 вопроса и предложит отправить результат вам.')}</p>
        <p class="small"><code>${esc(location.origin + location.pathname)}#test</code></p>
      </section>`;
    app.querySelector('#newtest').addEventListener('click', () => {
      state.profile = null; state.picks = {}; state.done = {}; state.metrics = {}; save();
      location.hash = '#home';
    });
  }

  /* ---------- Юзабилити-тест на расстоянии ----------
   * Ссылка …#test: ученик получает задание, приложение засекает время до первой цели в плане,
   * задаёт 3 вопроса и предлагает отправить результат организатору теста (Telegram, WhatsApp или копия текста).
   * Ничего не уходит на сервер — ученик сам решает, отправлять ли. */
  function viewTest() {
    app.innerHTML = `
      <section class="card narrow">
        <h1>${t('Тест приложения · 3–5 минут')}</h1>
        <p>${t('Мы проверяем приложение, а не тебя. Неправильных действий нет — если что-то непонятно, это наша ошибка, а не твоя.')}</p>
        <div class="trust"><b>${t('Задание')}:</b> ${t('найди программу, на которую ты можешь подать, и добавь её в план.')}</div>
        <p class="small muted">${t('Время пойдёт после нажатия кнопки. Заполняй профиль честно — он остаётся только на твоём телефоне.')}</p>
        <button class="btn primary" id="go">${t('Начать тест')}</button>
      </section>`;
    app.querySelector('#go').addEventListener('click', () => {
      state.profile = null; state.picks = {}; state.done = {};
      state.metrics = { test: true, id: 'T' + Math.random().toString(36).slice(2, 6).toUpperCase(), screens: 0 };
      save(); location.hash = '#profile';
    });
  }

  function testReport(m, f) {
    const status = state.profile ? M.STATUSES.find(s => s.id === state.profile.status) : null;
    return [
      'Maqsat · юзабилити-тест ' + m.id,
      'Время до первой цели: ' + mmss(Math.round((m.firstGoal - m.start) / 1000)),
      'Экранов пройдено: ' + (m.screens || 0),
      'Класс: ' + (status ? status.label : '—'),
      'Добавил(а) в план: ' + (m.goal && M.OPP[m.goal] ? M.OPP[m.goal].title : '—'),
      'Насколько легко (1–5): ' + (f.ease || '—'),
      'Что было непонятно: ' + (f.unclear || '—'),
      'Воспользовался(ась) бы: ' + (f.use || '—'),
      'Язык: ' + (M.lang === 'kk' ? 'қазақша' : 'русский') + ' · ' + (matchMedia('(max-width: 700px)').matches ? 'телефон' : 'компьютер'),
      'Дата: ' + M.date.iso(new Date())
    ].join('\n');
  }

  function viewTestDone() {
    const m = state.metrics;
    if (!m.test || !m.firstGoal) { location.hash = '#test'; return; }
    const sec = Math.round((m.firstGoal - m.start) / 1000);
    const f = m.feedback || {};
    app.innerHTML = `
      <section class="card narrow">
        <h1>${t('Готово! Спасибо')}</h1>
        <p>${t('Твоё время: {t}', { t: '' })}<b>${mmss(sec)}</b></p>
        <form id="fb">
          <fieldset class="field"><legend>${t('Насколько было легко? (1 — очень сложно, 5 — очень легко)')}</legend>
            <div class="row choice">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="ease" value="${n}" ${f.ease == n ? 'checked' : ''}> ${n}</label>`).join('')}</div>
          </fieldset>
          <label class="field"><span>${t('Что было непонятно или неудобно?')}</span><textarea name="unclear" rows="3">${esc(f.unclear || '')}</textarea></label>
          <fieldset class="field"><legend>${t('Воспользовался(ась) бы ты этим сам(а)?')}</legend>
            <div class="row choice">${[['да', t('да')], ['возможно', t('возможно')], ['нет', t('нет')]].map(([v, l]) => `<label><input type="radio" name="use" value="${v}" ${f.use === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>
          </fieldset>
          <p class="small muted">${t('Результат не уходит никуда автоматически — отправь его тому, кто дал тебе ссылку.')}</p>
          <div class="row">
            <button class="btn primary" type="button" data-send="share">${t('Отправить результат')}</button>
            <button class="btn" type="button" data-send="tg">Telegram</button>
            <button class="btn" type="button" data-send="wa">WhatsApp</button>
            <button class="btn" type="button" data-send="copy">${t('Скопировать')}</button>
          </div>
        </form>
        <p class="small"><a href="#plan">${t('Посмотреть свой план →')}</a></p>
      </section>`;
    const form = app.querySelector('#fb');
    const read = () => {
      const e = form.elements;
      m.feedback = { ease: e.ease.value, unclear: e.unclear.value.trim().slice(0, 500), use: e.use.value };
      save(); return testReport(m, m.feedback);
    };
    form.addEventListener('change', read);
    app.querySelectorAll('[data-send]').forEach(b => b.addEventListener('click', () => {
      const text = read(), how = b.dataset.send;
      const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => announce(t('Скопировано — вставь в чат'))).catch(() => { window.prompt(t('Скопируй текст:'), text); });
      if (how === 'share' && navigator.share) navigator.share({ text }).catch(() => {});
      else if (how === 'tg') window.open('https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname) + '&text=' + encodeURIComponent(text), '_blank', 'noopener');
      else if (how === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
      else copy();
    }));
  }

  /* ---------- Язык ---------- */
  function applyStatic() {
    document.documentElement.lang = M.lang === 'kk' ? 'kk' : 'ru';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
    const b = document.getElementById('lang');
    b.textContent = M.lang === 'kk' ? 'Русский' : 'Қазақша';
    b.setAttribute('lang', M.lang === 'kk' ? 'ru' : 'kk');
  }
  document.getElementById('lang').addEventListener('click', () => { M.setLang(M.lang === 'kk' ? 'ru' : 'kk'); route(); });

  /* ---------- Роутер ---------- */
  function route() {
    applyStatic();
    const view = (location.hash.replace('#', '') || 'home').split('/')[0];
    document.querySelectorAll('[data-nav]').forEach(a => {
      const on = a.dataset.nav === view;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (state.metrics.test && !state.metrics.firstGoal && view !== 'test') { state.metrics.screens = (state.metrics.screens || 0) + 1; save(); }
    if (view === 'profile') viewProfile();
    else if (view === 'matches') viewMatches();
    else if (view === 'plan') viewPlan();
    else if (view === 'data') viewData();
    else if (view === 'test') viewTest();
    else if (view === 'test-done') viewTestDone();
    else if (view === 'demo') { state.profile = Object.assign({}, DEMO); save(); location.hash = '#matches'; return; }
    else if (view === 'demo-plan') {
      // Запасной вариант для живой демонстрации: готовый профиль и план
      state.profile = Object.assign({}, DEMO);
      state.picks = { yygs: { deadline: 1 }, uwc: {}, rise: {}, rknp: {} };
      save(); location.hash = '#plan'; return;
    }
    else viewHome();
    window.scrollTo(0, 0);
    const h = app.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    updateBadge();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
