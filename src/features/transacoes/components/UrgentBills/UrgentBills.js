import React from "react";

const fmt = (str) =>
  str ? new Date(`${str}T12:00:00`).toLocaleDateString("pt-BR") : "-";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const diasRestantes = (str) => {
  if (!str) return null;

  const hoje = new Date();
  const vencimento = new Date(`${str}T12:00:00`);

  return Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
};

const urgenciaMeta = (dias) => {
  if (dias < 0) {
    return {
      label: `Vencida há ${Math.abs(dias)} dia(s)`,
      cor: "#ff7675",
      fundo: "rgba(255, 118, 117, 0.12)",
    };
  }

  if (dias === 0) {
    return {
      label: "Vence hoje",
      cor: "#ff9f43",
      fundo: "rgba(255, 159, 67, 0.12)",
    };
  }

  if (dias === 1) {
    return {
      label: "Vence amanhã",
      cor: "#f8c35f",
      fundo: "rgba(248, 195, 95, 0.12)",
    };
  }

  if (dias <= 5) {
    return {
      label: `Vence em ${dias} dias`,
      cor: "#f8c35f",
      fundo: "rgba(248, 195, 95, 0.12)",
    };
  }

  return {
    label: `Vence em ${dias} dias`,
    cor: "#55efc4",
    fundo: "rgba(85, 239, 196, 0.12)",
  };
};

export default function UrgentBills({ contas = [], onPagar }) {
  if (contas.length === 0) return null;

  return (
    <section className="urgent-area">
      <div className="section-header">
        <h3>Vencendo em breve</h3>
        <small>
          {contas.length} conta{contas.length > 1 ? "s" : ""}
        </small>
      </div>

      <div className="urgent-list">
        {contas.map((conta) => {
          const dias = diasRestantes(conta.data_vencimento);
          const urgencia = urgenciaMeta(dias);

          return (
            <article key={conta.id} className="urgent-card">
              <div className="urgent-info">
                <strong>{conta.descricao}</strong>

                <p>
                  {fmt(conta.data_vencimento)}
                </p>

                <span
                  className="urgent-badge"
                  style={{
                    color: urgencia.cor,
                    background: urgencia.fundo,
                  }}
                >
                  {urgencia.label}
                </span>
              </div>

              <div className="urgent-actions">
                <strong>{money(conta.valor)}</strong>

                <button
                  type="button"
                  className="btn-pay-small"
                  onClick={() => onPagar(conta)}
                  aria-label={`Pagar ${conta.descricao}`}
                >
                  Pagar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}