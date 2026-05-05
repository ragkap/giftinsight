import 'server-only';
import { env } from './env';

export type TrendingInsight = {
  id: number | string;
  tagline: string;
  url: string;
  author?: string | null;
};

let cache: { at: number; data: TrendingInsight[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function getTrending(): Promise<TrendingInsight[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.data;

  try {
    const res = await fetch(env().SMARTKARMA_TRENDING_URL, {
      // Smartkarma's API requires JSON:API content negotiation, no media-type parameters.
      headers: { Accept: 'application/vnd.api+json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`trending HTTP ${res.status}`);
    const json: unknown = await res.json();
    const list = normalise(json);
    cache = { at: now, data: list };
    return list;
  } catch (err) {
    console.warn('[trending] fetch failed:', (err as Error).message);
    return cache?.data ?? [];
  }
}

function normalise(payload: unknown): TrendingInsight[] {
  // Smartkarma uses JSON:API: { data: [{ id, attributes: { tagline, slug, byline, ... } }] }
  const root = payload as Record<string, unknown>;
  const data: unknown[] = Array.isArray(root?.data) ? (root.data as unknown[]) : Array.isArray(payload) ? (payload as unknown[]) : [];
  const base = env().SMARTKARMA_BASE_URL.replace(/\/$/, '');
  return data.slice(0, 10).map((raw) => {
    const r = raw as Record<string, unknown>;
    const attrs = (r.attributes as Record<string, unknown> | undefined) ?? r;
    const id = (r.id ?? attrs.id ?? '') as number | string;
    const slug = String(attrs.slug ?? attrs['insight-slug'] ?? '');
    const tagline = String(attrs.tagline ?? attrs.title ?? attrs.headline ?? 'Untitled insight');
    const author = (attrs.byline as string | undefined) ?? (attrs['author-name'] as string | undefined) ?? null;
    const url = slug ? `${base}/insights/${slug}` : `${base}/insights/${id}`;
    return { id, tagline, url, author };
  });
}
