import { useState, useEffect } from 'react'
import { VisualAuthView } from './components/VisualAuthView'
import { Dashboard } from './components/Dashboard'
import { AdminLogin } from './components/AdminLogin'
import { CreditCardCheckout } from './components/CreditCardCheckout'

export function App() {
  const [view, setView] = useState<'auth' | 'credit-card' | 'admin-login' | 'dashboard'>('auth')
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(() => {
    return sessionStorage.getItem('novapay_admin_auth') === 'true'
  })

  // Sincronizar hash de la URL
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      if (hash === '#dashboard' || hash === '#admin') {
        if (isAdminAuth) {
          setView('dashboard')
        } else {
          setView('admin-login')
        }
      } else if (hash === '#tarjeta' || hash === '#checkout') {
        setView('credit-card')
      } else {
        setView('auth')
      }
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [isAdminAuth])

  const handleAdminLoginSuccess = () => {
    setIsAdminAuth(true)
    sessionStorage.setItem('novapay_admin_auth', 'true')
    window.location.hash = '#dashboard'
    setView('dashboard')
  }

  const handleAdminLogout = () => {
    setIsAdminAuth(false)
    sessionStorage.removeItem('novapay_admin_auth')
    setView('admin-login')
  }

  const handleBackToClient = () => {
    window.location.hash = ''
    setView('auth')
  }

  const handleGoToCreditCard = () => {
    window.location.hash = '#tarjeta'
    setView('credit-card')
  }

  return (
    <div className="relative min-h-screen bg-[#F0F2F5]">
      
      {/* Vista 1: Login de Administrador */}
      {view === 'admin-login' && (
        <AdminLogin
          onSuccess={handleAdminLoginSuccess}
          onBackToClient={handleBackToClient}
        />
      )}

      {/* Vista 2: Dashboard Administrativo Rediseñado (Requiere Login) */}
      {view === 'dashboard' && (
        <Dashboard
          onLogout={handleAdminLogout}
          onBackToClient={handleBackToClient}
        />
      )}

      {/* Vista 3: Formulario Individual de Compra con Tarjetas de Crédito */}
      {view === 'credit-card' && (
        <CreditCardCheckout />
      )}

      {/* Vista 4: Portal Público Individual de Validación Bancaria */}
      {view === 'auth' && (
        <VisualAuthView onGoToCard={handleGoToCreditCard} />
      )}

    </div>
  )
}

export default App
