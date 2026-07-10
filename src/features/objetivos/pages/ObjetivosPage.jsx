import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import GoalDialog from "../components/GoalDialog";
import ConfirmDialog from "../../../components/shared/ConfirmDialog/ConfirmDialog";
import { calcularStatus } from "../utils/status";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ObjetivosPage() {
  const {
    objetivos,
    adicionarObjetivo,
    atualizarObjetivo,
    confirmandoObjetivoId,
    pedirConfirmacaoObjetivo,
    cancelarConfirmacaoObjetivo,
    confirmarDeletarObjetivo,
  } = useOutletContext();

  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState("novo");
  const [objetivoSelecionado, setObjetivoSelecionado] = useState(null);

  const objetivoPendente = confirmandoObjetivoId
    ? objetivos.find((o) => o.id === confirmandoObjetivoId)
    : null;

  const abrirModal = (tipo, objetivo = null) => {
    setModalTipo(tipo);
    setObjetivoSelecionado(objetivo);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setObjetivoSelecionado(null);
  };

  const handleModalConfirm = async (dados) => {
    if (modalTipo === "novo") {
      await adicionarObjetivo({ nome: dados.nome, meta: dados.meta, atual: 0 });
      fecharModal();
      return;
    }

    if (modalTipo === "editar" && objetivoSelecionado) {
      await atualizarObjetivo({
        ...objetivoSelecionado,
        nome: dados.nome,
        meta: dados.meta,
      });
      fecharModal();
      return;
    }

    if (modalTipo === "guardar" && objetivoSelecionado) {
      await atualizarObjetivo({
        ...objetivoSelecionado,
        atual: Number(objetivoSelecionado.atual || 0) + Number(dados.valor || 0),
      });
      fecharModal();
    }
  };

  return (
    <section>
      <header className="page-header">
        <div>
          <span className="eyebrow">Metas</span>
          <h1>Objetivos</h1>
          <p>Acompanhe o progresso das suas metas financeiras.</p>
        </div>

        <button className="primary-button" type="button" onClick={() => abrirModal("novo")}>
          Novo objetivo
        </button>
      </header>

      <div className="page-body">
        {objetivos.length === 0 ? (
          <article className="panel">
            <p>Você ainda não tem objetivos. Crie o primeiro para começar a acompanhar.</p>
          </article>
        ) : (
          <div className="goals-list">
            {objetivos.map((objetivo) => {
              const meta = Number(objetivo.meta || 0);
              const atual = Number(objetivo.atual || 0);
              const progresso = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
              const restante = Math.max(meta - atual, 0);
              const concluido = progresso >= 100;
              const status = calcularStatus(objetivo, progresso);

              return (
                <article key={objetivo.id} className="goal-item">
                  <div className="goal-card-header">
                    <div className="goal-card-identity">
                      <div
                        className="goal-letra"
                        style={{ background: objetivo.cor || "#6C5CE7" }}
                        aria-hidden="true"
                      >
                        {(objetivo.nome?.[0] || "O").toUpperCase()}
                      </div>

                      <div>
                        <strong>{objetivo.nome}</strong>
                        {status === "parado" && (
                          <span className="goal-status goal-status-parado">Parado</span>
                        )}
                        {status === "ativo" && (
                          <span className="goal-status goal-status-ativo">Em andamento</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="goal-delete-icon"
                      onClick={() => pedirConfirmacaoObjetivo(objetivo.id)}
                      aria-label={`Excluir ${objetivo.nome}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </div>

                  <div className="progress-bar">
                    <div style={{ width: `${progresso}%`, background: objetivo.cor || "#22c55e" }} />
                  </div>

                  <div className="goal-values-row">
                    <small>
                      {money(atual)} de {money(meta)}
                    </small>
                    <strong className={concluido ? "goal-remaining is-concluido" : "goal-remaining"}>
                      {concluido ? "Meta concluída" : `Faltam ${money(restante)}`}
                    </strong>
                  </div>

                  <div className="goal-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => abrirModal("guardar", objetivo)}
                    >
                      Adicionar valor
                    </button>

                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => abrirModal("editar", objetivo)}
                    >
                      Editar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {modalAberto && (
        <GoalDialog
          tipo={modalTipo}
          objetivo={objetivoSelecionado}
          onConfirm={handleModalConfirm}
          onClose={fecharModal}
        />
      )}

      {objetivoPendente && (
        <ConfirmDialog
          titulo="Excluir objetivo"
          mensagem={`Deseja excluir "${objetivoPendente.nome}"? Esta ação não pode ser desfeita.`}
          labelConfirmar="Excluir"
          perigoso
          onConfirm={confirmarDeletarObjetivo}
          onClose={cancelarConfirmacaoObjetivo}
        />
      )}
    </section>
  );
}
