import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { SERVICOS, STATUS_LABEL, servicoPorId, abreNoDia, mensagemAvisoBarbearia } from '../lib/dados';
import { criarAgendamento, listarPorCliente, horariosLivres, atualizarStatus, marcarAvisoEnviado } from '../lib/agendamentos';
import { hojeISO, ehDataPassada } from '../lib/datas';
import { lerConfig, dataBloqueada, linkWhatsApp, linkWhatsAppApp, ehCelular } from '../lib/config';
import { diasAte, DIAS_PARA_LEMBRETE } from '../lib/calendario';
import LembreteAgenda from '../components/LembreteAgenda';
import { ehEmailDeCelular, celularDoEmail, formatarCelular, identificacao } from '../lib/celular';
import BotaoWhatsApp from '../components/BotaoWhatsApp';
import './Portal.css';

const hojeIso = hojeISO; // usa a versão à prova de fuso
const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDataHora = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Portal() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState('agendar');
  const [clienteNome, setClienteNome] = useState('');
  const [bloqueios, setBloqueios] = useState([]);
  const [aviso, setAviso] = useState('');
  const [whatsBarbearia, setWhatsBarbearia] = useState('');
  // Último agendamento feito nesta tela (para o botão "Avisar no WhatsApp").
  const [ultimo, setUltimo] = useState(null);
  // Pedidos em que o cliente já tocou em "Avisar" (vale na hora, antes do servidor responder).
  const [avisados, setAvisados] = useState(() => new Set());
  const [abriuWhats, setAbriuWhats] = useState(false); // WhatsApp aberto sozinho ao confirmar

  const jaAvisou = (ag) => !!ag?.avisoEnviado || avisados.has(ag?.id);

  // O link abre o WhatsApp normalmente; aqui só registramos o toque, uma vez.
  function registrarAviso(ag) {
    if (!ag?.id || jaAvisou(ag)) return;
    setAvisados((s) => new Set(s).add(ag.id));
    marcarAvisoEnviado(ag.id).catch((e) => console.error('Não foi possível registrar o aviso:', e));
  }

  // Botão "Avisar" (uma vez só) ou o selo "Aviso enviado!"
  function BotaoAvisar({ ag, mini = false }) {
    if (jaAvisou(ag)) {
      return <span className={`aviso-enviado${mini ? ' mini' : ''}`}>✅ Aviso enviado!</span>;
    }
    return (
      <a className={`btn-whatsapp${mini ? ' btn-whatsapp-mini' : ''}`} target="_blank" rel="noopener noreferrer"
         href={linkWhatsApp(whatsBarbearia, mensagemAvisoBarbearia(ag))}
         onClick={() => registrarAviso(ag)}>
        {mini ? '💬 Avisar' : '💬 Avisar a barbearia no WhatsApp'}
      </a>
    );
  }

  // Carrega as datas bloqueadas, o aviso do topo e o WhatsApp da barbearia.
  useEffect(() => {
    lerConfig().then((cfg) => {
      setBloqueios(cfg.bloqueios || []);
      setAviso((cfg.aviso || '').trim());
      setWhatsBarbearia(cfg.whatsapp || '');
    }).catch(() => {});
  }, []);

  // Carrega o nome do perfil do cliente (para gravar no agendamento).
  useEffect(() => {
    if (!usuario) return;
    getDoc(doc(db, 'clientes', usuario.uid))
      .then((snap) => { if (snap.exists()) setClienteNome(snap.data().nome || ''); })
      .catch(() => { /* sem perfil/nome — segue com email */ });
  }, [usuario]);

  // Fluxo de agendamento
  // Barbeiro único (Stevon) — gravado automaticamente, sem o cliente escolher.
  const barbeiroId = 'stevon';
  const [servicoId, setServicoId] = useState(null);
  const [data, setData] = useState(hojeIso());
  const [horarios, setHorarios] = useState([]);
  const [horarioSel, setHorarioSel] = useState(null);
  const [buscou, setBuscou] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Meus agendamentos
  const [meus, setMeus] = useState([]);

  const servico = servicoPorId(servicoId);
  const podeBuscar = servicoId && data;

  async function sairApp() {
    await sair();
    navigate('/login');
  }

  // Ao trocar serviço ou data, a lista de horários antiga deixa de valer.
  // Sem isso, dava para escolher um horário de outro dia ou com outra duração.
  function limparHorarios() {
    setHorarios([]); setHorarioSel(null); setBuscou(false); setSucesso(''); setUltimo(null); setAbriuWhats(false);
  }
  function escolherServico(id) { setServicoId(id); limparHorarios(); }
  function escolherData(valor) { setData(valor); limparHorarios(); }

  // manterErro: usado após "horário ocupado", para a mensagem não sumir.
  async function buscarHorarios({ manterErro = false } = {}) {
    if (!podeBuscar) { setErro('Escolha o serviço e a data.'); return; }
    setBuscando(true); if (!manterErro) setErro(''); setHorarioSel(null); setHorarios([]); setBuscou(false);
    try {
      const livres = await horariosLivres(barbeiroId, servicoId, data);
      setHorarios(livres);
      setBuscou(true);
    } catch (e) {
      console.error('Erro ao buscar horários:', e); // fica no console, discreto
      setErro('Não foi possível buscar os horários. Tente de novo.');
    } finally {
      setBuscando(false);
    }
  }

  // Chama o app do WhatsApp sem sair da página (link whatsapp://).
  function abrirAppWhatsApp(link) {
    window.__ultimoWhatsApp = link; // usado só em testes
    window.location.href = link;
  }

  async function confirmar() {
    if (!horarioSel) { setErro('Escolha um horário.'); return; }

    // CELULAR: depois de gravar, chama o aplicativo do WhatsApp direto
    // (whatsapp://), sem abrir aba nova. Ao voltar, o cliente está no site.
    // COMPUTADOR: abre a aba JÁ, no toque do botão (navegadores bloqueiam
    // janelas abertas depois de uma espera); ela recebe o WhatsApp Web quando
    // o agendamento for confirmado, ou é fechada se der erro.
    const celular = ehCelular();
    let janela = null;
    if (!celular && linkWhatsApp(whatsBarbearia)) {
      try {
        janela = window.open('', '_blank');
        if (janela) {
          janela.document.title = 'Abrindo o WhatsApp…';
          janela.document.body.innerHTML =
            '<p style="font-family:sans-serif;padding:2rem;font-size:1.1rem">Abrindo o WhatsApp da barbearia…</p>';
        }
      } catch { janela = null; }
    }
    const fecharJanela = () => { try { janela?.close(); } catch { /* já fechada */ } };

    setEnviando(true); setErro(''); setSucesso(''); setAbriuWhats(false);
    try {
      const novo = await criarAgendamento({
        clienteUid: usuario.uid,
        // E-mail só para contas antigas; contas por celular gravam o telefone.
        clienteEmail: ehEmailDeCelular(usuario.email) ? '' : usuario.email,
        clienteTelefone: ehEmailDeCelular(usuario.email) ? formatarCelular(celularDoEmail(usuario.email)) : '',
        clienteNome,
        barbeiroId,
        servicoId,
        dataHora: horarioSel,
      });
      setSucesso('Pedido enviado! Ele fica pendente até a barbearia confirmar.');
      const agNovo = {
        id: novo.id, status: 'pendente',
        clienteNome: clienteNome || '', clienteEmail: ehEmailDeCelular(usuario.email) ? '' : usuario.email,
        servicoNome: servico?.nome, preco: servico?.preco, duracaoMin: servico?.duracaoMin, dataHora: horarioSel,
      };
      setUltimo(agNovo);
      // Leva para o WhatsApp da barbearia com o aviso pronto.
      if (celular && linkWhatsApp(whatsBarbearia)) {
        abrirAppWhatsApp(linkWhatsAppApp(whatsBarbearia, mensagemAvisoBarbearia(agNovo)));
        registrarAviso(agNovo);
        setAbriuWhats(true);
      } else if (janela && !janela.closed) {
        janela.location.href = linkWhatsApp(whatsBarbearia, mensagemAvisoBarbearia(agNovo));
        registrarAviso(agNovo);
        setAbriuWhats(true);
      }
      setHorarios([]); setHorarioSel(null); setBuscou(false);
    } catch (e) {
      fecharJanela();
      if (e?.message === 'HORARIO_OCUPADO') {
        // Alguém pegou esse horário primeiro. Avisa e atualiza a lista.
        setErro('Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.');
        setHorarioSel(null);
        buscarHorarios({ manterErro: true }); // recarrega para tirar o horário que ficou ocupado
      } else if (e?.code === 'TEMPO_ESGOTADO') {
        // O pedido PODE ter sido gravado mesmo sem resposta. Evita duplicar.
        setErro('O servidor demorou para responder. Antes de tentar de novo, confira em "Meus agendamentos" se o pedido já entrou. Se o problema continuar, troque de rede (Wi-Fi ↔ dados móveis).');
      } else {
        console.error('Erro ao agendar:', e);
        setErro('Não foi possível agendar. Tente de novo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  async function carregarMeus() {
    try {
      setMeus(await listarPorCliente(usuario.uid));
    } catch {
      setErro('Não foi possível carregar seus agendamentos.');
    }
  }

  useEffect(() => {
    if (aba === 'meus') carregarMeus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  async function cancelar(ag) {
    const quando = fmtDataHora(ag.dataHora);
    if (!window.confirm(`Cancelar ${ag.servicoNome} em ${quando}?`)) return;
    try {
      await atualizarStatus(ag, 'cancelado');
      carregarMeus();
    } catch {
      setErro('Não foi possível cancelar.');
    }
  }

  const podeCancelar = (s) => ['pendente', 'agendado', 'confirmado'].includes(s);

  return (
    <div className="portal-shell">
      <header className="topbar topbar-logo">
        <div className="brand-logo">
          <img src="/logo.png" alt="Barbearia Mageschi" className="logo-img" />
          <span className="tagline">Agende seu horário</span>
        </div>
        <div className="usuario-box">
          <span className="usuario-nome">{identificacao(usuario, clienteNome)}</span>
          <button className="btn-sair" onClick={sairApp}>Sair</button>
        </div>
      </header>

      {aviso && (
        <div className="faixa-aviso" role="status">{aviso}</div>
      )}

      <nav className="abas">
        <button className={aba === 'agendar' ? 'ativa' : ''} onClick={() => { setAba('agendar'); setErro(''); }}>
          Novo agendamento
        </button>
        <button className={aba === 'meus' ? 'ativa' : ''} onClick={() => { setAba('meus'); setErro(''); }}>
          Meus agendamentos
        </button>
      </nav>

      {aba === 'agendar' && (
        <main className="conteudo">
          {sucesso && (
            <div className="aviso-ok">
              {sucesso}
              {ultimo && linkWhatsApp(whatsBarbearia) && (
                <>
                  {abriuWhats ? (
                    <>
                      <p className="aviso-whats-dica">
                        Abrimos o WhatsApp da barbearia com o aviso pronto.
                        <strong> Toque em Enviar</strong> para a barbearia receber.
                      </p>
                      {ehCelular() && (
                        <a className="link-reabrir" href={linkWhatsAppApp(whatsBarbearia, mensagemAvisoBarbearia(ultimo))}>
                          O WhatsApp não abriu? Toque aqui
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      {!jaAvisou(ultimo) && <p className="aviso-whats-dica">Para agilizar a confirmação, avise a barbearia:</p>}
                      <BotaoAvisar ag={ultimo} />
                    </>
                  )}
                </>
              )}
              {/* Lembrete na agenda: destaque quando faltam 3 dias ou mais */}
              {ultimo && diasAte(ultimo.dataHora) >= DIAS_PARA_LEMBRETE && (
                <div className="lembrete-destaque">
                  <p>Seu horário é daqui a <strong>{diasAte(ultimo.dataHora)} dias</strong>. Para não esquecer, adicione um lembrete:</p>
                  <LembreteAgenda ag={ultimo} />
                </div>
              )}
            </div>
          )}
          {erro && <div className="alerta">{erro}</div>}

          <div className="passo">
            <span className="passo-num">1</span>
            <div className="passo-corpo">
              <label>Escolha o serviço</label>
              <div className="opcoes">
                {SERVICOS.map((s) => (
                  <button key={s.id} className={`chip ${servicoId === s.id ? 'sel' : ''}`}
                          onClick={() => escolherServico(s.id)}>
                    {s.nome}<small>{brl(s.preco)} · {s.duracaoMin}min</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="passo">
            <span className="passo-num">2</span>
            <div className="passo-corpo">
              <label>Escolha a data</label>
              <div className="data-linha">
                <input type="date" value={data} min={hojeIso()} onChange={(e) => escolherData(e.target.value)} />
                <button className="btn-ghost" onClick={() => buscarHorarios()} disabled={!podeBuscar || buscando}>
                  {buscando ? 'Buscando…' : 'Ver horários'}
                </button>
              </div>
            </div>
          </div>

          {buscou && (
            <div className="passo">
              <span className="passo-num">3</span>
              <div className="passo-corpo">
                <label>Horários disponíveis</label>
                {horarios.length > 0 ? (
                  <div className="horarios">
                    {horarios.map((h) => (
                      <button key={h.toISOString()}
                              className={`hora-chip ${horarioSel === h ? 'sel' : ''}`}
                              onClick={() => setHorarioSel(h)}>
                        {fmtHora(h)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="vazio-inline">
                    {ehDataPassada(data)
                      ? 'Essa data já passou. Escolha uma data a partir de hoje.'
                      : dataBloqueada(data, bloqueios)
                        ? `Fechado nesta data${dataBloqueada(data, bloqueios).motivo ? ' (' + dataBloqueada(data, bloqueios).motivo + ')' : ''}. Escolha outra data.`
                        : abreNoDia(data)
                          ? 'Nenhum horário livre nessa data. Tente outro dia.'
                          : 'A barbearia não abre nesse dia (funciona de terça a sábado). Escolha outra data.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {horarioSel && (
            <div className="confirmar-box">
              <div className="resumo">
                <strong>{servico?.nome}</strong> às {fmtHora(horarioSel)}
                <span className="resumo-preco">{brl(servico?.preco || 0)}</span>
              </div>
              <button className="btn btn-bloco" onClick={confirmar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Confirmar agendamento'}
              </button>
            </div>
          )}
        </main>
      )}

      {aba === 'meus' && (
        <main className="conteudo">
          {erro && <div className="alerta">{erro}</div>}
          {meus.length === 0 ? (
            <p className="vazio">Você ainda não tem agendamentos.</p>
          ) : (
            meus.map((ag) => (
              <article key={ag.id} className={`meu-card st-${ag.status}`}>
                <div className="faixa" />
                <div className="meu-info">
                  {/* Selo no canto de cima: libera espaço para o Cancelar embaixo */}
                  {ag.status === 'pendente' && jaAvisou(ag) && (
                    <span className="selo-aviso">✅ Aviso enviado!</span>
                  )}
                  <span className="meu-data">{fmtDataHora(ag.dataHora)}</span>
                  <strong>{ag.servicoNome}</strong>
                  {['pendente', 'agendado', 'confirmado'].includes(ag.status) && ag.dataHora > new Date() && (
                    <LembreteAgenda ag={ag} compacto />
                  )}
                </div>
                <div className="meu-lado">
                  <span className="meu-status">{STATUS_LABEL[ag.status]}</span>
                  <span className="meu-preco">{brl(ag.preco)}</span>
                  {(podeCancelar(ag.status) || (ag.status === 'pendente' && !jaAvisou(ag) && linkWhatsApp(whatsBarbearia))) && (
                    <div className="meu-acoes">
                      {ag.status === 'pendente' && !jaAvisou(ag) && linkWhatsApp(whatsBarbearia) && (
                        <BotaoAvisar ag={{ ...ag, clienteNome: ag.clienteNome || clienteNome }} mini />
                      )}
                      {podeCancelar(ag.status) && (
                        <button className="btn-cancelar" onClick={() => cancelar(ag)}>Cancelar</button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </main>
      )}
      <BotaoWhatsApp mensagem="Olá! Vim pelo site de agendamento." />
    </div>
  );
}
