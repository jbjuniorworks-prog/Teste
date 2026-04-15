import React, { useState } from "react";
import { getCat } from "../../constants/categorias";

const Icon = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const DEL_PATH = "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2";
const CHECK_PATH = "M20 6L9 17l-5-5";

const formatDate = (str) => str ? new Date(str + "T12:00:00").toLocaleDateString("pt-BR") : "";

export default function History({ transacoes, mesAtualStr, loading, onTogglePago, onDeletar }) {
  const [filtro, setFiltro] = useState("mes");
  const tExibidas = filtro === "todas" ? transacoes : transacoes.filter(t => t.data_vencimento?.startsWith(mesAtualStr));

  return (
    <section className="history-section">
      <div className="section-header">
        <h3>Historico</h3>
        <div className="chips">
          <button className={filtro === "mes" ? "active" : ""} onClick={() => setFiltro("mes")}>Mes</button>
          <button className={filtro === "todas" ? "active" : ""} onClick={() => setFiltro("todas")}>Tudo</button>
        </div>
      </div>

      {loading && <p className="loading-msg">Carregando...</p>}

      <div className="feed">
        {tExibidas.map(t => {
          const c = getCat(t.categoria);
          const isEntrada = t.tipo === "entrada";
          return (
            <div key={t.id} className={["feed-card", t.pago ? "is-paid" : "", isEntrada ? "is-entrada" : ""].filter(Boolean).join(" ")}>
              <div className="feed-icon" style={{ background: c.cor + "20", color: c.cor }}>
                <Icon path={c.svg} size={20} />
              </div>
              <div className="feed-info">
                <strong>{t.descricao}</strong>
                <span>
                  {formatDate(t.data_vencimento)}
                  {t.total_parcelas > 1 && <span className="parcela-badge">{t.num_parcela}/{t.total_parcelas}</span>}
                </span>
              </div>
              <div className="feed-right">
                <span className={`feed-price ${isEntrada ? "price-entrada" : ""}`}>
                  {isEntrada ? "+" : "-"} R$ {(t.valor || 0).toFixed(2)}
                </span>
                <div className="feed-btns">
                  {!isEntrada && (
                    <button className={`pay-check ${t.pago ? "pay-check--paid" : ""}`} onClick={() => onTogglePago(t)}>
                      {t.pago ? <Icon path={CHECK_PATH} size={14} /> : "Pagar"}
                    </button>
                  )}
                  <button className="del-btn" onClick={() => onDeletar(t.id)} aria-label="Excluir">
                    <Icon path={DEL_PATH} size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && tExibidas.length === 0 && <p className="empty-msg">Nenhuma transacao encontrada.</p>}
      </div>
    </section>
  );
}
