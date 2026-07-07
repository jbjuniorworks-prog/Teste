import React, { useMemo, useState } from "react";
import GoalModal from "../../../objetivos/components/GoalModal/GoalModal";
import ConfirmModal from "../../../../components/shared/ConfirmModal/ConfirmModal";

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
  onAskDeleteGoal,
  confirmandoObjetivoId,
  cancelarConfirmacaoObjetivo,
  confirmarDeletarObjetivo,
  onLogout,
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState("novo");

  const saldo = Number(ganhos || 0) - Number(despesas || 0);
  const saldoNegativo = saldo < 0;
  const objetivo = objetivos?.[0] || null;

  const progresso = useMemo(() => {
    if (!objetivo) return 0;

    const atual = Number(objetivo.atual || 0);
    const meta = Number(objetivo.meta || 0);

    if (meta <= 0) return 0;

    return Math.min((atual / meta) * 100, 100);
  }, [objetivo]);

  const objetivoPendente =
    confirmandoObjetivoId && objetivo?.id === confirmandoObjetivoId
      ? objetivo
      : null;

  const nomeUsuario = user?.email ? user.email.split("@")[0] : "usuário";
  const inicialUsuario = (user?.email?.[0] || "U").toUpperCase();

  const abrirModal = (tipo) => {
    if (tipo === "novo" && objetivo) return;
    setModalTipo(tipo);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
  };

  const handleModalConfirm = async (dados) => {
    if (modalTipo === "novo") {
      await onAddGoal?.({
        nome: dados.nome,
        meta: dados.meta,
        atual: 0,
        cor: objetivo?.cor || "#6C5CE7",
      });
      fecharModal();
      return;
    }

    if (modalTipo === "editar" && objetivo) {
      await onEditGoal?.({
        ...objetivo,
        nome: dados.nome,
        meta: dados.meta,
      });
      fecharModal();
      return;
    }

    if (modalTipo === "guardar" && objetivo) {
      await onEditGoal?.({
        ...objetivo,
        atual: Number(objetivo.atual || 0) + Number(dados.valor || 0),
      });
      fecharModal();
    }
  };

  const pedirExclusaoObjetivo = () => {
    if (!objetivo || !onAskDeleteGoal) return;
    onAskDeleteGoal(objetivo.id);
  };

  const handleGoalEmptyKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrirModal("novo");
    }
  };

  return (
    <>
      <header className="premium-header">
        <div className="top-nav">
          <div className="user-profile">
            <div className="avatar-l" aria-hidden="true">
              {inicialUsuario}
            </div>

            <div>
              <span>Bem-vindo,</span>
              <strong>{nomeUsuario}</strong>
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

          <h2 className={saldoNegativo ? "saldo-negativo" : ""}>
            {formatMoney(saldo)}
          </h2>

          {saldoNegativo && (
            <p className="saldo-alerta">
              Suas despesas estão maiores que as receitas.
            </p>
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

            {!objetivo && (
              <button
                type="button"
                className="goal-btn"
                onClick={() => abrirModal("novo")}
              >
                Novo
              </button>
            )}
          </div>

          {!objetivo ? (
            <article
              className="goal-item goal-vazio"
              onClick={() => abrirModal("novo")}
              onKeyDown={handleGoalEmptyKeyDown}
              role="button"
              tabIndex={0}
              aria-label="Criar novo objetivo"
            >
              <p>Crie seu primeiro objetivo para acompanhar uma meta financeira.</p>
            </article>
          ) : (
            <article className="goal-item">
              <div className="goal-top">
                <div className="goal-meta">
                  <div
                    className="goal-letra"
                    style={{ background: objetivo.cor || "#6C5CE7" }}
                    aria-hidden="true"
                  >
                    {(objetivo.nome?.[0] || "O").toUpperCase()}
                  </div>

                  <div>
                    <strong>{objetivo.nome}</strong>
                    <p>
                      {formatMoney(objetivo.atual)} de {formatMoney(objetivo.meta)}
                    </p>
                  </div>
                </div>

                <strong className="goal-pct">{progresso.toFixed(0)}%</strong>
              </div>

              <div
                className="goal-progress-bg"
                aria-label={`Progresso do objetivo: ${progresso.toFixed(0)}%`}
              >
                <div
                  className="goal-progress-fill"
                  style={{
                    width: `${progresso}%`,
                    background: objetivo.cor || "#6C5CE7",
                  }}
                />
              </div>

              {progresso >= 100 && (
                <p className="goal-concluido">Meta concluída.</p>
              )}

              <div className="goal-actions">
                <button
                  type="button"
                  className="goal-btn"
                  onClick={() => abrirModal("guardar")}
                >
                  Adicionar valor
                </button>

                <button
                  type="button"
                  className="goal-btn"
                  onClick={() => abrirModal("editar")}
                >
                  Editar
                </button>

                <button
                  type="button"
                  className="goal-btn goal-btn-danger"
                  onClick={pedirExclusaoObjetivo}
                >
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
          onClose={fecharModal}
        />
      )}

      {objetivoPendente && (
        <ConfirmModal
          titulo="Excluir objetivo"
          mensagem={`Deseja excluir "${objetivoPendente.nome}"? Esta ação não pode ser desfeita.`}
          labelConfirmar="Excluir"
          perigoso
          onConfirm={confirmarDeletarObjetivo}
          onClose={cancelarConfirmacaoObjetivo}
        />
      )}
    </>
  );
}
