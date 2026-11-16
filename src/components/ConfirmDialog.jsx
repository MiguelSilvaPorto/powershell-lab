import { TriangleAlert } from 'lucide-react'
import Modal from './Modal.jsx'

export default function ConfirmDialog({ title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'default', onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} className="confirm-modal" labelledBy="confirm-title" size="small">
      <span className={`confirm-icon ${tone === 'danger' ? 'is-danger' : ''}`}>
        <TriangleAlert size={20} />
      </span>
      <h2 id="confirm-title">{title}</h2>
      <p>{description}</p>
      <div className="confirm-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className={`button ${tone === 'danger' ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
