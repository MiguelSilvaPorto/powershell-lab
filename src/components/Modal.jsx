import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ children, onClose, className = '', labelledBy = undefined, size = 'default' }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    const timer = window.setTimeout(() => {
      dialogRef.current?.focus?.({ preventScroll: true })
    }, 30)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return createPortal(
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal-${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
