export const CATEGORIAS = {
  mercado: {
    label: "Mercado",
    icone: "🛒",
    svg: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
    cor: "#FF7675",
  },
  alimentacao: {
    label: "Comida",
    icone: "🍔",
    svg: "M3 11h18M5 11V7a7 7 0 0114 0v4M3 15h18a2 2 0 01-2 2H5a2 2 0 01-2-2z",
    cor: "#FAB1A0",
  },
  transporte: {
    label: "Transporte",
    icone: "🚗",
    svg: "M5 17H3v-5l2-5h14l2 5v5h-2m-1 0H7m0 0a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 0 014 0z",
    cor: "#74B9FF",
  },
  lazer: {
    label: "Lazer",
    icone: "🎬",
    svg: "M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z",
    cor: "#A29BFE",
  },
  saude: {
    label: "Saúde",
    icone: "💊",
    svg: "M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM8 12h8M12 8v8",
    cor: "#55EFC4",
  },
  fixas: {
    label: "Fixas",
    icone: "🏠",
    svg: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    cor: "#FFEAA7",
  },
  outros: {
    label: "Geral",
    icone: "💸",
    svg: "M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6",
    cor: "#DFE6E9",
  },
};

export const getCat = (chave) => CATEGORIAS[chave] || CATEGORIAS.outros;