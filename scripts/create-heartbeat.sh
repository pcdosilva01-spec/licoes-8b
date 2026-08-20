#!/usr/bin/env bash
set -euo pipefail

printf 'Criando o job diário de limpeza em UTC...\n'
manus-heartbeat create \
  --name nightly-cleanup \
  --cron "0 0 3 * * *" \
  --path /api/scheduled/purge-expired \
  --description "Remove lições e referências de anexos expirados"
printf 'Job criado. Confirme o task_uid no painel de agendamentos.\n'
