import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";

export function useTransacoes(userId, notify = () => {}) {
  const [transacoes, setTransacoes] = useState([]);
  const [objetivos, setObjetivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [confirmandoId, setConfirmandoId] = useState(null);
  const [confirmandoObjetivoId, setConfirmandoObjetivoId] = useState(null);

  const mesAtualStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const buscar = useCallback(async () => {
    if (!userId) {
      setTransacoes([]);
      setObjetivos([]);
      return;
    }

    setLoading(true);
    setErro("");

    try {
      const [
        { data: tData, error: tError },
        { data: oData, error: oError },
      ] = await Promise.all([
        supabase
          .from("transacoes")
          .select("*")
          .eq("user_id", userId)
          .order("data_vencimento", { ascending: true }),
        supabase
          .from("objetivos")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
      ]);

      if (tError) throw tError;
      if (oError) throw oError;

      setTransacoes(tData || []);
      setObjetivos(oData || []);
    } catch (e) {
      console.error("[useTransacoes] buscar:", e.message);
      setErro("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`financeiro-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transacoes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          buscar();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "objetivos",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          buscar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, buscar]);

  const adicionarTransacao = async ({
    descricao,
    valor,
    parcelas,
    vencimento,
    categoriaSel,
    tipoForm,
  }) => {
    if (!userId) {
      setErro("Usuário não autenticado.");
      return false;
    }

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

        const { error } = await supabase.from("transacoes").insert(lista);
        if (error) throw error;
      }

      notify({
        type: "success",
        title: "Transação salva",
        message:
          tipoForm === "entrada"
            ? "A entrada foi registrada com sucesso."
            : "A despesa foi registrada com sucesso.",
      });

      return true;
    } catch (e) {
      console.error("[useTransacoes] adicionarTransacao:", e.message);
      setErro("Erro ao salvar transação. Tente novamente.");
      return false;
    }
  };

  const togglePago = async (transacao) => {
    if (!userId) {
      setErro("Usuário não autenticado.");
      return;
    }

    setTransacoes((prev) =>
      prev.map((item) =>
        item.id === transacao.id ? { ...item, pago: !item.pago } : item
      )
    );

    try {
      const { error } = await supabase
        .from("transacoes")
        .update({ pago: !transacao.pago })
        .eq("id", transacao.id)
        .eq("user_id", userId);

      if (error) throw error;

      notify({
        type: "success",
        title: transacao.pago ? "Pagamento desfeito" : "Conta paga",
        message: transacao.pago
          ? "A transação voltou para em aberto."
          : "A transação foi marcada como paga.",
      });
    } catch (e) {
      console.error("[useTransacoes] togglePago:", e.message);
      setErro("Erro ao atualizar pagamento.");

      setTransacoes((prev) =>
        prev.map((item) =>
          item.id === transacao.id ? { ...item, pago: transacao.pago } : item
        )
      );
    }
  };

  const pedirConfirmacaoTransacao = (id) => {
    setConfirmandoId(id);
  };

  const cancelarConfirmacaoTransacao = () => {
    setConfirmandoId(null);
  };

  const confirmarDeletarTransacao = async () => {
    const id = confirmandoId;

    if (!id || !userId) return false;

    setConfirmandoId(null);
    setTransacoes((prev) => prev.filter((item) => item.id !== id));

    try {
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      notify({
        type: "success",
        title: "Transação excluída",
        message: "A transação foi removida com sucesso.",
      });

      return true;
    } catch (e) {
      console.error("[useTransacoes] deletarTransacao:", e.message);
      setErro("Erro ao excluir transação.");
      await buscar();
      return false;
    }
  };

  const adicionarObjetivo = async (novoObj) => {
    if (!userId) {
      setErro("Usuário não autenticado.");
      return false;
    }

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

      notify({
        type: "success",
        title: "Objetivo criado",
        message: "Seu novo objetivo foi adicionado.",
      });

      return true;
    } catch (e) {
      console.error("[useTransacoes] adicionarObjetivo:", e.message);
      setErro("Erro ao criar objetivo.");
      return false;
    }
  };

  const atualizarObjetivo = async (obj) => {
    if (!userId) {
      setErro("Usuário não autenticado.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("objetivos")
        .update({
          nome: obj.nome,
          meta: Number(obj.meta || 0),
          atual: Number(obj.atual || 0),
          cor: obj.cor || "#6C5CE7",
          letra: (obj.nome || "O").charAt(0).toUpperCase(),
        })
        .eq("id", obj.id)
        .eq("user_id", userId);

      if (error) throw error;

      notify({
        type: "success",
        title: "Objetivo atualizado",
        message: "As alterações foram salvas.",
      });

      return true;
    } catch (e) {
      console.error("[useTransacoes] atualizarObjetivo:", e.message);
      setErro("Erro ao atualizar objetivo.");
      return false;
    }
  };

  const pedirConfirmacaoObjetivo = (id) => {
    setConfirmandoObjetivoId(id);
  };

  const cancelarConfirmacaoObjetivo = () => {
    setConfirmandoObjetivoId(null);
  };

  const confirmarDeletarObjetivo = async () => {
    const id = confirmandoObjetivoId;

    if (!id || !userId) return false;

    setConfirmandoObjetivoId(null);

    try {
      const { error } = await supabase
        .from("objetivos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      notify({
        type: "success",
        title: "Objetivo excluído",
        message: "O objetivo foi removido com sucesso.",
      });

      return true;
    } catch (e) {
      console.error("[useTransacoes] deletarObjetivo:", e.message);
      setErro("Erro ao excluir objetivo.");
      await buscar();
      return false;
    }
  };

  const totais = useCallback((lista) => {
    return lista.reduce(
      (acc, item) => {
        const valor = Number(item.valor || 0);

        if (item.tipo === "entrada") acc.ganhos += valor;
        if (item.tipo === "saida") acc.despesas += valor;

        return acc;
      },
      { ganhos: 0, despesas: 0 }
    );
  }, []);

  return {
    transacoes,
    objetivos,
    loading,
    erro,
    setErro,
    mesAtualStr,
    totais,
    adicionarTransacao,
    togglePago,
    confirmandoId,
    pedirConfirmacaoTransacao,
    cancelarConfirmacaoTransacao,
    confirmarDeletarTransacao,
    adicionarObjetivo,
    atualizarObjetivo,
    confirmandoObjetivoId,
    pedirConfirmacaoObjetivo,
    cancelarConfirmacaoObjetivo,
    confirmarDeletarObjetivo,
  };
}
