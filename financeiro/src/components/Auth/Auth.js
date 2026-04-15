import React, { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function Auth() {
  const [modo, setModo]       = useState("login");
  const [email, setEmail]     = useState("");
  const [senha, setSenha]     = useState("");
  const [erro, setErro]       = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(""); setMsg(""); setLoading(true);
    try {
      if (modo === "cadastro") {
        const { error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        setMsg("Cadastro realizado! Verifique seu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
    } catch (e) {
      setErro(e.message || "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">F</div>
          <h1>Financeiro</h1>
          <p>Controle seus gastos com facilidade</p>
        </div>

        <div className="auth-toggle">
          <button className={modo === "login" ? "active" : ""} onClick={() => { setModo("login"); setErro(""); setMsg(""); }}>
            Entrar
          </button>
          <button className={modo === "cadastro" ? "active" : ""} onClick={() => { setModo("cadastro"); setErro(""); setMsg(""); }}>
            Criar conta
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <small>Email</small>
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="auth-input-group">
            <small>Senha</small>
            <input type="password" placeholder="Minimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} required />
          </div>
          {erro && <p className="auth-erro">{erro}</p>}
          {msg  && <p className="auth-msg">{msg}</p>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
