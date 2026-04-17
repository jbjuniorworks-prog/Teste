import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function useTransacoes(userId) {
  const [transacoes, setTransacoes] = useState([]);
  const [objetivos, setObjetivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const buscar = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setErro("");

    try {
      const { data: tData, error: tError } = await supabase
        .from("transacoes")
        .select("*")
        .eq("user_id", userId)
        .order("data_vencimento", { ascending: true });

      if (tError) throw tError;
      setTransacoes(tData || []);

      const { data: oData, error: oError } = await supabase
        .from("objetivos")
        .select("*")
        .eq("user_id", userId);

      if (oError) throw oError;
      setObjetivos(oData || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const adicionarTransacao = async ({
    descricao,
    valor,
    parcelas,
    vencimento,
    categoriaSel,
    tipoForm,
  }) => {
    const vLimpo = parseFloat(String(valor).replace(",", "."));

    if (Number.isNaN(vLimpo) || vLimpo <= 0) {
      setErro("Informe um valor válido.");
      return false;
    }

    try {
      if (tipoForm === "entrada") {
        const { error } = await supabase.from("transacoes").insert([
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

        if (error) throw error;
      } else {
        const nParc = parseInt(parcelas, 10) || 1;
        const vCada = vLimpo / nParc;
        const dBase = new Date(vencimento + "T12:00:00");

        const lista = Array.from({ length: nParc }, (_, i) => {
          const d = new Date(dBase);
          d.setMonth(dBase.getMonth() + i);

          return {
            user_id: userId,
            descricao,
            valor: parseFloat(vCada.toFixed(2)),
            tipo: "saida",
            pago: false,
            categoria: categoriaSel || "outros",
            data_vencimento: d.toISOString().split("T")[0],
            num_parcela: i + 1,
            total_parcelas: nParc,
          };
        });

        const { error } = await supabase.from("transacoes").insert(lista);
        if (error) throw error;
      }

      await buscar();
      return true;
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar.");
      return false;
    }
  };

  const togglePago = async (t) => {
    try {
      const novoPago = !t.pago;

      const { error } = await supabase
        .from("transacoes")
        .update({ pago: novoPago })
        .eq("id", t.id);

      if (error) throw error;

      await buscar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao atualizar pagamento.");
    }
  };

  const deletarTransacao = async (id) => {
    if (!window.confirm("Deseja excluir este item?")) return;

    try {
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await buscar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir transação.");
    }
  };

  const adicionarObjetivo = async (novoObj) => {
    try {
      const { error } = await supabase.from("objetivos").insert([
        {
          ...novoObj,
          user_id: userId,
          atual: Number(novoObj.atual || 0),
          meta: Number(novoObj.meta || 0),
          cor: novoObj.cor || "#6C5CE7",
          letra: (novoObj.nome || "O").charAt(0).toUpperCase(),
        },
      ]);

      if (error) throw error;

      await buscar();
      return true;
    } catch (e) {
      console.error(e);
      setErro("Erro ao criar objetivo.");
      return false;
    }
  };

  const atualizarObjetivo = async (objetivoAtualizado) => {
    try {
      const { error } = await supabase
        .from("objetivos")
        .update({
          nome: objetivoAtualizado.nome,
          meta: Number(objetivoAtualizado.meta || 0),
          atual: Number(objetivoAtualizado.atual || 0),
          cor: objetivoAtualizado.cor || "#6C5CE7",
          letra: (objetivoAtualizado.nome || "O").charAt(0).toUpperCase(),
        })
        .eq("id", objetivoAtualizado.id);

      if (error) throw error;

      await buscar();
      return true;
    } catch (e) {
      console.error(e);
      setErro("Erro ao atualizar objetivo.");
      return false;
    }
  };

  const deletarObjetivo = async (id) => {
    if (!window.confirm("Excluir este objetivo?")) return;

    try {
      const { error } = await supabase
        .from("objetivos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await buscar();
      return true;
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir objetivo.");
      return false;
    }
  };

  const mesAtualStr = new Date().toISOString().slice(0, 7);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const daquiSeteDias = new Date(hoje);
  daquiSeteDias.setDate(hoje.getDate() + 7);

  const contasUrgentes = transacoes.filter((t) => {
    if (!t.data_vencimento) return false;

    const dv = new Date(t.data_vencimento + "T12:00:00");

    return t.tipo === "saida" && !t.pago && dv <= daquiSeteDias;
  });

  const transacoesMes = transacoes.filter((t) =>
    t.data_vencimento?.startsWith(mesAtualStr)
  );

  const totais = (lista) => ({
    ganhos: lista
      .filter((t) => t.tipo === "entrada")
      .reduce((s, t) => s + (t.valor || 0), 0),
    despesas: lista
      .filter((t) => t.tipo === "saida")
      .reduce((s, t) => s + (t.valor || 0), 0),
  });

  return {
    transacoes,
    objetivos,
    loading,
    erro,
    setErro,
    mesAtualStr,
    contasUrgentes,
    transacoesMes,
    totais,
    adicionarTransacao,
    togglePago,
    deletarTransacao,
    adicionarObjetivo,
    atualizarObjetivo,
    deletarObjetivo,
  };
}