import React, { useState } from 'react'
import { X, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react'
import { PayIcon } from './PayIcon'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [docNumber, setDocNumber] = useState('')
  const [docType, setDocType] = useState('CC')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Redirigiendo al portal de pagos PSE / Tarjeta para documento ${docType} ${docNumber}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Ventana modal */}
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden z-10 border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* Cabecera modal */}
        <div className="bg-gradient-to-r from-[#E20613] to-[#b3030d] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PayIcon className="w-6 h-6 brightness-110" />
            <h3 className="text-lg font-bold">Portal de Pago Seguro</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Ingresa los datos del titular para consultar el saldo de tu Tarjeta Éxito y pagar tu cuota en línea.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Tipo de documento
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            >
              <option value="CC">Cédula de Ciudadanía</option>
              <option value="CE">Cédula de Extranjería</option>
              <option value="TI">Tarjeta de Identidad</option>
              <option value="PAS">Pasaporte</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Número de documento
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Ej. 1020304050"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-3 flex items-start gap-2.5 border border-emerald-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-xs text-emerald-800">
              Tus transacciones están encriptadas con seguridad SSL de 256 bits certificada.
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-[#E20613] hover:bg-[#c90510] text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <span>Consultar y Pagar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
