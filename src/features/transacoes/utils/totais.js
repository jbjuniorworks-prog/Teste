export function calcularTotais(lista) {
  return lista.reduce(
    (acc, item) => {
      const valor = Number(item.valor || 0);

      if (item.tipo === "entrada") acc.ganhos += valor;
      if (item.tipo === "saida") acc.despesas += valor;

      return acc;
    },
    { ganhos: 0, despesas: 0 }
  );
}
