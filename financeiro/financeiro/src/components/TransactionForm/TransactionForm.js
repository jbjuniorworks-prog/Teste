import React, { useMemo, useState } from "react";
import { CATEGORIAS } from "../../constants/categorias";

const Icon = ({ path, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);

export default function TransactionForm({ onSubmit, erro, setErro }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [vencimento, setVencimento] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [categoriaSel, setCategoriaSel] = useState("outros");
  const [tipoForm, setTipoForm] = useState("saida");
  const [salvando, setSalvando] = useState(false);

  const valorNumerico = useMemo(() => {
    const limpo = String(valor).replace(",", ".").trim();
    return limpo ? Number(limpo) : 0;
  }, [valor]);

  const limparErro = () => {
    if (erro) setErro("");
  };

  const handleDescricaoChange = (e) => {
    setDescricao(e.target.value);
    limparErro();
  };

  const handleValorChange = (e) => {
    setValor(e.target.value);
    limparErro();
  };

  const handleParcelasChange = (e) => {
    setParcelas(e.target.value);
    limparErro();
  };

  const handleVencimentoChange = (e) => {
    setVencimento(e.target.value);
    limparErro();
  };

  const handleCategoriaChange = (categoria) => {
    setCategoriaSel(categoria);
    limparErro();
  };

  const handleTipoChange = (tipo) => {
    setTipoForm(tipo);
    limparErro();
  };

  const validarFormulario = () => {
    if (!descricao.trim()) {
      setErro("Digite uma descrição.");
      return false;
    }

    if (!valor || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro("Informe um valor válido.");
      return false;
    }

    if (!vencimento) {
      setErro("Escolha uma data.");
      return false;
    }

    if (tipoForm === "saida") {
      const totalParcelas = Number(parcelas);
      if (!totalParcelas || totalParcelas < 1 || totalParcelas > 24) {
        setErro("As parcelas devem estar entre 1 e 24.");
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
      <section className="quick-actions-carousel">
        {Object.entries(CATEGORIAS).map(([key, cat]) => (
          <button
            key={key}
            type="button"
            className={`cat-btn ${categoriaSel === key ? "cat-active" : ""}`}
            onClick={() => handleCategoriaChange(key)}
            aria-pressed={categoriaSel === key}
          >
            <Icon path={cat.svg} size={18} />
            <span>{cat.label}</span>
          </button>
        ))}
      </section>

      <form className="glass-form" onSubmit={handleSubmit} noValidate>
        <div className="tipo-toggle">
          <button
            type="button"
            className={`tipo-btn ${tipoForm === "saida" ? "active-saida" : ""}`}
            onClick={() => handleTipoChange("saida")}
            aria-pressed={tipoForm === "saida"}
          >
            Despesa
          </button>

          <button
            type="button"
            className={`tipo-btn ${tipoForm === "entrada" ? "active-entrada" : ""}`}
            onClick={() => handleTipoChange("entrada")}
            aria-pressed={tipoForm === "entrada"}
          >
            Receita
          </button>
        </div>

        <div style={{ marginTop: "14px" }}>
          <input
            type="text"
            placeholder={
              tipoForm === "entrada"
                ? "Origem da receita?"
                : "O que você comprou?"
            }
            value={descricao}
            onChange={handleDescricaoChange}
            aria-label="Descrição da transação"
            aria-invalid={!!erro && !descricao.trim()}
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
            <label htmlFor="valor">Valor</label>
            <input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={handleValorChange}
              aria-invalid={!!erro && (!!valor ? valorNumerico <= 0 : true)}
            />
          </div>

          <div>
            <label htmlFor="vencimento">Data</label>
            <input
              id="vencimento"
              type="date"
              value={vencimento}
              onChange={handleVencimentoChange}
            />
          </div>

          {tipoForm === "saida" && (
            <div>
              <label htmlFor="parcelas">Parc.</label>
              <input
                id="parcelas"
                type="number"
                min="1"
                max="24"
                value={parcelas}
                onChange={handleParcelasChange}
              />
            </div>
          )}
        </div>

        {erro && (
          <div className="form-erro" role="alert">
            {erro}
          </div>
        )}

        <button
          type="submit"
          className="submit-main"
          disabled={salvando}
        >
          {salvando
            ? "Salvando..."
            : tipoForm === "entrada"
            ? "Salvar Receita"
            : "Salvar Despesa"}
        </button>
      </form>
    </>
  );
}