#!/usr/bin/env bash
# version-check.sh — Chequeos de coherencia entre plataformas.
#
# Uso interno (llamado por release-android.sh y release-ios.sh):
#   source scripts/version-check.sh
#   warn_platform_drift "$ROOT"

# Avisa si las dos plataformas quedaron en versiones distintas. No es un error
# —publicar una sola es legítimo— pero es fácil dar el release por cerrado
# habiendo liberado solo una. Se llama al final de cada script de release.
#
# Nació de un caso real: KingdomKeeper iOS se quedó en 1.1.0 desde mayo-2026
# mientras Android avanzaba a 1.1.1 y 1.1.2. Dos meses con el arreglo del link
# de actualización sin llegar a un solo usuario de iPhone, sin que nada avisara.
#
# Uso: warn_platform_drift <ROOT>
warn_platform_drift() {
  local root="$1"
  local ios android
  ios=$(grep 'MARKETING_VERSION' "$root/ios/kingdomkeeperMobile.xcodeproj/project.pbxproj" 2>/dev/null \
        | head -1 | grep -oE '[0-9]+(\.[0-9]+){1,2}' || true)
  android=$(grep 'versionName' "$root/android/app/build.gradle" 2>/dev/null \
        | grep -oE '"[^"]+"' | tr -d '"' || true)

  if [[ -n "$ios" && -n "$android" && "$ios" != "$android" ]]; then
    echo ""
    echo "⚠️  Las plataformas quedaron desalineadas: iOS ${ios} · Android ${android}."
    echo "   No es un error si publicaste una sola. Si querías liberar las dos,"
    echo "   corre el otro script antes de dar el release por cerrado."
  fi
}
