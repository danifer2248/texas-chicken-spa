import { useState } from 'react'

export function PasswordField({ id, value, onChange, error }) {
  const [visible, setVisible] = useState(false)

  return (
    <FormPasswordGroup
      id={id}
      value={value}
      onChange={onChange}
      error={error}
      visible={visible}
      onToggle={() => setVisible((current) => !current)}
    />
  )
}

function FormPasswordGroup({ id, value, onChange, error, visible, onToggle }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>Contraseña</label>
      <div className="password-field-wrapper">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={onChange}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          style={error ? { borderColor: 'var(--primary-red)' } : undefined}
        />
        <button className="btn-toggle-password" type="button" onClick={onToggle}>
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      <span className={`error-msg${error ? ' active' : ''}`} id={`${id}-error`} role="alert">{error}</span>
    </div>
  )
}