<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-linguo-cam.png" alt="Anclora Linguo Cam" width="132" />

# Anclora Linguo Cam

### Videochiamata peer-to-peer con traduzione assistita da IA in tempo reale

Strumento interno che combina videochiamata P2P e traduzione generativa per permettere conversazioni fluide tra parlanti di lingue diverse.

[Español](./README.md) · [English](./README.en.md) · [Deutsch](./README.de.md) · [Русский](./README.ru.md) · [Français](./README.fr.md) · **Italiano**

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Categoria](https://img.shields.io/badge/categoria-Interna-A8AEB8)
![Lingue](https://img.shields.io/badge/lingue%20prodotto-6-047857)

</div>

---

> [!IMPORTANT]
> Repository interno dell'ecosistema Anclora. Non pubblicare dettagli operativi, credenziali o logica sensibile al di fuori dei canali autorizzati.

## Cos'è

Anclora Linguo Cam è uno strumento interno di videochiamata punto a punto (WebRTC via PeerJS) che integra un modello generativo (Google Gemini) per assistere con la traduzione durante la conversazione. È entrato nell'ecosistema Anclora governato il 02/08/2026, dopo aver operato in precedenza come prodotto indipendente.

## Categoria nell'ecosistema

| Campo | Valore |
|---|---|
| Categoria | Interna |
| Accento del marchio | `#59B635` |
| Tipografia | Inter |
| Repository canonico | `anclora-linguo-cam` |

## Funzionalità principali

- Videochiamata peer-to-peer via PeerJS/WebRTC
- Traduzione assistita da IA generativa (Google Gemini) durante la conversazione
- Interfaccia con iconografia FontAwesome e tipografia Inter

## Stack tecnologico

| Area | Tecnologia |
|---|---|
| Frontend | React, Vite |
| IA generativa | Google Gemini (`@google/genai`) |
| Videochiamata | PeerJS (WebRTC) |
| Tipografia | Inter (Fontsource) |

## Avvio locale

```bash
npm install
npm run dev
```

## Lingue supportate

Il prodotto in produzione supporta 6 lingue: Español (predefinita), English, Deutsch, Русский, Français, Italiano (`UI_LOCALE_OPTIONS`, `App.tsx`). Questa documentazione è mantenuta in tutte le 6 lingue del prodotto.

## Documentazione e governance

- Contratti di marchio e governance: [`docs/standards/`](./docs/standards/)
- Anclora Vault (fonte di verità): `contracts/` e `docs/governance/`

---

<div align="center">

### Anclora Group

Uso interno.

</div>
