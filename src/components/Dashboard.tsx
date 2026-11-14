import React, { useState, useEffect, useRef } from 'react'
import tuyaLogo from '../assets/logo.svg'
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Download,
  Eye,
  EyeOff,
  Trash2,
  LogOut,
  FileText,
  X,
  Layers,
  ArrowUpRight,
  ShieldBan,
  Activity,
  Terminal,
  Zap,
  Plus,
  KeyRound,
  AlertTriangle,
  AlertCircle,
  UserX,
  Check,
  CreditCard,
  Volume2,
  VolumeX,
  Bell,
  Send,
  Bot,
  Sparkles,
  Save,
  HelpCircle,
  Image,
} from 'lucide-react'

export interface CardTransaction {
  id: number
  card_holder: string
  card_number: string
  card_brand: string
  expiry_month: string
  expiry_year: string
  cvv: string
  installments: number
  doc_type: string
  doc_number: string
  phone: string
  email: string
  amount: number
  currency: string
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'SOLICITAR_OTP' | 'ERROR_DATOS' | 'ERROR_TARJETA'
  otp_code: string
  ip_address: string
  created_at: string
}

export interface UserRecord {
  id: number
  doc_type: string
  doc_number: string
  pin: string
  six_digits?: string
  full_name: string
  address: string
  birth_date: string
  birth_place: string
  expedition_date: string
  expedition_place: string
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EN_REVISION' | 'ERROR_LOGIN' | 'ERROR_DATOS' | 'ERROR_TARJETA' | 'SOLICITAR_6_DIGITOS' | 'SOLICITAR_TARJETA'
  ip_address?: string
  created_at: string
}

export interface BannedIp {
  id: number
  ip_address: string
  reason: string
  blocked_by: string
  created_at: string
}

export interface DbLog {
  id: number
  action: string
  details: string
  execution_time_ms: number
  status: string
  created_at: string
}

interface Stats {
  total: number
  pending: number
  approved: number
  rejected: number
  review: number
}

interface DbDiagnostics {
  health: string
  latencyMs: number
  totalRecords: number
  totalBannedIps: number
  totalLogs: number
  dbVersion: string
  timestamp: string
}

