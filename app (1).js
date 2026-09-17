/* ======================================================
   STORAGE & MODELO DE DADOS
   Leitura/escrita segura (com fallback em memória caso
   localStorage esteja bloqueado) + estrutura de dados.
====================================================== */
const STORAGE_KEY='lord_demo_data_oficial_zerada_v1';
const memoryFallback={};
let storageIsLocal=true;
function storageGet(key){
  try{ return localStorage.getItem(key); }
  catch(e){ storageIsLocal=false; return Object.prototype.hasOwnProperty.call(memoryFallback,key)?memoryFallback[key]:null; }
}
function storageSet(key,value){
  try{ localStorage.setItem(key,value); }
  catch(e){ storageIsLocal=false; memoryFallback[key]=value; }
}
let data;
try{
  data=JSON.parse(storageGet(STORAGE_KEY)||'null')||{
    started:false,initial:0,current:0,wins:0,losses:0,totalWin:0,totalLoss:0,days:0,entries:[],withdrawals:[],alerts:{win:false,loss:false,date:''}
  };
}catch(e){
  data={started:false,initial:0,current:0,wins:0,losses:0,totalWin:0,totalLoss:0,days:0,entries:[],withdrawals:[],alerts:{win:false,loss:false,date:''}};
}
if(!Array.isArray(data.entries)) data.entries=[];
if(!Array.isArray(data.withdrawals)) data.withdrawals=[];
if(!data.alerts || typeof data.alerts!=='object') data.alerts={win:false,loss:false,date:''};
if(!Array.isArray(data.rounds)) data.rounds=[];
if(!data.roundsByGame || typeof data.roundsByGame!=='object'){
  data.roundsByGame={aviator:data.rounds.length?data.rounds:[],aviator2:[]};
}
if(!Array.isArray(data.roundsByGame.aviator)) data.roundsByGame.aviator=[];
if(!Array.isArray(data.roundsByGame.aviator2)) data.roundsByGame.aviator2=[];
if(!data.activeGame || !data.roundsByGame[data.activeGame]) data.activeGame='aviator';
if(data.scenario===undefined) data.scenario=null;
if(data.managementDays===undefined) data.managementDays=null;
if(data.freeManagement===undefined) data.freeManagement=false;
if(data.contagemAtivada===undefined) data.contagemAtivada=true;

const money=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';

function save(){storageSet(STORAGE_KEY,JSON.stringify(data))}

/* ======================================================
   CALCULADORA & GESTÃO DE BANCA
   Cenários (Conservador/Moderado/Agressivo), tempo de
   gestão, projeção, registro de entradas (WIN/LOSS) e
   indicadores de meta batida.
====================================================== */
let projectionDays=10;
let freeManagementChecked=false;
function setProjectionDays(days){
  projectionDays=days;
  [10,20,30].forEach(d=>document.getElementById('proj'+d).classList.toggle('active',d===days));
  renderProjection();
}
function toggleFree30(checked){
  freeManagementChecked=checked;
  const tabs=document.getElementById('daysTabs');
  const toggle=document.getElementById('free30Toggle');
  if(checked){
    setProjectionDays(30);
    tabs.querySelectorAll('.projection-tab').forEach(b=>b.classList.add('locked'));
    toggle.classList.add('checked');
  }else{
    tabs.querySelectorAll('.projection-tab').forEach(b=>b.classList.remove('locked'));
    toggle.classList.remove('checked');
  }
}
let projectionRate=0.20;
function setProjectionScenario(rate){
  projectionRate=rate;
  document.getElementById('scenConservative').classList.toggle('active',rate===0.10);
  document.getElementById('scenModerate').classList.toggle('active',rate===0.20);
  document.getElementById('scenAggressive').classList.toggle('active',rate===0.30);
  const badge=document.getElementById('projectionBadge');
  if(badge) badge.textContent=(rate*100).toFixed(0)+'% da banca inicial / dia';
  const sub=document.querySelector('.projection-sub');
  if(sub) sub.innerHTML='Projeção matemática caso a meta de <b>'+(rate*100).toFixed(0)+'% da banca inicial por dia</b> seja alcançada consecutivamente.';
  renderProjection();
}
function renderProjection(){
  const b=parseFloat(document.getElementById('bank').value)||0;
  const initialEl=document.getElementById('projectionInitial');
  const finalEl=document.getElementById('projectionFinal');
  const list=document.getElementById('projectionList');
  if(!initialEl||!finalEl||!list)return;
  initialEl.textContent=money(b);
  const dailyTarget=b*projectionRate;
  let current=b;
  let html='';
  for(let day=1;day<=projectionDays;day++){
    const start=current;
    current=b+(dailyTarget*day);
    html+=`<div class="projection-day"><div class="projection-day-label">DIA ${day}</div><div class="projection-flow">${money(start)} → <b>${money(current)}</b></div><div class="projection-profit">+${money(dailyTarget)}</div></div>`;
  }
  finalEl.textContent=money(current);
  list.innerHTML=html||'<div class="entry-empty">Informe sua banca para visualizar a projeção.</div>';
}

