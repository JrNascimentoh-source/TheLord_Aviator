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

## Serviços e arquivos auxiliares

- `timing-core.js` e `timing.js`: análise e exibição da minutagem.
- `probability-core.js`: cálculos estatísticos do monitor de velas.
- `coletor.user.js`: coletor de resultados para uso no navegador.
- `sw.js` e `manifest.webmanifest`: cache auxiliar e instalação como app.
- `velas.sql`: definição inicial da tabela compartilhada no Supabase.

A sincronização compartilhada de velas usa Supabase. Os dados de gerenciamento
pessoal são mantidos separadamente por conta. Login, sincronização e coleta
remota precisam de conexão e da configuração do serviço.

## Testes

Em `core.test.js` há testes básicos para formatação em R$, projeção matemática
e meta de Stop Win. Eles cobrem apenas essas funções auxiliares, não o app inteiro. Pra rodar, precisa ter o
[Node.js](https://nodejs.org) instalado:

```
node core.test.js
```
