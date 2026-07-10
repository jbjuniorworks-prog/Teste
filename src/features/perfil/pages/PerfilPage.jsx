import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PluggyConnect } from "react-pluggy-connect";
import pluggyService from "../../transacoes/services/pluggyService";
import { useToast } from "../../../components/shared/Toast/ToastProvider";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "-";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PerfilPage() {
  const { user, onLogout } = useOutletContext();
  const { showToast } = useToast();

  const [connectToken, setConnectToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const email = user?.email || "";
  const inicial = (email[0] || "U").toUpperCase();
  const nome = email ? email.split("@")[0] : "usuário";

  async function handleConectar() {
    setLoadingToken(true);

    try {
      const token = await pluggyService.getConnectToken();
      setConnectToken(token);
    } catch (error) {
      showToast({
        type: "error",
        title: "Erro ao conectar",
        message: error.message || "Não foi possível iniciar a conexão bancária. Tente novamente.",
      });
    } finally {
      setLoadingToken(false);
    }
  }

  async function handleSuccess({ item }) {
    setConnectToken(null);
    setLoadingAccounts(true);

    try {
      const contas = await pluggyService.getAccounts(item.id);
      setAccounts(contas || []);

      showToast({
        type: "success",
        title: "Conta conectada",
        message: "Sua conta bancária foi conectada com sucesso.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Erro ao buscar contas",
        message: error.message || "A conexão foi feita, mas não consegui carregar as contas.",
      });
    } finally {
      setLoadingAccounts(false);
    }
  }

  return (
    <section>
      <div className="profile-hero">
        <div className="profile-avatar">{inicial}</div>
        <div>
          <p className="profile-greeting">Olá, {nome}</p>
          <span className="profile-email">{email}</span>
        </div>
      </div>

      <div className="page-body">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Dados da conta</h2>
            </div>
          </div>

          <div className="profile-info-row">
            <span>Email</span>
            <strong>{email}</strong>
          </div>

          <div className="profile-info-row">
            <span>Cliente desde</span>
            <strong>{formatDate(user?.created_at)}</strong>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Conexão bancária</h2>
              <p>Conecte sua conta para importar transações automaticamente.</p>
            </div>
          </div>

          {accounts.length > 0 && (
            <div className="profile-accounts-list">
              {accounts.map((conta) => (
                <div key={conta.id} className="profile-info-row">
                  <span>{conta.name || conta.number || "Conta"}</span>
                  <strong>{money(conta.balance)}</strong>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="ghost-button"
            onClick={handleConectar}
            disabled={loadingToken || loadingAccounts}
            style={{ marginTop: 14, width: "100%" }}
          >
            {loadingToken || loadingAccounts ? "Aguarde..." : "Conectar conta bancária"}
          </button>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Segurança</h2>
            </div>
          </div>

          <button type="button" className="profile-logout-link" onClick={onLogout}>
            Sair da conta
          </button>
        </article>
      </div>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={handleSuccess}
          onClose={() => setConnectToken(null)}
        />
      )}
    </section>
  );
}
