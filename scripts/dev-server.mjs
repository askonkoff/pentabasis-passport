// Local dev server — `npm run dev` → http://localhost:3000
//
// Emulates just enough of Vercel to run the SAME api/ handlers locally:
//   - parses JSON bodies and the /api/passport/:id param
//   - adapts Node's (req, res) to the Vercel-style res.status().json() API
//   - rewrites /p/<id> to index.html (mirrors vercel.json)
// With no DATABASE_URL set, the store falls back to in-memory (see api/_store.js).

import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import createHandler from '../api/passport/index.js'
import idHandler from '../api/passport/[id].js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = process.env.PORT || 3000

const CTYPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

function vercelRes (res) {
  return {
    _status: 200,
    status (code) { this._status = code; return this },
    setHeader (k, v) { res.setHeader(k, v); return this },
    json (obj) {
      res.writeHead(this._status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(obj))
    },
    send (body) { res.writeHead(this._status); res.end(body) }
  }
}

function readBody (req) {
  return new Promise((resolve) => {
    let buf = ''
    req.on('data', (c) => { buf += c })
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}) } catch { resolve({}) }
    })
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const p = url.pathname

  try {
    // --- API: collection (create) ---
    if (p === '/api/passport' || p === '/api/passport/') {
      req.body = await readBody(req)
      req.query = {}
      return void createHandler(req, vercelRes(res))
    }

    // --- API: single passport (read / update) ---
    const m = p.match(/^\/api\/passport\/([^/]+)$/)
    if (m) {
      req.body = await readBody(req)
      req.query = { id: decodeURIComponent(m[1]) }
      return void idHandler(req, vercelRes(res))
    }

    // --- App: / and /p/<id> both serve the form ---
    if (p === '/' || /^\/p\//.test(p)) {
      const html = await readFile(path.join(ROOT, 'index.html'))
      res.writeHead(200, { 'Content-Type': CTYPE['.html'] })
      return void res.end(html)
    }

    // --- Static files (fonts are remote; this is just for local assets) ---
    const fp = path.normalize(path.join(ROOT, p))
    if (fp.startsWith(ROOT)) {
      try {
        const file = await readFile(fp)
        res.writeHead(200, { 'Content-Type': CTYPE[path.extname(fp)] || 'application/octet-stream' })
        return void res.end(file)
      } catch { /* fall through to 404 */ }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  } catch (e) {
    console.error(e)
    res.writeHead(500)
    res.end('Server error')
  }
})

server.listen(PORT, () => {
  console.log(`Пентабазис-паспорт · dev → http://localhost:${PORT}`)
})
