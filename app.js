let roundsVisible=100;
/* ======================================================
   STORAGE & MODELO DE DADOS
   Leitura/escrita segura (com fallback em memória caso
   localStorage esteja bloqueado) + estrutura de dados.
====================================================== */
const STORAGE_KEY='lord_demo_data_oficial_zerada_v1';
const LOCAL_OWNER_KEY=STORAGE_KEY+'_owner';
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

function save(){
  storageSet(STORAGE_KEY,JSON.stringify(data));
  if(currentUser){
    storageSet(LOCAL_OWNER_KEY,currentUser.id);
    void pushToCloud();
  }
}

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
/* ======================================================
   AVISOS E CONFIRMAÇÕES PERSONALIZADOS
   Mantém todos os alertas/confirmas no mesmo padrão visual
   da confirmação de sangria.
====================================================== */
let appDialogAction=null;

function closeAppDialog(){
  const overlay=document.getElementById('appDialogOverlay');
  if(overlay) overlay.classList.add('hidden');
  appDialogAction=null;
}

function showAppDialog({title='Aviso',message='',confirmText='OK',cancelText='',onConfirm=null,kind='info'}){
  const overlay=document.getElementById('appDialogOverlay');
  if(!overlay)return;
  const titleEl=document.getElementById('appDialogTitle');
  const messageEl=document.getElementById('appDialogMessage');
  const confirmBtn=document.getElementById('appDialogConfirm');
  const cancelBtn=document.getElementById('appDialogCancel');
  const iconEl=document.getElementById('appDialogIcon');
  titleEl.textContent=title;
  messageEl.textContent=message;
  iconEl.textContent=kind==='success'?'✓':(kind==='error'?'!':(kind==='warning'?'⚠':'ℹ'));
  overlay.classList.remove('dialog-success','dialog-error','dialog-warning');
  if(kind!=='info') overlay.classList.add('dialog-'+kind);
  confirmBtn.textContent=confirmText;
  cancelBtn.textContent=cancelText||'Cancelar';
  cancelBtn.classList.toggle('hidden',!cancelText);
  const actionsEl=document.querySelector('.app-dialog-actions');
  if(actionsEl) actionsEl.classList.toggle('single-action',!cancelText);
  appDialogAction=onConfirm;
  overlay.classList.remove('hidden');
}

function showAppNotice(message,title='Aviso',kind='info'){
  showAppDialog({title,message,confirmText:'OK',cancelText:'',kind});
}

function showAppConfirm(message,onConfirm,title='Confirmar ação',confirmText='OK'){
  showAppDialog({title,message,confirmText,cancelText:'Cancelar',onConfirm,kind:'warning'});
}

function handleAppDialogConfirm(){
  const action=appDialogAction;
  closeAppDialog();
  if(typeof action==='function') action();
}

