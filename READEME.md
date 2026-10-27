# Marketplace Daily — Backend

API do Marketplace Daily, um assistente de organização e prioridades diárias para vendedores de marketplaces. Ela guarda usuários, expediente, rotinas recorrentes, tarefas e revisões semanais, e monta o plano de trabalho do dia.

A API não se integra a nenhum marketplace. Tarefas, pedidos, mensagens e atividades são cadastrados manualmente pelo usuário.

## Tecnologias

Node.js, TypeScript, Express, Prisma 6, PostgreSQL, JWT, Zod, bcryptjs, Helmet e CORS.

## Pré-requisitos

- Node.js 20 ou superior (testado com a v24.19.0)
- PostgreSQL 14 ou superior, instalado e em execução
- Git (opcional)

Confira as versões:


powershell
Copiar

node -v
npm -v
psql --version




## Passo 1 — Instalar as dependências

Dentro da pasta do backend:


powershell
Copiar

npm install




Importante: o projeto usa Prisma 6. Não atualize para o Prisma 7 sem migrar a configuração, pois a versão nova quebra o fluxo atual (erros como `CSe.isError is not a function`). Para conferir:


powershell
Copiar

npx prisma -v




A saída deve mostrar `prisma` e `@prisma/client` na versão 6.x. Se estiver diferente:


powershell
Copiar

npm install prisma@6 @prisma/client@6




## Passo 2 — Criar o banco de dados

Abra o `psql` (ou o pgAdmin) com o usuário `postgres` e execute:


sql
Copiar

CREATE DATABASE marketplace_daily;




Pelo PowerShell, o equivalente é:


powershell
Copiar

psql -U postgres -c "CREATE DATABASE marketplace_daily;"




## Passo 3 — Configurar as variáveis de ambiente

Crie o arquivo `.env` na raiz do backend:


env
Copiar

NODE_ENV=development
PORT=3333
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/marketplace_daily?schema=public"
JWT_SECRET="troque-por-uma-frase-longa-e-aleatoria"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"




| Variável | Descrição |
|---|---|
| NODE_ENV | development, test ou production |
| PORT | Porta da API (padrão 3333) |
| DATABASE_URL | String de conexão do PostgreSQL |
| JWT_SECRET | Segredo para assinar os tokens. Mínimo de 16 caracteres |
| JWT_EXPIRES_IN | Validade do token (padrão 7d) |
| CORS_ORIGIN | Endereço do frontend autorizado a chamar a API |

Se a senha do PostgreSQL tiver caracteres especiais (`@`, `#`, `:`, `/`, `%`), codifique-os na URL. Por exemplo, `@` vira `%40`. Esse é o motivo mais comum do erro P1000.

Nunca envie o `.env` ao Git. Confirme que o `.gitignore` contém `.env` e `node_modules`.

## Passo 4 — Gerar o cliente Prisma e criar as tabelas


powershell
Copiar

npx prisma generate
npx prisma migrate dev --name init




O primeiro comando gera o cliente tipado. O segundo cria as tabelas no banco. Para inspecionar os dados visualmente:


powershell
Copiar

npx prisma studio




## Passo 5 — Iniciar a API


powershell
Copiar

npm run dev




Confira os scripts disponíveis em `package.json`. Com a API no ar, teste:


powershell
Copiar

curl http://localhost:3333/health




A resposta deve indicar que o serviço está funcionando.

URL base da API: `http://localhost:3333/api`

## Rotas principais

Todas as rotas, exceto cadastro e login, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Função |
|---|---|---|
| POST | /api/auth/register | Cria a conta |
| POST | /api/auth/login | Autentica e devolve o token |
| GET | /api/planning/today | Plano do dia |
| GET | /api/planning/workdays | Expediente cadastrado |
| PUT | /api/planning/workdays/:weekday | Salva o expediente de um dia (0 = domingo a 6 = sábado) |
| POST | /api/planning/tasks/:id/postpone | Adia uma tarefa |
| POST | /api/planning/tasks/:id/block | Bloqueia uma tarefa |
| GET, POST | /api/tasks | Lista e cria tarefas |
| PATCH | /api/tasks/:id | Atualiza uma tarefa |
| GET, POST | /api/routines | Lista e cria rotinas |
| PATCH | /api/routines/:id | Atualiza uma rotina |
| GET | /api/reviews | Resumo da semana |
| PUT | /api/reviews | Salva a revisão semanal |

