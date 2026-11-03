// Testes sem dependências externas — usam apenas o assert do Node.
// Rodar com: node core.test.js
//
// Testa helpers de gestão e os módulos estatísticos reais usados pelo app.
// Não importa app.js, pois ele depende do DOM e de serviços do navegador.

const assert = require('assert');
require('./probability-core.js');
const timing = require('./timing-core.js');
const dates = require('./date-core.js');
const probability = globalThis.TheLordProbability;

const format = require('./format-core.js');
const color = require('./color-core.js');
const game = require('./game-core.js');

function projectionFinal(bank, rate, days) {
  const dailyTarget = bank * rate;
  return bank + dailyTarget * days;
}

function stopWinTarget(bank) {
  return bank * 0.20;
}

let passed = 0;

check('normalização de origem mantém compatibilidade BetDoPovo sem misturar Aviator 7a7',()=>{
  assert.strictEqual(game.normalizeSharedGameKey('betdopovo'),'aviator2');
  assert.strictEqual(game.normalizeSharedGameKey(' BetDoPovo '),'aviator2');
  assert.strictEqual(game.normalizeSharedGameKey('aviator2'),'aviator2');
  assert.strictEqual(game.normalizeSharedGameKey('aviator'),'aviator');
  assert.strictEqual(game.normalizeSharedGameKey(' Aviator '),'aviator');
  assert.strictEqual(game.normalizeSharedGameKey(''),'');
});

check('rótulos do coletor identificam as duas origens corretamente',()=>{
  assert.strictEqual(game.collectorGameDisplayName('aviator2'),'Aviator BdPv');
  assert.strictEqual(game.collectorGameDisplayName('aviator'),'Aviator 7a7');
  assert.strictEqual(game.collectorGameDisplayName('desconhecido'),'Aviator 7a7');
});

check('formatadores compartilhados preservam moeda, percentual e multiplicador', () => {
  assert.strictEqual(format.money(100), 'R$ 100,00');
  assert.strictEqual(format.money(0), 'R$ 0,00');
  assert.strictEqual(format.money(1234.5), 'R$ 1.234,50');
  assert.strictEqual(format.pct(12.5), '12,50%');
  assert.strictEqual(format.formatMultiplier(1214.46), '1,214.46x');
  assert.strictEqual(format.formatMultiplier('inválido'), '—');
});

check('classificação de velas mantém as seis faixas e seus limites',()=>{
  assert.deepStrictEqual(color.classifyRound(1.99),{cls:'blue',color:'#5aa7ff',key:'blue'});
  assert.deepStrictEqual(color.classifyRound(2),{cls:'purple',color:'#8b5cf6',key:'purple'});
  assert.deepStrictEqual(color.classifyRound(9.99),{cls:'purple',color:'#8b5cf6',key:'purple'});
  assert.deepStrictEqual(color.classifyRound(10),{cls:'pink',color:'#ff2f87',key:'pink'});
  assert.deepStrictEqual(color.classifyRound(99.99),{cls:'pink',color:'#ff2f87',key:'pink'});
  assert.deepStrictEqual(color.classifyRound(100),{cls:'yellow',color:'#ffc01f',key:'yellow'});
  assert.deepStrictEqual(color.classifyRound(500),{cls:'hot',color:'#ff1e43',key:'hot'});
  assert.deepStrictEqual(color.classifyRound(1000),{cls:'fire',color:'#ff5a1a',key:'fire'});
});

function check(label, fn) {
  fn();
  passed++;
  console.log('✓ ' + label);
}

