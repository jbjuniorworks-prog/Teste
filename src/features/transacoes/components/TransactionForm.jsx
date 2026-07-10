import React, { useMemo, useState } from "react";
import { CATEGORIAS } from "../../../constants/categorias";
import "./TransactionForm.css";

export default function TransactionForm({ onSubmit, erro, setErro }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [vencimento, setVencimento] = useState(new Date().toISOString().split("T")[0]);
  const [categoriaSel, setCategoriaSel] = useState("outros");
  const [tipoForm, setTipoForm] = useState("saida");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const valorNumerico = useMemo(() => {
    const limpo = String(valor).replace(",", ".").trim();
    return limpo ? Number(limpo) : 0;
  }, [valor]);

  const limparErro = () => {
    if (erro) setErro("");
  };

  const validarFormulario = () => {
    if (!descricao.trim()) {
      setErro("Informe uma descrição.");
      return false;
    }

    if (!valor || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro("Informe um valor válido.");
      return false;
    }

    if (!vencimento) {
      setErro("Selecione uma data.");
      return false;
    }

    if (tipoForm === "saida") {
      const n = Number(parcelas);
      if (!n || n < 1 || n > 24) {
        setErro("O número de parcelas deve estar entre 1 e 24.");
        return false;
      }
    }

    setErro("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setSalvando(true);

    const ok = await onSubmit({
      descricao: descricao.trim(),
      valor,
      parcelas,
      vencimento,
      categoriaSel,
      tipoForm,
    });

    setSalvando(false);

    if (ok) {
      setSucesso(true);
      setTimeout(() => setSucesso(false), 2500);
      setDescricao("");
      setValor("");
      setParcelas(1);
      setCategoriaSel("outros");
      setTipoForm("saida");
      setVencimento(new Date().toISOString().split("T")[0]);
      setErro("");
    }
  };

  return (
    <>
      <section className="quick-actions-wrap">
        <div className="quick-actions-head">
          <h3>Categorias</h3>
          <small>Deslize para ver mais</small>
        </div>

        <div className="quick-actions-carousel" aria-label="Selecionar categoria">
          {Object.entries(CATEGORIAS).map(([key, cat]) => (
            <button
              key={key}
              type="button"
              className={`cat-btn ${categoriaSel === key ? "cat-active" : ""}`}
              onClick={() => {
                setCategoriaSel(key);
                limparErro();
              }}
              aria-pressed={categoriaSel === key}
              title={cat.label}
            >
              <span className="cat-initial" aria-hidden="true">
                {(cat.label || key).charAt(0).toUpperCase()}
              </span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      <form className="glass-form" onSubmit={handleSubmit} noValidate>
        <div className="tipo-toggle" role="group" aria-label="Tipo de transação">
          <button
            type="button"
            className={`tipo-btn ${tipoForm === "saida" ? "active-saida" : ""}`}
            onClick={() => {
              setTipoForm("saida");
              limparErro();
            }}
            aria-pressed={tipoForm === "saida"}
          >
            Despesa
          </button>

          <button
            type="button"
            className={`tipo-btn ${tipoForm === "entrada" ? "active-entrada" : ""}`}
            onClick={() => {
              setTipoForm("entrada");
              limparErro();
            }}
            aria-pressed={tipoForm === "entrada"}
          >
            Receita
          </button>
        </div>

        <div style={{ marginTop: "14px" }}>
          <label htmlFor="tf-descricao">
            {tipoForm === "entrada" ? "Origem da receita" : "Descrição da despesa"}
          </label>
          <input
            id="tf-descricao"
            type="text"
            placeholder={tipoForm === "entrada" ? "Ex: Salário, Freelance" : "Ex: Mercado, energia, internet"}
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              limparErro();
            }}
            aria-invalid={!!erro && !descricao.trim()}
            autoComplete="off"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: tipoForm === "saida" ? "1fr 1fr 72px" : "1fr 1fr",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          <div>
            <label htmlFor="tf-valor">Valor</label>
            <input
              id="tf-valor"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                limparErro();
              }}
              aria-invalid={!!erro && valorNumerico <= 0}
            />
          </div>

          <div>
            <label htmlFor="tf-vencimento">Data</label>
            <input
              id="tf-vencimento"
              type="date"
              value={vencimento}
              onChange={(e) => {
                setVencimento(e.target.value);
                limparErro();
              }}
            />
          </div>

          {tipoForm === "saida" && (
            <div>
              <label htmlFor="tf-parcelas">Parc.</label>
              <input
                id="tf-parcelas"
                type="number"
                min="1"
                max="24"
                value={parcelas}
                onChange={(e) => {
                  setParcelas(e.target.value);
                  limparErro();
                }}
              />
            </div>
          )}
        </div>

        {erro && (
          <div className="form-erro" role="alert">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="form-sucesso" role="status">
            {tipoForm === "entrada" ? "Receita registrada com sucesso." : "Despesa registrada com sucesso."}
          </div>
        )}

        <button type="submit" className="submit-main" disabled={salvando}>
          {salvando ? "Salvando..." : tipoForm === "entrada" ? "Salvar receita" : "Salvar despesa"}
        </button>
      </form>
    </>
  );
}
