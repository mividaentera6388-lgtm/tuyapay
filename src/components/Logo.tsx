import React from 'react'
import tuyaLogo from '../assets/logo.svg'

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img src={tuyaLogo} alt="Logo" className="h-9 w-auto object-contain" />
    </div>
  )
}
