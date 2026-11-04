import React from 'react'
import { PayIcon } from './PayIcon'

interface TopActionsProps {
  onPayClick?: () => void
}

export const TopActions: React.FC<TopActionsProps> = ({ onPayClick }) => {
  return (
    <div className="flex items-center">
      {/* Contenedor tipo píldora flotante con sombra multicapa pronunciada y relieve suave */}
      <div
        className="flex items-center bg-gradient-to-b from-white via-[#fefefe] to-[#f8f9fa] rounded-full pl-6 pr-1.5 py-1.5 border border-black/[0.04]"
        style={{
          boxShadow:
            '0 12px 28px -4px rgba(0, 0, 0, 0.14), 0 4px 10px -2px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* Opción 1: Soluciones de pago */}
        <a
          href="#soluciones-pago"
          className="text-[13.5px] md:text-[14px] text-gray-800 font-medium hover:text-[#d70a17] transition-colors py-1.5 px-3 whitespace-nowrap cursor-pointer select-none"
        >
          Soluciones de pago
        </a>

        {/* Divisor vertical 1 */}
        <span className="h-5 w-[1px] bg-gray-200/90 mx-2" aria-hidden="true" />

        {/* Opción 2: Transacciones */}
        <a
          href="#transacciones"
          className="text-[13.5px] md:text-[14px] text-gray-800 font-medium hover:text-[#d70a17] transition-colors py-1.5 px-3 whitespace-nowrap cursor-pointer select-none"
        >
          Transacciones
        </a>

        {/* Divisor vertical 2 (justo antes del botón rojo) */}
        <span className="h-5 w-[1px] bg-gray-200/90 mx-2" aria-hidden="true" />

        {/* Botón de acción: Quiero pagar */}
        <button
          onClick={onPayClick}
          type="button"
          className="relative inline-flex items-center gap-2.5 text-white font-bold text-[13.5px] md:text-[14px] px-5 py-2.5 rounded-full cursor-pointer select-none whitespace-nowrap transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus:outline-none"
          style={{
            background: 'linear-gradient(180deg, #c40a15 0%, #db0e1c 50%, #e61927 100%)',
            boxShadow:
              '0 5px 14px -1px rgba(196, 10, 21, 0.45), 0 2px 5px -1px rgba(0, 0, 0, 0.18), inset 0 1px 1.5px rgba(255, 255, 255, 0.32), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
          }}
        >
          <PayIcon className="w-5 h-5 drop-shadow-xs" />
          <span className="tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
            Quiero pagar
          </span>
        </button>
      </div>
    </div>
  )
}
