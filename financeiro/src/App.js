import React from 'react';
import './App.css';

// Importando o Hook que tem toda a lógica do Supabase e Objetivos
import { useTransacoes } from './hooks/useTransacoes';

// Importação dos seus componentes
import Header from './components/Header/Header';
import TransactionForm from './components/TransactionForm/TransactionForm';
import History from './components/History/History';

function App() {
  // Como ainda não criamos a tela de Login verdadeira, 
  // vamos simular um ID de usuário (formato UUID válido) para o banco aceitar
  const dummyUserId = "00000000-0000-0000-0000-000000000000";
  const userSimulado = { email: "usuario@financas.com" };

  // Chamando o nosso Hook e pegando TUDO o que precisamos dele!
  const { 
    transacoes, objetivos, loading, erro, setErro, mesAtualStr, totais, 
    adicionarTransacao, togglePago, deletarTransacao,
    adicionarObjetivo, atualizarObjetivo, deletarObjetivo 
  } = useTransacoes(dummyUserId);

  // Calcula os totais apenas para as transações do mês atual (para exibir no Header)
  const transacoesMes = transacoes.filter(t => t.data_vencimento?.startsWith(mesAtualStr));
  const totaisMes = totais(transacoesMes);

  return (
    <div className="app-dark-mode">
      <div className="phone-container">
        
        <Header 
          ganhos={totaisMes.ganhos} 
          despesas={totaisMes.despesas} 
          user={userSimulado}
          onSair={() => alert("O Login de verdade vem no próximo passo! 😉")}
          objetivos={objetivos} 
          
          // Funções dos Objetivos conectadas aos prompts!
          onAddGoal={() => {
            const nome = prompt("Qual o nome do novo objetivo? (Ex: Carro Novo)");
            if (!nome) return;
            const meta = prompt(`Qual o valor da meta para ${nome}? (Apenas números)`);
            if (nome && meta) {
              adicionarObjetivo({ nome, meta: parseFloat(meta), atual: 0, cor: "#6C5CE7" });
            }
          }}
          onEditGoal={atualizarObjetivo}
          onDeleteGoal={deletarObjetivo}
        />
        
        <main className="premium-content">
          <TransactionForm 
            onSubmit={adicionarTransacao} 
            erro={erro}
            setErro={setErro}
          />
          
          <History 
            transacoes={transacoes}
            mesAtualStr={mesAtualStr}
            loading={loading}
            onTogglePago={togglePago}
            onDeletar={deletarTransacao}
          />
        </main>
      </div>
    </div>
  );
}

export default App;