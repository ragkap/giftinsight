import { SwaggerUI } from '@/components/SwaggerUI';

export const dynamic = 'force-dynamic';

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">API documentation</h1>
        <p className="text-sm text-ink-500 mt-1">
          OpenAPI 3.1 spec for every Gift Insight HTTP route. Source:{' '}
          <a href="/openapi.yaml" className="text-accent hover:underline">/openapi.yaml</a>.
        </p>
      </div>
      <SwaggerUI specUrl="/openapi.yaml" />
    </div>
  );
}
