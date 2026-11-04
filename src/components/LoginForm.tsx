import React, { useState } from 'react'
import {
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  LockKeyhole,
} from 'lucide-react'

export const LoginForm: React.FC = () => {
  const [docType, setDocType] = useState('CC')
  const [docNumber, setDocNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!docNumber.trim()) {
      setErrorMessage('Por favor ingresa tu número de documento.')
      return
    }

    if (!password.trim() || password.length < 4) {
      setErrorMessage('Por favor ingresa tu contraseña de acceso (mínimo 4 caracteres).')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      alert(`Acceso correcto con documento ${docType} ${docNumber}`)
    }, 800)
  }

  return (
    <div className="w-full max-w-[460px] mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
      
      {/* Tarjeta de Autenticación con volumen y sombras sofisticadas */}
      <div
        className="w-full bg-white rounded-3xl p-6 sm:p-9 border border-gray-100/90 relative overflow-hidden transition-all duration-300"
        style={{
          boxShadow:
            '0 20px 45px -8px rgba(0, 0, 0, 0.12), 0 8px 18px -4px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Línea superior con gradiente corporativo */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#b50813] via-[#e51927] to-[#ff4757]" />

        {/* Encabezado centrado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#d70a17] text-[11px] font-bold uppercase tracking-wider mb-3">
            <LockKeyhole className="w-3.5 h-3.5" />
            <span>Acceso Seguro</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-2 leading-relaxed">
            Ingresa tus credenciales para acceder a tu cuenta y gestionar tus servicios.
          </p>
        </div>

        {/* Mensaje de error si aplica */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center gap-2 text-center animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          
          {/* Tipo de Documento */}
          <div className="text-left">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Tipo de documento
            </label>
            <div className="relative">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full appearance-none bg-gray-50/80 hover:bg-gray-50 border border-gray-300/90 text-gray-800 text-sm font-medium rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-[#e51927]/25 focus:border-[#e51927] transition-all cursor-pointer"
              >
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="PAS">Pasaporte (PAS)</option>
                <option value="NIT">NIT Empresarial</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Número de Documento */}
          <div className="text-left">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Número de documento
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="username"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Ej. 1020304050"
                className="w-full bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-300/90 text-gray-900 text-sm font-medium rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#e51927]/25 focus:border-[#e51927] transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="text-left">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Contraseña
              </label>
              <a
                href="#recuperar"
                className="text-xs font-semibold text-[#d70a17] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-300/90 text-gray-900 text-sm font-medium rounded-xl pl-11 pr-12 py-3 outline-none focus:ring-2 focus:ring-[#e51927]/25 focus:border-[#e51927] transition-all placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Recordar documento */}
          <div className="flex items-center justify-center pt-1">
            <label className="relative flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#d70a17] border-gray-300 focus:ring-red-400 cursor-pointer"
              />
              <span>Recordar mis datos en este equipo</span>
            </label>
          </div>

          {/* Botón Principal de Acción Centrado */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative flex items-center justify-center gap-2 text-white font-bold text-sm sm:text-base py-3.5 px-6 rounded-full cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(180deg, #c40a15 0%, #db0e1c 50%, #e61927 100%)',
                boxShadow:
                  '0 6px 16px -1px rgba(196, 10, 21, 0.45), 0 2px 6px -1px rgba(0, 0, 0, 0.16), inset 0 1px 1.5px rgba(255, 255, 255, 0.35), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <>
                  <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                    Ingresar
                  </span>
                  <ArrowRight className="w-4 h-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Separador */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">o</span>
          <div className="h-[1px] flex-1 bg-gray-200" />
        </div>

        {/* Registro centrado */}
        <div className="text-center space-y-1.5">
          <p className="text-xs text-gray-500">
            ¿Aún no tienes una cuenta registrada?
          </p>
          <a
            href="#registro"
            className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#d70a17] hover:underline cursor-pointer"
          >
            <span>Crear una cuenta nueva</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>

      {/* Mensaje de pie de tarjeta centrado */}
      <div className="text-center mt-6 text-xs text-gray-400 flex items-center justify-center gap-2">
        <LockKeyhole className="w-3.5 h-3.5 text-gray-400" />
        <span>Conexión cifrada de extremo a extremo</span>
      </div>

    </div>
  )
}
