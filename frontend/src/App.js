import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://teste-iaxg.onrender.com/api';

function App() {
  const [meuEstoque, setMeuEstoque] = useState([]);
  const [busca, setBusca] = useState('');
  const [foto, setFoto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState('Todos'); // NOVO: Filtro de exibição
  const [novoAparelho, setNovoAparelho] = useState({ cliente: '', aparelho: '', imei: '', preco: '' });

  const [user, setUser] = useState(() => {
    const salvo = localStorage.getItem('usuario_logado');
    return salvo ? JSON.parse(salvo) : null;
  });

  const [credenciais, setCredenciais] = useState({ usuario: '', senha: '' });

  const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // FUNÇÃO PARA IMPRIMIR RECIBO (MELHORIA 4)
  const imprimirRecibo = (item) => {
    const janela = window.open('', '', 'width=800,height=600');
    janela.document.write(`
      <html>
        <head>
          <title>Recibo - SmartSync</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; border: 2px solid #000; }
            h1 { margin-bottom: 5px; }
            .info { text-align: left; margin-top: 30px; line-height: 2; }
            .footer { margin-top: 50px; font-size: 12px; color: #666; }
            .assinatura { margin-top: 60px; border-top: 1px solid #000; width: 250px; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>SMARTSYNC MOBILE</h1>
          <p>Comprovante de Venda / Garantia</p>
          <div class="info">
            <p><strong>CLIENTE:</strong> ${item.cliente.toUpperCase()}</p>
            <p><strong>APARELHO:</strong> ${item.aparelho}</p>
            <p><strong>IMEI:</strong> ${item.imei}</p>
            <p><strong>DATA:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>VALOR:</strong> ${formatarMoeda(item.preco)}</p>
          </div>
          <div class="assinatura"><p>Assinatura da Loja</p></div>
          <div class="footer"><p>Obrigado pela preferência!</p></div>
        </body>
      </html>
    `);
    janela.document.close();
    janela.print();
  };

  const stats = meuEstoque.reduce((acc, item) => {
    const valor = Number(item.preco) || 0;
    if (item.status === 'Vendido') { 
      acc.vendidos += 1; 
      acc.faturamento += valor; 
    } else { 
      acc.estoqueItem += 1; 
      acc.valorEstoque += valor; 
    }
    return acc;
  }, { vendidos: 0, faturamento: 0, estoqueItem: 0, valorEstoque: 0 });

  const sincronizar = async () => {
    try {
      const res = await fetch(`${API_URL}/sincronizar`);
      const dados = await res.json();
      setMeuEstoque(dados.minhaLoja || []);
    } catch (err) { console.error("Erro:", err); }
  };

  useEffect(() => { sincronizar(); }, []);

  const fazerLogin = (e) => {
    e.preventDefault();
    let usuarioEncontrado = null;
    if (credenciais.usuario === 'admin' && credenciais.senha === 'admin123') {
      usuarioEncontrado = { nome: 'Admin', papel: 'admin' };
    } else if (credenciais.usuario === 'vendedor' && credenciais.senha === 'loja123') {
      usuarioEncontrado = { nome: 'Vendedor', papel: 'vendedor' };
    }
    if (usuarioEncontrado) {
      setUser(usuarioEncontrado);
      localStorage.setItem('usuario_logado', JSON.stringify(usuarioEncontrado));
    } else {
      alert("Erro no login!");
    }
  };

  if (!user) return (
    <div className="login-container">
      <form onSubmit={fazerLogin} className="login-card">
        <h1>SmartSync 📱</h1>
        <input placeholder="Usuário" onChange={e => setCredenciais({...credenciais, usuario: e.target.value})} />
        <input type="password" placeholder="Senha" onChange={e => setCredenciais({...credenciais, senha: e.target.value})} />
        <button type="submit">ENTRAR</button>
      </form>
    </div>
  );

  return (
    <div className="container">
      <header className="header-app">
        <div className="user-info">
          <span>👤 <strong>{user.nome}</strong></span>
          <button onClick={() => { setUser(null); localStorage.removeItem('usuario_logado'); }} className="btn-logout">Sair</button>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat-card" onClick={() => setFiltroStatus('Em estoque')} style={{cursor:'pointer'}}>
            <span>💰 EM ESTOQUE</span>
            <h3>{formatarMoeda(stats.valorEstoque)}</h3>
            <p>{stats.estoqueItem} ativos</p>
          </div>
          <div className="stat-card" onClick={() => setFiltroStatus('Vendido')} style={{cursor:'pointer'}}>
            <span>📈 TOTAL VENDIDO</span>
            <h3>{formatarMoeda(stats.faturamento)}</h3>
            <p>{stats.vendidos} vendas</p>
          </div>
        </div>
      </header>

      {user.papel === 'admin' && (
        <div className="form-card">
          <h2>📦 Cadastrar</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch(`${API_URL}/salvar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...novoAparelho, foto }) });
            if (res.ok) { 
              setNovoAparelho({ cliente: '', aparelho: '', imei: '', preco: '' });
              setFoto("");
              sincronizar(); 
            }
          }} className="grid-form">
            <input value={novoAparelho.cliente} onChange={e => setNovoAparelho({...novoAparelho, cliente: e.target.value})} placeholder="Cliente" />
            <input value={novoAparelho.aparelho} onChange={e => setNovoAparelho({...novoAparelho, aparelho: e.target.value})} placeholder="Aparelho" />
            <input value={novoAparelho.imei} onChange={e => setNovoAparelho({...novoAparelho, imei: e.target.value})} placeholder="IMEI" />
            <input type="number" value={novoAparelho.preco} onChange={e => setNovoAparelho({...novoAparelho, preco: e.target.value})} placeholder="R$" />
            <input type="file" onChange={e => { const r = new FileReader(); r.onload = () => setFoto(r.result); r.readAsDataURL(e.target.files[0]); }} />
            <button type="submit" className="btn-save">SALVAR</button>
          </form>
        </div>
      )}

      <div className="filter-bar" style={{marginBottom: '20px', display: 'flex', gap: '10px'}}>
        <button onClick={() => setFiltroStatus('Todos')} className={filtroStatus === 'Todos' ? 'active' : ''}>Todos</button>
        <button onClick={() => setFiltroStatus('Em estoque')}>Em Estoque</button>
        <button onClick={() => setFiltroStatus('Vendido')}>Vendidos</button>
      </div>

      <input className="main-search" placeholder="🔍 Pesquisar..." onChange={e => setBusca(e.target.value)} />

      <div className="grid-estoque">
        {meuEstoque
          .filter(i => (filtroStatus === 'Todos' || i.status === filtroStatus))
          .filter(i => i.aparelho.toLowerCase().includes(busca.toLowerCase()) || i.imei.includes(busca))
          .map(item => (
            <div key={item.id} className={`card ${item.status === 'Vendido' ? 'vendido' : ''}`}>
              <div className="card-header">
                 {item.foto ? <img src={item.foto} className="card-img" alt="foto" /> : <div className="no-img">📱</div>}
                 <span className={`badge ${item.status === 'Vendido' ? 'bg-red' : 'bg-green'}`}>{item.status}</span>
              </div>
              <div className="card-body">
                <h3>{item.aparelho}</h3>
                <p><strong>Dono:</strong> {item.cliente}</p>
                <p><strong>IMEI:</strong> {item.imei}</p>
                <p className="price">{formatarMoeda(item.preco)}</p>
              </div>
              <div className="card-actions">
                <button className="btn-status" onClick={async () => {
                  await fetch(`${API_URL}/estoque/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: item.status === 'Vendido' ? 'Em estoque' : 'Vendido', dataVenda: new Date().toISOString() }) });
                  sincronizar();
                }}>
                  {item.status === 'Vendido' ? '🔄 Reativar' : '🤝 Vender'}
                </button>
                
                {/* BOTÃO DE IMPRIMIR (MELHORIA 4) */}
                <button onClick={() => imprimirRecibo(item)} style={{background: '#edf2f7', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>📄</button>

                {user.papel === 'admin' && (
                  <button className="btn-del" onClick={async () => { if(window.confirm("Excluir?")) { await fetch(`${API_URL}/estoque/${item.id}`, { method: 'DELETE' }); sincronizar(); } }}>🗑️</button>
                )}
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}
export default App;