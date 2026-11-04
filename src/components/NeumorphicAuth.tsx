import React, { useState } from 'react'
import { ChevronDown, HelpCircle, CheckCircle2 } from 'lucide-react'

export const NeumorphicAuth: React.FC = () => {
  const [docType, setDocType] = useState('Cédula de ciudadanía')
  const [docNumber, setDocNumber] = useState('71294444')
  const [productDigits, setProductDigits] = useState('8876')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const docTypes = [
    'Cédula de ciudadanía',
    'Cédula de extranjería',
    'Tarjeta de identidad',
    'Pasaporte',
  ]

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert(`Validación exitosa para ${docType}: ${docNumber} (Producto terminado en ${productDigits})`)
    }, 700)
  }

  const handleCancel = () => {
    setDocNumber('')
    setProductDigits('')
  }

  return (
    <div className="w-full flex items-center justify-center py-6 sm:py-10 px-4">
      {/* Contenedor central con silueta de dispositivo / tarjeta neumórfica */}
      <div
        className="w-full max-w-[390px] sm:max-w-[420px] bg-[#f0f2f5] rounded-[42px] sm:rounded-[48px] p-6 sm:p-8 relative overflow-hidden transition-all duration-300"
        style={{
          boxShadow:
            '18px 18px 40px rgba(185, 195, 210, 0.6), -16px -16px 40px rgba(255, 255, 255, 0.95), inset 1px 1px 2px rgba(255, 255, 255, 0.8)',
        }}
      >
        {/* Barra superior de estado simulada (estilo smartphone) */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-6 px-2 select-none">
          <span>09:50</span>
          <div className="flex items-center gap-1.5">
            {/* Señal wifi / red */}
            <svg className="w-3.5 h-3.5 fill-current opacity-70" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-4a1 1 0 112 0 1 1 0 01-2 0zm0-7a1 1 0 112 0v4a1 1 0 11-2 0V7z" />
            </svg>
            <span>80%</span>
          </div>
        </div>

        {/* Logotipo centrado caligráfico/geométrico rojo sin referencia a Tuya */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div
            className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center select-none"
            style={{
              boxShadow:
                '6px 6px 14px rgba(190, 200, 215, 0.55), -6px -6px 14px rgba(255, 255, 255, 0.95)',
            }}
          >
            {/* Símbolo de marca fluido en rojo vibrante */}
            <span className="text-2xl font-black italic tracking-tighter text-[#E20613] font-serif transform -rotate-3">
              Nova
            </span>
          </div>
        </div>

        {/* Título principal centrado */}
        <h1 className="text-2xl sm:text-[26px] font-normal text-[#5b6a7d] text-center tracking-tight mb-3">
          Asignar o cambiar clave
        </h1>

        {/* Párrafo explicativo centrado con palabras clave resaltadas */}
        <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-[#5b6a7d] text-center mb-6 px-1">
          Con esta, puedes hacer consultas en nuestra <strong>app</strong>, <strong>sitio web</strong> y{' '}
          <strong>centros telefónicos</strong>. <strong>Además</strong>, realizar avances.
        </p>

        {/* Subtítulo centrado */}
        <h2 className="text-lg sm:text-[19px] font-normal text-[#5b6a7d] text-center mb-6">
          Ingresar tus datos
        </h2>

        {/* Formulario con campos hundidos neumórficos (inset shadow) */}
        <form onSubmit={handleNext} className="space-y-4">
          
          {/* CAMPO 1: Selector de tipo de documento */}
          <div className="relative">
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-[#f0f2f5] rounded-2xl px-5 py-3.5 cursor-pointer select-none transition-all duration-200"
              style={{
                boxShadow:
                  'inset 3px 3px 6px rgba(175, 185, 200, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
              }}
            >
              <span className="block text-[11px] font-medium text-gray-400">
                Seleccione el tipo de documento
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[15px] font-medium text-gray-800">
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

            {/* Menú desplegable neumórfico */}
            {isDropdownOpen && (
              <div
                className="absolute z-30 top-full left-0 right-0 mt-2 bg-[#f0f2f5] rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
                style={{
                  boxShadow:
                    '8px 8px 18px rgba(175, 185, 200, 0.6), -8px -8px 18px rgba(255, 255, 255, 0.95)',
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
                        ? 'text-[#E20613] font-bold bg-white/60'
                        : 'text-gray-700 hover:bg-white/40'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CAMPO 2: Número de documento */}
          <div
            className="w-full bg-[#f0f2f5] rounded-2xl px-5 py-3.5 transition-all duration-200"
            style={{
              boxShadow:
                'inset 3px 3px 6px rgba(175, 185, 200, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
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
              placeholder="71294444"
              className="w-full bg-transparent border-none outline-none text-[16px] font-medium text-gray-800 p-0 mt-0.5 focus:ring-0 placeholder:text-gray-400"
            />
          </div>

          {/* CAMPO 3: Últimos 4 dígitos del producto */}
          <div
            className="w-full bg-[#f0f2f5] rounded-2xl px-5 py-3.5 transition-all duration-200"
            style={{
              boxShadow:
                'inset 3px 3px 6px rgba(175, 185, 200, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.9)',
            }}
          >
            <label className="block text-[11px] font-medium text-gray-400 select-none">
              Escribe los últimos 4 dígitos de tu producto
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              required
              value={productDigits}
              onChange={(e) => setProductDigits(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="8876"
              className="w-full bg-transparent border-none outline-none text-[16px] font-medium text-gray-800 p-0 mt-0.5 focus:ring-0 placeholder:text-gray-400"
            />
          </div>

          {/* Enlace de ayuda centrado */}
          <div className="text-center pt-2 pb-3">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-xs sm:text-[13px] text-[#4b6b94] font-medium underline underline-offset-3 hover:text-[#E20613] transition-colors cursor-pointer select-none"
            >
              ¿Dónde puedo encontrar estos dígitos?
            </button>
          </div>

          {/* BOTÓN 1: Siguiente (Rojo vibrante 3D con degradado) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl text-white font-bold text-[15px] sm:text-[16px] cursor-pointer select-none transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(180deg, #db1825 0%, #bd0e19 100%)',
              boxShadow:
                '0 8px 18px -2px rgba(190, 15, 26, 0.42), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Siguiente</span>
            )}
          </button>

          {/* BOTÓN 2: Cancelar (Botón neumórfico convexo claro con texto rojo) */}
          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-3.5 px-6 rounded-2xl text-[#E20613] font-bold text-[14px] sm:text-[15px] cursor-pointer select-none transition-all duration-200 active:scale-[0.98] focus:outline-none"
            style={{
              background: '#f0f2f5',
              boxShadow:
                '5px 5px 12px rgba(185, 195, 210, 0.5), -5px -5px 12px rgba(255, 255, 255, 0.95)',
            }}
          >
            Cancelar
          </button>

        </form>

      </div>

      {/* Modal explicativo de ayuda sobre los dígitos */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-[#f0f2f5] rounded-3xl p-6 max-w-sm w-full space-y-4"
            style={{
              boxShadow:
                '12px 12px 30px rgba(0, 0, 0, 0.2), -12px -12px 30px rgba(255, 255, 255, 0.9)',
            }}
          >
            <div className="flex items-center gap-2 text-gray-800">
              <HelpCircle className="w-6 h-6 text-[#E20613]" />
              <h3 className="font-bold text-base">Últimos 4 dígitos de tu producto</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Los encuentras impresos en el frente o reverso de tu tarjeta física, o en el extracto mensual de tu cuenta.
            </p>
            <div className="p-3 rounded-xl bg-white/70 border border-gray-200/60 text-xs text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ejemplo: •••• •••• •••• <strong>8876</strong></span>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#E20613] text-white font-bold text-sm hover:brightness-105 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
