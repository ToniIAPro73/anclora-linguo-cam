<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-linguo-cam.webp" alt="Anclora Linguo Cam" width="132" />

# Anclora Linguo Cam

### Videollamada peer-to-peer con traducción asistida por IA en tiempo real

Herramienta interna que combina videollamada P2P y traducción generativa para permitir conversaciones fluidas entre hablantes de idiomas distintos.

**Español** · [English](./README.en.md) · [Deutsch](./README.de.md) · [Русский](./README.ru.md) · [Français](./README.fr.md) · [Italiano](./README.it.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Categoría](https://img.shields.io/badge/categoría-Interna-A8AEB8)
![Idiomas](https://img.shields.io/badge/idiomas%20producto-6-047857)

</div>

---

> [!IMPORTANT]
> Repositorio interno del ecosistema Anclora. No publicar detalles operativos, credenciales ni lógica sensible fuera de canales autorizados.

## Qué es

Anclora Linguo Cam es una herramienta interna de videollamada punto a punto (WebRTC vía PeerJS) que integra un modelo generativo (Google Gemini) para asistir con traducción en la conversación. Se incorporó al ecosistema gobernado de Anclora en 2026-08-02, tras operar antes como producto independiente.

## Categoría en el ecosistema

| Campo | Valor |
|---|---|
| Categoría | Interna |
| Acento de marca | `#59B635` |
| Tipografía | Inter |
| Repositorio canónico | `anclora-linguo-cam` |

## Funcionalidades principales

- Videollamada peer-to-peer vía PeerJS/WebRTC
- Traducción asistida por IA generativa (Google Gemini) durante la conversación
- Interfaz con iconografía FontAwesome y tipografía Inter

## Stack tecnológico

| Área | Tecnología |
|---|---|
| Frontend | React, Vite |
| IA generativa | Google Gemini (`@google/genai`) |
| Videollamada | PeerJS (WebRTC) |
| Tipografía | Inter (Fontsource) |

## Arranque local

```bash
npm install
npm run dev
```

## Idiomas soportados

El producto en producción soporta 6 idiomas: Español (predeterminado), English, Deutsch, Русский, Français, Italiano (`UI_LOCALE_OPTIONS`, `App.tsx`). Esta documentación se mantiene en los 6 idiomas del producto.

## Documentación y gobernanza

- Contratos de marca y gobernanza: [`docs/standards/`](./docs/standards/)
- Bóveda Anclora (fuente de verdad): `contracts/` y `docs/governance/`

---

<div align="center">

### Anclora Group

Uso interno.

</div>
