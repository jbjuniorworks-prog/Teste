import React from "react";

const fmt = (str) =>
  str ? new Date(str + "T12:00:00").toLocaleDateString("pt-BR") : "-";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const diasRestantes = (str) => {
  if (!str) return null;
  const hoje = new Date();
  const venc = new Date(str + "T12:00:00");
  return Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
};

const urgenciaCor = (dias) => {
  if (dias < 0)  return "#ff4757";
  if (dias <= 2) return "#ff6b35";
  if (dias <= 5) return "#ffa502";
  return "#2ed573";
};

const urgenciaLabel = (dias) => {
  if (dias < 0)   return `Vencida há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje!";
  if (dias === 1) return "Vence amanhã";
  return `Vence em ${dias} dias`;
};

export default function UrgentBills({ contas = [], onPagar }) {
  if (contas.length === 0) return null;

  return (
    <section className="urgent-area">
      <div className="section-header">
        <h3>Vencendo em breve</h3>
        <small>{contas.length} conta{contas.length > 1 ? "s" : ""}</small>
      </div>

      <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
        {contas.map((t) => {
          const dias = diasRestantes(t.data_vencimento);
          const cor  = urgenciaCor(dias);

          return (
            <article key={t.id} className="urgent-card" style={{ borderLeft: `3px solid ${cor}` }}>
              <div>
                <strong>{t.descricao}</strong>
                <p style={{ color: cor, fontSize: "0.8rem", marginTop: "3px" }}>
                  {urgenciaLabel(dias)} · {fmt(t.data_vencimento)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong>{money(t.valor)}</strong>
                <div style={{ marginTop: "8px" }}>
                  <button type="button" className="goal-btn"
                    onClick={() => onPagar(t)} aria-label={`Pagar ${t.descricao}`}>
                    Pagar
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}