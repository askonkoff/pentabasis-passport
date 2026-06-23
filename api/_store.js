// Passport storage layer.
//
// Two interchangeable implementations behind one tiny interface:
//   - Postgres  → used in production (Vercel), when a connection string env var is set.
//   - In-memory → used for local dev / preview, when no DB is configured. NOT persistent.
//
// The handlers only ever call create / get / update — so swapping the backend
// (or later adding per-owner access control) never touches the API surface.

import pg from 'pg'

const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  ''

let impl

export function getStore () {
  if (!impl) impl = CONN ? pgStore() : memStore()
  return impl
}

// ---------------------------------------------------------------------------
// In-memory (no DATABASE_URL) — only for local runs, data lives until restart.
// ---------------------------------------------------------------------------
function memStore () {
  if (!globalThis.__passportMem) globalThis.__passportMem = new Map()
  const m = globalThis.__passportMem
  console.warn(
    '[passport] No DATABASE_URL set — using in-memory store. Data is NOT persisted.'
  )
  return {
    async create ({ id, data, editToken, title }) {
      const now = new Date().toISOString()
      m.set(id, { id, data, edit_token: editToken, title, created_at: now, updated_at: now })
      return { id }
    },
    async get (id) {
      return m.get(id) || null
    },
    async update (id, { data, title }) {
      const row = m.get(id)
      if (!row) return null
      row.data = data
      if (title != null) row.title = title
      row.updated_at = new Date().toISOString()
      return { id: row.id }
    }
  }
}

// ---------------------------------------------------------------------------
// Postgres (Neon / any Postgres). One table, created on first use.
// ---------------------------------------------------------------------------
function pgStore () {
  const { Pool } = pg
  // Railway's private network (postgres.railway.internal) speaks plain TCP — no
  // SSL. Any external host (Neon, Supabase, Railway public proxy) gets lenient
  // SSL. So enable SSL everywhere EXCEPT the internal host / explicit disable.
  const useSsl = !/railway\.internal/.test(CONN) && !/sslmode=disable/.test(CONN)
  const pool = new Pool({
    connectionString: CONN,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 3
  })

  let ready
  function ensure () {
    if (!ready) {
      ready = pool.query(`
        create table if not exists passports (
          id          text primary key,
          data        jsonb       not null default '{}'::jsonb,
          edit_token  text,
          title       text,
          created_at  timestamptz not null default now(),
          updated_at  timestamptz not null default now()
        )
      `)
    }
    return ready
  }

  return {
    async create ({ id, data, editToken, title }) {
      await ensure()
      await pool.query(
        'insert into passports (id, data, edit_token, title) values ($1, $2, $3, $4)',
        [id, JSON.stringify(data), editToken, title]
      )
      return { id }
    },
    async get (id) {
      await ensure()
      const r = await pool.query(
        'select id, data, title, updated_at from passports where id = $1',
        [id]
      )
      return r.rows[0] || null
    },
    async update (id, { data, title }) {
      await ensure()
      const r = await pool.query(
        'update passports set data = $2, title = $3, updated_at = now() where id = $1 returning id',
        [id, JSON.stringify(data), title]
      )
      return r.rows[0] || null
    }
  }
}
