const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
// Aumentamos o limite para suportar o envio de fotos em Base64
app.use(express.json({ limit: '10mb' })); 

const CAMINHO_ARQUIVO = './dados.json';

const lerDados = () => {
    if (!fs.existsSync(CAMINHO_ARQUIVO)) return { minhaLoja: [] };
    try {
        return JSON.parse(fs.readFileSync(CAMINHO_ARQUIVO));
    } catch (e) { return { minhaLoja: [] }; }
};

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
        garantia: "90 dias"
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

app.delete('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    let banco = lerDados();
    banco.minhaLoja = banco.minhaLoja.filter(item => item.id !== parseInt(id));
    fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
    res.json({ mensagem: "Excluído!" });
});

// O Render usa uma variável de ambiente chamada PORT, se não existir, ele usa a 3001
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Pro rodando na porta ${PORT}`);
});