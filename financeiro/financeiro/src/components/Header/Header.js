import React from "react";

export default function Header({ ganhos, despesas, user, onSair, objetivos, onAddGoal, onEditGoal, onDeleteGoal }) {
  const saldo = ganhos - despesas;
  const inicial = user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="premium-header">
      <div className="top-nav">
        <div className="user-profile">
          <div className="avatar-l">{inicial}</div>
          <div>
            <span>Boa noite,</span>
            <strong>{user?.email?.split("@")[0] || "Usuario"}</strong>
          </div>
        </div>
        <button className="sair-btn" onClick={onSair} title="Sair">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>

      <div className="main-wallet-card">
        <p className="wallet-label">Saldo total</p>
        <h2 className={saldo >= 0 ? "saldo-positivo" : "saldo-negativo"}>
          R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </h2>
        <div className="wallet-footer">
          <div>Receitas <span className="valor-entrada">R$ {ganhos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
          <div>Despesas <span className="valor-saida">R$ {despesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      <div className="section-goals">
        <div className="section-header">
          <small>OBJETIVOS</small>
          <button className="btn-add-goal" onClick={onAddGoal}>+ Novo</button>
        </div>
        
        <div className="goals-carousel">
          {objetivos.map((obj) => {
            const pct = Math.min(Math.round((obj.atual / obj.meta) * 100), 100);
            return (
              <div key={obj.id} className="goal-item" onContextMenu={(e) => {
                e.preventDefault();
                if(window.confirm("Excluir objetivo?")) onDeleteGoal(obj.id);
              }}>
                <div className="goal-top" onClick={() => {
                  const valor = prompt(`Quanto você já guardou para ${obj.nome}?`, obj.atual);
                  if (valor !== null) onEditGoal(obj.id, { atual: parseFloat(valor) });
                }}>
                  <div className="goal-letra" style={{ background: obj.cor + "30", color: obj.cor }}>
                    {obj.letra || obj.nome[0].toUpperCase()}
                  </div>
                  <span className="goal-perc">{pct}%</span>
                </div>
                <strong>{obj.nome}</strong>
                <div className="goal-values">
                  <small>R$ {Number(obj.atual).toLocaleString("pt-BR")} / {Number(obj.meta).toLocaleString("pt-BR")}</small>
                </div>
                <div className="goal-progress-bg">
                  <div className="goal-progress-fill" style={{ width: `${pct}%`, background: obj.cor }} />
                </div>
              </div>
            );
          })}
          {objetivos.length === 0 && <small className="empty-msg">Nenhum objetivo definido.</small>}
        </div>
      </div>
    </header>
  );
}