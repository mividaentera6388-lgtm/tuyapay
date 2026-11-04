import React from 'react'

export const PayIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 26 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full select-none"
      >
        {/* Terminal / Tarjeta verde de fondo */}
        <rect
          x="1"
          y="3.5"
          width="20"
          height="14"
          rx="2.5"
          fill="#6FB327"
          stroke="#4D8417"
          strokeWidth="1.2"
        />

        {/* Pantalla o indicador blanco con anillo verde */}
        <circle cx="8" cy="10.5" r="3.2" fill="#FFFFFF" />
        <circle cx="8" cy="10.5" r="1.6" fill="#6FB327" />

        {/* Detalle de lector o botón lateral */}
        <rect x="13.5" y="8" width="5.5" height="1.6" rx="0.8" fill="#FFFFFF" fillOpacity="0.9" />
        <rect x="13.5" y="11.5" width="4" height="1.6" rx="0.8" fill="#FFFFFF" fillOpacity="0.9" />

        {/* Mano / Puntero interactivo haciendo clic */}
        <g transform="translate(8.5, 6)">
          {/* Mano blanca con contorno oscuro definido */}
          <path
            d="M6 7.5V3.2a1.4 1.4 0 0 1 2.8 0v3.8h.3a1.1 1.1 0 0 1 2.2 0v1h.3a1.1 1.1 0 0 1 2.2 0v2.2a4 4 0 0 1-4 4H7.2a4 4 0 0 1-2.9-1.3L2 10.8a1.2 1.2 0 0 1 1.6-1.4L6 10.8V7.5z"
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  )
}
