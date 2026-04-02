const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

// Configuração de CORS robusta para evitar erros no navegador
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// Aumentamos o limite para suportar o envio de fotos em Base64
app.use(express.json({ limit: '10mb' })); 

const CAMINHO_ARQUIVO = './dados.json';

const lerDados = () => {
    if (!fs.existsSync(CAMINHO_ARQUIVO)) {
        fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify({ minhaLoja: [] }));
        return { minhaLoja: [] };
    }
    try {
        const conteudo = fs.readFileSync(CAMINHO_ARQUIVO, 'utf-8');
        return JSON.parse(conteudo || '{"minhaLoja": []}');
    } catch (e) { 
        return { minhaLoja: [] }; 
    }
};

// Rota inicial para o Render mostrar que o serviço está ativo
app.get('/', (req, res) => res.send("🚀 SmartSync API Online e Operante"));

// Rota de sincronização
app.get('/api/sincronizar', (req, res) => res.json(lerDados()));

// Rota de cadastro
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

// Rota de atualização (Venda)
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
    } else {
        res.status(404).json({ mensagem: "Item não encontrado" });
    }
});

// Porta dinâmica para o Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend Pro rodando na porta ${PORT}`);
});