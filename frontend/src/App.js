import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://teste-iaxg.onrender.com/api';

function App() {
  const [meuEstoque, setMeuEstoque] = useState([]);
  const [busca, setBusca] = useState('');
  const [foto, setFoto] = useState("");
  const [novoAparelho, setNovoAparelho] = useState({ cliente: '', aparelho: '', imei: '', preco: '' });
  const [user, setUser] = useState(null);
  const [credenciais, setCredenciais] = useState({ usuario: '', senha: '' });

  const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const stats = meuEstoque.reduce((acc, item) => {
    const valor = Number(item.preco) || 0;
    if (item.status === 'Vendido') { acc.vendidos += 1; acc.faturamento += valor; }
    else { acc.estoqueItem += 1; acc.valorEstoque += valor; }
    return acc;
  }, { vendidos: 0, faturamento: 0, estoqueItem: 0, valorEstoque: 0 });

  const sincronizar = async () => {
    try {
      const res = await fetch(`${API_URL}/sincronizar`);
      const dados = await res.json();
      setMeuEstoque(dados.minhaLoja || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { sincronizar(); }, []);

  const fazerLogin = (e) => {
    e.preventDefault();
    if (credenciais.usuario === 'admin' && credenciais.senha === 'admin123') setUser({ nome: 'Admin', papel: 'admin' });
    else if (credenciais.usuario === 'vendedor' && credenciais.senha === 'loja123') setUser({ nome: 'Vendedor', papel: 'vendedor' });
    else alert("Dados incorretos!");
  };

  if (!user) return (
    <div className="login-container">
      <form onSubmit={fazerLogin} className="login-card">
        <h1>SmartSync Login</h1>
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
          <span>👤 {user.nome} ({user.papel})</span>
          <button onClick={() => setUser(null)} className="btn-logout">Sair</button>
        </div>
        <div className="dashboard-stats">
          <div className="stat-card"><span>ESTOQUE</span><h3>{formatarMoeda(stats.valorEstoque)}</h3></div>
          <div className="stat-card"><span>VENDAS</span><h3>{formatarMoeda(stats.faturamento)}</h3></div>
        </div>
      </header>

      {user.papel === 'admin' && (
        <div className="form-card">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch(`${API_URL}/salvar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...novoAparelho, foto }) });
            if (res.ok) { alert("Sucesso!"); sincronizar(); } else { const d = await res.json(); alert(d.mensagem); }
          }} className="grid-form">
            <input placeholder="Cliente" onChange={e => setNovoAparelho({...novoAparelho, cliente: e.target.value})} />
            <input placeholder="Aparelho" onChange={e => setNovoAparelho({...novoAparelho, aparelho: e.target.value})} />
            <input placeholder="IMEI" onChange={e => setNovoAparelho({...novoAparelho, imei: e.target.value})} />
            <input placeholder="Preço" type="number" onChange={e => setNovoAparelho({...novoAparelho, preco: e.target.value})} />
            <input type="file" onChange={e => { const r = new FileReader(); r.onload = () => setFoto(r.result); r.readAsDataURL(e.target.files[0]); }} />
            <button type="submit" className="btn-save">CADASTRAR</button>
          </form>
        </div>
      )}

      <input className="main-search" placeholder="🔍 Pesquisar..." onChange={e => setBusca(e.target.value)} />
      <div className="grid-estoque">
        {meuEstoque.filter(i => i.aparelho.toLowerCase().includes(busca.toLowerCase())).map(item => (
          <div key={item.id} className={`card ${item.status === 'Vendido' ? 'vendido' : ''}`}>
            <div className="card-body">
              <h3>{item.aparelho}</h3>
              <p>IMEI: {item.imei} | Preço: {formatarMoeda(item.preco)}</p>
            </div>
            <div className="card-actions">
              <button onClick={async () => {
                await fetch(`${API_URL}/estoque/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: item.status === 'Vendido' ? 'Em estoque' : 'Vendido' }) });
                sincronizar();
              }}>{item.status === 'Vendido' ? 'Reativar' : 'Vender'}</button>
              {user.papel === 'admin' && <button onClick={async () => { if(window.confirm("Apagar?")) { await fetch(`${API_URL}/estoque/${item.id}`, { method: 'DELETE' }); sincronizar(); } }}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default App;