# TheLord_Aviator | Gestão & Análise

App pessoal de gestão de banca — funciona 100% offline, sem servidor.

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

Os três arquivos precisam ficar **na mesma pasta**. Dê duplo clique no
`index.html` pra abrir no navegador — funciona exatamente como o arquivo
único de antes, sem precisar de internet nem instalar nada.

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

Em `tests/core.test.js` tem um exemplo simples validando a formatação de
valores em R$ e a matemática da projeção. Pra rodar, precisa ter o
[Node.js](https://nodejs.org) instalado:

```
node tests/core.test.js
```
