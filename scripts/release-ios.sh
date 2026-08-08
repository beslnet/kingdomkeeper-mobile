#!/usr/bin/env bash
# release-ios.sh — Build, archive y sube a App Store Connect
#
# Uso:
#   ./scripts/release-ios.sh           # patch bump automático (1.0.1 → 1.0.2, build +1)
#   ./scripts/release-ios.sh --minor   # minor bump (1.0.1 → 1.1.0, build +1)
#   ./scripts/release-ios.sh --major   # major bump (1.0.1 → 2.0.0, build +1)
#
# Requiere:
#   - Xcode con provisioning automático (team MQTPNZFG93)
#   - ~/.appstoreconnect/private_keys/AuthKey_<API_KEY_ID>.p8
#   - xcpretty (opcional): gem install xcpretty
#
# Variables de entorno opcionales:
#   iOS_API_KEY_ID    — ID de la API Key de App Store Connect
#   iOS_API_ISSUER    — Issuer ID de App Store Connect

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PBXPROJ="$ROOT/ios/kingdomkeeperMobile.xcodeproj/project.pbxproj"
WORKSPACE="$ROOT/ios/kingdomkeeperMobile.xcworkspace"
SCHEME="kingdomkeeperMobile"
APP_VER_FILE="$ROOT/src/utils/appVersion.ts"

# ── Credenciales App Store Connect ───────────────────────────────────────────
# Configura estas variables en tu entorno o en ~/.zshrc:
#   export iOS_API_KEY_ID="XXXXXXXXXX"
#   export iOS_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
API_KEY="${iOS_API_KEY_ID:-S2WQKUX5M8}"
API_ISSUER="${iOS_API_ISSUER:-c2fc44ae-c581-4b31-b153-1eb4a9ab80f9}"

if [[ -z "$API_KEY" || -z "$API_ISSUER" ]]; then
  echo ""
  echo "⚠️  Variables de App Store Connect no configuradas."
  echo "   Exporta en tu shell:"
  echo "   export iOS_API_KEY_ID='TU_KEY_ID'"
  echo "   export iOS_API_ISSUER='TU_ISSUER_ID'"
  echo ""
  echo "   El archivo .p8 debe estar en:"
  echo "   ~/.appstoreconnect/private_keys/AuthKey_\${iOS_API_KEY_ID}.p8"
  echo ""
  echo "   (Puedes obtener estos datos en App Store Connect → Usuarios → Integración → API Keys)"
  echo ""
  read -r -p "¿Continuar de todas formas (sólo archivará, no subirá)? (S/n): " skip_upload
  [[ "$skip_upload" =~ ^[nN]$ ]] && exit 0
  SKIP_UPLOAD=true
else
  SKIP_UPLOAD=false
fi

