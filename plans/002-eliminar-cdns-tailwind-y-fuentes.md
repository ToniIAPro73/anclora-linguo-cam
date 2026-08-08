# Plan 002: Eliminar Tailwind Play CDN y Google Fonts — self-host con dependencias open source

> **Executor instructions**: Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente paso.
> Si ocurre algo de la sección "STOP conditions", detente y reporta — no improvises.
> Al terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (ejecutar primero)**: `git diff --stat 2293004..HEAD -- index.html vite.config.ts package.json index.tsx`
> Si algún archivo in-scope cambió, compara los extractos de "Current state" con
> el código vivo; si no coinciden, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (regresiones visuales si el escaneo de clases falla)
- **Depends on**: plans/001-typecheck-baseline-y-saneo-npm.md (usa su gate de verificación)
- **Category**: security / perf / migration
- **Planned at**: commit `2293004`, 2026-06-12

## Why this matters

`index.html` carga `https://cdn.tailwindcss.com` (el Play CDN) en producción.
Tailwind lo prohíbe explícitamente para producción: compila el CSS en runtime en
el navegador (CPU + flash sin estilos), es un punto único de fallo externo y un
riesgo de cadena de suministro (script de terceros con control total del DOM en
una app que pide cámara y micrófono). Además importa la fuente Inter desde
Google Fonts, lo que envía la IP de cada visitante a Google — un problema GDPR
documentado (sentencia LG München, 2022) en un producto con páginas legales para
inversores europeos. El propio `AGENTS.md` ya lo pide: "eliminar dependencias
criticas cargadas por CDN si impactan seguridad/compliance". La solución es 100%
open source: Tailwind como dependencia de build y la fuente vía Fontsource.

## Current state

- `index.html:8` — `<script src="https://cdn.tailwindcss.com"></script>`
- `index.html:10` — dentro de `<style>`:
  `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');`
- `index.html:9-90` — bloque `<style>` con CSS propio: reglas para `html, body`,
  `#root`, `.video-grid` (+ media query 768px), `.video-box`, `.subtitle-area`,
  `.subtitle-bubble`, `@keyframes subtitle-in`, `.glass-panel`. Este CSS se conserva.
- `index.tsx` — entrypoint React; no importa ningún CSS hoy.
- `vite.config.ts` — plugins: `[react()]`. Sin plugin de Tailwind.
- `package.json` — no hay `tailwindcss` ni paquete de fuentes. Las clases
  utilitarias se usan por todo el código (`App.tsx`, `components/*.tsx`),
  incluidas variantes arbitrarias como `max-[820px]:p-2` (`SettingsModal.tsx`,
  `CallSetup.tsx`) — Tailwind v4 las soporta.
- La app usa clases dinámicas SOLO por interpolación de strings completos de
  clase (p. ej. ternarios que eligen entre dos literales), patrón compatible con
  el escaneo estático de Tailwind.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Install   | `npm install <pkg>`| exit 0              |
| Typecheck | `npm run typecheck`| exit 0              |
| Build     | `npm run build`    | exit 0              |
| E2E       | `npm run test:e2e` | todos los tests pasan |
| Dev       | `npm run dev`      | sirve en :3000      |

## Scope

**In scope**:
- `index.html`
- `index.css` (crear)
- `index.tsx` (añadir import del CSS)
- `vite.config.ts`
- `package.json`, `package-lock.json`

**Out of scope**:
- Cambiar cualquier clase utilitaria en `App.tsx` o `components/` — si una clase
  no se renderiza igual, es un bug de configuración, no de los componentes.
- `@fortawesome/fontawesome-free` — ya es dependencia npm; no tocar cómo se carga.
- Reescribir el CSS custom del `<style>` a utilidades Tailwind.

## Git workflow

- Rama: `fix/002-selfhost-tailwind-fonts` desde `development`.
- Commits convencionales, p. ej. `fix(build): replace Tailwind Play CDN with build-time Tailwind v4`.
- No push/PR sin instrucción del operador.

## Steps

### Step 1: Instalar dependencias

```bash
npm install tailwindcss @tailwindcss/vite
npm install @fontsource-variable/inter
```

