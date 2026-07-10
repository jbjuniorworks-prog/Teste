import { calcularTotais } from "./totais";

describe("calcularTotais", () => {
  it("returns zero for both when the list is empty", () => {
    expect(calcularTotais([])).toEqual({ ganhos: 0, despesas: 0 });
  });

  it("sums entrada items into ganhos", () => {
    const result = calcularTotais([
      { tipo: "entrada", valor: 100 },
      { tipo: "entrada", valor: 50 },
    ]);

    expect(result).toEqual({ ganhos: 150, despesas: 0 });
  });

  it("sums saida items into despesas", () => {
    const result = calcularTotais([
      { tipo: "saida", valor: 30 },
      { tipo: "saida", valor: 20 },
    ]);

    expect(result).toEqual({ ganhos: 0, despesas: 50 });
  });

  it("keeps ganhos and despesas separate for a mixed list", () => {
    const result = calcularTotais([
      { tipo: "entrada", valor: 1000 },
      { tipo: "saida", valor: 200 },
      { tipo: "saida", valor: 89.9 },
    ]);

    expect(result).toEqual({ ganhos: 1000, despesas: 289.9 });
  });

  it("treats a missing valor as zero instead of NaN", () => {
    const result = calcularTotais([{ tipo: "entrada" }]);

    expect(result).toEqual({ ganhos: 0, despesas: 0 });
  });

  it("coerces a string valor (as Postgres numeric columns come back) into a number", () => {
    const result = calcularTotais([{ tipo: "saida", valor: "42.50" }]);

    expect(result).toEqual({ ganhos: 0, despesas: 42.5 });
  });

  it("ignores items with an unrecognized tipo", () => {
    const result = calcularTotais([{ tipo: "transferencia", valor: 999 }]);

    expect(result).toEqual({ ganhos: 0, despesas: 0 });
  });
});
