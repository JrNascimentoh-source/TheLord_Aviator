# TheLord_Aviator | Gestão & Análise

App de gestão de banca e análise de velas, com sincronização via Supabase e suporte offline parcial por Service Worker quando aberto pelo site publicado. O login, a nuvem e a coleta remota dependem de internet e da configuração do Supabase.

## Estrutura

```
index.html   → estrutura da página (HTML)
style.css    → todo o visual do app (cores, layout, animações)
app.js       → toda a lógica (cálculos, gráfico, relatório, monitor)
```

Antes, tudo isso estava misturado em um único arquivo `.html`. Agora está
separado, então:

- pra mudar uma cor ou espaçamento → mexe só no `style.css`
- pra mudar uma regra de cálculo ou comportamento → mexe só no `app.js`
- pra mudar textos ou estrutura da tela → mexe só no `index.html`

## Como usar

No site publicado, abra a URL do GitHub Pages e mantenha a conexão ativa para login, sincronização e coleta remota. O cache offline é auxiliar: a primeira visita precisa de internet. Abrir `index.html` diretamente como arquivo local não habilita Service Worker nem os recursos de nuvem.

## Organização do app.js

O arquivo está dividido em seções com comentários, nesta ordem:

1. **Storage & modelo de dados** — leitura/escrita (com proteção caso o
   navegador bloqueie o `localStorage`)
2. **Calculadora & gestão de banca** — cenários, tempo de gestão, projeção,
   registro de entradas
3. **Sangria (retiradas)** — saldo disponível, quebra de gerenciamento
4. **Relatório de gerenciamento (PDF)**
5. **Gráfico de evolução da banca**
6. **Visão geral** — resumos, novo mês
7. **Monitor de velas** — Aviator / Aviator 2
8. **Navegação entre abas**
9. **Inicialização**

## Próximos passos possíveis (fora do que dá pra fazer num arquivo local)

Esses itens exigem uma decisão ou conta sua — não são algo que dá pra
resolver só editando o código:

- [ ] **Sincronizar entre aparelhos** — precisa de um banco de dados na
      nuvem (Firebase ou Supabase, ambos têm plano gratuito). Você cria a
      conta, eu escrevo a integração.
- [ ] **Endereço fixo na internet** — hospedar em algo como Vercel ou
      Netlify (grátis), pra acessar de qualquer lugar sem precisar do
      arquivo local.
- [ ] **Reescrever em React** — só compensa se for usar as duas coisas
      acima juntas (banco de dados + hospedagem). Sem isso, o ganho é
      pequeno pra esse tamanho de projeto.

## Testes

Em `core.test.js` há testes simples validando a formatação de
valores em R$ e a matemática da projeção. Pra rodar, precisa ter o
[Node.js](https://nodejs.org) instalado:

```
node core.test.js
```
