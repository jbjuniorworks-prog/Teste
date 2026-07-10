export function parseValor(valor) {
  return parseFloat(String(valor).replace(",", "."));
}

export function splitParcelas({ valor, parcelas, vencimento }) {
  const vLimpo = parseValor(valor);
  const nParc = Math.min(Math.max(parseInt(parcelas, 10) || 1, 1), 24);
  const dBase = new Date(`${vencimento}T12:00:00`);
  const valorBase = Math.floor((vLimpo / nParc) * 100) / 100;
  const resto = Number((vLimpo - valorBase * nParc).toFixed(2));

  return Array.from({ length: nParc }, (_, i) => {
    const d = new Date(dBase);
    d.setMonth(dBase.getMonth() + i);

    const valorParcela =
      i === nParc - 1 ? Number((valorBase + resto).toFixed(2)) : valorBase;

    return {
      valor: valorParcela,
      data_vencimento: d.toISOString().split("T")[0],
      num_parcela: i + 1,
      total_parcelas: nParc,
    };
  });
}
