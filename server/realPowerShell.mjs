import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import os from 'node:os'
import path from 'node:path'

const ANSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
const MAX_OUTPUT = 180_000
const MAX_SESSIONS = 3
const IDLE_MS = 30 * 60 * 1000
const DEFAULT_TIMEOUT_MS = 30_000

function stripAnsi(value) {
  return String(value ?? '').replace(ANSI_PATTERN, '')
}

function truncateOutput(value) {
  const text = stripAnsi(value)
  if (text.length <= MAX_OUTPUT) return text
  return `${text.slice(0, MAX_OUTPUT)}\n[saída truncada pelo PS Lab]`
}

function commandExists(command) {
  try {
    const locator = process.platform === 'win32' ? 'where' : 'which'
    const result = spawnSync(locator, [command], { stdio: 'ignore', timeout: 2500 })
    return result.status === 0
  } catch {
    return false
  }
}

export function locatePowerShell(rootDir) {
  const candidates = []
  if (process.env.PSLAB_PWSH) candidates.push(process.env.PSLAB_PWSH)
  candidates.push(
    path.join(rootDir, '.tools', 'pwsh', process.platform === 'win32' ? 'pwsh.exe' : 'pwsh'),
    path.join(rootDir, '.tools', 'pwsh', 'pwsh'),
  )
  if (process.platform === 'win32') {
    candidates.push('pwsh.exe', 'powershell.exe')
  } else {
    candidates.push('pwsh')
  }

  for (const candidate of candidates) {
    if (!candidate) continue
    if (path.isAbsolute(candidate)) {
      if (existsSync(candidate)) return { path: candidate, source: 'local' }
      continue
    }
    if (commandExists(candidate)) return { path: candidate, source: 'path' }
  }
  return null
}

function execFileCapture(command, args, timeout) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
      windowsHide: true,
      env: {
        ...process.env,
        NO_COLOR: '1',
        TERM: 'dumb',
        POWERSHELL_TELEMETRY_OPTOUT: '1',
        POWERSHELL_UPDATECHECK: 'Off',
      },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => resolve({ ok: false, error: error.message, stdout, stderr }))
    child.on('close', (code) => resolve({ ok: code === 0, code, stdout: stdout.trim(), stderr: stderr.trim() }))
  })
}

class RealPowerShellSession {
  constructor({ shell, bridgePath, cwd, onExit }) {
    this.shell = shell
    this.bridgePath = bridgePath
    this.cwd = cwd
    this.onExit = onExit
    this.child = null
    this.pending = null
    this.stderr = ''
    this.sequence = 0
    this.lastUsed = Date.now()
    this.dead = false
  }

  start() {
    if (this.child && !this.dead) return
    this.dead = false
    this.stderr = ''
    this.child = spawn(this.shell, [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      this.bridgePath,
    ], {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        ...process.env,
        NO_COLOR: '1',
        TERM: 'dumb',
        POWERSHELL_TELEMETRY_OPTOUT: '1',
        POWERSHELL_UPDATECHECK: 'Off',
      },
    })

    this.child.stdout.setEncoding('utf8')
    this.child.stderr.setEncoding('utf8')
    const lines = createInterface({ input: this.child.stdout })
    lines.on('line', (line) => {
      if (!line.trim()) return
      let message
      try {
        message = JSON.parse(line)
      } catch {
        this.stderr += `${line}\n`
        return
      }
      const pending = this.pending
      if (!pending || pending.id !== String(message.id ?? '')) return
      this.pending = null
      clearTimeout(pending.timer)
      this.cwd = message.cwd || this.cwd
      this.lastUsed = Date.now()
      pending.resolve({
        ok: Boolean(message.ok),
        output: truncateOutput(message.output),
        error: message.error ? stripAnsi(message.error) : null,
        stderr: truncateOutput(this.stderr).trim(),
        exitCode: Number(message.exitCode ?? (message.ok ? 0 : 1)),
        cwd: this.cwd,
        kind: message.kind ?? 'result',
        durationMs: Date.now() - pending.startedAt,
      })
      this.stderr = ''
    })

    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk
      if (this.stderr.length > MAX_OUTPUT) this.stderr = this.stderr.slice(-MAX_OUTPUT)
    })

    this.child.on('error', (error) => {
      this.dead = true
      this.rejectPending({
        error: `Falha ao iniciar o PowerShell: ${error.message}`,
        stderr: stripAnsi(this.stderr),
      })
    })

    this.child.on('exit', (code, signal) => {
      this.dead = true
      this.child = null
      this.rejectPending({
        error: `A sessão do PowerShell terminou (${signal ?? `código ${code}`}).`,
        stderr: stripAnsi(this.stderr).trim(),
      })
      this.onExit?.()
    })
  }

  rejectPending(details) {
    if (!this.pending) return
    const pending = this.pending
    this.pending = null
    clearTimeout(pending.timer)
    pending.reject(Object.assign(new Error(details.error || 'Sessão do PowerShell indisponível.'), details))
  }

  async exec(command, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (this.pending) {
      const error = new Error('Já existe um comando em execução nesta sessão.')
      error.code = 'SESSION_BUSY'
      throw error
    }
    this.start()
    if (!this.child) {
      const error = new Error('Não foi possível iniciar o PowerShell.')
      error.code = 'SHELL_UNAVAILABLE'
      throw error
    }
    this.lastUsed = Date.now()
    const id = String(++this.sequence)
    const startedAt = Date.now()
    const encoded = Buffer.from(command, 'utf8').toString('base64')

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.dead = true
        if (this.child) {
          this.child.kill('SIGKILL')
          this.child = null
        }
        this.pending = null
        const error = new Error(`O comando excedeu ${Math.round(timeoutMs / 1000)}s e foi interrompido.`)
        error.code = 'TIMEOUT'
        reject(error)
      }, timeoutMs)

      this.pending = { id, resolve, reject, timer, startedAt }
      try {
        this.child.stdin.write(`${JSON.stringify({ id, script: encoded })}\n`, 'utf8')
      } catch (error) {
        clearTimeout(timer)
        this.pending = null
        this.dead = true
        reject(error)
      }
    })
  }

  dispose() {
    this.rejectPending({ error: 'Sessão do PowerShell encerrada.' })
    if (this.child) {
      try { this.child.kill('SIGTERM') } catch {}
      this.child = null
    }
    this.dead = true
  }
}

