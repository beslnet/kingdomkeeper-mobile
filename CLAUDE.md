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

### 1. El deploy lo corre SIEMPRE el usuario — y pushear ya NO despliega

Desde el 2026-10-01, backend (Django) y frontend (React) se despliegan con **Kamal** al
droplet `apps-nexoit` (`24.199.65.173`), con el `config/deploy.yml` de cada repo.
**Primero el frontend, después el backend:** comparten `app.kingdomkeeper.church` por
rutas y kamal-proxy exige que el TLS lo declare el servicio de la raíz (el frontend); el
backend tiene `ssl: false` a propósito.

```bash
cd ~/beslnet-labs/kingdomkeeper/kingdomkeeper-frontend
source .env.kamal
kamal deploy
```

```bash
cd ~/beslnet-labs/kingdomkeeper/kingdomkeeper-backend
source .env.kamal
kamal deploy
```

Los `.github/workflows/deploy.yml` del backend y del frontend quedaron solo con
`workflow_dispatch`: apuntan al droplet anterior y sus secrets se borraron. Así que
**pushear a `main` no despliega en ninguno de los tres repos** (este no tiene workflows)
y vale la regla general del workspace: agrupar pushes.

Regla del workspace: el agente deja el commit (y el push, solo si se autorizó) y le
pasa al usuario el comando exacto. Nunca `kamal deploy` ni nada que reinicie
producción; un "ok" general no autoriza el deploy.

**Lo que toca a la app:** el force-update lo decide el backend. `MINIMUM_APP_VERSION`
está en `env.clear` de `kingdomkeeper-backend/config/deploy.yml` (hoy `1.1.0`);
`core/middleware/app_version.py` lo compara con el header `X-App-Version` que manda
`src/api/api.ts` y responde 426, que abre `ForceUpdateModal`. Subir ese mínimo es un
deploy del backend, y deja fuera a quien no haya actualizado: antes, confirma que la
versión nueva esté publicada en las DOS tiendas (ver punto 3).

### 2. `src/config/maps.ts` NO se versiona

Lleva la API key de Google Maps y está en `.gitignore` (línea 78), con
`maps.example.ts` como plantilla. Si clonas limpio, cópialo antes de compilar o el
build falla por import faltante. **No lo agregues a git.**

### 3. La app está publicada hace meses

iOS y Android en **`1.1.3` (build/versionCode 7)** (tags `ios/v1.1.3-7` y
`android/v1.1.3-7`, del 7–8 de agosto). Contrastado el 2026-10-12: el lookup del App Store
devuelve `1.1.3` con fecha 2026-08-08 y la ficha pública de Play muestra `1.1.3` (el
versionCode no se ve desde afuera y no se miró Play Console). El mínimo que exige
producción es `1.1.0`: `1.0.9` recibe 426, `1.1.0` pasa.

No es un proyecto en desarrollo inicial: cualquier cambio en force-update, permisos o
navegación afecta a usuarios reales. Verifica contra la versión publicada antes de
asumir el estado (el `t=` esquiva la caché del lookup):

```bash
curl -s "https://itunes.apple.com/lookup?id=6760925086&country=cl&t=$(date +%s)"
```

Play no tiene un lookup público equivalente: Play Console.

Las plataformas ya se desalinearon una vez: iOS se quedó en `1.1.0` desde el 2026-05-29
hasta el 1.1.3 de agosto, mientras Android pasaba por `1.1.1` y `1.1.2`. Desde
`1660d16`, `scripts/version-check.sh` avisa al terminar cada release si
`MARKETING_VERSION` y `versionName` difieren.

### 4. Ramas `copilot/*` sin integrar

Hay 3 con commits que no están en `main` (`fix-family-relationships-visuals`,
`fix-modal-header-visibility`, `implement-phase-1-kingdomkeeper`). Son trabajo abierto
de GitHub Copilot; no las mergees sin revisarlas.
