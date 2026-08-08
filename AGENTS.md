<!-- ANCLORA-ECOSYSTEM-CONTEXT-START -->

## Contexto de ecosistema Anclora

Antes de modificar este repositorio, todo agente debe leer:

- `.anclora/global/ANCLORA_ECOSYSTEM_CONTEXT.md`
- `.anclora/global/GLOBAL_AGENT_WORKFLOW.md`
- `.anclora/AGENT_PROJECT_CONTEXT.md`
- `MEMORY.md`

La arquitectura estable del ecosistema se define en:

`Boveda-Anclora/contracts/core/ANCLORA_ECOSYSTEM_ARCHITECTURE_CONTRACT.md`

No asumir infraestructura compartida entre productos. Validar siempre hosting, backend, base de datos, auth, variables y ramas.

<!-- ANCLORA-ECOSYSTEM-CONTEXT-END -->

# AGENTS.md

## Contexto del producto

- Este repositorio implementa una app de videollamadas con traduccion en tiempo real.
- Objetivo de negocio: conectar inversores inmobiliarios que compran o venden propiedades mediante **Anclora Private Estates**, sin friccion por idioma.
- Toda decision tecnica debe priorizar: fiabilidad de llamada, comprension mutua, privacidad y rapidez de cierre comercial.

## Estructura del proyecto

- Frontend (Vite + React + TypeScript):
  - `App.tsx`: orquestacion principal de llamada, subtitulos, chat, controles y estados.
  - `components/`: UI modular (`CallSetup`, `VideoGrid`, `ChatSidebar`, `ControlBar`, etc.).
  - `hooks/`: logica reusable (`useStreamingTranslation`, `useRecording`, `useWebRtcStats`).
  - `utils/`: utilidades de audio y metricas WebRTC.
  - `constants.ts`, `types.ts`: configuracion y tipos compartidos.
  - `audio-worklet-processor.js`: procesamiento de audio (PCM + VAD simple) en AudioWorklet.
- Infra/servicios:
  - `services/asr-mt/`: microservicio FastAPI WebSocket para ASR/MT (mock + backends reales).
  - `webrtc/peer-server/`: servidor PeerJS de signaling.
  - `infra/turn/`: configuracion base para coturn (TURN/STUN).
- Documentacion:
  - `docs/architectura-low-cost.md`: propuesta low-cost de arquitectura.

## Comandos de desarrollo

- `npm install`: instala dependencias frontend.
- `npm run dev`: inicia Vite en local.
- `npm run lint`: validacion estatica con ESLint.
- `npm run test`: ejecuta Vitest (actualmente sin suites o con suites minimas).
- `npm run build`: build de produccion en `dist/`.
- `npm run preview`: previsualiza build local.

## Convenciones de codigo

- React funcional con hooks; evitar componentes clase.
- Sangria de 2 espacios.
- Nombres:
  - `PascalCase`: componentes, interfaces/types.
  - `camelCase`: variables, funciones, hooks internos.
  - `UPPER_SNAKE_CASE`: constantes globales.
- Mantener cambios pequenos, acotados y consistentes con el estilo existente.

## Fase 5 — Commercial UX (implementado)

- **Modo bajo ancho de banda**: toggle en `SettingsModal` desactiva el video y mantiene
  audio + subtitulos. Se sugiere cuando `packetLoss >= 8%` o `jitter >= 200ms`.
  El ultimo codigo de sala se persiste en `localStorage`.
- **Accesibilidad de subtitulos**: tamaño (S/M/L/XL), posicion (bottom/top) y contraste
  (normal/high) configurables durante la llamada. Los overlays exponen `aria-live="polite"`.
  La animacion respeta `prefers-reduced-motion`.
- **Recuperacion de conexion**: overlay visible cuando `peerConnectionState === 'down'`
  guia al usuario a finalizar la llamada.
- Tipos exportados: `CaptionSize`, `CaptionPosition`, `CaptionContrast`
  en `components/VideoGrid.tsx`.

## Guia de cambios

