import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { getCat } from "../../../constants/categorias";
import PageHeader from "../../../components/shared/PageHeader/PageHeader";
import CashflowChart from "../components/CashflowChart";
import UrgentBillsCard from "../components/UrgentBillsCard";
import {
  selecionarContasProximas,
  selecionarUltimasTransacoes,
  filtrarTransacoesDoMes,
} from "../utils/selectors";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (str) =>
  str ? new Date(`${str}T12:00:00`).toLocaleDateString("pt-BR") : "";

const hojeFormatado = () =>
  new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

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
    () => filtrarTransacoesDoMes(transacoes, mesAtualStr),
    [transacoes, mesAtualStr]
  );

  const { ganhos, despesas } = totais(transacoes);

  const contasProximas = useMemo(
    () => selecionarContasProximas(transacoes),
    [transacoes]
  );

  const ultimasTransacoes = useMemo(
    () => selecionarUltimasTransacoes(transacoes),
    [transacoes]
  );

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

      <div className="page-body">
        <p className="dashboard-updated">Atualizado hoje, {hojeFormatado()}</p>

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
              <div className="feed">
                {ultimasTransacoes.map((t) => {
                  const c = getCat(t.categoria);
                  const isEntrada = t.tipo === "entrada";

                  return (
                    <article
                      key={t.id}
                      className={`feed-card ${isEntrada ? "is-entrada" : "is-saida"} ${
                        t.pago ? "is-pago" : ""
                      }`}
                    >
                      <div
                        className="feed-icon"
                        style={{ background: c.cor || "#555", color: "#fff", fontWeight: 700 }}
                      >
                        {(c.label || t.categoria || "?").charAt(0).toUpperCase()}
                      </div>

                      <div className="feed-info">
                        <strong>{t.descricao}</strong>

                        <div className="feed-meta">
                          <span>{formatDate(t.data_vencimento)}</span>

                          {t.total_parcelas > 1 && (
                            <span className="parcela-badge">
                              {t.num_parcela}/{t.total_parcelas}x
                            </span>
                          )}

                          {t.pago && <span className="pago-badge">Pago</span>}

                          <span className="categoria-badge" style={{ color: c.cor || "#cfcfcf" }}>
                            {c.label}
                          </span>
                        </div>
                      </div>

                      <strong className={`feed-price ${isEntrada ? "price-entrada" : ""}`}>
                        {isEntrada ? "+" : "-"}
                        {money(t.valor)}
                      </strong>
                    </article>
                  );
                })}
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
