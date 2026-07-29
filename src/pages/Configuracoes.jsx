import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lerConfig, salvarConfig, soDigitos } from '../lib/config';
import './Configuracoes.css';

export default function Configuracoes() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  const [whatsapp, setWhatsapp] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    lerConfig()
      .then((cfg) => setWhatsapp(cfg.whatsapp || ''))
      .catch(() => setErro('Não foi possível carregar as configurações.'))
      .finally(() => setCarregando(false));
  }, []);

  async function salvar() {
    setSalvando(true); setSucesso(''); setErro('');
    try {
      await salvarConfig({ whatsapp: soDigitos(whatsapp) });
      setSucesso('Configurações salvas!');
    } catch {
      setErro('Não foi possível salvar. Tente de novo.');
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
              <button className="btn" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
