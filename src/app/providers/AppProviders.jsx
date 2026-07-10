import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "../../components/shared/Toast/ToastProvider";

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}