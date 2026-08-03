# CLAUDE.md — KingdomKeeper Mobile (React Native)

> App móvil de **KingdomKeeper** (gestión de iglesias). Lee también
> `~/beslnet-labs/CLAUDE.md` (convenciones transversales) y
> `MOBILE_PUBLISHING_PLAYBOOK.md` antes de publicar.

## Stack real (verificado 2026-08-03)

| Capa | Tecnología |
|------|-----------|
| Framework | React Native **0.80.2** CLI (sin Expo) |
| Lenguaje | TypeScript |
| UI | **react-native-paper** (Material Design) — a diferencia de las otras apps del workspace |
| Navegación | React Navigation — drawer + bottom-tabs + **stack** (no native-stack) |
| Estado | Zustand (`src/store/`) |
| HTTP | Axios (`src/api/api.ts`, un módulo por dominio: miembros, finanzas, grupos, eventos…) |
| Push | Firebase Messaging + Notifee |
| Animación | Reanimated + gesture-handler + worklets |
| Tests | Jest (`src/__tests__/`) |

**Backend:** **Django** (no Rails, no Node), en `~/beslnet-labs/kingdomkeeper/kingdomkeeper-backend`.
Base URL de release: `https://app.kingdomkeeper.church`. Auth por JWT con refresh
(`POST /api/token/refresh/`).

**Identificadores:** package/bundle `com.kingdomkeeper.mobile` · App Store ID **`6760925086`**.

> ⚠️ Ese App Store ID estuvo como placeholder `id0000000000` en `src/version.ts` y en
> `ForceUpdateModal.tsx` **estando la app ya publicada**: el modal de actualización
> obligatoria —que no se puede descartar— mandaba a los usuarios de iOS a un 404.
> Corregido en `4307931` (ago-2026). Si agregas otro punto que abra la tienda, usa
> `STORE_URLS` de `src/version.ts`, no un literal.

## Publicar

```bash
./scripts/release-android.sh   # patch bump + AAB firmado
./scripts/release-ios.sh       # patch bump + archive + export + upload
```

Firma Android: propiedades `KINGDOMKEEPER_UPLOAD_*` en `~/.gradle/gradle.properties`
(fuera del repo, como manda la convención) y el `build.gradle` las lee bajo
`project.hasProperty(...)`, así que un build local sin ellas no explota: cae a debug —
y ese AAB **no sirve** para Play Store.

## ⚠️ Cosas a saber antes de tocar esto

### 1. Pushear a `main` del BACKEND es desplegar a producción

`kingdomkeeper-backend/.github/workflows/deploy.yml` corre con
`on: push: branches: [main]` y entra por SSH al droplet de DigitalOcean.
No hay comando de deploy local. **Este repo (mobile) no tiene workflows**, así que
pushear acá no despliega nada — pero no confundas los dos.

Vale la regla del workspace: el deploy lo ejecuta SIEMPRE el usuario. En este proyecto
eso significa que **el push al backend también**.

### 2. `src/config/maps.ts` NO se versiona

Lleva la API key de Google Maps y está en `.gitignore` (línea 78), con
`maps.example.ts` como plantilla. Si clonas limpio, cópialo antes de compilar o el
build falla por import faltante. **No lo agregues a git.**

### 3. La app está publicada hace meses

iOS `1.1.0` en App Store, Android `1.1.2` (versionCode 6). No es un proyecto en
desarrollo inicial: cualquier cambio en force-update, permisos o navegación afecta a
usuarios reales. Verifica contra la versión publicada antes de asumir el estado.

### 4. Ramas `copilot/*` sin integrar

Hay 3 con commits que no están en `main` (`fix-family-relationships-visuals`,
`fix-modal-header-visibility`, `implement-phase-1-kingdomkeeper`). Son trabajo abierto
de GitHub Copilot; no las mergees sin revisarlas.
