import { useState, useEffect } from 'react';
import { lerConfig } from '../lib/config';
import './FaixaAviso.css';

// Faixa de aviso no topo do site do cliente. Só aparece se houver um
// aviso configurado pela barbearia (campo em branco = nada é mostrado).
export default function FaixaAviso() {
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    lerConfig().then((cfg) => setAviso((cfg.aviso || '').trim())).catch(() => {});
  }, []);

  if (!aviso) return null;

  return (
    <div className="faixa-aviso" role="status">
      <span className="faixa-aviso-icone" aria-hidden="true">★</span>
      <span className="faixa-aviso-texto">{aviso}</span>
    </div>
  );
}
