import React, { useMemo, useState } from "react";
import { getCat } from "../../../constants/categorias";
import ConfirmDialog from "../../../components/shared/ConfirmDialog/ConfirmDialog";
import "./TransactionsTable.css";

const IconSVG = ({ path, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const SEARCH_PATH = "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z";
const CLOSE_PATH = "M18 6L6 18M6 6l12 12";
const DEL_PATH =
  "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2";
const CHECK_PATH = "M20 6L9 17l-5-5";

const formatDate = (str) =>
  str ? new Date(`${str}T12:00:00`).toLocaleDateString("pt-BR") : "";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const plural = (n, one, many) => (n === 1 ? one : many);

export default function TransactionsTable({
  transacoes = [],
  mesAtualStr,
  loading,
  onTogglePago,
  confirmandoId,
  pedirConfirmacaoTransacao,
  cancelarConfirmacaoTransacao,
  confirmarDeletarTransacao,
}) {
  const [filtro, setFiltro] = useState("mes");
  const [buscando, setBuscando] = useState(false);
  const [busca, setBusca] = useState("");

  const tFiltradas = useMemo(() => {
    let lista =
      filtro === "todas"
        ? transacoes
        : transacoes.filter((t) => t.data_vencimento?.startsWith(mesAtualStr));

    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter(
        (t) =>
          t.descricao?.toLowerCase().includes(q) ||
          t.categoria?.toLowerCase().includes(q)
      );
    }

    return [...lista].sort((a, b) =>
      (b.data_vencimento || "").localeCompare(a.data_vencimento || "")
    );
  }, [transacoes, filtro, mesAtualStr, busca]);

  const totais = useMemo(
    () => ({
      entradas: tFiltradas
        .filter((t) => t.tipo === "entrada")
        .reduce((s, t) => s + Number(t.valor || 0), 0),
      saidas: tFiltradas
        .filter((t) => t.tipo === "saida")
        .reduce((s, t) => s + Number(t.valor || 0), 0),
      pagas: tFiltradas.filter((t) => t.tipo === "saida" && t.pago).length,
      abertas: tFiltradas.filter((t) => t.tipo === "saida" && !t.pago).length,
    }),
    [tFiltradas]
  );

  const transacaoPendente = confirmandoId
    ? transacoes.find((t) => t.id === confirmandoId)
    : null;

  const toggleBusca = () => {
    setBuscando((prev) => {
      const next = !prev;
      if (!next) setBusca("");
      return next;
    });
  };

  return (
    <section className="history-section">
      <div className="history-toolbar">
        <div className="history-title-wrap">
          <h3>Histórico</h3>
          <small className="history-subtitle">
            {tFiltradas.length} {plural(tFiltradas.length, "item", "itens")}
          </small>
        </div>

        <div className="history-actions">
          <button
            type="button"
            className={`goal-btn history-search-btn ${buscando ? "is-active" : ""}`}
            aria-label={buscando ? "Fechar busca" : "Buscar transação"}
            onClick={toggleBusca}
          >
            <IconSVG path={buscando ? CLOSE_PATH : SEARCH_PATH} size={15} />
          </button>

          <div className="chips">
            <button
              type="button"
              className={filtro === "mes" ? "active" : ""}
              onClick={() => setFiltro("mes")}
              aria-pressed={filtro === "mes"}
            >
              Mês
            </button>
            <button
              type="button"
              className={filtro === "todas" ? "active" : ""}
              onClick={() => setFiltro("todas")}
              aria-pressed={filtro === "todas"}
            >
              Tudo
            </button>
          </div>
        </div>
      </div>

      {buscando && (
        <div className="history-search-wrap">
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
            className="busca-input"
          />
        </div>
      )}

      {tFiltradas.length > 0 && (
        <div className="history-mini-summary">
          <span className="history-summary-label">Resumo do período</span>
          <div className="history-summary-values">
            <span className="history-total history-total-in">
              +{money(totais.entradas)}
            </span>
            <span className="history-total history-total-out">
              -{money(totais.saidas)}
            </span>
            <span className="history-total history-total-neutral">
              {totais.abertas} em aberto · {totais.pagas} pagas
            </span>
          </div>
        </div>
      )}

      {tFiltradas.length > 0 && !loading && (
        <div className="history-list-label">Movimentações</div>
      )}

      {loading && (
        <div className="feed-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      )}

      {!loading && tFiltradas.length > 0 && (
        <div className="feed">
          {tFiltradas.map((t) => {
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
                  style={{
                    background: c.cor || "#555",
                    color: "#fff",
                    fontWeight: 700,
                  }}
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

                    <span
                      className="categoria-badge"
                      style={{ color: c.cor || "#cfcfcf" }}
                    >
                      {c.label}
                    </span>
                  </div>
                </div>

                <div className="feed-right">
                  <strong className={`feed-price ${isEntrada ? "price-entrada" : ""}`}>
                    {isEntrada ? "+" : "-"}
                    {money(t.valor)}
                  </strong>

                  <div className="feed-btns">
                    {!isEntrada && (
                      <button
                        type="button"
                        className={`pay-check ${t.pago ? "pay-check-done" : ""}`}
                        onClick={() => onTogglePago(t)}
                        aria-label={t.pago ? "Desfazer pagamento" : "Marcar como pago"}
                      >
                        {t.pago ? <IconSVG path={CHECK_PATH} size={14} /> : "Pagar"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="del-btn"
                      onClick={() => pedirConfirmacaoTransacao(t.id)}
                      aria-label={`Excluir ${t.descricao}`}
                    >
                      <IconSVG path={DEL_PATH} size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && tFiltradas.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h11l4 4v10a2 2 0 01-2 2h-4" />
              <polyline points="9 17 9 13 15 13 15 17" />
            </svg>
          </div>
          <h4>Nenhuma transação</h4>
          <p>
            {busca
              ? `Nenhum resultado para "${busca}".`
              : "Registre sua primeira transação acima."}
          </p>
        </div>
      )}

      {transacaoPendente && (
        <ConfirmDialog
          titulo="Excluir transação"
          mensagem={`Deseja excluir "${transacaoPendente.descricao}"? Esta ação não pode ser desfeita.`}
          labelConfirmar="Excluir"
          perigoso
          onConfirm={confirmarDeletarTransacao}
          onClose={cancelarConfirmacaoTransacao}
        />
      )}
    </section>
  );
}
