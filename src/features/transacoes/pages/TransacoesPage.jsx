import { useOutletContext } from "react-router-dom";
import TransactionForm from "../components/TransactionForm";
import TransactionsTable from "../components/TransactionsTable";

export default function TransacoesPage() {
  const {
    transacoes,
    mesAtualStr,
    loading,
    erro,
    setErro,
    adicionarTransacao,
    togglePago,
    confirmandoId,
    pedirConfirmacaoTransacao,
    cancelarConfirmacaoTransacao,
    confirmarDeletarTransacao,
  } = useOutletContext();

  return (
    <section>
      <header className="page-header">
        <div>
          <span className="eyebrow">Movimentações</span>
          <h1>Transações</h1>
          <p>Registre receitas e despesas e acompanhe seu histórico.</p>
        </div>
      </header>

      <TransactionForm onSubmit={adicionarTransacao} erro={erro} setErro={setErro} />

      <TransactionsTable
        transacoes={transacoes}
        mesAtualStr={mesAtualStr}
        loading={loading}
        onTogglePago={togglePago}
        confirmandoId={confirmandoId}
        pedirConfirmacaoTransacao={pedirConfirmacaoTransacao}
        cancelarConfirmacaoTransacao={cancelarConfirmacaoTransacao}
        confirmarDeletarTransacao={confirmarDeletarTransacao}
      />
    </section>
  );
}
