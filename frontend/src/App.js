import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://teste-iaxg.onrender.com/api';

function App() {
  const [meuEstoque, setMeuEstoque] = useState([]);
  const [busca, setBusca] = useState('');
  const [foto, setFoto] = useState("");
  const [novoAparelho, setNovoAparelho] = useState({ cliente: '', aparelho: '', imei: '', preco: '' });

  const [user, setUser] = useState(() => {
    const salvo = localStorage.getItem('usuario_logado');
    return salvo ? JSON.parse(salvo) : null;
  });

  const [credenciais, setCredenciais] = useState({ usuario: '', senha: '' });

  const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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
    } catch (err) { console.error("Erro ao sincronizar:", err); }
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
      alert("Usuário ou senha incorretos!");
    }
  };

  const fazerLogout = () => {
    setUser(null);
    localStorage.removeItem('usuario_logado');
  };

  if (!user) return (
    <div className="login-container">
      <form onSubmit={fazerLogin} className="login-card">
        <h1>SmartSync Login 📱</h1>
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
          <span>👤 Bem-vindo, <strong>{user.nome}</strong></span>
          <button onClick={fazerLogout} className="btn-logout">Sair do Sistema</button>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat-card">
            <span>💰 VALOR EM ESTOQUE</span>
            <h3>{formatarMoeda(stats.valorEstoque)}</h3>
            <p>{stats.estoqueItem} aparelhos ativos</p>
          </div>
          <div className="stat-card">
            <span>📈 TOTAL VENDIDO</span>
            <h3>{formatarMoeda(stats.faturamento)}</h3>
            <p>{stats.vendidos} aparelhos vendidos</p>
          </div>
        </div>
      </header>

      {user.papel === 'admin' && (
        <div className="form-card">
          <h2>📦 Cadastrar Novo Aparelho</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch(`${API_URL}/salvar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...novoAparelho, foto }) });
            if (res.ok) { 
              alert("✅ Cadastrado com sucesso!"); 
              setNovoAparelho({ cliente: '', aparelho: '', imei: '', preco: '' });
              setFoto("");
              sincronizar(); 
            } else { 
              const d = await res.json(); 
              alert(d.mensagem); 
            }
          }} className="grid-form">
            <div className="input-group">
              <label>Cliente</label>
              <input value={novoAparelho.cliente} onChange={e => setNovoAparelho({...novoAparelho, cliente: e.target.value})} placeholder="Nome do dono" />
            </div>
            <div className="input-group">
              <label>Aparelho</label>
              <input value={novoAparelho.aparelho} onChange={e => setNovoAparelho({...novoAparelho, aparelho: e.target.value})} placeholder="Ex: iPhone 13" />
            </div>
            <div className="input-group">
              <label>IMEI</label>
              <input value={novoAparelho.imei} onChange={e => setNovoAparelho({...novoAparelho, imei: e.target.value})} placeholder="15 dígitos" />
            </div>
            <div className="input-group">
              <label>Preço</label>
              <input type="number" value={novoAparelho.preco} onChange={e => setNovoAparelho({...novoAparelho, preco: e.target.value})} placeholder="R$" />
            </div>
            <div className="input-group">
              <label>Foto</label>
              <input type="file" onChange={e => { const r = new FileReader(); r.onload = () => setFoto(r.result); r.readAsDataURL(e.target.files[0]); }} />
            </div>
            <button type="submit" className="btn-save">SALVAR NO ESTOQUE</button>
          </form>
        </div>
      )}

      <div className="search-box">
        <input className="main-search" placeholder="🔍 Pesquisar por modelo, IMEI ou cliente..." onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="grid-estoque">
        {meuEstoque.filter(i => 
          i.aparelho.toLowerCase().includes(busca.toLowerCase()) || 
          i.imei.includes(busca) || 
          i.cliente.toLowerCase().includes(busca.toLowerCase())
        ).map(item => (
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
                await fetch(`${API_URL}/estoque/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: item.status === 'Vendido' ? 'Em estoque' : 'Vendido' }) });
                sincronizar();
              }}>
                {item.status === 'Vendido' ? '🔄 Reativar' : '🤝 Vender'}
              </button>
              
              {user.papel === 'admin' && (
                <button className="btn-del" onClick={async () => { 
                  if(window.confirm("⚠️ Excluir permanentemente?")) { 
                    await fetch(`${API_URL}/estoque/${item.id}`, { method: 'DELETE' }); 
                    sincronizar(); 
                  } 
                }}>🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default App;