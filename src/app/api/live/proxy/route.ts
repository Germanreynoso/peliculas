import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// Bloquea destinos internos (anti-SSRF). No es allowlist (los streams viven en
// miles de hosts distintos), sino denylist de rangos privados/loopback/metadata.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '::1') return true;
  // Literales IPv4 privados / loopback / link-local / metadata
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // incluye 169.254.169.254 (metadata)
  return false;
}

function rewriteManifest(text: string, upstreamUrl: string, proxyBase: string, ua?: string | null, ref?: string | null): string {
  const suffix = `${ua ? `&ua=${encodeURIComponent(ua)}` : ''}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
  const toProxy = (raw: string): string => {
    try {
      const abs = new URL(raw, upstreamUrl).toString();
      return `${proxyBase}?url=${encodeURIComponent(abs)}${suffix}`;
    } catch {
      return raw;
    }
  };

  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        // Reescribe atributos URI="..." (EXT-X-KEY, EXT-X-MEDIA, EXT-X-MAP, etc.)
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${toProxy(uri)}"`);
      }
      // Línea de URL (segmento o sub-playlist)
      return toProxy(trimmed);
    })
    .join('\n');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const target = searchParams.get('url');
  const ua = searchParams.get('ua');
  const ref = searchParams.get('ref');

  if (!target) {
    return NextResponse.json({ error: 'url is required' }, { status: 400, headers: CORS });
  }

  let upstream: URL;
  try {
    upstream = new URL(target);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400, headers: CORS });
  }
  if (!['http:', 'https:'].includes(upstream.protocol) || isBlockedHost(upstream.hostname)) {
    return NextResponse.json({ error: 'forbidden target' }, { status: 403, headers: CORS });
  }

  const headers: Record<string, string> = {};
  if (ua) headers['User-Agent'] = ua;
  if (ref) headers['Referer'] = ref;

  let res: Response;
  try {
    res = await fetch(upstream.toString(), { headers, redirect: 'follow', cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'upstream unreachable' }, { status: 502, headers: CORS });
  }
  if (!res.ok) {
    return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502, headers: CORS });
  }

  const contentType = res.headers.get('content-type') || '';
  const isManifest =
    /mpegurl/i.test(contentType) ||
    (contentType === '' && /\.m3u8(\?|$)/i.test(upstream.pathname + upstream.search)) ||
    /\.m3u8(\?|$)/i.test(upstream.pathname);

  if (isManifest) {
    const text = await res.text();
    // Algunos hosts devuelven content-type genérico aunque sea m3u8: confirma por contenido.
    if (text.includes('#EXTM3U')) {
      const rewritten = rewriteManifest(text, upstream.toString(), `${origin}/api/live/proxy`, ua, ref);
      return new NextResponse(rewritten, {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/vnd.apple.mpegurl' },
      });
    }
    // No era manifest real → devuélvelo tal cual
    return new NextResponse(text, { status: 200, headers: { ...CORS, 'Content-Type': contentType || 'text/plain' } });
  }

  // Segmento / clave / binario → passthrough en streaming
  const passHeaders: Record<string, string> = { ...CORS };
  if (contentType) passHeaders['Content-Type'] = contentType;
  const len = res.headers.get('content-length');
  if (len) passHeaders['Content-Length'] = len;
  return new NextResponse(res.body, { status: 200, headers: passHeaders });
}
