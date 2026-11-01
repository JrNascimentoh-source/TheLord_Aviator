# TheLord_Aviator | Gestão & Análise

Aplicativo de gestão de banca e análise do histórico de velas, com autenticação e sincronização pelo Supabase. O Service Worker oferece cache auxiliar para a versão publicada no GitHub Pages; login, sincronização e coleta remota precisam de internet.

## Arquivos principais

- `index.html`: estrutura da interface e ordem de carregamento dos scripts.
- `style.css` e `desktop.css`: estilos mobile e desktop.
- `app.js`: gestão de banca, autenticação, monitor e sincronização.
- `timing-core.js` e `timing.js`: regras e interface da aba Minutagem.
- `probability-core.js`: cálculos estatísticos usados pelo monitor.
- `sw.js` e `manifest.webmanifest`: cache auxiliar e instalação como app.
- `core.test.js`: testes automatizados dos módulos puros e de cálculos básicos.

## Coletores

- **`Coletor-Universal-v2.1.js`**: coletor universal (metadados internos na versão 2.2), que identifica a plataforma e envia os resultados para a tabela compartilhada `public.velas`. É o arquivo universal mantido como referência principal.
- `coletor.user.js`: coletor legado específico do Aviator 7a7.
- `coletor-aviator2.user.js`: coletor legado específico do Aviator 2 / BetDoPovo.

Os dois coletores específicos foram mantidos como alternativas históricas; não os instale junto com o coletor universal para a mesma origem, pois isso pode duplicar envios.

## Dados

- O histórico de velas é compartilhado pela tabela `public.velas`.
- Os dados de gestão pessoal são sincronizados por conta na tabela `public.gestoes`.
- `velas.sql` documenta a criação inicial da tabela de velas. Antes de executar novamente qualquer SQL em produção, confira o esquema e as políticas atuais do projeto Supabase.

O aplicativo principal não depende do TheLord CaptureCore para receber velas: o coletor universal deste repositório grava diretamente no Supabase.

## Desenvolvimento e testes

Requer Node.js 22 ou compatível. Execute:

```bash
node core.test.js
node --check app.js
node --check timing.js
node --check probability-core.js
node --check timing-core.js
node --check Coletor-Universal-v2.1.js
node --check coletor.user.js
node --check coletor-aviator2.user.js
```

O teste automatizado cobre os módulos estatísticos e alguns cálculos auxiliares. A validação completa ainda exige testar login, sincronização, monitor e minutagem no navegador.

## Regras de manutenção

1. Preserve as chaves e a compatibilidade dos dados já salvos no navegador e no Supabase.
2. Não altere políticas RLS, autenticação ou tabelas sem revisar o fluxo completo.
3. Ao versionar CSS ou JavaScript, mantenha as URLs de `index.html` e do `APP_SHELL` em `sw.js` sincronizadas e incremente o nome do cache.
4. Não remova estilos dinâmicos apenas com base em busca textual: parte da interface é montada por JavaScript.
