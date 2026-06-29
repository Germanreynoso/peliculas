import type { MediaItem } from '../_lib/types';

interface HeroProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
}

export default function Hero({ item, onPlay }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>{item.title}</h1>
        <p>
          {item.year ? `(${item.year})` : ''} • ⭐ {item.rating || 'N/A'} • {item.genre || ''}
        </p>
        <button className="btn-primary" onClick={() => onPlay(item)}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Ver Ahora
        </button>
      </div>
      <div className="hero-overlay"></div>
      {item.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.posterUrl} className="hero-bg" alt="Hero Background" />
      )}
    </section>
  );
}
