export function selecionarContasProximas(transacoes, limit = 5) {
  return transacoes
    .filter((t) => t.tipo === "saida" && !t.pago)
    .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""))
    .slice(0, limit);
}

export function selecionarUltimasTransacoes(transacoes, limit = 4) {
  return [...transacoes]
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .slice(0, limit);
}

export function filtrarTransacoesDoMes(transacoes, mesAtualStr) {
  return transacoes.filter((t) => t.data_vencimento?.startsWith(mesAtualStr));
}
