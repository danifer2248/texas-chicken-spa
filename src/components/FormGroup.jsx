export function FormGroup({ id, label, type = 'text', placeholder, value, onChange, error, children }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {children || (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          style={error ? { borderColor: 'var(--primary-red)' } : undefined}
        />
      )}
      <span className={`error-msg${error ? ' active' : ''}`} id={`${id}-error`} role="alert">{error}</span>
    </div>
  )
}