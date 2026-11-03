(function(root){'use strict';
const TARGETS=[2,10,20,30,50,100,250,500,1000];
function quantile(values,q){const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*Math.max(0,Math.min(1,q)),l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l);}
function category(v){return v<2?'baixa':v<10?'media':v<100?'rosa':v<500?'amarela':v<1000?'vermelha':'fogo';}
function label(v){return v==='baixa'?'Azul (1–1,99x)':v==='media'?'Roxo (2–9,99x)':v==='rosa'?'Rosa (10–99,99x)':v==='amarela'?'Amarela (100–499,99x)':v==='vermelha'?'Vermelha (500–999,99x)':'Fogo (≥1000x)';}
function weightedQuantile(items,q){const a=items.filter(x=>Number.isFinite(x.value)&&Number.isFinite(x.weight)&&x.weight>0).sort((x,y)=>x.value-y.value);if(!a.length)return null;const total=a.reduce((s,x)=>s+x.weight,0);let acc=0;for(const x of a){acc+=x.weight;if(acc>=total*q)return x.value;}return a[a.length-1].value;}

/**
 * Walk-forward backtest: each forecast uses only rounds strictly before the
 * round being scored. Rolling model (last 100 rounds) is compared with an
 * expanding-history baseline. Laplace smoothing avoids 0%/100% from tiny samples.
 */
function analyzeWalkForward(input,options={}){
 const targets=Array.isArray(options.targets)?options.targets:[10,50,100,200,500,1000];
 const minTrain=Math.max(10,Number(options.minTrain)||30);
 const windowSize=Math.max(minTrain,Number(options.windowSize)||100);
 const rounds=(Array.isArray(input)?input:[])
  .filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts)))
  .map(r=>({value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const metrics=targets.map(target=>{
  let tested=0,rollingBrier=0,baselineBrier=0,predicted=0,observed=0;
  for(let i=minTrain;i<rounds.length;i++){
   const start=Math.max(0,i-windowSize),train=rounds.slice(start,i),expanding=rounds.slice(0,i);
   const hits=train.reduce((sum,r)=>sum+(r.value>=target?1:0),0);
   const allHits=expanding.reduce((sum,r)=>sum+(r.value>=target?1:0),0);
   const p=(hits+1)/(train.length+2),base=(allHits+1)/(expanding.length+2);
   const actual=rounds[i].value>=target?1:0;
   rollingBrier+=(p-actual)*(p-actual);
   baselineBrier+=(base-actual)*(base-actual);
   predicted+=p;observed+=actual;tested++;
  }
  const last=rounds.slice(Math.max(0,rounds.length-windowSize));
  const lastHits=last.reduce((sum,r)=>sum+(r.value>=target?1:0),0);
  const nextProbability=last.length?(lastHits+1)/(last.length+2):null;
  const brier=tested?rollingBrier/tested:null,baseline=tested?baselineBrier/tested:null;
  const skill=brier!==null&&baseline>0?1-brier/baseline:null;
  return {target,trainingWindow:windowSize,minimumTraining:minTrain,testedRounds:tested,
   brierScore:brier,baselineBrierScore:baseline,skillVsBaseline:skill,
   meanPredictedRate:tested?predicted/tested:null,observedRate:tested?observed/tested:null,
   calibrationGap:tested?Math.abs(predicted/tested-observed/tested):null,
   nextProbability,trainingRounds:last.length,trainingHits:lastHits,
   status:tested>=20?'evaluated':tested>0?'limited':'insufficient'};
 });
 return {method:'walk-forward-rolling-vs-expanding-laplace',roundCount:rounds.length,
  minimumTraining:minTrain,windowSize,evaluatedTargets:metrics.filter(x=>x.testedRounds>0).length,
  status:metrics.some(x=>x.testedRounds>=20)?'evaluated':metrics.some(x=>x.testedRounds>0)?'limited':'insufficient',
  note:'Backtest measures historical forecast error; it does not establish that future rounds are predictable.',
  targets:metrics};
}

function analyze(input,options={}) {
 const now=Number(options.now)||Date.now(),size=Math.max(3,Math.min(6,Number(options.patternSize)||4));
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now).map(r=>({id:r.id,value:Number(r.value),ts:Number(r.ts)})).sort((x,y)=>x.ts-y.ts);
 const currentRounds=rounds.slice(-size),current=currentRounds.map(r=>category(r.value));
 const logs=rounds.map(r=>Math.log(r.value));
 const changes=[];for(let i=1;i<logs.length;i++)changes.push(Math.abs(logs[i]-logs[i-1]));
 const volatility=changes.length?quantile(changes,.5):0;
 // A memória cresce com o histórico e encurta quando o gráfico fica mais volátil.
 // Todas as rodadas participam; o decaimento reduz gradualmente o peso das antigas, sem corte fixo.
 const halfLifeRounds=rounds.length?Math.max(8,Math.sqrt(rounds.length)*4/(1+volatility*2)):0;
 const weighted=rounds.map((r,i)=>({value:Math.log(r.value),weight:halfLifeRounds?Math.exp(-Math.LN2*(rounds.length-1-i)/halfLifeRounds):0}));
 const weightedLogQuantile=q=>{
   const valid=weighted.filter(x=>Number.isFinite(x.value)&&x.weight>0).sort((x,y)=>x.value-y.value);
   if(!valid.length)return null;
   const total=valid.reduce((sum,x)=>sum+x.weight,0),target=total*q;let accumulated=0;
   for(const item of valid){accumulated+=item.weight;if(accumulated>=target)return Math.exp(item.value);}
   return Math.exp(valid[valid.length-1].value);
 };
 const totalWeight=weighted.reduce((sum,x)=>sum+x.weight,0),squaredWeight=weighted.reduce((sum,x)=>sum+x.weight*x.weight,0);
 const effectiveSampleSize=squaredWeight?totalWeight*totalWeight/squaredWeight:0;
 const minimum=weightedLogQuantile(.2),median=weightedLogQuantile(.5),maximum=weightedLogQuantile(.8);
 const rates={};TARGETS.forEach(target=>{rates[target]=totalWeight?weighted.reduce((sum,item,i)=>sum+(rounds[i].value>=target?item.weight:0),0)/totalWeight:null;});
 const pinkRounds=rounds.filter(r=>r.value>=10),pinkGaps=[];
 for(let i=1;i<pinkRounds.length;i++){const gap=(pinkRounds[i].ts-pinkRounds[i-1].ts)/1000;if(gap>0&&Number.isFinite(gap))pinkGaps.push(gap);}
 const lastPinkTs=pinkRounds.length?pinkRounds[pinkRounds.length-1].ts:null;
 const roundsSincePink=lastPinkTs===null?rounds.length:rounds.filter(r=>r.ts>lastPinkTs).length;
 const pinkIntervals={count:pinkGaps.length,roseCount:pinkRounds.length,lastTs:lastPinkTs,roundsSinceLast:roundsSincePink,median:quantile(pinkGaps,.5),p20:quantile(pinkGaps,.2),p80:quantile(pinkGaps,.8),mean:pinkGaps.length?pinkGaps.reduce((sum,v)=>sum+v,0)/pinkGaps.length:null};
 const thresholds={};TARGETS.forEach(target=>{const hits=rounds.filter(r=>r.value>=target),gaps=[];for(let i=1;i<hits.length;i++){const gap=(hits[i].ts-hits[i-1].ts)/1000;if(gap>0&&Number.isFinite(gap))gaps.push(gap);}thresholds[target]={target,count:hits.length,rate:rounds.length?hits.length/rounds.length:null,lastTs:hits.length?hits[hits.length-1].ts:null,gapCount:gaps.length,gapMedian:quantile(gaps,.5),gapP20:quantile(gaps,.2),gapP80:quantile(gaps,.8),gapMean:gaps.length?gaps.reduce((sum,v)=>sum+v,0)/gaps.length:null};});
 const backtesting=analyzeWalkForward(rounds,options.backtesting||{});
 const enough=rounds.length>0&&Number.isFinite(minimum)&&Number.isFinite(maximum);
 const combined={historyCount:Math.max(0,rounds.length-size),method:'historical-descriptive-only',warning:'Historical metrics are descriptive and do not drive the adaptive ceilings.'};
 return {roundCount:rounds.length,pinkIntervals,combined,backtesting,pattern:{labels:current.map(label),categories:current,matches:rounds.length,sampleCount:rounds.length,minimum:enough?minimum:null,median:enough?median:null,maximum:enough?maximum:null,roseMinimum:null,roseMedian:null,roseMaximum:null,roseMatches:0,rates,lastSimilarTs:null,gapCount:0,gapMedian:null,gapP20:null,gapP80:null,effectiveSampleSize,halfLifeRounds,volatility,status:enough?(effectiveSampleSize<5?'provisional':'ready'):'no-data',method:'adaptive-decayed-current-volume-quantiles'},thresholds};
}
function analyzeNamedPatterns(input,options={}){
 const now=Number(options.now)||Date.now(),cutoff=now-(Number(options.windowMs)||86400000);
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now).map(r=>({id:r.id,value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const token=r=>r.value>=10?'R':r.value<10?'B':'X';
 const recent=rounds.filter(r=>r.ts>=cutoff),rt=recent.map(token),at=rounds.map(token);
 const defs=[{id:'espelho',name:'Espelho',sequence:['R','R'],description:'Rosa → Rosa'},{id:'xadrez',name:'Xadrez',sequence:['R','B','R'],description:'Rosa → Azul/Roxa → Rosa'},{id:'quinta',name:'Quinta casa',sequence:['R','B','B','B','B','R'],description:'Rosa inicial → casas 1, 2, 3 e 4 azuis/roxas → rosa na 5ª casa'}];
 const frequencies=defs.map(d=>{const hits=[];for(let i=0;i<=rt.length-d.sequence.length;i++)if(d.sequence.every((v,j)=>rt[i+j]===v))hits.push(recent[i+d.sequence.length-1].ts);return {...d,count:hits.length,lastTs:hits.length?hits[hits.length-1]:null,frequencyPer1000:recent.length?hits.length/recent.length*1000:0};}).sort((a,b)=>b.count-a.count||a.sequence.length-b.sequence.length);
 // Intervalos completos entre rosas consecutivas: conta somente as velas intermediárias dentro das últimas 24h.
 const houseMap=new Map();let previousPink=-1,completedIntervals=0;
 rt.forEach((value,index)=>{if(value!=='R')return;if(previousPink>=0){const houses=index-previousPink-1;houseMap.set(houses,(houseMap.get(houses)||0)+1);completedIntervals++;}previousPink=index;});
 const houseCounts=[...houseMap.entries()].map(([houses,count])=>({houses,count,share:completedIntervals?count/completedIntervals:0,frequencyPer1000:recent.length?count/recent.length*1000:0})).sort((a,b)=>b.count-a.count||a.houses-b.houses);
 // Replica exatamente o número mostrado no canto superior esquerdo de cada vela rosa:
 // conta todas as rodadas desde a rosa anterior, incluindo a própria rosa atual.
 const pinkBadgeMap=new Map();let streakNumber=0;
 rounds.forEach(r=>{streakNumber++;if(r.value>=10){if(r.ts>=cutoff)pinkBadgeMap.set(streakNumber,(pinkBadgeMap.get(streakNumber)||0)+1);streakNumber=0;}});
 const recentPinkCount=recent.filter(r=>r.value>=10).length;
 const pinkBadgeCounts=[...pinkBadgeMap.entries()].map(([number,count])=>({number,count,share:recentPinkCount?count/recentPinkCount:0,frequencyPer1000:recent.length?count/recent.length*1000:0})).sort((a,b)=>b.count-a.count||a.number-b.number);
 let last=-1;for(let i=at.length-1;i>=0;i--){if(at[i]==='R'){last=i;break;}if(at[i]==='X')break;}
 let formation=null;
 if(last>=0){let valid=true,houses=0;for(let i=last+1;i<at.length;i++){if(at[i]!=='B'){valid=false;break;}houses++;}if(valid){const candidates=defs.filter(d=>d.id==='espelho'?houses===0:d.id==='xadrez'?houses===1:houses<=4).map(d=>d.id);formation={housesSincePink:houses,candidates,valid:true,lastPinkTs:rounds[last].ts};}}
 return {windowRounds:recent.length,frequencies,mostFrequent:frequencies[0]&&frequencies[0].count?frequencies[0]:null,houseCounts,completedHouseIntervals:completedIntervals,pinkBadgeCounts,recentPinkCount,mostCommonHouse:houseCounts[0]||null,formation,patterns:Object.fromEntries(frequencies.map(x=>[x.id,x]))};
}


function analyzeGraphQuality(input,options={}){
 const now=Number(options.now)||Date.now();
 const windowSize=Math.max(10,Math.min(100,Number(options.windowSize)||30)),lookahead=Math.max(3,Math.min(30,Number(options.lookahead)||10));
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now).map(r=>({value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const scoreWindow=items=>{let blue=0,purple=0,pink=0;items.forEach(r=>{if(r.value<2)blue++;else if(r.value<10)purple++;else pink++;});const n=items.length||1;return {blue,purple,pink,total:items.length,blueRate:blue/n,purpleRate:purple/n,pinkRate:pink/n,score:(2*pink+purple-1.5*blue)/n};};
 if(rounds.length<windowSize)return {status:'insufficient',label:'Amostra em formação',sample:rounds.length,windowSize,blue:0,purple:0,pink:0,blueRate:null,purpleRate:null,pinkRate:null,score:null,historySamples:0,comparableSamples:0,nextPinkRate:null,historyScope:'complete'};
 const windows=[];
 for(let i=0;i+windowSize+lookahead<=rounds.length;i+=lookahead){const current=scoreWindow(rounds.slice(i,i+windowSize)),future=rounds.slice(i+windowSize,i+windowSize+lookahead);windows.push({...current,nextPinkRate:future.filter(r=>r.value>=10).length/lookahead});}
 const current=scoreWindow(rounds.slice(-windowSize)),scores=windows.map(w=>w.score);
 const q25=quantile(scores,.25),q50=quantile(scores,.5),q75=quantile(scores,.75);
 // Mantém os limites de ÓTIMO e RUIM; divide a antiga faixa REGULAR pela mediana.
 const label=scores.length>=4&&current.score>=q75?'ÓTIMO':scores.length>=4&&current.score<=q25?'RUIM':scores.length>=4&&current.score>=q50?'BOM':'REGULAR';
 const comparable=windows.filter(w=>label==='ÓTIMO'?w.score>=q75:label==='RUIM'?w.score<=q25:label==='BOM'?w.score>=q50&&w.score<q75:w.score>q25&&w.score<q50);
 const nextPinkRate=comparable.length?comparable.reduce((s,w)=>s+w.nextPinkRate,0)/comparable.length:null;
 return {status:'ready',label,sample:rounds.length,windowSize,blue:current.blue,purple:current.purple,pink:current.pink,blueRate:current.blueRate,purpleRate:current.purpleRate,pinkRate:current.pinkRate,score:current.score,historySamples:windows.length,comparableSamples:comparable.length,nextPinkRate,q25,q50,q75,historyScope:'complete'};
}


function analyzeKittenTriggers(input,options={}){
 const now=Number(options.now)||Date.now();
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now).map(r=>({value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const quotes=new Map(),events=[];
 for(let i=1;i<rounds.length;i++){
  const trigger=rounds[i-1],pink=rounds[i];
  if(pink.value<10||trigger.value>=10)continue;
  const digits=trigger.value.toFixed(2).split('.')[1]||'00',inverse=digits.split('').reverse().join('');
  // O card exibe exclusivamente a cotação invertida da vela gatilho.
  events.push({triggerValue:trigger.value,pinkValue:pink.value,ts:pink.ts,quote:inverse});
  if(!quotes.has(inverse))quotes.set(inverse,{quote:inverse,count:0,originalCount:0,invertedCount:0,pinkValues:[],lastTs:null});
  const item=quotes.get(inverse);item.count++;item.invertedCount++;item.pinkValues.push(pink.value);item.lastTs=pink.ts;item.triggerValue=trigger.value;
  if(!item.occurrences)item.occurrences=[];
  item.occurrences.push({triggerValue:trigger.value,pinkValue:pink.value,triggerTs:trigger.ts,pinkTs:pink.ts});
 }
 const ranked=[...quotes.values()].map(q=>({quote:q.quote,count:q.count,originalCount:q.originalCount,invertedCount:q.invertedCount,triggerValue:q.triggerValue,averagePink:q.pinkValues.reduce((a,b)=>a+b,0)/q.pinkValues.length,medianPink:quantile(q.pinkValues,.5),lastTs:q.lastTs,occurrences:q.occurrences.slice(-5).reverse(),share:events.length?q.count/events.length:null})).sort((a,b)=>b.count-a.count||a.quote.localeCompare(b.quote));
 const pinkValues=events.map(e=>e.pinkValue),triggerValues=events.map(e=>e.triggerValue);
 return {roundCount:rounds.length,triggerCount:events.length,averagePink:pinkValues.length?pinkValues.reduce((a,b)=>a+b,0)/pinkValues.length:null,medianPink:quantile(pinkValues,.5),averageTrigger:triggerValues.length?triggerValues.reduce((a,b)=>a+b,0)/triggerValues.length:null,triggers:events.slice(-6).map(e=>e.triggerValue),predominantQuote:ranked[0]||null,quotes:ranked.slice(0,6),method:'immediate-predecessor-decimal-pair-and-reverse'};
}

function analyzeHighMultiplierRecurrence(input,options={}){
 const now=Number(options.now)||Date.now(),targets=[50,100,200,500,1000];
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now).map(r=>({value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const n=rounds.length,changes=[];for(let i=1;i<n;i++)changes.push(Math.abs(Math.log(rounds[i].value)-Math.log(rounds[i-1].value)));
 const volatility=changes.length?quantile(changes,.5):0,halfLifeRounds=n?Math.max(4,Math.sqrt(n)*4/(1+volatility*2)):0;
 const weights=rounds.map((r,i)=>halfLifeRounds?Math.exp(-Math.LN2*(n-1-i)/halfLifeRounds):0),weightTotal=weights.reduce((a,b)=>a+b,0);
 const metrics=targets.map(target=>{
  const hitIndexes=[];rounds.forEach((r,i)=>{if(r.value>=target)hitIndexes.push(i);});
  const hits=hitIndexes.length,lastIndex=hits?hitIndexes[hits-1]:-1,lastTs=hits?rounds[lastIndex].ts:null,gapsRounds=[],gapsMs=[];
  for(let i=1;i<hitIndexes.length;i++){const gap=hitIndexes[i]-hitIndexes[i-1],ms=rounds[hitIndexes[i]].ts-rounds[hitIndexes[i-1]].ts;if(gap>0)gapsRounds.push(gap);if(ms>0)gapsMs.push(ms);}
  const rate=n?hits/n:null,weightedHits=rounds.reduce((sum,r,i)=>sum+(r.value>=target?weights[i]:0),0),recentRate=weightTotal?weightedHits/weightTotal:null;
  const probability=h=>rate===null||hits===0?null:1-Math.pow(1-rate,h),ratio=rate>0&&recentRate!==null?recentRate/rate:null;
  const activity=ratio===null?'sem-base':ratio>=1.25?'acima-da-média':ratio<=.75?'abaixo-da-média':'na-média';
  return {target,count:hits,roundCount:n,rate,frequencyPer1000:n?hits/n*1000:null,averageEveryRounds:hits?n/hits:null,averageGapRounds:gapsRounds.length?gapsRounds.reduce((a,b)=>a+b,0)/gapsRounds.length:null,medianGapRounds:quantile(gapsRounds,.5),averageGapMs:gapsMs.length?gapsMs.reduce((a,b)=>a+b,0)/gapsMs.length:null,lastTs,absenceRounds:lastIndex>=0?n-1-lastIndex:n,absenceMs:lastTs!==null?Math.max(0,now-lastTs):(n?Math.max(0,now-rounds[0].ts):null),probabilityNext10:probability(10),probabilityNext50:probability(50),probabilityNext100:probability(100),recentRate,activity,activityRatio:ratio,halfLifeRounds};
 });
 return {roundCount:n,firstTs:n?rounds[0].ts:null,lastTs:n?rounds[n-1].ts:null,targets:metrics,method:'empirical-frequency-with-adaptive-recency'};
}

root.TheLordProbability={analyze,analyzeWalkForward,analyzeNamedPatterns,analyzeGraphQuality,analyzeHighMultiplierRecurrence,analyzeKittenTriggers,quantile,TARGETS};
})(typeof globalThis==='object'?globalThis:this);
