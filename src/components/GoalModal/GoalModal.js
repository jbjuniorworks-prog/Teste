import React, { useState } from "react";
import "./GoalModal.css";

export default function GoalModal({ tipo, objetivo, onConfirm, onClose }) {
  const [nome, setNome] = useState(objetivo?.nome || "");
  const [meta, setMeta] = useState(objetivo?.meta || "");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");

  const titulo = {
    novo: "Novo objetivo",
    editar: "Editar objetivo",
    guardar: `Guardar para "${objetivo?.nome}"`,
  }[tipo];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro("");

    if (tipo === "guardar") {
      const v = parseFloat(String(valor).replace(",", "."));
      if (Number.isNaN(v) || v <= 0) { setErro("Digite um valor válido."); return; }
      onConfirm({ valor: v });
      return;
    }

    if (!nome.trim()) { setErro("Digite um nome para o objetivo."); return; }
    const m = parseFloat(String(meta).replace(",", "."));
    if (Number.isNaN(m) || m <= 0) { setErro("Digite uma meta válida."); return; }
    onConfirm({ nome: nome.trim(), meta: m });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>{titulo}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {tipo !== "guardar" && (
            <>
              <label htmlFor="goal-nome">Nome do objetivo</label>
              <input
                id="goal-nome"
                type="text"
                placeholder="Ex: Viagem, Notebook..."
                value={nome}
                onChange={(e) => { setNome(e.target.value); setErro(""); }}
                autoFocus
              />
              <label htmlFor="goal-meta">Valor da meta (R$)</label>
              <input
                id="goal-meta"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={meta}
                onChange={(e) => { setMeta(e.target.value); setErro(""); }}
              />
            </>
          )}

          {tipo === "guardar" && (
            <>
              <label htmlFor="goal-valor">Quanto deseja guardar? (R$)</label>
              <input
                id="goal-valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(e) => { setValor(e.target.value); setErro(""); }}
                autoFocus
              />
            </>
          )}

          {erro && <p className="modal-erro" role="alert">{erro}</p>}

          <div className="modal-btns">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="modal-btn-confirm">
              {tipo === "guardar" ? "Guardar" : tipo === "editar" ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}