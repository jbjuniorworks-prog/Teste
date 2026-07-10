import { supabase } from "../../../lib/supabaseClient";
import { parseValor, splitParcelas } from "../utils/parcelamento";

const TABELA = "transacoes";

const transacoesService = {
  async listar(userId) {
    return supabase
      .from(TABELA)
      .select("*")
      .eq("user_id", userId)
      .order("data_vencimento", { ascending: true });
  },

  async adicionar({ descricao, valor, parcelas, vencimento, categoriaSel, tipoForm }, userId) {
    if (tipoForm === "entrada") {
      return supabase.from(TABELA).insert([
        {
          user_id: userId,
          descricao,
          valor: parseValor(valor),
          tipo: "entrada",
          pago: true,
          categoria: categoriaSel || "outros",
          data_vencimento: vencimento,
          num_parcela: 1,
          total_parcelas: 1,
        },
      ]);
    }

    const lista = splitParcelas({ valor, parcelas, vencimento }).map((parcela) => ({
      ...parcela,
      user_id: userId,
      descricao,
      tipo: "saida",
      pago: false,
      categoria: categoriaSel || "outros",
    }));

    return supabase.from(TABELA).insert(lista);
  },

  async togglePago(transacao, userId) {
    return supabase
      .from(TABELA)
      .update({ pago: !transacao.pago })
      .eq("id", transacao.id)
      .eq("user_id", userId);
  },

  async deletar(id, userId) {
    return supabase.from(TABELA).delete().eq("id", id).eq("user_id", userId);
  },

  subscribe(userId, onChange) {
    const channel = supabase
      .channel(`transacoes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABELA,
          filter: `user_id=eq.${userId}`,
        },
        onChange
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};

export default transacoesService;
