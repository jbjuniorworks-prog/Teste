import { useState } from "react";
import { Link } from "react-router-dom";
import authService from "../services/authService";
import "./auth.css";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setErrorMessage("Digite um email válido.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authService.resetPassword({ email: normalizedEmail });
      if (error) throw error;

      setSuccessMessage("Enviamos um link de redefinição para o seu email.");
    } catch (error) {
      setErrorMessage("Não foi possível enviar o email. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">F</div>
          <h1>Recuperar senha</h1>
          <p>Informe seu email para receber o link de redefinição</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-input-group">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
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
            {loading ? "Aguarde..." : "Enviar link"}
          </button>
        </form>

        <p className="auth-switch">
          Lembrou a senha? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
