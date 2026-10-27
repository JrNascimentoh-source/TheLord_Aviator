(function(root){'use strict';
const TARGETS=[2,10,20,30,50,100,250,500,1000];
function quantile(values,q){const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*Math.max(0,Math.min(1,q)),l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l);}
function category(v){return v<2?'baixa':v<10?'media':v<100?'rosa':v<500?'amarela':v<1000?'vermelha':'fogo';}
function label(v){return v==='baixa'?'Azul (1–1,99x)':v==='media'?'Roxo (2–9,99x)':v==='rosa'?'Rosa (10–99,99x)':v==='amarela'?'Amarela (100–499,99x)':v==='vermelha'?'Vermelha (500–999,99x)':'Fogo (≥1000x)';}
function weightedQuantile(items,q){const a=items.filter(x=>Number.isFinite(x.value)&&Number.isFinite(x.weight)&&x.weight>0).sort((x,y)=>x.value-y.value);if(!a.length)return null;const total=a.reduce((s,x)=>s+x.weight,0);let acc=0;for(const x of a){acc+=x.weight;if(acc>=total*q)return x.value;}return a[a.length-1].value;}
function analyze(input,options={}) {
 const now=Number(options.now)||Date.now(),size=Math.max(3,Math.min(6,Number(options.patternSize)||4));
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now).map(r=>({id:r.id,value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const currentRounds=rounds.slice(-size),current=currentRounds.map(r=>category(r.value)),currentLog=currentRounds.map(r=>Math.log(r.value)),matches=[];
 // Busca janelas anteriores semelhantes; cada correspondência contribui com o resultado imediatamente seguinte.
 for(let i=size;i<rounds.length-size;i++){
  const prev=rounds.slice(i-size,i),logs=prev.map(r=>Math.log(r.value)),cats=prev.map(r=>category(r.value));
  let distance=0;
  for(let j=0;j<size;j++){
   const scale=Math.abs(logs[j]-currentLog[j]);
   const categoryPenalty=cats[j]===current[j]?0:0.45;
   distance+=(scale+categoryPenalty)*(j+1)/(size*(size+1)/2);
  }
  const weight=Math.exp(-distance/0.8);
  if(weight>=0.025)matches.push({value:rounds[i].value,ts:rounds[i].ts,patternTs:prev[prev.length-1].ts,weight,distance});
 }
 const next=matches.map(x=>x.value),pinkNext=matches.filter(x=>x.value>=10);
 const minimum=weightedQuantile(matches,.2),median=weightedQuantile(matches,.5),maximum=weightedQuantile(matches,.8);
 const roseMinimum=weightedQuantile(pinkNext,.2),roseMedian=weightedQuantile(pinkNext,.5),roseMaximum=weightedQuantile(pinkNext,.8);
 const occurrences=matches.map(x=>x.patternTs).filter(Number.isFinite),patternGaps=[];
 for(let i=1;i<occurrences.length;i++){const gap=(occurrences[i]-occurrences[i-1])/1000;if(gap>0&&Number.isFinite(gap))patternGaps.push(gap);}
 const pinkRounds=rounds.filter(r=>r.value>=10),pinkGaps=[];
 for(let i=1;i<pinkRounds.length;i++){const gap=(pinkRounds[i].ts-pinkRounds[i-1].ts)/1000;if(gap>0&&Number.isFinite(gap))pinkGaps.push(gap);}
 const lastPinkTs=pinkRounds.length?pinkRounds[pinkRounds.length-1].ts:null,roundsSincePink=lastPinkTs===null?rounds.length:rounds.filter(r=>r.ts>lastPinkTs).length;
 const pinkIntervals={count:pinkGaps.length,roseCount:pinkRounds.length,lastTs:lastPinkTs,roundsSinceLast:roundsSincePink,median:quantile(pinkGaps,.5),p20:quantile(pinkGaps,.2),p80:quantile(pinkGaps,.8),mean:pinkGaps.length?pinkGaps.reduce((a,v)=>a+v,0)/pinkGaps.length:null};
 const thresholds={};TARGETS.forEach(target=>{const hits=rounds.filter(r=>r.value>=target),gaps=[];for(let i=1;i<hits.length;i++){const g=(hits[i].ts-hits[i-1].ts)/1000;if(g>0&&Number.isFinite(g))gaps.push(g);}thresholds[target]={target,count:hits.length,rate:rounds.length?hits.length/rounds.length:null,lastTs:hits.length?hits[hits.length-1].ts:null,gapCount:gaps.length,gapMedian:quantile(gaps,.5),gapP20:quantile(gaps,.2),gapP80:quantile(gaps,.8),gapMean:gaps.length?gaps.reduce((a,v)=>a+v,0)/gaps.length:null};});
 const rates={};TARGETS.forEach(t=>{rates[t]=matches.length?matches.filter(x=>x.value>=t).reduce((s,x)=>s+x.weight,0)/matches.reduce((s,x)=>s+x.weight,0):null;});
 return {roundCount:rounds.length,pinkIntervals,pattern:{labels:current.map(label),categories:current,matches:next.length,minimum,median,maximum,roseMinimum,roseMedian,roseMaximum,roseMatches:pinkNext.length,rates,lastSimilarTs:occurrences.length?occurrences[occurrences.length-1]:null,gapCount:patternGaps.length,gapMedian:quantile(patternGaps,.5),gapP20:quantile(patternGaps,.2),gapP80:quantile(patternGaps,.8),effectiveSampleSize:matches.length?Math.pow(matches.reduce((s,x)=>s+x.weight,0),2)/matches.reduce((s,x)=>s+x.weight*x.weight,0):0,method:'weighted-log-similarity-quantiles'} ,thresholds};
}
root.TheLordProbability={analyze,quantile,TARGETS};
})(typeof globalThis==='object'?globalThis:this);
