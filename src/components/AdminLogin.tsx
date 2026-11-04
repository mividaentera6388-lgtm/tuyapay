import React, { useState } from 'react'
import { Shield, Lock, User, ArrowRight, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react'

interface AdminLoginProps {
  onSuccess: () => void
  onBackToClient: () => void
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToClient }) => {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y contraseña.')
      return
    }

    setLoading(true)

    // Validación de credenciales administrativas (admin / admin123)
    setTimeout(() => {
      setLoading(false)
      if (
        (username.toLowerCase() === 'admin' || username.toLowerCase() === 'admin@novapay.com') &&
        password === 'admin123'
      ) {
        onSuccess()
      } else {
        setError('Credenciales de administrador incorrectas. Verifica tu usuario y clave.')
      }
    }, 600)
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center p-4 selection:bg-[#E20613] selection:text-white relative overflow-hidden font-sans">
      
      {/* Luces de fondo decorativas estilo consola tecnológica */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Botón flotante para regresar al portal cliente */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={onBackToClient}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition-all cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-[#E20613]" />
          <span>Portal Cliente</span>
        </button>
      </div>

      {/* Tarjeta de Login Administrativo */}
      <div className="w-full max-w-[420px] bg-[#10141E] border border-slate-800/80 rounded-3xl p-7 sm:p-9 shadow-2xl relative z-10 backdrop-blur-xl">
        
        {/* Cabecera del panel */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30 mb-4 border border-red-400/30">
            <Shield className="w-7 h-7 text-white" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[#E20613] text-[11px] font-bold uppercase tracking-wider mb-2">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Acceso Administrativo</span>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            NovaPay Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Panel de Auditoría y Control de Registros Neon
          </p>
        </div>

        {/* Alerta de error */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Campo Usuario */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Usuario de Administrador
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#161B26] border border-slate-700/60 text-white text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-[#E20613] focus:ring-1 focus:ring-[#E20613] transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Clave Maestra
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#161B26] border border-slate-700/60 text-white text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-[#E20613] focus:ring-1 focus:ring-[#E20613] transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Botón de Ingreso */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#E20613] to-[#B50813] hover:from-[#c90510] hover:to-[#990610] text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Tip de credenciales para prueba rápida */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            Credenciales de acceso rápido: <br />
            <span className="text-slate-300 font-mono">admin</span> / <span className="text-slate-300 font-mono">admin123</span>
          </p>
        </div>

      </div>

      {/* Footer discreto */}
      <div className="mt-8 text-center text-xs text-slate-400">
        NovaPay Administrative Portal • Sesión Protegida TLS 1.3
      </div>

    </div>
  )
}
