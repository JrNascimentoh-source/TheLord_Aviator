# TheLord_Aviator â€” Estrutura Oficial Web + PWA

## Etapa 1 â€” Web

- `index.html` Ã© a aplicaÃ§Ã£o oficial para publicaÃ§Ã£o.
- Pode ser hospedado em GitHub Pages, Netlify, Vercel ou outra hospedagem estÃ¡tica.
- Cada aluno usa os prÃ³prios dados no armazenamento local do navegador.

## Etapa 2 â€” PWA

- `manifest.webmanifest` define nome, Ã­cone, tela inicial e modo standalone.
- `sw.js` permite cache/offline do app shell.
- `icons/` contÃ©m os Ã­cones de instalaÃ§Ã£o.

### Importante

A instalaÃ§Ã£o PWA exige que o projeto seja servido por HTTPS (ou localhost durante testes).

## Estrutura

```
index.html
manifest.webmanifest
sw.js
icons/icon-192.png
icons/icon-512.png
```

A Calculadora e a VisÃ£o Geral permanecem na versÃ£o oficial congelada; Monitor de Velas e Minutagem continuam em desenvolvimento.
