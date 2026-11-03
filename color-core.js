(function(root){'use strict';
function classifyRound(v){
  if(v>=1000)return {cls:'fire',color:'#ff5a1a',key:'fire'};
  if(v>=500)return {cls:'hot',color:'#ff1e43',key:'hot'};
  if(v>=100)return {cls:'yellow',color:'#ffc01f',key:'yellow'};
  if(v>=10)return {cls:'pink',color:'#ff2f87',key:'pink'};
  if(v>=2)return {cls:'purple',color:'#8b5cf6',key:'purple'};
  return {cls:'blue',color:'#5aa7ff',key:'blue'};
}
const api={classifyRound};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.TheLordColor=api;
})(typeof globalThis==='object'?globalThis:this);
