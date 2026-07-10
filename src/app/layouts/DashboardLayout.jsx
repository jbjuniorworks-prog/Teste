import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/shared/Toast/ToastProvider";
import { useTransacoes } from "../../features/transacoes/hooks/useTransacoes";

const TabIcon = ({ path }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const ICONS = {
  dashboard: "M3 11l9-8 9 8M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9",
  transacoes: "M7 8h13M7 8l4-4M7 8l4 4M17 16H4M17 16l-4 4M17 16l-4-4",
  objetivos: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z",
  perfil: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5",
};

const navigation = [
  { to: "/", label: "Dashboard", end: true, icon: "dashboard" },
  { to: "/transacoes", label: "Transações", icon: "transacoes" },
  { to: "/objetivos", label: "Objetivos", icon: "objetivos" },
  { to: "/perfil", label: "Perfil", icon: "perfil" },
];

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const finance = useTransacoes(user?.id, showToast);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="phone-outer">
      <div className="phone-shell">
        <main className="phone-main">
          <Outlet context={{ ...finance, user, onLogout: handleLogout }} />
        </main>

        <nav className="bottom-tab-bar">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "tab-link is-active" : "tab-link"
              }
            >
              <TabIcon path={ICONS[item.icon]} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
