'use client';

import { useState } from 'react';

const DONATION_ALIAS = 'remera.cuarto.nectar';

export default function DonationBox() {
  const [copied, setCopied] = useState(false);

  const copyAlias = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ALIAS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el portapapeles no está disponible, el alias sigue visible para copiarlo a mano.
    }
  };

  return (
    <div className="donation-box">
      <p className="donation-text">
        Si querés apoyarme para que siga subiendo contenido, recibo donaciones a este alias:
      </p>
      <div className="donation-alias-row">
        <code className="donation-alias">{DONATION_ALIAS}</code>
        <button type="button" className="donation-copy" onClick={copyAlias} aria-live="polite">
          {copied ? '¡Copiado!' : 'Copiar alias'}
        </button>
      </div>
    </div>
  );
}
