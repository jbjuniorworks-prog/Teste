import {
  selecionarContasProximas,
  selecionarUltimasTransacoes,
  filtrarTransacoesDoMes,
} from "./selectors";

describe("selecionarContasProximas", () => {
  it("only includes unpaid saida transactions", () => {
    const result = selecionarContasProximas([
      { id: 1, tipo: "saida", pago: false, data_vencimento: "2026-01-10" },
      { id: 2, tipo: "saida", pago: true, data_vencimento: "2026-01-05" },
      { id: 3, tipo: "entrada", pago: false, data_vencimento: "2026-01-01" },
    ]);

    expect(result.map((t) => t.id)).toEqual([1]);
  });

  it("sorts by soonest due date first", () => {
    const result = selecionarContasProximas([
      { id: 1, tipo: "saida", pago: false, data_vencimento: "2026-03-01" },
      { id: 2, tipo: "saida", pago: false, data_vencimento: "2026-01-01" },
      { id: 3, tipo: "saida", pago: false, data_vencimento: "2026-02-01" },
    ]);

    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("respects the limit", () => {
    const transacoes = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      tipo: "saida",
      pago: false,
      data_vencimento: `2026-01-${String(i + 1).padStart(2, "0")}`,
    }));

    expect(selecionarContasProximas(transacoes)).toHaveLength(5);
    expect(selecionarContasProximas(transacoes, 2)).toHaveLength(2);
  });

  it("returns an empty array when there are no unpaid bills", () => {
    expect(selecionarContasProximas([])).toEqual([]);
  });
});

describe("selecionarUltimasTransacoes", () => {
  it("sorts by created_at descending (most recently added first), not due date", () => {
    // simulates a 3x parcelamento (far-future due dates, but all added at once)
    // followed by a distinct purchase added later
    const result = selecionarUltimasTransacoes([
      { id: "parcela-1", created_at: "2026-01-01T10:00:00Z", data_vencimento: "2026-01-01" },
      { id: "parcela-2", created_at: "2026-01-01T10:00:00Z", data_vencimento: "2026-02-01" },
      { id: "parcela-3", created_at: "2026-01-01T10:00:00Z", data_vencimento: "2026-03-01" },
      { id: "compra-recente", created_at: "2026-01-05T10:00:00Z", data_vencimento: "2026-01-06" },
    ]);

    expect(result[0].id).toBe("compra-recente");
  });

  it("respects the limit", () => {
    const transacoes = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      created_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));

    expect(selecionarUltimasTransacoes(transacoes)).toHaveLength(4);
    expect(selecionarUltimasTransacoes(transacoes, 2)).toHaveLength(2);
  });

  it("does not mutate the original array", () => {
    const transacoes = [
      { id: 1, created_at: "2026-01-01T00:00:00Z" },
      { id: 2, created_at: "2026-01-02T00:00:00Z" },
    ];
    const original = [...transacoes];

    selecionarUltimasTransacoes(transacoes);

    expect(transacoes).toEqual(original);
  });

  it("returns an empty array when there are no transactions", () => {
    expect(selecionarUltimasTransacoes([])).toEqual([]);
  });
});

describe("filtrarTransacoesDoMes", () => {
  it("keeps only transactions whose due date falls in the given month", () => {
    const result = filtrarTransacoesDoMes(
      [
        { id: 1, data_vencimento: "2026-01-15" },
        { id: 2, data_vencimento: "2026-02-15" },
        { id: 3, data_vencimento: "2026-01-31" },
      ],
      "2026-01"
    );

    expect(result.map((t) => t.id)).toEqual([1, 3]);
  });

  it("returns an empty array when nothing matches", () => {
    const result = filtrarTransacoesDoMes(
      [{ id: 1, data_vencimento: "2026-02-15" }],
      "2026-01"
    );

    expect(result).toEqual([]);
  });
});