## Contrato de dados (campos que costumam gerar erro 400)

Os dados são validados com Zod. Os pontos que mais causam erro:

- Horários são números em minutos desde a meia-noite: 09:00 = 540 e 18:00 = 1080 (`startMinutes`, `endMinutes`, `preferredStartMin`).
- Dias da semana: 0 = domingo, 1 = segunda, até 6 = sábado.
- Senha do cadastro: mínimo de 8 caracteres.
- Tarefas usam `dueAt` para o prazo e `estimatedMinutes` para a duração.
- Rotinas usam `frequency`, `weekdays`, `preferredStartMin`, `estimatedMinutes`, `priority` e `active`.
- A revisão semanal usa `weekStart`, `notes`, `obstacles` e `nextWeekObjectives`.

Quando uma requisição é recusada, o console do backend mostra o campo exato com problema.

## Estrutura (principais pastas)


text
Copiar

marketplace-daily-backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── env.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── planning.routes.ts
│       ├── routine.routes.ts
│       ├── task.routes.ts
│       └── review.routes.ts
├── .env
├── package.json
└── tsconfig.json




## Solução de problemas

**P1000: Authentication failed.** Usuário ou senha do PostgreSQL incorretos em `DATABASE_URL`. Revise a senha e codifique caracteres especiais.

**P1001: Can't reach database server.** O PostgreSQL não está em execução ou a porta não é a 5432. No Windows, abra "Serviços" e confirme que o serviço do PostgreSQL está iniciado.

**CSe.isError is not a function ao rodar o Prisma.** Incompatibilidade de versões. Instale `prisma@6` e `@prisma/client@6` e rode `npx prisma generate`.

**EADDRINUSE: porta 3333 em uso.** Outro processo usa a porta. Encerre-o ou altere `PORT` no `.env` (e o `NEXT_PUBLIC_API_URL` do frontend).

**Erro de CORS no navegador.** `CORS_ORIGIN` precisa ser exatamente o endereço do frontend, incluindo a porta (por exemplo, `http://localhost:3000`). Reinicie a API depois de alterar o `.env`.

**ZodError / resposta 400.** Algum campo enviado não bate com o contrato acima. Leia o campo indicado no console do backend.

**Mudei o schema.prisma.** Rode `npx prisma migrate dev --name descricao-da-mudanca`.

## Publicação (produção)

1. Defina `NODE_ENV=production` e um `JWT_SECRET` longo e exclusivo.
2. Ajuste `CORS_ORIGIN` para o domínio real do frontend.
3. Aplique as migrações sem modo interativo: `npx prisma migrate deploy`.
4. Gere o build e inicie: `npm run build` e `npm run start`.
5. Use HTTPS e faça backups regulares do banco.
2. README do frontend (marketplace-daily-frontend/README.md)
# Marketplace Daily — Frontend

Interface web do Marketplace Daily. Ela mostra o plano de trabalho do dia, permite concluir, adiar e bloquear tarefas, gerenciar rotinas recorrentes, configurar o expediente e fazer a revisão semanal.

Para aprender a usar a aplicação no dia a dia, leia o [Guia do usuário](./GUIA-DO-USUARIO.md).

## Tecnologias

Next.js (App Router), TypeScript, TanStack Query, Lucide React, date-fns e CSS próprio.

## Pré-requisitos

- Node.js 20 ou superior (testado com a v24.19.0)
- Backend do Marketplace Daily instalado e em execução (veja o README do backend)

