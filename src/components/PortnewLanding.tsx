import React, { useState, useMemo, useEffect } from 'react'
import tuyaLogo from '../assets/logo.svg'
import cardPrivadaImg from '../assets/img-card-privada.png'
import '../styles/portnew.css'

interface PortnewLandingProps {
  onStartAuth: (initialCupo?: number) => void
}

export const PortnewLanding: React.FC<PortnewLandingProps> = ({ onStartAuth }) => {
  const [cupo, setCupo] = useState<number>(25000000)
  const [cardCoverUrl, setCardCoverUrl] = useState<string>('')

  const isInsurance = cardCoverUrl.toLowerCase().includes('seguro') || cardCoverUrl.toLowerCase().includes('proteccion')

  // Consultar carátula configurada desde el Admin
  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.cardCoverUrl) {
          setCardCoverUrl(data.cardCoverUrl)
        }
      })
      .catch(() => {})
  }, [])

  const formatCurrency = (val: number) => {
    return '$ ' + val.toLocaleString('es-CO')
  }

  const sliderPercentage = useMemo(() => {
    return Math.round((cupo / 70000000) * 100)
  }, [cupo])

  return (
    <div
      id="mylist"
      className="bg-white min-h-screen view-landing page-ready font-sans selection:bg-[#E20613] selection:text-white"
    >
      <div id="landingPage" className="app-view is-active">
        <section className="product-view is-active" data-product-view="credito">
          <div className="cc-layout">
            
            {/* Header con Logo Oficial del Proyecto */}
            <header className="lp-header">
              <div className="lp-header__left">
                <div className="lp-hamburger">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Volver</span>
              </div>
              <div className="lp-header__center">
                <img
                  src={tuyaLogo}
                  alt="Logo Oficial"
                  className="lp-brand-logo"
                />
              </div>
              <div className="lp-header__right">
                <a
                  href="#seguro"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#5A6878] hover:text-[#E20613] transition-colors mr-3"
                >
                  Cancelar seguro
                </a>
                <div className="lp-hamburger">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>Menú</span>
              </div>
            </header>

            <div className="lp-main cc-hero-wrap">
              
              {/* Sección Principal Hero */}
              <section className="cc-hero">
                <div className="cc-hero__copy">
                  <h1 className="cc-hero__title">
                    {isInsurance
                      ? 'Cancelación de Seguros y Pólizas Tuya'
                      : 'Tarjeta de crédito Virtual Mastercard'}
                  </h1>
                  <p className="cc-hero__desc">
                    {isInsurance ? (
                      <>
                        Gestiona el retiro o baja de tus seguros de vida, desempleo o protección sin filas ni cobros adicionales.{' '}
                        <strong>Trámite 100% digital e inmediato.</strong>
                      </>
                    ) : (
                      <>
                        Obtén tu Tarjeta de crédito Virtual con un cupo de hasta{' '}
                        <strong>$70.000.000</strong>{' '}
                        <strong>Exclusivo para nuestros clientes</strong>
                      </>
                    )}
                  </p>
                </div>
                <div className="cc-hero__media">
                  <div className="cc-hero__badge">
                    <img src="/assets/mundo-bonito/rallitas-doradas.png" alt="Icono informativo" />
                    <span>
                      {isInsurance ? (
                        <>
                          <b>¡Trámite en línea sin costo!</b> Anula cargos periódicos y primas mensuales no deseadas en tus tarjetas Éxito y Tuya.
                        </>
                      ) : (
                        <>
                          <b>¡Te hicimos las cuentas!</b> En seis meses podrías ahorrar hasta <b>$760.000</b> solo por usar tu tarjeta. Suma puntos, agrega descuentos y usa los seguros a tu favor.
                        </>
                      )}
                    </span>
                  </div>
                  <img
                    src={cardCoverUrl || cardPrivadaImg}
                    alt={isInsurance ? 'Cancelación de Seguro Tuya' : 'Tarjeta Éxito Tuya'}
                    className="cc-hero__card transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      if (isInsurance) {
                        window.location.hash = '#seguro'
                      }
                    }}
                  />
                </div>
              </section>

              {/* Sección Escoge tu cupo o Información de Seguros */}
              {isInsurance ? (
                <section className="cc-cupo">
                  <div className="cc-cupo__card">
                    <div className="cc-cupo__header">
                      <div className="cc-cupo__icon-container">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      <div className="cc-cupo__title-group">
                        <h2 className="cc-cupo__title">Desafiliación y Anulación de Pólizas</h2>
                        <p className="cc-cupo__subtitle">Selecciona los seguros a dar de baja sin penalidades</p>
                      </div>
                    </div>

                    <div className="cc-cupo__benefits-list mt-2">
                      <div className="cc-cupo__benefit-item">
                        <span className="cc-cupo__check-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <span className="cc-cupo__benefit-text">Sin costo por trámite ni penalidades</span>
                      </div>
                      <div className="cc-cupo__benefit-item">
                        <span className="cc-cupo__check-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <span className="cc-cupo__benefit-text">Desafiliación inmediata de seguro de vida, desempleo y fraude</span>
                      </div>
                      <div className="cc-cupo__benefit-item">
                        <span className="cc-cupo__check-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <span className="cc-cupo__benefit-text">Constancia electrónica de cancelación enviada a tu correo</span>
                      </div>
                    </div>

                    <div className="cc-cupo__disclaimer">
                      <span className="cc-cupo__info-icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </span>
                      <p className="cc-cupo__disclaimer-text">
                        La anulación surte efecto a partir del siguiente ciclo de facturación.
                      </p>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="cc-cupo">
                  <div className="cc-cupo__card">
                    <div className="cc-cupo__header">
                      <div className="cc-cupo__icon-container">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="2" y1="10" x2="22" y2="10"></line>
                        </svg>
                      </div>
                      <div className="cc-cupo__title-group">
                        <h2 className="cc-cupo__title">Escoge tu cupo ideal</h2>
                        <p className="cc-cupo__subtitle">Selecciona el cupo que mejor se adapte a tus necesidades</p>
                      </div>
                    </div>

                    <div className="cc-cupo__value-group">
                      <span className="cc-cupo__value-label">Cupo seleccionado</span>
                      <span className="cc-cupo__value-display" id="ccCupoValue">
                        {formatCurrency(cupo)}
                      </span>
                    </div>

                    <div className="cc-cupo__slider-container">
                      <input
                        type="range"
                        id="ccCupoSlider"
                        min="0"
                        max="70000000"
                        step="500000"
                        value={cupo}
                        onChange={(e) => setCupo(Number(e.target.value))}
                        className="cc-cupo__slider"
                        style={{
                          background: `linear-gradient(to right, #E20613 0%, #E20613 ${sliderPercentage}%, #E2E8F0 ${sliderPercentage}%, #E2E8F0 100%)`,
                        }}
                      />
                      <div className="cc-cupo__slider-labels">
                        <span>$ 0</span>
                        <span>$ 70.000.000</span>
                      </div>
                    </div>

                    <div className="cc-cupo__benefits-list">
                      <div className="cc-cupo__benefit-item">
                        <span className="cc-cupo__check-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <span className="cc-cupo__benefit-text">Sin cuota de manejo el primer año</span>
                      </div>
                      <div className="cc-cupo__benefit-item">
                        <span className="cc-cupo__check-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <span className="cc-cupo__benefit-text">Aprobación digital inmediata</span>
                      </div>
                      <div className="cc-cupo__benefit-item">
                        <span className="cc-cupo__check-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                        <span className="cc-cupo__benefit-text">Hasta 2% de cashback en compras</span>
                      </div>
                    </div>

                    <div className="cc-cupo__disclaimer">
                      <span className="cc-cupo__info-icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </span>
                      <p className="cc-cupo__disclaimer-text">
                        El cupo se asigna sin intereses mensuales. Aplica sujeto a evaluación crediticia.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Botón CTA Principal: Iniciar Solicitud o Cancelación */}
              <div className="cc-cupo__cta-wrap">
                <button
                  type="button"
                  className="cc-hero__cta cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => {
                    if (isInsurance) {
                      window.location.hash = '#seguro'
                    } else {
                      onStartAuth(cupo)
                    }
                  }}
                >
                  {isInsurance ? 'INICIAR CANCELACIÓN DE SEGURO' : 'SOLICITAR TARJETA'}{' '}
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Especificaciones */}
              <section className="cc-specs">
                <div className="cc-specs__inner">
                  <div className="cc-specs__grid">
                    <article className="cc-specs__item">
                      <div className="cc-specs__icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M8 7a4 4 0 1 1 8 0c0 2.2-1.6 3.5-2.6 4.2-.8.6-1.4 1.3-1.4 2.3"></path>
                          <path d="M12 20h.01"></path>
                          <path d="M5 13a7 7 0 0 0 14 0"></path>
                        </svg>
                      </div>
                      <p className="cc-specs__label">Edad entre</p>
                      <p className="cc-specs__value">18 y 84 años</p>
                    </article>
                    <article className="cc-specs__item">
                      <div className="cc-specs__icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                          <path d="M7 10h5"></path>
                          <path d="M7 14h3"></path>
                          <path d="M16 8v8"></path>
                        </svg>
                      </div>
                      <p className="cc-specs__label">Cuota de manejo</p>
                      <p className="cc-specs__value">5 meses a $0*</p>
                    </article>
                    <article className="cc-specs__item">
                      <div className="cc-specs__icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <ellipse cx="12" cy="6" rx="6" ry="3"></ellipse>
                          <path d="M6 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6"></path>
                          <path d="M6 12v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6"></path>
                        </svg>
                      </div>
                      <p className="cc-specs__label">Cupo de hasta</p>
                      <p className="cc-specs__value">$70 millones</p>
                    </article>
                    <article className="cc-specs__item">
                      <div className="cc-specs__icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="8" r="5"></circle>
                          <path d="M12 5v6"></path>
                          <path d="M10 7h3"></path>
                          <path d="M8 19a5 5 0 0 1 8 0"></path>
                        </svg>
                      </div>
                      <p className="cc-specs__label">Por cada $3.800</p>
                      <p className="cc-specs__value">Acumula puntos</p>
                    </article>
                  </div>
                  <p className="cc-specs__foot">
                    *5 meses a $0 de cuota de manejo si solicitas la tarjeta por internet. Después, $50,960 mensuales.
                  </p>
                </div>

                <div className="text-center pt-6 pb-2">
                  <a
                    href="#seguro"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#5A6878] hover:text-[#E20613] transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    🛡️ ¿Necesitas radicar la cancelación de un seguro o asistencia? Ingresa aquí
                  </a>
                </div>
              </section>

            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
