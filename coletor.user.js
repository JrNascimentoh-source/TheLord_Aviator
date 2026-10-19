// ==UserScript==
// @name         TheLord Coletor de Velas
// @version      1.1
// @description  Le as velas do Aviator (7a7) e envia para o app TheLord
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function(){
  const GAME='aviator';
  const URL='https://aypjaqmmlurlqeotbepp.supabase.co/rest/v1/velas';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGphcW1tbHVybHFlb3RiZXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDU2MTAsImV4cCI6MjEwNTg4MTYxMH0.IeAT6gwsAfzfw2N4BIxg9gc5pRqZH0ELn3Xo9fogHnY';
  const host=location.hostname;
  const isGameHost=/spribe|aviator/i.test(host);
  const isTop=window.top===window.self;
  if(!isTop&&!isGameHost)return;
  let lastSig=null;
  const badge=document.createElement('div');
  badge.style.cssText='position:fixed;bottom:4px;left:4px;z-index:2147483647;background:#000c;color:#ffc72c;font:11px sans-serif;padding:3px 6px;border-radius:6px;pointer-events:none';
  badge.textContent=isTop?'TheLord: ativo, abra o Aviator':'TheLord: aguardando velas...';
  function show(){if(document.body&&!document.body.contains(badge))document.body.appendChild(badge);}
  if(isTop||isGameHost)show();
  function read(){
    const els=document.querySelectorAll('.payouts-block .payout, app-stats-widget .payout, .payouts-wrapper .bubble-multiplier, .payouts-block .bubble-multiplier, .payouts .payout, [class*="payout"] [class*="multiplier"], .result-history .bubble-multiplier');
    return [...els].map(e=>parseFloat((e.textContent||'').replace('x','').replace(',','.'))).filter(v=>v>=1&&v<1000000);
  }
  function send(v){
    fetch(URL,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({game:GAME,value:v})})
      .then(r=>{badge.textContent=r.ok?('TheLord: enviada '+v.toFixed(2)+'x'):'TheLord: erro '+r.status})
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
