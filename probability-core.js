(function(root){'use strict';
const TARGETS=[2,10,20,30,50,100,250,500,1000];
function quantile(values,q){
  const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const index=(sorted.length-1)*q,lo=Math.floor(index),hi=Math.ceil(index);
  return sorted[lo]+(sorted[hi]-sorted[lo])*(index-lo);
}
function category(value){return value<2?'baixa':value<10?'media':value<100?'rosa':value<500?'amarela':value<1000?'vermelha':'fogo';}
function label(value){return value==='baixa'?'Baixa':value==='media'?'Média':value==='rosa'?'Rosa':value==='amarela'?'Amarela':value==='vermelha'?'Vermelha':'Fogo';}
function analyze(input,options={}){
 const now=Number(options.now)||Date.now(),patternSize=Math.max(2,Math.min(8,Number(options.patternSize)||4));
 const rounds=(Array.isArray(input)?input:[]).filter(r=>r&&Number.isFinite(Number(r.value))&&Number(r.value)>=1&&Number.isFinite(Number(r.ts))&&Number(r.ts)<=now)
  .map(r=>({id:r.id,value:Number(r.value),ts:Number(r.ts)})).sort((a,b)=>a.ts-b.ts);
 const current=rounds.slice(-patternSize).map(r=>category(r.value)),matches=[];
 for(let i=patternSize;i<rounds.length;i++){
  const prior=rounds.slice(i-patternSize,i).map(r=>category(r.value));
  if(prior.every((v,j)=>v===current[j]))matches.push(rounds[i].value);
 }
 const thresholds={};
 TARGETS.forEach(target=>{
  const hits=rounds.filter(r=>r.value>=target),gaps=[];
  for(let i=1;i<hits.length;i++){const gap=(hits[i].ts-hits[i-1].ts)/1000;if(gap>0&&Number.isFinite(gap))gaps.push(gap);}
  thresholds[target]={target,count:hits.length,rate:rounds.length?hits.length/rounds.length:null,lastTs:hits.length?hits[hits.length-1].ts:null,
   gapCount:gaps.length,gapMedian:quantile(gaps,.5),gapP20:quantile(gaps,.2),gapP80:quantile(gaps,.8),gapMean:gaps.length?gaps.reduce((a,v)=>a+v,0)/gaps.length:null};
 });
 const rates={};
 TARGETS.forEach(target=>{rates[target]=matches.length?matches.filter(v=>v>=target).length/matches.length:null;});
 return {roundCount:rounds.length,pattern:{labels:current.map(label),categories:current,matches:matches.length,
  minimum:matches.length>=20?quantile(matches,.2):null,maximum:matches.length>=20?quantile(matches,.8):null,rates},thresholds};
}
root.TheLordProbability={analyze,quantile,TARGETS};
})(typeof globalThis==='object'?globalThis:this);