export function createRealPowerShellService({ rootDir, initialCwd = os.homedir() }) {
  let shell = locatePowerShell(rootDir)
  const bridgePath = path.join(rootDir, 'server', 'bridge.ps1')
  const sessions = new Map()
  let versionPromise = null
  let cleanupTimer = null

  function refreshShellDetection() {
    if (!shell || !existsSync(shell.path)) {
      const detected = locatePowerShell(rootDir)
      if (detected?.path !== shell?.path) versionPromise = null
      shell = detected
    }
    return shell
  }

  async function getVersion() {
    if (!refreshShellDetection()) return null
    if (!versionPromise) {
      versionPromise = execFileCapture(shell.path, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], 5000)
        .then((result) => {
          if (!result.ok) {
            versionPromise = null
            return null
          }
          return result.stdout
        })
        .catch(() => {
          versionPromise = null
          return null
        })
    }
    return versionPromise
  }

  async function health() {
    refreshShellDetection()
    if (!shell || !existsSync(bridgePath)) {
      return {
        available: false,
        reason: !shell ? 'pwsh_not_found' : 'bridge_not_found',
        platform: process.platform,
        initialCwd,
        home: os.homedir(),
      }
    }
    const version = await getVersion()
    return {
      available: Boolean(version),
      reason: version ? null : 'pwsh_failed_to_start',
      version,
      platform: process.platform,
      initialCwd,
      home: os.homedir(),
      shellPath: shell.path,
      shellSource: shell.source,
      interactive: false,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    }
  }

  function getSession(sessionId) {
    let session = sessions.get(sessionId)
    if (session && session.dead) {
      sessions.delete(sessionId)
      session = null
    }
    if (!session) {
      if (sessions.size >= MAX_SESSIONS) {
        const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0]
        if (oldest) {
          oldest[1].dispose()
          sessions.delete(oldest[0])
        }
      }
      session = new RealPowerShellSession({
        shell: shell.path,
        bridgePath,
        cwd: initialCwd,
        onExit: () => {
          if (sessions.get(sessionId)?.dead) sessions.delete(sessionId)
        },
      })
      sessions.set(sessionId, session)
    }
    return session
  }

  async function execute(sessionId, command) {
    refreshShellDetection()
    if (!shell) {
      const error = new Error('PowerShell não está disponível neste computador.')
      error.code = 'SHELL_UNAVAILABLE'
      throw error
    }
    if (!existsSync(bridgePath)) {
      const error = new Error('A ponte de execução real não foi encontrada.')
      error.code = 'BRIDGE_NOT_FOUND'
      throw error
    }
    const session = getSession(sessionId)
    return session.exec(command)
  }

  function reset(sessionId) {
    const session = sessions.get(sessionId)
    if (session) session.dispose()
    sessions.delete(sessionId)
  }

  function dispose() {
    if (cleanupTimer) clearInterval(cleanupTimer)
    sessions.forEach((session) => session.dispose())
    sessions.clear()
  }

  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - IDLE_MS
    for (const [id, session] of sessions.entries()) {
      if (!session.pending && session.lastUsed < cutoff) {
        session.dispose()
        sessions.delete(id)
      }
    }
  }, 5 * 60 * 1000)
  cleanupTimer.unref?.()

  return { health, execute, reset, dispose, shell }
}
