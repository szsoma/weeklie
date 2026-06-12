import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useStore } from './store'

async function bootstrap() {
  await useStore.getState().loadTasks()
  await useStore.getState().loadReviews()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

bootstrap()
