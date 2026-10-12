export function Footer({ page }) {
  const showInfo = page === 'home'
  const showSocial = page === 'home' || page === 'menu'

  return (
    <footer>
      {showInfo && (
        <div className="footer-info">
          <div className="info-box">
            <h4>Horario de Atención</h4>
            <p>Lunes a Domingo: 11:00 AM - 10:00 PM</p>
          </div>
          <div className="info-box">
            <h4>Ubicación</h4>
            <p>Av. Principal #123, Zona Central</p>
          </div>
        </div>
      )}
      {showSocial && (
        <div className="footer-content">
          <div className="social-links">
            <a href="#">Facebook</a>
            <a href="#">Instagram</a>
            <a href="#">WhatsApp</a>
          </div>
        </div>
      )}
      <div className="copyright">&copy; 2026 Texas Chicken. Todos los derechos reservados.</div>
    </footer>
  )
}