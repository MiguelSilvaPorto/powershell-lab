import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'danger' ? TriangleAlert : toast.tone === 'info' ? Info : CheckCircle2
        return (
          <div className={`toast toast-${toast.tone ?? 'success'}`} key={toast.id}>
            <span className="toast-icon"><Icon size={16} /></span>
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              {toast.message ? <span>{toast.message}</span> : null}
            </div>
            <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Fechar aviso">
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
