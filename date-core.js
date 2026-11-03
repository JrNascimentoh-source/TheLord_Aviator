(function(root){
'use strict';
function period(hour){
  return hour>=5&&hour<12?'Manhã':hour>=12&&hour<18?'Tarde':'Noite';
}
function startOfWeek(d){
  const x=new Date(d);
  const day=x.getDay();
  const diff=(day===0?-6:1-day);
  x.setDate(x.getDate()+diff);
  x.setHours(0,0,0,0);
  return x;
}
function parseBRDate(s){
  const[dd,mm,yy]=s.split('/');
  return new Date(+yy,+mm-1,+dd);
}
function nowTimeStr(d){
  d=d||new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');
}
const api={period,startOfWeek,parseBRDate,nowTimeStr};
if(typeof module==='object'&&module.exports) module.exports=api;
else root.TheLordDate=api;
})(typeof globalThis==='object'?globalThis:this);
