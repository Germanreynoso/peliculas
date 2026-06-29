// Helpers de anime (server-only): metadata desde AniList (GraphQL) con fallback a
// Jikan (MyAnimeList), y mapeo de ids AniList→TMDB/IMDB vía ani.zip.

import type { MediaItem } from './types';

const ANILIST = 'https://graphql.anilist.co';
const JIKAN = 'https://api.jikan.moe/v4';
const ANIZIP = 'https://api.ani.zip/mappings';

// Géneros AniList (inglés) → español.
const GENRE_ES: Record<string, string> = {
  Action: 'Acción', Adventure: 'Aventura', Comedy: 'Comedia', Drama: 'Drama',
  Ecchi: 'Ecchi', Fantasy: 'Fantasía', Horror: 'Terror', 'Mahou Shoujo': 'Mahou Shoujo',
  Mecha: 'Mecha', Music: 'Música', Mystery: 'Misterio', Psychological: 'Psicológico',
  Romance: 'Romance', 'Sci-Fi': 'Ciencia Ficción', 'Slice of Life': 'Recuentos de la vida',
  Sports: 'Deportes', Supernatural: 'Sobrenatural', Thriller: 'Suspense',
};

function translateGenres(genres: string[] | undefined): string {
  if (!genres || !genres.length) return 'Anime';
  return genres.map((g) => GENRE_ES[g] || g).join(', ');
}

const ANILIST_FIELDS = `
  id idMal
  title { romaji english }
  coverImage { large }
  startDate { year }
  averageScore
  genres
  episodes
`;

function mapAnilistMedia(m: any): MediaItem {
  return {
    id: `anime-${m.id}`,
    kind: 'anime',
    anilistId: m.id,
    malId: m.idMal || undefined,
    title: m.title?.english || m.title?.romaji || 'Anime',
    posterUrl: m.coverImage?.large || null,
    year: m.startDate?.year ? String(m.startDate.year) : undefined,
    rating: typeof m.averageScore === 'number' ? (m.averageScore / 10).toFixed(1) : 'N/A',
    genre: translateGenres(m.genres),
  };
}

async function anilistPage(variables: Record<string, any>, useSearch: boolean): Promise<MediaItem[]> {
  // Importante: declarar SOLO las variables que se usan; GraphQL rechaza (400) una
  // variable declarada y no utilizada (p. ej. $search en modo trending).
  const varDecl = useSearch ? '($page: Int, $search: String)' : '($page: Int)';
  const mediaArgs = useSearch ? 'type: ANIME, search: $search, sort: SEARCH_MATCH' : 'type: ANIME, sort: TRENDING_DESC';
  const query = `
    query ${varDecl} {
      Page(page: $page, perPage: 30) {
        media(${mediaArgs}) {
          ${ANILIST_FIELDS}
        }
      }
    }`;
  const res = await fetch(ANILIST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'CinemaDolphin/1.0 (private media app)',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json();
  if (json?.errors) throw new Error(`AniList GraphQL: ${JSON.stringify(json.errors).slice(0, 200)}`);
  const media = json?.data?.Page?.media;
  if (!Array.isArray(media)) throw new Error('AniList: respuesta inesperada');
  return media.map(mapAnilistMedia);
}

function mapJikan(a: any): MediaItem {
  return {
    id: `anime-mal-${a.mal_id}`,
    kind: 'anime',
    malId: a.mal_id,
    title: a.title_english || a.title || 'Anime',
    posterUrl: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
    year: a.year ? String(a.year) : (a.aired?.from ? a.aired.from.substring(0, 4) : undefined),
    rating: typeof a.score === 'number' ? a.score.toFixed(1) : 'N/A',
    genre: translateGenres((a.genres || []).map((g: any) => g.name)),
  };
}

async function jikan(path: string): Promise<MediaItem[]> {
  const res = await fetch(`${JIKAN}${path}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'CinemaDolphin/1.0 (private media app)' },
  });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data.map(mapJikan) : [];
}

export async function getAnimeTrending(page = 1): Promise<MediaItem[]> {
  try {
    return await anilistPage({ page }, false);
  } catch (e) {
    console.warn('[anime] AniList trending falló, usando Jikan:', (e as Error).message);
    return jikan(`/top/anime?page=${page}`);
  }
}

export async function searchAnime(q: string, page = 1): Promise<MediaItem[]> {
  try {
    return await anilistPage({ page, search: q }, true);
  } catch (e) {
    console.warn('[anime] AniList search falló, usando Jikan:', (e as Error).message);
    return jikan(`/anime?q=${encodeURIComponent(q)}&sfw&page=${page}`);
  }
}

export interface AnimeMapping {
  tmdbId?: number;
  imdbId?: string;
  malId?: number;
  episodes: number;
}

export async function mapAnime(anilistId: number): Promise<AnimeMapping> {
  try {
    const res = await fetch(`${ANIZIP}?anilist_id=${anilistId}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`ani.zip ${res.status}`);
    const json = await res.json();
    const m = json?.mappings || {};
    const tmdb = m.themoviedb_id;
    const epKeys = json?.episodes ? Object.keys(json.episodes).filter((k) => /^\d+$/.test(k)) : [];
    return {
      tmdbId: typeof tmdb === 'number' ? tmdb : (tmdb ? Number(tmdb) || undefined : undefined),
      imdbId: m.imdb_id || undefined,
      malId: m.mal_id || undefined,
      episodes: epKeys.length || 0,
    };
  } catch {
    return { episodes: 0 };
  }
}
