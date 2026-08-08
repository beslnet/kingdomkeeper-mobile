#!/usr/bin/env bash
# release-android.sh — Build AAB de producción para Play Store
#
# Uso:
#   ./scripts/release-android.sh           # patch bump automático (1.0.1 → 1.0.2, code +1)
#   ./scripts/release-android.sh --minor   # minor bump (1.0.1 → 1.1.0, code +1)
#   ./scripts/release-android.sh --major   # major bump (1.0.1 → 2.0.0, code +1)
#
# El AAB queda en android/app/build/outputs/bundle/release/app-release.aab
# Súbelo manualmente en https://play.google.com/console
#
# Requiere keystore configurado en android/app/build.gradle (signingConfigs).
# Variables de entorno necesarias para firma:
#   ANDROID_KEYSTORE_PATH    — ruta al .jks / .keystore
#   ANDROID_KEY_ALIAS        — alias de la clave
#   ANDROID_KEYSTORE_PASS    — password del keystore
#   ANDROID_KEY_PASS         — password de la clave

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRADLE="$ROOT/android/app/build.gradle"
APP_VER_FILE="$ROOT/src/utils/appVersion.ts"
AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"

# ── Verificar firma ───────────────────────────────────────────────────────────
# Las propiedades se leen desde ~/.gradle/gradle.properties automáticamente.
# Sólo si no están ahí, mostramos advertencia.
GRADLE_GLOBAL="$HOME/.gradle/gradle.properties"
HAS_SIGNING=false
if grep -q "KINGDOMKEEPER_UPLOAD_STORE_FILE" "$GRADLE_GLOBAL" 2>/dev/null; then
  HAS_SIGNING=true
fi

if [[ "$HAS_SIGNING" == "false" ]]; then
  echo ""
  echo "⚠️  Firma no configurada en $GRADLE_GLOBAL"
  echo "   Sigue los pasos en scripts/README-release.md para configurarla."
  echo ""
  read -r -p "¿Continuar de todas formas (build sin firma, NO válido para Play Store)? (S/n): " skip_sign
  [[ "$skip_sign" =~ ^[nN]$ ]] && exit 0
fi

# ── Leer versión actual ───────────────────────────────────────────────────────
CURRENT_VERSION=$(grep 'versionName' "$GRADLE" | grep -oE '"[^"]+"' | tr -d '"')
CURRENT_CODE=$(grep 'versionCode' "$GRADLE" | grep -oE '[0-9]+')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# ── Calcular siguiente versión según flag ─────────────────────────────────────
BUMP="${1:---patch}"
case "$BUMP" in
  --major) NEXT_VERSION="$((MAJOR + 1)).0.0" ;;
  --minor) NEXT_VERSION="${MAJOR}.$((MINOR + 1)).0" ;;
  --patch) NEXT_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
  *)
    echo "Uso: $0 [--patch|--minor|--major]"
    echo "  --patch  (default) 1.0.1 → 1.0.2"
    echo "  --minor            1.0.1 → 1.1.0"
    echo "  --major            1.0.1 → 2.0.0"
    exit 1
    ;;
esac
NEXT_CODE=$((CURRENT_CODE + 1))

echo ""
echo "▶  KingdomKeeper Android Release"
echo "   ${CURRENT_VERSION} (code ${CURRENT_CODE})  →  ${NEXT_VERSION} (code ${NEXT_CODE})"
echo ""
read -r -p "   ¿Confirmar? (S/n): " confirm
[[ "$confirm" =~ ^[nN]$ ]] && echo "Cancelado." && exit 0

VERSION="$NEXT_VERSION"
VERSION_CODE="$NEXT_CODE"

# ── Generar changelog ─────────────────────────────────────────────────────────
source "$ROOT/scripts/changelog.sh"
source "$ROOT/scripts/version-check.sh"
generate_changelog "$VERSION" android

# ── Bump versión en archivos ──────────────────────────────────────────────────
echo "Actualizando build.gradle y appVersion.ts..."
sed -i '' "s/versionCode [0-9]*/versionCode ${VERSION_CODE}/" "$GRADLE"
sed -i '' "s/versionName \"[^\"]*\"/versionName \"${VERSION}\"/" "$GRADLE"
sed -i '' "s/APP_VERSION = '[^']*'/APP_VERSION = '${VERSION}'/" "$APP_VER_FILE"
sed -i '' "s/APP_BUILD = [0-9][0-9]*/APP_BUILD = ${VERSION_CODE}/" "$APP_VER_FILE"
echo "  versionCode = ${VERSION_CODE}  |  versionName = ${VERSION}"

# ── Build AAB ─────────────────────────────────────────────────────────────────
echo ""
echo "Construyendo AAB (~3-5 min)..."
cd "$ROOT/android"

if [[ -n "${ANDROID_KEYSTORE_PATH:-}" ]]; then
  ./gradlew bundleRelease \
    -PKINGDOMKEEPER_UPLOAD_STORE_FILE="$ANDROID_KEYSTORE_PATH" \
    -PKINGDOMKEEPER_UPLOAD_KEY_ALIAS="$ANDROID_KEY_ALIAS" \
    -PKINGDOMKEEPER_UPLOAD_STORE_PASSWORD="$ANDROID_KEYSTORE_PASS" \
    -PKINGDOMKEEPER_UPLOAD_KEY_PASSWORD="$ANDROID_KEY_PASS"
else
  ./gradlew bundleRelease
fi

[[ ! -f "$AAB" ]] && echo "❌ Build falló — no se encontró $AAB" && exit 1

# ── Commit + Git tag ──────────────────────────────────────────────────────────
TAG="android/v${VERSION}-${VERSION_CODE}"
cd "$ROOT"
git add "$GRADLE" "$APP_VER_FILE"
git commit -m "chore(android): bump version ${VERSION} code ${VERSION_CODE}" 2>/dev/null || true
git --no-pager tag "$TAG" 2>/dev/null && echo "Tag creado: $TAG" || echo "Tag $TAG ya existe (ignorado)"

echo ""
echo "✅  AAB listo: $AAB ($(du -sh "$AAB" | cut -f1))"
echo ""
echo "Pasos para subir a Play Store:"
echo "  1. https://play.google.com/console → Prueba cerrada → Create new release"
echo "  2. Subir: $AAB"
echo "  3. Pegar novedades de GOOGLE PLAY (guardado en ${CHANGELOG_FILE_PATH:-build/changelogs/})"
echo "  4. Cuando Play Store acepte: git push origin main && git push origin ${TAG}"
echo ""
open -R "$AAB" 2>/dev/null || true

warn_platform_drift "$ROOT"
