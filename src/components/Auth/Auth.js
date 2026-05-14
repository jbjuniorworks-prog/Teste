import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import "./Auth.css";

export default function Auth() {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const trocarModo = (novoModo) => { setModo(novoModo); setErro(""); setMsg(""); };

  const traduzirErro = (mensagem) => {
    if (mensagem.includes("Invalid login credentials")) return "Email ou senha incorretos.";
    if (mensagem.includes("Email not confirmed"))       return "Confirme seu email antes de entrar.";
    if (mensagem.includes("User already registered"))   return "Este email já está cadastrado.";
    if (mensagem.includes("Password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
    if (mensagem.includes("Unable to validate email"))  return "Email inválido.";
    return "Ocorreu um erro. Tente novamente.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(""); setMsg("");

    if (!email.trim())       { setErro("Digite seu email."); return; }
    if (senha.length < 6)    { setErro("A senha deve ter no mínimo 6 caracteres."); return; }

    setLoading(true);
    try {
      if (modo === "cadastro") {
        const { error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        setMsg("Cadastro realizado! Verifique seu email para confirmar a conta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
    } catch (e) {
      setErro(traduzirErro(e.message || ""));
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
          <button type="button" className={modo === "login"   ? "active" : ""} onClick={() => trocarModo("login")}>Entrar</button>
          <button type="button" className={modo === "cadastro" ? "active" : ""} onClick={() => trocarModo("cadastro")}>Criar conta</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-input-group">
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" placeholder="seu@email.com"
              value={email} onChange={(e) => { setEmail(e.target.value); setErro(""); }}
              autoComplete="email" inputMode="email" />
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-senha">Senha</label>
            <input id="auth-senha" type="password" placeholder="Mínimo 6 caracteres"
              value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }}
              autoComplete={modo === "cadastro" ? "new-password" : "current-password"} />
          </div>

          {erro && <p className="auth-erro" role="alert">{erro}</p>}
          {msg  && <p className="auth-msg"  role="status">{msg}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}