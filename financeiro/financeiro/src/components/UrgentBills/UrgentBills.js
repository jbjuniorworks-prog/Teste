import React from "react";

const fmt = (str) =>
  str ? new Date(str + "T12:00:00").toLocaleDateString("pt-BR") : "-";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function UrgentBills({ contas = [], onPagar }) {
  if (contas.length === 0) return null;

  return (
    <section className="urgent-area">
      <div className="section-header">
        <h3>Vencendo em breve</h3>
        <small>Conta</small>
      </div>

      <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
        {contas.map((t) => (
          <article key={t.id} className="urgent-card">
            <div>
              <strong>{t.descricao}</strong>
              <p>Vence {fmt(t.data_vencimento)}</p>
            </div>

            <div style={{ textAlign: "right" }}>
              <strong>{money(t.valor)}</strong>
              <div style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="goal-btn"
                  onClick={() => onPagar(t)}
                >
                  Pagar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}