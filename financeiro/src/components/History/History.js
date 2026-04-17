import React, { useState } from "react";
import { getCat } from "../../constants/categorias";

const Icon = ({ path, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);

const DEL_PATH =
  "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2";

const CHECK_PATH = "M20 6L9 17l-5-5";

const formatDate = (str) =>
  str ? new Date(str + "T12:00:00").toLocaleDateString("pt-BR") : "";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function History({
  transacoes = [],
  mesAtualStr,
  loading,
  onTogglePago,
  onDeletar,
}) {
  const [filtro, setFiltro] = useState("mes");

  const tExibidas =
    filtro === "todas"
      ? transacoes
      : transacoes.filter((t) => t.data_vencimento?.startsWith(mesAtualStr));

  return (
    <section className="history-section">
      <div className="history-toolbar">
        <h3>Histórico</h3>

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

      {loading && <div className="feed-card">Carregando...</div>}

      {!loading &&
        tExibidas.map((t) => {
          const c = getCat(t.categoria);
          const isEntrada = t.tipo === "entrada";

          return (
            <article
              key={t.id}
              className={`feed-card ${isEntrada ? "is-entrada" : "is-saida"}`}
            >
              <div
                className="feed-icon"
                style={{ background: c.cor || "#999" }}
              >
                {c.label?.[0] || "$"}
              </div>

              <div className="feed-info">
                <strong>{t.descricao}</strong>

                <div className="feed-meta">
                  {formatDate(t.data_vencimento)}
                  {t.total_parcelas > 1 && (
                    <span className="parcela-badge">
                      {t.num_parcela}/{t.total_parcelas}
                    </span>
                  )}
                </div>
              </div>

              <div className="feed-right">
                <strong className={`feed-price ${isEntrada ? "price-entrada" : ""}`}>
                  {isEntrada ? "+" : "-"} {money(t.valor)}
                </strong>

                <div className="feed-btns">
                  {!isEntrada && (
                    <button
                      type="button"
                      className="pay-check"
                      onClick={() => onTogglePago(t)}
                      aria-label={t.pago ? "Marcar como não pago" : "Marcar como pago"}
                    >
                      {t.pago ? <Icon path={CHECK_PATH} size={14} /> : "Pagar"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="del-btn"
                    onClick={() => onDeletar(t.id)}
                    aria-label={`Excluir ${t.descricao}`}
                  >
                    <Icon path={DEL_PATH} size={14} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

      {!loading && tExibidas.length === 0 && (
        <div className="feed-card">Nenhuma transação encontrada.</div>
      )}
    </section>
  );
}