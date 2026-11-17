import { createRealPowerShellService } from './realPowerShell.mjs'

const MAX_BODY = 64 * 1024
const SESSION_PATTERN = /^[A-Za-z0-9_-]{8,80}$/
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function isLoopback(req) {
  return LOOPBACK.has(req.socket?.remoteAddress ?? '')
}

function isLocalOrigin(origin) {
  if (!origin) return true
  try {
    const url = new URL(origin)
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return false
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > MAX_BODY) {
        reject(Object.assign(new Error('Corpo da requisição muito grande.'), { statusCode: 413 }))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!body.trim()) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(Object.assign(new Error('JSON inválido.'), { statusCode: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function validateRequest(req) {
  if (!isLoopback(req)) return { ok: false, status: 403, message: 'A execução real só aceita conexões locais.' }
  if (!isLocalOrigin(req.headers.origin)) return { ok: false, status: 403, message: 'Origem não autorizada.' }
  if (req.headers['x-pslab-real'] !== '1') return { ok: false, status: 403, message: 'Cabeçalho de segurança ausente.' }
  return { ok: true }
}

export function realPowerShellPlugin() {
  let service = null
  let started = false

  function ensureService(root) {
    if (!service) {
      service = createRealPowerShellService({ rootDir: root })
      started = true
    }
    return service
  }

  return {
    name: 'pslab-real-powershell',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      ensureService(root)
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://127.0.0.1')
        if (!url.pathname.startsWith('/api/pwsh/')) {
          next()
          return
        }

        const validation = validateRequest(req)
        if (!validation.ok) {
          sendJson(res, validation.status, { error: validation.message })
          return
        }

        try {
          if (req.method === 'GET' && url.pathname === '/api/pwsh/health') {
            sendJson(res, 200, await service.health())
            return
          }

          if (req.method === 'POST' && url.pathname === '/api/pwsh/exec') {
            if (!String(req.headers['content-type'] ?? '').includes('application/json')) {
              sendJson(res, 415, { error: 'Use Content-Type: application/json.' })
              return
            }
            const body = await readJson(req)
            const command = String(body.command ?? '')
            const sessionId = String(body.sessionId ?? '')
            if (!command.trim()) {
              sendJson(res, 400, { error: 'Comando vazio.' })
              return
            }
            if (command.length > 20_000) {
              sendJson(res, 400, { error: 'Comando muito longo (máximo de 20.000 caracteres).' })
              return
            }
            if (!SESSION_PATTERN.test(sessionId)) {
              sendJson(res, 400, { error: 'Identificador de sessão inválido.' })
              return
            }
            try {
              const result = await service.execute(sessionId, command)
              sendJson(res, 200, { ...result, real: true, sessionId })
            } catch (error) {
              const status = error.code === 'SESSION_BUSY' ? 429 : error.code === 'TIMEOUT' ? 504 : 500
              sendJson(res, status, {
                error: error.message,
                code: error.code ?? 'REAL_EXECUTION_ERROR',
                stderr: error.stderr ?? '',
              })
            }
            return
          }

          if (req.method === 'POST' && url.pathname === '/api/pwsh/reset') {
            const body = await readJson(req)
            const sessionId = String(body.sessionId ?? '')
            if (SESSION_PATTERN.test(sessionId)) service.reset(sessionId)
            sendJson(res, 200, { reset: true })
            return
          }

          sendJson(res, 404, { error: 'Endpoint de execução real não encontrado.' })
        } catch (error) {
          sendJson(res, error.statusCode ?? 500, { error: error.message || 'Erro no servidor de execução real.' })
        }
      })

      const dispose = () => {
        if (started && service) {
          service.dispose()
          service = null
          started = false
        }
      }
      server.httpServer?.once('close', dispose)
      process.once('exit', dispose)
    },
  }
}
