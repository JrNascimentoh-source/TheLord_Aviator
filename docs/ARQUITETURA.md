# Mapa de arquitetura — TheLord Aviator

Este documento registra as dependências observadas no código atual para orientar refatorações seguras. Ele descreve o estado do repositório, não substitui testes no navegador.

## Ordem de carregamento

Em `index.html`, os scripts locais são carregados com `defer`, nesta ordem:

1. `timing-core.js` — funções puras de minutagem, período e rótulos de sequência; publica `TheLordTiming`.
2. `probability-core.js` — cálculos estatísticos e probabilísticos; publica `TheLordProbability`.
3. `app.js` — estado principal, interface, gestão de banca, monitor, navegação, autenticação e sincronização Supabase.
4. `timing.js` — interface da aba Minutagem; depende de `TheLordTiming` e de globais fornecidas por `app.js`, como `currentRounds`, `data` e `nowTimeStr`.

Os scripts inline posteriores em `index.html` tratam do registro do Service Worker, da alternância entre login/cadastro e de uma proteção para falhas no carregamento do login.

## Responsabilidades atuais

- `index.html`: estrutura, marcação, scripts e alguns comportamentos inline de autenticação.
- `app.js`: arquivo central; mantém dados locais, calculadora/gestão, monitor de velas, telas, login e integração com Supabase.
- `timing-core.js`: regras reutilizáveis de análise da minutagem e sequência.
- `timing.js`: renderização da aba Minutagem; chama o núcleo e usa funções/globais do app.
- `probability-core.js`: análise estatística do histórico e estimativas descritivas experimentais.
- `sw.js`: cache de arquivos locais para suporte offline parcial.
- `coletor.user.js`: coletor executado separadamente no navegador.
- `core.test.js`: testes Node dos núcleos estatísticos e de alguns cálculos auxiliares.

## Fronteiras de dados a preservar

O estado `data` do `app.js` reúne informações pessoais de gestão (banca, entradas, retiradas e metas) e também histórico de rodadas (`roundsByGame`). A rotina `pushToCloud()` grava o objeto `data` inteiro na linha do usuário da tabela `gestoes`.

Isso significa que o histórico de velas ainda está estruturalmente misturado ao registro pessoal sincronizado por usuário. Não mover nem apagar `roundsByGame`, nem alterar as políticas de sincronização, sem planejar a migração e confirmar o esquema/políticas atuais do Supabase. Para que o gráfico/minutagem sejam realmente compartilhados entre contas, a fonte compartilhada deve ser definida explicitamente e separada dos dados privados de gestão.

## Regras para próximas refatorações

1. Não extrair autenticação/sincronização de `app.js` antes de mapear todos os símbolos globais e handlers HTML que elas usam.
2. Preservar `window.doLogin`, `window.doSignUp`, `window.doGoogleLogin`, `window.doPasswordReset` e `window.doLogout`, chamados pela interface.
3. Ao alterar um arquivo JS/CSS versionado, atualizar a query em `index.html` e a entrada correspondente em `sw.js`; incrementar o nome do cache para invalidar caches antigos.
4. Rodar `node core.test.js` quando Node estiver disponível e validar login, sincronização, monitor e minutagem no navegador antes de declarar o comportamento testado.
5. Não remover classes CSS só por parecerem sem uso em busca estática: o app cria classes e conteúdo dinamicamente.

## Cache corrigido

O Service Worker deve pré-carregar o mesmo caminho versionado de `app.js` que aparece em `index.html`. Se as queries divergirem, a instalação pode guardar uma URL diferente da versão que a página solicita. A versão atual alinha essa entrada e incrementa o nome do cache.