function startManagement(){
  const b=parseFloat(document.getElementById('bank').value)||0;
  if(b<=0){showAppNotice('Digite um valor de banca válido.','Banca inválida','error');return}
  const scenarioNames={0.1:'Conservador ✅',0.2:'Moderado 📊',0.3:'Agressivo 🔥'};
  const chosenLabel=scenarioNames[projectionRate]||'Moderado 📊';
  const chosenDays=freeManagementChecked?30:projectionDays;
  const daysMsg=freeManagementChecked?(chosenDays+' dias (Gestão livre)'):(chosenDays+' dias');
  const confirmMsg='Cenário: '+chosenLabel+' ('+(projectionRate*100).toFixed(0)+'%/dia)\nTempo de Gestão: '+daysMsg+'\n\nEssas escolhas ficarão FIXAS durante toda a gestão atual — só é possível trocar finalizando esta gestão e iniciando um novo mês.\n\nDeseja confirmar e iniciar a gestão?';
  showAppConfirm(confirmMsg,()=>{
    const keepRounds=data.roundsByGame;
    const keepGame=data.activeGame;
    data={started:true,initial:b,current:b,wins:0,losses:0,totalWin:0,totalLoss:0,days:0,entries:[],withdrawals:[],alerts:{win:false,loss:false,gordura:0,date:new Date().toLocaleDateString('pt-BR')},scenario:projectionRate,managementDays:chosenDays,freeManagement:freeManagementChecked,roundsByGame:keepRounds,activeGame:keepGame};
    document.getElementById('bank').classList.remove('example');
    save(); updateOverview(); applyScenarioLock();
    showAppNotice('Gestão iniciada com '+money(b)+' — Cenário '+chosenLabel+' ('+(projectionRate*100).toFixed(0)+'%/dia) — '+daysMsg+'.','Gestão iniciada','success');
  },'Confirmar gestão','Iniciar gestão');
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
function computeHandResult(n){
  const val=parseFloat(document.getElementById('hand'+n+'Value').value)||0;
  const mult=parseFloat(document.getElementById('hand'+n+'Mult').value)||0;
  const winChecked=document.getElementById('hand'+n+'Win').checked;
  const lossChecked=document.getElementById('hand'+n+'Loss').checked;
  let result=0;
  if(winChecked) result=val*mult;
  else if(lossChecked) result=-val;
  const resEl=document.getElementById('hand'+n+'Result');
  resEl.textContent=(result<0?'-':'')+money(Math.abs(result));
  resEl.className=result>0?'green':(result<0?'red':'');
}
function handStatusChange(n,which){
  const win=document.getElementById('hand'+n+'Win');
  const loss=document.getElementById('hand'+n+'Loss');
  if(which==='win' && win.checked) loss.checked=false;
  if(which==='loss' && loss.checked) win.checked=false;
  document.getElementById('hand'+n+'WinLabel').classList.toggle('win-active',win.checked);
  document.getElementById('hand'+n+'LossLabel').classList.toggle('loss-active',loss.checked);
  computeHandResult(n);
}
function registerEntry(){
  if(!data.started){showAppNotice('Primeiro confirme sua banca na Calculadora para iniciar a gestão.','Atenção','warning');return}
  const now=new Date();
  const today=now.toLocaleDateString('pt-BR');
  const time=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const period=getPeriod(now.getHours());
  if(data.alerts.date!==today){data.alerts={win:false,loss:false,gordura:0,date:today}}

  const toRegister=[];
  [1,2].forEach(n=>{
    const entradaVal=parseFloat(document.getElementById('hand'+n+'Value').value)||0;
    const mult=parseFloat(document.getElementById('hand'+n+'Mult').value)||0;
    const isWin=document.getElementById('hand'+n+'Win').checked;
    const isLoss=document.getElementById('hand'+n+'Loss').checked;
    if(entradaVal>0 && isWin){
      const liquido=Math.max(0,(entradaVal*mult)-entradaVal);
      toRegister.push({hand:n,type:'WIN',value:liquido,entradaValue:entradaVal,multiplier:mult});
    } else if(entradaVal>0 && isLoss){
      toRegister.push({hand:n,type:'LOSS',value:entradaVal,entradaValue:entradaVal,multiplier:mult});
    }
  });

  if(!toRegister.length){
    showAppNotice('Preencha a Entrada (R$) e marque Win ou Loss em pelo menos uma das mãos antes de registrar.','Entrada incompleta','warning');
    return;
  }

  const batchId=Date.now();
  toRegister.forEach(r=>{
    const entry={id:Date.now()+r.hand,batchId:batchId,type:r.type,value:r.value,hand:r.hand,entradaValue:r.entradaValue,multiplier:r.multiplier,date:today,time,period};
    data.entries.push(entry);
    if(r.type==='WIN'){data.wins++;data.totalWin+=r.value;data.current+=r.value}
    else{data.losses++;data.totalLoss+=r.value;data.current=Math.max(0,data.current-r.value)}
  });
  data.days=new Set(data.entries.map(e=>e.date)).size;
  save();updateOverview();renderEntryReport();calc();

  [1,2].forEach(n=>{
    document.getElementById('hand'+n+'Value').value='';
    document.getElementById('hand'+n+'Mult').value='';
    document.getElementById('hand'+n+'Win').checked=false;
    document.getElementById('hand'+n+'Loss').checked=false;
    document.getElementById('hand'+n+'WinLabel').classList.remove('win-active');
    document.getElementById('hand'+n+'LossLabel').classList.remove('loss-active');
    computeHandResult(n);
  });

  const todayWin=data.entries.filter(e=>e.type==='WIN' && e.date===today).reduce((a,e)=>a+Number(e.value||0),0);
  const todayLoss=data.entries.filter(e=>e.type==='LOSS' && e.date===today).reduce((a,e)=>a+Number(e.value||0),0);
  const stopTarget=data.initial*.20;
  const gordura=Math.max(0,todayWin-stopTarget);
  if(todayWin>=stopTarget && !data.alerts.win){
    data.alerts.win=true;
    data.alerts.gordura=gordura;
    save();
    showAppNotice('Resultado positivo do dia: '+money(todayWin)+'\nMeta mínima de Stop Win: '+money(stopTarget)+'\n💰 Gordura acima da meta: '+money(gordura)+'\n\nGestão diária concluída.','STOP WIN ALCANÇADO','success');
  } else if(todayWin>stopTarget && data.alerts.win && gordura>(Number(data.alerts.gordura)||0)){
    data.alerts.gordura=gordura;
    save();
    showAppNotice('Meta de Stop Win: '+money(stopTarget)+'\nResultado do dia: '+money(todayWin)+'\n💰 Gordura acumulada acima da meta: '+money(gordura)+'\n\nEsse valor está acima da meta diária.','GORDURA DA META','success');
  } else if(todayLoss>=stopTarget && !data.alerts.loss){
    data.alerts.loss=true;save();
    showAppNotice('Perda do dia: '+money(todayLoss)+'\nLimite de Stop Loss: '+money(stopTarget)+'\n\nEncerre a gestão do dia para respeitar o limite.','STOP LOSS ALCANÇADO','error');
  } else {
    showAppNotice('Entrada(s) registrada(s) com sucesso.','Entrada registrada','success');
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

function getTodayWinTotal(){
  const today=new Date().toLocaleDateString('pt-BR');
  return data.entries.filter(e=>e.type==='WIN' && e.date===today).reduce((sum,e)=>sum+Number(e.value||0),0);
}

function getGorduraDisponivel(){
  if(!data.started || !data.initial)return 0;
  const stopTarget=data.initial*0.20;
  return Math.max(0,getTodayWinTotal()-stopTarget);
}

function getSaldoDisponivelSangria(){
  if(!data.started)return 0;
  return Math.max(0,data.current-data.initial);
}

function makeWithdrawal(){
  if(!data.started){showAppNotice('Primeiro confirme sua banca na Calculadora para iniciar a gestão.','Atenção','warning');return}
  const val=parseFloat(document.getElementById('withdrawalValue').value)||0;
  if(val<=0){showAppNotice('Informe um valor de sangria válido.','Sangria inválida','error');return}
  if(val>data.current){showAppNotice('O valor da sangria não pode ser maior que a Banca Atual de '+money(data.current)+'.','Sangria inválida','error');return}

  const available=getSaldoDisponivelSangria();
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
  pendingWithdrawal=val;
  const confirmValue=document.getElementById('withdrawalConfirmValue');
  const confirmBalance=document.getElementById('withdrawalConfirmBalance');
  if(confirmValue) confirmValue.textContent=money(val);
  if(confirmBalance) confirmBalance.textContent=money(data.current-val);
  document.getElementById('withdrawalConfirmModalOverlay').classList.remove('hidden');
}

function cancelWithdrawalConfirm(){
  document.getElementById('withdrawalConfirmModalOverlay').classList.add('hidden');
  pendingWithdrawal=null;
}

function confirmWithdrawal(){
  const val=pendingWithdrawal;
  if(!val){cancelWithdrawalConfirm();return}
  document.getElementById('withdrawalConfirmModalOverlay').classList.add('hidden');
  pendingWithdrawal=null;
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
    showAppNotice('Valor retirado: '+money(val)+'\nBanca atual: '+money(data.current),'Sangria realizada — quebra de gerenciamento','warning');
  } else {
    showAppNotice('Valor retirado: '+money(val)+'\nBanca atual: '+money(data.current),'Sangria realizada com sucesso','success');
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
    if(val){
      pendingWithdrawal=val;
      const confirmValue=document.getElementById('withdrawalConfirmValue');
      const confirmBalance=document.getElementById('withdrawalConfirmBalance');
      if(confirmValue) confirmValue.textContent=money(val);
      if(confirmBalance) confirmBalance.textContent=money(data.current-val);
      document.getElementById('withdrawalConfirmModalOverlay').classList.remove('hidden');
    }
  }
}

function renderWithdrawalBalances(){
  const wi=document.getElementById('wdInitial');
  const wc=document.getElementById('wdCurrent');
  const wa=document.getElementById('wdAvailable');
  if(!wi||!wc||!wa)return;
  wi.textContent=money(data.initial);
  wc.textContent=money(data.current);
  wa.textContent=money(getSaldoDisponivelSangria());
}

function renderWithdrawalReport(){
  const list=document.getElementById('withdrawalList');
  if(!list)return;
  if(!data.withdrawals.length){list.innerHTML='<div class="withdrawal-empty">Nenhuma retirada realizada ainda.</div>';return}
  list.innerHTML=[...data.withdrawals].reverse().map(w=>`<div class="withdrawal-item${w.breach?' breach':''}"><div class="withdrawal-top"><span class="withdrawal-label">${w.breach?'⚠️ SANGRIA (QUEBRA)':'💰 SANGRIA'}</span><span class="withdrawal-value">-${money(w.value)}</span><div class="item-actions"><button class="item-action-btn delete" onclick="deleteWithdrawal(${w.id})">✕</button></div></div><div class="withdrawal-meta"><span>📅 ${w.date}</span><span>🕐 ${w.period}</span><span>⏰ ${w.time}</span></div></div>`).join('');
}

function deleteWithdrawal(id){
  showAppConfirm('Excluir esta retirada? A banca atual será ajustada de volta.',()=>{
    const w=data.withdrawals.find(x=>x.id===id);
    if(!w)return;
    data.current+=Number(w.value||0);
    data.withdrawals=data.withdrawals.filter(x=>x.id!==id);
    save();
    updateOverview();
    renderWithdrawalReport();
  },'Excluir retirada','Excluir');
}

function renderEntryReport(){
  const list=document.getElementById('entryList');
  if(!list)return;
  if(!data.entries.length){list.innerHTML='<div class="entry-empty">Nenhuma entrada registrada ainda.</div>';return}

  const groups=new Map();
  data.entries.forEach(e=>{
    const key=e.batchId||e.id;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(e);
  });

  list.innerHTML=[...groups.values()].reverse().map(entries=>{
    const first=entries[0];
    const period=first.period||getPeriod(Number((first.time||'00:00').split(':')[0]));
    const lines=entries.map(e=>{
      const win=e.type==='WIN';
      const cls=win?'win':'loss';
      const sign=win?'+':'-';
      let label,inner;
      if(e.hand){
        label=(win?`Mão ${e.hand}° Ganho líquido`:`Mão ${e.hand}° Valor de Perda`);
        const tag=win?'[Win ✅]':'[Loss ❌]';
        inner=`<div class="entry-left"><span class="entry-result ${cls}">${label} = ${sign}${money(e.value)}</span><span class="entry-hand-tag ${cls}">${tag}</span></div>`;
      } else {
        label=win?'🟢 STOP WIN':'🔴 STOP LOSS';
        inner=`<div class="entry-left"><span class="entry-result ${cls}">${label}</span><span class="entry-value ${cls}">${sign}${money(e.value)}</span></div>`;
      }
      const netNote=(e.hand && win)?`<div class="entry-net-note">💡 Resultado líquido — o valor da entrada não conta como ganho.</div>`:'';
      return `<div class="entry-line">${inner}<div class="item-actions"><button class="item-action-btn delete" onclick="deleteEntry(${e.id})">✕</button></div></div>${netNote}`;
    }).join('<div class="entry-divider"></div>');
    return `<div class="entry-item">${lines}<div class="entry-meta"><span>📅 ${first.date}</span><span>🕐 ${period}</span><span>⏰ ${first.time}</span></div></div>`;
  }).join('');
}

function deleteEntry(id){
  showAppConfirm('Excluir esta entrada? Os totais serão recalculados.',()=>{
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
  },'Excluir entrada','Excluir');
}



/* ======================================================
   RELATÓRIO DE GERENCIAMENTO (PDF)
   Geração do relatório via impressão do navegador.
====================================================== */
function openReportModal(){
  if(!data.entries.length){showAppNotice('Ainda não há entradas registradas nesta gestão para gerar um relatório.','Relatório','warning');return}
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
    document.getElementById('ovGordura').textContent='R$ 0,00';
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
  const gordura=getGorduraDisponivel();
  const total=data.wins+data.losses;
  document.getElementById('ovInitial').textContent=money(data.initial);
  document.getElementById('ovCurrent').textContent=money(data.current);
  document.getElementById('ovResult').textContent=(result>=0?'+':'')+money(result);
  document.getElementById('ovGordura').textContent=money(gordura);
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
  showAppConfirm('Deseja limpar o histórico deste mês e começar uma nova gestão?',()=>{
  const keepRounds=data.roundsByGame;
  const keepGame=data.activeGame;
  data={started:false,initial:0,current:0,wins:0,losses:0,totalWin:0,totalLoss:0,days:0,entries:[],withdrawals:[],alerts:{win:false,loss:false,date:''},scenario:null,managementDays:null,freeManagement:false,roundsByGame:keepRounds,activeGame:keepGame};
  save();
  const bank=document.getElementById('bank');
  bank.value='';
  bank.classList.remove('example');
  freeManagementChecked=false;
  const free30Check=document.getElementById('free30Check');
  if(free30Check) free30Check.checked=false;
  calc();updateOverview();renderEntryReport();renderWithdrawalReport();applyScenarioLock();
  showAppNotice('Todos os valores foram zerados. Você já pode escolher um novo cenário e tempo de gestão, e digitar sua nova banca para começar.','Novo mês iniciado','success');
  },'Novo mês','Iniciar novo mês');
}


/* ======================================================
   MONITOR DE VELAS (Aviator / Aviator 2)
   Registro manual de rodadas, distribuição por cor e
   estatísticas de histórico.
====================================================== */
function classifyRound(v){
  if(v>=1000) return {cls:'fire',color:'#ff5a1a',key:'fire'};
  if(v>=500) return {cls:'hot',color:'#ff1e43',key:'hot'};
  if(v>=100) return {cls:'yellow',color:'#ffc01f',key:'yellow'};
  if(v>=10) return {cls:'pink',color:'#ff2f87',key:'pink'};
  if(v>=2) return {cls:'purple',color:'#8b5cf6',key:'purple'};
  return {cls:'blue',color:'#5aa7ff',key:'blue'};
}
const colorMeta={
  blue:{cls:'blue',label:'Azul'},
  purple:{cls:'purple',label:'Roxo'},
  pink:{cls:'pink',label:'Rosa'},
  yellow:{cls:'yellow',label:'Amarela'},
  hot:{cls:'hot',label:'Vermelha'},
  fire:{cls:'fire',label:'Fogo'}
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
const AVIATOR_GAME_URL='https://7a711.com/?pid=2619439266&fromPage=AGENCY_ONE';
function openAviatorGame(){
  try{window.open(AVIATOR_GAME_URL,'_blank','noopener,noreferrer');}
  catch(e){window.location.href=AVIATOR_GAME_URL;}
}
const ROUND_MAX_AGE_MS=24*60*60*1000;
function pruneOldRounds(){
  const cutoff=Date.now()-ROUND_MAX_AGE_MS;
  let changed=false;
  Object.keys(data.roundsByGame||{}).forEach(game=>{
    const list=data.roundsByGame[game]||[];
    const kept=list.filter(r=>r.ts>=cutoff);
    if(kept.length!==list.length){data.roundsByGame[game]=kept;changed=true;}
  });
  return changed;
}
const COLLECTOR_STALE_MS=120000;
let lastVelaTs=0,lastSyncOk=false;
function renderCollectorStatus(){
  const el=document.getElementById('collectorStatus'),lb=document.getElementById('collectorLabel');if(!el||!lb)return;
  const on=lastSyncOk&&lastVelaTs&&(Date.now()-lastVelaTs)<COLLECTOR_STALE_MS;
  el.classList.toggle('on',!!on);el.classList.toggle('off',!on);
  lb.textContent=on?'Coletando velas':'Off-Line';
}
const VELAS_PAGE_SIZE=1000;
let initialVelasLoaded=false;
let syncVelasRunning=false;
async function syncVelas(){
  if(syncVelasRunning)return;
  if(typeof supabaseClient==='undefined'||!supabaseClient){lastSyncOk=false;renderCollectorStatus();return;}
  syncVelasRunning=true;
  try{
    // A primeira carga busca as últimas 24h. Nas seguintes, reconsulta uma janela
    // recente sobreposta para também capturar registros inseridos com atraso ou IDs
    // que não sejam maiores que o último sincronizado.
    const since=new Date(Date.now()-(initialVelasLoaded?10*60*1000:ROUND_MAX_AGE_MS)).toISOString();
    let offset=0;
    let rows=[];
    let page=[];
    do{
      const query=supabaseClient.from('velas').select('id,game,value,created_at').gte('created_at',since).order('id',{ascending:true});
      const result=await query.range(offset,offset+VELAS_PAGE_SIZE-1);
      if(result.error||!result.data){lastSyncOk=false;renderCollectorStatus();return;}
      page=result.data;
      rows=rows.concat(page);
      offset+=page.length;
    }while(page.length===VELAS_PAGE_SIZE);
    lastSyncOk=true;
    let changed=false;
    rows.forEach(r=>{
      const game=String(r.game||'').toLowerCase();
      if(game!=='aviator'&&game!=='aviator2')return;
      const t=new Date(r.created_at).getTime();
      if(Number.isFinite(t)&&t>lastVelaTs)lastVelaTs=t;
      const list=data.roundsByGame[game];
      if(!list)return;
      const id='v'+r.id;
      if(list.some(x=>x.id===id))return;
      const v=Number(r.value);
      if(!Number.isFinite(v)||v<1||v>=1000000||!Number.isFinite(t))return;
      list.push({id,value:v,color:classifyRound(v).key,ts:t});
      changed=true;
    });
    initialVelasLoaded=true;
    renderCollectorStatus();
    if(changed){
      Object.keys(data.roundsByGame).forEach(g=>{
        data.roundsByGame[g].sort((a,b)=>a.ts-b.ts);
      });
      save();renderMonitor();
    }
  }catch(e){console.error('Erro ao sincronizar histórico de velas:',e);lastSyncOk=false;renderCollectorStatus();}
  finally{syncVelasRunning=false;}
}
setInterval(syncVelas,3000);
setInterval(renderCollectorStatus,3000);
setTimeout(syncVelas,1500);
function pushRound(entry){
   const list=currentRounds();
  list.push(entry);

  save();
  renderMonitor();
}
function registerRound(){
  const input=document.getElementById('roundValue');
  const v=parseFloat((input.value||'').replace(',','.'));
  if(!v || v<=0){showAppNotice('Informe um multiplicador válido, ex: 2.35','Multiplicador inválido','error');return}
  pushRound({id:Date.now(),value:v,color:classifyRound(v).key,ts:Date.now()});
  input.value='';
}
function clearRounds(){
  if(!currentRounds().length){showAppNotice('Não há rodadas registradas.','Histórico vazio','warning');return}
  showAppConfirm('Limpar todo o histórico de rodadas deste jogo?',()=>{
    data.roundsByGame[data.activeGame]=[];
    save();
    renderMonitor();
  },'Limpar histórico','Limpar');
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
let roundFilterMin=0;
function setRoundFilter(min){
  roundFilterMin=min;
  document.querySelectorAll('.filter-chip').forEach(b=>b.classList.toggle('active',Number(b.dataset.min)===min));
  renderMonitor();
}
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
    const cls=classifyRound(r.value).key;
    const isHigh=cls==='pink'||cls==='yellow'||cls==='hot'||cls==='fire';
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
  if(grid){

  const toggleBtn=document.getElementById('contagemToggle');
  if(toggleBtn){
    toggleBtn.textContent=contagemCasasEnabled?'● Ativada':'● Desativada';
    toggleBtn.classList.toggle('off',!contagemCasasEnabled);
  }

  const filterCountEl=document.getElementById('filterCount');
  const filtered=roundFilterMin>0?rounds.filter(r=>Number(r.value||0)>=roundFilterMin):rounds;
  if(filterCountEl){
    filterCountEl.textContent=roundFilterMin>0
      ? `${filtered.length} de ${rounds.length} rodadas (≥${roundFilterMin}x)`
      : `${rounds.length} rodadas`;
  }

  if(!rounds.length){
    grid.innerHTML='<div class="round-empty">'+(data.activeGame==='aviator2'?'Velas automáticas ainda não ativas para o Aviator 2.':'Nenhuma rodada registrada ainda.')+'</div>';
  }else if(!filtered.length){
    grid.innerHTML='<div class="round-empty">Nenhuma rodada encontrada com esse filtro.</div>';
  }else{
    const {labelById,streakEndById}=computeStreakLabels(rounds);
    const iconForTier={yellow:'🔥',hot:'💥',fire:'😮‍💨'};
    updateLoadMoreBtn(filtered.length);
    const visibleRounds=filtered.slice(0,roundsVisible);
    let previousDay=null;
    grid.innerHTML=visibleRounds.map((r)=>{
      const date=new Date(r.ts);
      const dayKey=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
      const dateMarker=previousDay!==null && dayKey!==previousDay
        ? `<div class="round-chip round-day-marker" aria-label="Início do dia ${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}"><div class="round-day-marker-label">INÍCIO</div><div class="round-day-marker-date">${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}</div></div>`
        : '';
      previousDay=dayKey;
      const cls=classifyRound(r.value).key;
      const valLabel=(r.value!==null && r.value!==undefined)?r.value.toFixed(2)+'x':colorMeta[cls].label;
      const isStreakEnd=streakEndById[r.id];
      const showBadge=contagemCasasEnabled;
      const streakClass=(showBadge && isStreakEnd)?' streak-end':'';
      const badgeClass=(showBadge && isStreakEnd)?' streak-badge':'';
      const idxHtml=showBadge?`<span class="round-chip-idx${badgeClass}">${labelById[r.id]}</span>`:'';
      const icon=iconForTier[cls]||'';
      const fireHtml=(showBadge && isStreakEnd && icon)?`<span class="round-chip-fire">${icon}</span>`:'';
      return dateMarker+`<div class="round-chip chip-${cls}${streakClass}">${idxHtml}${fireHtml}<div class="round-chip-val">${valLabel}</div><div class="round-chip-time">${nowTimeStr(date)}</div></div>`;
    }).join('');
  }
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

  const counts={blue:0,purple:0,pink:0,yellow:0,hot:0,fire:0};
  rounds.forEach(r=>counts[classifyRound(r.value).key]++);
  const total=rounds.length;
  const colors={blue:'#5aa7ff',purple:'#8b5cf6',pink:'#ff2f87',yellow:'#ffc01f',hot:'#ff0a2e',fire:'#ff5a1a'};
  document.getElementById('donutCenter').textContent=total;
  let acc=0;
  const stops=[];
  ['blue','purple','pink','yellow','hot','fire'].forEach(k=>{
    const p=total?(counts[k]/total*360):0;
    if(p>0){stops.push(`${colors[k]} ${acc.toFixed(2)}deg ${(acc+p).toFixed(2)}deg`);acc+=p}
  });
  document.getElementById('donutRing').style.background=stops.length?`conic-gradient(${stops.join(',')})`:'conic-gradient(rgba(255,255,255,.08) 0 360deg)';
  ['Blue','Purple','Pink','Yellow','Hot','Fire'].forEach(label=>{
    const k=label.toLowerCase();
    const p=total?Math.round(counts[k]/total*100):0;
    const pctEl=document.getElementById('pct'+label);
    const cntEl=document.getElementById('cnt'+label);
    if(pctEl) pctEl.textContent=p+'%';
    if(cntEl) cntEl.textContent=counts[k];
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
/* Não remover rodadas automaticamente: a contagem do monitor e a distribuição
   devem ser monotônicas durante a sessão. O usuário pode limpar manualmente. */


/* ======================================================
   NAVEGAÇÃO ENTRE ABAS
====================================================== */

/* ======================================================
   MINUTAGEM — análise estatística temporária no navegador
====================================================== */


function runTheLordAI(){
  const status=document.getElementById('timingAIStatus'),result=document.getElementById('timingAIResult');
  if(!status||!result)return;
  const gameEl=document.getElementById('timingGame'),windowEl=document.getElementById('timingWindow');
  const game=gameEl?gameEl.value:'active',windowValue=windowEl?windowEl.value:'all';
  const games=game==='both'?['aviator','aviator2']:[game==='active'?data.activeGame:game];
  let rounds=[];
  games.forEach(g=>(data.roundsByGame[g]||[]).forEach(r=>rounds.push({value:Number(r.value),ts:Number(r.ts),game:g})));
  rounds=rounds.filter(r=>Number.isFinite(r.value)&&r.value>0&&Number.isFinite(r.ts));
  if(windowValue!=='all')rounds=rounds.filter(r=>r.ts>=Date.now()-Number(windowValue)*60000);
  rounds.sort((a,b)=>a.ts-b.ts);
  const fmt=(n,d=2)=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(n,total)=>total?fmt(n/total*100)+'%':'—';
  const duration=ms=>{
    if(!Number.isFinite(ms)||ms<0)return '—';
    const mins=Math.round(ms/60000);
    if(mins<60)return mins+' min';
    if(mins<1440)return Math.floor(mins/60)+' h '+(mins%60)+' min';
    return Math.floor(mins/1440)+' d '+Math.floor((mins%1440)/60)+' h';
  };
  result.classList.remove('hidden');
  if(rounds.length<30){
    result.textContent='Amostra insuficiente: foram encontradas '+rounds.length+' rodadas válidas neste filtro. Aguarde pelo menos 30 rodadas para gerar o relatório local.';
    status.textContent='Análise gratuita executada no próprio navegador; nenhuma chamada externa foi feita.';
    return;
  }
  const values=rounds.map(r=>r.value),n=values.length,recent=values.slice(-100);
  const mean=values.reduce((a,b)=>a+b,0)/n;
  const sorted=[...values].sort((a,b)=>a-b);
  const median=n%2?sorted[Math.floor(n/2)]:(sorted[n/2-1]+sorted[n/2])/2;
  const thresholds=[10,50,100,500,1000].map(t=>{
    const count=values.filter(v=>v>=t).length;
    const rc=recent.filter(v=>v>=t).length;
    return {t,count,rc,all:count/n*100,last:rc/recent.length*100};
  });
  const interval=[];
  let lastPink=null;
  rounds.forEach((r,i)=>{
    if(r.value>=10){
      if(lastPink!==null)interval.push({rounds:i-lastPink,minutes:(r.ts-rounds[lastPink].ts)/60000});
      lastPink=i;
    }
  });
  const avgInterval=interval.length?interval.reduce((s,x)=>s+x.minutes,0)/interval.length:null;
  const minInterval=interval.length?Math.min(...interval.map(x=>x.minutes)):null;
  const maxInterval=interval.length?Math.max(...interval.map(x=>x.minutes)):null;
  const byHour=Array.from({length:24},(_,hour)=>({hour,count:0,hits:0}));
  rounds.forEach(r=>{const h=new Date(r.ts).getHours();byHour[h].count++;if(r.value>=10)byHour[h].hits++;});
  const hourRows=byHour.filter(x=>x.count>=10).map(x=>({...x,rate:x.hits/x.count*100})).sort((a,b)=>b.rate-a.rate);
  const latest=rounds[rounds.length-1];
  const max=Math.max(...values);
  const consecutive=[];
  let run=0,runStart=0;
  values.forEach((v,i)=>{
    if(v<2){if(!run)runStart=i;run++;}
    else if(run){consecutive.push({length:run,start:runStart,end:i-1});run=0;}
  });
  if(run)consecutive.push({length:run,start:runStart,end:n-1});
  consecutive.sort((a,b)=>b.length-a.length);
  const lowStreak=consecutive[0];
  const lines=[];
  lines.push('RELATÓRIO ESTATÍSTICO LOCAL — GRATUITO');
  lines.push('Jogo: '+games.join(' + ')+' | Período: '+(windowValue==='all'?'todo o histórico disponível':windowValue+' minutos'));
  lines.push('Amostra: '+n+' rodadas | Última rodada registrada: '+new Date(latest.ts).toLocaleString('pt-BR'));
  lines.push('');
  lines.push('1. VISÃO GERAL');
  lines.push('• Média: '+fmt(mean)+'x | Mediana: '+fmt(median)+'x | Maior resultado observado: '+fmt(max)+'x');
  lines.push('• Resultados abaixo de 2x: '+values.filter(v=>v<2).length+' ('+pct(values.filter(v=>v<2).length,n)+')');
  lines.push('• Resultados de 2x a 9,99x: '+values.filter(v=>v>=2&&v<10).length+' ('+pct(values.filter(v=>v>=2&&v<10).length,n)+')');
  lines.push('• Resultados de 10x a 99,99x: '+values.filter(v=>v>=10&&v<100).length+' ('+pct(values.filter(v=>v>=10&&v<100).length,n)+')');
  lines.push('');
  lines.push('2. FREQUÊNCIAS HISTÓRICAS');
  thresholds.forEach(t=>lines.push('• ≥ '+t.t+'x: '+t.count+'/'+n+' ('+fmt(t.all)+'%); últimas '+recent.length+': '+t.rc+'/'+recent.length+' ('+fmt(t.last)+'%).'));
  lines.push('');
  lines.push('3. INTERVALOS ENTRE RESULTADOS ≥ 10x');
  if(interval.length)lines.push('• Intervalos calculáveis: '+interval.length+' | média de tempo: '+duration(avgInterval*60000)+' | menor: '+duration(minInterval*60000)+' | maior: '+duration(maxInterval*60000)+'.');
  else lines.push('• Ainda não há dois resultados ≥ 10x para calcular intervalos.');
  lines.push('');
  lines.push('4. HORÁRIOS OBSERVADOS (hora local do dispositivo)');
  if(hourRows.length)lines.push(...hourRows.slice(0,3).map(x=>'• '+String(x.hour).padStart(2,'0')+'h: '+fmt(x.rate)+'% de resultados ≥ 10x ('+x.hits+'/'+x.count+' rodadas).'));
  else lines.push('• Não há amostras suficientes por hora (mínimo de 10 rodadas por faixa).');
  if(lowStreak&&lowStreak.length>=3){
    lines.push('');
    lines.push('5. SEQUÊNCIA OBSERVADA');
    lines.push('• Maior sequência consecutiva de resultados abaixo de 2x nesta amostra: '+lowStreak.length+'. É apenas um registro histórico, não um sinal de que o próximo resultado será alto ou baixo.');
  }
  lines.push('');
  lines.push('LIMITAÇÕES IMPORTANTES');
  lines.push('Este relatório é calculado por regras estatísticas no seu navegador; não é uma IA generativa nem prevê a próxima rodada. Frequências e intervalos passados não garantem repetição futura, e diferenças por horário podem refletir acaso ou tamanhos de amostra. Use os números como descrição do histórico, não como promessa de lucro.');
  result.textContent=lines.join('\n');
  status.textContent='Relatório concluído no dispositivo. 100% gratuito: sem API, sem cobrança e sem envio de dados para análise externa.';
}
function timingWilson(success,total){
  if(!total)return {low:0,high:0};
  const z=1.96,p=success/total,den=1+z*z/total;
  const center=(p+z*z/(2*total))/den;
  const margin=z*Math.sqrt((p*(1-p)+z*z/(4*total))/total)/den;
  return {low:Math.max(0,center-margin)*100,high:Math.min(1,center+margin)*100};
}
function renderTimingRadar(rounds){
  const root=document.getElementById('timingRadar'),signal=document.getElementById('timingSignal');
  if(!root||!signal)return;
  const values=rounds.map(r=>Number(r.value)).filter(Number.isFinite);
  const recent=values.slice(-100);
  const thresholds=[{v:10,label:'≥ 10x'},{v:50,label:'≥ 50x'},{v:100,label:'≥ 100x'}];
  if(values.length<30){
    root.innerHTML='<div class="timing-note">Precisamos de pelo menos 30 rodadas válidas para mostrar uma estimativa inicial. Atualmente: '+values.length+'.</div>';
    signal.textContent='Amostra insuficiente: aguarde mais rodadas antes de interpretar qualquer frequência.';
    return;
  }
  root.innerHTML=thresholds.map(t=>{
    const hits=values.filter(v=>v>=t.v).length,recHits=recent.filter(v=>v>=t.v).length;
    const p=hits/values.length*100,rp=recent.length?recHits/recent.length*100:0;
    const ci=timingWilson(hits,values.length);
    const delta=rp-p;
    const label=recent.length<30?'Poucos dados recentes':Math.abs(delta)<1?'Próximo da frequência histórica':delta>0?'Acima da frequência histórica recente':'Abaixo da frequência histórica recente';
    const cls=recent.length<30||Math.abs(delta)<1?'neutral':delta>0?'up':'down';
    return '<div class="timing-radar-card"><div class="timing-radar-head"><b>Resultado '+t.label+'</b><span class="timing-radar-tag '+cls+'">'+label+'</span></div><div class="timing-radar-prob">'+timingPct(hits,values.length)+'</div><div class="timing-radar-detail">Histórico: '+hits+' de '+values.length+' rodadas</div><div class="timing-radar-detail">Últimas '+recent.length+': '+timingPct(recHits,recent.length)+'</div><div class="timing-radar-detail">Intervalo de confiança 95%: '+timingFmt(ci.low)+'%–'+timingFmt(ci.high)+'%</div><div class="timing-radar-bar"><span style="width:'+Math.max(0,Math.min(100,p))+'%"></span></div></div>';
  }).join('');
  const nudge=thresholds.map(t=>{
    const all=values.filter(v=>v>=t.v).length/values.length*100;
    const rr=recent.filter(v=>v>=t.v).length/recent.length*100;
    return {label:t.label,delta:rr-all,all,recent:rr};
  }).sort((a,b)=>b.delta-a.delta)[0];
  if(recent.length>=30&&Math.abs(nudge.delta)>=2){
    signal.innerHTML='<b>Variação observada:</b> nas últimas '+recent.length+' rodadas, a frequência de '+nudge.label+' ficou '+(nudge.delta>0?'acima':'abaixo')+' da frequência do histórico em '+timingFmt(Math.abs(nudge.delta))+' pontos percentuais. Isso descreve o passado recente, não aumenta de forma comprovada a chance da próxima rodada.';
  }else{
    signal.textContent='Não há diferença recente forte o bastante para destacar. Frequências passadas não indicam que uma vela esteja “atrasada” nem garantem a próxima rodada.';
  }
}

function renderMinuteEndingRadar(rounds){
  const root=document.getElementById('timingMinuteCombinedRows');
  const summary=document.getElementById('timingMinuteEndingSummary');
  if(!root||!summary)return;
  const valid=rounds.filter(r=>Number.isFinite(Number(r.value))&&Number(r.value)>0&&Number.isFinite(Number(r.ts)));
  if(valid.length<30){
    root.innerHTML='<tr><td colspan="8">Amostra insuficiente: são necessárias pelo menos 30 rodadas válidas.</td></tr>';
    summary.textContent='Ainda há poucas rodadas para comparar os minutos e finais de minuto.';
    return;
  }
  const overall10=valid.filter(r=>Number(r.value)>=10).length/valid.length*100;
  const overall50=valid.filter(r=>Number(r.value)>=50).length/valid.length*100;
  const overall100=valid.filter(r=>Number(r.value)>=100).length/valid.length*100;
  const minuteMap=Array.from({length:60},(_,minute)=>({minute,total:0,hits10:0,hits50:0,hits100:0}));
  const buckets=Array.from({length:10},(_,digit)=>({digit,total:0,hits10:0,hits50:0,hits100:0}));
  valid.forEach(r=>{
    const minute=new Date(Number(r.ts)).getMinutes(),digit=minute%10,v=Number(r.value);
    const m=minuteMap[minute],b=buckets[digit];
    [m,b].forEach(x=>{x.total++;if(v>=10)x.hits10++;if(v>=50)x.hits50++;if(v>=100)x.hits100++;});
  });
  const minuteRows=minuteMap.filter(x=>x.total>0).sort((a,b)=>(b.hits10/b.total)-(a.hits10/a.total)||b.hits10-a.hits10||b.total-a.total).slice(0,10);
  const rows=[];
  minuteRows.forEach(x=>{
    const rate=x.hits10/x.total*100, enough=x.total>=30;
    const label=!enough?'Poucos dados':rate>overall10+2?'Acima da média':rate<overall10-2?'Abaixo da média':'Próximo da média';
    const cls=!enough?'neutral':rate>overall10+2?'up':rate<overall10-2?'down':'neutral';
    rows.push({kind:'Minuto',name:'Min '+String(x.minute).padStart(2,'0'),...x,rate,label,cls});
  });
  buckets.forEach(x=>{
    const rate=x.total?x.hits10/x.total*100:0,enough=x.total>=30;
    const label=!enough?'Poucos dados':rate>overall10+2?'Acima da média':rate<overall10-2?'Abaixo da média':'Próximo da média';
    const cls=!enough?'neutral':rate>overall10+2?'up':rate<overall10-2?'down':'neutral';
    rows.push({kind:'Final',name:'…'+x.digit,...x,rate,label,cls});
  });
  root.innerHTML=rows.map(x=>'<tr><td>'+x.kind+'</td><td><b>'+x.name+'</b></td><td>'+x.hits10+'</td><td>'+x.total+'</td><td><b>'+timingPct(x.hits10,x.total)+'</b></td><td>'+timingPct(x.hits50,x.total)+'</td><td>'+timingPct(x.hits100,x.total)+'</td><td><span class="timing-radar-tag '+x.cls+'">'+x.label+'</span></td></tr>').join('');
  const leader=minuteRows.find(x=>x.total>=30);
  const bestFinal=[...buckets].filter(x=>x.total>=30).sort((a,b)=>(b.hits10/b.total)-(a.hits10/a.total))[0];
  let msg='Referência geral: ≥10x '+timingFmt(overall10)+'% · ≥50x '+timingFmt(overall50)+'% · ≥100x '+timingFmt(overall100)+'%. ';
  if(leader)msg+='Minuto com maior taxa observada (entre os 10 exibidos): '+String(leader.minute).padStart(2,'0')+' ('+timingPct(leader.hits10,leader.total)+', '+leader.hits10+'/'+leader.total+'). ';
  if(bestFinal)msg+='Final com maior taxa observada: …'+bestFinal.digit+' ('+timingPct(bestFinal.hits10,bestFinal.total)+', '+bestFinal.hits10+'/'+bestFinal.total+'). ';
  msg+='“Acima da média” descreve o histórico observado e não prevê a próxima rodada.';
  summary.textContent=msg;
}

function timingPct(n,d){return d?((n/d)*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'—'}
function timingMean(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
function timingFmt(n){return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2})}

function renderTimingRepeatPatterns(rounds){
  const summary=document.getElementById('timingRepeatSummary');
  const rowsEl=document.getElementById('timingRepeatRows');
  const timeEl=document.getElementById('timingRepeatTime');
  if(!summary||!rowsEl||!timeEl)return;
  const values=rounds.map(r=>Number(r.value));
  const isHigh=v=>Number.isFinite(v)&&v>=10;
  const highs=rounds.map((r,i)=>({r,i})).filter(x=>isHigh(Number(x.r.value)));
  let mirrorSignals=0,mirrorHits=0,chessSignals=0,chessHits=0;
  // Backtest walk-forward: cada sinal usa apenas rodadas anteriores/atuais;
  // o resultado seguinte é usado somente para pontuar o sinal já emitido.
  for(let i=0;i<values.length-1;i++){
    if(isHigh(values[i])){
      mirrorSignals++;
      if(isHigh(values[i+1]))mirrorHits++;
    }
    if(i>=1&&isHigh(values[i-1])&&!isHigh(values[i])){
      chessSignals++;
      if(isHigh(values[i+1]))chessHits++;
    }
  }
  const mirrorMisses=mirrorSignals-mirrorHits;
  const chessMisses=chessSignals-chessHits;
  // Walk-forward por casa: em cada rodada abaixo de 10x, registra a posição
  // atual desde o último ≥10x e confere somente a rodada imediatamente seguinte.
  const houseBacktest=new Map();
  let lowsSinceHigh=0;
  for(let i=0;i<values.length-1;i++){
    if(isHigh(values[i])){lowsSinceHigh=0;continue;}
    lowsSinceHigh++;
    if(lowsSinceHigh>0){
      const item=houseBacktest.get(lowsSinceHigh)||{signals:0,hits:0};
      item.signals++;
      if(isHigh(values[i+1]))item.hits++;
      houseBacktest.set(lowsSinceHigh,item);
    }
  }
  const houseMisses=[...houseBacktest.values()].reduce((sum,x)=>sum+x.signals-x.hits,0);
  const houseSignals=[...houseBacktest.values()].reduce((sum,x)=>sum+x.signals,0);
  const houseHits=[...houseBacktest.values()].reduce((sum,x)=>sum+x.hits,0);
  const strongestHouse=[...houseBacktest.entries()].filter(([house,x])=>x.signals>=5).sort((a,b)=>(b[1].hits/b[1].signals)-(a[1].hits/a[1].signals)||b[1].signals-a[1].signals)[0];
  const tail=values.slice(-2);
  const mirrorForming=tail.length>=1&&isHigh(tail[tail.length-1]);
  const chessForming=tail.length===2&&isHigh(tail[0])&&!isHigh(tail[1]);
  const alertParts=[];
  if(mirrorForming){
    alertParts.push((mirrorSignals>=30?'Espelho em observação':'Espelho: amostra limitada')+' — após ≥10x, o próximo resultado foi ≥10x em '+timingPct(mirrorHits,mirrorSignals)+' dos casos históricos ('+mirrorHits+' acertos, '+mirrorMisses+' falhas em '+mirrorSignals+' sinais).');
  }
  if(chessForming){
    alertParts.push((chessSignals>=30?'Xadrez em formação':'Xadrez: amostra limitada')+' — após ≥10x seguido de <10x, o próximo resultado foi ≥10x em '+timingPct(chessHits,chessSignals)+' dos casos históricos ('+chessHits+' acertos, '+chessMisses+' falhas em '+chessSignals+' sinais).');
  }
  if(!alertParts.length)alertParts.push('Nenhum Espelho ou Xadrez está em formação imediata na sequência final.');
  let validationMessage='Validação histórica sem lookahead: Espelho '+mirrorHits+'/'+mirrorSignals+' acertos ('+mirrorMisses+' falhas); Xadrez '+chessHits+'/'+chessSignals+' acertos ('+chessMisses+' falhas). ';
  validationMessage+='Por casa: '+houseHits+'/'+houseSignals+' acertos ('+houseMisses+' falhas) ao conferir a rodada seguinte após casas abaixo de 10x.';
  if(strongestHouse)validationMessage+=' Entre posições com pelo menos 5 sinais, a maior taxa observada foi na '+strongestHouse[0]+'ª casa ('+timingPct(strongestHouse[1].hits,strongestHouse[1].signals)+', '+strongestHouse[1].hits+'/'+strongestHouse[1].signals+').';
  validationMessage+=' Cada sinal é avaliado apenas quando há uma rodada seguinte para conferir.';
  alertParts.push(validationMessage);
  if(highs.length<2){
    summary.textContent='Precisamos de pelo menos 2 resultados ≥10x para calcular a taxa histórica por casa. Encontrados: '+highs.length+'.';
    rowsEl.innerHTML='<tr><td colspan="5">Histórico insuficiente.</td></tr>';
    timeEl.textContent='Ainda não há intervalos suficientes para analisar recorrências por tempo.';
    return;
  }
  const gaps=[];
  for(let i=1;i<highs.length;i++){
    gaps.push({
      houses:highs[i].i-highs[i-1].i,
      minutes:Math.max(0,(Number(highs[i].r.ts)-Number(highs[i-1].r.ts))/60000)
    });
  }
  const lastHigh=highs[highs.length-1];
  const currentLowCount=rounds.length-1-lastHigh.i;
  const nextHouse=currentLowCount+1;
  const elapsedMinutes=Math.max(0,(Date.now()-Number(lastHigh.r.ts))/60000);
  const maxHouse=Math.min(20,Math.max(10,nextHouse+5));
  const rows=[];
  for(let house=1;house<=maxHouse;house++){
    const prior=gaps.filter(g=>g.houses>=house);
    const exact=gaps.filter(g=>g.houses===house);
    const rate=prior.length?exact.length/prior.length:0;
    const times=exact.map(g=>g.minutes).filter(Number.isFinite);
    const meanTime=times.length?timingMean(times):null;
    const sortedTimes=[...times].sort((a,b)=>a-b);
    const medianTime=sortedTimes.length?sortedTimes[Math.floor((sortedTimes.length-1)/2)]:null;
    rows.push({house,hits:exact.length,opportunities:prior.length,rate,meanTime,medianTime,timeSamples:times.length});
  }
  const likely=rows.filter(x=>x.house>=nextHouse&&x.opportunities>=5).sort((a,b)=>b.rate-a.rate||b.hits-a.hits)[0];
  const houseRows=rows.map(x=>{
    const current=x.house===nextHouse?' class="timing-repeat-current"':'';
    let timeStatus='—';
    if(x.house===nextHouse&&x.timeSamples>=3&&x.medianTime>0){
      const ratio=elapsedMinutes/x.medianTime;
      timeStatus=ratio<0.5?'Menos da metade do intervalo mediano':ratio<=1.25?'Dentro da faixa temporal observada':'Acima do intervalo mediano';
    }else if(x.house===nextHouse&&x.timeSamples>0){
      timeStatus='Intervalo atual: '+timingFmt(elapsedMinutes)+' min';
    }
    const pct=x.opportunities?Math.max(0,Math.min(100,x.rate*100)):0;
    const confidence=x.opportunities<10?'Amostra pequena':x.opportunities<30?'Amostra limitada':'Histórico mais amplo';
    const probability=x.opportunities
      ?'<div class="timing-probability"><b>'+timingPct(x.hits,x.opportunities)+'</b><div class="timing-probability-track" role="img" aria-label="Taxa histórica observada '+timingPct(x.hits,x.opportunities)+'"><span style="width:'+pct+'%"></span></div><small>'+confidence+'</small></div>'
      :'<span class="timing-probability-empty">Sem amostra</span>';
    return '<tr'+current+'><td><b>'+x.house+'ª casa'+(x.house===nextHouse?' · próxima':'')+'</b></td><td>'+x.hits+'</td><td>'+x.opportunities+'</td><td>'+probability+'</td><td>'+timeStatus+'</td></tr>';
  }).join('');
  rowsEl.innerHTML=houseRows;
  let message='Desde o último resultado ≥10x, passaram '+currentLowCount+' casa(s) abaixo de 10x; a próxima posição é a '+nextHouse+'ª casa. O tempo decorrido desde o último ≥10x é '+timingFmt(elapsedMinutes)+' min.';
  if(likely)message+=' Entre as próximas posições com pelo menos 5 intervalos comparáveis, a maior taxa histórica foi na '+likely.house+'ª casa ('+timingPct(likely.hits,likely.opportunities)+', '+likely.hits+' ocorrências em '+likely.opportunities+' oportunidades).';
  else message+=' Ainda não há pelo menos 5 intervalos comparáveis para destacar uma posição com amostra mínima.';
  summary.textContent=message+' '+patternAlert;
  const timed=gaps.filter(g=>Number.isFinite(g.minutes));
  const within5=timed.filter(g=>g.minutes<=5).length;
  const within10=timed.filter(g=>g.minutes<=10).length;
  const mean=timed.length?timingMean(timed.map(g=>g.minutes)):0;
  const joint=gaps.filter(g=>g.houses===nextHouse);
  const jointTimes=joint.map(g=>g.minutes).filter(Number.isFinite);
  const jointMedian=jointTimes.length?[...jointTimes].sort((a,b)=>a-b)[Math.floor((jointTimes.length-1)/2)]:null;
  const jointNote=jointTimes.length>=3&&jointMedian>0
    ?' Para intervalos históricos que terminaram exatamente na '+nextHouse+'ª casa, a mediana temporal foi '+timingFmt(jointMedian)+' min; o tempo atual equivale a '+timingFmt(elapsedMinutes/jointMedian*100)+'% dessa mediana.'
    :' Ainda há poucos exemplos da combinação entre a '+nextHouse+'ª casa e o intervalo de tempo para estimar essa combinação com estabilidade.';
  timeEl.textContent='Entre '+timed.length+' intervalos históricos entre resultados ≥10x, '+within5+'/'+timed.length+' ('+timingPct(within5,timed.length)+') ocorreram em até 5 min e '+within10+'/'+timed.length+' ('+timingPct(within10,timed.length)+') em até 10 min. Intervalo médio geral: '+(timed.length?timingFmt(mean)+' min':'—')+'.'+jointNote+' Os tempos são descritivos, não uma contagem regressiva.';
}
function renderTimingAnalysis(){
  const gameEl=document.getElementById('timingGame'),windowEl=document.getElementById('timingWindow');
  if(!gameEl||!windowEl)return;
  const game=gameEl.value,windowValue=windowEl.value;
  let rounds=[];
  const games=game==='both'?['aviator','aviator2']:[game==='active'?data.activeGame:game];
  games.forEach(g=>(data.roundsByGame[g]||[]).forEach(r=>rounds.push({...r,game:g})));
  rounds=rounds.filter(r=>Number.isFinite(Number(r.value))&&Number.isFinite(Number(r.ts)));
  if(windowValue!=='all'){
    const cutoff=Date.now()-Number(windowValue)*60000;
    rounds=rounds.filter(r=>r.ts>=cutoff);
  }
  rounds.sort((a,b)=>a.ts-b.ts);
  const values=rounds.map(r=>Number(r.value));
  renderTimingRadar(rounds);
  renderMinuteEndingRadar(rounds);
  renderTimingRepeatPatterns(rounds);
  enableTimingTableSorting();
  const total=values.length,above10=values.filter(v=>v>=10),above50=values.filter(v=>v>=50),above100=values.filter(v=>v>=100);
  const pink=values.filter(v=>v>=10&&v<100);
  const avg=timingMean(values),pinkAvg=timingMean(pink);
  const fmtTime=ts=>new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const stat=(label,value,detail)=>'<div class="timing-stat"><div class="timing-stat-label">'+label+'</div><div class="timing-stat-value">'+value+'</div><div class="timing-stat-detail">'+detail+'</div></div>';
  const stats=document.getElementById('timingStats');
  if(stats)stats.innerHTML=[
    stat('Rodadas analisadas',timingFmt(total),'no período escolhido'),
    stat('≥ 10x',timingPct(above10.length,total),above10.length+' ocorrência(s)'),
    stat('≥ 50x',timingPct(above50.length,total),above50.length+' ocorrência(s)'),
    stat('≥ 100x',timingPct(above100.length,total),above100.length+' ocorrência(s)'),
    stat('Média de todos os resultados',total?timingFmt(avg)+'x':'—','média aritmética'),
    stat('Velas rosas',pink.length,timingPct(pink.length,total)+' do total')
  ].join('');
  const updated=document.getElementById('timingUpdated');
  if(updated)updated.textContent='Atualizado em '+new Date().toLocaleTimeString('pt-BR')+' · '+(games.length===2?'Aviator + Aviator 2':games[0]==='aviator2'?'Aviator 2':'Aviator')+' · '+(windowValue==='all'?'todo o histórico disponível':windowValue==='60'?'últimos 60 minutos':windowValue==='360'?'últimas 6 horas':'últimas 24 horas');
  const gaps10=[],gaps50=[],gaps100=[];
  let last10=-1,last50=-1,last100=-1,runLow=0,maxLow=0,streak10=0,maxStreak10=0;
  rounds.forEach((r,i)=>{
    const v=Number(r.value);
    if(v>=10){if(last10>=0)gaps10.push(i-last10);last10=i;streak10++;maxStreak10=Math.max(maxStreak10,streak10);}else{runLow++;maxLow=Math.max(maxLow,runLow);streak10=0;}
    if(v>=50){if(last50>=0)gaps50.push(i-last50);last50=i;}
    if(v>=100){if(last100>=0)gaps100.push(i-last100);last100=i;}
  });
  const meanGap=a=>a.length?timingFmt(timingMean(a))+' rodadas':'Ainda sem ocorrências repetidas';
  const patterns=document.getElementById('timingPatterns');
  if(patterns)patterns.innerHTML=[
    stat('Intervalo médio entre ≥ 10x',meanGap(gaps10),gaps10.length+' intervalo(s) calculado(s)'),
    stat('Intervalo médio entre ≥ 50x',meanGap(gaps50),gaps50.length+' intervalo(s) calculado(s)'),
    stat('Intervalo médio entre ≥ 100x',meanGap(gaps100),gaps100.length+' intervalo(s) calculado(s)'),
    stat('Maior sequência abaixo de 10x',maxLow+' rodada(s)','no histórico selecionado'),
    stat('Maior sequência consecutiva ≥ 10x',maxStreak10+' rodada(s)','no histórico selecionado')
  ].join('');
  const pinkEl=document.getElementById('timingPink');
  if(pinkEl) pinkEl.innerHTML=pink.length
    ? '<div class="timing-pink-grid">'+stat('Quantidade',pink.length,'de '+total+' rodadas')+stat('Média',timingFmt(pinkAvg)+'x','média aritmética')+stat('Mediana',timingFmt([...pink].sort((a,b)=>a-b)[Math.floor((pink.length-1)/2)])+'x','valor central da amostra')+stat('Maior rosa',timingFmt(Math.max(...pink))+'x','limite da amostra')+'</div>'
    : 'Nenhuma vela rosa (10x a 99,99x) encontrada no período selecionado.';
  const summary=document.getElementById('timingSummary');
  if(summary){
    if(!total)summary.textContent='Nenhuma rodada disponível para os filtros escolhidos. Confirme que o coletor está conectado e que o histórico aparece na aba Monitor.';
    else summary.innerHTML='<p>Foram analisadas <b>'+total+'</b> rodadas. A frequência observada foi de <b>'+timingPct(above10.length,total)+'</b> para resultados ≥ 10x, <b>'+timingPct(above50.length,total)+'</b> para ≥ 50x e <b>'+timingPct(above100.length,total)+'</b> para ≥ 100x.</p><p>Essas proporções descrevem apenas a amostra selecionada. Não são garantia nem previsão da próxima rodada.</p>';
  }
}
function enableTimingTableSorting(){
  document.querySelectorAll('#timing .timing-table thead th[data-sort]').forEach(th=>{
    if(th.dataset.sortReady)return;
    th.dataset.sortReady='1';
    th.style.cursor='pointer';
    th.addEventListener('click',()=>{
      const table=th.closest('table'),tbody=table&&table.tBodies[0];
      if(!tbody)return;
      const index=Array.from(th.parentElement.children).indexOf(th);
      const dir=th.dataset.sortDir==='asc'?'desc':'asc';
      th.dataset.sortDir=dir;
      const headers=Array.from(th.parentElement.children);
      headers.forEach(h=>{if(h!==th)delete h.dataset.sortDir;});
      const rows=Array.from(tbody.rows).filter(row=>row.cells.length>1);
      const value=row=>{
        const cell=row.cells[index];
        if(!cell)return '';
        const text=(cell.innerText||cell.textContent||'').trim();
        if(th.dataset.sort==='number')return Number(text.replace(/[^0-9,.-]/g,'').replace(',','.'))||0;
        if(th.dataset.sort==='percent'){
          const m=text.match(/-?\\d+(?:[,.]\\d+)?/);
          return m?Number(m[0].replace(',','.')):0;
        }
        return text.toLocaleLowerCase('pt-BR');
      };
      rows.sort((a,b)=>{
        const av=value(a),bv=value(b);
        const cmp=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),'pt-BR');
        return dir==='asc'?cmp:-cmp;
      });
      rows.forEach(row=>tbody.appendChild(row));
      th.setAttribute('aria-sort',dir==='asc'?'ascending':'descending');
    });
  });
}
setInterval(()=>{const p=document.getElementById('timing');if(p&&!p.classList.contains('hidden'))renderTimingAnalysis();},10000);

function showPage(id,btn){
  ['overview','calculator','monitor','timing'].forEach(x=>document.getElementById(x).classList.toggle('hidden',x!==id));
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  if(id==='calculator')calc();
  if(id==='timing')renderTimingAnalysis();
  if(id==='monitor'){
    document.getElementById('gameBtnAviator').classList.toggle('active',data.activeGame==='aviator');
    document.getElementById('gameBtnAviator2').classList.toggle('active',data.activeGame==='aviator2');
    renderMonitor();
  }
}

/* ======================================================
   LOGIN + SINCRONIZAÇÃO NA NUVEM (Supabase)
====================================================== */
const SUPABASE_URL='https://aypjaqmmlurlqeotbepp.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGphcW1tbHVybHFlb3RiZXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDU2MTAsImV4cCI6MjEwNTg4MTYxMH0.IeAT6gwsAfzfw2N4BIxg9gc5pRqZH0ELn3Xo9fogHnY';
let supabaseClient=null;
let currentUser=null;

let syncingUserId=null;

function initSupabase(){
  if(typeof window.supabase==='undefined'){setTimeout(initSupabase,200);return}
  supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    currentUser=session?session.user:null;
    setAuthView(!!currentUser);
    if(currentUser && (event==='SIGNED_IN' || event==='INITIAL_SESSION')){
      setTimeout(()=>syncAfterLogin(),0);
    }
  });
  supabaseClient.auth.getSession().then(({data:sd,error})=>{
    if(error){console.error('Erro ao recuperar sessão:',error);setAuthView(false);return}
    currentUser=sd.session?sd.session.user:null;
    setAuthView(!!currentUser);
    if(currentUser) setTimeout(()=>syncAfterLogin(),0);
  }).catch(e=>{console.error('Erro ao recuperar sessão:',e);setAuthView(false)});
}
initSupabase();

/* A página nasce na tela de login. O conteúdo interno só é liberado
   quando existe uma sessão autenticada confirmada pelo Supabase. */
function setAuthView(isAuthenticated){
  const login=document.getElementById('login');
  const appPages=['overview','calculator','monitor','timing'];
  const nav=document.querySelector('.bottom');
  if(!login)return;
  document.body.classList.toggle('auth-login',!isAuthenticated);
  login.classList.toggle('hidden',isAuthenticated);
  appPages.forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle('hidden',!isAuthenticated || id!=='overview');
  });
  if(nav) nav.classList.toggle('hidden',!isAuthenticated);
  updateLoginLinkUI();
  if(isAuthenticated){
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    const first=document.querySelector('.nav');
    if(first) first.classList.add('active');
    window.scrollTo(0,0);
  }else{
    showLoginStatus('','hidden');
    window.scrollTo(0,0);
  }
}

function updateLoginLinkUI(){
  const action=document.getElementById('headerAuthAction');
  const btn=document.getElementById('headerLogoutBtn');
  if(!action||!btn)return;
  if(currentUser){
    action.classList.remove('hidden');
    btn.onclick=doLogout;
    btn.title='Sair da conta';
    btn.setAttribute('aria-label','Sair da conta');
  }else{
    action.classList.add('hidden');
    btn.onclick=doLogout;
  }
}

function showLoginStatus(msg,type){
  const el=document.getElementById('loginStatus');
  if(!el)return;
  el.textContent=msg;
  el.className='login-status '+type;
}

function translateAuthError(msg){
  const map={
    'Invalid login credentials':'E-mail ou senha incorretos.',
    'User already registered':'Já existe uma conta com esse e-mail.',
    'Email not confirmed':'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).',
    'Password should be at least 6 characters.':'A senha precisa ter pelo menos 6 caracteres.'
  };
  return map[msg]||msg;
}

async function doLogin(){
  if(!supabaseClient){showLoginStatus('Erro: não foi possível carregar o serviço de login. Verifique sua internet e recarregue a página.','error');return}
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  if(!email||!password){showLoginStatus('Preencha e-mail e senha.','error');return}
  showLoginStatus('Entrando...','info');
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){showLoginStatus('Erro: '+translateAuthError(error.message),'error');return}
  showLoginStatus('Login realizado! Sincronizando seus dados...','ok');
  setAuthView(true);
}

