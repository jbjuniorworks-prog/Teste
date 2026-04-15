import React, { useState, useRef } from "react";
import { CATEGORIAS } from "../../constants/categorias";

const Icon = ({ path, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

export default function TransactionForm({ onSubmit, erro, setErro }) {
  const [descricao,    setDescricao]    = useState("");
  const [valor,        setValor]        = useState("");
  const [parcelas,     setParcelas]     = useState(1);
  const [vencimento,   setVencimento]   = useState(new Date().toISOString().split("T")[0]);
  const [categoriaSel, setCategoriaSel] = useState("outros");
  const [tipoForm,     setTipoForm]     = useState("saida");
  const [salvando,     setSalvando]     = useState(false);
  const inputValorRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const ok = await onSubmit({ descricao, valor, parcelas, vencimento, categoriaSel, tipoForm });
    setSalvando(false);
    if (ok) { setDescricao(""); setValor(""); setParcelas(1); setCategoriaSel("outros"); }
  };

  return (
    <>
      <div className="quick-actions-carousel">
        {Object.entries(CATEGORIAS).map(([key, cat]) => (
          <button
            key={key} type="button"
            className={`cat-btn ${categoriaSel === key ? "cat-active" : ""}`}
            onClick={() => { setCategoriaSel(key); setDescricao(cat.label); inputValorRef.current?.focus(); }}
          >
            <Icon path={cat.svg} size={20} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <form className="glass-form" onSubmit={handleSubmit}>
        <div className="tipo-toggle">
          <button type="button" className={`tipo-btn ${tipoForm === "saida" ? "active-saida" : ""}`} onClick={() => setTipoForm("saida")}>
            Despesa
          </button>
          <button type="button" className={`tipo-btn ${tipoForm === "entrada" ? "active-entrada" : ""}`} onClick={() => setTipoForm("entrada")}>
            Receita
          </button>
        </div>

        <input
          type="text"
          placeholder={tipoForm === "saida" ? "O que voce comprou?" : "Origem da receita?"}
          value={descricao}
          onChange={e => { setDescricao(e.target.value); setErro(""); }}
          required
        />

        <div className="form-row-triple">
          <div className="input-group">
            <small>Valor</small>
            <input ref={inputValorRef} type="text" inputMode="decimal" placeholder="0,00" value={valor}
              onChange={e => { setValor(e.target.value); setErro(""); }} required />
          </div>
          <div className="input-group">
            <small>Data</small>
            <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required />
          </div>
          {tipoForm === "saida" && (
            <div className="input-group">
              <small>Parc.</small>
              <input type="number" min="1" placeholder="1x" value={parcelas} onChange={e => setParcelas(e.target.value)} />
            </div>
          )}
        </div>

        {erro ? <p className="form-erro">{erro}</p> : null}

        <button type="submit" className="btn-main" disabled={salvando}>
          {salvando ? "Salvando..." : tipoForm === "saida" ? "Salvar Despesa" : "Salvar Receita"}
        </button>
      </form>
    </>
  );
}