function calc(){
  const b=parseFloat(document.getElementById('bank').value)||0;
  document.getElementById('hand1').textContent=money(b*.10);
  document.getElementById('hand2').textContent=money(b*.03);
  document.getElementById('stopWin').textContent=money(b*.20)+' — '+money(b*.30);
  document.getElementById('stopLoss').textContent=money(b*.20);
  const todayWin=data.entries.filter(e=>e.type==='WIN' && e.date===new Date().toLocaleDateString('pt-BR')).reduce((a,e)=>a+Number(e.value||0),0);
  const todayLoss=data.entries.filter(e=>e.type==='LOSS' && e.date===new Date().toLocaleDateString('pt-BR')).reduce((a,e)=>a+Number(e.value||0),0);
  const tr=document.getElementById('todayResult');
  const tl=document.getElementById('todayLoss');
  const ts=document.getElementById('todayStopLoss');
  if(tr) tr.textContent='+'+money(todayWin-todayLoss);
  if(tl) tl.textContent=money(todayLoss);
  if(ts) ts.textContent='Stop Loss: '+money(b*.20);
  renderGoalIndicators();
  applyScenarioLock();
  renderProjection();
}
function renderGoalIndicators(){
  const today=new Date().toLocaleDateString('pt-BR');
  const winHit=data.alerts && data.alerts.date===today && data.alerts.win===true;
  const lossHit=data.alerts && data.alerts.date===today && data.alerts.loss===true;
  const winBox=document.getElementById('stopWinBox');
  const lossBox=document.getElementById('stopLossBox');
  const winIcon=document.getElementById('stopWinIcon');
  const lossIcon=document.getElementById('stopLossIcon');
  if(winBox) winBox.classList.toggle('goal-hit-win',winHit);
  if(lossBox) lossBox.classList.toggle('goal-hit-loss',lossHit);
  if(winIcon) winIcon.classList.toggle('hidden',!winHit);
  if(lossIcon) lossIcon.classList.toggle('hidden',!lossHit);
}
function startManagement(){
  const b=parseFloat(document.getElementById('bank').value)||0;
  if(b<=0){alert('Digite um valor de banca válido.');return}
  const scenarioNames={0.1:'Conservador ✅',0.2:'Moderado 📊',0.3:'Agressivo 🔥'};
  const chosenLabel=scenarioNames[projectionRate]||'Moderado 📊';
  const chosenDays=freeManagementChecked?30:projectionDays;
  const daysMsg=freeManagementChecked?(chosenDays+' dias (Gestão livre)'):(chosenDays+' dias');
  const confirmMsg='Confirme sua gestão:\n\n• Cenário: '+chosenLabel+' ('+(projectionRate*100).toFixed(0)+'%/dia)\n• Tempo de Gestão: '+daysMsg+'\n\nEssas escolhas ficarão FIXAS durante toda a gestão atual — só é possível trocar finalizando esta gestão e iniciando um novo mês.\n\nDeseja confirmar e iniciar a gestão?';
  if(!confirm(confirmMsg)) return;
  const keepRounds=data.roundsByGame;
  const keepGame=data.activeGame;
  data={started:true,initial:b,current:b,wins:0,losses:0,totalWin:0,totalLoss:0,days:0,entries:[],withdrawals:[],alerts:{win:false,loss:false,gordura:0,date:new Date().toLocaleDateString('pt-BR')},scenario:projectionRate,managementDays:chosenDays,freeManagement:freeManagementChecked,roundsByGame:keepRounds,activeGame:keepGame};
  document.getElementById('bank').classList.remove('example');
  save(); updateOverview(); applyScenarioLock();
  alert('Gestão iniciada com '+money(b)+' — Cenário '+chosenLabel+' ('+(projectionRate*100).toFixed(0)+'%/dia) — '+daysMsg+'.');
}
function applyScenarioLock(){
  const note=document.getElementById('scenarioLockNote');
  const btnC=document.getElementById('scenConservative');
  const btnM=document.getElementById('scenModerate');
  const btnA=document.getElementById('scenAggressive');
  const names={0.1:'Conservador ✅ (10%/dia)',0.2:'Moderado 📊 (20%/dia)',0.3:'Agressivo 🔥 (30%/dia)'};
  const daysNote=document.getElementById('daysLockNote');
  const daysTabs=document.getElementById('daysTabs');
  const free30Toggle=document.getElementById('free30Toggle');
  const free30Check=document.getElementById('free30Check');
  const locked=data.started && (data.scenario===0.1||data.scenario===0.2||data.scenario===0.3) && (data.managementDays===10||data.managementDays===20||data.managementDays===30);
  if(locked){
    if(projectionRate!==data.scenario){ setProjectionScenario(data.scenario); }
    [btnC,btnM,btnA].forEach(b=>b&&b.classList.add('locked'));
    const chosen=data.scenario===0.1?btnC:(data.scenario===0.3?btnA:btnM);
    if(chosen) chosen.classList.remove('locked');
    if(note){
      note.textContent='🔒 Cenário fixado: '+(names[data.scenario]||'')+' — só é possível trocar iniciando um novo mês.';
      note.classList.remove('hidden');
    }
    if(projectionDays!==data.managementDays){ setProjectionDays(data.managementDays); }
    if(daysTabs) daysTabs.querySelectorAll('.projection-tab').forEach(b=>b.classList.add('locked'));
    if(free30Toggle) free30Toggle.classList.add('locked');
    if(free30Check) free30Check.checked=!!data.freeManagement;
    if(daysNote){
      daysNote.textContent='🔒 Tempo de Gestão fixado: '+data.managementDays+' dias'+(data.freeManagement?' (Gestão livre)':'')+' — só é possível trocar iniciando um novo mês.';
      daysNote.classList.remove('hidden');
    }
  } else {
    [btnC,btnM,btnA].forEach(b=>b&&b.classList.remove('locked'));
    if(note){ note.classList.add('hidden'); note.textContent=''; }
    if(daysTabs && !freeManagementChecked) daysTabs.querySelectorAll('.projection-tab').forEach(b=>b.classList.remove('locked'));
    if(free30Toggle) free30Toggle.classList.remove('locked');
    if(daysNote){ daysNote.classList.add('hidden'); daysNote.textContent=''; }
  }
}
function getPeriod(hour){
  if(hour>=5 && hour<12) return 'Manhã';
  if(hour>=12 && hour<18) return 'Tarde';
  return 'Noite';
}
function registerEntry(){
  if(!data.started){alert('Primeiro confirme sua banca na Calculadora para iniciar a gestão.');return}
  const type=document.getElementById('resultType').value;
  const val=parseFloat(document.getElementById('resultValue').value)||0;
  if(val<=0){alert('Informe um valor válido.');return}
  const now=new Date();
  const today=now.toLocaleDateString('pt-BR');
  if(data.alerts.date!==today){data.alerts={win:false,loss:false,gordura:0,date:today}}
  const entry={id:Date.now(),type,value:val,date:today,time:now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),period:getPeriod(now.getHours())};
  data.entries.push(entry);
  if(type==='WIN'){data.wins++;data.totalWin+=val;data.current+=val}
  else{data.losses++;data.totalLoss+=val;data.current=Math.max(0,data.current-val)}
  data.days=new Set(data.entries.map(e=>e.date)).size;
  save();updateOverview();renderEntryReport();calc();

  const todayWin=data.entries.filter(e=>e.type==='WIN' && e.date===today).reduce((a,e)=>a+Number(e.value||0),0);
  const todayLoss=data.entries.filter(e=>e.type==='LOSS' && e.date===today).reduce((a,e)=>a+Number(e.value||0),0);
  const stopTarget=data.initial*.20;
  const gordura=Math.max(0,todayWin-stopTarget);
  if(todayWin>=stopTarget && !data.alerts.win){
    data.alerts.win=true;
    data.alerts.gordura=gordura;
    save();
    alert('🟢 STOP WIN ALCANÇADO!\n\nResultado positivo do dia: '+money(todayWin)+'\nMeta mínima de Stop Win: '+money(stopTarget)+'\n💰 Gordura acima da meta: '+money(gordura)+'\n\nGestão diária concluída.');
  } else if(todayWin>stopTarget && data.alerts.win && gordura>(Number(data.alerts.gordura)||0)){
    data.alerts.gordura=gordura;
    save();
    alert('💰 GORDURA DA META!\n\nMeta de Stop Win: '+money(stopTarget)+'\nResultado do dia: '+money(todayWin)+'\nGordura acumulada acima da meta: '+money(gordura)+'\n\nEsse valor está acima da meta diária.');
  } else if(todayLoss>=stopTarget && !data.alerts.loss){
    data.alerts.loss=true;save();
    alert('🔴 STOP LOSS ALCANÇADO!\n\nPerda do dia: '+money(todayLoss)+'\nLimite de Stop Loss: '+money(stopTarget)+'\n\nEncerre a gestão do dia para respeitar o limite.');
  } else {
    alert('Entrada registrada com sucesso.');
  }
  renderGoalIndicators();
}


