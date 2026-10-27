# Dashboard de Clima

App web hecha con **Vite + React** que muestra el clima actual de varias ciudades en tarjetas. Los datos se obtienen de la API pública **WeatherAPI.com**, se guardan en **Supabase** y la interfaz consume **únicamente** esa base de datos. El acceso es con **OAuth (GitHub)**.

## Funcionalidades

- Inicio de sesión con GitHub (Supabase Auth).
- Dashboard con tarjetas por ciudad: temperatura, condición del clima, sensación térmica, humedad, viento e ícono.
- Búsqueda por ciudad (sobre las ciudades cargadas en la base de datos).
- Indicador de carga y manejo de errores.
- Diseño responsive.

## Arquitectura

```
WeatherAPI.com  --(scripts/load-weather.js)-->  Supabase (PostgreSQL)  <--  App React
   (pública)         proceso de carga        cities, conditions,          (solo lee)
                                              current_weather
```

- **Obtención:** el script consulta el clima de una lista fija de ciudades. Si una ciudad falla, lo reporta y continúa con las demás; si fallan todas, se detiene.
- **Persistencia:** tres tablas relacionadas. `cities` guarda cada ciudad una vez, `conditions` es el catálogo de condiciones y `current_weather` tiene una fila por ciudad con la última lectura. Se usa `upsert` por llave única, así que cargar varias veces no duplica datos.
- **Consumo:** la interfaz nunca llama a WeatherAPI; solo consulta Supabase con la llave publishable y RLS (lectura solo para usuarios autenticados).

> La búsqueda opera sobre las ciudades que cargó el script, ya que la interfaz no consulta el API público.

## Requisitos

- Node.js 18 o superior
- Un proyecto de Supabase
- Una OAuth App de GitHub
- Una API key de WeatherAPI.com (plan gratis)

## Instalación

```bash
git clone https://github.com/TU-USUARIO/clima-app.git
cd clima-app
npm install
cp .env.example .env.local
```

Rellena `.env.local` con tus valores:

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Llave publishable (pública, va en el navegador) |
| `SUPABASE_SECRET_KEY` | Llave secret (privada, solo para el script de carga) |
| `WEATHERAPI_KEY` | API key de WeatherAPI (solo para el script de carga) |

> `.env.local` está en `.gitignore`. No subas llaves al repositorio.

## Configuración de Supabase

1. Crea las tablas y políticas ejecutando `supabase/schema.sql` en el *SQL Editor*.
2. En **Authentication → Sign In / Providers**, activa **GitHub** con el Client ID y Client Secret de tu OAuth App.
3. En la OAuth App de GitHub, usa como callback `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
4. En **Authentication → URL Configuration**, pon como Site URL `http://localhost:5173` y agrega `http://localhost:5173/**` en Redirect URLs.

## Uso

Primero carga los datos (API pública → Supabase):

```bash
node scripts/load-weather.js
```

Después inicia la app:

```bash
npm run dev
```

Abre `http://localhost:5173` e inicia sesión con GitHub. Para actualizar el clima, vuelve a correr el script de carga.

## Estructura

```
scripts/
  load-weather.js       # carga API -> Supabase
  test-connection.js    # prueba de conexión
src/
  lib/supabase.js       # cliente de Supabase
  App.jsx               # login y sesión
  Weather.jsx           # dashboard, búsqueda y tarjetas
supabase/
  schema.sql            # tablas y políticas RLS
.env.example
```

## Tecnologías

Vite, React, Supabase (Auth y PostgreSQL), WeatherAPI.com.