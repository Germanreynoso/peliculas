import type { MediaItem } from '../_lib/types';
import EmbedPlayer from './EmbedPlayer';
import LivePlayer from './LivePlayer';

interface PlayerModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export default function PlayerModal({ item, onClose }: PlayerModalProps) {
  return (
    <div className={`player-modal ${item ? 'active' : ''}`}>
      <button className="close-btn" onClick={onClose}>
        &times;
      </button>
      {item && (item.kind === 'live' ? <LivePlayer item={item} /> : <EmbedPlayer item={item} />)}
    </div>
  );
}
