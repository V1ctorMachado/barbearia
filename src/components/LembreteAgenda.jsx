import { ehIOS, abrirIcs, linkGoogleAgenda } from '../lib/calendario';

// Botão/link "Adicionar à agenda".
// iPhone → arquivo .ics (abre o Calendário). Demais → Google Agenda,
// com a opção do arquivo .ics para quem usa outro app.
export default function LembreteAgenda({ ag, compacto = false }) {
  if (!ag?.dataHora) return null;
  if (ehIOS()) {
    return (
      <button type="button" className={compacto ? 'link-agenda' : 'btn-agenda'} onClick={() => abrirIcs(ag)}>
        📅 Adicionar à agenda
      </button>
    );
  }
  return (
    <span className={compacto ? 'agenda-compacto' : 'agenda-opcoes'}>
      <a className={compacto ? 'link-agenda' : 'btn-agenda'} href={linkGoogleAgenda(ag)} target="_blank" rel="noopener noreferrer">
        📅 Adicionar à agenda
      </a>
      {!compacto && (
        <button type="button" className="link-agenda link-agenda-ics" onClick={() => abrirIcs(ag)}>
          Usa outro app de agenda? Baixar o evento
        </button>
      )}
    </span>
  );
}
