(function(root){'use strict';
const TARGETS=[2,10,20,30,50,100,250,500,1000];
function quantile(values,q){const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*q,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l);}
function category(v){return v<2?'baixa':v<10?'media':v<100?'rosa':v<500?'amarela':v<1000?'vermelha':'fogo';}
function label(v){return v==='baixa'?'Azul (1–1,99x)':v==='media'?'Roxo (2–9,99x)':v==='rosa'?'Rosa (10–99,99x)':v==='amarela'?'Amarela (100–499,99x)':v==='vermelha'?'Vermelha (500–999,99x)':'Fogo (≥1000x)';}
function analyze(input,options={}){const now=Number(options.now)||Date.now(),size=Math.max(2,Math.min(8,Number(options.patternSize)||4));
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now).map(r=>({id:r.id,value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const current=rounds.slice(-size).map(r=>category(r.value)),matches=[];
 for(let i=size;i<rounds.length;i++){const prev=rounds.slice(i-size,i).map(r=>category(r.value));if(prev.every((v,j)=>v===current[j]))matches.push({value:rounds[i].value,ts:rounds[i].ts,patternTs:rounds[i-1].ts});}
 const next=matches.map(x=>x.value),pinkNext=next.filter(v=>v>=10),occurrences=matches.map(x=>x.patternTs).filter(Number.isFinite),patternGaps=[];
 for(let i=1;i<occurrences.length;i++){const gap=(occurrences[i]-occurrences[i-1])/1000;if(gap>0&&Number.isFinite(gap))patternGaps.push(gap);}
 const pinkRounds=rounds.filter(r=>r.value>=10),pinkGaps=[];
 for(let i=1;i<pinkRounds.length;i++){const gap=(pinkRounds[i].ts-pinkRounds[i-1].ts)/1000;if(gap>0&&Number.isFinite(gap))pinkGaps.push(gap);}
 const lastPinkTs=pinkRounds.length?pinkRounds[pinkRounds.length-1].ts:null;
 const roundsSincePink=lastPinkTs===null?rounds.length:rounds.filter(r=>r.ts>lastPinkTs).length;
 const pinkIntervals={count:pinkGaps.length,roseCount:pinkRounds.length,lastTs:lastPinkTs,roundsSinceLast:roundsSincePink,median:quantile(pinkGaps,.5),p20:quantile(pinkGaps,.2),p80:quantile(pinkGaps,.8),mean:pinkGaps.length?pinkGaps.reduce((a,v)=>a+v,0)/pinkGaps.length:null};
 const thresholds={};TARGETS.forEach(target=>{const hits=rounds.filter(r=>r.value>=target),gaps=[];for(let i=1;i<hits.length;i++){const g=(hits[i].ts-hits[i-1].ts)/1000;if(g>0&&Number.isFinite(g))gaps.push(g);}
 thresholds[target]={target,count:hits.length,rate:rounds.length?hits.length/rounds.length:null,lastTs:hits.length?hits[hits.length-1].ts:null,gapCount:gaps.length,gapMedian:quantile(gaps,.5),gapP20:quantile(gaps,.2),gapP80:quantile(gaps,.8),gapMean:gaps.length?gaps.reduce((a,v)=>a+v,0)/gaps.length:null};});
 const rates={};TARGETS.forEach(t=>{rates[t]=next.length?next.filter(v=>v>=t).length/next.length:null;});
 return {roundCount:rounds.length,pinkIntervals,pattern:{labels:current.map(label),categories:current,matches:next.length,minimum:next.length>=30?quantile(next,.2):null,maximum:next.length>=30?quantile(next,.8):null,roseMaximum:pinkNext.length>=10?quantile(pinkNext,.8):null,roseMatches:pinkNext.length,rates,lastSimilarTs:occurrences.length?occurrences[occurrences.length-1]:null,gapCount:patternGaps.length,gapMedian:quantile(patternGaps,.5),gapP20:quantile(patternGaps,.2),gapP80:quantile(patternGaps,.8)},thresholds};}
root.TheLordProbability={analyze,quantile,TARGETS};
})(typeof globalThis==='object'?globalThis:this);
