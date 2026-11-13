import React from 'react'

export interface NavItem {
  id: string
  label: string
  href: string
  active?: boolean
}

export const navItems: NavItem[] = [
  { id: 'disfruta', label: 'DISFRUTA', href: '#disfruta' },
  { id: 'donde-pagas', label: 'DÓNDE PAGAS', href: '#donde-pagas' },
  { id: 'productos-servicios', label: 'PRODUCTOS Y SERVICIOS', href: '#productos-servicios' },
  { id: 'conocenos', label: 'CONÓCENOS', href: '#conocenos' },
  { id: 'soluciones-de-pago', label: 'SOLUCIONES DE PAGO', href: '#soluciones-de-pago' },
  { id: 'trabaja-con-nosotros', label: 'TRABAJA CON NOSOTROS', href: '#trabaja-con-nosotros' },
]

interface NavbarProps {
  activeId?: string
  onSelect?: (id: string) => void
}

export const Navbar: React.FC<NavbarProps> = ({ activeId, onSelect }) => {
  return (
    <nav aria-label="Navegación principal" className="flex items-center">
      <ul className="flex items-center gap-6 lg:gap-8 list-none m-0 p-0">
        {navItems.map((item) => {
          const isActive = activeId === item.id

          return (
            <li key={item.id} className="relative group">
              <a
                href={item.href}
                onClick={(e) => {
                  e.preventDefault()
                  onSelect?.(item.id)
                }}
                className={`relative inline-block py-2 text-[12px] xl:text-[13px] font-medium tracking-wide uppercase transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? 'text-[#E20613] font-semibold'
                    : 'text-gray-700 hover:text-[#E20613]'
                }`}
              >
                {item.label}

                {/* Línea animada en hover o estado activo */}
                <span
                  className={`absolute bottom-0 left-0 w-full h-[2px] bg-[#E20613] transform origin-left transition-transform duration-200 ${
                    isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                  aria-hidden="true"
                />
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
