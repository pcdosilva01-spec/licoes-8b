# Project TODO

- [x] Implementar autenticação via Manus OAuth com sessão segura.
- [x] Garantir cookies de sessão com HttpOnly, Secure e SameSite apropriado.
- [x] Criar entidades de turma, membros, convites, lições, anexos e auditoria.
- [x] Implementar convite privado por link com token aleatório armazenado como hash.
- [x] Implementar expiração e revogação de convites.
- [x] Implementar papéis member e admin por turma.
- [x] Implementar autorização por objeto filtrando sempre pelo class_id da sessão.
- [x] Implementar CRUD completo de lições em português brasileiro.
- [x] Calcular expires_at exclusivamente no servidor como lesson_date + 10 dias.
- [x] Filtrar lições expiradas em todas as consultas.
- [x] Implementar upload de PDF com validação real, limite de 10 MB e storage key aleatória.
- [x] Implementar armazenamento privado no S3 e URLs temporárias para download autenticado.
- [x] Implementar exclusão idempotente de lições expiradas e anexos.
- [x] Implementar job periódico protegido para limpeza automática.
- [x] Construir painel responsivo de lições com busca por matéria e data.
- [x] Exibir dias restantes e destacar lições próximas de expirar.
- [x] Traduzir toda a interface para português brasileiro.
- [x] Criar template de ambiente sem valores reais em `env.template` (a plataforma bloqueia `.env.example` diretamente).
- [x] Fortalecer .gitignore para bloquear .env e arquivos de credenciais.
- [x] Validar variáveis obrigatórias na inicialização sem imprimir segredos.
- [x] Criar push-github.bat interativo sem incluir .env no commit ou push.
- [x] Criar testes de cálculo de expiração, autorização, convite, upload e limpeza.
- [x] Atualizar README com instalação, configuração, segurança e GitHub.
- [x] Verificar visual em desktop e mobile.
- [x] Executar typecheck, testes e build.
- [x] [Histórico] Entregar ZIP do projeto completo ao usuário.

## Pendências de entrega identificadas na revisão

- [x] Substituir a checagem básica de PDF por validação adicional de estrutura/conteúdo no backend.
- [x] Documentar a estratégia de storage: a aplicação remove anexos do banco e bloqueia imediatamente o acesso; o helper S3 fornecido não expõe exclusão física, que requer configuração adicional do provedor.
- [x] Preparar o endpoint protegido e o script `scripts/create-heartbeat.sh`; a criação efetiva deve ser executada após a publicação, conforme requisito da plataforma.
- [x] Entregar `env.template` sem valores reais como alternativa segura; a plataforma bloqueia `.env.example` diretamente e o README explica a cópia local para `.env`.
- [x] Adicionar testes específicos de convite, upload e autorização por turma; testes de integração com banco permanecem recomendados para ambiente configurado.
- [x] Gerar e anexar o ZIP final do projeto.

## Alteração solicitada — sala única 8º B e Windows

- [x] Restringir o produto a uma única turma fixa chamada 8º B.
- [x] Impedir criação de outras turmas e remover fluxo genérico de criação de sala.
- [x] Atualizar convites, lições, PDFs, membros e textos para a sala exclusiva 8º B.
- [x] Corrigir os scripts `dev` e `start` com `cross-env` para Windows, macOS e Linux.
- [x] Atualizar README e instruções de execução no Windows.
- [x] Adicionar teste para a turma fixa 8º B e validar os scripts cross-platform no `package.json`.
- [x] Gerar nova build e ZIP atualizado.

## Ajuste visual solicitado — identidade própria do 8º B

- [x] Remover aparência genérica de design de IA, incluindo gradientes, excesso de cards e linguagem artificial.
- [x] Criar identidade visual escolar própria e simples para o 8º B.
- [x] Atualizar navegação, cabeçalhos, estados vazios e textos para refletir a sala exclusiva 8º B.
- [x] Verificar a nova interface em desktop e mobile.
- [x] Executar testes e preparar checkpoint da atualização visual.

## Correção de instalação no Windows

- [x] Documentar que `npm install` ou `pnpm install` é obrigatório antes de `npm run dev`.
- [x] Tornar o comando de desenvolvimento nativo em Node, sem dependência de `cross-env`.
- [x] Adicionar `instalar-e-iniciar.bat` com verificações de Node/npm e instalação de dependências.
- [x] Validar o launcher com `npm run dev`, além de typecheck, testes e build.
- [x] Gerar novo ZIP corrigido.

## Correção npm e Node 24 no Windows

