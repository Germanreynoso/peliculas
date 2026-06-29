// Configuración central de proveedores de embed (iframe).
//
// IMPORTANTE: estos dominios caen / rotan con frecuencia. Cuando uno deje de
// funcionar, basta con cambiar su entrada en DOMAINS (un solo lugar).
//
// Hallazgo clave: la familia vidsrc NO fuerza audio latino (su `ds_lang` solo
// cambia subtítulos). Para audio doblado latino real se usan proveedores nativos
// latinos: UnLimPlay (usa TMDB id) y embed69 (usa IMDB id).

import type { MediaKind } from './types';

export const DOMAINS = {
  unlimplay: 'https://unlimplay.com',
  embed69: 'https://embed69.org',
  vaplayer: 'https://vaplayer.ru',
  vidsrc: 'https://vidsrc.cc',
};

const ACCENT = '%236366f1'; // #6366f1 url-encoded

export interface EmbedContext {
  kind: MediaKind;
  tmdbId?: number;
  imdbId?: string;
  anilistId?: number;
  season: number;
  episode: number;
  animeAudio?: 'sub' | 'dub'; // solo para el proveedor de anime vidsrc.cc
}

export interface EmbedProvider {
  id: string;
  label: string;
  emoji: string;
  kinds: MediaKind[];
  /** Construye la URL del embed, o null si faltan los ids necesarios. */
  build: (c: EmbedContext) => string | null;
}

// --- Proveedores para movie / tv ---
const MOVIE_TV_PROVIDERS: EmbedProvider[] = [
  {
    id: 'unlimplay',
    label: 'Latino',
    emoji: '🇲🇽',
    kinds: ['movie', 'tv'],
    build: ({ kind, tmdbId, season, episode }) => {
      if (!tmdbId) return null;
      return kind === 'movie'
        ? `${DOMAINS.unlimplay}/play/embed/movie/${tmdbId}`
        : `${DOMAINS.unlimplay}/play/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'embed69',
    label: 'Latino HD',
    emoji: '🌎',
    kinds: ['movie', 'tv'],
    build: ({ kind, imdbId, season, episode }) => {
      if (!imdbId) return null;
      // Película: /f/{imdb}/  ·  Serie: /f/{imdb}-{S}x{E}/  (x minúscula, slash final)
      return kind === 'movie'
        ? `${DOMAINS.embed69}/f/${imdbId}/`
        : `${DOMAINS.embed69}/f/${imdbId}-${season}x${episode}/`;
    },
  },
  {
    id: 'vaplayer',
    label: 'Servidor 3',
    emoji: '🚀',
    kinds: ['movie', 'tv'],
    build: ({ kind, tmdbId, imdbId, season, episode }) => {
      const movieId = imdbId || tmdbId;
      const tvId = tmdbId || imdbId;
      if (kind === 'movie' && !movieId) return null;
      if (kind === 'tv' && !tvId) return null;
      return kind === 'movie'
        ? `${DOMAINS.vaplayer}/embed/movie/${movieId}?primaryColor=${ACCENT}`
        : `${DOMAINS.vaplayer}/embed/tv/${tvId}/${season}/${episode}?primaryColor=${ACCENT}`;
    },
  },
  {
    id: 'vidsrc',
    label: 'Sub / Original',
    emoji: '💎',
    kinds: ['movie', 'tv'],
    build: ({ kind, tmdbId, imdbId, season, episode }) => {
      const id = tmdbId || imdbId;
      if (!id) return null;
      return kind === 'movie'
        ? `${DOMAINS.vidsrc}/v2/embed/movie/${id}`
        : `${DOMAINS.vidsrc}/v2/embed/tv/${id}/${season}/${episode}`;
    },
  },
];

// --- Proveedores para anime (toggle Latino / Sub-Dub) ---
const ANIME_PROVIDERS: EmbedProvider[] = [
  {
    id: 'unlimplay',
    label: 'Latino',
    emoji: '🇲🇽',
    kinds: ['anime'],
    // Requiere tmdbId (obtenido mapeando AniList→TMDB vía /api/anime?mode=map).
    build: ({ tmdbId, season, episode }) => {
      if (!tmdbId) return null;
      return `${DOMAINS.unlimplay}/play/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'vidsrc-anime',
    label: 'Sub / Dub (EN)',
    emoji: '🌐',
    kinds: ['anime'],
    // vidsrc.cc: /v2/embed/anime/{anilist}/{episode}/{sub|dub}  (dub = inglés)
    build: ({ anilistId, episode, animeAudio }) => {
      if (!anilistId) return null;
      return `${DOMAINS.vidsrc}/v2/embed/anime/${anilistId}/${episode}/${animeAudio || 'sub'}`;
    },
  },
];

export function getProviders(kind: MediaKind): EmbedProvider[] {
  if (kind === 'anime') return ANIME_PROVIDERS;
  if (kind === 'movie' || kind === 'tv') return MOVIE_TV_PROVIDERS;
  return [];
}

/** Devuelve el primer proveedor cuya URL es construible con el contexto dado. */
export function firstPlayable(providers: EmbedProvider[], ctx: EmbedContext): EmbedProvider | null {
  return providers.find((p) => p.build(ctx) !== null) || providers[0] || null;
}
