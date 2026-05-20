"use client";

import { useEffect, useState, useMemo } from 'react';

const API_BASE = 'https://vidapi.ru';

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
  
  // Player state
  const [playerItem, setPlayerItem] = useState<any | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedGenre('');
    setSortBy('default');
    fetchData(activeTab, 1);
  }, [activeTab]);

  const fetchData = async (type: 'movies' | 'tv', page = 1) => {
    if (page === 1) setLoading(true);
    try {
      const endpoint = type === 'movies' ? `/movies/latest/page-${page}.json` : `/tvshows/latest/page-${page}.json`;
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setItems(data.items || []);
        } else {
          setItems(prev => [...prev, ...(data.items || [])]);
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
    let result = items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGenre = selectedGenre === '' || (item.genre && item.genre.includes(selectedGenre));
      return matchesSearch && matchesGenre;
    });

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
  }, [items, searchTerm, selectedGenre, sortBy]);

  const heroItem = filteredItems.length > 0 ? filteredItems[0] : null;
  const gridItems = filteredItems.length > 1 ? filteredItems.slice(1) : filteredItems;

  const openPlayer = (item: any) => {
    setPlayerItem(item);
    document.body.style.overflow = 'hidden';
  };

  const closePlayer = () => {
    setPlayerItem(null);
    document.body.style.overflow = '';
  };

  const getEmbedUrl = (item: any) => {
    const colorParam = '?primaryColor=%236366f1';
    if (item.type === 'movie' || (!item.type && item.embed_url && item.embed_url.includes('movie'))) {
      const id = item.imdb_id || item.tmdb_id;
      return `https://vaplayer.ru/embed/movie/${id}${colorParam}`;
    } else {
      const id = item.tmdb_id || item.imdb_id;
      return `https://vaplayer.ru/embed/tv/${id}/1/1${colorParam}`;
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="logo">Vid<span>Flix</span></div>
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
        {!loading && heroItem && (
          <section className="hero">
            <div className="hero-content">
              <h1>{heroItem.title}</h1>
              <p>{heroItem.year ? `(${heroItem.year})` : ''} • ⭐ {heroItem.rating || 'N/A'} • {heroItem.genre || ''}</p>
              <button className="btn-primary" onClick={() => openPlayer(heroItem)}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>
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
          <h2 className="section-title">Resultados ({filteredItems.length})</h2>
          
          {loading ? (
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
                        <svg viewBox="0 0 24 24" fill="white" width="48" height="48"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                    <div className="card-info">
                      <h3 className="card-title" title={item.title}>{item.title}</h3>
                      <div className="card-meta">
                        <span>{item.year || ''}</span>
                        <span className="rating">
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{marginRight:'4px'}}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                          {item.rating || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {currentPage < totalPages && (
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

      {/* Player Modal */}
      <div className={`player-modal ${playerItem ? 'active' : ''}`}>
        <button className="close-btn" onClick={closePlayer}>&times;</button>
        <div className="iframe-container">
          {playerItem && (
            <iframe src={getEmbedUrl(playerItem)} width="100%" height="100%" frameBorder="0" allowFullScreen></iframe>
          )}
        </div>
      </div>
    </>
  );
}
