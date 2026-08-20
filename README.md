# Lições da Turma

Plataforma web privada exclusiva para a turma **8º B**, criada para registrar e compartilhar lições em português brasileiro. O sistema não permite criar outras salas. O projeto usa React, Tailwind, Express, tRPC e Drizzle, com autenticação local por nome.

## O que está implementado

A aplicação possui cadastro local por nome com cookie HttpOnly assinado, uma única turma fixa chamada 8º B, convite por link com token armazenado como hash, papéis de membro e administrador, CRUD de lições, cálculo de expiração no servidor (`lesson_date + 10 dias`), seleção de matéria e período, destaque de prazo, upload de PDF de até 10 MB, storage privado com URL assinada temporária, gerenciamento de membros e endpoint periódico protegido para limpeza. Não há login Manus nem redirecionamento OAuth.

Ao abrir o site, o aluno cria uma conta local informando o nome completo; esse nome aparece como autor das lições. Qualquer membro autenticado do 8º B pode criar, editar e excluir lições. O painel oferece uma lista fechada de matérias e os períodos `Lições ativas`, `Última semana`, `Todas as lições` e `Lições expiradas`.

A autorização é feita no backend. Cada consulta de lição exige sessão autenticada, vínculo ativo e `classId` correspondente à turma do usuário. O cliente não pode definir `createdBy`, `updatedBy`, `classId` de autoridade ou `expiresAt`.

## Desenvolvimento local

Instale Node.js 22 ou superior. O projeto usa npm por padrão no Windows; pnpm também é suportado. Antes de executar o servidor, é obrigatório instalar as dependências. Copie `env.template` para um arquivo local chamado `.env` e preencha `DATABASE_URL` para persistir contas, turma e lições. Defina também um `JWT_SECRET` longo quando publicar; em desenvolvimento ele pode ficar vazio para a sessão local funcionar. O arquivo `.env` nunca deve ser commitado. A plataforma bloqueia a criação de arquivos de ambiente reais por segurança; por isso, o repositório inclui `env.template` como modelo sem valores, que pode ser renomeado localmente.

No Prompt de Comando do Windows, execute. O `npm install` é obrigatório em uma cópia nova do projeto; sem ele, comandos como `tsx` não estarão disponíveis.

```text
Se aparecer erro de configuração incompleta, copie `env.template` para `.env` e preencha as variáveis do ambiente Manus. Em desenvolvimento, o servidor pode iniciar em modo limitado para permitir verificar a interface; autenticação, banco e uploads exigem as variáveis corretas. Se aparecer ERESOLVE relacionado a `@builder.io/vite-plugin-jsx-loc`, você está usando uma versão antiga do pacote. Baixe o ZIP mais recente: essa dependência foi removida porque não era compatível com Vite 7.
```

No Prompt de Comando do Windows, execute:

```bat
npm install
npm run dev
```

Ou execute `instalar-e-iniciar.bat`, que verifica Node/npm, instala as dependências e inicia o servidor. Os scripts `dev` e `start` usam launchers Node nativos; não dependem de `cross-env` nem de sintaxe `NODE_ENV=development` do shell Unix. A sequência completa foi validada em instalação npm limpa, incluindo Node 24.

Para verificar o projeto:

```bash
pnpm check
pnpm test
pnpm build
```

Na versão local, o servidor valida `DATABASE_URL` e, em produção, também `JWT_SECRET` durante a inicialização, sem imprimir valores. As credenciais S3 são verificadas somente quando uma operação de PDF é executada; assim, uma configuração incompleta de anexos não derruba as rotas de autenticação local.

## Banco de dados

O schema está em `drizzle/schema.ts`. As tabelas principais são `classes`, `classMembers`, `inviteTokens`, `lessons`, `attachments` e `auditEvents`, além da tabela `users` do scaffold.

Para gerar uma nova migration após uma alteração de schema:

```bash
pnpm drizzle-kit generate
```

Revise o SQL antes de aplicá-lo no banco gerenciado. Nunca execute operações destrutivas sem uma decisão explícita e backup adequado.

## Storage de PDFs

O upload é feito no backend. O arquivo precisa ser PDF, possuir assinatura `%PDF-`, ter no máximo 10 MB e receber uma storage key aleatória. A aplicação persiste somente metadados no banco e guarda os bytes no storage privado. O download primeiro valida a sessão, a turma, a lição não expirada e o anexo; depois gera uma URL assinada temporária.

## Limpeza automática

O handler `POST /api/scheduled/purge-expired` aceita somente chamadas autenticadas pelo mecanismo de Heartbeat. Ele não usa `setInterval` ou timers em memória. Após publicar o projeto, crie o job no ambiente Manus com cron UTC, por exemplo:

```bash
manus-heartbeat create --name nightly-cleanup --cron "0 0 3 * * *" --path /api/scheduled/purge-expired --description "Remove licoes e anexos expirados"
```

O projeto precisa estar publicado e acessível antes da criação do job. A rotina é idempotente e também esconde lições expiradas da API caso o job esteja atrasado.