async function doSignUp(){
  if(!supabaseClient){showLoginStatus('Erro: não foi possível carregar o serviço de login. Verifique sua internet e recarregue a página.','error');return}
  const name=(document.getElementById('loginName')?.value||'').trim();
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  if(!name){showLoginStatus('Informe seu nome para criar a conta.','error');return}
  if(!email||!password){showLoginStatus('Preencha e-mail e senha para criar a conta.','error');return}
  if(password.length<6){showLoginStatus('A senha precisa ter pelo menos 6 caracteres.','error');return}
  showLoginStatus('Criando conta...','info');
  const {data:sd,error}=await supabaseClient.auth.signUp({email,password,options:{data:{full_name:name,name}}});
  if(error){showLoginStatus('Erro: '+translateAuthError(error.message),'error');return}
  if(sd.user && !sd.session){
    showLoginStatus('Conta criada! Confira seu e-mail para confirmar antes de entrar.','ok');
  } else {
    showLoginStatus('Conta criada e login realizado!','ok');
    setAuthView(true);
  }
}

async function doGoogleLogin(){
  if(!supabaseClient){showLoginStatus('Erro: não foi possível carregar o serviço de login. Verifique sua internet e recarregue a página.','error');return}
  showLoginStatus('Abrindo login do Google...','info');
  const {error}=await supabaseClient.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+window.location.pathname}});
  if(error) showLoginStatus('Erro: '+translateAuthError(error.message),'error');
}

