import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

// Para buscar sin importar acentos ni mayusculas
const clean = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export default function Weather() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('current_weather')
        .select(
          'temp_c, feelslike_c, humidity, wind_kph, icon_url, observed_at, conditions(text), cities(name, region, country)'
        )

      if (error) setError(error.message)
      else setRows(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = clean(search)
    return rows
      .filter((r) => !term || clean(r.cities.name).includes(term))
      .sort((a, b) => a.cities.name.localeCompare(b.cities.name))
  }, [rows, search])

  if (loading) return <p className="status">Cargando clima...</p>
  if (error) return <p className="status error">No se pudo cargar el clima: {error}</p>

  return (
    <>
      <div className="controls">
        <input
          type="search"
          placeholder="Buscar ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="count">{filtered.length} ciudades</span>
      </div>

      {filtered.length === 0 ? (
        <p className="status">No hay ciudades que coincidan.</p>
      ) : (
        <div className="grid">
          {filtered.map((r) => (
            <article className="weather-card" key={`${r.cities.name}-${r.cities.country}`}>
              <header>
                <h3>{r.cities.name}</h3>
                <p>{r.cities.country}</p>
              </header>

              <div className="weather-main">
                <img src={r.icon_url} alt={r.conditions?.text ?? 'Clima'} width="64" height="64" />
                <span className="temp">{Math.round(r.temp_c)}°C</span>
              </div>
              <p className="condition">{r.conditions?.text ?? '-'}</p>

              <dl>
                <dt>Sensacion</dt>
                <dd>{Math.round(r.feelslike_c)}°C</dd>
                <dt>Humedad</dt>
                <dd>{r.humidity}%</dd>
                <dt>Viento</dt>
                <dd>{r.wind_kph} km/h</dd>
              </dl>

              <small>
                Actualizado: {new Date(r.observed_at).toLocaleString('es-MX')}
              </small>
            </article>
          ))}
        </div>
      )}
    </>
  )
}