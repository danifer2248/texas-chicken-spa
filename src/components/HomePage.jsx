import { FeatureCard } from './FeatureCard.jsx'

const features = [
  { title: '🍗 Receta Crujiente', description: 'Empanizado a mano diariamente con nuestra mezcla secreta de especias.' },
  { title: '🚀 Envío Rápido', description: 'Tu comida llega caliente y a tiempo directamente a tu puerta.' },
  { title: '🥤 Combos Económicos', description: 'Disfruta de la mejor calidad al precio más justo para toda la familia.' },
]

export function HomePage() {
  return (
    <main className="main-container">
      <section className="hero page-section">
        <h1>El Mejor Pollo Frito del Estado</h1>
        <p>Crujiente, jugoso y preparado con la mejor receta tradicional.</p>
        <a href={`${import.meta.env.BASE_URL}menu.html`} className="btn-primary">Ver Menú Completo</a>
      </section>
      <section className="features page-section">
        {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
      </section>
    </main>
  )
}