async function doPasswordReset(){
  if(!supabaseClient){showLoginStatus('Erro: não foi possível carregar o serviço de login. Verifique sua internet e recarregue a página.','error');return}
  const email=document.getElementById('loginEmail').value.trim();
  if(!email){showLoginStatus('Digite seu e-mail no campo acima primeiro.','error');return}
  showLoginStatus('Enviando e-mail de recuperação...','info');
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});
  if(error){showLoginStatus('Erro: '+translateAuthError(error.message),'error');return}
  showLoginStatus('E-mail de recuperação enviado! Confira sua caixa de entrada.','ok');
}

async function doLogout(){
  showAppConfirm('Deseja sair da sua conta? Seus dados continuam salvos na nuvem.',async()=>{
    if(supabaseClient){
      const {error}=await supabaseClient.auth.signOut();
      if(error){showLoginStatus('Erro ao sair: '+translateAuthError(error.message),'error');return}
    }
    currentUser=null;
    setAuthView(false);
    showAppNotice('Você saiu da conta.','Sessão encerrada','success');
  },'Sair da conta','Sair');
}

async function syncAfterLogin(){
  if(!currentUser||!supabaseClient)return;
  const userId=currentUser.id;
  if(syncingUserId===userId)return;
  syncingUserId=userId;
  try{
    const {data:row,error}=await supabaseClient.from('gestoes').select('data').eq('user_id',userId).maybeSingle();
    if(error){
      console.error('Erro ao carregar gestão da nuvem:',error);
      showLoginStatus('Login realizado, mas não foi possível sincronizar os dados da nuvem.','error');
      return;
    }

    const localOwner=storageGet(LOCAL_OWNER_KEY);
    if(row && row.data && Object.keys(row.data).length){
      data=row.data;
      normalizeLoadedData();
      storageSet(STORAGE_KEY,JSON.stringify(data));
      storageSet(LOCAL_OWNER_KEY,userId);
      calc();updateOverview();renderEntryReport();renderWithdrawalReport();renderChart();renderPeriodSummary();renderWithdrawalBalances();applyScenarioLock();
      return;
    }

    // Sem dados na nuvem: só reutiliza dados locais se eles pertencerem ao mesmo usuário.
    // Isso impede que os dados de uma conta sejam enviados acidentalmente para outra.
    if(localOwner===userId){
      await pushToCloud();
    }else{
      data=createEmptyData();
      storageSet(STORAGE_KEY,JSON.stringify(data));
      storageSet(LOCAL_OWNER_KEY,userId);
      calc();updateOverview();renderEntryReport();renderWithdrawalReport();renderChart();renderPeriodSummary();renderWithdrawalBalances();applyScenarioLock();
      await pushToCloud();
    }
  }catch(e){
    console.error('Erro na sincronização:',e);
    showLoginStatus('Login realizado, mas ocorreu um erro ao sincronizar seus dados.','error');
  }finally{
    syncingUserId=null;
  }
}

