import React, { useState } from "react";
import GoalModal from "../GoalModal/GoalModal";

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
  onLogout,
}) {
  const saldo = ganhos - despesas;
  const objetivo = objetivos?.[0] || null;
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState("novo");

  const progresso = objetivo
    ? Math.min((Number(objetivo.atual || 0) / Number(objetivo.meta || 1)) * 100, 100)
    : 0;

  const abrirModalNovo    = () => { setModalTipo("novo");    setModalAberto(true); };
  const abrirModalEditar  = () => { setModalTipo("editar");  setModalAberto(true); };
  const abrirModalGuardar = () => { setModalTipo("guardar"); setModalAberto(true); };

  const handleModalConfirm = (dados) => {
    if (modalTipo === "novo") {
      onAddGoal({ nome: dados.nome, meta: dados.meta, atual: 0, cor: "#6C5CE7" });
    } else if (modalTipo === "editar") {
      onEditGoal({ ...objetivo, nome: dados.nome, meta: dados.meta });
    } else if (modalTipo === "guardar") {
      onEditGoal({ ...objetivo, atual: Number(objetivo.atual || 0) + Number(dados.valor) });
    }
    setModalAberto(false);
  };

  const excluirObjetivo = () => {
    if (!objetivo || !onDeleteGoal) return;
    onDeleteGoal(objetivo.id);
  };

  const saldoNegativo = saldo < 0;

  return (
    <>
      <header className="premium-header">
        <div className="top-nav">
          <div className="user-profile">
            <div className="avatar-l">
              {(user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div>
              <span>Bem-vindo,</span>
              <strong>{user?.email ? user.email.split("@")[0] : "usuário"}</strong>
            </div>
          </div>

          <button
            type="button"
            className="notif-btn"
            aria-label="Sair da conta"
            onClick={onLogout}
          >
            Sair
          </button>
        </div>

        <section className="main-wallet-card">
          <div className="wallet-label">Saldo total</div>
          <h2 className={saldoNegativo ? "saldo-negativo" : ""}>{formatMoney(saldo)}</h2>
          {saldoNegativo && (
            <p className="saldo-alerta">⚠️ Suas despesas estão maiores que as receitas</p>
          )}

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
            <button type="button" className="goal-btn" onClick={abrirModalNovo}>
              + Novo
            </button>
          </div>

          {!objetivo ? (
            <article
              className="goal-item goal-vazio"
              onClick={abrirModalNovo}
              role="button"
              tabIndex={0}
            >
              <p>✦ Toque para criar seu primeiro objetivo</p>
            </article>
          ) : (
            <article className="goal-item">
              <div className="goal-top">
                <div className="goal-meta">
                  <div className="goal-letra" style={{ background: objetivo.cor || "#6C5CE7" }}>
                    {(objetivo.nome?.[0] || "O").toUpperCase()}
                  </div>
                  <div>
                    <strong>{objetivo.nome}</strong>
                    <p>{formatMoney(objetivo.atual)} de {formatMoney(objetivo.meta)}</p>
                  </div>
                </div>
                <strong className="goal-pct">{progresso.toFixed(0)}%</strong>
              </div>

              <div className="goal-progress-bg">
                <div
                  className="goal-progress-fill"
                  style={{ width: `${progresso}%`, background: objetivo.cor || "#6C5CE7" }}
                />
              </div>

              {progresso >= 100 && (
                <p className="goal-concluido">🎉 Objetivo concluído!</p>
              )}

              <div className="goal-actions">
                <button type="button" className="goal-btn" onClick={abrirModalGuardar}>
                  Guardar valor
                </button>
                <button type="button" className="goal-btn" onClick={abrirModalEditar}>
                  Editar
                </button>
                <button type="button" className="goal-btn goal-btn-danger" onClick={excluirObjetivo}>
                  Excluir
                </button>
              </div>
            </article>
          )}
        </section>
      </header>

      {modalAberto && (
        <GoalModal
          tipo={modalTipo}
          objetivo={objetivo}
          onConfirm={handleModalConfirm}
          onClose={() => setModalAberto(false)}
        />
      )}
    </>
  );
}