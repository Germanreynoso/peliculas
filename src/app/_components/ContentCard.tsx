import type { MediaItem } from '../_lib/types';

interface ContentCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  variant?: 'poster' | 'logo';
}

const PLACEHOLDER = 'https://via.placeholder.com/300x450?text=Sin+Imagen';

export default function ContentCard({ item, onSelect, variant = 'poster' }: ContentCardProps) {
  const isLogo = variant === 'logo';
  return (
    <div className={`card ${isLogo ? 'logo' : ''}`} onClick={() => onSelect(item)}>
      <div className="card-img-wrapper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.posterUrl || PLACEHOLDER} loading="lazy" alt={item.title} />
        <div className="card-overlay">
          <svg viewBox="0 0 24 24" fill="white" width="48" height="48">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <div className="card-info">
        <h3 className="card-title" title={item.title}>
          {item.title}
        </h3>
        <div className="card-meta">
          <span>{isLogo ? item.group || '' : item.year || ''}</span>
          {!isLogo && (
            <span className="rating">
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ marginRight: '4px' }}>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {item.rating || 'N/A'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
