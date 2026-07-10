import React, { useCallback, useEffect, useRef, useState } from "react";
import "./goal.css";

export default function GoalDialog({ tipo, objetivo, onConfirm, onClose }) {
  const [nome, setNome] = useState(objetivo?.nome || "");
  const [meta, setMeta] = useState(objetivo?.meta || "");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);

  const titulo = {
    novo: "Novo objetivo",
    editar: "Editar objetivo",
    guardar: `Adicionar valor em ${objetivo?.nome || "objetivo"}`,
  }[tipo];

  const handleClose = useCallback(() => {
    setClosing((prev) => {
      if (prev) return prev;

      setTimeout(() => {
        onClose?.();
      }, 160);

      return true;
    });
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (closing) return;

    setErro("");

    if (tipo === "guardar") {
      const v = parseFloat(String(valor).replace(",", "."));

      if (Number.isNaN(v) || v <= 0) {
        setErro("Informe um valor válido.");
        return;
      }

      onConfirm?.({ valor: v });
      return;
    }

    if (!nome.trim()) {
      setErro("Informe o nome do objetivo.");
      return;
    }

    const m = parseFloat(String(meta).replace(",", "."));

    if (Number.isNaN(m) || m <= 0) {
      setErro("Informe uma meta válida.");
      return;
    }

    onConfirm?.({ nome: nome.trim(), meta: m });
  };

  return (
    <div
      className={`modal-overlay ${closing ? "closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        className={`modal-card ${closing ? "closing" : ""}`}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 id="goal-modal-title">{titulo}</h3>

          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            aria-label="Fechar modal"
            disabled={closing}
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          {tipo !== "guardar" && (
            <>
              <label htmlFor="goal-nome">Nome do objetivo</label>
              <input
                id="goal-nome"
                type="text"
                placeholder="Ex: Reserva de emergência"
                value={nome}
                onChange={(event) => {
                  setNome(event.target.value);
                  setErro("");
                }}
                disabled={closing}
              />

              <label htmlFor="goal-meta">Valor da meta</label>
              <input
                id="goal-meta"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={meta}
                onChange={(event) => {
                  setMeta(event.target.value);
                  setErro("");
                }}
                disabled={closing}
              />
            </>
          )}

          {tipo === "guardar" && (
            <>
              <label htmlFor="goal-valor">Valor a adicionar</label>
              <input
                id="goal-valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(event) => {
                  setValor(event.target.value);
                  setErro("");
                }}
                disabled={closing}
              />
            </>
          )}

          {erro && (
            <p className="modal-erro" role="alert">
              {erro}
            </p>
          )}

          <div className="modal-btns">
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={handleClose}
              disabled={closing}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="modal-btn-confirm"
              disabled={closing}
            >
              {tipo === "guardar"
                ? "Confirmar valor"
                : tipo === "editar"
                ? "Salvar alterações"
                : "Criar objetivo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