/* ======================================================
   SANGRIA (RETIRADAS)
   Saldo disponível, quebra de gerenciamento e histórico
   de retiradas.
====================================================== */
let pendingWithdrawal=null;
let breachChoice=null;

function makeWithdrawal(){
  if(!data.started){alert('Primeiro confirme sua banca na Calculadora para iniciar a gestão.');return}
  const val=parseFloat(document.getElementById('withdrawalValue').value)||0;
  if(val<=0){alert('Informe um valor de sangria válido.');return}
  if(val>data.current){alert('O valor da sangria não pode ser maior que a Banca Atual de '+money(data.current)+'.');return}

  const available=Math.max(0,data.current-data.initial);
  if(val>available){
    pendingWithdrawal=val;
    breachChoice=null;
    document.getElementById('radioKeep').classList.remove('picked');
    document.getElementById('radioLeave').classList.remove('picked');
    document.querySelectorAll('input[name="breachChoice"]').forEach(r=>r.checked=false);
    document.getElementById('breachModalError').classList.add('hidden');
    document.getElementById('breachModalOverlay').classList.remove('hidden');
    return;
  }
  executeWithdrawal(val,false);
}

function executeWithdrawal(val,breach){
  const now=new Date();
  const entry={id:Date.now(),value:val,date:now.toLocaleDateString('pt-BR'),time:now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),period:getPeriod(now.getHours()),breach:!!breach};
  data.withdrawals.push(entry);
  data.current-=val;
  save();
  document.getElementById('withdrawalValue').value=0;
  updateOverview();
  renderWithdrawalReport();
  if(breach){
    alert('⚠️ Retirada realizada quebrando o gerenciamento.\n\nValor retirado: '+money(val)+'\nBanca atual: '+money(data.current));
  } else {
    alert('💰 Sangria realizada com sucesso.\n\nValor retirado: '+money(val)+'\nBanca atual: '+money(data.current));
  }
}

function selectBreachChoice(choice){
  breachChoice=choice;
  document.getElementById('radioKeep').classList.toggle('picked',choice==='keep');
  document.getElementById('radioLeave').classList.toggle('picked',choice==='leave');
  document.getElementById('breachModalError').classList.add('hidden');
}

function closeBreachModal(){
  document.getElementById('breachModalOverlay').classList.add('hidden');
  pendingWithdrawal=null;
  breachChoice=null;
}

function confirmBreachChoice(){
  if(!breachChoice){
    document.getElementById('breachModalError').classList.remove('hidden');
    return;
  }
  const val=pendingWithdrawal;
  if(breachChoice==='keep'){
    closeBreachModal();
    document.getElementById('withdrawalValue').value=0;
    const overviewMain=document.getElementById('overview');
    if(overviewMain) overviewMain.scrollIntoView({behavior:'smooth',block:'start'});
  } else {
    closeBreachModal();
    if(val) executeWithdrawal(val,true);
  }
}

function renderWithdrawalBalances(){
  const wi=document.getElementById('wdInitial');
  const wc=document.getElementById('wdCurrent');
  const wa=document.getElementById('wdAvailable');
  if(!wi||!wc||!wa)return;
  wi.textContent=money(data.initial);
  wc.textContent=money(data.current);
  const available=Math.max(0,data.current-data.initial);
  wa.textContent=money(available);
}

