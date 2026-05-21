#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# deploy.sh — MaidenHeadApp
#
# Flujo:
#   1. Build Angular PWA  (npm run build)
#   2. Build imagen Docker (nginx:alpine)
#   3. Tag  :v1  y  :latest
#   4. Push a GitHub Container Registry (ghcr.io/120m4n/maidenheadapp)
#
# Uso:
#   ./deploy.sh          → versión por defecto: v1
#   ./deploy.sh v2       → versión explícita
#   ./deploy.sh v2 --skip-build  → omite npm build (usa www/ existente)
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Configuración ────────────────────────────────────────────────────────────
GITHUB_USER="120m4n"
IMAGE_NAME="maidenheadapp"          # ghcr.io requiere lowercase
REGISTRY="ghcr.io"
VERSION="${1:-v1}"                  # primer arg o "v1" por defecto
SKIP_BUILD="${2:-}"                 # pasar --skip-build para omitir npm build

FULL_IMAGE="${REGISTRY}/${GITHUB_USER}/${IMAGE_NAME}"

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${CYAN}▶${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
fail() { echo -e "${RED}✗ ERROR:${NC} $*" >&2; exit 1; }
sep()  { echo -e "${BOLD}────────────────────────────────────────${NC}"; }

sep
echo -e "${BOLD}MaidenHeadApp — deploy${NC}"
echo "  Imagen : ${FULL_IMAGE}"
echo "  Versión: ${VERSION}"
sep

# ─── Comprobaciones previas ───────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "Docker no encontrado. Instálalo desde https://docs.docker.com/get-docker/"
command -v npm    >/dev/null 2>&1 || fail "npm no encontrado."

# ─── 1. Build Angular PWA ─────────────────────────────────────────────────────
if [[ "${SKIP_BUILD}" == "--skip-build" ]]; then
    warn "1/4 --skip-build activo — usando www/ existente"
    [[ -d "www" ]] || fail "www/ no existe. Ejecuta primero: npm run build"
else
    log "1/4 Build Angular PWA (producción)…"
    npm run build
    ok "Angular build completado → www/"
fi

echo ""

# ─── 2. Build imagen Docker ───────────────────────────────────────────────────
# `docker buildx build` (no `docker build`) garantiza la plataforma objetivo
# aunque el host sea arm64 (Apple Silicon). --load carga la imagen al daemon
# local para que el `docker push` posterior pueda encontrarla.
log "2/4 Build Docker image linux/amd64 (nginx:alpine)…"
docker buildx build \
    --platform linux/amd64 \
    --load \
    --label "org.opencontainers.image.source=https://github.com/${GITHUB_USER}/${IMAGE_NAME}" \
    --label "org.opencontainers.image.description=MaidenHead Ham Radio PWA — grid locator + QSO log" \
    --label "org.opencontainers.image.version=${VERSION}" \
    --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -t "${FULL_IMAGE}:${VERSION}" \
    -t "${FULL_IMAGE}:latest" \
    .

IMAGE_SIZE=$(docker image inspect "${FULL_IMAGE}:${VERSION}" \
    --format '{{.Size}}' | awk '{printf "%.1f MB", $1/1024/1024}')
ok "Imagen construida: ${FULL_IMAGE}:${VERSION} (${IMAGE_SIZE})"

echo ""

# ─── 3. Tags ──────────────────────────────────────────────────────────────────
log "3/4 Tags aplicados:"
echo "    ${FULL_IMAGE}:${VERSION}"
echo "    ${FULL_IMAGE}:latest"
echo ""

# ─── 4. Push a ghcr.io ────────────────────────────────────────────────────────
log "4/4 Autenticando y subiendo a ${REGISTRY}…"

# Autenticación con gh CLI (recomendado) o con GITHUB_TOKEN env var
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    gh auth token | docker login "${REGISTRY}" -u "${GITHUB_USER}" --password-stdin
    ok "Autenticado con gh CLI"
elif [[ -n "${GITHUB_TOKEN:-}" ]]; then
    echo "${GITHUB_TOKEN}" | docker login "${REGISTRY}" -u "${GITHUB_USER}" --password-stdin
    ok "Autenticado con GITHUB_TOKEN"
else
    warn "gh CLI no disponible y GITHUB_TOKEN no definido."
    warn "Opciones para autenticar:"
    warn "  a) gh auth login  (recomendado)"
    warn "  b) export GITHUB_TOKEN=<tu_token_classic_con_write:packages>"
    fail "No se puede autenticar contra ${REGISTRY}"
fi

echo ""
docker push "${FULL_IMAGE}:${VERSION}"
docker push "${FULL_IMAGE}:latest"

echo ""
sep
echo -e "${GREEN}${BOLD}✓ Deploy completado${NC}"
sep
echo "  Imagen  : ${FULL_IMAGE}:${VERSION}"
echo "  También : ${FULL_IMAGE}:latest"
echo ""
echo "  Para ejecutar localmente:"
echo "    docker run -p 8080:80 ${FULL_IMAGE}:${VERSION}"
echo "    → http://localhost:8080"
echo ""
echo "  Para que el paquete sea público en ghcr.io:"
echo "    GitHub → tu repo → Packages → ${IMAGE_NAME} → Package settings → Make public"
sep
