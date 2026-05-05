// Single source of truth for app icons — kept inline (no extra deps).

// Primary Smartkarma wordmark logo (icon + "smartkarma" lockup, 1000×190).
export const BRAND_LOGO_URL =
  'https://branding.smartkarma.com/assets/uploaded/sites/10/2021/03/smartkarma-primary-logo-full-colour-1000px.png';

const BRAND_ASPECT = 1000 / 190;

export function BrandMark({ height = 22, className = '' }: { height?: number; className?: string }) {
  // The full wordmark — drop adjacent "Smartkarma" text wherever this appears.
  // Local /brand-primary.png is served from /public for snappy first paint.
  return (
    <img
      src="/brand-primary.png"
      alt="Smartkarma"
      width={Math.round(height * BRAND_ASPECT)}
      height={height}
      decoding="async"
      loading="eager"
      style={{ height: `${height}px`, width: 'auto' }}
      className={`inline-block align-middle ${className}`}
    />
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