function renderWithdrawalReport(){
  const list=document.getElementById('withdrawalList');
  if(!list)return;
  if(!data.withdrawals.length){list.innerHTML='<div class="withdrawal-empty">Nenhuma retirada realizada ainda.</div>';return}
  list.innerHTML=[...data.withdrawals].reverse().map(w=>`<div class="withdrawal-item${w.breach?' breach':''}"><div class="withdrawal-top"><span class="withdrawal-label">${w.breach?'⚠️ SANGRIA (QUEBRA)':'💰 SANGRIA'}</span><span class="withdrawal-value">-${money(w.value)}</span><div class="item-actions"><button class="item-action-btn delete" onclick="deleteWithdrawal(${w.id})">✕</button></div></div><div class="withdrawal-meta"><span>📅 ${w.date}</span><span>🕐 ${w.period}</span><span>⏰ ${w.time}</span></div></div>`).join('');
}

function deleteWithdrawal(id){
  if(!confirm('Excluir esta retirada? A banca atual será ajustada de volta.')) return;
  const w=data.withdrawals.find(x=>x.id===id);
  if(!w)return;
  data.current+=Number(w.value||0);
  data.withdrawals=data.withdrawals.filter(x=>x.id!==id);
  save();
  updateOverview();
  renderWithdrawalReport();
}

function renderEntryReport(){
  const list=document.getElementById('entryList');
  if(!list)return;
  if(!data.entries.length){list.innerHTML='<div class="entry-empty">Nenhuma entrada registrada ainda.</div>';return}
  list.innerHTML=[...data.entries].reverse().map(e=>{
    const win=e.type==='WIN';
    const label=win?'🟢 STOP WIN':'🔴 STOP LOSS';
    const cls=win?'win':'loss';
    const sign=win?'+':'-';
    const period=e.period||getPeriod(Number((e.time||'00:00').split(':')[0]));
    return `<div class="entry-item"><div class="entry-top"><span class="entry-result ${cls}">${label}</span><span class="entry-value ${cls}">${sign}${money(e.value)}</span><div class="item-actions"><button class="item-action-btn delete" onclick="deleteEntry(${e.id})">✕</button></div></div><div class="entry-meta"><span>📅 ${e.date}</span><span>🕐 ${period}</span><span>⏰ ${e.time}</span></div></div>`;
  }).join('');
}

function deleteEntry(id){
  if(!confirm('Excluir esta entrada? Os totais serão recalculados.')) return;
  const e=data.entries.find(x=>x.id===id);
  if(!e)return;
  if(e.type==='WIN'){data.wins=Math.max(0,data.wins-1);data.totalWin=Math.max(0,data.totalWin-Number(e.value||0));data.current=Math.max(0,data.current-Number(e.value||0))}
  else{data.losses=Math.max(0,data.losses-1);data.totalLoss=Math.max(0,data.totalLoss-Number(e.value||0));data.current+=Number(e.value||0)}
  data.entries=data.entries.filter(x=>x.id!==id);
  data.days=new Set(data.entries.map(x=>x.date)).size;
  save();
  updateOverview();
  renderEntryReport();
  calc();
}


