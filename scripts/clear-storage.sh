#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORAGE_DIR="$ROOT_DIR/apps/api/storage"

printf '\033[1;34m[storage]\033[0m Clearing %s/*\n' "${STORAGE_DIR#$ROOT_DIR/}"

mkdir -p "$STORAGE_DIR"
find "$STORAGE_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
mkdir -p "$STORAGE_DIR/private" "$STORAGE_DIR/public" "$STORAGE_DIR/tmp" "$STORAGE_DIR/avatars"

printf '\033[1;34m[storage]\033[0m Storage cleared\n'
