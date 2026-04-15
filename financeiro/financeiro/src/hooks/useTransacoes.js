import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function useTransacoes(userId) {
  const [transacoes, setTransacoes] = useState([]);
  const [objetivos, setObjetivos] = useState([]); // <-- Novo estado
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // --- BUSCA DE DADOS ---
  const buscar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErro("");
    try {
      // Busca Transações
      const { data: tData, error: tError } = await supabase
        .from("transacoes")
        .select("*")
        .eq("user_id", userId)
        .order("data_vencimento", { ascending: true });
      if (tError) throw tError;
      setTransacoes(tData || []);

      // Busca Objetivos
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

  useEffect(() => { buscar(); }, [buscar]);

  // --- LÓGICA DE TRANSAÇÕES ---
  const adicionarTransacao = async ({ descricao, valor, parcelas, vencimento, categoriaSel, tipoForm }) => {
    const vLimpo = parseFloat(valor.toString().replace(",", "."));
    if (isNaN(vLimpo) || vLimpo <= 0) { setErro("Informe um valor válido."); return false; }
    
    try {
      if (tipoForm === "entrada") {
        const { error } = await supabase.from("transacoes").insert([{
          user_id: userId, descricao, valor: vLimpo, tipo: "entrada", pago: true,
          categoria: categoriaSel || "outros", data_vencimento: vencimento,
          num_parcela: 1, total_parcelas: 1,
        }]);
        if (error) throw error;
      } else {
        const nParc = parseInt(parcelas) || 1;
        const vCada = vLimpo / nParc;
        const dBase = new Date(vencimento + "T12:00:00");
        const lista = Array.from({ length: nParc }, (_, i) => {
          const d = new Date(dBase); d.setMonth(dBase.getMonth() + i);
          return {
            user_id: userId, descricao, valor: parseFloat(vCada.toFixed(2)),
            tipo: "saida", pago: false, categoria: categoriaSel || "outros",
            data_vencimento: d.toISOString().split("T")[0],
            num_parcela: i + 1, total_parcelas: nParc,
          };
        });
        const { error } = await supabase.from("transacoes").insert(lista);
        if (error) throw error;
      }
      await buscar(); return true;
    } catch (e) { setErro("Erro ao salvar."); return false; }
  };

  const togglePago = async (t) => {
    const novoPago = !t.pago;
    const { error } = await supabase.from("transacoes").update({ pago: novoPago }).eq("id", t.id);
    if (!error) buscar();
  };

  const deletarTransacao = async (id) => {
    if (!window.confirm("Deseja excluir este item?")) return;
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (!error) buscar();
  };

  // --- LÓGICA DE OBJETIVOS (CRUD) ---
  const adicionarObjetivo = async (novoObj) => {
    try {
      const { error } = await supabase.from("objetivos").insert([{
        ...novoObj,
        user_id: userId,
        letra: novoObj.nome.charAt(0).toUpperCase()
      }]);
      if (error) throw error;
      await buscar(); return true;
    } catch (e) { setErro("Erro ao criar objetivo."); return false; }
  };

  const atualizarObjetivo = async (id, campos) => {
    const { error } = await supabase.from("objetivos").update(campos).eq("id", id);
    if (!error) buscar();
  };

  const deletarObjetivo = async (id) => {
    if (!window.confirm("Excluir este objetivo?")) return;
    const { error } = await supabase.from("objetivos").delete().eq("id", id);
    if (!error) buscar();
  };

  // --- CÁLCULOS ---
  const mesAtualStr = new Date().toISOString().slice(0, 7);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const daquiSeteDias = new Date(hoje); daquiSeteDias.setDate(hoje.getDate() + 7);

  const contasUrgentes = transacoes.filter(t => {
    if (!t.data_vencimento) return false;
    const dv = new Date(t.data_vencimento + "T12:00:00");
    return t.tipo === "saida" && !t.pago && dv <= daquiSeteDias;
  });

  const transacoesMes = transacoes.filter(t => t.data_vencimento?.startsWith(mesAtualStr));
  
  const totais = (lista) => ({
    ganhos:   lista.filter(t => t.tipo === "entrada").reduce((s, t) => s + (t.valor || 0), 0),
    despesas: lista.filter(t => t.tipo === "saida").reduce((s, t) => s + (t.valor || 0), 0),
  });

  return { 
    transacoes, objetivos, loading, erro, setErro, 
    mesAtualStr, contasUrgentes, transacoesMes, totais, 
    adicionarTransacao, togglePago, deletarTransacao,
    adicionarObjetivo, atualizarObjetivo, deletarObjetivo // <-- Funções exportadas
  };
}