#!/bin/bash
set -e

readonly SCRIPT_NAME="$(basename "$0")"
readonly REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly JUICE_SHOP_REPO="https://github.com/juice-shop/juice-shop.git"

function log() {
  local level="$1"; shift
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$SCRIPT_NAME] [$level] $*" >&2
}
function log_info()  { log "INFO"  "$@"; }
function log_warn()  { log "WARN"  "$@"; }
function log_error() { log "ERROR" "$@"; }

function print_usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [--tag <juice-shop-tag>]

Clones OWASP Juice Shop, applies this repo's OpenTelemetry Web SDK
instrumentation on top of it, and starts the full compose stack
(juice-shop + otel-collector + tempo + grafana).

Options:
  --tag <tag>   Juice Shop tag to clone (default: v20.2.0)
  --help        Show this help
EOF
}

function assert_is_installed() {
  local bin="$1"
  command -v "$bin" >/dev/null 2>&1 || {
    log_error "$bin is required but not installed"
    exit 1
  }
}

function clone_juice_shop() {
  local tag="$1"
  if [ -d "$REPO_DIR/juice-shop" ]; then
    log_info "juice-shop/ already exists, leaving it as-is (remove it to re-clone)"
    return 0
  fi
  log_info "cloning juice-shop $tag"
  git clone --branch "$tag" --depth 1 "$JUICE_SHOP_REPO" "$REPO_DIR/juice-shop"
}

function apply_overlay() {
  log_info "applying instrumentation overlay"
  cp -r "$REPO_DIR/overlay/"* "$REPO_DIR/juice-shop/"
  log_info "diff against upstream $1:"
  (cd "$REPO_DIR/juice-shop" && git diff --stat)
}

function main() {
  local tag="v20.2.0"

  while [ $# -gt 0 ]; do
    case "$1" in
      --tag) tag="$2"; shift 2 ;;
      --help) print_usage; exit 0 ;;
      *) log_error "unknown argument: $1"; print_usage; exit 1 ;;
    esac
  done

  assert_is_installed git
  assert_is_installed docker

  clone_juice_shop "$tag"
  apply_overlay "$tag"

  if [ -z "${GRAFANA_ADMIN_PASSWORD:-}" ]; then
    GRAFANA_ADMIN_PASSWORD="$(openssl rand -base64 18)"
    export GRAFANA_ADMIN_PASSWORD
    log_info "generated a Grafana admin password (Grafana's port is public, not left at a weak default)"
  fi

  log_info "docker compose up --build (first build takes several minutes)"
  cd "$REPO_DIR" && docker compose up -d --build

  log_info "done. docker compose ps to check status."
  log_info "grafana admin password: $GRAFANA_ADMIN_PASSWORD"
}

main "$@"
