#!/usr/bin/env bash
set -e

USAGE="Uso: ./pushcommit.sh \"mensagem do commit\"\nExemplo: ./pushcommit.sh \"Atualiza projeto e hub\"\n\nOpcional: ./pushcommit.sh --dry-run \"mensagem\" para apenas mostrar os comandos"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  printf "%b\n" "$USAGE"
  exit 0
fi

if [[ "${1:-}" == "--dry-run" ]]; then
  MSG="${2:-Atualização automática}"
  echo "git fetch origin && git rebase origin/main && git add . && git commit -m \"$MSG\" && git push origin HEAD:main"
  exit 0
fi

MSG="${1:-Atualização automática}"

git fetch origin
git rebase origin/main
git add .
git commit -m "$MSG"
git push origin HEAD:main
