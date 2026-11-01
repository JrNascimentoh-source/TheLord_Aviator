# Arquitetura — TheLord_Aviator

Este documento descreve a estrutura observada no repositório. É uma referência de manutenção, não substitui testes no navegador nem uma auditoria do projeto Supabase em tempo real.

## Ordem de carregamento

Os scripts locais são carregados com `defer` em `index.html`, nesta ordem:

1. `timing-core.js` — regras puras de minutagem, período e contagem de sequência; publica `TheLordTiming`.
2. `probability-core.js` — cálculos estatísticos do monitor; publica `TheLordProbability`.
3. `app.js` — estado principal, gestão de banca, autenticação, monitor e integração Supabase.
4. `timing.js` — interface da aba Minutagem; utiliza `TheLordTiming` e dados/globais disponibilizados por `app.js`.

A biblioteca `@supabase/supabase-js` é carregada pelo CDN antes dos scripts locais. O Service Worker é registrado por código inline no HTML.

## Responsabilidades

- `index.html`: estrutura e handlers declarados diretamente na interface.
- `style.css`: estilos gerais e mobile.
- `desktop.css`: ajustes de desktop.
- `app.js`: gestão de banca, armazenamento local, autenticação, sincronização pessoal, leitura do histórico compartilhado e monitor.
- `timing-core.js`: análise de períodos, agrupamentos e sequência.
- `timing.js`: filtros, gráfico e detalhes da aba Minutagem.
- `probability-core.js`: frequências e comparações estatísticas descritivas. Os resultados não garantem nem preveem a próxima rodada.
- `sw.js`: cache dos recursos locais para suporte offline parcial.
- `core.test.js`: testes Node dos módulos estatísticos e de cálculos básicos.

## Fluxo de dados

### Gestão pessoal

A gestão é armazenada localmente e sincronizada por usuário com `public.gestoes`. O objeto de gestão contém dados de banca e registros pessoais. Preserve o formato legado e a separação por usuário ao alterar armazenamento, autenticação ou sincronização.

### Histórico compartilhado

O monitor e a minutagem leem o histórico da tabela `public.velas`. As chaves usadas pelo app são:

- `aviator`: Aviator 7a7.
- `aviator2`: Aviator BdPv / BetDoPovo.
- `betdopovo`: chave histórica aceita na leitura e normalizada para `aviator2`.

O coletor universal `Coletor-Universal-v2.1.js` (metadados internos 2.2) identifica a plataforma e envia as velas diretamente ao Supabase. Não existe dependência operacional do TheLord CaptureCore neste fluxo.

Os arquivos `coletor.user.js` e `coletor-aviator2.user.js` são alternativas legadas por plataforma. Não devem ser executados em paralelo com o universal na mesma origem, para evitar duplicidade.

## Compatibilidade e segurança

1. Não remover propriedades antigas de `data` nem mudar a rotina de sincronização pessoal sem verificar dados já existentes.
2. Preservar os handlers globais usados pelo HTML, especialmente autenticação e ações da calculadora.
3. A chave pública Supabase no navegador não substitui políticas RLS. As políticas e permissões efetivas devem ser verificadas no projeto Supabase antes de qualquer mudança.
4. `velas.sql` é um script de criação inicial; não deve ser tratado como espelho garantido do esquema e das políticas atualmente aplicados em produção.
5. Não remover classes CSS apenas por parecerem ausentes em busca textual: a interface também cria elementos e classes dinamicamente.

## Cache e publicação

O `APP_SHELL` em `sw.js` deve usar exatamente as mesmas URLs versionadas de CSS e JavaScript que aparecem em `index.html`. Ao alterar esses recursos, atualize as duas referências e incremente `CACHE_NAME` para que os clientes instalados recebam a versão nova.
