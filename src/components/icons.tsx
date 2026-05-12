// Single source of truth for app icons — kept inline (no extra deps).

// Primary Smartkarma wordmark logo (icon + "smartkarma" lockup, 1000×190).
export const BRAND_LOGO_URL =
  'https://branding.smartkarma.com/assets/uploaded/sites/10/2021/03/smartkarma-primary-logo-full-colour-1000px.png';

const BRAND_ASPECT = 1000 / 190;

/**
 * Renders the Smartkarma wordmark by default. On narrow viewports (`< md`)
 * automatically swaps to the square curation-compass mark to save horizontal
 * space — pass `compact={false}` to opt out (e.g. for centered hero copy
 * where the wordmark looks fine on mobile too).
 */
export function BrandMark({
  height = 22,
  compact = true,
  className = '',
}: {
  height?: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <>
      {compact && (
        <img
          src="/brand.png"
          alt="Smartkarma"
          width={height}
          height={height}
          decoding="async"
          loading="eager"
          style={{ height: `${height}px`, width: `${height}px` }}
          className={`inline-block rounded-[5px] align-middle md:hidden ${className}`}
        />
      )}
      <img
        src="/brand-primary.png"
        alt="Smartkarma"
        width={Math.round(height * BRAND_ASPECT)}
        height={height}
        decoding="async"
        loading="eager"
        style={{ height: `${height}px`, width: 'auto' }}
        className={`align-middle ${compact ? 'hidden md:inline-block' : 'inline-block'} ${className}`}
      />
    </>
  );
}

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

export function CheckIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d="M5 12.5l4.5 4.5L20 6.5" />
    </svg>
  );
}

export function LogoutIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function Spinner({ size = 14, className = '', ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      className={`animate-spin ${className}`}
      aria-hidden="true"
      role="status"
      {...rest}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" opacity="0.85" />
    </svg>
  );
}

export function LoadingRow({
  label = 'Loading…',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-sm text-ink-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function GiftIcon({ size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}
