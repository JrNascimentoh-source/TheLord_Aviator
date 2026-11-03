(function(root){'use strict';
function money(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function pct(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';}
function formatMultiplier(v){return Number.isFinite(Number(v))?new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v))+'x':'—';}
const api={money,pct,formatMultiplier};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.TheLordFormat=api;
})(typeof globalThis==='object'?globalThis:this);
