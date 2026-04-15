import React from "react";

const fmt = (str) => str ? str.split("-").reverse().join("/") : "-";

export default function UrgentBills({ contas, onPagar }) {
  if (contas.length === 0) return null;
  return (
    <div className="urgent-area">
      <div className="section-header">
        <small className="urgent-title">VENCENDO EM BREVE</small>
        <small className="urgent-count">{contas.length} conta{contas.length > 1 ? "s" : ""}</small>
      </div>
      {contas.map(t => (
        <div key={t.id} className="urgent-card">
          <div className="urgent-info">
            <strong>{t.descricao}</strong>
            <p>Vence {fmt(t.data_vencimento)}</p>
          </div>
          <div className="urgent-action">
            <strong>R$ {(t.valor || 0).toFixed(2)}</strong>
            <button className="btn-pay-small" onClick={() => onPagar(t)}>Pagar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
