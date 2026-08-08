<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-linguo-cam.webp" alt="Anclora Linguo Cam" width="132" />

# Anclora Linguo Cam

### Peer-to-peer video calling with real-time AI-assisted translation

Internal tool combining P2P video calling and generative translation to enable fluent conversations between speakers of different languages.

[Español](./README.md) · **English** · [Deutsch](./README.de.md) · [Русский](./README.ru.md) · [Français](./README.fr.md) · [Italiano](./README.it.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Category](https://img.shields.io/badge/category-Internal-A8AEB8)
![Languages](https://img.shields.io/badge/product%20languages-6-047857)

</div>

---

> [!IMPORTANT]
> Internal Anclora ecosystem repository. Do not publish operational details, credentials, or sensitive logic outside authorized channels.

## What it is

Anclora Linguo Cam is an internal point-to-point video calling tool (WebRTC via PeerJS) that integrates a generative model (Google Gemini) to assist with translation during the conversation. It joined the governed Anclora ecosystem on 2026-08-02, having previously operated as an independent product.

## Category in the ecosystem

| Field | Value |
|---|---|
| Category | Internal |
| Brand accent | `#59B635` |
| Typography | Inter |
| Canonical repository | `anclora-linguo-cam` |

## Key features

- Peer-to-peer video calling via PeerJS/WebRTC
- AI-assisted translation (Google Gemini) during the call
- Interface with FontAwesome iconography and Inter typography

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React, Vite |
| Generative AI | Google Gemini (`@google/genai`) |
| Video calling | PeerJS (WebRTC) |
| Typography | Inter (Fontsource) |

## Local setup

```bash
npm install
npm run dev
```

## Supported languages

The production product supports 6 languages: Español (default), English, Deutsch, Русский, Français, Italiano (`UI_LOCALE_OPTIONS`, `App.tsx`). This documentation is maintained in all 6 product languages.

## Documentation and governance

- Brand and governance contracts: [`docs/standards/`](./docs/standards/)
- Anclora Vault (source of truth): `contracts/` and `docs/governance/`

---

<div align="center">

### Anclora Group

Internal use.

</div>
