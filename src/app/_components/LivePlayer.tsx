'use client';

import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../_lib/types';

interface LivePlayerProps {
  item: MediaItem;
}

export default function LivePlayer({ item }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const src = item.streamUrl;
    if (!video || !src) return;

    setError(false);
    let hls: import('hls.js').default | undefined;
    let destroyed = false;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS: HLS nativo
      video.src = src;
      video.play().catch(() => {});
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (destroyed) return;
        if (!Hls.isSupported()) {
          setError(true);
          return;
        }
        hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls!.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls!.recoverMediaError();
          else {
            hls!.destroy();
            setError(true);
          }
        });
      });
    }

    // CRÍTICO: React 19 StrictMode monta los efectos 2x en dev.
    return () => {
      destroyed = true;
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [item.streamUrl]);

  return (
    <div className="iframe-container">
      {error ? (
        <div className="live-error">
          <p>📡 Canal no disponible</p>
          <span>Este stream está caído o requiere otra fuente. Prueba con otro canal.</span>
        </div>
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video ref={videoRef} className="live-video" controls autoPlay playsInline />
      )}
    </div>
  );
}