# ── Leer versión actual ───────────────────────────────────────────────────────
CURRENT_VERSION=$(grep 'MARKETING_VERSION' "$PBXPROJ" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
CURRENT_BUILD=$(grep 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | head -1 | grep -oE '[0-9]+')
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
NEXT_BUILD=$((CURRENT_BUILD + 1))

echo ""
echo "▶  KingdomKeeper iOS Release"
echo "   ${CURRENT_VERSION} (build ${CURRENT_BUILD})  →  ${NEXT_VERSION} (build ${NEXT_BUILD})"
echo ""
read -r -p "   ¿Confirmar? (S/n): " confirm
[[ "$confirm" =~ ^[nN]$ ]] && echo "Cancelado." && exit 0

VERSION="$NEXT_VERSION"
BUILD="$NEXT_BUILD"
ARCHIVE="$ROOT/build/KingdomKeeper-${VERSION}.xcarchive"
EXPORT_DIR="$ROOT/build/ipa-appstore-${VERSION}"
IPA="$EXPORT_DIR/kingdomkeeperMobile.ipa"

# ── Generar changelog ─────────────────────────────────────────────────────────
source "$ROOT/scripts/changelog.sh"
source "$ROOT/scripts/version-check.sh"
generate_changelog "$VERSION" ios

# ── Bump versión en archivos ──────────────────────────────────────────────────
echo "Actualizando project.pbxproj y appVersion.ts..."
sed -i '' "s/MARKETING_VERSION = .*;/MARKETING_VERSION = ${VERSION};/g" "$PBXPROJ"
sed -i '' "s/CURRENT_PROJECT_VERSION = .*;/CURRENT_PROJECT_VERSION = ${BUILD};/g" "$PBXPROJ"
sed -i '' "s/APP_VERSION = '[^']*'/APP_VERSION = '${VERSION}'/" "$APP_VER_FILE"
sed -i '' "s/APP_BUILD = [0-9][0-9]*/APP_BUILD = ${BUILD}/" "$APP_VER_FILE"
echo "  MARKETING_VERSION = ${VERSION}  |  CURRENT_PROJECT_VERSION = ${BUILD}"

# ── Archive ───────────────────────────────────────────────────────────────────
echo ""
echo "Archivando (~5-10 min)..."
XCODE_CMD=(
  xcodebuild archive
  -workspace "$WORKSPACE"
  -scheme "$SCHEME"
  -configuration Release
  -archivePath "$ARCHIVE"
  -destination "generic/platform=iOS"
  -allowProvisioningUpdates
  CODE_SIGN_STYLE=Automatic
  DEVELOPMENT_TEAM=MQTPNZFG93
)

if command -v xcpretty &>/dev/null; then
  "${XCODE_CMD[@]}" | xcpretty || true
else
  "${XCODE_CMD[@]}"
fi

[[ ! -d "$ARCHIVE" ]] && echo "❌ Archive falló — revisá el output de xcodebuild" && exit 1
echo "  Archive: $ARCHIVE"

# ── Export IPA ────────────────────────────────────────────────────────────────
echo ""
echo "Exportando IPA..."
mkdir -p "$EXPORT_DIR"
EXPORT_CMD=(
  xcodebuild -exportArchive
  -archivePath "$ARCHIVE"
  -exportOptionsPlist "$ROOT/ios/ExportOptions.plist"
  -exportPath "$EXPORT_DIR"
  -allowProvisioningUpdates
)

if command -v xcpretty &>/dev/null; then
  "${EXPORT_CMD[@]}" | xcpretty || true
else
  "${EXPORT_CMD[@]}"
fi

[[ ! -f "$IPA" ]] && echo "❌ Export falló — no se encontró $IPA" && exit 1
echo "  IPA: $IPA ($(du -sh "$IPA" | cut -f1))"

# ── Upload a App Store Connect ────────────────────────────────────────────────
if [[ "$SKIP_UPLOAD" == "false" ]]; then
  echo ""
  echo "Subiendo a App Store Connect..."
  P8_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${API_KEY}.p8"
  xcrun altool \
    --upload-app \
    -f "$IPA" \
    -t ios \
    --apiKey "$API_KEY" \
    --api-issuer "$API_ISSUER" \
    --p8-file-path "$P8_PATH"
else
  echo ""
  echo "⚠️  Upload omitido (credenciales no configuradas)."
  echo "   Para subir manualmente: xcrun altool --upload-app -f \"$IPA\" -t ios --apiKey S2WQKUX5M8 --api-issuer c2fc44ae-c581-4b31-b153-1eb4a9ab80f9 --p8-file-path ~/.appstoreconnect/private_keys/AuthKey_S2WQKUX5M8.p8"
fi

# ── Commit + Git tag ──────────────────────────────────────────────────────────
TAG="ios/v${VERSION}-${BUILD}"
cd "$ROOT"
git add "$PBXPROJ" "$APP_VER_FILE"
git commit -m "chore(ios): bump version ${VERSION} build ${BUILD}" 2>/dev/null || true
git --no-pager tag "$TAG" 2>/dev/null && echo "Tag creado: $TAG" || echo "Tag $TAG ya existe (ignorado)"

echo ""
echo "✅  Release iOS completo — v${VERSION} (build ${BUILD})"
echo ""
echo "Pasos siguientes:"
echo "  1. Esperar ~15-30 min a que procese en App Store Connect"
echo "  2. https://appstoreconnect.apple.com → TestFlight → enviar a revisión"
echo "  3. Pegar el changelog de APP STORE en 'What's New' (guardado en ${CHANGELOG_FILE_PATH:-build/changelogs/})"
echo "  4. Cuando Apple acepte: git push origin main && git push origin ${TAG}"

warn_platform_drift "$ROOT"
