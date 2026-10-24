import { createServer as createHttpServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { createReadStream, readFileSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const isDevelopment = process.argv.includes('--dev')
const port = Number(process.env.PORT || (isDevelopment ? 5173 : 4173))
const maxBodyBytes = 20_000
const allowedMoods = new Set(['Peaceful', 'Worn out', 'Restless', 'Hopeful'])
const allowedPlaces = new Set(['Moonlit forest', 'Rainy cabin', 'Quiet ocean', 'Cloud garden'])
const allowedLengths = new Set(['2 min', '5 min', '10 min'])
const rateWindowMs = 60_000
const rateLimit = 12
const requestLog = new Map()

loadEnvFile('.env')
loadEnvFile('.env.local')

const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

function loadEnvFile(filename) {
  try {
    const contents = requireText(filename)
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separator = trimmed.indexOf('=')
      if (separator < 1) continue
      const key = trimmed.slice(0, separator).trim()
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // Local .env files are optional. The app falls back gracefully without one.
  }
}

function requireText(filename) {
  return readFileSync(join(root, filename), 'utf8')
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  })
  response.end(body)
}

function clientKey(request) {
  const forwarded = request.headers['x-forwarded-for']
  return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : request.socket.remoteAddress || 'local'
}

function isRateLimited(request) {
  const key = clientKey(request)
  const now = Date.now()
  const recent = (requestLog.get(key) || []).filter((timestamp) => now - timestamp < rateWindowMs)
  recent.push(now)
  requestLog.set(key, recent)
  return recent.length > rateLimit
}

function readRequestBody(request) {
  return new Promise((resolveBody, reject) => {
    let size = 0
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk)
      if (size > maxBodyBytes) {
        reject(new Error('body_too_large'))
        request.destroy()
        return
      }
      body += chunk
    })
    request.on('end', () => resolveBody(body))
    request.on('error', reject)
  })
}

function cleanName(value) {
  if (typeof value !== 'string') return ''
  return [...value].filter((character) => {
    const code = character.charCodeAt(0)
    return code >= 32 && code !== 127
  }).join('').trim().slice(0, 60)
}

function validateStoryInput(body) {
  const input = body && typeof body === 'object' ? body : {}
  const mood = input.mood
  const place = input.place
  const length = input.length
  const name = cleanName(input.name)
  if (!allowedMoods.has(mood) || !allowedPlaces.has(place) || !allowedLengths.has(length)) return null
  return { mood, place, length, name }
}

function storyPrompt({ mood, place, length, name }) {
  return `Write a gentle, sleep-friendly ${length} bedtime story. The listener feels ${mood.toLowerCase()} and would like a ${place.toLowerCase()} setting. ${name ? `Their name is ${name}.` : ''} Use calm, simple language. No danger, suspense, conflict, or loud events. Avoid headings and lists. End with a soft invitation to rest.`
}

async function handleStory(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method_not_allowed' })
    return
  }
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: 'rate_limited' })
    return
  }
  if (!process.env.OPENROUTER_API_KEY) {
    sendJson(response, 503, { error: 'openrouter_not_configured' })
    return
  }

  let input
  try {
    input = validateStoryInput(JSON.parse(await readRequestBody(request)))
  } catch (error) {
    sendJson(response, error.message === 'body_too_large' ? 413 : 400, { error: 'invalid_request' })
    return
  }
  if (!input) {
    sendJson(response, 400, { error: 'invalid_request' })
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-OpenRouter-Title': 'SlowSleep',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You write short, gentle bedtime stories for adults. Use calm, simple language. No danger, suspense, conflict, or loud events. Never use lists or headings. End with a soft invitation to rest.' },
          { role: 'user', content: storyPrompt(input) },
        ],
        max_tokens: 420,
        temperature: 0.8,
      }),
      signal: controller.signal,
    })

    if (!upstream.ok) {
      const statusMap = { 401: 'upstream_unauthorized', 402: 'upstream_credits', 429: 'rate_limited' }
      sendJson(response, statusMap[upstream.status] ? upstream.status : 502, { error: statusMap[upstream.status] || 'upstream_unavailable' })
      return
    }

    const data = await upstream.json()
    const story = data?.choices?.[0]?.message?.content?.trim()
    if (!story) {
      sendJson(response, 502, { error: 'empty' })
      return
    }
    sendJson(response, 200, { story, model: data?.model || model })
  } catch (error) {
    sendJson(response, error.name === 'AbortError' ? 504 : 502, { error: error.name === 'AbortError' ? 'upstream_timeout' : 'upstream_unavailable' })
  } finally {
    clearTimeout(timeout)
  }
}

function isApiPath(url) {
  return typeof url === 'string' && url.split('?')[0] === '/api/story'
}

function contentType(filename) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' }
  return types[extname(filename)] || 'application/octet-stream'
}

async function serveProductionFile(request, response) {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0])
  const candidate = requestPath === '/' ? '/index.html' : requestPath
  const filePath = resolve(join(root, 'dist', normalize(candidate)))
  const distRoot = resolve(join(root, 'dist'))
  const safePath = filePath.startsWith(`${distRoot}/`) || filePath === distRoot
  if (safePath) {
    try {
      const fileStats = await stat(filePath)
      if (fileStats.isFile()) {
        response.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
        createReadStream(filePath).pipe(response)
        return
      }
    } catch {
      // SPA fallback below.
    }
  }
  const index = await readFile(join(root, 'dist', 'index.html'))
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
  response.end(index)
}

async function start() {
  const vite = isDevelopment ? await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }) : null
  const server = createHttpServer(async (request, response) => {
    if (isApiPath(request.url)) {
      await handleStory(request, response)
      return
    }

    if (isDevelopment) {
      vite.middlewares(request, response, async () => {
        try {
          let html = await readFile(join(root, 'index.html'), 'utf8')
          html = await vite.transformIndexHtml(request.url || '/', html)
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          response.end(html)
        } catch (error) {
          vite.ssrFixStacktrace(error)
          response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
          response.end(error.stack)
        }
      })
      return
    }

    await serveProductionFile(request, response)
  })

  server.listen(port, () => {
    process.stdout.write(`SlowSleep server listening at http://localhost:${port}\n`)
  })
}

start().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`)
  process.exitCode = 1
})
