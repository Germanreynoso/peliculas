// Modelo de datos normalizado compartido por las 4 secciones (movies, tv, live, anime).
// Permite reutilizar ContentGrid / ContentCard / Hero / PlayerModal sin ramificar por tipo.

export type TabId = 'movies' | 'tv' | 'live' | 'anime';
export type MediaKind = 'movie' | 'tv' | 'live' | 'anime';

export interface MediaItem {
  id: string; // clave única dentro de su tab
  kind: MediaKind;
  title: string;
  posterUrl: string | null; // poster (movie/tv/anime) o logo (live)
  year?: string;
  rating?: string;
  genre?: string; // coma-separado → alimenta el filtro de género/grupo

  // ids de reproducción
  tmdbId?: number;
  imdbId?: string;
  anilistId?: number;
  malId?: number;

  // específico de live
  streamUrl?: string; // url ya proxificada (/api/live/proxy?url=...)
  directUrl?: string; // url original del stream
  group?: string; // país / categoría → dimensión de filtro en live
}

export interface TabDef {
  id: TabId;
  label: string;
}

export const TABS: TabDef[] = [
  { id: 'movies', label: 'Películas' },
  { id: 'tv', label: 'Series' },
  { id: 'live', label: 'Fútbol' },
  { id: 'anime', label: 'Anime' },
];