## Rotas tRPC principais

| Procedimento | Finalidade |
|---|---|
| `classes.mine` | Lista as turmas do usuário autenticado. |
| `classes.create` | Cria a primeira turma e torna o criador administrador. |
| `classes.join` | Valida convite e associa o usuário à turma. |
| `classes.rotateInvite` | Revoga convites anteriores e cria um novo. |
| `classes.members` | Lista membros para administradores. |
| `lessons.list` | Lista lições ativas com filtros por matéria e data. |
| `lessons.create` | Cria lição e calcula a expiração exclusivamente no servidor. |
| `lessons.update` | Edita uma lição não expirada da turma. |
| `lessons.remove` | Exclui lição e seus metadados de anexo. |
| `lessons.uploadPdf` | Faz upload validado de PDF. |
| `lessons.downloadPdf` | Retorna URL temporária após autorização. |

## GitHub sem vazar `.env`

O arquivo `.gitignore` bloqueia `.env`, variações locais, chaves privadas, credenciais e logs. O script `push-github.bat` pergunta a URL do repositório, branch e mensagem de commit, inicializa ou atualiza o remote, executa `git add -A` e faz uma segunda verificação na área de stage. Se qualquer caminho semelhante a `.env` for detectado, o script desfaz o stage e aborta antes do commit ou push.

Execute no Prompt de Comando do Windows, a partir da raiz do projeto:

```bat
push-github.bat
```

Não cole tokens de acesso na URL do remote. Prefira autenticação SSH ou o Git Credential Manager. Se um segredo for exposto, revogue-o e gere outro; apagar o arquivo em um commit posterior não elimina o segredo do histórico.

## Limitações e próximos passos

O MVP usa upload de PDF codificado na requisição tRPC para manter o projeto sem dependência adicional. Para produção em escala, pode-se migrar para upload multipart ou URL pré-assinada de upload, mantendo a validação e a autorização no backend. Também é necessário revisar política de privacidade, responsáveis e regras da escola antes de usar o sistema com menores de idade.

## Deploy sem computador local na Vercel

A versão de produção usa somente `api/index.js` como Function Node/Express empacotada para a Vercel. O arquivo é gerado automaticamente pelo script `build:vercel` a partir de `server/vercel-entry.ts`, reunindo os módulos internos em um bundle ESM e evitando conflitos entre `api/index.js` e `api/index.ts`, além de falhas de imports sem extensão no runtime. O navegador e a API ficam na Vercel, enquanto os dados ficam em um banco MySQL gerenciado e os PDFs ficam em um bucket S3 privado. O computador local só é necessário para instalar dependências, aplicar a migração inicial e enviar o código ao GitHub; ele não precisa permanecer ligado depois do deploy.

O projeto inclui `vercel.json` com a rota da API e o Cron diário de limpeza. Na Vercel, configure nos ambientes Production e Preview pelo menos `DATABASE_URL` e `JWT_SECRET` para a API e a autenticação local iniciarem. Para habilitar anexos PDF, configure também `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`; para um provedor S3-compatible, preencha ainda `AWS_S3_ENDPOINT` e, se necessário, `AWS_S3_FORCE_PATH_STYLE=true`. `CRON_SECRET` é necessário para a limpeza automática diária. A ausência de S3 não derruba `auth.me` nem `auth.register`, mas bloqueia operações de PDF com uma mensagem explícita.

O banco precisa ser MySQL ou compatível com o protocolo MySQL, como PlanetScale ou TiDB Cloud, porque o schema usa Drizzle com `mysql2`. Crie o banco vazio, coloque a URL em `DATABASE_URL` e execute `npm run db:push` uma vez antes de usar o ambiente de produção. Nunca coloque a URL, a chave S3 ou `CRON_SECRET` no GitHub.

No painel da Vercel, importe o repositório GitHub, use `npm run build` como Build Command e `dist/public` como Output Directory, se esses campos forem solicitados. A Vercel executará a Function da API e o Cron conforme o `vercel.json`. A limpeza diária exige que `CRON_SECRET` esteja configurado no projeto.

A Vercel é uma opção externa e exige configuração separada de banco e S3. A hospedagem integrada da Manus requer menos adaptação para este scaffold, mas a versão atual foi preparada para funcionar sem o login Manus e sem depender do computador local.

## Publicar no GitHub

O arquivo `push-github.bat` está configurado para `https://github.com/pcdosilva01-spec/licoes-8b`, usa a branch `master` e pergunta confirmação antes de executar `git push --force`. O push forçado pode sobrescrever o histórico remoto; use-o somente se esse repositório for exclusivamente deste projeto e se essa substituição for intencional. O script aborta quando encontra `.env` ou qualquer variação de arquivo de ambiente no stage.

No Windows, abra o Prompt de Comando na pasta do projeto e execute:

```bat
push-github.bat
```

O GitHub poderá abrir uma janela de login ou solicitar autenticação por token. O token nunca deve ser escrito no script.
