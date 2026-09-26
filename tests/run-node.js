/* Запуск автотестов в Node.js: node tests/run-node.js (используется в GitHub Actions). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

globalThis.window = globalThis;
for (const f of ['js/i18n.js', 'js/data.js', 'js/engine.js', 'js/tests.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f });
}
const results = globalThis.M.runTests();
results.forEach(r => console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.err ? ' — ' + r.err : ''}`));
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed} из ${results.length} тестов прошли`);
process.exit(failed ? 1 : 0);