**Verify**: `node -e "require.resolve('@tailwindcss/vite')" && node -e "require.resolve('@fontsource-variable/inter')"` → exit 0

### Step 2: Registrar el plugin de Vite

En `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
// ...
plugins: [react(), tailwindcss()],
```

**Verify**: `npm run typecheck` → exit 0

### Step 3: Crear index.css y migrar el CSS inline

Crea `index.css` en la raíz con, en este orden:
1. `@import "tailwindcss";`
2. Todo el CSS del bloque `<style>` de `index.html` EXCEPTO la línea
   `@import url('https://fonts.googleapis.com/...')`. Copia las reglas tal cual
   (html/body, #root, .video-grid, .video-box, .subtitle-area, .subtitle-bubble,
   @keyframes subtitle-in, .glass-panel).

En `index.tsx`, añade como primeros imports:

```ts
import '@fontsource-variable/inter';
import './index.css';
```

`@fontsource-variable/inter` registra `font-family: 'Inter Variable'`. En
`index.css`, en la regla `body`, cambia
`font-family: 'Inter', sans-serif;` por
`font-family: 'Inter Variable', 'Inter', sans-serif;`.

**Verify**: `npm run build` → exit 0

### Step 4: Limpiar index.html

Elimina de `index.html`: la línea del script `cdn.tailwindcss.com` y todo el
bloque `<style>...</style>` (ya migrado). No toques el resto del documento.

**Verify**: `grep -c "cdn.tailwindcss.com\|fonts.googleapis.com" index.html` → `0`

### Step 5: Verificación visual y E2E

1. `npm run build` → exit 0. Comprueba que `dist/assets/` contiene un `.css`
   con utilidades generadas: `grep -l "video-grid" dist/assets/*.css` devuelve
   un archivo, y ese mismo archivo contiene clases utilitarias usadas en la app
   (p. ej. `grep -c "rounded-xl" dist/assets/*.css` ≥ 1).
2. Comprueba que la fuente quedó embebida: `ls dist/assets/ | grep -ci "inter"` ≥ 1.
3. `npm run test:e2e` → todos pasan (los tests `viewport-no-scroll.e2e.ts` y
   `call-captions.e2e.ts` validan layout y flujo real; son el detector de
   regresiones visuales de este plan).

**Verify**: los tres puntos anteriores.

## Test plan

Sin tests unitarios nuevos. La cobertura de regresión es la suite E2E existente
(`e2e/*.e2e.ts`), que arranca la app real y valida layout (footer-gap, viewport)
y flujo de llamada con subtítulos.

## Done criteria

- [ ] `grep -rn "cdn.tailwindcss.com\|fonts.googleapis.com" index.html index.tsx index.css` → sin resultados
- [ ] `npm run build` exit 0 y `dist/` contiene CSS y fuente autohospedados
- [ ] `npm run test:e2e` exit 0
- [ ] `npm run typecheck` y `npm run lint` exit 0
- [ ] Sin archivos modificados fuera del scope (`git status`)
- [ ] Fila actualizada en `plans/README.md`

## STOP conditions

- Tras el paso 5, alguna vista pierde estilos de forma evidente en el E2E
  (tests de viewport fallan) y no se explica por una clase dinámica construida
  por concatenación parcial — reporta el componente y la clase exacta.
- Encuentras clases construidas por concatenación parcial de strings (p. ej.
  `` `p-${size}` ``) — el escaneo estático no las verá; lista los sitios y para.
- `@tailwindcss/vite` no es compatible con la versión de Vite instalada (hoy
  Vite ^6.2.0; requiere Vite 5/6+) — reporta versiones exactas en conflicto.

## Maintenance notes

- A partir de ahora toda clase Tailwind debe existir como literal completo en el
  código fuente (regla estándar de Tailwind compilado).
- Si se añade contenido en nuevas carpetas raíz, Tailwind v4 las detecta
  automáticamente salvo que estén en `.gitignore`.
- Revisor: comparar capturas antes/después de CallSetup, llamada activa y
  páginas legales (hay capturas de referencia en `qa/legal-audit-screenshots/`).
- Beneficio colateral: desaparece la dependencia de red de terceros en runtime —
  la app funciona íntegra en redes restringidas (relevante para llamadas con
  inversores tras VPN/proxy corporativo).