function createEmptyData(){
  return {started:false,initial:0,current:0,wins:0,losses:0,totalWin:0,totalLoss:0,days:0,entries:[],withdrawals:[],alerts:{win:false,loss:false,date:''},scenario:null,managementDays:null,freeManagement:false,roundsByGame:{aviator:[],aviator2:[]},activeGame:'aviator'};
}

function normalizeLoadedData(){
  if(!data || typeof data!=='object') data=createEmptyData();
  if(!Array.isArray(data.entries)) data.entries=[];
  if(!Array.isArray(data.withdrawals)) data.withdrawals=[];
  if(!data.alerts || typeof data.alerts!=='object') data.alerts={win:false,loss:false,date:''};
  if(!Array.isArray(data.rounds)) data.rounds=[];
  if(!data.roundsByGame || typeof data.roundsByGame!=='object') data.roundsByGame={aviator:data.rounds.length?data.rounds:[],aviator2:[]};
  if(!Array.isArray(data.roundsByGame.aviator)) data.roundsByGame.aviator=[];
  if(!Array.isArray(data.roundsByGame.aviator2)) data.roundsByGame.aviator2=[];
  if(!data.activeGame || !data.roundsByGame[data.activeGame]) data.activeGame='aviator';
  if(data.scenario===undefined) data.scenario=null;
  if(data.managementDays===undefined) data.managementDays=null;
  if(data.freeManagement===undefined) data.freeManagement=false;
  if(data.contagemAtivada===undefined) data.contagemAtivada=true;
}

