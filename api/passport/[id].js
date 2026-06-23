// GET /api/passport/:id  →  read a passport  { id, data, title, updated_at }
// PUT /api/passport/:id  →  save changes     { ok: true }
//
// v1 access model (chosen): anyone with the link can view AND edit.
// Privacy comes from the unguessable id. When we later roll out to individual
// passports, this PUT is where we'll require the edit_token.

import { getStore } from '../_store.js'

export default async function handler (req, res) {
  const id = req.query.id
  if (!id) return res.status(400).json({ error: 'missing_id' })

  const store = getStore()

  try {
    if (req.method === 'GET') {
      const row = await store.get(id)
      if (!row) return res.status(404).json({ error: 'not_found' })
      return res.status(200).json({
        id: row.id,
        data: row.data || {},
        title: row.title || '',
        updated_at: row.updated_at
      })
    }

    if (req.method === 'PUT') {
      const body = req.body || {}
      const data = body.data && typeof body.data === 'object' ? body.data : {}
      const title = String(data.proj || '').slice(0, 200)

      const row = await store.update(id, { data, title })
      if (!row) return res.status(404).json({ error: 'not_found' })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'method_not_allowed' })
  } catch (e) {
    console.error('[passport] op failed:', e)
    return res.status(500).json({ error: 'server_error' })
  }
}
