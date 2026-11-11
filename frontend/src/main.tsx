import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.tsx'
import ThemeTransition from './components/ThemeTransition'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light">
      <ThemeTransition />
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
