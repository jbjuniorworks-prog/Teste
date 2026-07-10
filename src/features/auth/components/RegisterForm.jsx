import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import { useAuth } from "../../../hooks/useAuth";
import "./auth.css";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function getErrorMessage(message) {
    if (!message) return "Não foi possível concluir a ação.";
    if (message.includes("User already registered")) return "Este email já está cadastrado.";
    if (message.includes("Password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
    if (message.includes("Unable to validate email")) return "Email inválido.";
    if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      return "Erro de conexão com o servidor. Verifique sua internet ou tente novamente em instantes.";
    }
    return "Não foi possível concluir a ação.";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setErrorMessage("");
    setSuccessMessage("");

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

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await authService.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        setUser(data.user ?? null);
        navigate("/onboarding", { replace: true });
        return;
      }

      setSuccessMessage("Cadastro realizado. Verifique seu email para confirmar a conta.");
    } catch (error) {
      console.error("[RegisterForm] signUp:", error);
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
          <h1>Criar conta</h1>
          <p>Comece a controlar seus gastos em minutos</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-input-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="reg-password">Senha</label>
            <input
              id="reg-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="reg-confirm-password">Confirmar senha</label>
            <input
              id="reg-confirm-password"
              type="password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          {errorMessage ? (
            <p className="auth-erro" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="auth-msg" role="status">
              {successMessage}
            </p>
          ) : null}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Aguarde..." : "Criar conta"}
          </button>
        </form>

        <p className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
