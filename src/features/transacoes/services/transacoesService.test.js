import transacoesService from "./transacoesService";
import { supabase } from "../../../lib/supabaseClient";

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("transacoesService.adicionar", () => {
  let insertMock;

  beforeEach(() => {
    insertMock = jest.fn().mockResolvedValue({ data: [], error: null });
    supabase.from.mockReturnValue({ insert: insertMock });
  });

  it("inserts a single paid entrada row with the full value", async () => {
    await transacoesService.adicionar(
      {
        descricao: "Salário",
        valor: "3000",
        vencimento: "2026-01-05",
        categoriaSel: "outros",
        tipoForm: "entrada",
      },
      "user-1"
    );

    expect(supabase.from).toHaveBeenCalledWith("transacoes");
    expect(insertMock).toHaveBeenCalledWith([
      {
        user_id: "user-1",
        descricao: "Salário",
        valor: 3000,
        tipo: "entrada",
        pago: true,
        categoria: "outros",
        data_vencimento: "2026-01-05",
        num_parcela: 1,
        total_parcelas: 1,
      },
    ]);
  });

  it("inserts one unpaid saida row per parcela, split evenly", async () => {
    await transacoesService.adicionar(
      {
        descricao: "Notebook",
        valor: "300",
        parcelas: 3,
        vencimento: "2026-01-15",
        categoriaSel: "outros",
        tipoForm: "saida",
      },
      "user-1"
    );

    const rows = insertMock.mock.calls[0][0];

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.valor)).toEqual([100, 100, 100]);
    expect(rows.every((r) => r.tipo === "saida" && r.pago === false)).toBe(true);
    expect(rows.every((r) => r.user_id === "user-1")).toBe(true);
  });

  it("defaults the categoria to 'outros' when none is selected", async () => {
    await transacoesService.adicionar(
      {
        descricao: "Diversos",
        valor: "50",
        vencimento: "2026-01-15",
        tipoForm: "entrada",
      },
      "user-1"
    );

    expect(insertMock.mock.calls[0][0][0].categoria).toBe("outros");
  });
});
