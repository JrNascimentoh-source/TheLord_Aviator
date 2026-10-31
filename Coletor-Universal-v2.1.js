// ==UserScript==
// @name         TheLord Coletor Universal
// @namespace    thelord-aviator
// @version      2.2
// @description  Identifica Aviator e Aviator VIP na BetDoPovo, inclusive dentro do iframe da Spribe
// @match        *://*/*
// @exclude      *://7a7dd.com/*
// @exclude      *://*.7a7dd.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const IS_TOP = window.top === window.self;
  const MSG = 'thelord-coletor-top-url';
  const SELF_URL = location.href;
  let topUrl = IS_TOP ? SELF_URL : '';

  function parseUrl(value) {
    try { return new window.URL(value); } catch (_) { return null; }
  }
  function isBetDoPovoUrl(value) {
    const parsed = parseUrl(value);
    return !!parsed && /(^|\.)betdopovo\./i.test(parsed.hostname);
  }
  function gameFromUrl(value) {
    const parsed = parseUrl(value);
    if (!parsed || !isBetDoPovoUrl(value)) return 'aviator';
    return parsed.searchParams.get('via') === '4' ? 'aviatorvip' : 'aviator2';
  }
  function forwardToFrames(url) {
    for (let i = 0; i < window.frames.length; i++) {
      try { window.frames[i].postMessage({ type: MSG, url: url }, '*'); } catch (_) {}
    }
  }
  window.addEventListener('message', ev => {
    const d = ev.data;
    if (!d || d.type !== MSG || IS_TOP || typeof d.url !== 'string') return;
    topUrl = d.url;
    forwardToFrames(topUrl);
  });
  if (IS_TOP) {
    forwardToFrames(SELF_URL);
    setInterval(() => forwardToFrames(SELF_URL), 1500);
  }

  function resolveGame() {
    return new Promise(resolve => {
      const selfParsed = parseUrl(SELF_URL);
      const selfIsBet = isBetDoPovoUrl(SELF_URL);
      const selfViaVip = !!selfParsed && selfParsed.searchParams.get('via') === '4';
      if (IS_TOP) return resolve(gameFromUrl(SELF_URL));
      if (selfIsBet && selfViaVip) return resolve('aviatorvip');

      const referrer = document.referrer || '';
      const referrerParsed = parseUrl(referrer);
      if (isBetDoPovoUrl(referrer) && referrerParsed && referrerParsed.searchParams.get('via') === '4') return resolve('aviatorvip');
      if (isBetDoPovoUrl(referrer) && !selfIsBet) return resolve('aviator2');

      let betAncestor = false;
      try {
        const anc = location.ancestorOrigins;
        betAncestor = !!(anc && Array.from(anc).some(origin => isBetDoPovoUrl(origin)));
      } catch (_) {}

      const started = Date.now();
      const wait = setInterval(() => {
        if (topUrl) {
          clearInterval(wait);
          resolve(gameFromUrl(topUrl));
        } else if (Date.now() - started > 4000) {
          clearInterval(wait);
          resolve(selfIsBet || betAncestor ? 'aviator2' : 'aviator');
        }
      }, 200);
    });
  }

  resolveGame().then(start);

  function start(GAME) {
  const URL = 'https://aypjaqmmlurlqeotbepp.supabase.co/rest/v1/velas';

  // Chave original da versão 1.3 — mantida exatamente como estava.
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGphcW1tbHVybHFlb3RiZXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDU2MTAsImV4cCI6MjEwNTg4MTYxMH0.IeAT6gwsAfzfw2N4BIxg9gc5pRqZH0ELn3Xo9fogHnY';

  const GAME_LABEL = GAME === 'aviatorvip' ? 'Aviator VIP' : 'Aviator';
  const QUEUE_KEY = 'thelord_universal_pending_v1_' + GAME;
  const SIG_KEY = 'thelord_universal_signature_v1_' + GAME;
  const RELOAD_KEY = 'thelord_universal_reload_v1_' + GAME;
  const RELOAD_MS = 5 * 60 * 1000;
  const host = location.hostname;
  const isTop = IS_TOP;

  function parseMultiplier(text) {
    let raw = String(text || '')
      .trim()
      .replace(/[x×]$/i, '')
      .replace(/\s/g, '');

    if (!/^\d[\d.,]*$/.test(raw)) return NaN;

    const dot = raw.lastIndexOf('.');
    const comma = raw.lastIndexOf(',');

    if (dot >= 0 && comma >= 0) {
      const decimal = dot > comma ? '.' : ',';
      raw = raw
        .split(decimal === '.' ? ',' : '.').join('')
        .replace(decimal, '.');
    } else if (comma >= 0) {
      raw = /^\d{1,3}(,\d{3})+$/.test(raw)
        ? raw.replace(/,/g, '')
        : raw.replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      raw = raw.replace(/\./g, '');
    }

    return Number(raw);
  }

  const badge = document.createElement('div');
  badge.style.cssText =
    'position:fixed;bottom:4px;left:4px;z-index:2147483647;' +
    'background:#000c;color:#ffc72c;font:11px sans-serif;' +
    'padding:3px 6px;border-radius:6px;pointer-events:none';

  badge.textContent = 'TheLord [' + GAME_LABEL + ']: aguardando velas';

  function showBadge() {
    if (document.body && !document.body.contains(badge)) {
      document.body.appendChild(badge);
    }
  }

  if (isTop) {
    showBadge();
    setInterval(showBadge, 2000);
  }

  function read() {
    let els = [
      ...document.querySelectorAll(
        '.payouts-block .payout, ' +
        'app-stats-widget .payout, ' +
        '.payouts-wrapper .bubble-multiplier, ' +
        '.payouts-block .bubble-multiplier, ' +
        '.payouts .payout, ' +
        'app-bubble-multiplier, ' +
        '[class*="payout"] [class*="multiplier"], ' +
        '.result-history .bubble-multiplier'
      )
    ];

    if (!els.length) {
      const candidates = [
        ...document.querySelectorAll('div,span')
      ].filter(e =>
        e.children.length === 0 &&
        /^\s*\d[\d.,\s]*[x×]\s*$/i.test(e.textContent || '') &&
        Number.isFinite(parseMultiplier(e.textContent))
      );

      if (candidates.length >= 3) {
        const top = Math.min(
          ...candidates.map(e => e.getBoundingClientRect().top)
        );

        els = candidates
          .filter(e => Math.abs(e.getBoundingClientRect().top - top) < 6)
          .sort((a, b) =>
            a.getBoundingClientRect().left -
            b.getBoundingClientRect().left
          );
      }
    }

    return els
      .map(e => parseMultiplier(e.textContent))
      .filter(v => Number.isFinite(v) && v >= 1 && v < 1000000);
  }

  function getQueue() {
    try {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(q) ? q : [];
    } catch (_) {
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (_) {
      badge.textContent = 'TheLord: erro ao salvar pendências';
      return false;
    }
  }

  function enqueue(value) {
    const queue = getQueue();

    queue.push({
      value,
      time: new Date().toISOString()
    });
    if (saveQueue(queue)) {
      badge.textContent = 'TheLord: pendente ' + value + 'x';
      sendNext();
    }
  }

  let sending = false;

  async function sendNext() {
    if (sending) return;

    let queue = getQueue();
    if (!queue.length) return;

    sending = true;

    while (queue.length) {
      const item = queue[0];

      try {
        const response = await fetch(URL, {
          method: 'POST',
          headers: {
            apikey: KEY,
            Authorization: 'Bearer ' + KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({
            game: GAME,
            value: item.value,
            // Preserva o horário em que a rodada foi detectada, inclusive após ficar offline.
            created_at: item.time || new Date().toISOString()
          })
        });

        if (!response.ok) {
          badge.textContent = 'TheLord: erro HTTP ' + response.status;
          break;
        }

        // Remove a pendência somente depois de uma resposta de sucesso.
        queue.shift();
        saveQueue(queue);

        badge.textContent =
          'TheLord: enviada ' +
          Number(item.value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) + 'x';

      } catch (_) {
        badge.textContent = 'TheLord: sem internet; pendente salva';
        break;
      }

      queue = getQueue();
    }

    sending = false;
  }

  function setupReload() {
    try {
      const now = Date.now();
      let nextReload = Number(localStorage.getItem(RELOAD_KEY));

      if (!Number.isFinite(nextReload) || nextReload <= now) {
        nextReload = now + RELOAD_MS;
        localStorage.setItem(RELOAD_KEY, String(nextReload));
      }

      const delay = Math.max(1000, nextReload - now);

      setTimeout(() => {
        try {
          localStorage.setItem(RELOAD_KEY, String(Date.now() + RELOAD_MS));
        } catch (_) {}

        location.reload();
      }, delay);

      badge.textContent = 'TheLord [' + GAME_LABEL + ']: ativo; recarga em até 5 min';
    } catch (_) {
      badge.textContent = 'TheLord: armazenamento indisponível';
    }
  }

  let lastSig = null;

  try {
    lastSig = localStorage.getItem(SIG_KEY) || null;
  } catch (_) {}

  // Exige três leituras consecutivas iguais antes de aceitar uma nova assinatura.
  // Isso reduz falsos positivos causados por atualizações transitórias do DOM.
  let observedSig = null;
  let observedCount = 0;

  // Tenta enviar registros que ficaram pendentes após falhas anteriores.
  sendNext();

  setInterval(() => {
    const vals = read();
    if (!vals.length) return;

    showBadge();

    const sig = vals.slice(0, 8).join('|');

    if (sig === observedSig) {
      observedCount++;
    } else {
      observedSig = sig;
      observedCount = 1;
    }

    // A primeira leitura estável serve apenas como referência inicial.
    if (lastSig === null) {
      if (observedCount < 3) return;

      lastSig = sig;
      try {
        localStorage.setItem(SIG_KEY, sig);
      } catch (_) {}

      badge.textContent = 'TheLord Coletor Universal [' + GAME + '] (' + host + ')';
      return;
    }

    // Só registra mudança depois de três leituras seguidas com a mesma assinatura.
    if (sig !== lastSig && observedCount >= 3) {
      lastSig = sig;

      try {
        localStorage.setItem(SIG_KEY, sig);
      } catch (_) {}

      enqueue(vals[0]);
    }
  }, 1000);

  setupReload();
  }
})();
