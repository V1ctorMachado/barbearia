import { useState, useEffect } from 'react';
import { lerConfig, linkWhatsApp } from '../lib/config';
import './BotaoWhatsApp.css';

// Botão flutuante de WhatsApp. Lê o número das configurações; se não
// houver número configurado, o botão simplesmente não aparece.
export default function BotaoWhatsApp({ mensagem = '' }) {
  const [link, setLink] = useState(null);

  useEffect(() => {
    lerConfig().then((cfg) => setLink(linkWhatsApp(cfg.whatsapp, mensagem)));
  }, [mensagem]);

  if (!link) return null; // sem número configurado → não mostra nada

  return (
    <a className="whatsapp-flutuante" href={link} target="_blank" rel="noopener noreferrer"
       aria-label="Falar no WhatsApp" title="Falar no WhatsApp">
      <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true">
        <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.8.9 3.8 1.4 5.8 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22c-1.8 0-3.5-.5-5-1.3l-.4-.2-4.9 1 1-4.8-.3-.4C5.5 18.6 5 16.8 5 15 5 8.9 9.9 4 16 4s11 4.9 11 11-4.9 10-11 10zm5.5-7.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.2s-.8 1-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3c.2.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/>
      </svg>
    </a>
  );
}
