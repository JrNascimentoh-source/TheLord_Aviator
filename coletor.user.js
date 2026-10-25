// ==UserScript==
// @name         TheLord Coletor de Velas
// @version      1.3
// @description  Le as velas do Aviator (7a7) e envia para o app TheLord
// @match        *://*/*
// @match        *://*.spribegaming.com/*
// @match        *://*.spribe.io/*
// @match        *://*.spribe.co/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function(){
  // O game usa vírgulas nos milhares e ponto nos decimais.
  // Aceita também a apresentação brasileira, sem truncar o valor.
  function parseMultiplier(text){
    let raw=String(text||'').trim().replace(/[x×]$/i,'').replace(/\s/g,'');
    if(!/^\d[\d.,]*$/.test(raw))return NaN;
    const dot=raw.lastIndexOf('.'),comma=raw.lastIndexOf(',');
    if(dot>=0&&comma>=0){
      const decimal=dot>comma?'.':',';
      raw=raw.split(decimal==='.'?',':'.').join('').replace(decimal,'.');
    }else if(comma>=0){
      raw=/^\d{1,3}(,\d{3})+$/.test(raw)?raw.replace(/,/g,''):raw.replace(',','.');
    }else if(/^\d{1,3}(\.\d{3})+$/.test(raw)){
      raw=raw.replace(/\./g,'');
    }
    return Number(raw);
  }
  const GAME='aviator';
  const URL='https://aypjaqmmlurlqeotbepp.supabase.co/rest/v1/velas';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGphcW1tbHVybHFlb3RiZXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDU2MTAsImV4cCI6MjEwNTg4MTYxMH0.IeAT6gwsAfzfw2N4BIxg9gc5pRqZH0ELn3Xo9fogHnY';
  const host=location.hostname;
    const isTop=window.top===window.self;
  let lastSig=null;
  const badge=document.createElement('div');
  badge.style.cssText='position:fixed;bottom:4px;left:4px;z-index:2147483647;background:#000c;color:#ffc72c;font:11px sans-serif;padding:3px 6px;border-radius:6px;pointer-events:none';
  badge.textContent=isTop?'TheLord: ativo, abra o Aviator':'TheLord: aguardando velas...';
  function show(){if(document.body&&!document.body.contains(badge))document.body.appendChild(badge);}
  if(isTop)show();
  function read(){
    let els=[...document.querySelectorAll('.payouts-block .payout, app-stats-widget .payout, .payouts-wrapper .bubble-multiplier, .payouts-block .bubble-multiplier, .payouts .payout, app-bubble-multiplier, [class*="payout"] [class*="multiplier"], .result-history .bubble-multiplier')];
    if(!els.length){
      // plano B: primeira linha de textos tipo "1.02x" no topo da tela
      const cand=[...document.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^\s*\d[\d.,\s]*[x×]\s*$/i.test(e.textContent||'')&&Number.isFinite(parseMultiplier(e.textContent)));
      if(cand.length>=3){const top=Math.min(...cand.map(e=>e.getBoundingClientRect().top));els=cand.filter(e=>Math.abs(e.getBoundingClientRect().top-top)<6).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);}
    }
    return els.map(e=>parseMultiplier(e.textContent)).filter(v=>v>=1&&v<1000000);
  }
  function send(v){
    fetch(URL,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({game:GAME,value:v})})
      .then(r=>{badge.textContent=r.ok?('TheLord: enviada '+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'x'):'TheLord: erro '+r.status})
      .catch(()=>{badge.textContent='TheLord: sem internet'});
  }
  setInterval(()=>{
    const vals=read();
    if(!vals.length)return;
    show();
    const sig=vals.slice(0,8).join('|');
    if(lastSig===null){lastSig=sig;badge.textContent='TheLord: coletando ✓ ('+host+')';return}
    if(sig!==lastSig){lastSig=sig;send(vals[0]);}
  },1000);
})();