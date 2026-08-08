# Plan 001: Restablecer el baseline de typecheck y sanear dependencias npm

> **Executor instructions**: Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente paso.
> Si ocurre algo de la sección "STOP conditions", detente y reporta — no improvises.
> Al terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (ejecutar primero)**: `git diff --stat 2293004..HEAD -- tsconfig.json package.json hooks/useRecording.ts components/CallSetup.tsx components/SettingsModal.tsx .github/workflows/ci.yml`
> Si algún archivo in-scope cambió desde que se escribió este plan, compara los
> extractos de "Current state" con el código vivo antes de continuar; si no
> coinciden, trátalo como condición de STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / bug
- **Planned at**: commit `2293004`, 2026-06-12

## Why this matters

`npx tsc --noEmit` falla hoy con 8 errores y nada lo detecta: `vite build` no
ejecuta el compilador de TypeScript y no existe script `typecheck` ni paso de CI.
Eso significa que el compilador está apagado como red de seguridad en un proyecto
que AGENTS.md declara "Type Safety: código completamente tipado". Además,
`npm audit` reporta 12 vulnerabilidades (1 crítica, 5 high) en dependencias de
desarrollo (rollup, picomatch, postcss) con fix disponible sin breaking changes.
Este plan restablece ambas líneas base y las convierte en gate de CI.

## Current state

- `tsconfig.json` — `compilerOptions.types` es `["node"]`; falta `"vite/client"`,
  por eso `import.meta.env` no tipa:
  - `App.tsx:328` → `error TS2339: Property 'env' does not exist on type 'ImportMeta'`
  - `constants.ts:4` → mismo error
- `hooks/useRecording.ts:1` — `import { useRef, useState } from 'react';` pero las
  líneas 4-6 usan el namespace `React.RefObject<...>` sin importarlo:
  ```ts
  // hooks/useRecording.ts:4-6
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  ```
  → 3 × `error TS2503: Cannot find namespace 'React'`
- `components/CallSetup.tsx:109-111` y `components/SettingsModal.tsx:45-52` —
  `Object.entries(qualityProfiles).map(([key, profile]) => ...)` infiere `profile`
  como `unknown` pese a que la prop está tipada `Record<string, QualityProfile>`
  (`CallSetup.tsx:20`, `SettingsModal.tsx:14`):
  - `CallSetup.tsx:110` → `TS2339: Property 'label' does not exist on type 'unknown'`
  - `SettingsModal.tsx:51-52` → `TS2339` en `label` y `maxBitrate`
- `package.json` — scripts actuales: `dev`, `build`, `preview`, `lint`,
  `test` (`vitest run --passWithNoTests`), `test:e2e`, `test:e2e:network`.
  No hay `typecheck`.
- `.github/workflows/ci.yml` — job `checks` con pasos: Checkout → Setup Node 22 →
  Setup Python → `npm ci` → `npm run lint` → `npm run test` → `npm run build` →
  Playwright. No hay paso de typecheck.
- `npm audit` (2026-06-12): 12 vulnerabilidades (6 moderate, 5 high, 1 critical),
  todas en devDependencies transitivas (picomatch 4.0.0-4.0.3, postcss <8.5.10,
  rollup 4.0.0-4.58.0, minimatch). `npm audit --omit=dev` → 0. Todas dicen
  "fix available via `npm audit fix`" (sin `--force`).

## Commands you will need

| Purpose   | Command                | Expected on success            |
|-----------|------------------------|--------------------------------|
| Install   | `npm ci`               | exit 0                         |
| Typecheck | `npx tsc --noEmit`     | exit 0, sin errores            |
| Lint      | `npm run lint`         | exit 0                         |
| Tests     | `npm run test`         | exit 0 (suites en `utils/`)    |
| Build     | `npm run build`        | exit 0, genera `dist/`         |
| Audit     | `npm audit`            | 0 high / 0 critical            |

## Scope

**In scope** (únicos archivos a modificar):
- `tsconfig.json`
- `package.json`, `package-lock.json` (script nuevo + `npm audit fix`)
- `hooks/useRecording.ts`
- `components/CallSetup.tsx`
- `components/SettingsModal.tsx`
- `.github/workflows/ci.yml`

**Out of scope** (NO tocar aunque parezca relacionado):
- `App.tsx` — el error de `App.tsx:328` se corrige solo con el cambio de
  `tsconfig.json`; no edites App.tsx.
