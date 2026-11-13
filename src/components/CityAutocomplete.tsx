import React, { useState, useRef, useEffect } from 'react'
import { MapPin, Check } from 'lucide-react'
import { COLOMBIAN_CITIES } from '../data/colombianCities'

interface CityAutocompleteProps {
  label: string
  placeholder: string
  value: string
  onChange: (city: string) => void
  error?: string
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  label,
  placeholder,
  value,
  onChange,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sincronizar query si cambia value externamente
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrado de ciudades
  const filteredCities = query.trim() === ''
    ? COLOMBIAN_CITIES.slice(0, 8)
    : COLOMBIAN_CITIES.filter((city) =>
        city.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)

  const handleSelectCity = (city: string) => {
    setQuery(city)
    onChange(city)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setQuery(text)
    onChange(text)
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Contenedor neumórfico hundido */}
      <div
        className={`w-full bg-[#F0F2F5] rounded-2xl px-5 py-3.5 transition-all ${
          error ? 'ring-1 ring-red-400' : ''
        }`}
        style={{
          boxShadow:
            'inset 3px 3px 6px rgba(166, 175, 195, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.95)',
        }}
      >
        <label className="block text-[11px] font-medium text-gray-400 select-none">
          {label}
        </label>
        <div className="flex items-center gap-2 mt-0.5">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            required
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none text-[15px] sm:text-[16px] font-medium text-[#2C3847] p-0 focus:ring-0 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Menú de autocompletado flotante con sombras suaves */}
      {isOpen && filteredCities.length > 0 && (
        <div
          className="absolute z-40 top-full left-0 right-0 mt-2 bg-[#F0F2F5] rounded-2xl p-2 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          style={{
            boxShadow:
              '8px 8px 20px rgba(166, 175, 195, 0.6), -8px -8px 20px rgba(255, 255, 255, 0.95)',
          }}
        >
          {filteredCities.map((city) => {
            const isSelected = value === city

            return (
              <button
                key={city}
                type="button"
                onClick={() => handleSelectCity(city)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'text-[#E20613] font-bold bg-white/70'
                    : 'text-gray-700 hover:bg-white/50'
                }`}
              >
                <span>{city}</span>
                {isSelected && <Check className="w-4 h-4 text-[#E20613]" />}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <span className="block text-[11px] text-red-600 font-medium mt-1 px-2">
          {error}
        </span>
      )}
    </div>
  )
}
