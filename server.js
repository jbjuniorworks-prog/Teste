const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); 

const CAMINHO_ARQUIVO = './dados.json';

const lerDados = () => {
    if (!fs.existsSync(CAMINHO_ARQUIVO)) {
        fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify({ minhaLoja: [] }));
        return { minhaLoja: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(CAMINHO_ARQUIVO));
    } catch (e) { return { minhaLoja: [] }; }
};

// Rota inicial para o Render não dar erro de "Cannot GET /"
app.get('/', (req, res) => res.send("🚀 SmartSync API Online"));

app.get('/api/sincronizar', (req, res) => res.json(lerDados()));

app.post('/api/cadastrar', (req, res) => {
    const { cliente, aparelho, imei, preco, foto } = req.body;
    const banco = lerDados();

    if (banco.minhaLoja.find(item => item.imei.trim() === imei.trim())) {
        return res.status(400).json({ mensagem: "⚠️ IMEI já cadastrado!" });
    }

    const novoItem = { 
        id: Date.now(), 
        cliente, aparelho, imei, foto,
        preco: Number(preco),
        status: 'Em estoque',
        dataCadastro: new Date().toLocaleDateString('pt-BR'),
    };

    banco.minhaLoja.push(novoItem);
    fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
    res.json({ mensagem: "Salvo com sucesso!", item: novoItem });
});

app.put('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    let banco = lerDados();
    const index = banco.minhaLoja.findIndex(item => item.id === parseInt(id));
    
    if (index !== -1) {
        banco.minhaLoja[index].status = req.body.status;
        if (req.body.status === 'Vendido') {
            banco.minhaLoja[index].dataVenda = new Date().toLocaleDateString('pt-BR');
        }
        fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
        res.json({ mensagem: "Status atualizado!" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});