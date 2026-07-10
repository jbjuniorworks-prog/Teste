import { useState, useEffect, useCallback, useMemo } from "react";
import transacoesService from "../services/transacoesService";
import objetivosService from "../../objetivos/services/objetivosService";
import { calcularTotais } from "../utils/totais";

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

    const [
      { data: tData, error: tError },
      { data: oData, error: oError },
    ] = await Promise.all([
      transacoesService.listar(userId),
      objetivosService.listar(userId),
    ]);

    if (tError) {
      console.error("[useTransacoes] buscar transacoes:", tError.message);
    } else {
      setTransacoes(tData || []);
    }

    if (oError) {
      console.error("[useTransacoes] buscar objetivos:", oError.message);
    } else {
      setObjetivos(oData || []);
    }

    setErro(
      tError || oError ? "Erro ao carregar dados. Tente novamente." : ""
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeTransacoes = transacoesService.subscribe(userId, buscar);
    const unsubscribeObjetivos = objetivosService.subscribe(userId, buscar);

    return () => {
      unsubscribeTransacoes();
      unsubscribeObjetivos();
    };
  }, [userId, buscar]);

  const adicionarTransacao = async (dadosForm) => {
    if (!userId) {
      setErro("Usuário não autenticado.");
      return false;
    }

    const vLimpo = parseFloat(String(dadosForm.valor).replace(",", "."));

    if (Number.isNaN(vLimpo) || vLimpo <= 0) {
      setErro("Informe um valor válido.");
      return false;
    }

    try {
      const { error } = await transacoesService.adicionar(dadosForm, userId);
      if (error) throw error;

      await buscar();

      notify({
        type: "success",
        title: "Transação salva",
        message:
          dadosForm.tipoForm === "entrada"
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
      const { error } = await transacoesService.togglePago(transacao, userId);
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
      const { error } = await transacoesService.deletar(id, userId);
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
      const { error } = await objetivosService.adicionar(novoObj, userId);
      if (error) throw error;

      await buscar();

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
      const { error } = await objetivosService.atualizar(obj, userId);
      if (error) throw error;

      await buscar();

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
      const { error } = await objetivosService.deletar(id, userId);
      if (error) throw error;

      await buscar();

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

  const totais = useCallback((lista) => calcularTotais(lista), []);

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
