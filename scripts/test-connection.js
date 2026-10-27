import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const { count, error } = await supabase
  .from('cities')
  .select('*', { count: 'exact', head: true })

if (error) {
  console.error('Fallo:', error.message)
} else {
  console.log('Conexion OK. Filas en cities:', count)
}