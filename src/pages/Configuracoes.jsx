import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lerConfig, salvarConfig, soDigitos } from '../lib/config';
import { hojeISO } from '../lib/datas';
import './Configuracoes.css';

const fmtData = (iso) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

export default function Configuracoes() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  const [whatsapp, setWhatsapp] = useState('');
  const [aviso, setAviso] = useState('');
  const [bloqueios, setBloqueios] = useState([]);
  const [novoDe, setNovoDe] = useState('');
  const [novoAte, setNovoAte] = useState('');
  const [novoMotivo, setNovoMotivo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    lerConfig()
      .then((cfg) => {
        setWhatsapp(cfg.whatsapp || '');
        setAviso(cfg.aviso || '');
        setBloqueios(cfg.bloqueios || []);
      })
      .catch(() => setErro('Não foi possível carregar as configurações.'))
      .finally(() => setCarregando(false));
  }, []);

  async function salvar() {
    setSalvando(true); setSucesso(''); setErro('');
    try {
      await salvarConfig({ whatsapp: soDigitos(whatsapp), aviso: aviso.trim() });
      setSucesso('Configurações salvas!');
    } catch {
      setErro('Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  // Adiciona um bloqueio à lista e já salva no banco.
  async function adicionarBloqueio() {
    setErro(''); setSucesso('');
    if (!novoDe) { setErro('Escolha a data inicial do bloqueio.'); return; }
    const ate = novoAte || novoDe; // se não informar "até", bloqueia só o dia "de"
    const de = novoDe;
    // Ordena para o caso de inverterem as datas.
    const ini = de <= ate ? de : ate;
    const fim = de <= ate ? ate : de;

    const novaLista = [...bloqueios, { de: ini, ate: fim, motivo: novoMotivo.trim() }]
      .sort((a, b) => a.de.localeCompare(b.de));

    setSalvando(true);
    try {
      await salvarConfig({ bloqueios: novaLista });
      setBloqueios(novaLista);
      setNovoDe(''); setNovoAte(''); setNovoMotivo('');
      setSucesso('Bloqueio adicionado!');
    } catch {
      setErro('Não foi possível salvar o bloqueio. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  // Remove um bloqueio pelo índice e salva.
  async function removerBloqueio(indice) {
    setErro(''); setSucesso('');
    const novaLista = bloqueios.filter((_, i) => i !== indice);
    setSalvando(true);
    try {
      await salvarConfig({ bloqueios: novaLista });
      setBloqueios(novaLista);
      setSucesso('Bloqueio removido.');
    } catch {
      setErro('Não foi possível remover. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  async function sairApp() {
    await sair();
    navigate('/staff');
  }

  return (
    <div className="config-shell">
      <header className="topbar">
        <div className="pole" />
        <div className="brand">
          <h1 className="marca">Barbearia Mageschi</h1>
          <span className="tagline">Configurações</span>
        </div>
        <div className="pole" />
        <div className="usuario-box">
          <span className="usuario-nome">{usuario?.email}</span>
          <button className="btn-sair" onClick={sairApp}>Sair</button>
        </div>
      </header>

      <nav className="config-nav">
        <Link to="/painel" className="btn-voltar">← Voltar ao painel</Link>
      </nav>

      <main className="config-conteudo">
        {carregando ? (
          <p className="carregando">Carregando…</p>
        ) : (
          <>
            {sucesso && <div className="aviso-ok">{sucesso}</div>}
            {erro && <div className="alerta">{erro}</div>}

            <section className="config-card">
              <h2>WhatsApp da barbearia</h2>
              <p className="config-ajuda">
                Número que aparece no botão de WhatsApp do site. Digite com DDD.
                Ex.: (27) 99999-8888. Deixe em branco para esconder o botão.
              </p>
              <div className="campo">
                <label>Número</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(27) 99999-8888"
                />
              </div>

              <h2 style={{ marginTop: '1.5rem' }}>Aviso no topo do site</h2>
              <p className="config-ajuda">
                Mensagem em destaque no topo do site do cliente (promoção, recado,
                aviso). Deixe em branco para não mostrar nenhum aviso.
              </p>
              <div className="campo">
                <label>Mensagem</label>
                <input
                  type="text"
                  value={aviso}
                  onChange={(e) => setAviso(e.target.value)}
                  maxLength={120}
                  placeholder="Ex.: Promoção: corte + barba com 10% esta semana!"
                />
              </div>

              <button className="btn" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </section>

            <section className="config-card">
              <h2>Datas bloqueadas</h2>
              <p className="config-ajuda">
                Bloqueie feriados, férias ou folgas. Nesses dias o cliente não
                consegue agendar. Para bloquear um único dia, preencha só a data
                inicial (ou repita a mesma nas duas).
              </p>

              <div className="bloqueio-form">
                <div className="campo">
                  <label>De</label>
                  <input type="date" value={novoDe} min={hojeISO()}
                         onChange={(e) => setNovoDe(e.target.value)} />
                </div>
                <div className="campo">
                  <label>Até (opcional)</label>
                  <input type="date" value={novoAte} min={novoDe || hojeISO()}
                         onChange={(e) => setNovoAte(e.target.value)} />
                </div>
                <div className="campo">
                  <label>Motivo (opcional)</label>
                  <input type="text" value={novoMotivo} placeholder="Ex.: Feriado, Férias"
                         onChange={(e) => setNovoMotivo(e.target.value)} />
                </div>
                <button className="btn" onClick={adicionarBloqueio} disabled={salvando}>
                  Adicionar bloqueio
                </button>
              </div>

              {bloqueios.length > 0 && (
                <ul className="bloqueio-lista">
                  {bloqueios.map((b, i) => (
                    <li key={i} className="bloqueio-item">
                      <div className="bloqueio-datas">
                        {b.de === b.ate
                          ? fmtData(b.de)
                          : `${fmtData(b.de)} até ${fmtData(b.ate)}`}
                        {b.motivo && <span className="bloqueio-motivo">{b.motivo}</span>}
                      </div>
                      <button className="btn-remover" onClick={() => removerBloqueio(i)}
                              disabled={salvando} title="Remover">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
