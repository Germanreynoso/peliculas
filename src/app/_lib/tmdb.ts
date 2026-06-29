import type { MediaItem } from './types';

// Diccionario de géneros TMDB → español (movido desde page.tsx).
export const TMDB_GENRES: { [key: number]: string } = {
  28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia', 80: 'Crimen',
  99: 'Documental', 18: 'Drama', 10751: 'Familia', 14: 'Fantasía', 36: 'Historia',
  27: 'Terror', 10402: 'Música', 9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia Ficción',
  10770: 'Película de TV', 53: 'Suspense', 10752: 'Bélica', 37: 'Western',
  10759: 'Acción y Aventura', 10762: 'Infantil', 10763: 'Noticias', 10764: 'Reality',
  10765: 'Sci-Fi y Fantasía', 10766: 'Telenovela', 10767: 'Charla', 10768: 'Guerra y Política',
};

export const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

// Mapea un resultado crudo de TMDB (search/movie, search/tv, now_playing, on_the_air)
// al modelo normalizado MediaItem. `kind` distingue película de serie.
export function mapTmdbToMediaItem(r: any, kind: 'movie' | 'tv', fallbackGenre = 'General'): MediaItem {
  return {
    id: String(r.id),
    kind,
    tmdbId: r.id,
    title: r.title || r.name || 'Sin título',
    year: (r.release_date || r.first_air_date || '').substring(0, 4),
    posterUrl: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
    rating: r.vote_average ? r.vote_average.toFixed(1) : 'N/A',
    genre: Array.isArray(r.genre_ids) && r.genre_ids.length
      ? r.genre_ids.map((id: number) => TMDB_GENRES[id] || '').filter(Boolean).join(', ')
      : fallbackGenre,
  };
}
