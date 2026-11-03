// Helpers puros para identificar origem e rótulo das plataformas.
(function(root){
  function normalizeSharedGameKey(value){
    const game=String(value||'').trim().toLowerCase();
    // Compatibilidade com a chave histórica usada pelo Coletor Universal.
    return game==='betdopovo'?'aviator2':game;
  }
  function collectorGameDisplayName(game){
    if(game==='aviator2')return 'Aviator BdPv';
    return 'Aviator 7a7';
  }
  const api={normalizeSharedGameKey,collectorGameDisplayName};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TheLordGame=api;
})(typeof globalThis==='object'?globalThis:this);
