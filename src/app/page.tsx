'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { TABS, type TabId, type MediaItem } from './_lib/types';
import { mapTmdbToMediaItem } from './_lib/tmdb';
import Navbar from './_components/Navbar';
import Filters from './_components/Filters';
import Hero from './_components/Hero';
import ContentGrid from './_components/ContentGrid';
import PlayerModal from './_components/PlayerModal';

const LIVE_COUNTRIES = [
  { value: 'mx', label: 'México' },
  { value: 'ar', label: 'Argentina' },
  { value: 'es', label: 'España' },
  { value: 'co', label: 'Colombia' },
  { value: 'cl', label: 'Chile' },
  { value: 'pe', label: 'Perú' },
  { value: 've', label: 'Venezuela' },
  { value: 'ec', label: 'Ecuador' },
  { value: 'uy', label: 'Uruguay' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('movies');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrimary, setSelectedPrimary] = useState(''); // género (movies/tv/anime) o país (live)
  const [sortBy, setSortBy] = useState('default');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Player
  const [playerItem, setPlayerItem] = useState<MediaItem | null>(null);

  const fetchData = useCallback(async (tab: TabId, page = 1, countryArg = '') => {
    if (page === 1) setLoading(true);
    try {
      if (tab === 'movies' || tab === 'tv') {
        const type = tab === 'movies' ? 'movies' : 'tv';
        const res = await fetch(`/api/search?mode=trending&type=${type}&page=${page}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.results || []).map((r: any) =>
            mapTmdbToMediaItem(r, tab === 'movies' ? 'movie' : 'tv')
          );
          setTotalPages(data.total_pages || 1);
          setItems((prev) => (page === 1 ? mapped : [...prev, ...mapped]));
        }
      } else if (tab === 'anime') {
        const res = await fetch(`/api/anime?mode=trending&page=${page}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: MediaItem[] = data.items || [];
          setTotalPages(mapped.length >= 30 ? page + 1 : page);
          setItems((prev) => (page === 1 ? mapped : [...prev, ...mapped]));
        }
      } else if (tab === 'live') {
        const country = countryArg;
        const res = await fetch(`/api/live?source=all${country ? `&country=${country}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.channels || []);
        }
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    if (page === 1) setLoading(false);
  }, []);

  // Cambio de tab: reset y carga inicial
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedPrimary('');
    setSortBy('default');
    setIsSearching(false);
    setSearchResults([]);
    fetchData(activeTab, 1, '');
  }, [activeTab, fetchData]);

  // Búsqueda (API para movies/tv/anime; live filtra en cliente)
  useEffect(() => {
    if (activeTab === 'live') return;
    const t = setTimeout(async () => {
      if (searchTerm.trim() === '') {
        setIsSearching(false);
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      setIsSearching(true);
      try {
        if (activeTab === 'movies' || activeTab === 'tv') {
          const type = activeTab === 'movies' ? 'movies' : 'tv';
          const res = await fetch(`/api/search?query=${encodeURIComponent(searchTerm)}&type=${type}`);
          if (res.ok) {
            const data = await res.json();
            const mapped = (data.results || []).map((r: any) =>
              mapTmdbToMediaItem(r, type === 'movies' ? 'movie' : 'tv', 'Búsqueda Global')
            );
            setSearchResults(mapped);
          }
        } else if (activeTab === 'anime') {
          const res = await fetch(`/api/anime?mode=search&q=${encodeURIComponent(searchTerm)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.items || []);
          }
        }
      } catch (e) {
        console.error('Error searching:', e);
      }
      setSearchLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm, activeTab]);

  const loadMore = () => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      fetchData(activeTab, next);
    }
  };

  const onPrimaryChange = (v: string) => {
    setSelectedPrimary(v);
    if (activeTab === 'live') {
      setCurrentPage(1);
      fetchData('live', 1, v);
    }
  };

  // Géneros derivados (movies/tv/anime)
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    items.forEach((item) => {
      if (item.genre) item.genre.split(',').forEach((g) => genres.add(g.trim()));
    });
    return Array.from(genres).filter(Boolean).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = isSearching ? searchResults : items;

    if (!isSearching) {
      result = result.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPrimary =
          selectedPrimary === '' ||
          activeTab === 'live' || // país ya filtrado en servidor
          (item.genre && item.genre.includes(selectedPrimary));
        return matchesSearch && matchesPrimary;
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
  }, [items, searchResults, isSearching, searchTerm, selectedPrimary, sortBy, activeTab]);

  const isLive = activeTab === 'live';
  const currentLoading = isSearching ? searchLoading : loading;
  const heroItem = !isLive && filteredItems.length > 0 ? filteredItems[0] : null;
  const gridItems = heroItem ? filteredItems.slice(1) : filteredItems;

  const openPlayer = (item: MediaItem) => {
    setPlayerItem(item);
    document.body.style.overflow = 'hidden';
  };
  const closePlayer = () => {
    setPlayerItem(null);
    document.body.style.overflow = '';
  };

  const primaryOptions = isLive ? LIVE_COUNTRIES : allGenres.map((g) => ({ value: g, label: g }));
  const sectionTitle = isLive
    ? `Canales (${filteredItems.length})`
    : `Resultados (${filteredItems.length})${isSearching ? ' - Búsqueda Global' : ''}`;

  return (
    <>
      <Navbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogoClick={() => setActiveTab('movies')}
      />

      <main id="main-content">
        <Filters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={isLive ? 'Buscar canal...' : 'Buscar por nombre...'}
          primaryOptions={primaryOptions}
          primaryValue={selectedPrimary}
          onPrimaryChange={onPrimaryChange}
          primaryAllLabel={isLive ? 'Todos los países' : 'Todas las categorías'}
          showSort={!isLive}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {!currentLoading && heroItem && <Hero item={heroItem} onPlay={openPlayer} />}

        <ContentGrid
          items={gridItems}
          onSelect={openPlayer}
          loading={currentLoading}
          variant={isLive ? 'logo' : 'poster'}
          title={sectionTitle}
          emptyMessage={
            isLive
              ? 'No hay canales disponibles. Prueba con otro país.'
              : 'No se encontraron resultados para tu búsqueda.'
          }
          onLoadMore={loadMore}
          canLoadMore={!isSearching && !isLive && currentPage < totalPages}
        />
      </main>

      <footer className="footer">
        <div className="footer-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Cinema Dolphin Logo" className="footer-logo" />
          <h3>
            Cinema<span>Dolphin</span>
          </h3>
          <p>El mejor catálogo de películas, series, anime y TV en vivo en un solo lugar. ¡Disfruta sin cortes!</p>
          <div className="footer-links">
            <a href="#">Inicio</a>
            <a href="#main-content">Catálogo</a>
            <a href="#">Contacto</a>
          </div>
          <p className="copyright">© {new Date().getFullYear()} Cinema Dolphin. Creado con amor por el equipo de diseño.</p>
        </div>
      </footer>

      <PlayerModal item={playerItem} onClose={closePlayer} />
    </>
  );
}
