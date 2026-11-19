import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.tsx'
import ThemeTransition from './components/ThemeTransition'
import ErrorBoundary from './components/ErrorBoundary'

// Veri yönlendiricisi: tüm rotalar App içindeki <Routes>'ta; tek "*" rotası yeterli. useBlocker (kaydedilmemiş
// değişiklik varken sayfadan çıkma onayı, Ayarlar) yalnızca veri yönlendiricisinde çalışır. Hata sınırı rotanın içinde:
// yönlendiricinin kendi hata ekranı yerine bizimki görünür.
const router = createBrowserRouter([
  { path: '*', element: <ErrorBoundary><App /></ErrorBoundary> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light">
      <ThemeTransition />
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
