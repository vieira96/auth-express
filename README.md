# Auth API

API REST de autenticação construída com Node.js, Express, TypeScript, Prisma e PostgreSQL.

O projeto foi estruturado para praticar fundamentos de backend que aparecem em aplicações reais: validação de entrada, hash de senha, autenticação com JWT, migrations e ambiente local reproduzível com Docker.

## Destaques técnicos

- API em TypeScript com organização modular por responsabilidade.
- Senhas armazenadas somente como hash com bcrypt.
- JWT emitido apenas no login.
- Rota de usuários protegida por Bearer token.
- Validação de payloads com Zod e respostas de erro consistentes.
- PostgreSQL versionado por migrations do Prisma.
- Ambiente de desenvolvimento com Docker e hot reload.

## Stack

| Camada | Tecnologia |
| --- | --- |
| API | Node.js, Express e TypeScript |
| Banco de dados | PostgreSQL |
| ORM e migrations | Prisma |
| Validação | Zod |
| Autenticação | bcryptjs e JSON Web Token |
| Testes | Vitest, Supertest e Testcontainers |
| Ambiente local | Docker Compose |

## Como iniciar

Pré-requisitos: Docker e Docker Compose v2.

```bash
./docker-boot-project.sh
```

O script constrói os containers, inicia a API e o PostgreSQL e aplica as migrations pendentes do Prisma.

A API fica disponível em `http://localhost:<APP_PORT>`. O valor padrão é `3000`; use a porta definida em `APP_PORT` no seu `.env`.

Durante o desenvolvimento, alterações em `src/` reiniciam a API automaticamente.

### Inicialização manual

Se preferir executar cada etapa sem o script:

```bash
cp .env.example .env
npm install
npm run prisma:generate
docker compose up -d --build
docker compose exec -T app npx prisma migrate deploy
```

Confira o status dos containers com:

```bash
docker compose ps
```

## Variáveis de ambiente

Configure o `.env` antes de iniciar o projeto:

```env
APP_PORT=3000
POSTGRES_PORT=5432
POSTGRES_USER=app
POSTGRES_PASSWORD=troque-esta-senha
POSTGRES_DB=auth
DATABASE_URL=postgresql://app:troque-esta-senha@localhost:5432/auth
JWT_SECRET=troque-por-um-segredo-local-longo
```

> As variáveis `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` só são usadas na primeira criação do volume do PostgreSQL. Para alterá-las depois, recrie o volume ou faça a mudança diretamente no banco.

## Rotas

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/auth/register` | Cria um usuário sem emitir token. |
| `POST` | `/auth/login` | Valida credenciais e retorna um JWT. |
| `GET` | `/users` | Lista usuários autenticados. Requer Bearer token. |

### `POST /auth/register`

Cria um usuário. Não retorna token.

```json
{
  "email": "ana@exemplo.com",
  "password": "Senha123!"
}
```

Resposta `201`:

```json
{
  "user": {
    "id": "uuid",
    "email": "ana@exemplo.com"
  }
}
```

### `POST /auth/login`

Autentica um usuário e retorna um JWT.

```json
{
  "email": "ana@exemplo.com",
  "password": "Senha123!"
}
```

Resposta `200`:

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "email": "ana@exemplo.com"
  }
}
```

Erros de validação retornam `400` com o campo e uma mensagem objetiva. E-mail já utilizado retorna `409`; credenciais incorretas no login retornam `401`.

### `GET /users`

Lista os usuários com dados públicos. Envie o token recebido no login:

```http
Authorization: Bearer seu_token_aqui
```

Resposta `200`:

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "ana@exemplo.com",
      "createdAt": "2026-09-07T20:41:47.564Z",
      "updatedAt": "2026-09-07T20:41:47.564Z"
    }
  ]
}
```

Sem token ou com token inválido, a rota retorna `401`.

## Prisma e migrations

Os models do Prisma ficam em `prisma/models/` e as migrations em `prisma/migrations/`.

Depois de alterar um model, crie e aplique uma migration:

```bash
npm run db:migrate -- --name descricao_da_mudanca
```

Para abrir a interface visual do banco:

```bash
npm run db:studio
```

## Estrutura

```text
src/
├── config/          # Prisma e configurações compartilhadas
├── controllers/     # Entrada e resposta HTTP
├── errors/          # Erros da aplicação
├── middlewares/     # Tratamento global de erros
├── routes/          # Endpoints da API
├── services/        # Regras de negócio e Prisma
├── types/           # Contratos TypeScript reutilizáveis
└── validators/      # Schemas Zod

prisma/
├── models/          # Models por domínio
├── migrations/      # Histórico de alterações do banco
└── schema.prisma    # Generator e datasource do Prisma
```

A rota delega a requisição ao controller; o controller valida a entrada e chama o service; o service concentra a regra de negócio e usa o Prisma diretamente. Não há uma camada de repository que apenas repetiria chamadas do ORM.

## Postman

A collection com as rotas atuais fica em:

```text
postman/postman_collection.json
```

Importe esse arquivo no Postman. A collection contém variáveis para URL, e-mail, senha e token de acesso.

## Testes

A suíte usa Vitest, Supertest e Testcontainers.

- **Vitest** executa os testes em TypeScript.
- **Supertest** envia requisições HTTP para a aplicação Express sem iniciar um servidor em uma porta.
- **Testcontainers** cria um PostgreSQL temporário em Docker para os testes de integração.

Os testes de integração cobrem rotas, controllers, services, Prisma e PostgreSQL:

- cadastro com sucesso e bloqueio de e-mail duplicado (`409`);
- login com credenciais válidas e inválidas (`401`);
- listagem de usuários com token válido;
- acesso a `/users` sem token ou com token inválido (`401`).

Cada execução cria um banco vazio, aplica as migrations do Prisma e aponta a API para esse banco por meio de `DATABASE_URL`. Depois de cada cenário, os usuários são removidos. Ao final, a conexão do Prisma e o container temporário são encerrados.

### Como executar

É necessário ter Node.js, Docker e Docker Compose instalados. Execute no terminal da máquina, na raiz do projeto e fora do container da API:

```bash
npm test
```

Para rodar apenas um módulo:

```bash
npm test -- tests/auth/register.spec.ts
npm test -- tests/auth/login.spec.ts
npm test -- tests/user/user.spec.ts
```

Durante o desenvolvimento:

```bash
npm run test:watch
```

> O Docker precisa estar em execução. Não rode os testes dentro de `docker compose exec app sh`, porque o container da API não tem acesso ao Docker do host.

## Próximo passo

Adicionar paginação à listagem de usuários e cobrir esse comportamento com testes.
