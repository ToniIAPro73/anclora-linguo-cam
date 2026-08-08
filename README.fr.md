<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-linguo-cam.png" alt="Anclora Linguo Cam" width="132" />

# Anclora Linguo Cam

### Appel vidéo pair-à-pair avec traduction assistée par IA en temps réel

Outil interne combinant appel vidéo P2P et traduction générative pour permettre des conversations fluides entre locuteurs de langues différentes.

[Español](./README.md) · [English](./README.en.md) · [Deutsch](./README.de.md) · [Русский](./README.ru.md) · **Français** · [Italiano](./README.it.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Catégorie](https://img.shields.io/badge/catégorie-Interne-A8AEB8)
![Langues](https://img.shields.io/badge/langues%20produit-6-047857)

</div>

---

> [!IMPORTANT]
> Dépôt interne de l'écosystème Anclora. Ne publiez pas de détails opérationnels, d'identifiants ni de logique sensible en dehors des canaux autorisés.

## Ce que c'est

Anclora Linguo Cam est un outil interne d'appel vidéo point à point (WebRTC via PeerJS) qui intègre un modèle génératif (Google Gemini) pour assister la traduction pendant la conversation. Il a rejoint l'écosystème Anclora gouverné le 02/08/2026, après avoir fonctionné auparavant comme produit indépendant.

## Catégorie dans l'écosystème

| Champ | Valeur |
|---|---|
| Catégorie | Interne |
| Accent de marque | `#59B635` |
| Typographie | Inter |
| Dépôt canonique | `anclora-linguo-cam` |

## Fonctionnalités principales

- Appel vidéo pair-à-pair via PeerJS/WebRTC
- Traduction assistée par IA générative (Google Gemini) pendant l'appel
- Interface avec iconographie FontAwesome et typographie Inter

## Stack technologique

| Domaine | Technologie |
|---|---|
| Frontend | React, Vite |
| IA générative | Google Gemini (`@google/genai`) |
| Appel vidéo | PeerJS (WebRTC) |
| Typographie | Inter (Fontsource) |

## Démarrage local

```bash
npm install
npm run dev
```

## Langues prises en charge

Le produit en production prend en charge 6 langues : Español (par défaut), English, Deutsch, Русский, Français, Italiano (`UI_LOCALE_OPTIONS`, `App.tsx`). Cette documentation est maintenue dans les 6 langues du produit.

## Documentation et gouvernance

- Contrats de marque et de gouvernance : [`docs/standards/`](./docs/standards/)
- Anclora Vault (source de vérité) : `contracts/` et `docs/governance/`

---

<div align="center">

### Anclora Group

Usage interne.

</div>
