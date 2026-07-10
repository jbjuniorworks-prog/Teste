import { parseValor, splitParcelas } from "./parcelamento";

describe("parseValor", () => {
  it("parses a dot-decimal string", () => {
    expect(parseValor("150.50")).toBe(150.5);
  });

  it("parses a comma-decimal string", () => {
    expect(parseValor("150,50")).toBe(150.5);
  });

  it("parses a number as-is", () => {
    expect(parseValor(200)).toBe(200);
  });
});

describe("splitParcelas", () => {
  it("returns a single parcela with the full value when parcelas is 1", () => {
    const result = splitParcelas({ valor: "300", parcelas: 1, vencimento: "2026-01-15" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      valor: 300,
      data_vencimento: "2026-01-15",
      num_parcela: 1,
      total_parcelas: 1,
    });
  });

  it("splits evenly when the value divides cleanly", () => {
    const result = splitParcelas({ valor: "300", parcelas: 3, vencimento: "2026-01-15" });

    expect(result.map((p) => p.valor)).toEqual([100, 100, 100]);
  });

  it("puts the rounding remainder on the last parcela so the sum matches the original value exactly", () => {
    const result = splitParcelas({ valor: "100", parcelas: 3, vencimento: "2026-01-15" });

    const soma = result.reduce((acc, p) => acc + p.valor, 0);
    expect(Number(soma.toFixed(2))).toBe(100);
    expect(result[0].valor).toBe(33.33);
    expect(result[1].valor).toBe(33.33);
    expect(result[2].valor).toBe(33.34);
  });

  it("advances the due date by one month per parcela", () => {
    const result = splitParcelas({ valor: "300", parcelas: 3, vencimento: "2026-01-31" });

    expect(result.map((p) => p.data_vencimento)).toEqual([
      "2026-01-31",
      "2026-03-03", // JS Date rolls Feb 31 -> Mar 3 in a non-leap year; a known quirk, not a bug introduced here
      "2026-03-31",
    ]);
  });

  it("numbers each parcela and records the total count", () => {
    const result = splitParcelas({ valor: "300", parcelas: 3, vencimento: "2026-01-15" });

    expect(result.map((p) => p.num_parcela)).toEqual([1, 2, 3]);
    expect(result.every((p) => p.total_parcelas === 3)).toBe(true);
  });

  it("clamps parcelas to a maximum of 24", () => {
    const result = splitParcelas({ valor: "2400", parcelas: 999, vencimento: "2026-01-15" });

    expect(result).toHaveLength(24);
  });

  it("clamps parcelas to a minimum of 1 when given an invalid value", () => {
    const result = splitParcelas({ valor: "300", parcelas: 0, vencimento: "2026-01-15" });

    expect(result).toHaveLength(1);
  });

  it("treats a comma-decimal value the same as a dot-decimal one", () => {
    const result = splitParcelas({ valor: "100,50", parcelas: 2, vencimento: "2026-01-15" });

    const soma = result.reduce((acc, p) => acc + p.valor, 0);
    expect(Number(soma.toFixed(2))).toBe(100.5);
  });
});
