import React, { useState, useEffect } from 'react';
import './App.css';

// URL do seu backend no Render
const API_URL = 'https://teste-iaxg.onrender.com/api'; 

function App() {
  const [meuEstoque, setMeuEstoque] = useState([]);
  const [busca, setBusca] = useState('');
  const [foto, setFoto] = useState("");
  const [novoAparelho, setNovoAparelho] = useState({ cliente: '', aparelho: '', imei: '', preco: '' });

  // 1. Sincronizar dados com o servidor
  const sincronizar = async () => {
    try {
      const res = await fetch(`${API_URL}/sincronizar`);
      const dados = await res.json();
      setMeuEstoque(dados.minhaLoja || []);
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
    }
  };

  useEffect(() => { sincronizar(); }, []);

  // 2. Salvar novo aparelho
  const salvarNoSistema = async (e) => {
    e.preventDefault();
    if (!novoAparelho.cliente || !novoAparelho.aparelho || !novoAparelho.imei) {
      return alert("Preencha os campos obrigatórios!");
    }

    try {
      const res = await fetch(`${API_URL}/salvar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novoAparelho, foto })
      });

      if (res.ok) {
        alert("✅ Cadastrado com sucesso!");
        setNovoAparelho({ cliente: '', aparelho: '', imei: '', preco: '' });
        setFoto("");
        sincronizar();
      } else {
        const erro = await res.json();
        alert(erro.mensagem);
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  // 3. Editar informações (Preço, Nome ou Modelo)
  const editarItem = async (item) => {
    const opcao = prompt("O que deseja editar? \n1: Preço \n2: Cliente \n3: Aparelho");
    let payload = {};

    if (opcao === "1") {
      const valor = prompt("Novo Preço:", item.preco);
      if (valor) payload = { preco: Number(valor) };
    } else if (opcao === "2") {
      const valor = prompt("Novo nome do Cliente:", item.cliente);
      if (valor) payload = { cliente: valor };
    } else if (opcao === "3") {
      const valor = prompt("Novo Modelo:", item.aparelho);
      if (valor) payload = { aparelho: valor };
    }

    if (Object.keys(payload).length > 0) {
      await fetch(`${API_URL}/estoque/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      sincronizar();
    }
  };

  // 4. Alternar entre Vendido e Estoque
  const mudarStatus = async (item) => {
    const novoStatus = item.status === 'Vendido' ? 'Em estoque' : 'Vendido';
    await fetch(`${API_URL}/estoque/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus })
    });
    sincronizar();
  };

  // 5. Excluir permanentemente
  const excluir = async (id) => {
    if (window.confirm("⚠️ Excluir permanentemente este registro?")) {
      await fetch(`${API_URL}/estoque/${id}`, { method: 'DELETE' });
      sincronizar();
    }
  };

  const listaFiltrada = meuEstoque.filter(i => 
    i.aparelho.toLowerCase().includes(busca.toLowerCase()) || 
    i.imei.includes(busca) ||
    i.cliente.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="container">
      <header className="header-app">
        <h1>SmartSync Pro 📱</h1>
        <p>Controle de Estoque e Vendas</p>
      </header>

      <div className="form-card">
        <h2>Novo Cadastro</h2>
        <form onSubmit={salvarNoSistema} className="grid-form">
          <input placeholder="Cliente" value={novoAparelho.cliente} onChange={e => setNovoAparelho({...novoAparelho, cliente: e.target.value})} />
          <input placeholder="Aparelho" value={novoAparelho.aparelho} onChange={e => setNovoAparelho({...novoAparelho, aparelho: e.target.value})} />
          <input placeholder="IMEI" value={novoAparelho.imei} onChange={e => setNovoAparelho({...novoAparelho, imei: e.target.value})} />
          <input placeholder="Preço" type="number" value={novoAparelho.preco} onChange={e => setNovoAparelho({...novoAparelho, preco: e.target.value})} />
          <input type="file" accept="image/*" onChange={e => {
            const reader = new FileReader();
            reader.onload = () => setFoto(reader.result);
            reader.readAsDataURL(e.target.files[0]);
          }} />
          <button type="submit" className="btn-save">CADASTRAR</button>
        </form>
      </div>

      <input 
        className="main-search"
        placeholder="🔍 Pesquisar modelo, IMEI ou cliente..." 
        value={busca} 
        onChange={e => setBusca(e.target.value)} 
      />

      <div className="grid-estoque">
        {listaFiltrada.map(item => (
          <div key={item.id} className={`card ${item.status === 'Vendido' ? 'vendido' : ''}`}>
            <div className="card-header">
              {item.foto ? <img src={item.foto} className="card-img" alt="foto" /> : <div className="no-img">📱</div>}
              <span className={`badge ${item.status === 'Vendido' ? 'bg-red' : 'bg-green'}`}>
                {item.status}
              </span>
            </div>
            <div className="card-body">
              <h3>{item.aparelho}</h3>
              <p><strong>Dono:</strong> {item.cliente}</p>
              <p><strong>IMEI:</strong> {item.imei}</p>
              <p className="price">R$ {item.preco}</p>
            </div>
            <div className="card-actions">
              <button className="btn-status" onClick={() => mudarStatus(item)}>
                {item.status === 'Vendido' ? 'Reativar' : 'Vender'}
              </button>
              <button className="btn-edit" onClick={() => editarItem(item)}>✏️</button>
              <button className="btn-del" onClick={() => excluir(item.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;