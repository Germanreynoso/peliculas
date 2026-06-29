// Catálogo de TV en vivo: combina iptv-org (amplitud) + Free-TV/IPTV (FAST legales).
// Server-only. Cache en memoria de módulo porque los JSON de iptv-org superan el
// límite ~2 MB de la Data Cache de fetch de Next.js.

import { parseM3U } from './m3u';
import type { MediaItem } from './types';

const IPTV_API = 'https://iptv-org.github.io/api';
const FAST_M3U = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';

// Países hispanohablantes (ISO alpha-2).
const SPANISH_COUNTRIES = new Set([
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GT',
  'GQ', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
]);

// Grupos de Free-TV que consideramos en español/latino.
const FAST_SPANISH_RE = /spain|españa|espa|mexic|méxic|argentin|chile|colombia|per[uú]|venezuela|ecuador|latino|spanish|español/i;

// Regex por país para filtrar los grupos (group-title) de Free-TV.
const COUNTRY_FAST_RE: Record<string, RegExp> = {
  mx: /mexic|méxic/i,
  ar: /argentin/i,
  es: /spain|españa|espa/i,
  co: /colombia/i,
  cl: /chile/i,
  pe: /per[uú]/i,
  ve: /venezuela/i,
  ec: /ecuador/i,
  uy: /uruguay/i,
};

const TTL_MS = 24 * 60 * 60 * 1000;
type CacheEntry = { data: MediaItem[]; ts: number };
const cache = new Map<string, CacheEntry>();

export interface LiveQuery {
  source: 'iptv' | 'fast' | 'all';
  country?: string | null; // código ISO (mx, ar, es...) o null = todos los hispanos
}

function proxify(url: string, ua?: string | null, ref?: string | null): string {
  let out = `/api/live/proxy?url=${encodeURIComponent(url)}`;
  if (ua) out += `&ua=${encodeURIComponent(ua)}`;
  if (ref) out += `&ref=${encodeURIComponent(ref)}`;
  return out;
}

async function fetchJson(url: string): Promise<any[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.json();
}

async function buildIptvOrg(country?: string | null): Promise<MediaItem[]> {
  const [channels, streams, logos] = await Promise.all([
    fetchJson(`${IPTV_API}/channels.json`),
    fetchJson(`${IPTV_API}/streams.json`),
    fetchJson(`${IPTV_API}/logos.json`),
  ]);

  // Map de logos y primer stream por canal.
  const logoByChannel = new Map<string, string>();
  for (const l of logos) {
    if (l.channel && l.url && !logoByChannel.has(l.channel)) logoByChannel.set(l.channel, l.url);
  }
  const streamByChannel = new Map<string, any>();
  for (const s of streams) {
    if (s.channel && s.url && !streamByChannel.has(s.channel)) streamByChannel.set(s.channel, s);
  }

  const wanted = country ? country.toUpperCase() : null;
  const items: MediaItem[] = [];

  for (const ch of channels) {
    if (ch.closed) continue;
    const cc: string = (ch.country || '').toUpperCase();
    if (wanted) {
      if (cc !== wanted) continue;
    } else if (!SPANISH_COUNTRIES.has(cc)) {
      continue;
    }
    const stream = streamByChannel.get(ch.id);
    if (!stream) continue; // sin stream reproducible

    items.push({
      id: `iptv-${ch.id}`,
      kind: 'live',
      title: ch.name,
      posterUrl: logoByChannel.get(ch.id) || null,
      genre: Array.isArray(ch.categories) && ch.categories.length ? ch.categories.join(', ') : undefined,
      group: cc || 'Otros',
      streamUrl: proxify(stream.url, stream.user_agent, stream.referrer),
      directUrl: stream.url,
    });
  }

  return items;
}

async function buildFast(country?: string | null): Promise<MediaItem[]> {
  // Si se pidió un país concreto sin regex de grupo conocida, no incluir FAST
  // (evita mostrar canales de otro país).
  let re: RegExp | null = FAST_SPANISH_RE;
  if (country) {
    re = COUNTRY_FAST_RE[country.toLowerCase()] || null;
  }
  if (!re) return [];

  const res = await fetch(FAST_M3U, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch FAST failed ${res.status}`);
  const text = await res.text();
  const entries = parseM3U(text);

  return entries
    .filter((e) => e.group && re!.test(e.group))
    .map((e, i) => ({
      id: `fast-${i}-${e.tvgId || e.name}`,
      kind: 'live' as const,
      title: e.name,
      posterUrl: e.logo,
      group: e.group || 'FAST',
      streamUrl: proxify(e.url),
      directUrl: e.url,
    }));
}

export async function getLiveCatalog(q: LiveQuery): Promise<MediaItem[]> {
  const key = `${q.source}|${q.country || 'all'}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;

  const tasks: Promise<MediaItem[]>[] = [];
  if (q.source === 'iptv' || q.source === 'all') tasks.push(buildIptvOrg(q.country).catch(() => []));
  if (q.source === 'fast' || q.source === 'all') tasks.push(buildFast(q.country).catch(() => []));

  const results = await Promise.all(tasks);
  const merged = results.flat();

  // Dedupe por título (case-insensitive); prioriza el primero (FAST suele ir primero si source=all? no:
  // en 'all' iptv va primero. Para priorizar FAST estables, los anteponemos aquí).
  const fastFirst = q.source === 'all' ? [...(results[1] || []), ...(results[0] || [])] : merged;
  const seen = new Set<string>();
  const deduped: MediaItem[] = [];
  for (const item of fastFirst) {
    const k = item.title.toLowerCase().trim();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(item);
  }

  cache.set(key, { data: deduped, ts: Date.now() });
  return deduped;
}
