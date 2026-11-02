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


check('padrões conhecidos reconhecem espelho, xadrez e quinta casa',()=>{
 const now=Date.now(),values=[12,15,1.5,12,1.5,1.8,2.2,1.4,12],rounds=values.map((value,i)=>({id:'p'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeNamedPatterns(rounds,{now});assert.strictEqual(r.patterns.espelho.count,1);assert.strictEqual(r.patterns.xadrez.count,1);assert.strictEqual(r.patterns.quinta.count,1);
});
check('quinta casa exige quatro velas intermediárias azuis ou roxas',()=>{
 const now=Date.now(),values=[12,1.5,2.5,1.8,1.2,12],rounds=values.map((value,i)=>({id:'q'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeNamedPatterns(rounds,{now});assert.strictEqual(r.patterns.quinta.count,1);assert.strictEqual(r.patterns.xadrez.count,0);
});
check('minutagem conta todas as rosas a partir de 10x, sem teto',()=>{
 const now=new Date(2026,0,1,10,15,0).getTime(),r=timing.analyze([{id:'p',value:12,ts:now-60000},{id:'y',value:120,ts:now-30000},{id:'b',value:3,ts:now-15000}],{now,hours:1,minimum:10,mode:'minute'});assert.strictEqual(r.hits,2);
});


check('velas de qualquer multiplicador acima de 10x são rosas no radar',()=>{
 const now=Date.now(),values=[12,150,500,1000,1.5,12],rounds=values.map((value,i)=>({id:'r'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeNamedPatterns(rounds,{now});assert.strictEqual(r.patterns.espelho.count,3);
});
check('qualidade do gráfico aprende composição de azuis roxas e rosas',()=>{
 const now=Date.now(),values=[];for(let i=0;i<180;i++)values.push(i%30<8?1.5:i%30<20?4:12);
 const rounds=values.map((value,i)=>({id:'g'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeGraphQuality(rounds,{now,windowSize:30,lookahead:10});
 assert.strictEqual(r.status,'ready');assert.ok(r.blue+r.purple+r.pink===30);assert.ok(r.historySamples>0);
});

check('tetos usam quantis adaptativos de todas as velas, sem depender de sequências semelhantes',()=>{
 const now=Date.now(),values=[1.2,1.4,2.1,3.5,8,1.1,14,2.8,4.2,1.3,25,3.1,1.8,6,2.2,18,1.5,4.5,9,2.4,35,1.7,5.5,2.6,12,3.8,1.9,7,2.9,22];
 const rounds=values.map((value,i)=>({id:'a'+i,value,ts:now-(values.length-i)*1000}));
 const result=probability.analyze(rounds,{now});
 assert.strictEqual(result.pattern.status,'ready');
 assert.strictEqual(result.pattern.sampleCount,values.length);
 assert.ok(result.pattern.minimum>=1);
 assert.ok(result.pattern.maximum>=result.pattern.minimum);
 assert.ok(result.pattern.effectiveSampleSize>5);
 assert.strictEqual(result.pattern.method,'adaptive-decayed-current-volume-quantiles');
});
check('tetos adaptam a memória à volatilidade e aceitam todas as categorias de vela',()=>{
 const now=Date.now(),stable=Array.from({length:100},(_,i)=>({id:'s'+i,value:i%2?2.2:2.4,ts:now-(100-i)*1000}));
 const volatile=Array.from({length:100},(_,i)=>({id:'v'+i,value:i%2?1.2:80,ts:now-(100-i)*1000}));
 const a=probability.analyze(stable,{now}).pattern,b=probability.analyze(volatile,{now}).pattern;
 assert.ok(a.halfLifeRounds>b.halfLifeRounds);
 assert.ok(b.maximum>a.maximum);
});
check('tetos exibem estimativa desde a primeira vela e atualizam com cada rodada',()=>{
 const now=Date.now(),rounds=[{id:'w1',value:2.4,ts:now-1}];
 const first=probability.analyze(rounds,{now}).pattern;
 assert.strictEqual(first.status,'provisional');
 assert.strictEqual(first.minimum,2.4);
 assert.strictEqual(first.maximum,2.4);
 rounds.push({id:'w2',value:12,ts:now+1});
 const updated=probability.analyze(rounds,{now:now+1}).pattern;
 assert.ok(updated.minimum<=updated.maximum);
 assert.strictEqual(updated.sampleCount,2);
});
check('recorrência de velas altas mede ausência, frequência e atividade sem prever por atraso',()=>{
 const now=Date.now(),values=[2,55,3,4,105,2,3,60,2,2,4,220,2,55],rounds=values.map((value,i)=>({id:'h'+i,value,ts:now-(values.length-i)*60000}));
 const result=probability.analyzeHighMultiplierRecurrence(rounds,{now}),h50=result.targets.find(x=>x.target===50),h100=result.targets.find(x=>x.target===100),h500=result.targets.find(x=>x.target===500);
 assert.strictEqual(h50.count,5);assert.strictEqual(h50.absenceRounds,0);assert.ok(h50.averageEveryRounds>0);assert.ok(h50.probabilityNext10>0&&h50.probabilityNext10<1);
 assert.strictEqual(h100.count,2);assert.strictEqual(h500.count,0);assert.strictEqual(h500.probabilityNext10,null);assert.ok(['acima-da-média','na-média','abaixo-da-média','sem-base'].includes(h50.activity));
});
check('recorrência de velas altas inicia sem inventar probabilidade quando não há histórico',()=>{
 const result=probability.analyzeHighMultiplierRecurrence([],{now:Date.now()});assert.strictEqual(result.roundCount,0);
 result.targets.forEach(t=>{assert.strictEqual(t.count,0);assert.strictEqual(t.probabilityNext10,null);assert.strictEqual(t.absenceMs,null);});
});

check('vela gatinho mede a vela anterior, cotação decimal e inversão',()=>{
 const now=Date.now(),values=[1.72,50,2.05,20,1.27,100],rounds=values.map((value,i)=>({id:'k'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeKittenTriggers(rounds,{now}),q=Object.fromEntries(r.quotes.map(x=>[x.quote,x.count]));
 assert.strictEqual(r.triggerCount,3);assert.ok(Math.abs(r.averagePink-(50+20+100)/3)<1e-9);
 assert.deepStrictEqual(r.triggers,[1.72,1.90,1.49]);
 assert.strictEqual(q['72'],2);assert.strictEqual(q['27'],2);assert.strictEqual(q['05'],1);assert.strictEqual(q['50'],1);
});
check('vela gatinho ignora rosas como gatilho e não inventa cotação sem pares válidos',()=>{
 const now=Date.now(),rounds=[10,1.5,12,15,2.2].map((value,i)=>({id:'z'+i,value,ts:now-(5-i)*1000}));
 const r=probability.analyzeKittenTriggers(rounds,{now});assert.strictEqual(r.triggerCount,1);assert.strictEqual(r.averagePink,12);
});

console.log(`\n${passed} teste(s) passaram.`);
