# Mapa de arquitetura — TheLord Aviator

Este documento registra as dependências observadas no código e na configuração atual do Supabase para orientar refatorações seguras. É uma auditoria estática; não substitui testes no navegador.

## Ordem de carregamento

Em `index.html`, os scripts locais são carregados com `defer`, nesta ordem:

1. `timing-core.js` — funções puras de minutagem, período e rótulos de sequência; publica `TheLordTiming`.
2. `probability-core.js` — cálculos estatísticos e probabilísticos; publica `TheLordProbability`.
3. `app.js` — estado principal, interface, gestão de banca, monitor, navegação, autenticação e integração Supabase.
4. `timing.js` — interface da aba Minutagem; depende de `TheLordTiming` e de globais fornecidas por `app.js`, como `currentRounds`, `data` e `nowTimeStr`.

Scripts inline posteriores em `index.html` registram o Service Worker, alternam login/cadastro e protegem o botão de login caso o código principal falhe.

## Responsabilidades

- `index.html`: estrutura, scripts e alguns handlers inline de autenticação.
- `app.js`: arquivo central; mantém gestão de banca, monitor, navegação, autenticação, sincronização pessoal e sincronização do histórico compartilhado.
- `timing-core.js`: regras reutilizáveis da minutagem e sequência.
- `timing.js`: renderização da aba Minutagem.
- `probability-core.js`: análise estatística do histórico; resultados são descritivos e não garantem nem preveem a próxima rodada.
- `sw.js`: cache de arquivos locais para suporte offline parcial.
- `Coletor-Universal-v2.1.js`: coletor no navegador; identifica 7a7 como `aviator`, BetDoPovo comum como `aviator2` e BetDoPovo com `via=4` como `aviatorvip`. A identificação da URL principal é propagada aos iframes para preservar o parâmetro VIP. A fila local mantém o horário de detecção e envia `created_at` junto da rodada; esse horário é o de detecção pelo coletor, não um horário oficial do servidor do jogo.
- `core.test.js`: testes Node dos núcleos estatísticos e de alguns cálculos auxiliares.

## Dados pessoais versus dados compartilhados

### Gestão privada por usuário

A tabela `public.gestoes` tem chave primária `user_id` e políticas RLS de leitura, inserção e atualização limitadas a `auth.uid() = user_id`. O app usa `pushToCloud()` para enviar o objeto `data` inteiro em JSONB para a linha do usuário.

O objeto local `data` ainda pode conter propriedades legadas como `roundsByGame`, embora a tela do Monitor e a análise atual leiam o histórico compartilhado em memória. Não remover essas propriedades de registros existentes nem alterar a rotina de sincronização pessoal sem testar a compatibilidade com versões anteriores.

### Histórico compartilhado de velas

A tabela `public.velas` já existe, tem RLS habilitado e é a fonte usada pelo app para carregar o histórico compartilhado. O código lê `id, game, value, created_at`, faz paginação inicial, consulta uma janela recente periodicamente e recebe eventos INSERT por Realtime. A política de SELECT permite leitura pública. A política de INSERT permite gravar valores dentro dos limites definidos e jogos `aviator`, `aviator2` e `aviatorvip`.

**Auditoria do banco em 31/10/2026:**
- Histórico `aviator` (7a7): 29.742 registros.
- Histórico `aviator2` (BetDoPovo Aviator): 10.696 registros existentes, preservados sem renomear a chave interna.
- Histórico `aviatorvip` (BetDoPovo VIP): sem registros no momento da consulta; a nova identificação já está prevista no coletor e na leitura compartilhada.
- A policy de SELECT permanece `USING (true)` para manter a leitura compartilhada. A policy de INSERT foi atualizada para aceitar os três identificadores.

Mapeamento: 7a7 → `aviator`; BetDoPovo Aviator → `aviator2` (exibido como “Aviator”); BetDoPovo Aviator VIP (`?via=4`) → `aviatorvip`. O status visual de cada coletor usa a data da última vela daquele jogo (janela de 120 segundos), não um heartbeat independente.

## Segurança e próximos passos

1. Não extrair autenticação/sincronização de `app.js` antes de mapear todos os símbolos globais e handlers HTML que elas usam.
2. Preservar `window.doLogin`, `window.doSignUp`, `window.doGoogleLogin`, `window.doPasswordReset` e `window.doLogout`, chamados pela interface.
3. A gravação continua usando a chave pública no navegador; a policy de INSERT valida jogo e faixa de valores, mas não prova criptograficamente que a linha veio do coletor oficial.
4. A origem VIP confirmada é `https://betdopovo.co/game/spribe/aviator?via=4`; manter a query `via=4` na identificação até os iframes para não misturar os dois históricos.
5. Ao alterar JS/CSS versionado, atualizar a query em `index.html` e a entrada correspondente em `sw.js`; incrementar o nome do cache.
6. Rodar `node core.test.js` quando Node estiver disponível e validar login, sincronização, monitor e minutagem no navegador antes de declarar o comportamento testado.
7. Não remover classes CSS só por parecerem sem uso em busca estática: o app cria classes e conteúdo dinamicamente.

## Cache

O Service Worker deve pré-carregar os mesmos caminhos versionados que aparecem em `index.html`. Se as queries divergirem, a instalação pode guardar uma URL diferente da versão solicitada pela página.
