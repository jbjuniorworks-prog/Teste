import React, { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { useTransacoes } from "./hooks/useTransacoes";

import Auth from "./components/Auth/Auth";
import Header from "./components/Header/Header";
import TransactionForm from "./components/TransactionForm/TransactionForm";
import UrgentBills from "./components/UrgentBills/UrgentBills";
import History from "./components/History/History";

function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    const carregarSessao = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoadingAuth(false);
      }
    };

    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const user = session?.user || null;
  const userId = user?.id || null;

  const {
    transacoes,
    objetivos,
    loading,
    erro,
    setErro,
    mesAtualStr,
    totais,
    adicionarTransacao,
    togglePago,
    deletarTransacao,
    adicionarObjetivo,
    atualizarObjetivo,
    deletarObjetivo,
  } = useTransacoes(userId);

  const transacoesMes = transacoes.filter((t) =>
    t.data_vencimento?.startsWith(mesAtualStr)
  );

  const totaisMes = totais(transacoesMes);

  const contasUrgentes = transacoesMes
    .filter((t) => t.tipo === "saida" && !t.pago)
    .sort((a, b) =>
      (a.data_vencimento || "").localeCompare(b.data_vencimento || "")
    )
    .slice(0, 3);

  const fmtMoney = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  if (loadingAuth) {
    return (
      <div className="app-dark-mode">
        <div className="phone-container">
          <div style={{ padding: 24, color: "#fff" }}>Carregando...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app-dark-mode">
      <div className="phone-container">
        <Header
          ganhos={totaisMes.ganhos}
          despesas={totaisMes.despesas}
          user={user}
          objetivos={objetivos}
          onAddGoal={() => {
            const nome = prompt("Qual o nome do novo objetivo?");
            if (!nome) return;

            const meta = prompt(`Qual o valor da meta para ${nome}?`);
            if (!meta) return;

            const metaNumero = parseFloat(String(meta).replace(",", "."));
            if (Number.isNaN(metaNumero) || metaNumero <= 0) {
              alert("Digite uma meta válida.");
              return;
            }

            adicionarObjetivo({
              nome,
              meta: metaNumero,
              atual: 0,
              cor: "#6C5CE7",
            });
          }}
          onEditGoal={atualizarObjetivo}
          onDeleteGoal={deletarObjetivo}
          onLogout={handleLogout}
        />

        <section className="quick-summary">
          <div className="summary-head">
            <h3>Visão rápida</h3>
            <small>Hoje</small>
          </div>

          <div className="summary-grid">
            <article className="summary-card">
              <p>Contas abertas</p>
              <strong>{contasUrgentes.length}</strong>
            </article>

            <article className="summary-card">
              <p>Transações</p>
              <strong>{transacoes.length}</strong>
            </article>

            <article className="summary-card">
              <p>Saldo</p>
              <strong>{fmtMoney(totaisMes.ganhos - totaisMes.despesas)}</strong>
            </article>
          </div>
        </section>

        <main className="premium-content">
          <TransactionForm
            onSubmit={adicionarTransacao}
            erro={erro}
            setErro={setErro}
          />

          <UrgentBills contas={contasUrgentes} onPagar={togglePago} />

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