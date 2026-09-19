#!/usr/bin/env bash
set -e

USAGE="Uso: ./commit.sh \"mensagem do commit\"\nExemplo: ./commit.sh \"Atualiza HUD do arcade\"\n\nOpcional: ./commit.sh --dry-run \"mensagem\" para apenas mostrar o comando"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  printf "%b\n" "$USAGE"
  exit 0
fi

if [[ "${1:-}" == "--dry-run" ]]; then
  MSG="${2:-Atualização automática}"
  echo "git add . && git commit -m \"$MSG\""
  exit 0
fi

MSG="${1:-Atualização automática}"

git add .
git commit -m "$MSG"
