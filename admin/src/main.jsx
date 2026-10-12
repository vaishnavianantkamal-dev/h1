import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { setupListeners } from '@reduxjs/toolkit/query'
import { store } from './store/store'
import './index.css'
import App from './App.jsx'

setupListeners(store.dispatch)

// After a new deploy, a stale tab can try to lazy-load a chunk whose hashed
// filename no longer exists on the server. Vite emits this event in that
// case — reload once to pick up the current build instead of showing an error.
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('vite-reloaded-on-preload-error')) {
    sessionStorage.setItem('vite-reloaded-on-preload-error', '1')
    window.location.reload()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