check('vela gatinho exibe seis cotações recorrentes e suas velas de origem',()=>{
 const now=Date.now(),values=[1.11,10,1.22,10,1.33,10,1.44,10,1.55,10,1.66,10],rounds=values.map((value,i)=>({id:'k6-'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeKittenTriggers(rounds,{now});
 assert.strictEqual(r.quotes.length,6);
 assert.deepStrictEqual(r.quotes.map(x=>x.quote),['11','22','33','44','55','66']);
 assert.deepStrictEqual(r.quotes.map(x=>x.triggerValue),[1.11,1.22,1.33,1.44,1.55,1.66]);
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
check('frequência dos padrões permanece limitada às últimas 24 horas',()=>{
 const now=Date.now(),day=24*60*60*1000,values=[12,1.4,2.5,1.8,1.2,12];
 const old=values.map((value,i)=>({id:'old-'+i,value,ts:now-day*3+(i*1000)}));
 const recent=[{id:'recent-1',value:1.5,ts:now-5000},{id:'recent-2',value:1.7,ts:now-4000}];
 const all=[...old,...recent],result=probability.analyzeNamedPatterns(all,{now});
 assert.strictEqual(result.patterns.quinta.count,0);
 assert.strictEqual(result.windowRounds,recent.length);
});
check('contagem de casas ranqueia intervalos completos entre rosas nas últimas 24 horas',()=>{
 const now=Date.now(),values=[12,1.2,12,2,3,12,1.5,2.5,12,1.1,1.3,1.4,12];
 const rounds=values.map((value,i)=>({id:'h'+i,value,ts:now-(values.length-i)*1000}));
 const result=probability.analyzeNamedPatterns(rounds,{now});
 assert.deepStrictEqual(result.houseCounts.map(x=>[x.houses,x.count]),[[2,2],[1,1],[3,1]]);
 assert.strictEqual(result.completedHouseIntervals,4);
 assert.strictEqual(result.houseCounts.reduce((sum,x)=>sum+x.count,0),4);
});
check('padrões em destaque ranqueiam o número exibido na própria vela rosa',()=>{
 const now=Date.now(),values=[12,1.2,12,2,3,12,1.5,2.5,12],rounds=values.map((value,i)=>({id:'badge-'+i,value,ts:now-(values.length-i)*1000}));
 const result=probability.analyzeNamedPatterns(rounds,{now});
 assert.deepStrictEqual(result.pinkBadgeCounts.map(x=>[x.number,x.count]),[[3,2],[1,1],[2,1]]);
 assert.strictEqual(result.recentPinkCount,4);
});
check('número da vela rosa respeita a contagem visual mesmo quando a sequência começa antes das últimas 24 horas',()=>{
 const now=Date.now(),day=24*60*60*1000,rounds=[
  {id:'old-pink',value:12,ts:now-day-5000},{id:'recent-blue',value:1.5,ts:now-3000},
  {id:'recent-pink',value:12,ts:now-2000},{id:'recent-blue-2',value:2,ts:now-1000},
  {id:'recent-pink-2',value:12,ts:now-500}
 ];
 const result=probability.analyzeNamedPatterns(rounds,{now});
 assert.deepStrictEqual(result.pinkBadgeCounts.map(x=>[x.number,x.count]),[[2,2]]);
 assert.strictEqual(result.recentPinkCount,2);
});
check('contagem de casas desconsidera intervalos que atravessam a janela de 24 horas',()=>{
 const now=Date.now(),day=24*60*60*1000;
 const rounds=[{id:'old-pink',value:12,ts:now-day-2000},{id:'recent-blue',value:1.5,ts:now-1000},{id:'recent-pink',value:12,ts:now-500}];
 const result=probability.analyzeNamedPatterns(rounds,{now});
 assert.strictEqual(result.completedHouseIntervals,0);
 assert.strictEqual(result.houseCounts.length,0);
});
check('indicador de formação identifica os padrões que ainda podem se completar',()=>{
 const now=Date.now(),make=values=>values.map((value,i)=>({id:'f'+i,value,ts:now-(values.length-i)*1000}));
 const atStart=probability.analyzeNamedPatterns(make([12]),{now}).formation;
 const afterOne=probability.analyzeNamedPatterns(make([12,1.5]),{now}).formation;
 const afterFour=probability.analyzeNamedPatterns(make([12,1.5,2.5,1.8,1.2]),{now}).formation;
 assert.deepStrictEqual(atStart.candidates,['espelho','quinta']);
 assert.deepStrictEqual(afterOne.candidates,['xadrez','quinta']);
 assert.deepStrictEqual(afterFour.candidates,['quinta']);
});
check('quinta casa exige rosa inicial, quatro casas intermediárias e rosa final',()=>{
 const now=Date.now(),values=[12,1.5,2.5,1.8,1.2,12],rounds=values.map((value,i)=>({id:'q'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeNamedPatterns(rounds,{now});assert.strictEqual(r.patterns.quinta.count,1);assert.strictEqual(r.patterns.xadrez.count,0);assert.match(r.patterns.quinta.description,/casas 1, 2, 3 e 4.*rosa na 5ª casa/);
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
 assert.deepStrictEqual(r.triggers,[1.72,2.05,1.27]);
 assert.strictEqual(q['27'],1);assert.strictEqual(q['50'],1);assert.strictEqual(q['72'],1);
 assert.strictEqual(r.quotes.find(x=>x.quote==='27').triggerValue,1.72);assert.strictEqual(r.quotes.find(x=>x.quote==='50').triggerValue,2.05);assert.strictEqual(r.quotes.find(x=>x.quote==='72').triggerValue,1.27);
});
check('vela gatinho ignora rosas como gatilho e não inventa cotação sem pares válidos',()=>{
 const now=Date.now(),rounds=[10,1.5,12,15,2.2].map((value,i)=>({id:'z'+i,value,ts:now-(5-i)*1000}));
 const r=probability.analyzeKittenTriggers(rounds,{now});assert.strictEqual(r.triggerCount,1);assert.strictEqual(r.averagePink,12);
});


check('vela gatinho exibe somente a cotação invertida no ranking',()=>{
 const now=Date.now(),values=[1.20,12,2.17,20],rounds=values.map((value,i)=>({id:'inv'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeKittenTriggers(rounds,{now});
 assert.deepStrictEqual(r.quotes.map(x=>x.quote).sort(),['02','71']);
 assert.strictEqual(r.quotes.find(x=>x.quote==='02').triggerValue,1.2);
 assert.strictEqual(r.quotes.find(x=>x.quote==='71').triggerValue,2.17);
});


check('vela gatinho guarda as cinco ocorrências mais recentes por cotação em ordem decrescente',()=>{
 const now=Date.now(),values=[1.71,12,1.72,15,1.71,20,1.71,25,1.71,30,1.71,40],rounds=values.map((value,i)=>({id:'hist'+i,value,ts:now-(values.length-i)*1000}));
 const r=probability.analyzeKittenTriggers(rounds,{now}),q=r.quotes.find(x=>x.quote==='17');
 assert.ok(q);assert.strictEqual(q.count,5);assert.strictEqual(q.occurrences.length,5);
 assert.ok(q.occurrences[0].pinkTs>q.occurrences[4].pinkTs);
 assert.strictEqual(q.occurrences[0].triggerValue,1.71);assert.strictEqual(q.occurrences[0].pinkValue,40);
});

check('relógio mantém o formato HH:MM:SS com zeros à esquerda',()=>{
 assert.strictEqual(dates.nowTimeStr(new Date(2026,10,3,4,5,6)),'04:05:06');
 assert.strictEqual(dates.nowTimeStr(new Date(2026,10,3,14,25,9)),'14:25:09');
});
check('datas da gestão preservam início da semana na segunda-feira',()=>{
 const monday=dates.startOfWeek(new Date(2026,10,4,15,30));
 assert.strictEqual(monday.getFullYear(),2026);
 assert.strictEqual(monday.getMonth(),10);
 assert.strictEqual(monday.getDate(),2);
 assert.strictEqual(monday.getDay(),1);
 assert.strictEqual(monday.getHours(),0);
});
check('datas da gestão tratam domingo como parte da semana iniciada na segunda',()=>{
 const monday=dates.startOfWeek(new Date(2026,10,8,23,59));
 assert.strictEqual(monday.getDate(),2);
 assert.strictEqual(monday.getDay(),1);
});
check('datas brasileiras mantêm interpretação dd/mm/aaaa e anos bissextos',()=>{
 const parsed=dates.parseBRDate('29/02/2024');
 assert.strictEqual(parsed.getFullYear(),2024);
 assert.strictEqual(parsed.getMonth(),1);
 assert.strictEqual(parsed.getDate(),29);
});
check('períodos da gestão e minutagem compartilham os mesmos limites',()=>{
 for(const hour of [0,4,5,11,12,17,18,23]) assert.strictEqual(dates.period(hour),timing.period(hour));
});

console.log(`\n${passed} teste(s) passaram.`);