/* ======================================================
   RELATÓRIO DE GERENCIAMENTO (PDF)
   Geração do relatório via impressão do navegador.
====================================================== */
function openReportModal(){
  if(!data.entries.length){alert('Ainda não há entradas registradas nesta gestão para gerar um relatório.');return}
  document.getElementById('reportPlatform').value='';
  document.getElementById('reportModalError').classList.add('hidden');
  document.getElementById('reportModalOverlay').classList.remove('hidden');
}
function closeReportModal(){
  document.getElementById('reportModalOverlay').classList.add('hidden');
}
function generateReport(){
  const platform=(document.getElementById('reportPlatform').value||'').trim();
  if(!platform){
    document.getElementById('reportModalError').classList.remove('hidden');
    return;
  }

  const initial=data.initial;
  const daysOp=data.days;
  const daysOff=data.managementDays?Math.max(0,data.managementDays-daysOp):null;
  const totalEntries=data.entries.length;

  const now=new Date();
  const wStart=startOfWeek(now);
  const mStart=new Date(now.getFullYear(),now.getMonth(),1);
  let weekTotal=0,monthTotal=0;
  data.entries.forEach(e=>{
    const d=parseBRDate(e.date);
    const signed=(e.type==='WIN'?1:-1)*Number(e.value||0);
    if(d>=mStart) monthTotal+=signed;
    if(d>=wStart) weekTotal+=signed;
  });
  const weekPct=initial?(weekTotal/initial*100):0;
  const monthPct=initial?(monthTotal/initial*100):0;

  const dateMap={};
  data.entries.forEach(e=>{
    if(!dateMap[e.date]) dateMap[e.date]={win:0,loss:0};
    if(e.type==='WIN') dateMap[e.date].win+=Number(e.value||0);
    else dateMap[e.date].loss+=Number(e.value||0);
  });
  const stopTarget=initial*.20;
  const gains=[],losses=[];
  Object.keys(dateMap).sort((a,b)=>parseBRDate(a)-parseBRDate(b)).forEach(date=>{
    const d=dateMap[date];
    if(stopTarget>0 && d.win>=stopTarget){
      gains.push({date,value:d.win});
    } else if(d.loss>0){
      losses.push({date,value:d.loss,label:'Loss'});
    }
  });

  const nonBreachWithdrawals=data.withdrawals.filter(w=>!w.breach);
  const breachWithdrawals=data.withdrawals.filter(w=>w.breach);
  nonBreachWithdrawals.forEach(w=>losses.push({date:w.date,value:Number(w.value||0),label:'Sangria'}));
  losses.sort((a,b)=>parseBRDate(a.date)-parseBRDate(b.date));

  const totalGanho=gains.reduce((a,g)=>a+g.value,0);
  const totalPerda=losses.reduce((a,l)=>a+l.value,0);
  const totalBruto=totalGanho+totalPerda+initial;
  const totalLiquido=totalGanho-totalPerda-initial;
  const totalSangrias=data.withdrawals.length;
  const breachCount=breachWithdrawals.length;
  const breachTotal=breachWithdrawals.reduce((a,w)=>a+Number(w.value||0),0);

  document.getElementById('prMeta').innerHTML=
    'Plataforma: <b>'+platform.replace(/</g,'&lt;')+'</b><br>'+
    'Gerado em: '+now.toLocaleDateString('pt-BR')+' às '+nowTimeStr(now);

  document.getElementById('prInitial').textContent=money(initial);
  document.getElementById('prDaysOp').textContent=daysOp;
  document.getElementById('prDaysOff').textContent=daysOff===null?'—':daysOff;
  document.getElementById('prWins').textContent=data.wins;
  document.getElementById('prLosses').textContent=data.losses;
  document.getElementById('prTotalEntries').textContent=totalEntries;

  document.getElementById('prWeekPct').textContent=(weekPct>=0?'+':'')+weekPct.toFixed(2)+'% ('+(weekPct>=0?'Positivo':'Negativo')+')';
  document.getElementById('prMonthPct').textContent=(monthPct>=0?'+':'')+monthPct.toFixed(2)+'% ('+(monthPct>=0?'Positivo':'Negativo')+')';

  const gainsTable=document.getElementById('prGainsTable');
  gainsTable.innerHTML=gains.length
    ? gains.map(g=>`<tr><td>${g.date}</td><td class="pr-right pr-green">+${money(g.value)}</td></tr>`).join('')
    : '<tr class="pr-empty-row"><td colspan="2">Nenhum dia com meta de Stop Win batida.</td></tr>';

  const lossesTable=document.getElementById('prLossesTable');
  lossesTable.innerHTML=losses.length
    ? losses.map(l=>`<tr><td>${l.date}${l.label==='Sangria'?' (Sangria)':''}</td><td class="pr-right pr-red">-${money(l.value)}</td></tr>`).join('')
    : '<tr class="pr-empty-row"><td colspan="2">Nenhum dia de loss ou sangria registrado.</td></tr>';

  document.getElementById('prFinalGain').textContent='+'+money(totalGanho);
  document.getElementById('prFinalLoss').textContent='-'+money(totalPerda);
  document.getElementById('prFinalBank').textContent='-'+money(initial);
  document.getElementById('prBruto').innerHTML='<b>'+money(totalBruto)+'</b>';
  document.getElementById('prLiquido').innerHTML='<b>'+(totalLiquido>=0?'':'-')+money(Math.abs(totalLiquido))+'</b>';

  document.getElementById('prSangriaCount').textContent=totalSangrias;
  document.getElementById('prBreach').textContent=breachCount>0?('Sim ('+breachCount+' vez'+(breachCount>1?'es':'')+')'):'Não';
  document.getElementById('prBreachValue').textContent=breachCount>0?money(breachTotal):'—';

  closeReportModal();
  setTimeout(()=>window.print(),150);
}


