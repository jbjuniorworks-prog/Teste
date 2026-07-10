import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { getCat } from "../../../constants/categorias";
import PageHeader from "../../../components/shared/PageHeader/PageHeader";
import CashflowChart from "../components/CashflowChart";
import UrgentBillsCard from "../components/UrgentBillsCard";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (str) =>
  str ? new Date(`${str}T12:00:00`).toLocaleDateString("pt-BR") : "";

export default function DashboardPage() {
  const {
    transacoes,
    objetivos,
    mesAtualStr,
    totais,
    togglePago,
    user,
    onLogout,
    adicionarObjetivo,
    atualizarObjetivo,
    confirmandoObjetivoId,
    pedirConfirmacaoObjetivo,
    cancelarConfirmacaoObjetivo,
    confirmarDeletarObjetivo,
  } = useOutletContext();

  const transacoesMes = useMemo(
    () => transacoes.filter((t) => t.data_vencimento?.startsWith(mesAtualStr)),
    [transacoes, mesAtualStr]
  );

  const { ganhos, despesas } = totais(transacoes);

  const contasProximas = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === "saida" && !t.pago)
      .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""))
      .slice(0, 5);
  }, [transacoes]);

  const ultimasTransacoes = useMemo(() => {
    return [...transacoes]
      .sort((a, b) => (b.data_vencimento || "").localeCompare(a.data_vencimento || ""))
      .slice(0, 5);
  }, [transacoes]);

  const insights = useMemo(() => {
    const lista = [];

    const proximaConta = contasProximas[0];
    if (proximaConta) {
      lista.push({
        title: `Conta próxima do vencimento: ${proximaConta.descricao}`,
        description: `Vence em ${formatDate(proximaConta.data_vencimento)} · ${money(proximaConta.valor)}.`,
      });
    }

    const gastosPorCategoria = transacoesMes
      .filter((t) => t.tipo === "saida")
      .reduce((acc, t) => {
        const key = t.categoria || "outros";
        acc[key] = (acc[key] || 0) + Number(t.valor || 0);
        return acc;
      }, {});

    const [categoriaTopo, valorTopo] =
      Object.entries(gastosPorCategoria).sort((a, b) => b[1] - a[1])[0] || [];

    if (categoriaTopo) {
      lista.push({
        title: `Maior gasto do mês: ${getCat(categoriaTopo).label}`,
        description: `Total de ${money(valorTopo)} em ${getCat(categoriaTopo).label.toLowerCase()} este mês.`,
      });
    }

    const objetivoMaisProximo = [...objetivos]
      .map((o) => ({
        ...o,
        progresso: Number(o.meta) > 0 ? (Number(o.atual || 0) / Number(o.meta)) * 100 : 0,
      }))
      .filter((o) => o.progresso < 100)
      .sort((a, b) => b.progresso - a.progresso)[0];

    if (objetivoMaisProximo) {
      lista.push({
        title: `Objetivo mais próximo da meta: ${objetivoMaisProximo.nome}`,
        description: `${objetivoMaisProximo.progresso.toFixed(0)}% concluído.`,
      });
    }

    return lista;
  }, [contasProximas, transacoesMes, objetivos]);

  return (
    <section className="dashboard-page">
      <PageHeader
        ganhos={ganhos}
        despesas={despesas}
        user={user}
        objetivos={objetivos}
        onAddGoal={adicionarObjetivo}
        onEditGoal={atualizarObjetivo}
        onAskDeleteGoal={pedirConfirmacaoObjetivo}
        confirmandoObjetivoId={confirmandoObjetivoId}
        cancelarConfirmacaoObjetivo={cancelarConfirmacaoObjetivo}
        confirmarDeletarObjetivo={confirmarDeletarObjetivo}
        onLogout={onLogout}
      />

      <header className="page-header">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Dashboard</h1>
          <p>Acompanhe saldo, movimentações e metas em um só lugar.</p>
        </div>
      </header>

      <div className="page-body">
        <div className="dashboard-main-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Últimas transações</h2>
                <p>Movimentações mais recentes da sua conta.</p>
              </div>
            </div>

            {ultimasTransacoes.length === 0 ? (
              <p>Nenhuma transação registrada ainda.</p>
            ) : (
              <div className="transaction-list">
                {ultimasTransacoes.map((t) => (
                  <div key={t.id} className="transaction-item">
                    <div>
                      <strong>{t.descricao}</strong>
                      <span>{getCat(t.categoria).label}</span>
                    </div>

                    <div className="transaction-meta">
                      <span>{formatDate(t.data_vencimento)}</span>
                      <strong>
                        {t.tipo === "entrada" ? "+ " : "- "}
                        {money(t.valor)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Resumo rápido</h2>
                <p>Pontos de atenção para esta semana.</p>
              </div>
            </div>

            {insights.length === 0 ? (
              <p>Sem destaques por enquanto.</p>
            ) : (
              <div className="insights-list">
                {insights.map((item) => (
                  <div key={item.title} className="insight-item">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <UrgentBillsCard contas={contasProximas} onPagar={togglePago} />
          </article>

          <article className="panel">
            <CashflowChart transacoesMes={transacoesMes} />
          </article>
        </div>
      </div>
    </section>
  );
}
