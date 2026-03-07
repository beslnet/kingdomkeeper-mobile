# Copilot Instructions – KingdomKeeper Mobile

## Commands

```bash
# Run Metro bundler
npm start

# Run on device/simulator
npm run ios
npm run android

# Lint
npm run lint

# Tests (full suite)
npm test

# Run a single test file
npx jest src/__tests__/permissionsStore.test.ts

# Run tests matching a name pattern
npx jest --testNamePattern="<pattern>"
```

## Architecture Overview

KingdomKeeper Mobile is a React Native (0.80) TypeScript app for church management. It is **multi-tenant**: a user may belong to multiple churches ("iglesias"), and the active church is selected at login and stored globally.

### Auth & Routing Flow

`App.tsx` drives routing via two Zustand store values:
- `isLoggedIn` (authStore) → shows `AuthNavigator` or `AppNavigator`
- `iglesiaId` (iglesiaStore) → if logged in but no church selected, shows church-picker screen

On app mount, `checkAuth()` restores persisted session from AsyncStorage. On logout, all three stores are reset.

### State Management

Three **Zustand** stores, all persisted to AsyncStorage via the `persist` middleware:

| Store | Key Responsibilities |
|---|---|
| `authStore` | user, token, refresh token, list of iglesias, login/logout |
| `iglesiaStore` | active `iglesiaId` + `iglesiaNombre` |
| `permissionsStore` | roles array, module-level permissions, helper methods |

Stores live in `src/store/`. Import directly: `useAuthStore()`, `useIglesiaStore()`, `usePermissionsStore()`.

### API Layer

All API clients live in `src/api/`. They use axios instances configured with two interceptors:
1. **Request**: injects `Authorization: Bearer <token>` and `X-IGLESIA-ID: <iglesiaId>` on every request.
2. **Response**: handles `401` by attempting a token refresh; on failure, calls `logout()` and redirects to auth.

Never call `fetch` directly — always go through the axios clients in `src/api/`.

### Navigation Structure

React Navigation v7 with a nested hierarchy:

```
RootNavigator
├── AuthNavigator          (Stack: Login, ForgotPassword)
└── AppNavigator           (Stack wrapping drawer + detail screens)
    └── MainDrawer         (Custom drawer, permission-gated menu items)
        ├── MainTabs       (Bottom tabs: Dashboard, Inbox, …)
        ├── GruposStack    (Nested stack for grupos/células)
        └── ProfileStack
```

Navigation types are declared in `src/types/navigation.ts`. Always use typed `useNavigation<NavigationProp<RootStackParamList>>()` and `useRoute<RouteProp<…>>()`.

### Permission System

`permissionsStore` exposes:
- `hasPermission(module, action)` – checks a specific action within a module
- `canAccess(module)` – checks if the user has any access to a module
- `hasRole(role)` / `hasAnyRole(roles[])` – role-based checks
- Super-admin role bypasses all permission checks automatically

Modules: `membresia`, `grupos`, `finanzas`, `pastoral`, `inventario`, `comunicaciones`, `eventos`.

Guard UI elements and navigation menu items using these helpers — don't read the raw `roles` or `permissions` arrays directly.

## Key Conventions

### File & Component Naming
- Screens are PascalCase files in `src/screens/` (flat, not co-located with routes)
- Nested feature screens go in subdirectories, e.g. `src/screens/grupos/`
- Hooks are camelCase in `src/hooks/`, prefixed with `use`

### Styling
- Use `StyleSheet.create()` — no styled-components, no NativeWind
- Design tokens (colors, theme) are in `src/theme/`; always import from there instead of hardcoding hex values
- Primary palette: `#002F6C` (dark blue), `#F2C75C` (yellow)
- Use React Native Paper components (`Button`, `TextInput`, `Card`, etc.) for standard UI; they're already themed

### TypeScript
- No path aliases — use relative imports
- All navigation param types are centralized in `src/types/navigation.ts`; add new screens there
- Environment variable types are declared in `src/types/env.d.ts`

### Error Handling
- Wrap API calls in `try/catch`; show `Alert.alert()` for user-facing errors
- Use a loading boolean state (`isLoading`) to show activity indicators during async operations

### Tests
- Jest with `react-native` preset; test files live alongside source in `src/__tests__/`
- Mock API modules with `jest.mock('../api/...')`; test store logic by calling store actions directly and asserting state
