import React, { useState, useEffect } from 'react';
import { db } from './db';

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

function App() {
  const [busca, setBusca] = useState('');
  const [meuEstoque, setMeuEstoque] = useState([]);
  const [estoqueCompleto, setEstoqueCompleto] = useState([]);
  const [status, setStatus] = useState('Sincronizando...');
  const [foto, setFoto] = useState("");
  const [novoAparelho, setNovoAparelho] = useState({ cliente: '', aparelho: '', imei: '', preco: '' });

  const sincronizar = async () => {
    try {
      const res = await fetch('https://teste-iaxg.onrender.com');
      const dados = await res.json();
      setEstoqueCompleto(dados.minhaLoja);
      setStatus('✅ Sistema Atualizado');
    } catch { setStatus('⚠️ Erro de Sincronização'); }
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
      const response = await fetch('http://localhost:3001/api/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novoAparelho, foto })
      });
      if (response.ok) {
        alert("✅ Cadastrado com Foto!");
        setNovoAparelho({ cliente: '', aparelho: '', imei: '', preco: '' });
        setFoto("");
        sincronizar();
      }
    } catch (err) { alert("❌ Erro ao salvar."); }
  };

  const imprimirRecibo = (item) => {
    const janela = window.open('', '', 'width=700,height=800');
    janela.document.write(`
      <html>
        <body style="font-family:sans-serif; padding:30px;">
          <h2 style="text-align:center;">RECIBO DE VENDA</h2>
          <p><strong>Aparelho:</strong> ${item.aparelho}</p>
          <p><strong>IMEI:</strong> ${item.imei}</p>
          <p><strong>Valor:</strong> ${formatarMoeda(item.preco)}</p>
          <p><strong>Data:</strong> ${item.dataVenda}</p>
          ${item.foto ? `<img src="${item.foto}" style="width:200px; display:block; margin: 20px 0; border: 1px solid #ccc;"/>` : ""}
          <p style="font-size:12px; color:#666;">Garantia: 90 dias contra defeitos funcionais.</p>
        </body>
      </html>
    `);
    janela.document.close();
    janela.print();
  };

  const gerarRelatorioVendas = () => {
    const vendidas = estoqueCompleto.filter(i => i.status === 'Vendido');
    const total = vendidas.reduce((acc, i) => acc + i.preco, 0);
    const janela = window.open('', '', 'width=800,height=600');
    janela.document.write(`
      <html>
        <body style="font-family:sans-serif; padding:20px;">
          <h2>Relatório Geral de Vendas</h2>
          <table border="1" style="width:100%; border-collapse:collapse; text-align:left;">
            <thead><tr style="background:#eee;"><th>Data</th><th>Aparelho</th><th>IMEI</th><th>Valor</th></tr></thead>
            <tbody>
              ${vendidas.map(i => `<tr><td>${i.dataVenda}</td><td>${i.aparelho}</td><td>${i.imei}</td><td>${formatarMoeda(i.preco)}</td></tr>`).join('')}
            </tbody>
          </table>
          <h3>Total Bruto: ${formatarMoeda(total)}</h3>
        </body>
      </html>
    `);
    janela.document.close();
    janela.print();
  };

  const vender = async (id) => {
    await fetch(`http://localhost:3001/api/estoque/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Vendido' })
    });
    sincronizar();
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
        <button onClick={gerarRelatorioVendas} style={{ background: '#333', color: 'white', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>📊 Gerar Relatório Mensal</button>
      </div>

      <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3>➕ Entrada de Aparelho</h3>
        <form onSubmit={salvarCadastro} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input placeholder="Cliente" value={novoAparelho.cliente} onChange={e => setNovoAparelho({...novoAparelho, cliente: e.target.value})} required />
          <input placeholder="Modelo" value={novoAparelho.aparelho} onChange={e => setNovoAparelho({...novoAparelho, aparelho: e.target.value})} required />
          <input placeholder="IMEI" value={novoAparelho.imei} onChange={e => setNovoAparelho({...novoAparelho, imei: e.target.value})} required />
          <input placeholder="Preço" type="number" value={novoAparelho.preco} onChange={e => setNovoAparelho({...novoAparelho, preco: e.target.value})} required />
          <div style={{ gridColumn: 'span 2' }}>
             <label>📸 Foto do Estado do Celular: </label>
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
            <div style={{ display: 'flex', gap: '5px' }}>
              {item.status === 'Vendido' ? <button onClick={() => imprimirRecibo(item)}>🖨️ Recibo</button> : <button onClick={() => vender(item.id)}>💰 Vender</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;