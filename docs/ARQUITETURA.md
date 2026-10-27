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
- `coletor.user.js`: coletor separado no navegador; atualmente declara `GAME = 'aviator'`.
- `core.test.js`: testes Node dos núcleos estatísticos e de alguns cálculos auxiliares.

## Dados pessoais versus dados compartilhados

### Gestão privada por usuário

A tabela `public.gestoes` tem chave primária `user_id` e políticas RLS de leitura, inserção e atualização limitadas a `auth.uid() = user_id`. O app usa `pushToCloud()` para enviar o objeto `data` inteiro em JSONB para a linha do usuário.

O objeto local `data` ainda pode conter propriedades legadas como `roundsByGame`, embora a tela do Monitor e a análise atual leiam o histórico compartilhado em memória. Não remover essas propriedades de registros existentes nem alterar a rotina de sincronização pessoal sem testar a compatibilidade com versões anteriores.

### Histórico compartilhado de velas

A tabela `public.velas` já existe, tem RLS habilitado e é a fonte usada pelo app para carregar o histórico compartilhado. O código lê `id, game, value, created_at`, faz paginação inicial, consulta uma janela recente periodicamente e recebe eventos INSERT por Realtime. A política atual de SELECT permite leitura pública. A política de INSERT permite gravar valores dentro dos limites definidos e jogos `aviator` ou `aviator2`.

**Auditoria do banco em 27/10/2026:**
- A tabela tinha 19.581 registros no momento da consulta.
- Todos os registros encontrados eram do jogo `aviator`; não havia registros `aviator2`.
- O coletor versionado no repositório declara `GAME = 'aviator'`, então o segundo jogo não está sendo alimentado por esse coletor atual.
- O arquivo `velas.sql` não reflete exatamente a política de leitura observada no banco: o SQL versionado limita a leitura a 24 horas, mas a política ativa consultada no banco é `USING (true)`. Não executar esse arquivo cegamente em produção; primeiro alinhar e revisar a intenção da política.

A leitura compartilhada entre contas já está implementada para as linhas presentes em `velas`. A lacuna visível é a alimentação do histórico do Aviator 2, não a ausência de uma tabela compartilhada.

## Segurança e próximos passos

1. Não extrair autenticação/sincronização de `app.js` antes de mapear todos os símbolos globais e handlers HTML que elas usam.
2. Preservar `window.doLogin`, `window.doSignUp`, `window.doGoogleLogin`, `window.doPasswordReset` e `window.doLogout`, chamados pela interface.
3. Antes de mudar políticas públicas de `velas`, definir como o coletor será autenticado. O cliente do navegador usa chave pública, que não prova por si só que um INSERT veio do coletor oficial.
4. Confirmar qual URL/tela de origem alimentará `aviator2` antes de alterar o coletor. Não duplicar dados do Aviator nem etiquetar incorretamente rodadas para preencher a tabela.
5. Ao alterar JS/CSS versionado, atualizar a query em `index.html` e a entrada correspondente em `sw.js`; incrementar o nome do cache.
6. Rodar `node core.test.js` quando Node estiver disponível e validar login, sincronização, monitor e minutagem no navegador antes de declarar o comportamento testado.
7. Não remover classes CSS só por parecerem sem uso em busca estática: o app cria classes e conteúdo dinamicamente.

## Cache

O Service Worker deve pré-carregar os mesmos caminhos versionados que aparecem em `index.html`. Se as queries divergirem, a instalação pode guardar uma URL diferente da versão solicitada pela página.
