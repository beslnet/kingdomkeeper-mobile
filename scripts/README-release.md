# Guía de configuración para releases automáticos

Este documento explica **dónde obtener** y **cómo guardar** las credenciales necesarias para usar los scripts `release-ios.sh` y `release-android.sh`. La configuración se hace una sola vez.

---

## iOS — App Store Connect API

### 1. Crear la API Key

1. Abre [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Haz clic en **"+"** para crear una nueva clave
3. Dale un nombre (ej. "KingdomKeeper CI") y rol **Developer** o **Admin**
4. Haz clic en **Generate**
5. Descarga el archivo `.p8` (⚠️ solo puedes descargarlo **una vez**)
6. Anota los valores que aparecen en pantalla:
   - **Key ID** → este es `iOS_API_KEY_ID` (ej. `ABC123DEF4`)
   - **Issuer ID** → arriba de la tabla, este es `iOS_API_ISSUER` (ej. `a1b2c3d4-...`)

### 2. Guardar el .p8

```bash
mkdir -p ~/.appstoreconnect/private_keys
cp ~/Downloads/AuthKey_XXXXXXXXXXX.p8 ~/.appstoreconnect/private_keys/
```

### 3. Guardar las variables en `~/.zshrc` (persistente)

```bash
# Agrega al final de ~/.zshrc:
export iOS_API_KEY_ID="ABC123DEF4"           # ← tu Key ID
export iOS_API_ISSUER="a1b2c3d4-e5f6-..."   # ← tu Issuer ID
```

Luego recarga: `source ~/.zshrc`

---

## Android — Keystore de firma

### 1. ¿Ya tienes un keystore?

Si ya publicaste en Play Store antes (ej. con la app armemos-futbol), **puede que tengas un `.jks` o `.keystore` guardado**. Búscalo con:

```bash
find ~ -name "*.jks" -o -name "*.keystore" 2>/dev/null | grep -v android/debug
```

Si **no tienes uno**, crea uno nuevo (solo la primera vez):

```bash
keytool -genkey -v \
  -keystore ~/keystores/kingdomkeeper.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias kingdomkeeper
```

Pon los datos que te pide (nombre, organización, ciudad, país). Guarda bien las contraseñas.

### 2. Guardar en `~/.gradle/gradle.properties` (persistente, recomendado)

Este archivo es global de Gradle y **nunca se commitea** al repo.

```bash
# Agrega al final de ~/.gradle/gradle.properties:
KINGDOMKEEPER_UPLOAD_STORE_FILE=/Users/benja/keystores/kingdomkeeper.jks
KINGDOMKEEPER_UPLOAD_KEY_ALIAS=kingdomkeeper
KINGDOMKEEPER_UPLOAD_STORE_PASSWORD=tu_password_del_keystore
KINGDOMKEEPER_UPLOAD_KEY_PASSWORD=tu_password_de_la_clave
```

> ⚠️ **Nunca subas este archivo ni el `.jks` a git.** El `.jks` es la llave para publicar; perderlo o filtrarlo es irreversible.

---

## Verificar que todo funciona

```bash
# iOS: solo verifica que el archivo .p8 esté en su lugar
ls ~/.appstoreconnect/private_keys/

# Android: verifica que la keystore existe y el alias es correcto
keytool -list -keystore ~/keystores/kingdomkeeper.jks
```

---

## Subir a las stores

```bash
# Después de que Google Play / App Store acepten el build:
git push origin main
git push origin ios/v1.0.2-3      # el tag que creó el script
git push origin android/v1.0.2-4
```
