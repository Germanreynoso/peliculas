'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MediaItem } from '../_lib/types';
import { getProviders, firstPlayable, type EmbedContext } from '../_lib/providers';

interface EmbedPlayerProps {
  item: MediaItem;
}

interface SeasonInfo {
  season_number: number;
}
interface EpisodeInfo {
  episode_number: number;
  name?: string;
  air_date?: string;
}

export default function EmbedPlayer({ item }: EmbedPlayerProps) {
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);

  // movie/tv
  const [fetchedImdb, setFetchedImdb] = useState<string | undefined>(item.imdbId);
  const [tvSeasons, setTvSeasons] = useState<SeasonInfo[]>([]);
  const [seasonEpisodes, setSeasonEpisodes] = useState<EpisodeInfo[]>([]);

  // anime
  const [mappedTmdb, setMappedTmdb] = useState<number | undefined>(undefined);
  const [animeEpisodes, setAnimeEpisodes] = useState(0);
  const [animeAudio, setAnimeAudio] = useState<'sub' | 'dub'>('sub');

  // Reset al cambiar de item
  useEffect(() => {
    setSeason(1);
    setEpisode(1);
    setActiveProviderId(null);
    setFetchedImdb(item.imdbId);
    setTvSeasons([]);
    setSeasonEpisodes([]);
    setMappedTmdb(undefined);
    setAnimeEpisodes(0);
    setAnimeAudio('sub');
  }, [item.id, item.imdbId]);

  // movie/tv: detalles (imdb id + temporadas)
  useEffect(() => {
    if (item.kind !== 'movie' && item.kind !== 'tv') return;
    if (!item.tmdbId) return;
    let cancelled = false;
    fetch(`/api/search?mode=details&type=${item.kind === 'tv' ? 'tv' : 'movies'}&id=${item.tmdbId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setFetchedImdb((prev) => prev || d.imdb_id || d.external_ids?.imdb_id);
        if (item.kind === 'tv' && Array.isArray(d.seasons)) {
          setTvSeasons(d.seasons.filter((s: SeasonInfo) => s.season_number > 0));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id, item.kind, item.tmdbId]);

  // tv: episodios de la temporada activa
  useEffect(() => {
    if (item.kind !== 'tv' || !item.tmdbId) return;
    let cancelled = false;
    setSeasonEpisodes([]);
    fetch(`/api/search?mode=season&id=${item.tmdbId}&season=${season}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setSeasonEpisodes(d?.episodes || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id, item.kind, item.tmdbId, season]);

  // anime: mapeo AniList→TMDB + conteo de episodios
  useEffect(() => {
    if (item.kind !== 'anime' || !item.anilistId) return;
    let cancelled = false;
    fetch(`/api/anime?mode=map&anilistId=${item.anilistId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setMappedTmdb(d.tmdbId || undefined);
        setAnimeEpisodes(d.episodes || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id, item.kind, item.anilistId]);

  const providers = useMemo(() => getProviders(item.kind), [item.kind]);

  const ctx: EmbedContext = {
    kind: item.kind,
    tmdbId: item.kind === 'anime' ? mappedTmdb : item.tmdbId,
    imdbId: fetchedImdb,
    anilistId: item.anilistId,
    season,
    episode,
    animeAudio,
  };

  const defaultProvider = firstPlayable(providers, ctx);
  const activeProvider =
    providers.find((p) => p.id === activeProviderId && p.build(ctx) !== null) || defaultProvider;
  const embedUrl = activeProvider?.build(ctx) || '';

  const isAnimeVidsrc = item.kind === 'anime' && activeProvider?.id === 'vidsrc-anime';
  const animeEpCount = animeEpisodes > 0 ? animeEpisodes : 24;

  return (
    <>
      <div className="provider-selector">
        {providers.map((p) => {
          const disabled = p.build(ctx) === null;
          return (
            <button
              key={p.id}
              className={`provider-btn ${activeProvider?.id === p.id ? 'active' : ''}`}
              disabled={disabled}
              title={disabled ? 'No disponible para este título' : ''}
              onClick={() => setActiveProviderId(p.id)}
            >
              {p.emoji} {p.label}
            </button>
          );
        })}
      </div>

      <div className="iframe-container">
        {embedUrl ? (
          <iframe src={embedUrl} width="100%" height="100%" frameBorder="0" allowFullScreen></iframe>
        ) : (
          <div className="live-error">
            <p>⏳ Cargando reproductor…</p>
            <span>Si no carga, prueba con otro servidor.</span>
          </div>
        )}
      </div>

      {/* Controles de Series (TV) */}
      {item.kind === 'tv' && (
        <div className="tv-controls">
          <div className="season-selector-wrapper">
            <select
              className="custom-select"
              value={season}
              onChange={(e) => {
                setSeason(parseInt(e.target.value, 10));
                setEpisode(1);
              }}
            >
              {tvSeasons.length > 0 ? (
                tvSeasons.map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    Temporada {s.season_number}
                  </option>
                ))
              ) : (
                <option value={1}>Temporada 1</option>
              )}
            </select>
          </div>

          <div className="episodes-list">
            {seasonEpisodes.length > 0 ? (
              seasonEpisodes.map((ep) => (
                <div
                  key={ep.episode_number}
                  className={`episode-card ${episode === ep.episode_number ? 'active' : ''}`}
                  onClick={() => setEpisode(ep.episode_number)}
                >
                  <div className="episode-number">{ep.episode_number}</div>
                  <div className="episode-details">
                    <div className="episode-name">{ep.name}</div>
                    <div className="episode-airdate">
                      {ep.air_date ? new Date(ep.air_date).getFullYear() : ''}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="loader"></div>
            )}
          </div>
        </div>
      )}

      {/* Controles de Anime */}
      {item.kind === 'anime' && (
        <div className="tv-controls">
          {isAnimeVidsrc && (
            <div className="anime-toggle">
              <button
                className={`provider-btn ${animeAudio === 'sub' ? 'active' : ''}`}
                onClick={() => setAnimeAudio('sub')}
              >
                Sub (JP)
              </button>
              <button
                className={`provider-btn ${animeAudio === 'dub' ? 'active' : ''}`}
                onClick={() => setAnimeAudio('dub')}
              >
                Dub (EN)
              </button>
            </div>
          )}
          <div className="season-selector-wrapper">
            <select
              className="custom-select"
              value={episode}
              onChange={(e) => setEpisode(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: animeEpCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Episodio {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}
