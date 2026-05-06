'use client';
import { useEffect, useRef, useState } from 'react';

const SWAGGER_VERSION = '5.18.2';
const CSS_HREF = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
const BUNDLE_SRC = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;

declare global {

  var SwaggerUIBundle: {
    (opts: Record<string, unknown>): unknown;
    presets: { apis: unknown };
  } | undefined;
}

function loadStylesheet(href: string): void {
  if (document.querySelector(`link[data-swagger-ui-css]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.swaggerUiCss = 'true';
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-swagger-ui-bundle]');
    if (existing) {
      if ((existing as HTMLScriptElement & { dataset: { loaded?: string } }).dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('swagger-ui bundle failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.swaggerUiBundle = 'true';
    s.addEventListener('load', () => { s.dataset.loaded = 'true'; resolve(); });
    s.addEventListener('error', () => reject(new Error('swagger-ui bundle failed to load')));
    document.body.appendChild(s);
  });
}

export function SwaggerUI({ specUrl }: { specUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStylesheet(CSS_HREF);
    loadScript(BUNDLE_SRC)
      .then(() => {
        if (cancelled) return;
        if (!containerRef.current || !globalThis.SwaggerUIBundle) {
          throw new Error('swagger-ui bundle not initialised');
        }
        globalThis.SwaggerUIBundle({
          url: specUrl,
          domNode: containerRef.current,
          presets: [globalThis.SwaggerUIBundle.presets.apis],
          deepLinking: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: 0,
          tryItOutEnabled: true,
          persistAuthorization: true,
        });
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
      });
    return () => { cancelled = true; };
  }, [specUrl]);

  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-soft overflow-hidden">
      {!ready && !error && (
        <div className="p-6 text-sm text-ink-500">Loading API explorer…</div>
      )}
      {error && (
        <div className="p-6 text-sm text-red-600">
          Could not load Swagger UI: {error}.{' '}
          <a href={specUrl} className="text-accent hover:underline">View raw spec</a>.
        </div>
      )}
      <div ref={containerRef} className="swagger-ui-host" />
    </div>
  );
}
