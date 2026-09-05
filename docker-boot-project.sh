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

log "Construindo e iniciando os containers de desenvolvimento"
docker compose up -d --build

log "Status dos containers"
docker compose ps

log "Ambiente pronto"
printf '%s\n' \
  "API:        http://localhost:${APP_PORT:-3000}" \
  "Healthcheck: http://localhost:${APP_PORT:-3000}/health" \
  "PostgreSQL:  localhost:${POSTGRES_PORT:-5432}"
