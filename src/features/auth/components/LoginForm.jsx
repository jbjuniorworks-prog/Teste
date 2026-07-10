import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import { useAuth } from "../../../hooks/useAuth";
import "./auth.css";

export default function LoginForm() {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function getErrorMessage(message) {
    if (!message) return "Não foi possível concluir a ação.";
    if (message.includes("Invalid login credentials")) return "Email ou senha incorretos.";
    if (message.includes("Email not confirmed")) return "Confirme seu email antes de entrar.";
    if (message.includes("Unable to validate email")) return "Email inválido.";
    return "Não foi possível concluir a ação.";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Digite seu email.");
      return;
    }

    if (!normalizedEmail.includes("@")) {
      setErrorMessage("Digite um email válido.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await authService.signIn({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      setSession(data.session ?? null);
      setUser(data.user ?? null);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error?.message || error?.error_description || ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">F</div>
          <h1>Financeiro</h1>
          <p>Controle seus gastos com facilidade</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-input-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <Link to="/esqueci-senha" className="auth-link auth-link-end">
            Esqueci minha senha
          </Link>

          {errorMessage ? (
            <p className="auth-erro" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Aguarde..." : "Entrar"}
          </button>
        </form>

        <p className="auth-switch">
          Não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