- [x] Remover `@builder.io/vite-plugin-jsx-loc` e corrigir o conflito de peer dependency com Vite 7.
- [x] Corrigir o launcher `scripts/dev.mjs` para evitar `spawn EINVAL` no Windows com Node 24.
- [x] Atualizar o instalador e o README com o comando npm compatível.
- [x] Validar instalação npm em pasta limpa, `npm run dev`, testes e build.
- [x] Gerar novo ZIP corrigido.

## Ajustes solicitados no anexo

- [x] Explicar e facilitar a configuração das variáveis obrigatórias antes de iniciar o servidor local.
- [x] Remover o alerta de shell inseguro do launcher de desenvolvimento no Windows.
- [x] Criar onboarding obrigatório pedindo nome antes de acessar o caderno.
- [x] Impedir que a interface trate usuário sem nome como estado normal.
- [x] Substituir a busca livre por matéria por uma lista de matérias selecionável.
- [x] Adicionar filtro temporal de uma semana atrás.
- [x] Adicionar opção explícita para visualizar lições expiradas.
- [x] Ajustar backend para listar lições expiradas somente quando solicitado.
- [x] Adicionar testes de onboarding, matérias e filtros temporais.
- [x] Validar, gerar e anexar novo ZIP.

## Migração solicitada — conta local por nome

- [x] Remover o fluxo visível de “Entrar com Manus”.
- [x] Implementar cadastro local simples informando nome.
- [x] Criar sessão local segura por cookie HttpOnly para o usuário local.
- [x] Garantir que o nome local apareça como autor das lições por join backend com `users.name` e exibição no cartão.
- [x] Associar automaticamente toda conta local à turma fixa 8º B no cadastro, permitindo criar, editar e excluir lições conforme o vínculo.
- [x] Remover a exigência de OAUTH_SERVER_URL e demais credenciais Manus no modo local.
- [x] Evitar erros de analytics com placeholders `%VITE_ANALYTICS_*%` sem configuração.
- [x] Adicionar testes de cadastro, sessão local, associação ao 8º B e autoria nominal.
- [x] Validar typecheck, 27 testes, build e preparar novo ZIP após a migração local.

## Migração para produção sem computador local

- [x] Adaptar o backend para exportar Express como Vercel Function em `api/index.ts`; verificação de importação concluída sem OAuth.
- [x] Criar configuração `vercel.json` para API, frontend, rewrites e Cron.
- [x] Escolher e documentar banco MySQL gerenciado compatível com Drizzle, como PlanetScale ou TiDB Cloud.
- [x] Documentar aplicação do schema de produção com `npm run db:push`.
- [x] Configurar storage privado S3 com upload, URLs pré-assinadas e exclusão de objetos.
- [x] Documentar variáveis Production/Preview e atualizar `env.template` com banco, S3 e Cron sem valores reais.
- [x] Configurar Vercel Cron diário com `CRON_SECRET` no endpoint protegido.
- [x] Atualizar README com arquitetura e deploy na Vercel.
- [x] Validar build, entrypoint `api/index.ts`, 27 testes e gerar novo ZIP compatível com Vercel.

## Push GitHub solicitado

- [x] Configurar `push-github.bat` com o repositório `https://github.com/pcdosilva01-spec/licoes-8b`.
- [x] Usar o branch `master` e push forçado explícito.
- [x] Bloquear o push se qualquer arquivo `.env` aparecer no stage.
- [x] Validar referências do BAT e documentar o uso do script.

## Bug reportado — erro 500 na Vercel

- [x] Corrigir erro 500 das rotas `auth.me` e `auth.register` na Vercel quando a Function falha por validação prematura de variáveis de storage.
- [x] Validar autenticação local em produção com configuração mínima e manter erro explícito apenas nas operações de PDF quando S3 estiver incompleto.
- [x] Executar testes, typecheck, build e preparar novo ZIP/checkpoint da correção Vercel.

## Cobertura adicional da correção Vercel

- [x] Adicionar teste de regressão para boot de produção sem variáveis AWS.
- [x] Adicionar teste para erro explícito de S3 apenas no uso de PDF.
- [x] Regenerar ZIP e salvar checkpoint após os testes adicionais.

## Correção confirmada pelos logs da Vercel

- [x] Empacotar a Function Vercel em um bundle ESM autocontido para eliminar `ERR_MODULE_NOT_FOUND` de imports internos sem extensão.
- [x] Atualizar `vercel.json` e scripts de build para usar o entrypoint empacotado.
- [x] Validar bundle, testes, build e regenerar ZIP/checkpoint.

## Conflito de entrypoints reportado pela Vercel

- [x] Remover o conflito entre `api/index.js` e `api/index.ts`, mantendo um único arquivo de Function no diretório `api`.
- [x] Ajustar build e `vercel.json` para o entrypoint único e documentar o fluxo.
- [x] Validar deploy local, testes, ZIP e checkpoint da correção.
