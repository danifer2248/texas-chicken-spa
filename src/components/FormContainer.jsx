export function FormContainer({ title, notice, footer, children }) {
  return (
    <section className="form-container page-section">
      <h2>{title}</h2>
      {notice && <div className="login-alert">{notice}</div>}
      {children}
      <div className="register-redirect">{footer}</div>
    </section>
  )
}