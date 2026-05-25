import React, { useCallback, useEffect, useState } from "react";
import "./ConfirmModal.css";

export default function ConfirmModal({
  titulo,
  mensagem,
  labelConfirmar = "Confirmar",
  perigoso = false,
  onConfirm,
  onClose,
}) {
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing((prev) => {
      if (prev) return prev;

      setTimeout(() => {
        onClose?.();
      }, 160);

      return true;
    });
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <div
      className={`modal-overlay ${closing ? "closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={handleOverlayClick}
    >
      <div className={`modal-card ${closing ? "closing" : ""}`}>
        <div className="modal-header">
          <h3 id="confirm-title">{titulo}</h3>
        </div>

        <p className="confirm-msg">{mensagem}</p>

        <div className="modal-btns">
          <button
            type="button"
            className="modal-btn-cancel"
            onClick={handleClose}
            disabled={closing}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={perigoso ? "modal-btn-danger" : "modal-btn-confirm"}
            onClick={handleConfirm}
            autoFocus
            disabled={closing}
          >
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}