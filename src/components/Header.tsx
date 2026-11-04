import React from 'react'
import { Logo } from './Logo'
import { ShieldCheck } from 'lucide-react'

export const Header: React.FC = () => {
  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-20 flex items-center justify-center relative">
          
          {/* Logo centrado de forma absoluta o natural */}
          <div className="flex items-center justify-center">
            <Logo />
          </div>

          {/* Distintivo de seguridad discreto en la esquina derecha (visible en pantallas medianas o grandes) */}
          <div className="hidden md:flex items-center gap-1.5 absolute right-0 text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-3 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit SSL</span>
          </div>

        </div>
      </div>
    </header>
  )
}
