import { supabase } from "../../../lib/supabaseClient";

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
    const vLimpo = parseFloat(String(valor).replace(",", "."));

    if (tipoForm === "entrada") {
      return supabase.from(TABELA).insert([
        {
          user_id: userId,
          descricao,
          valor: vLimpo,
          tipo: "entrada",
          pago: true,
          categoria: categoriaSel || "outros",
          data_vencimento: vencimento,
          num_parcela: 1,
          total_parcelas: 1,
        },
      ]);
    }

    const nParc = Math.min(Math.max(parseInt(parcelas, 10) || 1, 1), 24);
    const dBase = new Date(`${vencimento}T12:00:00`);
    const valorBase = Math.floor((vLimpo / nParc) * 100) / 100;
    const resto = Number((vLimpo - valorBase * nParc).toFixed(2));

    const lista = Array.from({ length: nParc }, (_, i) => {
      const d = new Date(dBase);
      d.setMonth(dBase.getMonth() + i);

      const valorParcela =
        i === nParc - 1 ? Number((valorBase + resto).toFixed(2)) : valorBase;

      return {
        user_id: userId,
        descricao,
        valor: valorParcela,
        tipo: "saida",
        pago: false,
        categoria: categoriaSel || "outros",
        data_vencimento: d.toISOString().split("T")[0],
        num_parcela: i + 1,
        total_parcelas: nParc,
      };
    });

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
