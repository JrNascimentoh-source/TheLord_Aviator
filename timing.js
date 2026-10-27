'use strict';
const timingOptions={hours:1,minimum:10,mode:'digit',period:'all'};
let timingSelected=null;
function setTimingOption(key,value){
  timingOptions[key]=value;timingSelected=null;
  const p=document.getElementById('timingPeriod');if(p)p.value=timingOptions.period;
  const ap=document.getElementById('timingAdvPeriod');if(ap)ap.value=timingOptions.period;
  document.querySelectorAll('.timing-select').forEach(el=>{const key=el.getAttribute('onchange')?.includes("'hours'")?'hours':'minimum';el.value=String(timingOptions[key]);});
  renderTiming();
}
function selectTimingBin(key){timingSelected=key;renderTiming();}
function timingFormatMultiplier(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:2})+'x':'—';}
function timingSetText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
function renderTiming(){
  if(!window.TheLordTiming||typeof currentRounds!=='function')return;
  renderAdvancedTiming();
  return;
  const chart=document.getElementById('timingChart');
  const a=window.TheLordTiming.analyze(currentRounds(),timingOptions);
  const tier=timingOptions.minimum===2?'roxas+':timingOptions.minimum===500?'hot':'rosas+';
  timingSetText('timingGame',data.activeGame==='aviator2'?'Aviator 2':'Aviator');timingSetText('timingClock',nowTimeStr());
  timingSetText('timingTotal',a.total.toLocaleString('pt-BR'));timingSetText('timingHits',a.hits.toLocaleString('pt-BR'));
  timingSetText('timingTierLabel','Velas '+tier+' (≥'+timingOptions.minimum+'x)');timingSetText('timingHouses',a.currentHouses);
  timingSetText('timingPeak',a.ranked.length?a.ranked.filter(b=>b.hits===a.max).map(b=>String(b.key).padStart(timingOptions.mode==='minute'?2:1,'0')).join(', '):'—');
  document.querySelectorAll('[data-timing-option]').forEach(btn=>{const active=String(timingOptions[btn.dataset.timingOption])===btn.dataset.value;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
  const p=document.getElementById('timingPeriod');if(p)p.value=timingOptions.period;const ap=document.getElementById('timingAdvPeriod');if(ap)ap.value=timingOptions.period;
  const g1=document.getElementById('timingGameAviator'),g2=document.getElementById('timingGameAviator2');if(g1)g1.classList.toggle('active',data.activeGame==='aviator');if(g2)g2.classList.toggle('active',data.activeGame==='aviator2');
  chart.className='timing-chart tier-'+(timingOptions.minimum===2?'purple':timingOptions.minimum===500?'hot':'pink')+(timingOptions.mode==='minute'?' full-minutes':'');
  chart.innerHTML=a.bins.map(b=>{const label=String(b.key).padStart(timingOptions.mode==='minute'?2:'1','0');return '<button type="button" class="timing-column'+(b.hits===a.max&&a.max?' peak':'')+(timingSelected===b.key?' selected':'')+'" onclick="selectTimingBin('+b.key+')" aria-label="Minuto '+label+': '+b.hits+' ocorrências, '+b.total+' rodadas" aria-pressed="'+(timingSelected===b.key)+'"><span class="timing-count">'+b.hits+'</span><span class="timing-track"><span class="timing-fill" style="height:'+(a.max?b.hits/a.max*100:0)+'%"></span></span><span class="timing-digit">'+label+'</span></button>';}).join('');
  timingSetText('timingSummary',a.total?a.hits+' velas '+tier+' em '+a.total+' rodadas · '+(a.ranked.length?'Pico: '+a.ranked.filter(b=>b.hits===a.max).map(b=>b.key).join(', ')+' ('+a.max+' ocorrências)':'Nenhuma ocorrência neste período'):(data.activeGame==='aviator2'?'Velas automáticas ainda não ativas para o Aviator 2.':'Aguardando velas do Monitor neste período.'));
  timingSetText('timingCoverage',a.firstTs?'Horário local · Primeira vela da amostra: '+new Date(a.firstTs).toLocaleString('pt-BR'):'Horário local · Sem amostra');
  const hi=document.getElementById('timingHighlights');if(hi)hi.innerHTML=a.ranked.slice(0,3).map(b=>{const mins=timingOptions.mode==='digit'?Array.from({length:6},(_,i)=>String(i*10+b.key).padStart(2,'0')).join(' · '):String(b.key).padStart(2,'0');return '<div class="timing-highlight"><div class="timing-highlight-head"><b>'+(timingOptions.mode==='digit'?'Final '+b.key:'Minuto '+mins)+'</b><span>'+b.hits+' velas</span></div><div class="timing-minute-list">'+(timingOptions.mode==='digit'?mins:'≥'+timingOptions.minimum+'x')+'</div><div class="timing-highlight-meta">'+b.rate.toFixed(1)+'% de '+b.total+' rodadas · '+(b.averageHouses===null?'—':b.averageHouses.toFixed(1))+' casas em média</div></div>';}).join('')||'<div class="timing-empty">Sem ocorrências para comparar neste período.</div>';
  const periods=document.getElementById('timingPeriods');if(periods)periods.innerHTML=a.periods.map(p=>'<tr><th scope="row">'+p.name+'<small>'+(p.name==='Manhã'?'05h–11h59':p.name==='Tarde'?'12h–17h59':'18h–04h59')+'</small></th><td>'+p.total+'</td><td>'+p.hits+'</td><td>'+(p.total?(p.hits/p.total*100).toFixed(1)+'%':'—')+'</td></tr>').join('');
  const selected=a.bins.find(b=>b.key===timingSelected),detail=document.getElementById('timingDetail');if(detail)detail.classList.toggle('hidden',!selected);
  if(selected){timingSetText('timingDetailTitle',(timingOptions.mode==='digit'?'Final ':'Minuto ')+selected.key+' · '+selected.hits+' velas '+tier);const ev=document.getElementById('timingEvents');if(ev)ev.innerHTML=[...selected.events].reverse().slice(0,12).map(r=>'<div class="timing-event"><time>'+nowTimeStr(new Date(r.ts))+'</time><b>'+timingFormatMultiplier(r.value)+'</b><span>'+r.houses+' casas</span></div>').join('')||'<div class="timing-empty">Nenhuma vela neste minuto.</div>';}
  renderAdvancedTiming();
}
function renderAdvancedTiming(){
 const chart=document.getElementById('timingAdvChart');if(!chart||!window.TheLordTiming||typeof currentRounds!=='function')return;
 const a=window.TheLordTiming.analyze(currentRounds(),timingOptions),tier=timingOptions.minimum===2?'roxas+':timingOptions.minimum===500?'hot':'rosas+';
 timingSetText('timingAdvGame',data.activeGame==='aviator2'?'Aviator 2':'Aviator');timingSetText('timingAdvClock',nowTimeStr());timingSetText('timingAdvTotal',a.total.toLocaleString('pt-BR'));timingSetText('timingAdvHits',a.hits.toLocaleString('pt-BR'));timingSetText('timingAdvTierLabel','Velas '+tier+' (≥'+timingOptions.minimum+'x)');timingSetText('timingAdvHouses',a.currentHouses);
 chart.className='timing-chart'+(timingOptions.mode==='minute'?' full-minutes':'');
 chart.innerHTML=a.bins.map(b=>{const label=String(b.key).padStart(timingOptions.mode==='minute'?2:1,'0');return '<button type="button" class="timing-column'+(b.hits===a.max&&a.max?' peak':'')+(timingSelected===b.key?' selected':'')+'" onclick="selectTimingBin('+b.key+')" aria-label="Minuto '+label+': '+b.hits+' ocorrências, '+b.total+' rodadas" aria-pressed="'+(timingSelected===b.key)+'"><span class="timing-count">'+b.hits+'</span><span class="timing-track"><span class="timing-fill" style="height:'+(a.max?b.hits/a.max*100:0)+'%"></span></span><span class="timing-digit">'+label+'</span></button>';}).join('');
 timingSetText('timingAdvSummary',a.total?a.hits+' ocorrências em '+a.total+' rodadas · '+(a.ranked.length?'Pico: '+a.ranked.filter(b=>b.hits===a.max).map(b=>b.key).join(', ')+' ('+a.max+' ocorrências)':'Nenhuma ocorrência neste período'):(data.activeGame==='aviator2'?'Velas automáticas ainda não ativas para o Aviator 2.':'Aguardando velas do Monitor neste período.'));
 timingSetText('timingAdvCoverage',a.firstTs?'Horário local · Primeira vela da amostra: '+new Date(a.firstTs).toLocaleString('pt-BR'):'Horário local · Sem amostra');
 const highlights=document.getElementById('timingHighlights');if(highlights)highlights.innerHTML=a.ranked.slice(0,3).map(b=>{const minutes=timingOptions.mode==='digit'?Array.from({length:6},(_,i)=>String(i*10+b.key).padStart(2,'0')).join(' · '):String(b.key).padStart(2,'0');return '<div class="timing-highlight"><div class="timing-highlight-head"><b>'+(timingOptions.mode==='digit'?'Final '+b.key:'Minuto '+minutes)+'</b><span>'+b.hits+' velas</span></div><div class="timing-minute-list">'+(timingOptions.mode==='digit'?minutes:'≥'+timingOptions.minimum+'x')+'</div><div class="timing-highlight-meta">'+b.rate.toFixed(1)+'% de '+b.total+' rodadas · '+(b.averageHouses===null?'—':b.averageHouses.toFixed(1))+' casas em média</div></div>';}).join('')||'<div class="timing-empty">Sem ocorrências para comparar neste período.</div>';
 const ps=document.getElementById('timingAdvPeriods');if(ps)ps.innerHTML=a.periods.map(p=>'<tr><th scope="row">'+p.name+'</th><td>'+p.total+'</td><td>'+p.hits+'</td><td>'+(p.total?(p.hits/p.total*100).toFixed(1)+'%':'—')+'</td></tr>').join('');
 const selected=a.bins.find(b=>b.key===timingSelected),detail=document.getElementById('timingAdvDetail');if(detail)detail.classList.toggle('hidden',!selected);
 if(selected){timingSetText('timingAdvDetailTitle',(timingOptions.mode==='digit'?'Final ':'Minuto ')+selected.key+' · '+selected.hits+' ocorrências');const ev=document.getElementById('timingAdvEvents');if(ev)ev.innerHTML=[...selected.events].reverse().slice(0,12).map(r=>'<div class="timing-event"><time>'+nowTimeStr(new Date(r.ts))+'</time><b>'+timingFormatMultiplier(r.value)+'</b><span>'+r.houses+' casas</span></div>').join('')||'<div class="timing-empty">Nenhuma ocorrência neste agrupamento.</div>';}
}
setInterval(()=>{if(!document.getElementById('timing')?.classList.contains('hidden'))renderTiming();},30000);
