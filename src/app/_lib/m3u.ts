// Parser M3U/M3U8 mínimo, sin dependencias.
// Extrae canales de una playlist (#EXTINF + URL).

export interface M3UEntry {
  name: string;
  logo: string | null;
  group: string | null;
  tvgId: string | null;
  url: string;
}

const ATTR_RE = /([\w-]+)="([^"]*)"/g;

export function parseM3U(text: string): M3UEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: M3UEntry[] = [];
  let pending: Omit<M3UEntry, 'url'> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const attrs: Record<string, string> = {};
      let m: RegExpExecArray | null;
      ATTR_RE.lastIndex = 0;
      while ((m = ATTR_RE.exec(line)) !== null) {
        attrs[m[1].toLowerCase()] = m[2];
      }
      const commaIdx = line.lastIndexOf(',');
      const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : 'Canal';
      pending = {
        name,
        logo: attrs['tvg-logo'] || null,
        group: attrs['group-title'] || null,
        tvgId: attrs['tvg-id'] || null,
      };
    } else if (!line.startsWith('#')) {
      // línea de URL
      if (pending) {
        entries.push({ ...pending, url: line });
        pending = null;
      }
    }
    // otras directivas (#EXTM3U, #EXTVLCOPT...) se ignoran
  }

  return entries;
}
