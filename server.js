const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); 

const CAMINHO_ARQUIVO = './dados.json';

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
    const banco = lerDados();
    
    const novoItem = { 
        id: Date.now(), 
        cliente, aparelho, imei, foto,
        preco: Number(preco),
        status: 'Em estoque',
        dataCadastro: new Date().toLocaleDateString('pt-BR')
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
        banco.minhaLoja[index] = { ...banco.minhaLoja[index], ...req.body };
        fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
        res.json(banco.minhaLoja[index]);
    } else {
        res.status(404).send("Item não encontrado");
    }
});

app.delete('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    let banco = lerDados();
    banco.minhaLoja = banco.minhaLoja.filter(item => item.id !== parseInt(id));
    fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(banco, null, 2));
    res.json({ mensagem: "Excluído" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));