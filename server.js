const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Suporte para fotos em Base64 [cite: 2]

const CAMINHO_ARQUIVO = './dados.json';

// Validação de IMEI real (Algoritmo de Luhn) [cite: 3, 4, 7]
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

const lerDados = () => {
    try {
        if (!fs.existsSync(CAMINHO_ARQUIVO)) return { minhaLoja: [] };
        const conteudo = fs.readFileSync(CAMINHO_ARQUIVO, 'utf-8');
        return JSON.parse(conteudo || '{"minhaLoja": []}');
    } catch (e) { return { minhaLoja: [] }; }
};

app.get('/', (req, res) => res.send("🚀 SmartSync API Online"));
app.get('/api/sincronizar', (req, res) => res.json(lerDados()));

app.post('/api/salvar', (req, res) => {
    const { cliente, aparelho, imei, preco, foto } = req.body;
    if (!validarImeiReal(imei)) return res.status(400).json({ mensagem: "❌ IMEI inválido!" });
    
    const banco = lerDados();
    if (banco.minhaLoja.find(item => item.imei === imei)) return res.status(400).json({ mensagem: "⚠️ IMEI já cadastrado!" });
    
    const novoItem = { 
        id: Date.now(), cliente, aparelho, imei, foto,
        preco: Number(preco), status: 'Em estoque',
        dataCadastro: new Date().toLocaleDateString('pt-BR') // Registra entrada [cite: 11, 12]
    };
    banco.minhaLoja.push(novoItem);
    fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
    res.json(novoItem);
});

app.put('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    let banco = lerDados();
    const index = banco.minhaLoja.findIndex(item => item.id === parseInt(id));
    
    if (index !== -1) {
        const itemAtual = banco.minhaLoja[index];
        const novosDados = req.body;

        // Histórico de Venda Automático
        if (novosDados.status === 'Vendido' && itemAtual.status !== 'Vendido') {
            novosDados.dataVenda = new Date().toLocaleString('pt-BR'); // Salva data e hora da venda
        } else if (novosDados.status === 'Em estoque') {
            novosDados.dataVenda = null;
        }

        banco.minhaLoja[index] = { ...itemAtual, ...novosDados };
        fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
        res.json(banco.minhaLoja[index]);
    } else { res.status(404).send("Item não encontrado"); }
});

app.delete('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    let banco = lerDados();
    banco.minhaLoja = banco.minhaLoja.filter(item => item.id !== parseInt(id));
    fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
    res.json({ mensagem: "Excluído!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));