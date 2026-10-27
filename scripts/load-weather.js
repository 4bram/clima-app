import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const BASE_URL = 'https://api.weatherapi.com/v1/current.json'

// Lista fija de ciudades a cargar
const CITIES = [
  'Celaya, Mexico', 'Queretaro, Mexico', 'Guanajuato, Mexico', 'Irapuato, Mexico',
  'Mexico City', 'Guadalajara, Mexico', 'Monterrey, Mexico', 'Cancun, Mexico',
  'Tijuana, Mexico', 'Madrid', 'Barcelona', 'Bogota', 'Buenos Aires', 'Lima',
  'New York', 'Los Angeles', 'London', 'Paris', 'Tokyo', 'Sydney',
]

// 1. Pedir el clima de una ciudad (con manejo de errores)
async function fetchWeather(city) {
  const url = `${BASE_URL}?key=${process.env.WEATHERAPI_KEY}&q=${encodeURIComponent(city)}&lang=es`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(`${city}: HTTP ${res.status} ${body?.error?.message ?? ''}`)
  }
  return res.json()
}

// 2. Pedir todas las ciudades; si una falla, se anota y se sigue con las demás
async function fetchAll() {
  const ok = []
  const failed = []
  for (const city of CITIES) {
    try {
      ok.push(await fetchWeather(city))
      console.log(`  ok: ${city}`)
    } catch (err) {
      failed.push(err.message)
      console.warn(`  fallo: ${err.message}`)
    }
  }
  if (ok.length === 0) throw new Error('No se pudo obtener el clima de ninguna ciudad')
  return { ok, failed }
}

// 3. Guardar en Supabase sin duplicar
async function save(results) {
  // Catalogo de condiciones (una fila por codigo)
  const conditions = new Map()
  for (const r of results) {
    conditions.set(r.current.condition.code, {
      code: r.current.condition.code,
      text: r.current.condition.text,
    })
  }
  const { error: condErr } = await supabase
    .from('conditions')
    .upsert([...conditions.values()], { onConflict: 'code' })
  if (condErr) throw condErr

  // Ciudades (nombre + pais es unico)
  const cities = new Map()
  for (const r of results) {
    const l = r.location
    cities.set(`${l.name}|${l.country}`, {
      name: l.name,
      region: l.region || null,
      country: l.country,
      lat: l.lat,
      lon: l.lon,
    })
  }
  const { data: savedCities, error: cityErr } = await supabase
    .from('cities')
    .upsert([...cities.values()], { onConflict: 'name,country' })
    .select('id, name, country')
  if (cityErr) throw cityErr
  const cityIds = Object.fromEntries(savedCities.map((c) => [`${c.name}|${c.country}`, c.id]))

  // Ultima lectura: una fila por ciudad
  const readings = new Map()
  for (const r of results) {
    const id = cityIds[`${r.location.name}|${r.location.country}`]
    readings.set(id, {
      city_id: id,
      condition_code: r.current.condition.code,
      temp_c: r.current.temp_c,
      feelslike_c: r.current.feelslike_c,
      humidity: r.current.humidity,
      wind_kph: r.current.wind_kph,
      icon_url: `https:${r.current.condition.icon}`,
      observed_at: new Date(r.current.last_updated_epoch * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
  const { error: readErr } = await supabase
    .from('current_weather')
    .upsert([...readings.values()], { onConflict: 'city_id' })
  if (readErr) throw readErr

  return readings.size
}

try {
  console.log('Pidiendo clima al API publico...')
  const { ok, failed } = await fetchAll()
  const saved = await save(ok)
  console.log(`Carga terminada: ${saved} ciudades guardadas`)
  if (failed.length) console.log(`Con errores (${failed.length}):`, failed.join(' | '))
} catch (err) {
  console.error('Fallo la carga:', err.message ?? err)
  process.exit(1)
}