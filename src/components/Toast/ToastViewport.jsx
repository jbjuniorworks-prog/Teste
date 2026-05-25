import React from "react";
import "./Toast.css";

const ICONS = {
  success: "?",
  error: "!",
  warning: "!",
  info: "i",
};

export default function ToastViewport({ toasts, onClose }) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
          <div className="toast-icon">{ICONS[toast.type] || "i"}</div>

          <div className="toast-content">
            {toast.title && <strong className="toast-title">{toast.title}</strong>}
            {toast.message && <p className="toast-message">{toast.message}</p>}
          </div>

          <button
            type="button"
            className="toast-close"
            onClick={() => onClose(toast.id)}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