- Antes de modificar:
  - revisar impacto en flujo de llamada activa (audio/video/subtitulos/chat).
  - validar que no se rompe UX en movil y escritorio.
- Al modificar logica de audio/traduccion:
  - verificar latencia percibida, cortes de subtitulos y consumo de red.
- Al modificar WebRTC:
  - considerar ICE, NAT traversal, degradacion de red y fallback.
- Al modificar `SettingsModal`: actualizar tipos y props en `App.tsx` y `VideoGrid.tsx`.

## Testing y validacion minima

- No hay cobertura amplia automatizada hoy.
- Validacion minima obligatoria para cambios funcionales:
  - `npm run lint`
  - `npm run build`
  - prueba manual de llamada 1:1 (audio, video, subtitulos, chat, colgar).
- Si se agregan pruebas:
  - preferir `*.test.ts`/`*.test.tsx` colocalizados o en `tests/`.
  - documentar comando y alcance en `README.md`.

## Seguridad y configuracion

- Nunca commitear secretos.
- Variables sensibles en `.env.local`.
- El proyecto usa `GEMINI_API_KEY` para funcionalidades Gemini.
- Para produccion:
  - preferir `wss/https`.
  - desplegar TURN propio y signaling propio.
  - eliminar dependencias criticas cargadas por CDN si impactan seguridad/compliance.

## Git y PRs

- Convencional Commits recomendados:
  - `feat(scope): ...`
  - `fix(scope): ...`
  - `chore(scope): ...`
- PRs deben incluir:
  - resumen breve de cambios.
  - pasos de verificacion.
  - evidencia visual si hay cambios UI.
  - impacto esperado en latencia/estabilidad/coste (si aplica).

<!-- ANCLORA-SDD-STANDARDS-START -->

## Metodología SDD — Estándar Unificado Anclora

Todo desarrollo en este repo sigue la metodología SDD unificada del ecosistema Anclora.

**Referencia canónica**: `agency-agents/docs/guides/SDD_INTEGRATION_GUIDE.md`
**Workflow OpenSpec**: `agency-agents/docs/guides/OPENSPEC_WORKFLOW.md`

### Flujo de trabajo Git

- Rama base de desarrollo: **`development`**
- Los agentes crean ramas desde `development`: `feat/<agente>-<descripcion>`, `fix/...`, `chore/...`
- Las ramas se mergean de vuelta a `development` via PR
- Promoción manual: `development → staging → production → main`
- Nunca commitear directamente en `main`, `staging` ni `production`

### Principios de desarrollo (Specboot)

1. **Small Tasks, One at a Time** — baby steps, nunca saltarse pasos
2. **Test-Driven Development** — escribir tests fallidos antes de implementar
3. **Type Safety** — código completamente tipado (TypeScript)
4. **Clear Naming** — variables y funciones descriptivas
5. **English Only** — código, comentarios y docs técnicos en inglés
6. **90% Test Coverage** — cobertura exhaustiva en todas las capas
7. **Incremental Changes** — modificaciones focalizadas y revisables

### Ciclo de cambios (SDD en este repo)

Toda feature o fix sigue este flujo antes de escribir código:

- Crear spec: `sdd/features/<nombre>/<nombre>-spec-v1.md`
- Crear plan: `sdd/features/<nombre>/<nombre>-plan-v1.md` (cambios complejos)
- Crear tasks: `sdd/features/<nombre>/<nombre>-tasks-v1.md`
- Implementar tarea a tarea (tests primero)
- Validar contra criterios de aceptación de la spec
- PR contra `development`, con referencia a la spec

### Reglas obligatorias

- **No spec, no code**: toda feature empieza con spec en `sdd/features/`
- **Tests primero**: el agente ejecuta los tests, nunca el usuario
- **Hermes gate**: cambio que afecta copy público → Hermes Copy Curator antes del merge
- **Spec inmutable**: una spec cerrada no se edita; los cambios generan una spec nueva
<!-- ANCLORA-SDD-STANDARDS-END -->
