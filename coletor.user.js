// ==UserScript==
// @name         TheLord Coletor de Velas
// @version      1.5
// @description  Coleta velas do Aviator e tenta recuperar envios interrompidos
// @match        *://*/*
// @match        *://*.spribegaming.com/*
// @match        *://*.spribe.io/*
// @match        *://*.spribe.co/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function(){
  'use strict';
  function detectGame(){
    const params=new URLSearchParams(location.search);
    const forced=(params.get('thelord_game')||'').toLowerCase();
    if(['aviator','aviator2'].includes(forced))return forced;
    const context=[location.href,document.title,location.hostname];
    try{if(window.frameElement)context.push(window.frameElement.src||'',window.frameElement.title||'',window.frameElement.getAttribute('name')||'');}catch(e){}
    return /aviator\\s*2|aviator2|\\bg2\\b|game[_-]?2|game5/i.test(context.join(' '))?'aviator2':'aviator';
  }
  const GAME=detectGame();
  const URL='https://aypjaqmmlurlqeotbepp.supabase.co/rest/v1/velas';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGphcW1tbHVybHFlb3RiZXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDU2MTAsImV4cCI6MjEwNTg4MTYxMH0.IeAT6gwsAfzfw2N4BIxg9gc5pRqZH0ELn3Xo9fogHnY';
  const host=location.hostname, isTop=window.top===window.self;
  const BADGE_ID='thelord-collector-status';
  let badge=isTop?document.getElementById(BADGE_ID):null;
  if(isTop&&!badge){badge=document.createElement('div');badge.id=BADGE_ID;badge.style.cssText='position:fixed;bottom:4px;left:4px;z-index:2147483647;background:#000c;color:#ffc72c;font:11px sans-serif;padding:3px 6px;border-radius:6px;pointer-events:none;max-width:calc(100vw - 16px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';badge.textContent='TheLord: ativo, aguardando velas...';}
  function show(){if(!isTop||!badge||!document.body)return;document.querySelectorAll('#'+BADGE_ID).forEach(el=>{if(el!==badge)el.remove();});if(!document.body.contains(badge))document.body.appendChild(badge);}
  if(isTop)show();
  function status(s){if(isTop&&badge)badge.textContent=s;}
  function read(){
    let els=[...document.querySelectorAll('.payouts-block .payout, app-stats-widget .payout, .payouts-wrapper .bubble-multiplier, .payouts-block .bubble-multiplier, .payouts .payout, app-bubble-multiplier, [class*="payout"] [class*="multiplier"], .result-history .bubble-multiplier')];
    if(!els.length){
      const cand=[...document.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^\\s*\\d+[.,]\\d{2}x\\s*$/.test(e.textContent||''));
      if(cand.length>=3){const top=Math.min(...cand.map(e=>e.getBoundingClientRect().top));els=cand.filter(e=>Math.abs(e.getBoundingClientRect().top-top)<6).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);}
    }
    return els.map(e=>parseFloat((e.textContent||'').replace('x','').replace(',','.'))).filter(v=>Number.isFinite(v)&&v>=1&&v<1000000);
  }
  const QUEUE_KEY='thelord_collector_pending_v1_'+GAME;
  function loadQueue(){try{const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');return Array.isArray(q)?q.filter(x=>x&&Number.isFinite(x.value)&&x.value>=1&&x.value<1000000):[];}catch(e){return [];}}
  let queue=loadQueue(), sending=false;
  function saveQueue(){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(queue.slice(-300)));}catch(e){status('TheLord: aviso — fila local indisponível');}}
  function enqueue(values){
    values.forEach(v=>queue.push({game:GAME,value:v,queuedAt:Date.now()}));
    if(queue.length>300)queue=queue.slice(-300);
    saveQueue();
    drainQueue();
  }
  async function drainQueue(){
    if(sending||!queue.length)return;
    sending=true;
    try{
      while(queue.length){
        const item=queue[0];
        let response;
        try{
          response=await fetch(URL,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({game:item.game,value:item.value}),cache:'no-store'});
        }catch(e){status('TheLord: sem conexão — '+queue.length+' pendente(s)');break;}
        if(!response.ok){status('TheLord: erro '+response.status+' — '+queue.length+' pendente(s)');break;}
        queue.shift();saveQueue();
        status('TheLord: enviada '+item.value.toFixed(2)+'x'+(queue.length?' — '+queue.length+' pendente(s)':''));
      }
    }finally{sending=false;}
  }
  let previousValues=null;
  function findNewValues(vals,prev){
    if(!prev||!prev.length)return [];
    // O histórico costuma estar do mais novo para o mais antigo.
    // Usa sobreposição de sequência para recuperar novas velas sem reenviar todo o histórico.
    const max=Math.min(vals.length,prev.length);
    for(let n=max;n>=1;n--){
      let matches=true;
      for(let i=0;i<n;i++){if(vals[vals.length-n+i]!==prev[i]){matches=false;break;}}
      if(matches)return vals.slice(0,vals.length-n);
    }
    // Se não há sobreposição confiável, não envia um lote ambíguo.
    return [];
  }
  setInterval(()=>{
    const vals=read();
    if(!vals.length){drainQueue();return;}
    show();
    if(previousValues===null){previousValues=vals.slice(0,30);status('TheLord: coletando ✓ ('+host+')');drainQueue();return;}
    const changed=vals.slice(0,30).join('|')!==previousValues.slice(0,30).join('|');
    if(changed){
      const fresh=findNewValues(vals,previousValues);
      if(fresh.length){enqueue(fresh.slice().reverse());status('TheLord: recuperando '+fresh.length+' vela(s)');}
      else if(vals[0]!==previousValues[0]){enqueue([vals[0]]);}
      previousValues=vals.slice(0,30);
    }
    drainQueue();
  },1000);
  window.addEventListener('online',drainQueue);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)drainQueue();});
})();