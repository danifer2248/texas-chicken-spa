import { useEffect } from 'react'

export function Toast({ message, action, onAction, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4000)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className="toast">
        <span aria-hidden="true">✅</span>
        <span><strong>{message}</strong> · <button className="toast-action" type="button" onClick={(event) => { event.stopPropagation(); onAction() }}>{action}</button></span>
        <button className="toast-dismiss" type="button" aria-label="Cerrar aviso" onClick={onClose}>&times;</button>
      </div>
    </div>
  )
}