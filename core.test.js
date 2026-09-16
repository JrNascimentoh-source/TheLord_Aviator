// Testes simples, sem dependências — só o "assert" do próprio Node.
// Rodar com: node tests/core.test.js
//
// Isso NÃO importa o app.js diretamente (ele mexe direto no HTML da
// página, então não roda sozinho fora do navegador). Em vez disso,
// reproduz aqui as mesmas contas centrais do app, como exemplo de como
// validar as regras de negócio antes de fazer uma mudança.

const assert = require('assert');

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

check('projeção conservadora (10%/dia) bate com a tabela mostrada no app', () => {
  // banca R$200, 10%/dia, 10 dias → +R$20/dia = R$400 no fim
  assert.strictEqual(projectionFinal(200, 0.10, 10), 400);
});

check('projeção agressiva (30%/dia) bate com a tabela mostrada no app', () => {
  // banca R$200, 30%/dia, 30 dias → +R$60/dia = R$1.800 + R$200 = R$2.000
  assert.strictEqual(projectionFinal(200, 0.30, 30), 2000);
});

check('meta de Stop Win é 20% da banca inicial', () => {
  assert.strictEqual(stopWinTarget(200), 40);
  assert.strictEqual(stopWinTarget(0), 0);
});

console.log(`\n${passed} teste(s) passaram.`);
