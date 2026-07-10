import { supabase } from "../../../lib/supabaseClient";

const TABELA = "objetivos";

const objetivosService = {
  async listar(userId) {
    return supabase
      .from(TABELA)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
  },

  async adicionar(novoObj, userId) {
    return supabase.from(TABELA).insert([
      {
        ...novoObj,
        user_id: userId,
        atual: Number(novoObj.atual || 0),
        meta: Number(novoObj.meta || 0),
        cor: novoObj.cor || "#6C5CE7",
        letra: (novoObj.nome || "O").charAt(0).toUpperCase(),
      },
    ]);
  },

  async atualizar(obj, userId) {
    return supabase
      .from(TABELA)
      .update({
        nome: obj.nome,
        meta: Number(obj.meta || 0),
        atual: Number(obj.atual || 0),
        cor: obj.cor || "#6C5CE7",
        letra: (obj.nome || "O").charAt(0).toUpperCase(),
      })
      .eq("id", obj.id)
      .eq("user_id", userId);
  },

  async deletar(id, userId) {
    return supabase.from(TABELA).delete().eq("id", id).eq("user_id", userId);
  },

  subscribe(userId, onChange) {
    const channel = supabase
      .channel(`objetivos-${userId}`)
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

export default objetivosService;