## Passo 1 — Colocar o backend no ar

O frontend depende da API. Antes de continuar, inicie o backend e confirme que `http://localhost:3333/health` responde.

## Passo 2 — Instalar as dependências

Dentro da pasta do frontend:


powershell
Copiar

npm install




## Passo 3 — Configurar a variável de ambiente

Crie o arquivo `.env.local` na raiz do frontend:


env
Copiar

NEXT_PUBLIC_API_URL=http://localhost:3333/api




Se mudar a porta ou o endereço do backend, altere esse valor e reinicie o frontend. Variáveis `NEXT_PUBLIC_` só são lidas na inicialização.

## Passo 4 — Iniciar a aplicação


powershell
Copiar

npm run dev




Abra `http://localhost:3000`.

## Passo 5 — Criar a conta e carregar a rotina sugerida

1. Acesse `/register` e crie sua conta. A senha precisa ter no mínimo 8 caracteres.
2. Você será levado ao dashboard. Se o plano estiver vazio, clique em **Começar com a rotina sugerida** e confirme.
3. O botão cadastra 11 rotinas para vendedores de marketplace e, se você ainda não tiver expediente, define segunda a sexta, das 09:00 às 18:00.
4. Clicar novamente não duplica nada: rotinas com o mesmo título são ignoradas.
5. O mesmo botão (**Carregar rotina sugerida**) também está na tela de Rotinas.

Depois disso, siga o [Guia do usuário](./GUIA-DO-USUARIO.md).

## Telas

| Rota | Função |
|---|---|
| /register | Criação de conta |
| /login | Entrada |
| /dashboard | Meu dia: plano, progresso e ações |
| /tasks | Tarefas avulsas |
| /routines | Rotinas recorrentes |
| /settings | Expediente (dias e horários de trabalho) |
| /review | Revisão semanal |

## Estrutura (principais pastas)


text
Copiar

marketplace-daily-frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/login, register
│   │   └── (app)/dashboard, tasks, routines, settings, review
│   ├── components/      TaskForm, RoutineForm, StarterPackButton...
│   ├── data/            starterPack.ts (rotinas sugeridas)
│   ├── hooks/           useInvalidate.ts
│   └── lib/             api.ts, format.ts, types.ts, normalizers.ts
├── .env.local
└── package.json




Para alterar a rotina sugerida (títulos, horários, frequências), edite `src/data/starterPack.ts`. Horários são escritos em minutos desde a meia-noite, usando a função auxiliar `at(hora, minuto)`.

## Comandos úteis


powershell
Copiar

npm run dev      # desenvolvimento
npm run lint     # verificação de código
npm run build    # build de produção
npm run start    # executa o build




## Solução de problemas

**Failed to fetch / erro de rede.** O backend não está rodando ou `NEXT_PUBLIC_API_URL` está errada. Teste `http://localhost:3333/health`.

**Erro de CORS.** No `.env` do backend, `CORS_ORIGIN` deve ser `http://localhost:3000`. Reinicie o backend.

**Mudei o .env.local e nada mudou.** Pare o Next (`Ctrl + C`) e rode `npm run dev` de novo.

**Comportamento estranho depois de alterar arquivos.** Pare o servidor, apague a pasta `.next` e inicie novamente:


powershell
Copiar

Remove-Item -Recurse -Force .next
npm run dev




**Cannot read properties of undefined.** A resposta da API chegou em formato diferente do esperado. Os ajustes ficam em `src/lib/normalizers.ts`. Verifique a resposta real na aba Network do navegador.

**Salvar expediente, rotina ou tarefa retorna erro 400.** O console do backend mostra o campo recusado. Os formatos aceitos estão no README do backend.

**Sou deslogado ao recarregar.** O token JWT expira conforme `JWT_EXPIRES_IN` no backend (padrão 7 dias). Entre novamente.

**Dashboard vazio depois de carregar a rotina sugerida.** Confira em `/routines` se as rotinas existem e estão ativas, 