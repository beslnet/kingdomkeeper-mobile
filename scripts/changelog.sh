#!/usr/bin/env bash
# changelog.sh — Genera release notes desde el último tag git
#
# Uso interno (llamado por release-android.sh y release-ios.sh):
#   source scripts/changelog.sh
#   generate_changelog "$VERSION"
#
# También ejecutable directamente para preview:
#   ./scripts/changelog.sh 1.0.2

_capitalize() {
  echo "$1" | awk '{print toupper(substr($0,1,1)) substr($0,2)}'
}

_clean_prefix() {
  local line="$1"
  echo "$line" \
    | sed 's/^feat([^)]*): *//' \
    | sed 's/^feat: *//' \
    | sed 's/^fix([^)]*): *//' \
    | sed 's/^fix: *//' \
    | sed 's/^security([^)]*): *//' \
    | sed 's/^security: *//' \
    | sed 's/^refactor([^)]*): *//' \
    | sed 's/^refactor: *//'
}

generate_changelog() {
  local version="${1:-}"
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  # Desde el último tag publicado; si no hay, últimos 40 commits
  local since_ref
  since_ref=$(git --no-pager tag --sort=-creatordate 2>/dev/null | head -1)
  if [[ -z "$since_ref" ]]; then
    since_ref=$(git --no-pager log --skip=2 --max-count=1 --format='%H' -- src/utils/appVersion.ts 2>/dev/null)
  fi

  local raw_commits
  if [[ -n "$since_ref" ]]; then
    raw_commits=$(git --no-pager log "${since_ref}..HEAD" --format='%s' 2>/dev/null)
  else
    raw_commits=$(git --no-pager log --max-count=40 --format='%s' 2>/dev/null)
  fi

  local feats=() fixes=() security=()

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if echo "$line" | grep -qiE '^(chore|docs|test|ci|build|revert)\b|bump version|bump build|auto-bumped|changelog|release.script'; then
      continue
    fi

    local cleaned
    cleaned=$(_capitalize "$(_clean_prefix "$line")")

    if echo "$line" | grep -qiE '^security(\([^)]*\))?:'; then
      security+=("$cleaned")
    elif echo "$line" | grep -qiE '^feat(\([^)]*\))?:'; then
      feats+=("$cleaned")
    elif echo "$line" | grep -qiE '^fix(\([^)]*\))?:'; then
      fixes+=("$cleaned")
    else
      if echo "$line" | grep -qiE '(screen|dashboard|offline|drawer|membr|banner|search|navigation|notif|iglesia|visita|login|sesion|push)'; then
        feats+=("$cleaned")
      fi
    fi
  done <<< "$raw_commits"

  # App Store (máx 4000c)
  local long_notes="Novedades en v${version}"$'\n\n'
  if [[ ${#feats[@]} -gt 0 ]]; then
    long_notes+="Mejoras"$'\n'
    for item in "${feats[@]+"${feats[@]}"}"; do long_notes+="• ${item}"$'\n'; done
    long_notes+=$'\n'
  fi
  if [[ ${#fixes[@]} -gt 0 ]]; then
    long_notes+="Correcciones"$'\n'
    for item in "${fixes[@]+"${fixes[@]}"}"; do long_notes+="• ${item}"$'\n'; done
    long_notes+=$'\n'
  fi
  if [[ ${#security[@]} -gt 0 ]]; then
    long_notes+="Seguridad"$'\n'
    for item in "${security[@]+"${security[@]}"}"; do long_notes+="• ${item}"$'\n'; done
    long_notes+=$'\n'
  fi
  if [[ ${#feats[@]} -eq 0 && ${#fixes[@]} -eq 0 && ${#security[@]} -eq 0 ]]; then
    long_notes+="• Mejoras generales de estabilidad y rendimiento."$'\n'
  fi

  # Play Store (máx 500c)
  local short_notes="v${version}:"$'\n'
  local all_items=("${feats[@]+"${feats[@]}"}" "${fixes[@]+"${fixes[@]}"}") 
  for item in "${all_items[@]+"${all_items[@]}"}"; do
    local candidate="${short_notes}• ${item}"$'\n'
    [[ ${#candidate} -lt 480 ]] && short_notes="$candidate"
  done
  if [[ ${#short_notes} -le $((${#version} + 5)) ]]; then
    short_notes+="• Mejoras generales de estabilidad y rendimiento."$'\n'
  fi

  CHANGELOG_PLAYSTORE="$short_notes"
  CHANGELOG_APPSTORE="$long_notes"

  local out_dir="$root/build/changelogs"
  mkdir -p "$out_dir"
  CHANGELOG_FILE_PATH="$out_dir/v${version}.txt"

  {
    echo "════════════════════════════════════════"
    echo "  GOOGLE PLAY — Novedades (max 500c)"
    echo "════════════════════════════════════════"
    echo "$CHANGELOG_PLAYSTORE"
    echo ""
    echo "════════════════════════════════════════"
    echo "  APP STORE — What's New (max 4000c)"
    echo "════════════════════════════════════════"
    echo "$CHANGELOG_APPSTORE"
  } > "$CHANGELOG_FILE_PATH"

  echo ""
  echo "════════════════════════════════════════"
  echo "  GOOGLE PLAY ($(echo -n "$CHANGELOG_PLAYSTORE" | wc -c | tr -d ' ')c / 500c)"
  echo "════════════════════════════════════════"
  echo "$CHANGELOG_PLAYSTORE"
  echo "════════════════════════════════════════"
  echo "  APP STORE ($(echo -n "$CHANGELOG_APPSTORE" | wc -c | tr -d ' ')c / 4000c)"
  echo "════════════════════════════════════════"
  echo "$CHANGELOG_APPSTORE"
  echo "Changelog guardado en: $CHANGELOG_FILE_PATH"
  echo ""
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  VERSION="${1:-}"
  if [[ -z "$VERSION" ]]; then
    echo "Uso: $0 <version>  (ej: $0 1.0.2)"
    exit 1
  fi
  cd "$(dirname "$0")/.."
  generate_changelog "$VERSION"
fi
