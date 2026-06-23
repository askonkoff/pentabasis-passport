// POST /api/passport  →  create a new passport, return { id, edit_token }
//
// The id is an unguessable 128-bit token, so a passport is private-by-link:
// there is no public list and the URL can't be enumerated.
// edit_token is stored now (unused in v1) so we can later lock editing to the
// owner without breaking existing links.

import { randomBytes } from 'node:crypto'
import { getStore } from '../_store.js'

const genToken = (bytes = 16) => randomBytes(bytes).toString('base64url')

export default async function handler (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const body = req.body || {}
    const data = body.data && typeof body.data === 'object' ? body.data : {}

    const id = genToken(16)
    const editToken = genToken(16)
    const title = String(data.proj || '').slice(0, 200)

    await getStore().create({ id, data, editToken, title })

    return res.status(200).json({ id, edit_token: editToken })
  } catch (e) {
    console.error('[passport] create failed:', e)
    return res.status(500).json({ error: 'server_error' })
  }
}
