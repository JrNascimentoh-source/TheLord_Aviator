'use strict';
const timingOptions={hours:1,minimum:10,mode:'digit',period:'all'};
let timingSelected=null;
const timingPickerOptions={"hours":[["1","Última hora"],["6","Últimas 6 Hrs"],["12","Últimas 12 Hrs"],["24","Últimas 24 Hrs"]],"minimum":[["2","⚡ ≥2x"],["10","🌀 ≥10x"],["50","🔥 ≥50x"],["100","🚀 ≥100x"],["500","⭐ ≥500x"],["1000","🌟 ≥1000x"]],"period":[["all","Todo o dia"],["Manhã","Manhã (05–11h)"],["Tarde","Tarde (12–17h)"],["Noite","Noite (18–04h)"]]};
function toggleTimingPicker(id,force){
  const menu=document.getElementById(id+'Menu'),trigger=document.getElementById(id+'Trigger');
  if(!menu||!trigger)return;
  const open=typeof force==='boolean'?force:menu.hidden;
  document.querySelectorAll('.timing-picker-menu').forEach(other=>{if(other!==menu)other.hidden=true;});
  document.querySelectorAll('.timing-picker-trigger').forEach(other=>{if(other!==trigger)other.setAttribute('aria-expanded','false');});
  menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
}
function updateTimingPickers(){
  Object.keys(timingPickerOptions).forEach(key=>{
    const id='timing'+key[0].toUpperCase()+key.slice(1),value=String(timingOptions[key]);
    const label=document.getElementById(id+'Label'),menu=document.getElementById(id+'Menu'),trigger=document.getElementById(id+'Trigger');
    const option=timingPickerOptions[key].find(item=>item[0]===value)||timingPickerOptions[key][0];
    if(label)label.textContent=option[1];
    if(trigger)trigger.setAttribute('aria-label',option[1]);
    if(menu)menu.querySelectorAll('[data-timing-picker-value]').forEach(button=>{
      const active=button.dataset.timingPickerValue===value;
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
  });
}
function setTimingOption(key,value){
  timingOptions[key]=value;timingSelected=null;
  const p=document.getElementById('timingPeriod');if(p)p.value=timingOptions.period;
  const ap=document.getElementById('timingAdvPeriod');if(ap)ap.value=timingOptions.period;
  updateTimingPickers();
  document.querySelectorAll('.timing-picker-menu').forEach(menu=>menu.hidden=true);
  document.querySelectorAll('.timing-picker-trigger').forEach(trigger=>trigger.setAttribute('aria-expanded','false'));
  document.querySelectorAll('[data-timing-option="mode"]').forEach(button=>button.classList.toggle('active',button.dataset.value===String(timingOptions.mode)));
  renderTiming();
}
function selectTimingBin(key){timingSelected=key;renderTiming();}
function timingFormatMultiplier(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:2})+'x':'—';}
function timingSetText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
function renderTiming(){
  if(!window.TheLordTiming||typeof currentRounds!=='function')return;
  renderAdvancedTiming();
}
function renderAdvancedTiming(){
 const chart=document.getElementById('timingAdvChart');if(!window.TheLordTiming||typeof currentRounds!=='function')return;
 const a=window.TheLordTiming.analyze(currentRounds(),timingOptions),tier='≥'+timingOptions.minimum+'x';
 updateTimingPickers();
 timingSetText('timingAdvGame',data.activeGame==='aviator2'?'Aviator BdPv':'Aviator 7a7');timingSetText('timingAdvClock',nowTimeStr());timingSetText('timingAdvTotal',a.total.toLocaleString('pt-BR'));timingSetText('timingAdvHits',a.hits.toLocaleString('pt-BR'));timingSetText('timingAdvTierLabel','Velas (≥'+timingOptions.minimum+'x)');timingSetText('timingAdvHousesLabel','Casas desde '+tier);timingSetText('timingAdvHouses',a.currentHouses);
 if(chart){chart.className='timing-chart'+(timingOptions.mode==='minute'?' full-minutes':'');
 chart.innerHTML=a.bins.map(b=>{const label=String(b.key).padStart(timingOptions.mode==='minute'?2:1,'0');return '<button type="button" class="timing-column'+(b.hits===a.max&&a.max?' peak':'')+(timingSelected===b.key?' selected':'')+'" onclick="selectTimingBin('+b.key+')" aria-label="Minuto '+label+': '+b.hits+' ocorrências, '+b.total+' rodadas" aria-pressed="'+(timingSelected===b.key)+'"><span class="timing-count">'+b.hits+'</span><span class="timing-track"><span class="timing-fill" style="height:'+(a.max?b.hits/a.max*100:0)+'%"></span></span><span class="timing-digit">'+label+'</span></button>';}).join('');}
 timingSetText('timingAdvSummary',a.total?a.hits+' ocorrências em '+a.total+' rodadas · '+(a.ranked.length?'Pico: '+a.ranked.filter(b=>b.hits===a.max).map(b=>b.key).join(', ')+' ('+a.max+' ocorrências)':'Nenhuma ocorrência neste período'):(data.activeGame==='aviator2'?'Aguardando velas do Aviator BdPv neste período.':'Aguardando velas do Monitor neste período.'));
 timingSetText('timingAdvCoverage',a.firstTs?'Horário local · Primeira vela da amostra: '+new Date(a.firstTs).toLocaleString('pt-BR'):'Horário local · Sem amostra');
 const highlights=document.getElementById('timingHighlights');if(highlights)highlights.innerHTML=a.ranked.slice(0,3).map(b=>{const minutes=timingOptions.mode==='digit'?Array.from({length:6},(_,i)=>String(i*10+b.key).padStart(2,'0')).join(' · '):String(b.key).padStart(2,'0');return '<div class="timing-highlight"><div class="timing-highlight-head"><b>'+(timingOptions.mode==='digit'?'Final '+b.key:'Minuto '+minutes)+'</b><span>'+b.hits+' velas</span></div><div class="timing-minute-list">'+(timingOptions.mode==='digit'?minutes:'≥'+timingOptions.minimum+'x')+'</div><div class="timing-highlight-meta">'+b.rate.toFixed(1)+'% de '+b.total+' rodadas · '+(b.averageHouses===null?'—':b.averageHouses.toFixed(1))+' casas em média</div></div>';}).join('')||'<div class="timing-empty">Sem ocorrências para comparar neste período.</div>';
 const ps=document.getElementById('timingAdvPeriods');if(ps)ps.innerHTML=a.periods.map(p=>'<tr><th scope="row">'+p.name+'</th><td>'+p.total+'</td><td>'+p.hits+'</td><td>'+(p.total?(p.hits/p.total*100).toFixed(1)+'%':'—')+'</td></tr>').join('');
 const selected=a.bins.find(b=>b.key===timingSelected),detail=document.getElementById('timingAdvDetail');if(detail)detail.classList.toggle('hidden',!selected);
 if(selected){timingSetText('timingAdvDetailTitle',(timingOptions.mode==='digit'?'Final ':'Minuto ')+selected.key+' · '+selected.hits+' ocorrências');const ev=document.getElementById('timingAdvEvents');if(ev)ev.innerHTML=[...selected.events].reverse().slice(0,12).map(r=>'<div class="timing-event"><time>'+nowTimeStr(new Date(r.ts))+'</time><b>'+timingFormatMultiplier(r.value)+'</b><span>'+r.houses+' casas</span></div>').join('')||'<div class="timing-empty">Nenhuma ocorrência neste agrupamento.</div>';}
}
updateTimingPickers();
document.querySelectorAll('[data-timing-option="mode"]').forEach(button=>button.classList.toggle('active',button.dataset.value===String(timingOptions.mode)));
setInterval(()=>{if(!document.getElementById('timing')?.classList.contains('hidden'))renderTiming();},30000);