- Activar `strict: true` en tsconfig — generaría cientos de errores; queda
  explícitamente diferido.
- Subir versiones major de dependencias (`npm audit fix --force`) — prohibido.

## Git workflow

- Rama base: `development`. Crea `fix/001-typecheck-baseline` desde `development`.
- Conventional commits (convención del repo), p. ej.:
  `fix(types): add vite/client types and fix tsc errors` y
  `chore(deps): npm audit fix for dev dependencies`.
- No hagas push ni abras PR salvo que el operador lo indique.

## Steps

### Step 1: Añadir tipos de Vite al tsconfig

En `tsconfig.json`, cambia `"types": ["node"]` por `"types": ["node", "vite/client"]`.

**Verify**: `npx tsc --noEmit 2>&1 | grep -c "ImportMeta"` → `0`

### Step 2: Corregir el namespace React en useRecording

En `hooks/useRecording.ts`, cambia la línea 1 a
`import { useRef, useState, type RefObject } from 'react';` y sustituye los tres
`React.RefObject<...>` de las líneas 4-6 por `RefObject<...>`.

**Verify**: `npx tsc --noEmit 2>&1 | grep -c "useRecording"` → `0`

### Step 3: Tipar los map de qualityProfiles

En `components/CallSetup.tsx` (línea ~109) y `components/SettingsModal.tsx`
(línea ~45), anota explícitamente el callback del map:

```tsx
{(Object.entries(qualityProfiles) as Array<[string, QualityProfile]>).map(([key, profile]) => (
```

`QualityProfile` ya está definida/disponible en ambos archivos (interfaz local en
`CallSetup.tsx:5`; comprueba el equivalente en `SettingsModal.tsx`). Si en alguno
de los dos no existe el símbolo `QualityProfile`, decláralo igual que en
`CallSetup.tsx:5-10` en lugar de importar desde `App.tsx`.

**Verify**: `npx tsc --noEmit` → exit 0, salida vacía

### Step 4: Añadir script typecheck y gate de CI

1. En `package.json`, añade a `scripts`: `"typecheck": "tsc --noEmit"`.
2. En `.github/workflows/ci.yml`, dentro del job `checks`, añade entre el paso
   `Lint` y `Unit tests`:
   ```yaml
   - name: Typecheck
     run: npm run typecheck
   ```

**Verify**: `npm run typecheck` → exit 0

### Step 5: Sanear dependencias de desarrollo

Ejecuta `npm audit fix` (SIN `--force`). Revisa el diff de `package-lock.json`:
solo deben cambiar versiones patch/minor de paquetes dev transitivos
(picomatch, postcss, rollup, minimatch y dependientes).

**Verify**:
- `npm audit 2>&1 | tail -3` → `0 high`/`0 critical` (moderate residuales aceptables; documenta cuáles quedan en el commit)
- `npm run test && npm run build` → ambos exit 0

## Test plan

No se escriben tests nuevos: este plan crea el gate que protege a los demás.
Verificación completa = `npm run lint && npm run typecheck && npm run test && npm run build`, todo exit 0.

## Done criteria

- [ ] `npx tsc --noEmit` exit 0
- [ ] `package.json` contiene el script `typecheck`
- [ ] `.github/workflows/ci.yml` contiene el paso `Typecheck`
- [ ] `npm audit` sin high ni critical
- [ ] `npm run test` y `npm run build` exit 0
- [ ] `git status` no muestra archivos modificados fuera del scope
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- Tras los pasos 1-3, `npx tsc --noEmit` sigue mostrando errores en archivos NO
  listados en "Current state" → repórtalos, no los arregles sobre la marcha.
- `npm audit fix` quiere cambiar una versión major de cualquier paquete o
  modifica `dependencies` (no-dev) → revierte y reporta.
- `npm run build` o `npm run test` fallan después del paso 5 → revierte el
  lockfile (`git checkout package-lock.json && npm ci`) y reporta.

## Maintenance notes

- Cualquier plan posterior usa `npm run typecheck` como gate — este plan debe
  aterrizar primero.
- Diferido a futuro: `strict: true` (o al menos `noImplicitAny`) en tsconfig;
  hoy hay ~20 `any` en App.tsx que lo bloquean.
- Revisor: confirmar que el paso de CI corre antes que el build para fallar rápido.
