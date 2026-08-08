<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-linguo-cam.webp" alt="Anclora Linguo Cam" width="132" />

# Anclora Linguo Cam

### Одноранговый видеозвонок с ИИ-переводом в реальном времени

Внутренний инструмент, сочетающий P2P-видеозвонки и генеративный перевод для свободного общения между носителями разных языков.

[Español](./README.md) · [English](./README.en.md) · [Deutsch](./README.de.md) · **Русский** · [Français](./README.fr.md) · [Italiano](./README.it.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Категория](https://img.shields.io/badge/категория-Внутренняя-A8AEB8)
![Языки](https://img.shields.io/badge/языки%20продукта-6-047857)

</div>

---

> [!IMPORTANT]
> Внутренний репозиторий экосистемы Anclora. Не публикуйте операционные детали, учётные данные и конфиденциальную логику вне авторизованных каналов.

## Что это

Anclora Linguo Cam — внутренний инструмент для одноранговых видеозвонков (WebRTC через PeerJS), интегрирующий генеративную модель (Google Gemini) для помощи с переводом во время разговора. Присоединился к управляемой экосистеме Anclora 02.08.2026, ранее работал как независимый продукт.

## Категория в экосистеме

| Поле | Значение |
|---|---|
| Категория | Внутренняя |
| Акцентный цвет бренда | `#59B635` |
| Типографика | Inter |
| Канонический репозиторий | `anclora-linguo-cam` |

## Основные функции

- Одноранговый видеозвонок через PeerJS/WebRTC
- Перевод с помощью генеративного ИИ (Google Gemini) во время разговора
- Интерфейс с иконографией FontAwesome и типографикой Inter

## Технологический стек

| Область | Технология |
|---|---|
| Frontend | React, Vite |
| Генеративный ИИ | Google Gemini (`@google/genai`) |
| Видеозвонок | PeerJS (WebRTC) |
| Типографика | Inter (Fontsource) |

## Локальный запуск

```bash
npm install
npm run dev
```

## Поддерживаемые языки

Продукт в продакшене поддерживает 6 языков: Español (по умолчанию), English, Deutsch, Русский, Français, Italiano (`UI_LOCALE_OPTIONS`, `App.tsx`). Эта документация ведётся на всех 6 языках продукта.

## Документация и управление

- Контракты бренда и управления: [`docs/standards/`](./docs/standards/)
- Anclora Vault (источник истины): `contracts/` и `docs/governance/`

---

<div align="center">

### Anclora Group

Только для внутреннего использования.

</div>
