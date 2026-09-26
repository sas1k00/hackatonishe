/*
 * Проверка источников: открывается ли каждая ссылка-источник из базы.
 * Если страница организатора исчезла или переехала, карточку нужно перепроверить.
 * Запуск: node tests/check-sources.js (раз в неделю в GitHub Actions).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js/data.js'), 'utf8'));

async function check(o) {
  try {
    const res = await fetch(o.source.url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Maqsat source check)' }, signal: AbortSignal.timeout(20000) });
    return { id: o.id, url: o.source.url, status: res.status, ok: res.status < 400 || res.status === 403 };
  } catch (e) {
    return { id: o.id, url: o.source.url, status: 'ошибка сети', ok: false, err: e.message };
  }
}

(async () => {
  const results = await Promise.all(globalThis.M.OPPORTUNITIES.map(check));
  let md = '| Возможность | Статус | Источник |\n|---|---|---|\n';
  results.forEach(r => { md += `| ${r.id} | ${r.ok ? '✓' : '✗'} ${r.status} | ${r.url} |\n`; });
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Проверка источников\n\n' + md);
  const broken = results.filter(r => !r.ok);
  if (broken.length) {
    console.log(`Недоступно источников: ${broken.length}. Перепроверьте эти карточки.`);
    process.exit(1);
  }
})();
