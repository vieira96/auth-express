#!/usr/bin/env bash

# Inicializa o ambiente local Docker da API Auth.

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

log() {
  printf '\n==> %s\n' "$*"
}

fail() {
  printf '\nErro: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker nao foi encontrado."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 nao esta disponivel."

[[ -f .env.example ]] || fail ".env.example nao foi encontrado."

if [[ ! -f .env ]]; then
  log "Criando .env a partir de .env.example"
  cp .env.example .env
fi

# O Docker Compose tambem le .env; carregamos aqui para mostrar as portas reais.
set -a
. ./.env
set +a

USER_ID="${USER_ID:-1000}"
GROUP_ID="${GROUP_ID:-1000}"

if [[ -d node_modules && ! -O node_modules ]]; then
  log "Corrigindo permissões de node_modules"
  docker run --rm -v "$PROJECT_DIR/node_modules:/node_modules" alpine:3.21 \
    chown -R "$USER_ID:$GROUP_ID" /node_modules
fi

if [[ -d src/generated/prisma && ! -O src/generated/prisma ]]; then
  log "Corrigindo permissões do Prisma Client gerado"
  docker run --rm -v "$PROJECT_DIR:/app" alpine:3.21 \
    chown -R "$USER_ID:$GROUP_ID" /app/src/generated/prisma
fi

mkdir -p node_modules

log "Instalando dependências Node.js"
docker compose run --rm --no-deps --build app npm install

log "Iniciando os containers de desenvolvimento"
docker compose up -d

log "Gerando o Prisma Client"
docker compose exec -T app npm run prisma:generate

log "Aplicando migrations pendentes do Prisma"
docker compose exec -T app npx prisma migrate deploy

log "Status dos containers"
docker compose ps

log "Ambiente pronto"
printf '%s\n' \
  "API:        http://localhost:${APP_PORT:-3000}" \
  "Auth:       http://localhost:${APP_PORT:-3000}/auth" \
  "PostgreSQL:  localhost:${POSTGRES_PORT:-5432}" \
  "Redis:       localhost:${REDIS_PORT:-6379}"
