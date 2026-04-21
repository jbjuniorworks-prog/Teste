import React from "react";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function Header({
  ganhos = 0,
  despesas = 0,
  user,
  objetivos = [],
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
}) {
  const saldo = ganhos - despesas;
  const objetivo = objetivos?.[0] || null;

  const progresso = objetivo
    ? Math.min(
        (Number(objetivo.atual || 0) / Number(objetivo.meta || 1)) * 100,
        100
      )
    : 0;

  const editarObjetivo = () => {
    if (!objetivo || !onEditGoal) return;

    const novoNome = prompt("Editar nome do objetivo:", objetivo.nome);
    if (!novoNome) return;

    const novaMeta = prompt("Editar valor da meta:", objetivo.meta);
    if (!novaMeta) return;

    const metaNumero = parseFloat(String(novaMeta).replace(",", "."));
    if (Number.isNaN(metaNumero) || metaNumero <= 0) {
      alert("Digite uma meta válida.");
      return;
    }

    onEditGoal({
      ...objetivo,
      nome: novoNome,
      meta: metaNumero,
    });
  };

  const guardarValor = () => {
    if (!objetivo || !onEditGoal) return;

    const valor = prompt("Quanto você quer guardar para este objetivo?");
    if (!valor) return;

    const valorNumero = parseFloat(String(valor).replace(",", "."));
    if (Number.isNaN(valorNumero) || valorNumero <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    onEditGoal({
      ...objetivo,
      atual: Number(objetivo.atual || 0) + valorNumero,
    });
  };

  const excluirObjetivo = () => {
    if (!objetivo || !onDeleteGoal) return;

    const confirmou = window.confirm(
      `Excluir o objetivo "${objetivo.nome}"?`
    );
    if (!confirmou) return;

    onDeleteGoal(objetivo.id);
  };

  return (
    <header className="premium-header">
      <div className="top-nav">
        <div className="user-profile">
          <div className="avatar-l">
            {(user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <span>Boa noite,</span>
            <strong>
              {user?.email ? user.email.split("@")[0] : "usuário"}
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="notif-btn"
          aria-label="Ações rápidas"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12h16" />
            <path d="M12 4v16" />
          </svg>
        </button>
      </div>

      <section className="main-wallet-card">
        <div className="wallet-label">Saldo total</div>
        <h2>{formatMoney(saldo)}</h2>

        <div className="wallet-footer">
          <div className="wallet-stat">
            <div className="wallet-label">Receitas</div>
            <div className="valor-entrada">{formatMoney(ganhos)}</div>
          </div>

          <div className="wallet-stat">
            <div className="wallet-label">Despesas</div>
            <div className="valor-saida">{formatMoney(despesas)}</div>
          </div>
        </div>
      </section>

      <section className="section-goals">
        <div className="section-header">
          <h3>Objetivos</h3>
          <button
            type="button"
            className="goal-btn"
            onClick={onAddGoal}
          >
            + Novo
          </button>
        </div>

        {!objetivo ? (
          <article className="goal-item">
            <div className="goal-top">
              <div>
                <strong>Nenhum objetivo ainda</strong>
                <p>Crie seu primeiro objetivo para acompanhar sua meta.</p>
              </div>
            </div>
          </article>
        ) : (
          <article className="goal-item">
            <div className="goal-top">
              <div className="goal-meta">
                <div
                  className="goal-letra"
                  style={{ background: objetivo.cor || "#6C5CE7" }}
                >
                  {(objetivo.nome?.[0] || "O").toUpperCase()}
                </div>

                <div>
                  <strong>{objetivo.nome}</strong>
                  <p>Você decide manualmente quanto guardar</p>
                </div>
              </div>

              <strong>{progresso.toFixed(0)}%</strong>
            </div>

            <div className="goal-values">
              <small>
                {formatMoney(objetivo.atual)} de {formatMoney(objetivo.meta)}
              </small>
            </div>

            <div className="goal-progress-bg">
              <div
                className="goal-progress-fill"
                style={{
                  width: `${progresso}%`,
                  background: objetivo.cor || "#6C5CE7",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "14px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="goal-btn"
                onClick={guardarValor}
              >
                Guardar valor
              </button>

              <button
                type="button"
                className="goal-btn"
                onClick={editarObjetivo}
              >
                Editar
              </button>

              <button
                type="button"
                className="goal-btn"
                onClick={excluirObjetivo}
              >
                Excluir
              </button>
            </div>
          </article>
        )}
      </section>
    </header>
  );
}