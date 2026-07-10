import { useNavigate } from "react-router-dom";
import "../../auth/components/auth.css";

export default function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">F</div>
          <h1>Bem-vindo!</h1>
          <p>Sua conta foi criada. Vamos organizar suas finanças a partir de agora.</p>
        </div>

        <button type="button" className="auth-btn" onClick={() => navigate("/", { replace: true })}>
          Ir para o Dashboard
        </button>
      </div>
    </div>
  );
}
