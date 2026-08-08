import { useEffect, useState } from 'react';

type CookieLocale = 'es' | 'en' | 'de' | 'ru' | 'fr' | 'it';
type CookiePreferences = {
  necessary: true;
  session: true;
  preferences: boolean;
  updatedAt: string;
  version: 'v2';
};

const STORAGE_KEY = 'anclora-cookie-consent-v2';
const defaults: CookiePreferences = {
  necessary: true,
  session: true,
  preferences: false,
  updatedAt: '',
  version: 'v2',
};

const copy = {
  es: {
    title: 'Preferencias de cookies',
    settingsTitle: 'Gestionar cookies',
    body: 'Usamos cookies necesarias para la sesión segura. Las preferencias locales se guardan solo si las aceptas.',
    necessaryTitle: 'Cookies necesarias',
    necessaryDesc: 'Sesión, seguridad y funcionamiento de la llamada. No se pueden desactivar.',
    preferencesTitle: 'Preferencias locales',
    preferencesDesc: 'Idioma, consentimiento y ajustes de interfaz guardados en este navegador.',
    accept: 'Aceptar preferencias',
    reject: 'Rechazar opcionales',
    settings: 'Ajustes',
    save: 'Guardar preferencias',
  },
  en: {
    title: 'Cookie preferences',
    settingsTitle: 'Manage cookies',
    body: 'We use necessary cookies for secure sessions. Local preferences are stored only if accepted.',
    necessaryTitle: 'Necessary cookies',
    necessaryDesc: 'Session, security and call operation. They cannot be disabled.',
    preferencesTitle: 'Local preferences',
    preferencesDesc: 'Language, consent and interface settings saved in this browser.',
    accept: 'Accept preferences',
    reject: 'Reject optional',
    settings: 'Settings',
    save: 'Save preferences',
  },
  de: {
    title: 'Cookie-Einstellungen',
    settingsTitle: 'Cookies verwalten',
    body: 'Wir nutzen notwendige Cookies fuer sichere Sitzungen. Lokale Praeferenzen werden nur bei Zustimmung gespeichert.',
    necessaryTitle: 'Notwendige Cookies',
    necessaryDesc: 'Sitzung, Sicherheit und Anrufbetrieb. Sie koennen nicht deaktiviert werden.',
    preferencesTitle: 'Lokale Praeferenzen',
    preferencesDesc: 'Sprache, Zustimmung und Oberflaecheneinstellungen in diesem Browser.',
    accept: 'Praeferenzen akzeptieren',
    reject: 'Optionale ablehnen',
    settings: 'Einstellungen',
    save: 'Praeferenzen speichern',
  },
  ru: {
    title: 'Настройки cookies',
    settingsTitle: 'Управление cookies',
    body: 'Мы используем необходимые cookies для безопасной сессии. Локальные настройки сохраняются только после согласия.',
    necessaryTitle: 'Необходимые cookies',
    necessaryDesc: 'Сессия, безопасность и работа звонка. Их нельзя отключить.',
    preferencesTitle: 'Локальные настройки',
    preferencesDesc: 'Язык, согласие и параметры интерфейса в этом браузере.',
    accept: 'Принять настройки',
    reject: 'Отклонить необязательные',
    settings: 'Настройки',
    save: 'Сохранить настройки',
  },
  fr: {
    title: 'Préférences cookies',
    settingsTitle: 'Gérer les cookies',
    body: 'Nous utilisons des cookies nécessaires pour les sessions sécurisées. Les préférences locales ne sont stockées que si vous les acceptez.',
    necessaryTitle: 'Cookies nécessaires',
    necessaryDesc: 'Session, sécurité et fonctionnement de l appel. Ils ne peuvent pas être désactivés.',
    preferencesTitle: 'Préférences locales',
    preferencesDesc: 'Langue, consentement et réglages d interface dans ce navigateur.',
    accept: 'Accepter les préférences',
    reject: 'Refuser les optionnels',
    settings: 'Réglages',
    save: 'Enregistrer',
  },
  it: {
    title: 'Preferenze cookie',
    settingsTitle: 'Gestisci cookie',
    body: 'Usiamo cookie necessari per sessioni sicure. Le preferenze locali sono salvate solo se accettate.',
    necessaryTitle: 'Cookie necessari',
    necessaryDesc: 'Sessione, sicurezza e funzionamento della chiamata. Non possono essere disattivati.',
    preferencesTitle: 'Preferenze locali',
    preferencesDesc: 'Lingua, consenso e impostazioni interfaccia in questo browser.',
    accept: 'Accetta preferenze',
    reject: 'Rifiuta opzionali',
    settings: 'Impostazioni',
    save: 'Salva preferenze',
  },
} satisfies Record<CookieLocale, Record<string, string>>;

export function CookieConsent({ locale = 'en' }: { locale?: CookieLocale }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState(defaults);
  const text = copy[locale] ?? copy.en;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
        setPreferences({
          necessary: true,
          session: true,
          preferences: Boolean(parsed.preferences),
          updatedAt: parsed.updatedAt ?? '',
          version: 'v2',
        });
        return;
      }
    } catch {
      // Ignore invalid localStorage content.
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    const listener = () => {
      setOpen(true);
      setSettings(true);
    };
    window.addEventListener('anclora:open-cookie-preferences', listener);
    return () => window.removeEventListener('anclora:open-cookie-preferences', listener);
  }, []);

  function persist(next: CookiePreferences) {
    const value = {
      ...next,
      necessary: true as const,
      session: true as const,
      updatedAt: new Date().toISOString(),
      version: 'v2' as const,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setPreferences(value);
    setOpen(false);
    setSettings(false);
  }

  return open ? (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="linguo-cookie-title"
    >
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6">
        <h2 id="linguo-cookie-title" className="text-2xl font-semibold">
          {settings ? text.settingsTitle : text.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">{text.body}</p>
        {settings ? (
          <div className="mt-5 space-y-3">
            <CookieRow
              title={text.necessaryTitle}
              description={text.necessaryDesc}
              checked
              disabled
              onChange={() => {}}
            />
            <CookieRow
              title={text.preferencesTitle}
              description={text.preferencesDesc}
              checked={preferences.preferences}
              onChange={(nextPreferences) =>
                setPreferences((current) => ({ ...current, preferences: nextPreferences }))
              }
            />
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {!settings ? (
            <button
              type="button"
              onClick={() => persist({ ...defaults, preferences: true })}
              className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {text.accept}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (settings ? persist(preferences) : setSettings(true))}
            className={settings ? 'btn-primary rounded-lg px-4 py-2 text-sm font-semibold' : 'btn-ghost rounded-lg px-4 py-2 text-sm font-semibold'}
          >
            {settings ? text.save : text.settings}
          </button>
          <button
            type="button"
            onClick={() => persist(defaults)}
            className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {text.reject}
          </button>
        </div>
      </div>
    </div>
  ) : null;
}

function CookieRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-border-default bg-elevated p-4">
      <span>
        <span className="block text-sm font-medium text-text-primary">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-text-secondary">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-accent"
      />
    </label>
  );
}
