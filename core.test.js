// Testes sem dependências externas — usam apenas o assert do Node.
// Rodar com: node core.test.js
//
// Testa helpers de gestão e os módulos estatísticos reais usados pelo app.
// Não importa app.js, pois ele depende do DOM e de serviços do navegador.

const assert = require('assert');
require('./probability-core.js');
const timing = require('./timing-core.js');
const probability = globalThis.TheLordProbability;

function money(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function projectionFinal(bank, rate, days) {
  const dailyTarget = bank * rate;
  return bank + dailyTarget * days;
}

function stopWinTarget(bank) {
  return bank * 0.20;
}

let passed = 0;

function check(label, fn) {
  fn();
  passed++;
  console.log('✓ ' + label);
}

check('money formata em Real com 2 casas decimais', () => {
  assert.strictEqual(money(100), 'R$ 100,00');
  assert.strictEqual(money(0), 'R$ 0,00');
  assert.strictEqual(money(1234.5), 'R$ 1.234,50');
});

check('projeção conservadora (10%/dia) mantém a conta linear atual', () => {
  assert.strictEqual(projectionFinal(200, 0.10, 10), 400);
});

check('projeção agressiva (30%/dia) mantém a conta linear atual', () => {
  assert.strictEqual(projectionFinal(200, 0.30, 30), 2000);
});

check('meta de Stop Win é 20% da banca inicial', () => {
  assert.strictEqual(stopWinTarget(200), 40);
  assert.strictEqual(stopWinTarget(0), 0);
});

check('quantil calcula mediana e ignora valores não finitos', () => {
  assert.strictEqual(probability.quantile([1, 3, 2, NaN, Infinity], 0.5), 2);
  assert.strictEqual(probability.quantile([], 0.5), null);
  assert.strictEqual(probability.quantile([10, 20], 0.5), 15);
});

check('análise probabilística filtra rodadas inválidas e futuras', () => {
  const now = 100000;
  const result = probability.analyze([
    { id: 'a', value: 1.5, ts: now - 5000 },
    { id: 'b', value: 12, ts: now - 4000 },
    { id: 'c', value: 0, ts: now - 3000 },
    { id: 'd', value: 30, ts: now + 1000 },
    { id: 'e', value: 3, ts: now - 2000 },
    { id: 'f', value: 2, ts: now - 1000 },
  ], { now, patternSize: 3 });
  assert.strictEqual(result.roundCount, 4);
  assert.deepStrictEqual(result.pattern.categories, ['rosa', 'media', 'media']);
  assert.strictEqual(result.thresholds[10].count, 1);
  assert.strictEqual(result.thresholds[10].rate, 0.25);
  assert.strictEqual(result.combined.historyCount, 1);
});

check('análise de minutagem classifica período e cria 60 minutos quando solicitado', () => {
  assert.strictEqual(timing.period(5), 'Manhã');
  assert.strictEqual(timing.period(11), 'Manhã');
  assert.strictEqual(timing.period(12), 'Tarde');
  assert.strictEqual(timing.period(18), 'Noite');
  const now = new Date(2026, 0, 1, 10, 15, 0).getTime();
  const result = timing.analyze([
    { id: 'r1', value: 12, ts: now - 60000 },
    { id: 'r2', value: 2, ts: now - 30000 },
    { id: 'future', value: 100, ts: now + 60000 },
  ], { now, hours: 1, minimum: 10, mode: 'minute' });
  assert.strictEqual(result.bins.length, 60);
  assert.strictEqual(result.total, 2);
  assert.strictEqual(result.hits, 1);
  assert.strictEqual(result.ranked[0].hits, 1);
});

check('sequência de minutagem reinicia após resultado ≥ 10x', () => {
  const result = timing.streakLabels([
    { id: 'newest', value: 2 },
    { id: 'middle', value: 15 },
    { id: 'oldest', value: 1.5 },
  ]);
  assert.strictEqual(result.labelById.oldest, 1);
  assert.strictEqual(result.labelById.middle, 2);
  assert.strictEqual(result.labelById.newest, 1);
  assert.strictEqual(result.streakEndById.middle, true);
  assert.strictEqual(result.streakEndById.newest, false);
});

console.log(`\n${passed} teste(s) passaram.`);
