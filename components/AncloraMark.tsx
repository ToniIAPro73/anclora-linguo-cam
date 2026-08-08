interface AncloraMarkProps {
  className?: string;
  testId?: string;
  /** Set when adjacent visible text already announces the app name, to avoid duplicate screen-reader output. */
  decorative?: boolean;
}

export function AncloraMark({ className = '', testId, decorative = false }: AncloraMarkProps) {
  return (
    <img
      src="/brand/anclora-linguo-cam.webp"
      alt={decorative ? '' : 'Anclora Linguo Cam'}
      aria-hidden={decorative || undefined}
      className={className}
      data-testid={testId}
    />
  );
}
