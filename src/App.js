import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { useTransacoes } from "./hooks/useTransacoes";
import { ToastProvider, useToast } from "./components/Toast/ToastProvider";

import Auth from "./components/Auth/Auth";
import Header from "./components/Header/Header";
import TransactionForm from "./components/TransactionForm/TransactionForm";
import SpendingChart from "./components/SpendingChart/SpendingChart";
import UrgentBills from "./components/UrgentBills/UrgentBills";
import History from "./components/History/History";

function AppContent({ session, handleLogout }) {
  const { showToast } = useToast();
  const user = session?.user || null;
  const userId = user?.id || null;

  const notify = (payload) => showToast(payload);

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
    adicionarObjetivo,
    atualizarObjetivo,
    confirmandoId,
    pedirConfirmacaoTransacao,
    cancelarConfirmacaoTransacao,
    confirmarDeletarTransacao,
    confirmandoObjetivoId,
    pedirConfirmacaoObjetivo,
    cancelarConfirmacaoObjetivo,
    confirmarDeletarObjetivo,
  } = useTransacoes(userId, notify);

  const transacoesMes = useMemo(
    () => transacoes.filter((t) => t.data_vencimento?.startsWith(mesAtualStr)),
    [transacoes, mesAtualStr]
  );

  const totaisMes = useMemo(() => totais(transacoesMes), [totais, transacoesMes]);

  const contasUrgentes = useMemo(
    () =>
      transacoesMes
        .filter((t) => t.tipo === "saida" && !t.pago)
        .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""))
        .slice(0, 3),
    [transacoesMes]
  );

  const fmtMoney = (valor) =>
    Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div className="app-dark-mode">
      <div className="phone-container">
        <Header
          ganhos={totaisMes.ganhos}
          despesas={totaisMes.despesas}
          user={user}
          objetivos={objetivos}
          onAddGoal={adicionarObjetivo}
          onEditGoal={atualizarObjetivo}
          onAskDeleteGoal={pedirConfirmacaoObjetivo}
          confirmandoObjetivoId={confirmandoObjetivoId}
          cancelarConfirmacaoObjetivo={cancelarConfirmacaoObjetivo}
          confirmarDeletarObjetivo={confirmarDeletarObjetivo}
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

          <SpendingChart transacoesMes={transacoesMes} />

          <UrgentBills contas={contasUrgentes} onPagar={togglePago} />

          <History
            transacoes={transacoes}
            mesAtualStr={mesAtualStr}
            loading={loading}
            onTogglePago={togglePago}
            confirmandoId={confirmandoId}
            pedirConfirmacaoTransacao={pedirConfirmacaoTransacao}
            cancelarConfirmacaoTransacao={cancelarConfirmacaoTransacao}
            confirmarDeletarTransacao={confirmarDeletarTransacao}
          />
        </main>
      </div>
    </div>
  );
}

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
    } = supabase.auth.onAuthStateChange((_event, sessionAtual) => {
      setSession(sessionAtual);
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
    <ToastProvider>
      <AppContent session={session} handleLogout={handleLogout} />
    </ToastProvider>
  );
}

export default App;
