const footerLabels = {
  es: { terms: 'Términos', privacy: 'Privacidad', legal: 'Aviso legal', rights: 'Todos los derechos reservados.' },
  en: { terms: 'Terms', privacy: 'Privacy', legal: 'Legal notice', rights: 'All rights reserved.' },
  de: { terms: 'AGB', privacy: 'Datenschutz', legal: 'Impressum', rights: 'Alle Rechte vorbehalten.' },
  ru: { terms: 'Условия', privacy: 'Конфиденциальность', legal: 'Правовая информация', rights: 'Все права защищены.' },
  fr: { terms: 'Conditions', privacy: 'Confidentialité', legal: 'Mentions légales', rights: 'Tous droits réservés.' },
  it: { terms: 'Termini', privacy: 'Privacy', legal: 'Note legali', rights: 'Tutti i diritti riservati.' },
};

export function LegalFooter({
  locale = 'en',
  mode = 'static',
}: {
  locale?: keyof typeof footerLabels;
  mode?: 'absolute' | 'static';
}) {
  const copy = footerLabels[locale] ?? footerLabels.en;
  const year = new Date().getFullYear();
  const positionClass = mode === 'absolute' ? 'absolute inset-x-0 bottom-0' : 'shrink-0';
  return (
    <footer
      data-testid="legal-footer"
      className={`${positionClass} z-20 border-t border-border-subtle bg-background/90 px-4 py-3 text-[11px] text-text-muted backdrop-blur`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <span>
          © {year} Anclora Group — {copy.rights} Anclora Linguo Cam forma parte del ecosistema
          tecnológico de Anclora Group.
        </span>
        <span className="flex flex-wrap gap-3">
          <a href="/terms" className="hover:text-text-primary">{copy.terms}</a>
          <a href="/privacy" className="hover:text-text-primary">{copy.privacy}</a>
          <a href="/legal" className="hover:text-text-primary">{copy.legal}</a>
          <a href="mailto:hola@anclora.com" className="hover:text-text-primary">hola@anclora.com</a>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('anclora:open-cookie-preferences'))}
            className="hover:text-text-primary"
          >
            Cookies
          </button>
        </span>
      </div>
    </footer>
  );
}