async function pushToCloud(){
  if(!currentUser||!supabaseClient)return false;
  try{
    const {error}=await supabaseClient.from('gestoes').upsert({user_id:currentUser.id,data:data,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error){console.error('Erro ao sincronizar com a nuvem:',error);return false}
    storageSet(LOCAL_OWNER_KEY,currentUser.id);
    return true;
  }catch(e){console.error('Erro ao sincronizar com a nuvem:',e);return false}
}

function openLoginPreview(){
  setAuthView(false);
}
function closeLoginPreview(){
  /* Nunca abre o app sem uma sessão autenticada. */
  if(currentUser) setAuthView(true);
  else setAuthView(false);
}
function toggleLoginPassword(){
  const field=document.getElementById('loginPassword');
  field.type=field.type==='password'?'text':'password';
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
}
calc();updateOverview();renderWithdrawalReport();
setAuthView(false);
if(!storageIsLocal){
  const bar=document.createElement('div');
  bar.className='notice';
  bar.style.cssText='position:fixed;left:50%;top:8px;transform:translateX(-50%);width:min(520px,calc(100% - 24px));z-index:30;text-align:center;background:rgba(255,30,67,.92);border:1px solid rgba(255,30,67,.6);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.5)';
  bar.textContent='⚠️ Armazenamento local bloqueado neste preview — os dados não serão salvos ao recarregar. Baixe e abra o arquivo no navegador para salvar sua gestão normalmente.';
  document.body.appendChild(bar);
}

function loadMoreRounds(){roundsVisible+=500;renderMonitor();}
function updateLoadMoreBtn(total){const b=document.getElementById('loadMoreRoundsBtn');if(b)b.classList.toggle('hidden',total<=roundsVisible);}