/* ======================================================
   GRÁFICO DE EVOLUÇÃO DA BANCA
   SVG desenhado nativamente (sem biblioteca externa) +
   crosshair interativo (mouse/toque).
====================================================== */
function renderChart(){
  const wrap=document.getElementById('bankChartSvg');
  const empty=document.getElementById('bankChartEmpty');
  const legend=document.getElementById('bankChartLegend');
  if(!wrap||!empty||!legend)return;
  if(!data.started || !data.entries.length){
    wrap.classList.add('hidden');
    legend.classList.add('hidden');
    empty.classList.remove('hidden');
    wrap.innerHTML='';
    return;
  }
  const sorted=[...data.entries].sort((a,b)=>a.id-b.id);
  let running=data.initial;
  const values=[data.initial];
  sorted.forEach(e=>{
    running=e.type==='WIN'?running+Number(e.value||0):Math.max(0,running-Number(e.value||0));
    values.push(running);
  });

  wrap.classList.remove('hidden');
  legend.classList.remove('hidden');
  empty.classList.add('hidden');
  document.getElementById('chartStart').textContent=money(values[0]);
  document.getElementById('chartEnd').textContent=money(values[values.length-1]);

  const W=600,H=200,padL=8,padR=8,padT=14,padB=14;
  const min=Math.min(...values), max=Math.max(...values);
  const range=(max-min)||1;
  const stepX=values.length>1?(W-padL-padR)/(values.length-1):0;
  const xAt=i=>padL+stepX*i;
  const yAt=v=>padT+(H-padT-padB)*(1-((v-min)/range));

  let pathD='';
  let points=[];
  values.forEach((v,i)=>{
    const x=xAt(i), y=yAt(v);
    points.push([x,y]);
    pathD+=(i===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1)+' ';
  });
  const areaD=pathD+`L${xAt(values.length-1).toFixed(1)},${(H-padB).toFixed(1)} L${padL},${(H-padB).toFixed(1)} Z`;
  const dotsSvg=points.map(([x,y])=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#ffc01f"/>`).join('');
  const gridSvg=[0,.25,.5,.75,1].map(f=>{
    const y=(padT+(H-padT-padB)*f).toFixed(1);
    return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(255,255,255,.07)" stroke-width="1"/>`;
  }).join('');

  wrap.innerHTML=`<svg id="bankChartSvgEl" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width:100%;height:180px">
    <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffc01f" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#ffc01f" stop-opacity="0"/>
    </linearGradient></defs>
    ${gridSvg}
    <path d="${areaD}" fill="url(#chartFill)" stroke="none"/>
    <path d="${pathD}" fill="none" stroke="#ffc01f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dotsSvg}
    <line id="crossLine" x1="0" y1="${padT}" x2="0" y2="${H-padB}" stroke="#ffffff" stroke-width="1.4" stroke-dasharray="3,3" style="display:none"/>
    <circle id="crossDot" r="5.5" fill="#fff" stroke="#ffc01f" stroke-width="2.5" style="display:none"/>
  </svg>
  <div class="chart-tooltip" id="chartTooltip">
    <div class="tt-idx" id="ttIdx">—</div>
    <div class="tt-val" id="ttVal">R$ 0,00</div>
  </div>`;

  attachChartInteraction(wrap,points,values,W,H);
}

function attachChartInteraction(wrap,points,values,W,H){
  const svgEl=wrap.querySelector('#bankChartSvgEl');
  const crossLine=wrap.querySelector('#crossLine');
  const crossDot=wrap.querySelector('#crossDot');
  const tooltip=wrap.querySelector('#chartTooltip');
  const ttIdx=wrap.querySelector('#ttIdx');
  const ttVal=wrap.querySelector('#ttVal');
  if(!svgEl||points.length===0)return;

  function showAt(clientX){
    const rect=svgEl.getBoundingClientRect();
    let fraction=(clientX-rect.left)/rect.width;
    fraction=Math.min(1,Math.max(0,fraction));
    const vbX=fraction*W;
    let idx=0,best=Infinity;
    points.forEach(([x],i)=>{const d=Math.abs(x-vbX);if(d<best){best=d;idx=i}});
    const [px,py]=points[idx];
    crossLine.setAttribute('x1',px);crossLine.setAttribute('x2',px);
    crossLine.style.display='block';
    crossDot.setAttribute('cx',px);crossDot.setAttribute('cy',py);
    crossDot.style.display='block';
    ttIdx.textContent=idx===0?'Início':('Rodada #'+idx);
    ttVal.textContent='v: '+money(values[idx]);
    let leftPct=(px/W)*100;
    tooltip.style.display='block';
    tooltip.style.left=leftPct+'%';
    if(leftPct<22) tooltip.style.transform='translate(0,-50%)';
    else if(leftPct>78) tooltip.style.transform='translate(-100%,-50%)';
    else tooltip.style.transform='translate(-50%,-50%)';
    let topPct=Math.min(72,Math.max(8,(py/H)*100+14));
    tooltip.style.top=topPct+'%';
  }
  function hide(){
    crossLine.style.display='none';
    crossDot.style.display='none';
    tooltip.style.display='none';
  }
  svgEl.addEventListener('mousemove',e=>showAt(e.clientX));
  svgEl.addEventListener('mouseleave',hide);
  svgEl.addEventListener('pointerdown',e=>{showAt(e.clientX);e.preventDefault()});
  svgEl.addEventListener('pointermove',e=>{if(e.pointerType==='touch')showAt(e.clientX)});
  svgEl.addEventListener('touchstart',e=>{if(e.touches[0])showAt(e.touches[0].clientX)},{passive:true});
  svgEl.addEventListener('touchmove',e=>{if(e.touches[0])showAt(e.touches[0].clientX)},{passive:true});
}


/* ======================================================
   VISÃO GERAL
   Resumo semanal/mensal, atualização geral da tela e
   reinício de mês.
====================================================== */
function startOfWeek(d){const x=new Date(d);const day=x.getDay();const diff=(day===0?-6:1-day);x.setDate(x.getDate()+diff);x.setHours(0,0,0,0);return x}
function parseBRDate(s){const[dd,mm,yy]=s.split('/');return new Date(+yy,+mm-1,+dd)}
function renderPeriodSummary(){
  const weekEl=document.getElementById('weekResult');
  const monthEl=document.getElementById('monthResult');
  if(!weekEl||!monthEl)return;
  const now=new Date();
  const wStart=startOfWeek(now);
  const mStart=new Date(now.getFullYear(),now.getMonth(),1);
  let weekTotal=0,monthTotal=0;
  data.entries.forEach(e=>{
    const d=parseBRDate(e.date);
    const signed=(e.type==='WIN'?1:-1)*Number(e.value||0);
    if(d>=mStart) monthTotal+=signed;
    if(d>=wStart) weekTotal+=signed;
  });
  weekEl.textContent=(weekTotal>=0?'+':'')+money(weekTotal);
  weekEl.className='value '+(weekTotal>=0?'green':'red');
  monthEl.textContent=(monthTotal>=0?'+':'')+money(monthTotal);
  monthEl.className='value '+(monthTotal>=0?'green':'red');
}

function updateOverview(){
  if(!data.started){
    ['ovInitial','ovCurrent'].forEach(id=>document.getElementById(id).textContent='R$ 0,00');
    document.getElementById('ovResult').textContent='R$ 0,00';
    document.getElementById('ovVariation').textContent='0,00%';
    document.getElementById('ovMessage').textContent='🔒 Nenhuma gestão iniciada. Preencha a banca na Calculadora e confirme para começar.';
    ['days','entries','wins','losses'].forEach(id=>document.getElementById(id).textContent='0');
    document.getElementById('totalWin').textContent='+R$ 0,00';
    document.getElementById('totalLoss').textContent='-R$ 0,00';
    document.getElementById('winPct').textContent='0,00%';
    document.getElementById('lossPct').textContent='0,00%';
    renderEntryReport();
    renderWithdrawalReport();
    renderChart();
    renderPeriodSummary();
    renderWithdrawalBalances();
    return;
  }
  const result=data.current-data.initial;
  const variation=data.initial?result/data.initial*100:0;
  const total=data.wins+data.losses;
  document.getElementById('ovInitial').textContent=money(data.initial);
  document.getElementById('ovCurrent').textContent=money(data.current);
  document.getElementById('ovResult').textContent=(result>=0?'+':'')+money(result);
  document.getElementById('ovVariation').textContent=(variation>=0?'+':'')+pct(variation);
  document.getElementById('ovMessage').textContent='✅ Gestão ativa. Acompanhe sua banca e registre cada entrada.';
  document.getElementById('days').textContent=data.days;
  document.getElementById('entries').textContent=total;
  document.getElementById('wins').textContent=data.wins;
  document.getElementById('losses').textContent=data.losses;
  document.getElementById('totalWin').textContent='+'+money(data.totalWin);
  document.getElementById('totalLoss').textContent='-'+money(data.totalLoss);
  document.getElementById('winPct').textContent=pct(total?data.wins/total*100:0);
  document.getElementById('lossPct').textContent=pct(total?data.losses/total*100:0);
  renderEntryReport();
  renderWithdrawalReport();
  renderChart();
  renderPeriodSummary();
  renderWithdrawalBalances();
}
function newMonth(){
  if(!confirm('Deseja limpar o histórico deste mês e começar uma nova gestão?')) return;
  const keepRounds=data.roundsByGame;
  const keepGame=data.activeGame;
  data={started:false,initial:0,current:0,wins:0,losses:0,totalWin:0,totalLoss:0,days:0,entries:[],withdrawals:[],alerts:{win:false,loss:false,date:''},scenario:null,managementDays:null,freeManagement:false,roundsByGame:keepRounds,activeGame:keepGame};
  save();
  const bank=document.getElementById('bank');
  bank.value='';
  bank.classList.remove('example');
  document.getElementById('resultValue').value=0;
  freeManagementChecked=false;
  const free30Check=document.getElementById('free30Check');
  if(free30Check) free30Check.checked=false;
  calc();updateOverview();renderEntryReport();renderWithdrawalReport();applyScenarioLock();
  alert('Novo mês iniciado. Todos os valores foram zerados. Você já pode escolher um novo cenário e tempo de gestão, e digitar sua nova banca para começar.');
}


/* ======================================================
   MONITOR DE VELAS (Aviator / Aviator 2)
   Registro manual de rodadas, distribuição por cor e
   estatísticas de histórico.
====================================================== */
function classifyRound(v){
  if(v>=100) return {cls:'hot',color:'#ff1e43',key:'hot'};
  if(v>=10) return {cls:'pink',color:'#ff2f87',key:'pink'};
  if(v>=2) return {cls:'purple',color:'#8b5cf6',key:'purple'};
  return {cls:'blue',color:'#5aa7ff',key:'blue'};
}
const colorMeta={
  blue:{cls:'blue',label:'Azul'},
  purple:{cls:'purple',label:'Roxo'},
  pink:{cls:'pink',label:'Rosa'},
  hot:{cls:'hot',label:'Vermelha'}
};
function nowTimeStr(d){d=d||new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0')}
function currentRounds(){return data.roundsByGame[data.activeGame]}
function setActiveGame(game){
  data.activeGame=game;
  document.getElementById('gameBtnAviator').classList.toggle('active',game==='aviator');
  document.getElementById('gameBtnAviator2').classList.toggle('active',game==='aviator2');
  save();
  renderMonitor();
}
function pushRound(entry){
  const list=currentRounds();
  list.push(entry);
  if(list.length>300) data.roundsByGame[data.activeGame]=list.slice(-300);
  save();
  renderMonitor();
}
function registerRound(){
  const input=document.getElementById('roundValue');
  const v=parseFloat((input.value||'').replace(',','.'));
  if(!v || v<=0){alert('Informe um multiplicador válido, ex: 2.35');return}
  pushRound({id:Date.now(),value:v,color:classifyRound(v).key,ts:Date.now()});
  input.value='';
}
function clearRounds(){
  if(!currentRounds().length){alert('Não há rodadas registradas.');return}
  if(!confirm('Limpar todo o histórico de rodadas deste jogo?'))return;
  data.roundsByGame[data.activeGame]=[];
  save();
  renderMonitor();
}
function timeAgo(ts){
  const diff=Math.max(0,Date.now()-ts);
  const min=Math.floor(diff/60000);
  if(min<1)return 'agora mesmo';
  if(min<60)return min+' minuto'+(min>1?'s':'')+' atrás';
  const h=Math.floor(min/60);
  if(h<24)return h+'h '+(min%60)+'min atrás';
  const d=Math.floor(h/24);
  return d+' dia'+(d>1?'s':'')+' atrás';
}
let contagemCasasEnabled=(data.contagemAtivada!==undefined)?data.contagemAtivada:true;
function toggleContagemCasas(){
  contagemCasasEnabled=!contagemCasasEnabled;
  data.contagemAtivada=contagemCasasEnabled;
  save();
  renderMonitor();
}
function computeStreakLabels(roundsDesc){
  const chronological=[...roundsDesc].reverse();
  let counter=0;
  const labelById={},streakEndById={};
  chronological.forEach(r=>{
    counter++;
    const cls=r.color||classifyRound(r.value).key;
    const isHigh=cls==='pink'||cls==='hot';
    labelById[r.id]=counter;
    streakEndById[r.id]=isHigh;
    if(isHigh) counter=0;
  });
  return {labelById,streakEndById};
}
function renderMonitor(){
  const clockEl=document.getElementById('monitorClock');
  if(clockEl) clockEl.textContent=nowTimeStr();
  const rounds=[...currentRounds()].sort((a,b)=>b.ts-a.ts);
  const grid=document.getElementById('roundGrid');
  if(!grid)return;

  const toggleBtn=document.getElementById('contagemToggle');
  if(toggleBtn){
    toggleBtn.textContent=contagemCasasEnabled?'● Ativada':'● Desativada';
    toggleBtn.classList.toggle('off',!contagemCasasEnabled);
  }

  if(!rounds.length){
    grid.innerHTML='<div class="round-empty">Nenhuma rodada registrada ainda. Use o campo acima para adicionar.</div>';
  }else{
    const {labelById,streakEndById}=computeStreakLabels(rounds);
    grid.innerHTML=rounds.slice(0,60).map((r)=>{
      const cls=r.color||classifyRound(r.value).key;
      const valLabel=(r.value!==null && r.value!==undefined)?r.value.toFixed(2)+'x':colorMeta[cls].label;
      const isStreakEnd=streakEndById[r.id];
      const showBadge=contagemCasasEnabled;
      const streakClass=(showBadge && isStreakEnd)?' streak-end':'';
      const idxHtml=showBadge?`<span class="round-chip-idx">${labelById[r.id]}</span>`:'';
      const fireHtml=(showBadge && isStreakEnd)?`<span class="round-chip-fire">🔥</span>`:'';
      return `<div class="round-chip chip-${cls}${streakClass}">${idxHtml}${fireHtml}<div class="round-chip-val">${valLabel}</div><div class="round-chip-time">${nowTimeStr(new Date(r.ts))}</div></div>`;
    }).join('');
  }

  const withValue=rounds.filter(r=>r.value!==null && r.value!==undefined);

  const salaTitleEl=document.getElementById('salaTitle');
  if(salaTitleEl) salaTitleEl.textContent=data.activeGame==='aviator2'?'✈ Aviator 2':'✈ Aviator';

  const totalRounds=withValue.length;
  const sumValues=withValue.reduce((a,r)=>a+r.value,0);
  const avg=totalRounds?sumValues/totalRounds:0;
  const above2=totalRounds?Math.round(withValue.filter(r=>r.value>=2).length/totalRounds*100):0;
  const above10=totalRounds?Math.round(withValue.filter(r=>r.value>=10).length/totalRounds*100):0;
  const above100Count=withValue.filter(r=>r.value>=100).length;
  const maxValue=totalRounds?Math.max(...withValue.map(r=>r.value)):0;

  const setText=(id,txt)=>{const el=document.getElementById(id);if(el)el.textContent=txt};
  setText('statRounds',totalRounds);
  setText('statAvg',avg.toFixed(2)+'x');
  setText('statAbove2',above2+'%');
  setText('statAbove10',above10+'%');
  setText('statAbove100',above100Count);
  setText('statMax',maxValue.toFixed(2)+'x');

  const counts={blue:0,purple:0,pink:0,hot:0};
  rounds.forEach(r=>counts[r.color||classifyRound(r.value).key]++);
  const total=rounds.length;
  const colors={blue:'#5aa7ff',purple:'#8b5cf6',pink:'#ff2f87',hot:'#ff1e43'};
  document.getElementById('donutCenter').textContent=total;
  let acc=0;
  const stops=[];
  ['blue','purple','pink','hot'].forEach(k=>{
    const p=total?(counts[k]/total*360):0;
    if(p>0){stops.push(`${colors[k]} ${acc.toFixed(2)}deg ${(acc+p).toFixed(2)}deg`);acc+=p}
  });
  document.getElementById('donutRing').style.background=stops.length?`conic-gradient(${stops.join(',')})`:'conic-gradient(rgba(255,255,255,.08) 0 360deg)';
  ['Blue','Purple','Pink','Hot'].forEach(label=>{
    const k=label.toLowerCase();
    const p=total?Math.round(counts[k]/total*100):0;
    document.getElementById('pct'+label).textContent=p+'%';
    document.getElementById('cnt'+label).textContent=counts[k];
  });
}
function toggleDistribution(){
  const panel=document.getElementById('distributionPanel');
  const btn=document.getElementById('distToggleBtn');
  if(!panel)return;
  const willShow=panel.classList.contains('hidden');
  panel.classList.toggle('hidden',!willShow);
  if(btn) btn.textContent=willShow?'🧭 Distribuição ▴':'🧭 Distribuição ▾';
}
setInterval(()=>{const el=document.getElementById('monitorClock');if(el)el.textContent=nowTimeStr();},1000);


/* ======================================================
   NAVEGAÇÃO ENTRE ABAS
====================================================== */
function showPage(id,btn){
  ['overview','calculator','monitor','timing'].forEach(x=>document.getElementById(x).classList.toggle('hidden',x!==id));
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  if(id==='calculator')calc();
  if(id==='monitor'){
    document.getElementById('gameBtnAviator').classList.toggle('active',data.activeGame==='aviator');
    document.getElementById('gameBtnAviator2').classList.toggle('active',data.activeGame==='aviator2');
    renderMonitor();
  }
}

/* ======================================================
   INICIALIZAÇÃO
====================================================== */
document.getElementById('bank').addEventListener('input',calc);
if(data.started){
  document.getElementById('bank').value=data.initial;
  document.getElementById('bank').classList.remove('example');
}else{
  document.getElementById('bank').value='';
  document.getElementById('bank').classList.remove('example');
  document.getElementById('resultValue').value=0;
}
calc();updateOverview();renderWithdrawalReport();
if(!storageIsLocal){
  const bar=document.createElement('div');
  bar.className='notice';
  bar.style.cssText='position:fixed;left:50%;top:8px;transform:translateX(-50%);width:min(520px,calc(100% - 24px));z-index:30;text-align:center;background:rgba(255,30,67,.92);border:1px solid rgba(255,30,67,.6);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.5)';
  bar.textContent='⚠️ Armazenamento local bloqueado neste preview — os dados não serão salvos ao recarregar. Baixe e abra o arquivo no navegador para salvar sua gestão normalmente.';
  document.body.appendChild(bar);
}