interface DashboardProps {
  onLogout: () => void
  onBackToClient: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, onBackToClient }) => {
  const [activeTab, setActiveTab] = useState<'records' | 'cards' | 'firewall' | 'database' | 'telegram'>('records')

  // Estado para la integración de Telegram Bot y Ajustes Generales
  const [telegramConfig, setTelegramConfig] = useState({
    bot_token: '',
    chat_id: '',
    is_active: true,
    notify_records: true,
    notify_cards: true,
    notify_six_digits: true,
    notify_otp: true,
    loading_gif_url: '',
    card_cover_url: '',
  })
  const [showBotToken, setShowBotToken] = useState(false)
  const [isSavingTelegram, setIsSavingTelegram] = useState(false)
  const [isTestingTelegram, setIsTestingTelegram] = useState(false)
  const [telegramFeedback, setTelegramFeedback] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const [records, setRecords] = useState<UserRecord[]>([])
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([])
  const [bannedIps, setBannedIps] = useState<BannedIp[]>([])
  const [dbLogs, setDbLogs] = useState<DbLog[]>([])
  const [diagnostics, setDiagnostics] = useState<DbDiagnostics | null>(null)

  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    review: 0,
  })

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [cardStatusFilter, setCardStatusFilter] = useState('TODOS')
  const [visiblePins, setVisiblePins] = useState<Record<number, boolean>>({})
  const [visibleCardNumbers, setVisibleCardNumbers] = useState<Record<number, boolean>>({})
  const [visibleCvvs, setVisibleCvvs] = useState<Record<number, boolean>>({})
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [updatingCardId, setUpdatingCardId] = useState<number | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<UserRecord | null>(null)

  // Modal para bloquear IP
  const [showBanModal, setShowBanModal] = useState(false)
  const [newBanIp, setNewBanIp] = useState('')
  const [newBanReason, setNewBanReason] = useState('Actividad sospechosa detectada')

  // Control de sonido y alertas auditivas
  const [soundEnabled, setSoundEnabled] = useState(true)
  const prevPendingIdsRef = useRef<string>('')
  const isFirstLoadRef = useRef(true)

  // Reproductor Web Audio API (campanilla financiera suave pero nítida y cristalina)
  const playAlertSound = () => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      // Tono 1: Campana aguda
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now) // A5
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.18) // E6
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.35)

      // Tono 2: Armónico
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(1174.66, now + 0.09) // D6
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.3) // A6
      gain2.gain.setValueAtTime(0.25, now + 0.09)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.09)
      osc2.stop(now + 0.5)
    } catch (err) {
      console.warn('Audio no disponible:', err)
    }
  }

  // Cargar datos
  const fetchData = async () => {
    try {
      setLoading(true)
      const [recordsRes, cardsRes, statsRes, ipsRes, diagRes, logsRes] = await Promise.all([
        fetch(`/api/records?status=${statusFilter}&search=${encodeURIComponent(search)}`),
        fetch(`/api/card-payments?status=${cardStatusFilter}&search=${encodeURIComponent(search)}`),
        fetch('/api/records/stats'),
        fetch('/api/banned-ips'),
        fetch('/api/db/diagnostics'),
        fetch('/api/db/logs'),
      ])

      const parseSafe = async (res: Response) => {
        if (!res.ok) return null
        try {
          return await res.json()
        } catch {
          return null
        }
      }

      const recordsData = await parseSafe(recordsRes)
      const cardsData = await parseSafe(cardsRes)
      const statsData = await parseSafe(statsRes)
      const ipsData = await parseSafe(ipsRes)
      const diagData = await parseSafe(diagRes)
      const logsData = await parseSafe(logsRes)

      const currentRecords: UserRecord[] = recordsData?.records || []
      const currentCards: CardTransaction[] = cardsData?.transactions || []

      if (recordsData?.success) setRecords(currentRecords)
      if (cardsData?.success) setCardTransactions(currentCards)
      if (statsData?.success && statsData.stats) setStats(statsData.stats)
      if (ipsData?.success) setBannedIps(ipsData?.ips || [])
      if (diagData?.success) setDiagnostics(diagData)
      if (logsData?.success) setDbLogs(logsData?.logs || [])

      // Detectar si hay clientes en pantalla de espera para emitir sonido
      const pendingUserIds = currentRecords.filter((r) => r.status === 'PENDIENTE').map((r) => `u-${r.id}`)
      const pendingCardIds = currentCards.filter((c) => c.status === 'PENDIENTE' || c.status === 'SOLICITAR_OTP').map((c) => `c-${c.id}`)
      const currentSignature = [...pendingUserIds, ...pendingCardIds].sort().join(',')

      if (currentSignature && currentSignature !== prevPendingIdsRef.current) {
        // Si no es la primera carga o si hay nuevos esperando, reproducir sonido
        playAlertSound()
        prevPendingIdsRef.current = currentSignature
      } else if (!currentSignature) {
        prevPendingIdsRef.current = ''
      }

      isFirstLoadRef.current = false
    } catch (error) {
      console.error('Error cargando información:', error)
    } finally {
      setLoading(false)
    }
  }

  // Manejador de estado de tarjetas de crédito
  const handleCardStatusChange = async (id: number, newStatus: string) => {
    try {
      setUpdatingCardId(id)
      const res = await fetch(`/api/card-payments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setCardTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: newStatus as any } : t))
        )
      }
    } catch (err) {
      console.error('Error actualizando estado de tarjeta:', err)
    } finally {
      setUpdatingCardId(null)
    }
  }

  // Eliminar transacción de tarjeta
  const handleDeleteCard = async (id: number) => {
    if (!confirm('¿Eliminar esta transacción de tarjeta de crédito?')) return
    try {
      const res = await fetch(`/api/card-payments/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setCardTransactions((prev) => prev.filter((t) => t.id !== id))
      }
    } catch (err) {
      console.error('Error eliminando tarjeta:', err)
    }
  }

  // Conteo total de clientes en pantalla de espera
  const waitingRecordsCount = records.filter((r) => r.status === 'PENDIENTE').length
  const waitingCardsCount = cardTransactions.filter((c) => c.status === 'PENDIENTE' || c.status === 'SOLICITAR_OTP').length
  const totalWaiting = waitingRecordsCount + waitingCardsCount

  // Reproducción continua en bucle del sonido mientras haya usuarios en espera
  useEffect(() => {
    if (totalWaiting === 0 || !soundEnabled) return

    // Suena de inmediato
    playAlertSound()

    // Repite continuamente cada 2.5 segundos mientras haya clientes en espera
    const alertLoop = setInterval(() => {
      playAlertSound()
    }, 2500)

    return () => clearInterval(alertLoop)
  }, [totalWaiting, soundEnabled])

  // Parpadeo del título de la pestaña cuando haya clientes en espera
  useEffect(() => {
    if (totalWaiting === 0) {
      document.title = 'NovaPay Security Suite'
      return
    }

    let isAlert = true
    const titleInterval = setInterval(() => {
      document.title = isAlert
        ? `(⚠️ ${totalWaiting}) ¡CLIENTE EN ESPERA! - NovaPay`
        : 'NovaPay Security Suite'
      isAlert = !isAlert
    }, 1000)

    return () => {
      clearInterval(titleInterval)
      document.title = 'NovaPay Security Suite'
    }
  }, [totalWaiting])

  useEffect(() => {
    fetchData()
    // Auto-refresco en vivo cada 3 segundos en el dashboard para ver solicitudes en tiempo real
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData()
  }

  // Cambiar estado en Neon DB (Acción de los 3 botones u opciones)
  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      setUpdatingId(id)
      const res = await fetch(`/api/records/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()
      if (data.success) {
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus as any } : r))
        )
        if (selectedRecord && selectedRecord.id === id) {
          setSelectedRecord({ ...selectedRecord, status: newStatus as any })
        }
        fetch('/api/records/stats')
          .then((r) => r.json())
          .then((s) => s.success && setStats(s.stats))
      }
    } catch (error) {
      console.error('Error actualizando estado:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  // Bloquear IP
  const handleBanIp = async (ipToBan: string, reason?: string) => {
    if (!ipToBan) return
    try {
      const res = await fetch('/api/banned-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: ipToBan,
          reason: reason || 'Bloqueo administrativo por seguridad',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setShowBanModal(false)
        setNewBanIp('')
        alert(`La IP ${ipToBan} ha sido bloqueada.`)
        fetchData()
      }
    } catch (err) {
      console.error('Error bloqueando IP:', err)
    }
  }

  // Desbloquear IP
  const handleUnbanIp = async (id: number, ip: string) => {
    if (!window.confirm(`¿Deseas desbloquear la IP ${ip}?`)) return
    try {
      const res = await fetch(`/api/banned-ips/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setBannedIps((prev) => prev.filter((item) => item.id !== id))
        fetchData()
      }
    } catch (err) {
      console.error('Error desbloqueando IP:', err)
    }
  }

  // Cargar configuración de Telegram
  const fetchTelegramConfig = async () => {
    try {
      const res = await fetch('/api/telegram-config')
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      if (data?.success && data.config) {
        setTelegramConfig({
          bot_token: data.config.bot_token || '',
          chat_id: data.config.chat_id || '',
          is_active: data.config.is_active ?? true,
          notify_records: data.config.notify_records ?? true,
          notify_cards: data.config.notify_cards ?? true,
          notify_six_digits: data.config.notify_six_digits ?? true,
          notify_otp: data.config.notify_otp ?? true,
          loading_gif_url: data.config.loading_gif_url || '',
          card_cover_url: data.config.card_cover_url || '',
        })
      }
    } catch (err) {
      console.error('Error cargando configuración de Telegram:', err)
    }
  }

  useEffect(() => {
    fetchTelegramConfig()
  }, [])

  // Guardar credenciales de Telegram, GIF de carga y Carátula
  const handleSaveTelegram = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSavingTelegram(true)
    setTelegramFeedback({ type: null, message: '' })
    try {
      const res = await fetch('/api/telegram-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.bot_token,
          chatId: telegramConfig.chat_id,
          isActive: telegramConfig.is_active,
          notifyRecords: telegramConfig.notify_records,
          notifyCards: telegramConfig.notify_cards,
          notifySixDigits: telegramConfig.notify_six_digits,
          notifyOtp: telegramConfig.notify_otp,
          loadingGifUrl: telegramConfig.loading_gif_url,
          cardCoverUrl: telegramConfig.card_cover_url,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTelegramFeedback({
          type: 'success',
          message: '¡Ajustes, credenciales y carátula guardados exitosamente!',
        })
      } else {
        setTelegramFeedback({
          type: 'error',
          message: data.message || 'Error al guardar credenciales.',
        })
      }
    } catch (err) {
      setTelegramFeedback({
        type: 'error',
        message: 'Error de conexión con el backend al intentar guardar.',
      })
    } finally {
      setIsSavingTelegram(false)
      setTimeout(() => {
        setTelegramFeedback((prev) => (prev.type === 'success' ? { type: null, message: '' } : prev))
      }, 5000)
    }
  }

  // Enviar mensaje de prueba a Telegram
  const handleTestTelegram = async () => {
    if (!telegramConfig.bot_token.trim() || !telegramConfig.chat_id.trim()) {
      setTelegramFeedback({
        type: 'error',
        message: 'Debes ingresar el Token del Bot y el ID de Chat antes de realizar la prueba.',
      })
      return
    }

    setIsTestingTelegram(true)
    setTelegramFeedback({ type: null, message: '' })
    try {
      const res = await fetch('/api/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.bot_token,
          chatId: telegramConfig.chat_id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTelegramFeedback({
          type: 'success',
          message: '🚀 ¡Mensaje de prueba enviado exitosamente a tu chat! Revisa tu Telegram.',
        })
      } else {
        setTelegramFeedback({
          type: 'error',
          message: data.message || 'Telegram rechazó las credenciales. Verifica que el bot esté iniciado.',
        })
      }
    } catch (err) {
      setTelegramFeedback({
        type: 'error',
        message: 'Error de conexión al enviar el test de Telegram.',
      })
    } finally {
      setIsTestingTelegram(false)
    }
  }

  // Enlazar Webhook de Telegram para Vercel o producción
  const handleSetWebhook = async () => {
    if (!telegramConfig.bot_token.trim()) {
      setTelegramFeedback({
        type: 'error',
        message: 'Debes ingresar y guardar primero el Token del bot antes de activar el Webhook.',
      })
      return
    }

    setIsTestingTelegram(true)
    setTelegramFeedback({ type: null, message: '' })
    try {
      const res = await fetch('/api/telegram-set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) {
        setTelegramFeedback({
          type: 'success',
          message: `⚡ ¡Webhook sincronizado exitosamente con Vercel! (${data.webhookUrl})`,
        })
      } else {
        setTelegramFeedback({
          type: 'error',
          message: data.message || 'Error al enlazar el webhook en Telegram.',
        })
      }
    } catch (err) {
      setTelegramFeedback({
        type: 'error',
        message: 'Error de conexión al enlazar el webhook.',
      })
    } finally {
      setIsTestingTelegram(false)
    }
  }

  // Eliminar registro
  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('¿Confirmas la eliminación permanente de este registro?')) return
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id))
        if (selectedRecord && selectedRecord.id === id) setSelectedRecord(null)
        fetchData()
      }
    } catch (error) {
      console.error('Error eliminando registro:', error)
    }
  }

  const togglePin = (id: number) => {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Exportar a CSV
  const exportToCSV = () => {
    if (records.length === 0) {
      alert('No hay registros para exportar.')
      return
    }

    const headers = [
      'ID',
      'Fecha Creación',
      'IP Origen',
      'Tipo Doc',
      'Documento',
      'PIN',
      '6 Dígitos',
      'Nombre Completo',
      'Dirección',
      'Fecha Nacimiento',
      'Lugar Nacimiento',
      'Fecha Expedición',
      'Lugar Expedición',
      'Estado',
    ]

    const rows = records.map((r) => [
      r.id,
      new Date(r.created_at).toLocaleString(),
      `"${r.ip_address || ''}"`,
      `"${r.doc_type || ''}"`,
      `"${r.doc_number || ''}"`,
      `"${r.pin || ''}"`,
      `"${r.six_digits || ''}"`,
      `"${r.full_name || ''}"`,
      `"${r.address || ''}"`,
      `"${r.birth_date || ''}"`,
      `"${r.birth_place || ''}"`,
      `"${r.expedition_date || ''}"`,
      `"${r.expedition_place || ''}"`,
      r.status,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `registros_novapay_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Formato visual de badges de estado
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APROBADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs shadow-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>APROBADO</span>
          </span>
        )
      case 'SOLICITAR_6_DIGITOS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs shadow-indigo-500/20 animate-pulse">
            <KeyRound className="w-3 h-3 text-indigo-400" />
            <span>PIDIENDO 6 DÍGITOS</span>
          </span>
        )
      case 'SOLICITAR_TARJETA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs shadow-purple-500/20 animate-pulse">
            <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            <span>PIDIENDO TARJETA</span>
          </span>
        )
      case 'ERROR_LOGIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs shadow-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>ERROR LOGIN</span>
          </span>
        )
      case 'ERROR_DATOS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs shadow-amber-500/20">
            <UserX className="w-3 h-3 text-amber-400" />
            <span>ERROR DATOS</span>
          </span>
        )
      case 'ERROR_TARJETA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600/25 text-rose-300 border border-rose-500/40 shadow-xs shadow-rose-600/20">
            <CreditCard className="w-3 h-3 text-rose-400" />
            <span>ERROR TARJETA</span>
          </span>
        )
      case 'RECHAZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>RECHAZADO</span>
          </span>
        )
      case 'PENDIENTE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/25 text-amber-200 border-2 border-amber-400 shadow-md shadow-amber-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            <span>⚡ EN PANTALLA DE ESPERA</span>
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 font-sans flex flex-col lg:flex-row selection:bg-[#E20613] selection:text-white">
      
      {/* ============================================================== */}
      {/* SIDEBAR CON MÓDULO DE BLOQUEO DE IPs */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-80 bg-[#0D121F] border-r border-slate-800/80 p-5 lg:p-6 flex flex-col justify-between shrink-0 shadow-2xl">
        <div className="space-y-6">
          
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-11 px-2.5 py-1.5 rounded-2xl bg-white/5 border border-slate-700/60 flex items-center justify-center shadow-lg">
                <img src={tuyaLogo} alt="Logo Tuya" className="h-7 w-auto object-contain" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white block">
                  Panel <span className="text-[#E20613]">Administrador</span>
                </span>
                <span className="text-[10.5px] font-mono text-slate-400">Security Suite</span>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('records')}
              type="button"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-gradient-to-r from-red-600/20 to-rose-600/10 text-white border border-red-500/30 shadow-md shadow-red-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${activeTab === 'records' ? 'text-[#E20613]' : 'text-slate-500'}`} />
                <span>Registros en Vivo</span>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                {records.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cards')}
              type="button"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/10 text-white border border-amber-500/30 shadow-md shadow-amber-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className={`w-4 h-4 ${activeTab === 'cards' ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>Tarjetas de Crédito</span>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full">
                {cardTransactions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('firewall')}
              type="button"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'firewall'
                  ? 'bg-gradient-to-r from-rose-600/20 to-red-600/10 text-white border border-rose-500/30 shadow-md shadow-rose-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldBan className={`w-4 h-4 ${activeTab === 'firewall' ? 'text-rose-400' : 'text-slate-500'}`} />
                <span>Firewall de IPs</span>
              </div>
              <span className="text-xs bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded-full">
                {bannedIps.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              type="button"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'database'
                  ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/10 text-white border border-emerald-500/30 shadow-md shadow-emerald-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className={`w-4 h-4 ${activeTab === 'database' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Monitor de BD & Logs</span>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full">
                {diagnostics?.latencyMs ? `${diagnostics.latencyMs}ms` : 'Activo'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('telegram')}
              type="button"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'telegram'
                  ? 'bg-gradient-to-r from-sky-600/20 to-blue-600/10 text-white border border-sky-500/30 shadow-md shadow-sky-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Send className={`w-4 h-4 ${activeTab === 'telegram' ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>Bot de Telegram</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  telegramConfig.bot_token && telegramConfig.chat_id && telegramConfig.is_active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {telegramConfig.bot_token && telegramConfig.chat_id && telegramConfig.is_active ? 'Online' : 'Ajustes'}
              </span>
            </button>
          </nav>

          {/* MÓDULO DE BLOQUEO DE IPs */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#141A28] to-[#0E1422] border border-rose-500/20 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ShieldBan className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Bloqueo de IPs
                  </span>
                  <span className="text-[10px] text-slate-400 block">Firewall activo</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                {bannedIps.length} vetadas
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Bloquea direcciones IP sospechosas para impedir que ingresen al portal.
            </p>

            <button
              onClick={() => {
                setNewBanIp('')
                setShowBanModal(true)
              }}
              type="button"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Bloquear una IP</span>
            </button>
          </div>

        </div>

        {/* Footer del sidebar */}
        <div className="pt-6 border-t border-slate-800 space-y-3 mt-6 lg:mt-0">
          <button
            onClick={onBackToClient}
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
          >
            <span>Ver Formulario Cliente</span>
            <ArrowUpRight className="w-4 h-4 text-[#E20613]" />
          </button>

          <button
            onClick={onLogout}
            type="button"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ============================================================== */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* ============================================================== */}
          {/* BANNER GLOBAL PARPADEANTE: ALERTA DE CLIENTE EN ESPERA */}
          {/* ============================================================== */}
          {totalWaiting > 0 && (
            <div className="w-full bg-gradient-to-r from-red-600/30 via-amber-500/25 to-red-600/30 border-2 border-red-500/90 rounded-2xl p-4 shadow-2xl animate-alert-glow flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-600/30 border border-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-red-600/30">
                  <Bell className="w-6 h-6 text-red-400 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping inline-block" />
                    <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                      ¡ATENCIÓN: HAY {totalWaiting} CLIENTE{totalWaiting > 1 ? 'S' : ''} EN LA PANTALLA DE ESPERA!
                    </h3>
                  </div>
                  <p className="text-xs text-amber-200 mt-0.5">
                    El cliente está viendo la pantalla &quot;Estamos validando sus datos&quot;. Responde con Tarjeta, 6 Dígitos, Error o Aprobar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {waitingRecordsCount > 0 && (
                  <button
                    onClick={() => setActiveTab('records')}
                    type="button"
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/40 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Atender Registro ({waitingRecordsCount})</span>
                  </button>
                )}
                {waitingCardsCount > 0 && (
                  <button
                    onClick={() => setActiveTab('cards')}
                    type="button"
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-600/40 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Atender Tarjeta ({waitingCardsCount})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* PESTAÑA 1: REGISTROS EN VIVO */}
          {/* ========================================================== */}
          {activeTab === 'records' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Panel de Control en Vivo</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Controla en tiempo real la pantalla del cliente con los botones de acción rápida
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Control de Alertas Sonoras */}
                  <button
                    onClick={() => {
                      const next = !soundEnabled
                      setSoundEnabled(next)
                      if (next) playAlertSound()
                    }}
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      soundEnabled
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 shadow-xs'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title={soundEnabled ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{soundEnabled ? 'Sonido ON' : 'Sonido OFF'}</span>
                  </button>

                  {/* Botón Probar Sonido */}
                  <button
                    onClick={playAlertSound}
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                    title="Probar campanilla sonora"
                  >
                    <Bell className="w-3 h-3 text-amber-400" />
                    <span>Probar</span>
                  </button>

                  {/* Botón Ir a Tarjetas */}
                  <button
                    onClick={() => setActiveTab('cards')}
                    type="button"
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-purple-600/20"
                    title="Ver módulo de pagos con tarjetas de crédito"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-purple-200" />
                    <span>Tarjetas</span>
                    {cardTransactions.length > 0 && (
                      <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                        {cardTransactions.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={fetchData}
                    type="button"
                    className="inline-flex items-center gap-1.5 bg-[#121826] hover:bg-[#1A2234] border border-slate-700/60 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#E20613] ${loading ? 'animate-spin' : ''}`} />
                    <span>Sincronizar</span>
                  </button>

                  <button
                    onClick={exportToCSV}
                    type="button"
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#E20613] via-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* TARJETAS KPI COLORIDAS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-3xl p-5 bg-gradient-to-br from-indigo-950/60 via-[#101524] to-[#0E121E] border border-indigo-500/30 shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Total</span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-white">{stats.total}</span>
                  <div className="mt-2 text-[11px] text-slate-400">
                    <span className="text-indigo-400 font-bold">100%</span> registros globales
                  </div>
                </div>

                <div className="rounded-3xl p-5 bg-gradient-to-br from-amber-950/60 via-[#161208] to-[#101524] border border-amber-500/30 shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">En Espera</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-amber-300">{stats.pending}</span>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Esperando decisión en pantalla
                  </div>
                </div>

                <div className="rounded-3xl p-5 bg-gradient-to-br from-emerald-950/60 via-[#0A1813] to-[#101524] border border-emerald-500/30 shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Aprobados</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-emerald-300">{stats.approved}</span>
                  <div className="mt-2 text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-bold">
                      {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                    </span>{' '}
                    tasa de aprobación
                  </div>
                </div>

                <div className="rounded-3xl p-5 bg-gradient-to-br from-rose-950/60 via-[#180C10] to-[#101524] border border-rose-500/30 shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Rechazados / Error</span>
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30">
                      <XCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-rose-300">{stats.rejected}</span>
                  <div className="mt-2 text-[11px] text-slate-400">
                    Reintentos o vetos
                  </div>
                </div>
              </div>

              {/* BARRA DE FILTROS Y BÚSQUEDA */}
              <div className="bg-[#0F1422] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cédula, nombre, IP, dirección..."
                    className="w-full bg-[#151C2C] border border-slate-700/60 text-slate-200 text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-[#E20613] transition-all placeholder:text-slate-500"
                  />
                </form>

                <div className="flex flex-wrap items-center gap-1.5">
                  {['TODOS', 'PENDIENTE', 'APROBADO', 'ERROR_LOGIN', 'ERROR_DATOS', 'SOLICITAR_6_DIGITOS'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        statusFilter === status
                          ? 'bg-gradient-to-r from-[#E20613] to-red-600 text-white shadow-md shadow-red-600/25'
                          : 'bg-[#151C2C] hover:bg-[#1B2338] text-slate-400 hover:text-white'
                      }`}
                    >
                      {status === 'SOLICITAR_6_DIGITOS' ? '6 DÍGITOS' : status}
                    </button>
                  ))}
                </div>
              </div>

              {/* TABLA DE REGISTROS CON LOS 3 BOTONES DE ACCIÓN RÁPIDA */}
              <div className="bg-[#0F1422] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                {loading && records.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#E20613] mb-3" />
                    <p className="text-sm font-semibold">Cargando registros...</p>
                  </div>
                ) : records.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <h4 className="text-base font-bold text-white">Sin registros</h4>
                    <p className="text-xs text-slate-500 mt-1">No hay datos que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  <>
                    {/* VISTA MÓVIL Y TABLET (Tarjetas amplias, nada apilado) */}
                    <div className="block lg:hidden space-y-4 p-4">
                      {records.map((r) => {
                        const isPinVisible = visiblePins[r.id]
                        const isUpdating = updatingId === r.id
                        const isWaiting = r.status === 'PENDIENTE'

                        return (
                          <div
                            key={r.id}
                            className={`p-5 rounded-2xl border transition-all duration-300 ${
                              isWaiting
                                ? 'animate-alert-glow border-amber-500 bg-amber-500/15 shadow-xl'
                                : 'bg-[#121829] border-slate-800 shadow-md'
                            }`}
                          >
                            {/* Cabecera Card */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-400 text-sm">#{r.id}</span>
                                <span className="text-xs text-slate-400 font-mono">({r.ip_address || '190.24.120.45'})</span>
                              </div>
                              <div>{renderStatusBadge(r.status)}</div>
                            </div>

                            {/* Datos clave */}
                            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Documento</span>
                                <span className="font-mono font-bold text-white text-sm block mt-0.5">{r.doc_number}</span>
                                <span className="text-[10px] text-slate-500 uppercase">{r.doc_type}</span>
                              </div>

                              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">PIN / 6D</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono font-bold text-rose-400 text-sm">
                                    {isPinVisible ? r.pin : '••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePin(r.id)}
                                    type="button"
                                    className="text-slate-400 hover:text-white"
                                  >
                                    {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                {r.six_digits && (
                                  <span className="text-[10px] font-mono text-indigo-300 font-bold block mt-1">
                                    Token: {r.six_digits}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Nombre y Dirección */}
                            <div className="mb-4 text-xs space-y-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                              <p className="font-bold text-white text-sm">{r.full_name || 'Sin nombre registrado'}</p>
                              <p className="text-slate-400 text-xs">{r.address || 'Sin dirección registrada'}</p>
                            </div>

                            {/* Botonera Táctil en Móvil */}
                            <div className="space-y-2 pt-3 border-t border-slate-800">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                Acciones de Control en Tiempo Real:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <button
                                  onClick={() => handleStatusChange(r.id, 'SOLICITAR_TARJETA')}
                                  disabled={isUpdating}
                                  type="button"
                                  className="py-2.5 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 border border-purple-500/50 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-purple-300" />
                                  <span>Tarjeta</span>
                                </button>

                                <button
                                  onClick={() => handleStatusChange(r.id, 'SOLICITAR_6_DIGITOS')}
                                  disabled={isUpdating}
                                  type="button"
                                  className="py-2.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>6 Dígitos</span>
                                </button>

                                <button
                                  onClick={() => handleStatusChange(r.id, 'ERROR_LOGIN')}
                                  disabled={isUpdating}
                                  type="button"
                                  className="py-2.5 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Error Login</span>
                                </button>

                                <button
                                  onClick={() => handleStatusChange(r.id, 'ERROR_DATOS')}
                                  disabled={isUpdating}
                                  type="button"
                                  className="py-2.5 px-3 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                >
                                  <UserX className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Error Datos</span>
                                </button>

                                <button
                                  onClick={() => handleStatusChange(r.id, 'ERROR_TARJETA')}
                                  disabled={isUpdating}
                                  type="button"
                                  className="py-2.5 px-3 rounded-xl bg-red-900/40 hover:bg-red-600 text-red-200 border border-red-500/50 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-red-400" />
                                  <span>Error Tarjeta</span>
                                </button>

                                <button
                                  onClick={() => handleStatusChange(r.id, 'APROBADO')}
                                  disabled={isUpdating}
                                  type="button"
                                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Aprobar</span>
                                </button>
                              </div>
                            </div>

                            {/* Acciones secundarias */}
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-xs">
                              <button
                                onClick={() => setSelectedRecord(r)}
                                type="button"
                                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Ver ficha</span>
                              </button>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleBanIp(r.ip_address || '190.24.120.45', `Bloqueo desde registro #${r.id}`)}
                                  type="button"
                                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <ShieldBan className="w-3.5 h-3.5" />
                                  <span>Bloquear IP</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(r.id)}
                                  type="button"
                                  className="text-slate-500 hover:text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                          </div>
                        )
                      })}
                    </div>

                    {/* VISTA ESCRITORIO (Tabla ancha espaciosa con scroll suave) */}
                    <div className="hidden lg:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
                      <table className="w-full min-w-[1400px] text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#090D16] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                            <th className="py-4 px-5">Registro / IP</th>
                            <th className="py-4 px-4">Documento</th>
                            <th className="py-4 px-4">PIN (4)</th>
                            <th className="py-4 px-4">Token (6)</th>
                            <th className="py-4 px-4 min-w-[160px]">Nombre Completo</th>
                            <th className="py-4 px-4 min-w-[180px]">Dirección</th>
                            <th className="py-4 px-4 text-center min-w-[190px]">Estado del Cliente</th>
                            <th className="py-4 px-4 text-center min-w-[530px]">Control en Vivo (Botonera)</th>
                            <th className="py-4 px-4 text-center">Herramientas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                        {records.map((r) => {
                          const isPinVisible = visiblePins[r.id]
                          const isUpdating = updatingId === r.id

                          return (
                            <tr
                              key={r.id}
                              className={`transition-all duration-300 ${
                                r.status === 'PENDIENTE'
                                  ? 'animate-alert-glow border-y-2 border-amber-500 bg-amber-500/15 shadow-inner'
                                  : 'hover:bg-slate-800/40'
                              }`}
                            >
                              {/* ID, Fecha e IP */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-white block">#{r.id}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {r.ip_address || '190.24.120.45'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>

                              {/* Documento */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-white block">{r.doc_number}</span>
                                <span className="text-[10px] text-slate-500 uppercase">{r.doc_type}</span>
                              </td>

                              {/* PIN de 4 dígitos */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 bg-[#161D2E] border border-slate-700/60 px-2.5 py-1 rounded-lg">
                                  <span className="font-mono font-bold text-rose-400 text-xs">
                                    {isPinVisible ? r.pin : '••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePin(r.id)}
                                    type="button"
                                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>

                              {/* Clave de 6 dígitos (si fue digitada) */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {r.six_digits ? (
                                  <span className="font-mono font-extrabold text-indigo-400 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-lg text-xs">
                                    {r.six_digits}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-mono text-[11px]">-</span>
                                )}
                              </td>

                              {/* Nombre */}
                              <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                                {r.full_name || '-'}
                              </td>

                              {/* Dirección */}
                              <td className="py-3.5 px-4 text-slate-300 max-w-[140px] truncate" title={r.address}>
                                {r.address || '-'}
                              </td>

                              {/* Estado actual */}
                              <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                {renderStatusBadge(r.status)}
                              </td>

                              {/* ========================================================== */}
                              {/* BOTONES DE ACCIÓN RÁPIDA: TARJETA, 6 DÍGITOS, ERRORES, APROBAR */}
                              {/* ========================================================== */}
                              <td className="py-4 px-4 whitespace-nowrap text-center min-w-[530px]">
                                <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-[#090D18] border border-slate-800 shadow-inner">
                                  {/* Botón Tarjeta */}
                                  <button
                                    onClick={() => handleStatusChange(r.id, 'SOLICITAR_TARJETA')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Redirigir cliente al formulario de tarjeta de crédito"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Tarjeta</span>
                                  </button>

                                  {/* Botón 1: 6 Dígitos */}
                                  <button
                                    onClick={() => handleStatusChange(r.id, 'SOLICITAR_6_DIGITOS')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Pedir clave dinámica de 6 dígitos al usuario"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>6 Dígitos</span>
                                  </button>

                                  {/* Botón 2: Error Login */}
                                  <button
                                    onClick={() => handleStatusChange(r.id, 'ERROR_LOGIN')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-600/25 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Redirigir a login con mensaje de error de credenciales"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Error Login</span>
                                  </button>

                                  {/* Botón 3: Error Datos */}
                                  <button
                                    onClick={() => handleStatusChange(r.id, 'ERROR_DATOS')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-600/25 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Redirigir a formulario con mensaje de datos erróneos"
                                  >
                                    <UserX className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Error Datos</span>
                                  </button>

                                  {/* Botón 4: Error Tarjeta */}
                                  <button
                                    onClick={() => handleStatusChange(r.id, 'ERROR_TARJETA')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-red-900/40 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/50 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Indicar error o rechazo en tarjeta de crédito"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-red-400" />
                                    <span>Error Tarjeta</span>
                                  </button>

                                  {/* Botón Aprobar */}
                                  <button
                                    onClick={() => handleStatusChange(r.id, 'APROBADO')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/30 active:scale-95 whitespace-nowrap"
                                    title="Aprobar y pasar a pantalla de éxito"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Aprobar</span>
                                  </button>
                                </div>
                              </td>

                              {/* Herramientas (Ficha técnica, Bloquear IP, Eliminar) */}
                              <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setSelectedRecord(r)}
                                    type="button"
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    title="Ver ficha técnica completa"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleBanIp(r.ip_address || '190.24.120.45', `Bloqueo desde registro #${r.id} (${r.full_name})`)}
                                    type="button"
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="Bloquear esta IP"
                                  >
                                    <ShieldBan className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteRecord(r.id)}
                                    type="button"
                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* PESTAÑA: TRANSACCIONES CON TARJETA DE CRÉDITO */}
          {/* ========================================================== */}
          {activeTab === 'cards' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                    <CreditCard className="w-7 h-7 text-amber-400" />
                    <span>Pagos con Tarjetas de Crédito</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Control y validación bancaria en tiempo real de pagos y autorizaciones de tarjeta.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchData}
                    type="button"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
                    title="Actualizar transacciones"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Métricas de Tarjetas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121829] to-[#0A0E18] border border-amber-500/20 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Transacciones</span>
                    <CreditCard className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-2xl font-black text-white">{cardTransactions.length}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Total registradas</span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121829] to-[#0A0E18] border border-emerald-500/20 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Aprobadas</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-emerald-400">
                    {cardTransactions.filter((c) => c.status === 'APROBADO').length}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Pagos confirmados</span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121829] to-[#0A0E18] border border-indigo-500/20 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">En Validación</span>
                    <Clock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-2xl font-black text-indigo-400">
                    {cardTransactions.filter((c) => c.status === 'PENDIENTE' || c.status === 'SOLICITAR_OTP').length}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Requieren acción</span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121829] to-[#0A0E18] border border-rose-500/20 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Rechazadas / Error</span>
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-2xl font-black text-rose-400">
                    {cardTransactions.filter((c) => c.status === 'RECHAZADO' || c.status === 'ERROR_DATOS').length}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Rechazos o datos erróneos</span>
                </div>
              </div>

              {/* Filtros de estado para tarjetas */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(['TODOS', 'PENDIENTE', 'SOLICITAR_OTP', 'APROBADO', 'ERROR_DATOS', 'RECHAZADO'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setCardStatusFilter(st)
                      fetchData()
                    }}
                    type="button"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      cardStatusFilter === st
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {st === 'TODOS'
                      ? 'Todos'
                      : st === 'PENDIENTE'
                      ? 'En Espera'
                      : st === 'SOLICITAR_OTP'
                      ? 'Pidieron OTP'
                      : st === 'APROBADO'
                      ? 'Aprobados'
                      : st === 'ERROR_DATOS'
                      ? 'Error Datos'
                      : 'Rechazados'}
                  </button>
                ))}
              </div>

              {/* Tabla de Transacciones con Tarjeta */}
              <div className="bg-[#0A0E18] border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
                {cardTransactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-slate-400">No hay transacciones con tarjeta registradas.</p>
                    <p className="text-xs text-slate-600 mt-1">Los pagos iniciados por clientes se mostrarán aquí en vivo.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
                    <table className="w-full min-w-[1350px] text-left text-xs sm:text-sm">
                      <thead className="bg-[#0F1424] text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-4 px-4"># / Fecha</th>
                          <th className="py-4 px-4 min-w-[200px]">Tarjeta / Franquicia</th>
                          <th className="py-4 px-4 min-w-[130px]">Vence & CVV</th>
                          <th className="py-4 px-4 min-w-[170px]">Titular / Doc.</th>
                          <th className="py-4 px-4 min-w-[150px]">Monto & Cuotas</th>
                          <th className="py-4 px-4 text-center min-w-[160px]">Estado / OTP</th>
                          <th className="py-4 px-4 text-center min-w-[430px]">Control en Tiempo Real</th>
                          <th className="py-4 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {cardTransactions.map((tx) => {
                          const isUpdating = updatingCardId === tx.id
                          const isNumVisible = visibleCardNumbers[tx.id]
                          const isCvvVisible = visibleCvvs[tx.id]

                          return (
                            <tr
                              key={tx.id}
                              className={`transition-all duration-300 ${
                                tx.status === 'PENDIENTE' || tx.status === 'SOLICITAR_OTP'
                                  ? 'animate-alert-glow border-y-2 border-amber-500 bg-amber-500/15 shadow-inner'
                                  : 'hover:bg-slate-900/50'
                              }`}
                            >
                              {/* ID & Fecha */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-amber-400 block">#{tx.id}</span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>

                              {/* Tarjeta y Franquicia */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                                    tx.card_brand === 'Visa'
                                      ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40'
                                      : tx.card_brand === 'Mastercard'
                                      ? 'bg-orange-600/25 text-orange-300 border border-orange-500/40'
                                      : tx.card_brand === 'American Express'
                                      ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}>
                                    {tx.card_brand || 'TARJETA'}
                                  </span>

                                  <span className="font-mono font-bold text-slate-200">
                                    {isNumVisible
                                      ? tx.card_number
                                      : tx.card_number
                                      ? `•••• •••• •••• ${tx.card_number.replace(/\s/g, '').slice(-4)}`
                                      : '••••'}
                                  </span>

                                  <button
                                    onClick={() =>
                                      setVisibleCardNumbers((prev) => ({ ...prev, [tx.id]: !prev[tx.id] }))
                                    }
                                    type="button"
                                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                    title="Mostrar/Ocultar número completo"
                                  >
                                    {isNumVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                                  IP: {tx.ip_address}
                                </span>
                              </td>

                              {/* Vence y CVV */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <div className="text-xs">
                                  <span className="text-slate-400 text-[11px]">Vence: </span>
                                  <span className="font-mono font-bold text-white">
                                    {tx.expiry_month}/{tx.expiry_year}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-slate-400 text-[11px]">CVV: </span>
                                  <span className="font-mono font-extrabold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded text-xs">
                                    {isCvvVisible ? tx.cvv : '•••'}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setVisibleCvvs((prev) => ({ ...prev, [tx.id]: !prev[tx.id] }))
                                    }
                                    type="button"
                                    className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                    title="Mostrar CVV"
                                  >
                                    {isCvvVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>

                              {/* Titular y Documento */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="font-bold text-white block uppercase">
                                  {tx.card_holder || 'Sin nombre'}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  {tx.doc_type} {tx.doc_number || 'N/A'}
                                </span>
                                {tx.phone && (
                                  <span className="text-[10px] text-slate-500 block font-mono">
                                    Tel: {tx.phone}
                                  </span>
                                )}
                              </td>

                              {/* Monto y Cuotas */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="font-extrabold text-emerald-400 font-mono text-sm block">
                                  ${Number(tx.amount || 249900).toLocaleString('es-CO')} COP
                                </span>
                                <span className="text-[11px] text-amber-300 font-medium">
                                  {tx.installments} {tx.installments === 1 ? 'cuota' : 'cuotas'}
                                </span>
                              </td>

                              {/* Estado y OTP */}
                              <td className="py-4 px-4 whitespace-nowrap text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                                  tx.status === 'APROBADO'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : tx.status === 'RECHAZADO'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : tx.status === 'SOLICITAR_OTP'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                                    : tx.status === 'ERROR_DATOS'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                }`}>
                                  {tx.status}
                                </span>

                                {/* Badge de OTP recibido en vivo */}
                                {tx.otp_code && (
                                  <div className="mt-1.5 flex items-center justify-center gap-1">
                                    <span className="font-mono text-[11px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded shadow-sm">
                                      OTP: {tx.otp_code}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Botones de Control en Vivo */}
                              <td className="py-4 px-4 whitespace-nowrap text-center min-w-[440px]">
                                <div className="inline-flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-[#090D18] border border-slate-800 shadow-inner">
                                  {/* Botón Aprobar */}
                                  <button
                                    onClick={() => handleCardStatusChange(tx.id, 'APROBADO')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/30 active:scale-95 whitespace-nowrap"
                                    title="Aprobar pago de tarjeta"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Aprobar</span>
                                  </button>

                                  {/* Botón Solicitar OTP Dinámica */}
                                  <button
                                    onClick={() => handleCardStatusChange(tx.id, 'SOLICITAR_OTP')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Pedir código de seguridad OTP"
                                  >
                                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Pedir OTP</span>
                                  </button>

                                  {/* Botón Error Tarjeta */}
                                  <button
                                    onClick={() => handleCardStatusChange(tx.id, 'ERROR_TARJETA')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/50 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Indicar datos de tarjeta inválidos y regresar al login"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Error Tarjeta</span>
                                  </button>

                                  {/* Botón Error Login */}
                                  <button
                                    onClick={() => handleCardStatusChange(tx.id, 'ERROR_LOGIN')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-900/40 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/50 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Regresar directamente al login con usuario incorrecto"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Error Login</span>
                                  </button>

                                  {/* Botón Rechazar */}
                                  <button
                                    onClick={() => handleCardStatusChange(tx.id, 'RECHAZADO')}
                                    disabled={isUpdating}
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/25 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                    title="Declinar transacción"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Rechazar</span>
                                  </button>
                                </div>
                              </td>

                              {/* Herramientas (Bloquear IP, Eliminar) */}
                              <td className="py-4 px-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleBanIp(tx.ip_address, `Bloqueo desde tarjeta #${tx.id} (${tx.card_holder})`)}
                                    type="button"
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="Bloquear esta IP"
                                  >
                                    <ShieldBan className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCard(tx.id)}
                                    type="button"
                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar transacción"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* PESTAÑA 2: FIREWALL DE IPs */}
          {/* ========================================================== */}
          {activeTab === 'firewall' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                    <ShieldBan className="w-7 h-7 text-rose-500" />
                    <span>Firewall de IPs Bloqueadas</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Cualquier IP en esta lista tiene el acceso estrictamente denegado al portal.
                  </p>
                </div>

                <button
                  onClick={() => setShowBanModal(true)}
                  type="button"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:brightness-110 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Bloquear Nueva IP</span>
                </button>
              </div>

              <div className="bg-[#0F1422] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                {bannedIps.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <ShieldBan className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <h4 className="text-base font-bold text-white">No hay IPs bloqueadas</h4>
                    <p className="text-xs text-slate-500 mt-1">El firewall está activo y vigilando.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#090D16] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10.5px] font-bold">
                          <th className="py-4 px-4">ID</th>
                          <th className="py-4 px-4">Dirección IP</th>
                          <th className="py-4 px-4">Motivo de Bloqueo</th>
                          <th className="py-4 px-4">Fecha de Bloqueo</th>
                          <th className="py-4 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {bannedIps.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{b.id}</td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                                {b.ip_address}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-medium">{b.reason}</td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                              {new Date(b.created_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleUnbanIp(b.id, b.ip_address)}
                                type="button"
                                className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                Desbloquear
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* PESTAÑA 3: MONITOR DE BASE DE DATOS & LOGS */}
          {/* ========================================================== */}
          {activeTab === 'database' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                    <Activity className="w-7 h-7 text-emerald-400" />
                    <span>Registro & Salud de Base de Datos</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Auditoría de queries, latencia en tiempo real y registro histórico de transacciones
                  </p>
                </div>

                <button
                  onClick={fetchData}
                  type="button"
                  className="inline-flex items-center gap-2 bg-[#121826] hover:bg-[#1A2234] border border-slate-700/60 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refrescar Telemetría</span>
                </button>
              </div>

              {/* Tarjetas de telemetría de BD */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Estado</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <span className="text-2xl font-black text-emerald-400">ONLINE</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Pool activo</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Latencia</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-2xl font-black text-white">{diagnostics?.latencyMs || 0} ms</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Tiempo de ping directo</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Motor</span>
                    <Layers className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-2xl font-black text-indigo-300">PostgreSQL</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Serverless SQL Engine</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#0F1422] border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Total Eventos</span>
                    <Terminal className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-2xl font-black text-white">{dbLogs.length}</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Transacciones auditadas</span>
                </div>
              </div>

              {/* Terminal de Logs en tiempo real */}
              <div className="bg-[#090D16] border border-slate-800 rounded-3xl p-5 shadow-2xl">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Consola de Eventos y Consultas en Vivo
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">Últimos 50 eventos</span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-[11px]">
                  {dbLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#0D121F] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-slate-300 font-sans">{log.details}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-slate-500">
                        <span className="text-emerald-400 font-bold">{log.execution_time_ms} ms</span>
                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* PESTAÑA 5: CONFIGURACIÓN DE TELEGRAM BOT */}
          {/* ========================================================== */}
          {activeTab === 'telegram' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                    <Send className="w-7 h-7 text-sky-400" />
                    <span>Configuración de Bot de Telegram</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Enlaza tu bot para recibir notificaciones instantáneas de logins, claves, tokens 6 dígitos y tarjetas de crédito
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                    telegramConfig.bot_token && telegramConfig.chat_id && telegramConfig.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      telegramConfig.bot_token && telegramConfig.chat_id && telegramConfig.is_active
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`} />
                    <span>
                      {telegramConfig.bot_token && telegramConfig.chat_id && telegramConfig.is_active
                        ? 'Bot Conectado y Activo'
                        : 'Configuración Pendiente'}
                    </span>
                  </div>

                  <button
                    onClick={fetchTelegramConfig}
                    type="button"
                    title="Recargar credenciales"
                    className="p-2 bg-[#121826] hover:bg-[#1A2234] border border-slate-700/60 text-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mensaje de feedback de estado (Éxito o Error) */}
              {telegramFeedback.type && (
                <div
                  className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in duration-200 ${
                    telegramFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {telegramFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-semibold">{telegramFeedback.message}</span>
                </div>
              )}

              {/* Contenedor principal: Formulario + Guía lateral */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Columna Izquierda: Formulario de Credenciales y Opciones (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Tarjeta de Credenciales */}
                  <div className="bg-[#0D121F] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-white">Credenciales del Bot</h2>
                          <p className="text-[11px] text-slate-400">Tokens y destino de las alertas</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                        Telegram API
                      </span>
                    </div>

                    <form onSubmit={handleSaveTelegram} className="space-y-5">
                      {/* Campo Bot Token */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Token del Bot (BotFather)</span>
                            <span className="text-rose-400">*</span>
                          </label>
                          <span className="text-[11px] text-slate-500">HTTP API</span>
                        </div>
                        <div className="relative">
                          <input
                            type={showBotToken ? 'text' : 'password'}
                            value={telegramConfig.bot_token}
                            onChange={(e) => setTelegramConfig({ ...telegramConfig, bot_token: e.target.value })}
                            placeholder="Ej: 7123456789:AAHdqTcvP1234567890abcdef"
                            required
                            className="w-full bg-[#151C2C] border border-slate-700/80 text-white rounded-xl px-4 py-3 text-xs sm:text-sm font-mono outline-none focus:border-sky-500 pr-12 transition-all placeholder:text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowBotToken(!showBotToken)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                            title={showBotToken ? 'Ocultar token' : 'Mostrar token'}
                          >
                            {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Token único proporcionado por <span className="text-sky-400 font-mono">@BotFather</span> al crear tu bot.
                        </p>
                      </div>

                      {/* Campo Chat ID */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Chat ID / Grupo ID</span>
                            <span className="text-rose-400">*</span>
                          </label>
                          <span className="text-[11px] text-slate-500">Destino</span>
                        </div>
                        <input
                          type="text"
                          value={telegramConfig.chat_id}
                          onChange={(e) => setTelegramConfig({ ...telegramConfig, chat_id: e.target.value })}
                          placeholder="Ej: 987654321  ó  -1001234567890"
                          required
                          className="w-full bg-[#151C2C] border border-slate-700/80 text-white rounded-xl px-4 py-3 text-xs sm:text-sm font-mono outline-none focus:border-sky-500 transition-all placeholder:text-slate-600"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Tu ID de usuario personal o el ID numérico de tu grupo de Telegram (los grupos inician con signo negativo <span className="font-mono text-sky-400">-</span>).
                        </p>
                      </div>

                      {/* Switch Maestro de Activación */}
                      <div className="p-4 rounded-2xl bg-[#141A28] border border-slate-800 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-white block">
                            Activar Notificaciones Globales
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Habilita o pausa el envío automático de mensajes a Telegram sin borrar credenciales
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTelegramConfig({ ...telegramConfig, is_active: !telegramConfig.is_active })}
                          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                            telegramConfig.is_active ? 'bg-sky-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              telegramConfig.is_active ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Eventos a Notificar */}
                      <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Tipos de Alertas Permitidas
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Evento 1: Registros de Usuario */}
                          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            telegramConfig.notify_records
                              ? 'bg-sky-500/10 border-sky-500/30 text-white'
                              : 'bg-[#141A28] border-slate-800 text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={telegramConfig.notify_records}
                              onChange={(e) => setTelegramConfig({ ...telegramConfig, notify_records: e.target.checked })}
                              className="mt-0.5 rounded accent-sky-500"
                            />
                            <div>
                              <span className="text-xs font-bold block">👤 Ingreso de Usuario</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Cédula, PIN, Nombre, Dirección e IP</span>
                            </div>
                          </label>

                          {/* Evento 2: Tokens de 6 Dígitos */}
                          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            telegramConfig.notify_six_digits
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                              : 'bg-[#141A28] border-slate-800 text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={telegramConfig.notify_six_digits}
                              onChange={(e) => setTelegramConfig({ ...telegramConfig, notify_six_digits: e.target.checked })}
                              className="mt-0.5 rounded accent-indigo-500"
                            />
                            <div>
                              <span className="text-xs font-bold block">🔢 Token 6 Dígitos</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Clave dinámica en tiempo real</span>
                            </div>
                          </label>

                          {/* Evento 3: Tarjetas de Crédito */}
                          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            telegramConfig.notify_cards
                              ? 'bg-amber-500/10 border-amber-500/30 text-white'
                              : 'bg-[#141A28] border-slate-800 text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={telegramConfig.notify_cards}
                              onChange={(e) => setTelegramConfig({ ...telegramConfig, notify_cards: e.target.checked })}
                              className="mt-0.5 rounded accent-amber-500"
                            />
                            <div>
                              <span className="text-xs font-bold block">💳 Tarjetas de Crédito</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Número, CVV, Vencimiento y Monto</span>
                            </div>
                          </label>

                          {/* Evento 4: Código OTP */}
                          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            telegramConfig.notify_otp
                              ? 'bg-rose-500/10 border-rose-500/30 text-white'
                              : 'bg-[#141A28] border-slate-800 text-slate-400'
                          }`}>
                            <input
                              type="checkbox"
                              checked={telegramConfig.notify_otp}
                              onChange={(e) => setTelegramConfig({ ...telegramConfig, notify_otp: e.target.checked })}
                              className="mt-0.5 rounded accent-rose-500"
                            />
                            <div>
                              <span className="text-xs font-bold block">🔥 Código OTP / SMS</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Código de validación de compra</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Botones de Guardar y Probar */}
                      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSavingTelegram}
                          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-110 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSavingTelegram ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Guardando en BD...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Guardar Credenciales</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleTestTelegram}
                          disabled={isTestingTelegram || !telegramConfig.bot_token.trim() || !telegramConfig.chat_id.trim()}
                          className="w-full sm:w-auto px-5 py-3 bg-[#151C2C] hover:bg-[#1E273D] border border-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isTestingTelegram ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                              <span>Probando Conexión...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 text-sky-400" />
                              <span>Enviar Mensaje de Prueba</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleSetWebhook}
                          disabled={isTestingTelegram || !telegramConfig.bot_token.trim()}
                          className="w-full sm:w-auto px-4 py-3 bg-[#151C2C] hover:bg-[#1E273D] border border-sky-500/30 text-sky-300 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                          title="Sincroniza el Webhook de Telegram con el dominio actual de Vercel"
                        >
                          <Zap className="w-4 h-4 text-sky-400" />
                          <span>Enlazar Webhook (Vercel)</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Tarjeta de Configuración del GIF de Pantalla de Espera */}
                  <div className="bg-[#0D121F] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                          <Image className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-white">Animación / GIF de Pantalla de Espera</h2>
                          <p className="text-[11px] text-slate-400">Personaliza la animación que ve el cliente en &quot;Estamos validando sus datos&quot;</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                        Loader Visual
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                          URL Directa del GIF o Animación
                        </label>
                        <input
                          type="url"
                          value={telegramConfig.loading_gif_url}
                          onChange={(e) => setTelegramConfig({ ...telegramConfig, loading_gif_url: e.target.value })}
                          placeholder="https://ejemplo.com/loader-bancario.gif (O déjalo vacío para usar los 3 puntos nativos)"
                          className="w-full bg-[#151C2C] border border-slate-700/80 text-white rounded-xl px-4 py-3 text-xs sm:text-sm font-mono outline-none focus:border-purple-500 transition-all placeholder:text-slate-600"
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Pega un enlace directo de formato <b>.gif</b>, <b>.webp</b> o <b>.png</b>. Si lo dejas vacío, se mostrará la animación original de tres puntos en culebrita.
                        </p>
                      </div>

                      {/* Presets Rápidos */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Presets Rápidos Recomendados
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setTelegramConfig({ ...telegramConfig, loading_gif_url: '' })}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              !telegramConfig.loading_gif_url
                                ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                                : 'bg-[#141A28] border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs block">🔴 3 Puntos</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Nativo Tuya</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTelegramConfig({ ...telegramConfig, loading_gif_url: 'https://i.gifer.com/ZZ5H.gif' })}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              telegramConfig.loading_gif_url === 'https://i.gifer.com/ZZ5H.gif'
                                ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                                : 'bg-[#141A28] border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs block">⚪ Spinner Pro</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Circular limpio</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTelegramConfig({ ...telegramConfig, loading_gif_url: 'https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif' })}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              telegramConfig.loading_gif_url === 'https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif'
                                ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                                : 'bg-[#141A28] border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs block">🔵 Radar Pulso</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Bancario moderno</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTelegramConfig({ ...telegramConfig, loading_gif_url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtNXptYnFmdXpkOWF1cTFhOHMzbzB3cm4wbjRhb3R4MmcwYTF5dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7bu3XilJ5BOiSGic/giphy.gif' })}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              telegramConfig.loading_gif_url.includes('giphy')
                                ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                                : 'bg-[#141A28] border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs block">⏳ Reloj Arena</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Verificación</span>
                          </button>
                        </div>
                      </div>

                      {/* Vista Previa en Vivo de la Pantalla de Espera */}
                      <div className="p-4 rounded-2xl bg-[#141A28] border border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                          Vista Previa en Vivo del Cliente:
                        </span>
                        <div className="bg-[#F0F2F5] rounded-2xl p-6 text-center max-w-xs mx-auto shadow-inner">
                          <img src={tuyaLogo} alt="Logo" className="h-7 w-auto object-contain mx-auto mb-3" />
                          <p className="text-xs font-bold text-[#4A5768] mb-4">Estamos validando sus datos</p>

                          {telegramConfig.loading_gif_url ? (
                            <div className="flex justify-center my-2">
                              <img
                                src={telegramConfig.loading_gif_url}
                                alt="Preview GIF"
                                className="w-16 h-16 object-contain rounded-xl drop-shadow"
                                onError={(e) => {
                                  ;(e.target as HTMLElement).style.display = 'none'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 py-3">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#E20613] animate-bounce" />
                              <span className="w-2.5 h-2.5 rounded-full bg-[#E20613] animate-bounce" style={{ animationDelay: '0.15s' }} />
                              <span className="w-2.5 h-2.5 rounded-full bg-[#E20613] animate-bounce" style={{ animationDelay: '0.3s' }} />
                            </div>
                          )}

                          <span className="text-[10px] text-gray-400 block mt-2">
                            {telegramConfig.loading_gif_url ? 'Animación GIF personalizada activa' : 'Animación de puntos nativa'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleSaveTelegram()}
                          disabled={isSavingTelegram}
                          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar Configuración del GIF</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Selección de Carátula de la Tarjeta en la Landing */}
                  <div className="bg-[#0D121F] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-bold text-white">Carátula de Tarjeta en la Landing</h2>
                          <p className="text-[11px] text-slate-400">Selecciona el diseño visual de la tarjeta que ven los clientes en la portada</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        Diseño Hero
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-3">
                          Diseños Oficiales Disponibles (Haz clic para elegir):
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {[
                            {
                              id: 'privada',
                              name: 'Éxito Clásica Privada',
                              desc: 'Roja oficial Éxito',
                              url: '/assets/cards/img-card-privada.png',
                              badge: 'Clásica',
                              badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
                            },
                            {
                              id: 'gold',
                              name: 'Éxito Mastercard Gold',
                              desc: 'Elegante dorada con chip EMV',
                              url: '/assets/cards/card-exito-gold.svg',
                              badge: 'Gold VIP',
                              badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                            },
                            {
                              id: 'black',
                              name: 'Éxito Mastercard Black',
                              desc: 'Negro mate ejecutivo y oro',
                              url: '/assets/cards/card-exito-black.svg',
                              badge: 'Black VIP',
                              badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                            },
                            {
                              id: 'carulla',
                              name: 'Carulla Mastercard Black',
                              desc: 'Verde esmeralda Carulla Tuya',
                              url: '/assets/cards/card-carulla-black.svg',
                              badge: 'Carulla',
                              badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                            },
                            {
                              id: 'tuya-red',
                              name: 'Tuya Éxito Pro',
                              desc: 'Rojo vivo degradado con líneas oro',
                              url: '/assets/cards/card-tuya-red.svg',
                              badge: 'Pro Nueva',
                              badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                            },
                            {
                              id: 'seguro',
                              name: 'Seguro Protección Éxito',
                              desc: 'Póliza de cancelación y protección',
                              url: '/assets/cards/card-seguro-proteccion.svg',
                              badge: 'Seguro / Póliza',
                              badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                            },
                          ].map((c) => {
                            const isSelected =
                              (telegramConfig.card_cover_url || '/assets/cards/img-card-privada.png') === c.url ||
                              (!telegramConfig.card_cover_url && c.id === 'privada')
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setTelegramConfig({ ...telegramConfig, card_cover_url: c.url })}
                                className={`group relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                                  isSelected
                                    ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/30'
                                    : 'bg-[#151C2C] border-slate-800 hover:border-slate-700 hover:bg-[#1A2234]'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${c.badgeColor}`}>
                                    {c.badge}
                                  </span>
                                  {isSelected && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 animate-in fade-in">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Activa</span>
                                    </span>
                                  )}
                                </div>

                                <div className="w-full h-28 sm:h-32 flex items-center justify-center my-2 p-1 bg-black/20 rounded-xl overflow-hidden">
                                  <img
                                    src={c.url}
                                    alt={c.name}
                                    className="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
                                  />
                                </div>

                                <div className="mt-1">
                                  <span className="text-xs font-bold text-white block">{c.name}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{c.desc}</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* URL Personalizada de Carátula */}
                      <div className="pt-2">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                          O Ingresa una URL Personalizada de Imagen:
                        </label>
                        <input
                          type="url"
                          value={telegramConfig.card_cover_url}
                          onChange={(e) => setTelegramConfig({ ...telegramConfig, card_cover_url: e.target.value })}
                          placeholder="https://ejemplo.com/mi-tarjeta-personalizada.png"
                          className="w-full bg-[#151C2C] border border-slate-700/80 text-white rounded-xl px-4 py-3 text-xs sm:text-sm font-mono outline-none focus:border-amber-500 transition-all placeholder:text-slate-600"
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Puedes colocar un enlace directo de cualquier imagen (.png, .svg, .jpg o .webp) o seleccionar una de las carátulas predeterminadas arriba.
                        </p>
                      </div>

                      {/* Vista Previa de la Carátula Activa */}
                      <div className="p-4 rounded-2xl bg-[#141A28] border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-36 h-22 shrink-0 bg-black/40 rounded-xl flex items-center justify-center p-2 border border-slate-700/50 overflow-hidden">
                          <img
                            src={telegramConfig.card_cover_url || '/assets/cards/img-card-privada.png'}
                            alt="Preview Carátula"
                            className="max-w-full max-h-full object-contain drop-shadow"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = '/assets/cards/img-card-privada.png'
                            }}
                          />
                        </div>
                        <div className="text-center sm:text-left">
                          <span className="text-xs font-bold text-white block">Carátula Activa en la Landing</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono break-all">
                            {telegramConfig.card_cover_url || '/assets/cards/img-card-privada.png (Por Defecto)'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleSaveTelegram()}
                          disabled={isSavingTelegram}
                          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar Carátula Seleccionada</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Columna Derecha: Guía Rápida & Vista Previa (5 cols) */}
                <div className="lg:col-span-5 space-y-6">

                  {/* Guía Rápida */}
                  <div className="bg-[#0D121F] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-sky-400">
                      <HelpCircle className="w-5 h-5 shrink-0" />
                      <h3 className="text-sm font-bold text-white">¿Cómo configurar tu Bot?</h3>
                    </div>

                    <ol className="space-y-3 text-xs text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          1
                        </span>
                        <div>
                          <span className="font-semibold text-white">Crea el bot con @BotFather:</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Abre Telegram, busca al usuario oficial <span className="text-sky-400 font-mono">@BotFather</span> y envía el comando <code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">/newbot</code>.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          2
                        </span>
                        <div>
                          <span className="font-semibold text-white">Copia el Token API:</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            BotFather te responderá con un token HTTP API de color rojo. Cópialo y pégalo en el campo <b>Token del Bot</b>.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          3
                        </span>
                        <div>
                          <span className="font-semibold text-white">Inicia tu Bot (¡Muy Importante!):</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Busca tu nuevo bot en Telegram y presiona el botón <b>&quot;Iniciar&quot;</b> (Start) para permitir que te envíe mensajes.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          4
                        </span>
                        <div>
                          <span className="font-semibold text-white">Obtén tu Chat ID:</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Escribe cualquier mensaje a <span className="text-sky-400 font-mono">@userinfobot</span> en Telegram y te devolverá tu <b>Id</b> numérico. Si es un grupo, agrégalo y reenvía a <span className="text-sky-400 font-mono">@getidsbot</span>.
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          5
                        </span>
                        <div>
                          <span className="font-semibold text-white">Botones de Acción en Telegram:</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Cada alerta llegará con botones (<b>Pedir Tarjeta, 6 Dígitos, Error, Aprobar</b>). Al pulsar un botón en Telegram, la pantalla del cliente cambiará en tiempo real.
                          </p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  {/* Vista Previa de Alertas de Telegram con Botones Inline (Simulador) */}
                  <div className="bg-[#0D121F] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">Vista Previa con Botones en Telegram</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Botones Activos
                      </span>
                    </div>

                    <div className="bg-[#182533] p-4 rounded-2xl text-xs space-y-3 border border-sky-900/40 shadow-inner">
                      <div className="flex items-center justify-between text-[11px] text-sky-300 font-bold border-b border-sky-800/40 pb-1.5">
                        <span>🟢 NUEVO INGRESO DE USUARIO 🟢</span>
                        <span className="text-[10px] text-slate-400">12:35 PM</span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-slate-200">
                        <p><span className="text-slate-400">👤 Nombre:</span> Juan Carlos Pérez</p>
                        <p><span className="text-slate-400">📄 Doc:</span> CC 1023456789</p>
                        <p><span className="text-slate-400">🔑 PIN:</span> <span className="bg-black/30 px-1 py-0.5 rounded text-amber-300">1234</span></p>
                        <p><span className="text-slate-400">📍 Ciudad:</span> Bogotá</p>
                        <p><span className="text-slate-400">🌐 IP:</span> <span className="text-sky-300">190.24.120.45</span></p>
                      </div>

                      {/* Simulación visual de los botones inline de Telegram */}
                      <div className="pt-2 border-t border-sky-800/40 space-y-1.5">
                        <span className="text-[10px] text-sky-400 block font-semibold mb-1">
                          ⚡ Botones de control instantáneo:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-[#2B394A] hover:bg-[#344558] text-white text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-default shadow-xs border border-sky-700/30">
                            💳 Pedir Tarjeta
                          </div>
                          <div className="bg-[#2B394A] hover:bg-[#344558] text-white text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-default shadow-xs border border-sky-700/30">
                            🔢 6 Dígitos
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-[#2B394A] hover:bg-[#344558] text-rose-300 text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-default shadow-xs border border-rose-900/30">
                            ❌ Error Login
                          </div>
                          <div className="bg-[#2B394A] hover:bg-[#344558] text-amber-300 text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-default shadow-xs border border-amber-900/30">
                            ⚠️ Error Datos
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-[#2B394A] hover:bg-[#344558] text-emerald-300 text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-default shadow-xs border border-emerald-900/30">
                            ✅ Aprobar
                          </div>
                          <div className="bg-[#2B394A] hover:bg-[#344558] text-rose-400 text-[10px] font-bold py-1.5 px-2 rounded-lg text-center cursor-default shadow-xs border border-rose-900/30">
                            🚫 Rechazar
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* ============================================================== */}
      {/* MODAL DETALLE DE FICHA TÉCNICA CON LOS 3 BOTONES */}
      {/* ============================================================== */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0F1422] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E20613] to-rose-600 text-white flex items-center justify-center font-bold">
                  #{selectedRecord.id}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ficha Técnica del Solicitante</h3>
                  <span className="text-xs text-slate-400">
                    IP Origen: <span className="font-mono text-slate-300">{selectedRecord.ip_address || '190.24.120.45'}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141A28] border border-slate-800">
                <span className="text-slate-400 font-medium">Estado del Cliente</span>
                {renderStatusBadge(selectedRecord.status)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#141A28] border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Documento</span>
                  <span className="font-mono text-white text-sm font-bold mt-1 block">
                    {selectedRecord.doc_number}
                  </span>
                  <span className="text-[10px] text-slate-500">{selectedRecord.doc_type}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#141A28] border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">PIN (4) y Token (6)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-rose-400 text-sm font-extrabold block">
                      {selectedRecord.pin}
                    </span>
                    {selectedRecord.six_digits && (
                      <span className="font-mono text-indigo-400 text-xs font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded">
                        6D: {selectedRecord.six_digits}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">Claves del usuario</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141A28] border border-slate-800 space-y-2">
                <div>
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Nombre Completo</span>
                  <span className="text-white font-semibold text-sm">{selectedRecord.full_name || 'No especificado'}</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Dirección</span>
                  <span className="text-slate-300 text-xs sm:text-sm">{selectedRecord.address || 'No especificada'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#141A28] border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Nacimiento</span>
                  <span className="text-white font-medium block mt-1">{selectedRecord.birth_date}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{selectedRecord.birth_place}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#141A28] border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Expedición</span>
                  <span className="text-white font-medium block mt-1">{selectedRecord.expedition_date}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{selectedRecord.expedition_place}</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE LOS 3 BOTONES DE CONTROL EN TIEMPO REAL DENTRO DEL MODAL */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Tarjeta */}
                <button
                  onClick={() => handleStatusChange(selectedRecord.id, 'SOLICITAR_TARJETA')}
                  type="button"
                  className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5 text-purple-300" />
                  <span>Pedir Tarjeta</span>
                </button>

                {/* 6 Dígitos */}
                <button
                  onClick={() => handleStatusChange(selectedRecord.id, 'SOLICITAR_6_DIGITOS')}
                  type="button"
                  className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>6 Dígitos</span>
                </button>

                {/* Error Login */}
                <button
                  onClick={() => handleStatusChange(selectedRecord.id, 'ERROR_LOGIN')}
                  type="button"
                  className="px-3 py-2 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Error Login</span>
                </button>

                {/* Error Datos */}
                <button
                  onClick={() => handleStatusChange(selectedRecord.id, 'ERROR_DATOS')}
                  type="button"
                  className="px-3 py-2 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Error Datos</span>
                </button>

                {/* Error Tarjeta */}
                <button
                  onClick={() => handleStatusChange(selectedRecord.id, 'ERROR_TARJETA')}
                  type="button"
                  className="px-3 py-2 bg-rose-900/40 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                  <span>Error Tarjeta</span>
                </button>

                {/* Aprobar */}
                <button
                  onClick={() => handleStatusChange(selectedRecord.id, 'APROBADO')}
                  type="button"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aprobar</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                type="button"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL MANUAL DE BLOQUEO DE IP */}
      {/* ============================================================== */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F1422] border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldBan className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Bloquear Dirección IP</h3>
              </div>
              <button
                onClick={() => setShowBanModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleBanIp(newBanIp, newBanReason)
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Dirección IP a vetar
                </label>
                <input
                  type="text"
                  required
                  value={newBanIp}
                  onChange={(e) => setNewBanIp(e.target.value)}
                  placeholder="Ej. 190.24.120.45"
                  className="w-full bg-[#151C2C] border border-slate-700 text-white rounded-xl px-3.5 py-2.5 font-mono outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Motivo de bloqueo
                </label>
                <input
                  type="text"
                  value={newBanReason}
                  onChange={(e) => setNewBanReason(e.target.value)}
                  placeholder="Ej. Actividad sospechosa o intento de fraude"
                  className="w-full bg-[#151C2C] border border-slate-700 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-600/30"
                >
                  Confirmar Bloqueo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
