import React from 'react'
import { X, ChevronRight } from 'lucide-react'
import { navItems } from './Navbar'
import { PayIcon } from './PayIcon'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  activeId?: string
  onSelect: (id: string) => void
  onPayClick?: () => void
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  activeId,
  onSelect,
  onPayClick,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral deslizante (Drawer) */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        <div>
          {/* Header del drawer */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <span className="text-base font-bold text-gray-800">Menú de Navegación</span>
            <button
              onClick={onClose}
              type="button"
              className="p-2 -mr-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Botón principal de pago en Mobile */}
          <div className="p-4 bg-gray-50/70 border-b border-gray-100">
            <button
              onClick={() => {
                onPayClick?.()
                onClose()
              }}
              type="button"
              className="w-full flex items-center justify-center gap-2.5 text-white font-bold py-3 px-4 rounded-full active:scale-[0.98] transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #c40a15 0%, #db0e1c 50%, #e61927 100%)',
                boxShadow:
                  '0 5px 16px -1px rgba(196, 10, 21, 0.45), inset 0 1px 1.5px rgba(255, 255, 255, 0.3)',
              }}
            >
              <PayIcon className="w-5 h-5" />
              <span>Quiero pagar</span>
            </button>
          </div>

          {/* Enlaces de acceso rápido superior */}
          <div className="px-5 py-3 border-b border-gray-100 bg-white">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Gestión rápida
            </span>
            <div className="flex flex-col gap-1">
              <a
                href="#soluciones-pago"
                onClick={onClose}
                className="flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[#E20613] font-medium transition-colors"
              >
                <span>Soluciones de pago</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="#transacciones"
                onClick={onClose}
                className="flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[#E20613] font-medium transition-colors"
              >
                <span>Transacciones</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Menú principal */}
          <nav className="p-5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Categorías
            </span>
            <ul className="flex flex-col gap-1 list-none p-0 m-0">
              {navItems.map((item) => {
                const isActive = activeId === item.id

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onSelect(item.id)
                        onClose()
                      }}
                      className={`w-full text-left py-2.5 px-3 rounded-lg text-sm font-semibold tracking-wide uppercase flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-red-50 text-[#E20613]'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-[#E20613]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isActive ? 'text-[#E20613] translate-x-1' : 'text-gray-400'
                        }`}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        {/* Pie del menú móvil */}
        <div className="p-5 border-t border-gray-100 text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} Tuya S.A. Compañía de Financiamiento
        </div>
      </div>
    </div>
  )
}
