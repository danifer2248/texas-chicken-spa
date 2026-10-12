import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '../docs/legacy/TEXAS_CHICKEN-main/styles.css'
import './App.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
