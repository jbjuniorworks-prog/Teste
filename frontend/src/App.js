import React, { useState, useEffect } from 'react';

const validarImeiReal = (imei) => {
  const n = imei.trim();
  if (n.length !== 15 || !/^\d+$/.test(n)) return false;
  let soma = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(n.charAt(i));
    if (i % 2 !== 0) { d *= 2; if (d > 9) d -= 9; }
    soma += d;
  }
  return soma % 10 === 0;
};

const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// LINK DO SEU BACKEND NO RENDER
const API_URL = 'https://teste-iaxg.onrender.com/api';

function App() {
  const [busca, setBusca] = useState('');
  const [meuEstoque, setMeuEstoque] = useState([]);
  const [estoqueCompleto, setEstoqueCompleto] = useState([]);
  const [status, setStatus] = useState('Sincronizando...');
  const [foto, setFoto] = useState("");
  const [novoAparelho, setNovoAparelho] = useState({ cliente: '', aparelho: '', imei: '', preco: '' });

  const sincronizar = async () => {
    try {
      const res = await fetch(`${API_URL}/sincronizar`);
      const dados = await res.json();
      setEstoqueCompleto(dados.minhaLoja || []);
      setStatus('✅ Sistema Atualizado');
    } catch { 
      setStatus('⚠️ Erro de Sincronização'); 
    }
  };

  useEffect(() => { sincronizar(); }, []);

  const converterFoto = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setFoto(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  const salvarCadastro = async (e) => {
    e.preventDefault();
    if (!validarImeiReal(novoAparelho.imei)) return alert("❌ IMEI Inválido!");
    try {
      const response = await fetch(`${API_URL}/cadastrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novoAparelho, foto })
      });
      if (response.ok) {
        alert("✅ Cadastrado com Sucesso!");
        setNovoAparelho({ cliente: '', aparelho: '', imei: '', preco: '' });
        setFoto("");
        sincronizar();
      } else {
        const errData = await response.json();
        alert(errData.mensagem || "Erro ao salvar.");
      }
    } catch (err) { alert("❌ Erro de conexão com o servidor."); }
  };

  const vender = async (id) => {
    try {
      const res = await fetch(`${API_URL}/estoque/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Vendido' })
      });
      if (res.ok) sincronizar();
    } catch (err) { alert("Erro ao processar venda."); }
  };

  useEffect(() => {
    const res = estoqueCompleto.filter(p => 
      p.aparelho.toLowerCase().includes(busca.toLowerCase()) || p.imei.includes(busca)
    );
    setMeuEstoque(res);
  }, [busca, estoqueCompleto]);

  return (
    <div style={{ padding: '20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>SmartSync Pro 📱</h1>
        <small>{status}</small>
      </div>

      <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>➕ Entrada de Aparelho</h3>
        <form onSubmit={salvarCadastro} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input placeholder="Cliente" value={novoAparelho.cliente} onChange={e => setNovoAparelho({...novoAparelho, cliente: e.target.value})} required />
          <input placeholder="Modelo" value={novoAparelho.aparelho} onChange={e => setNovoAparelho({...novoAparelho, aparelho: e.target.value})} required />
          <input placeholder="IMEI" value={novoAparelho.imei} onChange={e => setNovoAparelho({...novoAparelho, imei: e.target.value})} required />
          <input placeholder="Preço" type="number" value={novoAparelho.preco} onChange={e => setNovoAparelho({...novoAparelho, preco: e.target.value})} required />
          <div style={{ gridColumn: 'span 2' }}>
             <label>📸 Foto: </label>
             <input type="file" accept="image/*" onChange={converterFoto} />
          </div>
          <button type="submit" style={{ gridColumn: 'span 2', background: '#28a745', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>SALVAR NO SISTEMA</button>
        </form>
      </div>

      <input placeholder="🔍 Buscar por IMEI ou Modelo..." value={busca} onChange={e => setBusca(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />

      <div style={{ marginTop: '20px' }}>
        {meuEstoque.map(item => (
          <div key={item.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              {item.foto && <img src={item.foto} style={{ width: '50px', height: '50px', borderRadius: '5px', objectFit: 'cover' }} alt="celular" />}
              <div>
                <strong>{item.aparelho}</strong> <br/>
                <small>IMEI: {item.imei} | Cliente: {item.cliente}</small> <br/>
                <span style={{ color: item.status === 'Vendido' ? 'red' : 'green', fontSize: '12px' }}>● {item.status.toUpperCase()}</span>
              </div>
            </div>
            <div>
              {item.status !== 'Vendido' && <button onClick={() => vender(item.id)}>💰 Vender</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;