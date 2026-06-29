import type { MediaItem } from '../_lib/types';
import ContentCard from './ContentCard';

interface ContentGridProps {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  loading: boolean;
  variant?: 'poster' | 'logo';
  title?: string;
  emptyMessage?: string;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
}

export default function ContentGrid({
  items,
  onSelect,
  loading,
  variant = 'poster',
  title,
  emptyMessage = 'No se encontraron resultados.',
  onLoadMore,
  canLoadMore = false,
}: ContentGridProps) {
  return (
    <section className="content-section">
      {title && <h2 className="section-title">{title}</h2>}

      {loading ? (
        <div className="loader"></div>
      ) : items.length > 0 ? (
        <>
          <div className="grid">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} onSelect={onSelect} variant={variant} />
            ))}
          </div>
          {canLoadMore && onLoadMore && (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <button className="btn-primary" onClick={onLoadMore} style={{ display: 'inline-flex', margin: '0 auto' }}>
                Cargar más
              </button>
            </div>
          )}
        </>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{emptyMessage}</p>
      )}
    </section>
  );
}
