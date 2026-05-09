import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// When Electron loads the overlay window, it adds ?overlay=true to the URL.
// Mark the root element so CSS can make the background fully transparent.
if (new URLSearchParams(window.location.search).get('overlay') === 'true') {
  document.documentElement.classList.add('overlay-mode')
}

createRoot(document.getElementById('root')).render(<App />)
