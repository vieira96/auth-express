# Auth API

API REST de autenticação construída com Node.js, Express, TypeScript, Prisma e PostgreSQL.

O projeto foi estruturado para praticar fundamentos de backend que aparecem em aplicações reais: validação de entrada, hash de senha, autenticação com JWT, migrations e ambiente local reproduzível com Docker.

## Destaques técnicos

- API em TypeScript com organização modular por responsabilidade.
- Senhas armazenadas somente como hash com bcrypt.
- JWT emitido apenas no login.
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

## Próximo passo

O próximo passo é configurar uma suíte de testes automatizados de backend:

- testes unitários para regras isoladas;
- testes de integração com PostgreSQL separado do banco de desenvolvimento;
- testes HTTP para cadastro e login;
- execução dos testes no CI.
