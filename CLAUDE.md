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

**Lo que toca a la app:** el force-update tiene tres mecanismos, y ninguno bloquea a nadie
por un fallo de red:

1. **Backend, 426 (ambas plataformas).** `MINIMUM_APP_VERSION` está en `env.clear` de
   `kingdomkeeper-backend/config/deploy.yml` (`1.2.0` desde el 2026-10-25; antes `1.1.0`); `core/middleware/app_version.py`
   lo compara con el header `X-App-Version` que manda `src/api/api.ts` y responde 426, que
   abre `ForceUpdateModal`. Subirlo es un deploy del backend, y deja fuera a quien no haya
   actualizado: antes, confirma que la versión nueva esté publicada en las DOS tiendas (ver
   punto 3).
2. **iOS, lookup del App Store** (`src/services/forceUpdate.ts`, desde la publicación que sigue a la 1.1.3): compara con
   la versión que publica Apple y avisa apenas sale, sin tocar el backend. La URL lleva
   `&t=<ahora>` (`appStoreLookupUrl`, con su test): Apple sirve el lookup con `max-age` ≈ 7 h
   y sin el parámetro el iPhone ve la versión anterior horas después del correo de
   «publicada». **No lo quites.**
3. **Android, mínimo por plataforma** (desde la publicación que sigue a la 1.1.3): `GET /api/public/app-version/`, que
   lee `MINIMUM_APP_VERSION_ANDROID` (en `deploy.yml`, `1.2.0` desde el 2026-10-25 = igual al general). Se
   sube DESPUÉS de que Play publique, y solo mueve a Android.

Una app de la 1.1.3 o anterior solo responde al 426 (y, en iOS, al lookup viejo, con hasta 7 h
de retraso): el mecanismo 3 y el parámetro anti-caché solo benefician a las versiones posteriores a la 1.1.3.

### 1b. Sesión: dónde vive cada token

El **refresh token (30 días) vive en el Keychain** (`react-native-keychain`, desde la publicación que sigue a la 1.1.3);
el access token (60 min), en AsyncStorage. Todo pasa por `src/utils/tokenStorage.ts`: no
vuelvas a leer ni escribir `access_token`/`refresh_token` directo en AsyncStorage.

- El backend rota el refresh token y revoca el anterior, así que `src/api/api.ts` comparte
  **un solo refresh** entre todas las peticiones que reciben 401; con un refresh por petición,
  el segundo recibía 401 y cerraba la sesión de un usuario válido.
- Cerrar sesión (`authStore.logout`) revoca el refresh token en `/api/token/logout/` y borra
  todo; `expireSession` hace lo mismo sin llamar al servidor, para sesiones ya vencidas.
- Un refresh token que sigue en AsyncStorage es de la 1.1.3: `checkAuth` lo migra al Keychain
  y, si el Keychain falla, lo deja donde está (mejor eso que desloguear).
- `dlog` (`src/utils/debugLogger.ts`) es el único logger: en release no escribe nada y reduce
  los errores de axios a mensaje y status. No uses `console.*` con un error de axios: arrastra
  el header `Authorization`.

### 2. `src/config/maps.ts` NO se versiona

Lleva la API key de Google Maps y está en `.gitignore` (línea 78), con
`maps.example.ts` como plantilla. Si clonas limpio, cópialo antes de compilar o el
build falla por import faltante. **No lo agregues a git.**

### 3. La app está publicada hace meses

iOS y Android en **`1.2.0` (build/versionCode 8)** (tags `ios/v1.2.0-8` y
`android/v1.2.0-8`, enviada a revisión el 16-oct). Contrastado el 2026-10-25: el lookup del App
Store devuelve `1.2.0` con fecha 2026-10-17 y la ficha pública de Play muestra `1.2.0`. El mínimo
pasó de `1.1.0` a `1.2.0` en `deploy.yml` el 2026-10-25 y rige desde el deploy del backend
siguiente: desde ahí una `1.1.x` recibe 426 y `1.2.0` pasa.

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
