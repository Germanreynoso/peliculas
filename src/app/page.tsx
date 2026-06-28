"use client";

import { useEffect, useState, useMemo } from 'react';

const API_BASE = 'https://vidapi.ru';

const TMDB_GENRES: { [key: number]: string } = {
  28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia', 80: 'Crimen',
  99: 'Documental', 18: 'Drama', 10751: 'Familia', 14: 'Fantasía', 36: 'Historia',
  27: 'Terror', 10402: 'Música', 9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia Ficción',
  10770: 'Película de TV', 53: 'Suspense', 10752: 'Bélica', 37: 'Western',
  10759: 'Acción y Aventura', 10762: 'Infantil', 10763: 'Noticias', 10764: 'Reality',
  10765: 'Sci-Fi y Fantasía', 10766: 'Telenovela', 10767: 'Charla', 10768: 'Guerra y Política'
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Player state
  const [playerItem, setPlayerItem] = useState<any | null>(null);
  const [activeProvider, setActiveProvider] = useState<'main' | 'latino' | 'alternative'>('main');
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [tvSeasons, setTvSeasons] = useState<any[]>([]);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);

  useEffect(() => {
    if (playerItem && playerItem.type === 'tv' && playerItem.tmdb_id) {
      const fetchEpisodes = async () => {
        try {
          const res = await fetch(`/api/search?mode=season&id=${playerItem.tmdb_id}&season=${activeSeason}`);
          if (res.ok) {
            const data = await res.json();
            setSeasonEpisodes(data.episodes || []);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchEpisodes();
    }
  }, [playerItem, activeSeason]);

  // Listener opcional por si el iframe emite un evento de fin
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (typeof e.data === 'string' && (e.data.toLowerCase().includes('ended') || e.data.toLowerCase().includes('complete'))) {
        console.log("Posible evento de fin de video detectado:", e.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedGenre('');
    setSortBy('default');
    setIsSearching(false);
    fetchData(activeTab, 1);
  }, [activeTab]);

  const searchTMDB = async (query: string, type: 'movies' | 'tv') => {
    setSearchLoading(true);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&type=${type}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.results.map((r: any) => ({
          tmdb_id: r.id,
          title: r.title || r.name,
          year: (r.release_date || r.first_air_date || '').substring(0, 4),
          poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
          rating: r.vote_average ? r.vote_average.toFixed(1) : 'N/A',
          type: type === 'movies' ? 'movie' : 'tv',
          genre: r.genre_ids ? r.genre_ids.map((id: number) => TMDB_GENRES[id] || '').filter(Boolean).join(', ') : 'Búsqueda Global'
        }));
        setSearchResults(mapped);
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
    setSearchLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() !== '') {
        searchTMDB(searchTerm, activeTab);
      } else {
        setIsSearching(false);
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeTab]);

  const fetchData = async (type: 'movies' | 'tv', page = 1) => {
    if (page === 1) setLoading(true);
    try {
      const res = await fetch(`/api/search?mode=trending&type=${type}&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.results || []).map((r: any) => ({
          tmdb_id: r.id,
          title: r.title || r.name,
          year: (r.release_date || r.first_air_date || '').substring(0, 4),
          poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
          rating: r.vote_average ? r.vote_average.toFixed(1) : 'N/A',
          type: type === 'movies' ? 'movie' : 'tv',
          genre: r.genre_ids ? r.genre_ids.map((id: number) => TMDB_GENRES[id] || '').filter(Boolean).join(', ') : 'General'
        }));

        if (page === 1) {
          setItems(mapped);
        } else {
          setItems(prev => [...prev, ...mapped]);
        }
        setTotalPages(data.total_pages || 1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    if (page === 1) setLoading(false);
  };

  const loadMore = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchData(activeTab, nextPage);
    }
  };

  // Derive all unique categories (genres) from current items
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    items.forEach(item => {
      if (item.genre) {
        item.genre.split(',').forEach((g: string) => genres.add(g.trim()));
      }
    });
    return Array.from(genres).sort();
  }, [items]);

  // Apply filters and sorting
  const filteredItems = useMemo(() => {
    let result = isSearching ? searchResults : items;

    if (!isSearching) {
      result = result.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenre = selectedGenre === '' || (item.genre && item.genre.includes(selectedGenre));
        return matchesSearch && matchesGenre;
      });
    }

    if (sortBy !== 'default') {
      result = [...result].sort((a, b) => {
        if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
        if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
        if (sortBy === 'year_desc') return (b.year || '0').localeCompare(a.year || '0');
        if (sortBy === 'year_asc') return (a.year || '0').localeCompare(b.year || '0');
        if (sortBy === 'category') return (a.genre || '').localeCompare(b.genre || '');
        return 0;
      });
    }

    return result;
  }, [items, searchResults, isSearching, searchTerm, selectedGenre, sortBy]);

  const heroItem = filteredItems.length > 0 ? filteredItems[0] : null;
  const gridItems = filteredItems.length > 1 ? filteredItems.slice(1) : filteredItems;

  const currentLoading = isSearching ? searchLoading : loading;

  const goToNextEpisode = () => {
    const currentEpisodeIndex = seasonEpisodes.findIndex(ep => ep.episode_number === activeEpisode);
    if (currentEpisodeIndex !== -1 && currentEpisodeIndex < seasonEpisodes.length - 1) {
      setActiveEpisode(seasonEpisodes[currentEpisodeIndex + 1].episode_number);
    } else {
      const currentSeasonIndex = tvSeasons.findIndex(s => s.season_number === activeSeason);
      if (currentSeasonIndex !== -1 && currentSeasonIndex < tvSeasons.length - 1) {
        setActiveSeason(tvSeasons[currentSeasonIndex + 1].season_number);
        setActiveEpisode(1);
      }
    }
  };

  const goToPrevEpisode = () => {
    const currentEpisodeIndex = seasonEpisodes.findIndex(ep => ep.episode_number === activeEpisode);
    if (currentEpisodeIndex > 0) {
      setActiveEpisode(seasonEpisodes[currentEpisodeIndex - 1].episode_number);
    } else {
      const currentSeasonIndex = tvSeasons.findIndex(s => s.season_number === activeSeason);
      if (currentSeasonIndex > 0) {
        setActiveSeason(tvSeasons[currentSeasonIndex - 1].season_number);
        setActiveEpisode(1);
      }
    }
  };

  const openPlayer = async (item: any) => {
    let updatedItem = { ...item };
    setTvSeasons([]);
    setSeasonEpisodes([]);

    if (updatedItem.tmdb_id) {
      try {
        const res = await fetch(`/api/search?mode=details&type=${updatedItem.type === 'tv' ? 'tv' : 'movies'}&id=${updatedItem.tmdb_id}`);
        if (res.ok) {
          const details = await res.json();
          if (!updatedItem.imdb_id) {
            updatedItem.imdb_id = details.imdb_id || details.external_ids?.imdb_id;
          }
          if (updatedItem.type === 'tv' && details.seasons) {
            setTvSeasons(details.seasons.filter((s: any) => s.season_number > 0));
          }
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      }
    }

    setPlayerItem(updatedItem);
    setActiveProvider('main');
    setActiveSeason(1);
    setActiveEpisode(1);
    document.body.style.overflow = 'hidden';
  };

  const closePlayer = () => {
    setPlayerItem(null);
    document.body.style.overflow = '';
  };

  const getEmbedUrl = (item: any, provider: 'main' | 'latino' | 'alternative', season: number, episode: number) => {
    const tmdbId = item.tmdb_id;
    const imdbId = item.imdb_id;
    const id = imdbId || tmdbId;
    const isMovie = item.type === 'movie' || (!item.type && item.embed_url && item.embed_url.includes('movie'));
    const colorParam = '?primaryColor=%236366f1';

    if (provider === 'main') {
      if (isMovie) {
        return `https://vaplayer.ru/embed/movie/${id}${colorParam}`;
      } else {
        return `https://vaplayer.ru/embed/tv/${tmdbId || imdbId}/${season}/${episode}${colorParam}`;
      }
    }

    if (provider === 'latino') {
      if (isMovie) {
        if (imdbId) {
          return `https://multiembed.mov/?video_id=${imdbId}`;
        } else {
          return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
        }
      } else {
        if (imdbId) {
          return `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}`;
        } else {
          return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`;
        }
      }
    }

    if (provider === 'alternative') {
      if (isMovie) {
        return `https://vidsrc.to/embed/movie/${tmdbId || imdbId}`;
      } else {
        return `https://vidsrc.to/embed/tv/${tmdbId || imdbId}/${season}/${episode}`;
      }
    }

    return '';
  };

  return (
    <>
      <header className="navbar">
        <a href="#" className="logo" onClick={(e) => {
          e.preventDefault();
          setActiveTab('movies');
          setSearchTerm('');
          setSelectedGenre('');
          setSortBy('default');
          setIsSearching(false);
          fetchData('movies', 1);
        }} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Cinema Dolphin Logo" style={{ height: '60px', width: '60px', borderRadius: '50%', objectFit: 'cover' }} />
          Cinema<span>Dolphin</span>
        </a>
        <nav>
          <a href="#" className={activeTab === 'movies' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('movies'); }}>Películas</a>
          <a href="#" className={activeTab === 'tv' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('tv'); }}>Series</a>
        </nav>
      </header>

      <main id="main-content">
        {/* Filters Section */}
        <section className="filters-section">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas las categorías</option>
            {allGenres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="default">Orden por defecto</option>
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="year_desc">Año (Más recientes)</option>
            <option value="year_asc">Año (Más antiguos)</option>
            <option value="category">Categoría (A-Z)</option>
          </select>
        </section>

        {/* Hero Section */}
        {!currentLoading && heroItem && (
          <section className="hero">
            <div className="hero-content">
              <h1>{heroItem.title}</h1>
              <p>{heroItem.year ? `(${heroItem.year})` : ''} • ⭐ {heroItem.rating || 'N/A'} • {heroItem.genre || ''}</p>
              <button className="btn-primary" onClick={() => openPlayer(heroItem)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z" /></svg>
                Ver Ahora
              </button>
            </div>
            <div className="hero-overlay"></div>
            {heroItem.poster_url && (
              <img src={heroItem.poster_url} className="hero-bg" alt="Hero Background" />
            )}
          </section>
        )}

        {/* Grid Section */}
        <section className="content-section">
          <h2 className="section-title">
            Resultados ({filteredItems.length}) {isSearching && '- Búsqueda Global'}
          </h2>

          {currentLoading ? (
            <div className="loader"></div>
          ) : gridItems.length > 0 ? (
            <>
              <div className="grid">
                {gridItems.map((item, idx) => (
                  <div key={`${item.tmdb_id || item.imdb_id}-${idx}`} className="card" onClick={() => openPlayer(item)}>
                    <div className="card-img-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.poster_url || 'https://via.placeholder.com/300x450?text=Sin+Poster'} loading="lazy" alt={item.title} />
                      <div className="card-overlay">
                        <svg viewBox="0 0 24 24" fill="white" width="48" height="48"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                    <div className="card-info">
                      <h3 className="card-title" title={item.title}>{item.title}</h3>
                      <div className="card-meta">
                        <span>{item.year || ''}</span>
                        <span className="rating">
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ marginRight: '4px' }}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          {item.rating || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!isSearching && currentPage < totalPages && (
                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                  <button className="btn-primary" onClick={loadMore} style={{ display: 'inline-flex', margin: '0 auto' }}>
                    Cargar más
                  </button>
                </div>
              )}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron resultados para tu búsqueda.</p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Cinema Dolphin Logo" className="footer-logo" />
          <h3>Cinema<span>Dolphin</span></h3>
          <p>El mejor catálogo de películas y series en un solo lugar. ¡Disfruta del streaming ilimitado sin cortes!</p>
          <div className="footer-links">
            <a href="#">Inicio</a>
            <a href="#main-content">Catálogo</a>
            <a href="#">Contacto</a>
          </div>
          <p className="copyright">© {new Date().getFullYear()} Cinema Dolphin. Creado con amor por el equipo de diseño.</p>
        </div>
      </footer>

      {/* Player Modal */}
      <div className={`player-modal ${playerItem ? 'active' : ''}`}>
        <button className="close-btn" onClick={closePlayer}>&times;</button>

        {playerItem && (
          <div className="provider-selector">
            <button
              className={`provider-btn ${activeProvider === 'main' ? 'active' : ''}`}
              onClick={() => setActiveProvider('main')}
            >
              🚀 Servidor Principal
            </button>
            <button
              className={`provider-btn ${activeProvider === 'latino' ? 'active' : ''}`}
              onClick={() => setActiveProvider('latino')}
            >
              🇲🇽 Servidor Latino
            </button>
            <button
              className={`provider-btn ${activeProvider === 'alternative' ? 'active' : ''}`}
              onClick={() => setActiveProvider('alternative')}
            >
              💎 Servidor HD / Multi
            </button>
          </div>
        )}

        <div className="iframe-container">
          {playerItem && (
            <iframe src={getEmbedUrl(playerItem, activeProvider, activeSeason, activeEpisode)} width="100%" height="100%" frameBorder="0" allowFullScreen></iframe>
          )}
        </div>

        {playerItem && playerItem.type === 'tv' && (
          <div className="tv-controls">
            <div className="season-selector-wrapper">
              <select
                className="custom-select"
                value={activeSeason}
                onChange={(e) => {
                  setActiveSeason(parseInt(e.target.value));
                  setActiveEpisode(1);
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
              <div className="episode-navigation-buttons" style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                <button
                  className="provider-btn"
                  onClick={goToPrevEpisode}
                  disabled={activeSeason === 1 && activeEpisode === 1}
                  style={{ opacity: (activeSeason === 1 && activeEpisode === 1) ? 0.5 : 1, padding: '0.4rem 1rem' }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" /></svg>
                  Anterior
                </button>
                <button
                  className="provider-btn"
                  onClick={goToNextEpisode}
                  style={{ padding: '0.4rem 1rem' }}
                >
                  Siguiente
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ verticalAlign: 'middle', marginLeft: '4px' }}><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
                </button>
              </div>
            </div>

            <div className="episodes-list">
              {seasonEpisodes.length > 0 ? (
                seasonEpisodes.map((ep) => (
                  <div
                    key={ep.episode_number}
                    className={`episode-card ${activeEpisode === ep.episode_number ? 'active' : ''}`}
                    onClick={() => setActiveEpisode(ep.episode_number)}
                  >
                    <div className="episode-number">{ep.episode_number}</div>
                    <div className="episode-details">
                      <div className="episode-name">{ep.name}</div>
                      <div className="episode-airdate">{ep.air_date ? new Date(ep.air_date).getFullYear() : ''}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="loader"></div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
