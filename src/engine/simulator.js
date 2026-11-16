import {
  splitStatements,
  splitPipeline,
  tokenizeStage,
} from './parser.js'
import {
  COMMANDS,
  findCommand,
  isSwitchName,
} from '../data/catalog.js'

class ShellError extends Error {
  constructor(message, hint = '', code = '') {
    super(message)
    this.name = 'ShellError'
    this.hint = hint
    this.code = code
  }
}

const now = () => new Date()
const pad = (value) => String(value).padStart(2, '0')

function formatDate(date = now(), withTime = true) {
  const base = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  return withTime ? `${base} ${pad(date.getHours())}:${pad(date.getMinutes())}` : base
}

function formatDateTimeFull(date = now()) {
  const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
  return `${weekdays[date.getDay()]}, ${date.getDate()} de ${date.toLocaleDateString('pt-BR', { month: 'long' })} de ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function humanBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return ''
  const value = Number(bytes)
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = -1
  do {
    size /= 1024
    unitIndex += 1
  } while (size >= 1024 && unitIndex < units.length - 1)
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

function cloneWorld(world) {
  return typeof structuredClone === 'function' ? structuredClone(world) : JSON.parse(JSON.stringify(world))
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wildcardToRegExp(pattern) {
  return new RegExp(`^${String(pattern).split('*').map(escapeRegExp).join('.*')}$`, 'i')
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  const text = String(value ?? '').trim()
  const match = text.match(/^(-?\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i)
  if (!match) return fallback
  const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  return Number(match[1]) * (units[(match[2] ?? 'B').toUpperCase()] ?? 1)
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  const text = String(value ?? '').trim().toLowerCase()
  return text === 'true' || text === '$true' || text === '1' || text === 'yes' || text === 'sim'
}

function levenshtein(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, index) => [index])
  for (let column = 0; column <= b.length; column += 1) rows[0][column] = column
  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      )
    }
  }
  return rows[a.length][b.length]
}

function closestCommands(name, limit = 3) {
  const target = String(name ?? '').toLowerCase().replace(/[^a-z-]/g, '')
  if (!target) return []
  return COMMANDS
    .map((command) => {
      const candidate = command.name.toLowerCase()
      const candidateCompact = candidate.replace(/-/g, '')
      const targetCompact = target.replace(/-/g, '')
      let score = levenshtein(target, candidate)
      if (candidate.startsWith(target)) score -= 3
      if (candidateCompact.startsWith(targetCompact)) score -= 4
      if (candidate.includes(target)) score -= 2
      if (target.length <= 3) score += 4
      return { command, score }
    })
    .filter((item) => item.score < Math.max(4, target.length * 0.7))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((item) => item.command.name)
}

function commandModule(command) {
  if (!command) return 'PowerShellLab'
  const modules = {
    ad: 'ActiveDirectory',
    rede: 'NetTCPIP',
    registro: 'Microsoft.PowerShell.Management',
    seguranca: 'Microsoft.PowerShell.LocalAccounts',
    automacao: 'ScheduledTasks',
    modulos: 'PowerShellGet',
    remoting: 'Microsoft.PowerShell.Core',
  }
  return modules[command.cat] ?? 'Microsoft.PowerShell.Management'
}

// ── Variáveis e expressões ─────────────────────────────────────

const AUTOMATIC_ENV = {
  PATH: 'C:\\Windows\\System32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Program Files\\PowerShell\\7;',
  TEMP: 'C:\\Users\\miguel\\AppData\\Local\\Temp',
  TMP: 'C:\\Users\\miguel\\AppData\\Local\\Temp',
  WINDIR: 'C:\\Windows',
  OS: 'Windows_NT',
  PROCESSOR_ARCHITECTURE: 'AMD64',
  PSModulePath: 'C:\\Users\\miguel\\Documents\\PowerShell\\Modules;C:\\Program Files\\PowerShell\\7\\Modules',
  USERPROFILE: 'C:\\Users\\miguel',
  HOMEDRIVE: 'C:',
  HOMEPATH: '\\Users\\miguel',
  SESSIONNAME: 'Console',
}

export function environmentVariables(world) {
  const values = {
    ...AUTOMATIC_ENV,
    USERNAME: world.variables?.USERNAME ?? 'miguel',
    COMPUTERNAME: world.hostname,
    USERDOMAIN: 'LAB',
    HOMEPATH: '\\Users\\miguel',
  }
  return Object.entries(values).map(([Name, Value]) => ({ Name, Value: String(Value) }))
}

function resolveVariable(name, world, locals = {}) {
  const rawName = String(name ?? '').trim().replace(/^\$/, '')
  const lower = rawName.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  if (lower === 'null') return null
  if (lower === '_') return locals._
  if (lower === 'pwd') return world.cwd
  if (lower === 'home') return world.variables?.HOME ?? 'C:\\Users\\miguel'
  if (lower === 'error') return world.errors ?? []
  if (lower === 'psversiontable') return world.variables?.PSVersionTable ?? {}

  if (lower.startsWith('env:')) {
    const envName = rawName.slice(4)
    const found = environmentVariables(world).find((entry) => entry.Name.toLowerCase() === envName.toLowerCase())
    return found?.Value ?? null
  }

  const [baseName, ...properties] = rawName.split('.')
  let value
  if (Object.prototype.hasOwnProperty.call(locals, baseName)) value = locals[baseName]
  else {
    const key = Object.keys(world.variables ?? {}).find((candidate) => candidate.toLowerCase() === baseName.toLowerCase())
    value = key ? world.variables[key] : undefined
  }
  if (value === undefined) {
    const env = environmentVariables(world).find((entry) => entry.Name.toLowerCase() === baseName.toLowerCase())
    if (env) value = env.Value
  }
  for (const property of properties) {
    if (value === null || value === undefined) return null
    if (Array.isArray(value) && property.toLowerCase() === 'count') {
      value = value.length
      continue
    }
    const propKey = Object.keys(value).find((candidate) => candidate.toLowerCase() === property.toLowerCase())
    value = propKey ? value[propKey] : undefined
  }
  return value
}

function interpolate(text, world, locals = {}) {
  let output = String(text)
  output = output.replace(/\$\(([^()]*)\)/g, (_, expression) => {
    try {
      return stringifyValue(evaluateExpression(expression, world, locals))
    } catch {
      return ''
    }
  })
  output = output.replace(/\$([A-Za-z_][\w]*(?::[\w.]+)?(?:\.\w+)*)/g, (match, name) => {
    const value = resolveVariable(name, world, locals)
    return value === undefined || value === null ? '' : stringifyValue(value)
  })
  return output
}

function stringifyValue(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(stringifyValue).join(' ')
  if (typeof value === 'object') {
    if ('DateTime' in value) return value.DateTime
    return Object.values(value).map(stringifyValue).join(' ')
  }
  return String(value)
}

function tokenizeExpression(input) {
  const tokens = []
  let index = 0
  while (index < input.length) {
    const char = input[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (input.startsWith('$true', index) || input.startsWith('$false', index) || input.startsWith('$null', index)) {
      const match = input.slice(index).match(/^\$(true|false|null)/i)
      tokens.push({ type: 'literal', value: match[1].toLowerCase() === 'null' ? null : match[1].toLowerCase() === 'true' })
      index += match[0].length
      continue
    }
    if (char === '$') {
      const match = input.slice(index).match(/^\$[A-Za-z_][\w]*(?::[\w.]+)?(?:\.\w+)*/)
      if (match) {
        tokens.push({ type: 'variable', value: match[0].slice(1) })
        index += match[0].length
        continue
      }
    }
    if (char === "'" || char === '"') {
      const quote = char
      let value = ''
      let cursor = index + 1
      while (cursor < input.length) {
        if (input[cursor] === quote) {
          if (input[cursor + 1] === quote) {
            value += quote
            cursor += 2
            continue
          }
          cursor += 1
          break
        }
        if (input[cursor] === '`' && cursor + 1 < input.length) {
          value += input[cursor + 1]
          cursor += 2
          continue
        }
        value += input[cursor]
        cursor += 1
      }
      tokens.push({ type: 'string', value, quote })
      index = cursor
      continue
    }
    const numberMatch = input.slice(index).match(/^-?\d+(?:\.\d+)?(?:[KMGT]B)?/i)
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] })
      index += numberMatch[0].length
      continue
    }
    const opMatch = input.slice(index).match(/^-(eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains|and|or)\b/i)
    if (opMatch) {
      tokens.push({ type: 'operator', value: opMatch[1].toLowerCase() })
      index += opMatch[0].length
      continue
    }
    const single = input[index]
    if ('+-*/%()'.includes(single)) {
      tokens.push({ type: 'operator', value: single })
      index += 1
      continue
    }
    const wordMatch = input.slice(index).match(/^[^\s()]+/)
    if (wordMatch) {
      tokens.push({ type: 'bare', value: wordMatch[0] })
      index += wordMatch[0].length
      continue
    }
    index += 1
  }
  return tokens
}

function compareValues(left, operator, right) {
  const normalizedOp = operator.toLowerCase()
  if (normalizedOp === 'eq') return stringifyValue(left).toLowerCase() === stringifyValue(right).toLowerCase()
  if (normalizedOp === 'ne') return stringifyValue(left).toLowerCase() !== stringifyValue(right).toLowerCase()
  if (normalizedOp === 'like') return wildcardToRegExp(right).test(stringifyValue(left))
  if (normalizedOp === 'notlike') return !wildcardToRegExp(right).test(stringifyValue(left))
  if (normalizedOp === 'match') return new RegExp(String(right), 'i').test(stringifyValue(left))
  if (normalizedOp === 'notmatch') return !new RegExp(String(right), 'i').test(stringifyValue(left))
  if (normalizedOp === 'contains') return Array.isArray(left) ? left.includes(right) : stringifyValue(left).includes(stringifyValue(right))
  if (normalizedOp === 'notcontains') return !(Array.isArray(left) ? left.includes(right) : stringifyValue(left).includes(stringifyValue(right)))
  const a = typeof left === 'number' || typeof right === 'number' ? toNumber(left) : stringifyValue(left).toLowerCase()
  const b = typeof left === 'number' || typeof right === 'number' ? toNumber(right) : stringifyValue(right).toLowerCase()
  if (normalizedOp === 'gt') return a > b
  if (normalizedOp === 'ge') return a >= b
  if (normalizedOp === 'lt') return a < b
  if (normalizedOp === 'le') return a <= b
  return false
}

export function evaluateExpression(expression, world, locals = {}) {
  const tokens = tokenizeExpression(String(expression).trim())
  let index = 0

  const peek = () => tokens[index]
  const consume = () => tokens[index++]
  const expectOperator = (value) => {
    const token = peek()
    if (token?.type === 'operator' && token.value === value) {
      index += 1
      return true
    }
    return false
  }

  const parsePrimary = () => {
    const token = consume()
    if (!token) return null
    if (token.type === 'number') return toNumber(token.value)
    if (token.type === 'string') return token.quote === '"' ? interpolate(token.value, world, locals) : token.value
    if (token.type === 'variable') return resolveVariable(token.value, world, locals)
    if (token.type === 'literal') return token.value
    if (token.type === 'bare') {
      if (/^(true|false)$/i.test(token.value)) return token.value.toLowerCase() === 'true'
      if (/^null$/i.test(token.value)) return null
      return token.value
    }
    if (token.type === 'operator' && token.value === '(') {
      const value = parseOr()
      expectOperator(')')
      return value
    }
    if (token.type === 'operator' && (token.value === '-' || token.value === '+')) {
      const value = parsePrimary()
      return token.value === '-' ? -toNumber(value) : toNumber(value)
    }
    return null
  }

  const parseMul = () => {
    let left = parsePrimary()
    while (peek()?.type === 'operator' && ['*', '/', '%'].includes(peek().value)) {
      const operator = consume().value
      const right = parsePrimary()
      if (operator === '*') left = toNumber(left) * toNumber(right)
      if (operator === '/') left = toNumber(right) === 0 ? 0 : toNumber(left) / toNumber(right)
      if (operator === '%') left = toNumber(right) === 0 ? 0 : toNumber(left) % toNumber(right)
    }
    return left
  }

  const parseAdd = () => {
    let left = parseMul()
    while (peek()?.type === 'operator' && ['+', '-'].includes(peek().value)) {
      const operator = consume().value
      const right = parseMul()
      if (operator === '+') {
        left = typeof left === 'string' || typeof right === 'string' ? stringifyValue(left) + stringifyValue(right) : toNumber(left) + toNumber(right)
      } else {
        left = toNumber(left) - toNumber(right)
      }
    }
    return left
  }

  const parseComparison = () => {
    let left = parseAdd()
    const comparisons = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains', 'notcontains']
    while (peek()?.type === 'operator' && comparisons.includes(peek().value)) {
      const operator = consume().value
      const right = parseAdd()
      left = compareValues(left, operator, right)
    }
    return left
  }

  const parseAnd = () => {
    let left = parseComparison()
    while (peek()?.type === 'operator' && peek().value === 'and') {
      consume()
      const right = parseComparison()
      left = Boolean(left) && Boolean(right)
    }
    return left
  }

  function parseOr() {
    let left = parseAnd()
    while (peek()?.type === 'operator' && peek().value === 'or') {
      consume()
      const right = parseAnd()
      left = Boolean(left) || Boolean(right)
    }
    return left
  }

  return parseOr()
}

function testPropertyFilter(object, expression, world) {
  const condition = String(expression ?? '').trim().replace(/^\{/, '').replace(/\}$/, '').trim()
  if (!condition) return true
  try {
    return Boolean(evaluateExpression(condition, world, { _: object }))
  } catch {
    return false
  }
}

// ── Caminhos ────────────────────────────────────────────────────

function expandEnvironment(text, world) {
  return String(text ?? '').replace(/%([^%]+)%/g, (_, name) => {
    const env = environmentVariables(world).find((item) => item.Name.toLowerCase() === name.toLowerCase())
    return env?.Value ?? ''
  }).replace(/\$env:([A-Za-z_][\w]*)/gi, (_, name) => resolveVariable(`env:${name}`, world) ?? '')
}

function getDriveRoot(world, letter = 'C') {
  return world.filesystem?.[`${letter.toUpperCase()}:`] ?? null
}

function getMappingForDrive(world, letter) {
  return (world.network?.mappings ?? []).find((mapping) => mapping.LocalPath.toLowerCase().startsWith(`${letter.toLowerCase()}:`))
}

function getShareByUnc(world, unc) {
  const match = String(unc).match(/^\\\\[^\\]+\\([^\\]+)/)
  if (!match) return null
  return (world.network?.shares ?? []).find((share) => share.Name.toLowerCase() === match[1].toLowerCase()) ?? null
}

function joinWindowsPath(base, child) {
  if (!child) return base
  if (child === '.') return base
  if (/^[A-Za-z]:\\?$/.test(child) || /^\\\\/.test(child) || /^[A-Za-z]+:/.test(child)) return child
  if (child.startsWith('\\')) return `${base.replace(/[\\/]+$/, '')}${child}`
  return `${base.replace(/[\\/]+$/, '')}\\${child.replace(/^[\\/]+/, '')}`
}

function normalizeSegments(path) {
  const segments = []
  String(path).replace(/\//g, '\\').split('\\').forEach((segment) => {
    if (!segment || segment === '.') return
    if (segment === '..') segments.pop()
    else segments.push(segment)
  })
  return segments
}

function resolveFsPath(world, rawPath = '') {
  const raw = String(rawPath ?? '').trim()
  const expandedRaw = expandEnvironment(raw, world)
  let virtualPrefix = null
  let basePath = expandedRaw

  if (!basePath || basePath === '.') basePath = world.cwd
  else if (basePath === '~') basePath = resolveVariable('HOME', world)
  else if (basePath.startsWith('~\\') || basePath.startsWith('~/')) {
    basePath = `${resolveVariable('HOME', world)}\\${basePath.slice(2)}`
  }

  if (/^env:\\?/i.test(basePath)) return { provider: 'env', exists: true, displayPath: 'Env:', env: true }

  const registryMatch = basePath.match(/^(hk(lm|cu)|hkey_(local_machine|current_user)):/i)
  if (registryMatch) return resolveRegistryPath(world, basePath)

  if (/^\\\\/.test(basePath)) {
    const share = getShareByUnc(world, basePath)
    if (!share) return { provider: 'fs', exists: false, error: `O caminho UNC '${raw}' não aponta para um compartilhamento conhecido.` }
    const rest = basePath.replace(/^\\\\[^\\]+\\[^\\]+/, '').replace(/^\\/, '')
    const fsPath = joinWindowsPath(share.Path, rest)
    const resolved = resolveFsAbsolute(world, fsPath)
    return {
      ...resolved,
      provider: 'fs',
      displayPath: basePath.replace(/\//g, '\\').replace(/\\+$/, '') || `\\\\SRV-FILE01\\${share.Name}`,
      share,
    }
  }

  const driveMatch = basePath.match(/^([A-Za-z]):(.*)$/)
  if (driveMatch) {
    const rootLetter = driveMatch[1].toUpperCase()
    const rest = driveMatch[2] ?? ''
    if (rootLetter !== 'C') {
      const mapping = getMappingForDrive(world, rootLetter)
      if (mapping) {
        const share = getShareByUnc(world, mapping.RemotePath)
        virtualPrefix = `${rootLetter}:`
        basePath = `${share?.Path ?? mapping.RemotePath}${rest}`
      } else if (!getDriveRoot(world, rootLetter)) {
        return { provider: 'fs', exists: false, error: `Não é possível encontrar a unidade '${rootLetter}:'.` }
      }
    }
  } else {
    basePath = `${world.cwd}\\${basePath}`
  }

  const resolved = resolveFsAbsolute(world, basePath)
  let displayPath = resolved.displayPath
  if (virtualPrefix) {
    const mapping = (world.network?.mappings ?? []).find((item) => item.LocalPath.toLowerCase().startsWith(virtualPrefix.toLowerCase()))
    const share = getShareByUnc(world, mapping?.RemotePath ?? '')
    if (share) {
      const suffix = resolved.displayPath.toLowerCase().startsWith(share.Path.toLowerCase())
        ? resolved.displayPath.slice(share.Path.length)
        : ''
      displayPath = (`${virtualPrefix}${suffix.startsWith('\\') ? '' : '\\'}${suffix}`).replace(/\\+$/, '') || `${virtualPrefix}\\`
      return { ...resolved, displayPath, provider: 'fs' }
    }
  }
  return { ...resolved, displayPath, provider: 'fs' }
}

function resolveFsAbsolute(world, absolutePath) {
  const normalized = String(absolutePath).replace(/\//g, '\\')
  const driveMatch = normalized.match(/^([A-Za-z]):(.*)$/)
  const letter = driveMatch?.[1]?.toUpperCase() ?? 'C'
  const root = getDriveRoot(world, letter)
  if (!root) return { provider: 'fs', exists: false, error: `A unidade ${letter}: não existe no laboratório.` }
  const rest = driveMatch ? driveMatch[2] : normalized
  const segments = normalizeSegments(rest)
  let node = root

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    if (!node || node.kind !== 'dir') {
      return {
        provider: 'fs', exists: false, node: null, root,
        parent: null, name: segments[segments.length - 1],
        displayPath: `${letter}:\\${segments.join('\\')}`,
        error: `O caminho '${normalized}' não existe.`,
      }
    }
    const child = node.children.find((item) => item.name.toLowerCase() === segment.toLowerCase())
    if (!child) {
      const parent = walkFs(root, segments.slice(0, index))
      return {
        provider: 'fs', exists: false, node: null, root,
        parent,
        name: segment,
        displayPath: `${letter}:\\${segments.join('\\')}`,
        error: `O caminho '${normalized}' não existe.`,
      }
    }
    node = child
  }

  return {
    provider: 'fs',
    exists: true,
    node,
    root,
    parent: segments.length ? walkFs(root, segments.slice(0, -1)) : null,
    name: segments[segments.length - 1] ?? `${letter}:`,
    displayPath: `${letter}:\\${segments.join('\\')}`,
    segments,
    rootLetter: letter,
  }
}

function walkFs(root, segments) {
  let node = root
  for (const segment of segments) {
    if (!node || node.kind !== 'dir') return null
    node = node.children.find((item) => item.name.toLowerCase() === segment.toLowerCase())
  }
  return node ?? null
}

function resolveRegistryPath(world, rawPath) {
  const normalized = String(rawPath).replace(/\//g, '\\')
  let rootKey = 'HKCU'
  let rest = normalized

  if (/^hklm:/i.test(normalized)) {
    rootKey = 'HKLM'
    rest = normalized.replace(/^hklm:?\\?/i, '')
  } else if (/^hkcu:/i.test(normalized)) {
    rootKey = 'HKCU'
    rest = normalized.replace(/^hkcu:?\\?/i, '')
  } else if (/^hkey_local_machine/i.test(normalized)) {
    rootKey = 'HKLM'
    rest = normalized.replace(/^hkey_local_machine:?\\?/i, '')
  } else if (/^hkey_current_user/i.test(normalized)) {
    rootKey = 'HKCU'
    rest = normalized.replace(/^hkey_current_user:?\\?/i, '')
  }

  const segments = normalizeSegments(rest)
  let key = world.registry?.[rootKey]
  const walked = []
  for (const segment of segments) {
    if (!key || key.kind !== 'key') {
      return {
        provider: 'registry', exists: false, rootKey, key: null,
        parent: null, name: segment,
        displayPath: `${rootKey}:\\${segments.join('\\')}`,
        error: `A chave de registro '${normalized}' não existe.`,
      }
    }
    const childName = Object.keys(key.children ?? {}).find((name) => name.toLowerCase() === segment.toLowerCase())
    if (!childName) {
      const parent = walkRegistry(world.registry?.[rootKey], walked)
      return {
        provider: 'registry', exists: false, rootKey, key: null,
        parent, name: segment,
        displayPath: `${rootKey}:\\${segments.join('\\')}`,
        error: `A chave de registro '${normalized}' não existe.`,
      }
    }
    walked.push(childName)
    key = key.children[childName]
  }

  return {
    provider: 'registry',
    exists: true,
    rootKey,
    key,
    parent: walked.length ? walkRegistry(world.registry?.[rootKey], walked.slice(0, -1)) : null,
    name: walked[walked.length - 1] ?? rootKey,
    displayPath: `${rootKey}:\\${walked.join('\\')}`.replace(/\\$/, ''),
    segments: walked,
  }
}

function walkRegistry(root, segments) {
  let key = root
  for (const segment of segments) {
    const childName = Object.keys(key?.children ?? {}).find((name) => name.toLowerCase() === segment.toLowerCase())
    if (!childName) return null
    key = key.children[childName]
  }
  return key ?? null
}

function ensureAbsoluteFs(world, resolved) {
  return resolved.displayPath || world.cwd
}

function parentPathOf(displayPath) {
  const normalized = String(displayPath).replace(/\\+$/, '')
  const index = normalized.lastIndexOf('\\')
  if (index <= 2) return normalized.slice(0, 3)
  return normalized.slice(0, index)
}

function baseNameOf(displayPath) {
  return String(displayPath).replace(/\\+$/, '').split('\\').pop()
}

function findChildByName(parent, name) {
  if (!parent?.children) return null
  return parent.children.find((child) => child.name.toLowerCase() === String(name).toLowerCase()) ?? null
}

function countFsEntries(node) {
  if (!node) return { files: 0, dirs: 0, bytes: 0 }
  let files = 0
  let dirs = 0
  let bytes = 0
  const visit = (current) => {
    if (current.kind === 'file') {
      files += 1
      bytes += current.size ?? 0
    } else {
      dirs += 1
      current.children?.forEach(visit)
    }
  }
  visit(node)
  return { files, dirs, bytes }
}

function fsNodeToObject(node, fullPath) {
  const isDir = node.kind === 'dir'
  return {
    Name: node.name,
    Length: isDir ? null : node.size ?? 0,
    LastWriteTime: node.modified,
    Mode: isDir ? 'd-----' : '-a----',
    FullName: fullPath,
    PSIsContainer: isDir,
    Extension: isDir ? '' : (node.name.match(/(\.[^.]+)$/)?.[1] ?? ''),
  }
}

function collectChildren(node, basePath, recursive = false, includeHidden = false) {
  const results = []
  const visit = (current, currentPath, depth) => {
    for (const child of current.children ?? []) {
      if (child.hidden && !includeHidden) continue
      const childPath = `${currentPath.replace(/\\$/, '')}\\${child.name}`
      results.push(fsNodeToObject(child, childPath))
      if (recursive && child.kind === 'dir' && depth < 8) visit(child, childPath, depth + 1)
    }
  }
  visit(node, basePath, 0)
  return results
}

function findFsNodeByPath(world, displayPath) {
  const resolved = resolveFsAbsolute(world, displayPath)
  return resolved.exists ? resolved.node : null
}

function removeFsNode(resolved) {
  if (!resolved.parent) throw new ShellError('Não é possível remover a raiz da unidade.', '')
  const index = resolved.parent.children.findIndex((child) => child.name.toLowerCase() === resolved.name.toLowerCase())
  if (index === -1) throw new ShellError(`O item '${resolved.displayPath}' não foi encontrado.`)
  resolved.parent.children.splice(index, 1)
  resolved.parent.modified = formatDate()
}

function enumerateEnvValues(world) {
  return environmentVariables(world).map((entry) => ({ Name: entry.Name, Value: entry.Value, Type: 'String' }))
}

// ── Metadados de saída ────────────────────────────────────────

function inferColumns(objects) {
  if (!Array.isArray(objects) || objects.length === 0) return []
  if (typeof objects[0] !== 'object' || objects[0] === null) {
    return [{ key: 'Value', label: 'Value', align: 'left' }]
  }
  return Object.keys(objects[0])
    .filter((key) => !key.startsWith('__'))
    .slice(0, 8)
    .map((key) => ({ key, label: key, align: typeof objects[0][key] === 'number' ? 'right' : 'left' }))
}

function inferMeta(objects, typeName = 'PSCustomObject', view = 'table') {
  const flat = (objects ?? []).map((item) => (typeof item === 'object' && item !== null ? item : { Value: item }))
  return {
    typeName,
    view: flat.length === 0 ? 'none' : view,
    columns: inferColumns(flat),
  }
}

function resultWith(objects, meta, extra = {}) {
  return {
    objects: objects ?? [],
    meta: meta ?? inferMeta(objects ?? []),
    effects: [],
    hostMessages: [],
    warnings: [],
    note: '',
    flags: {},
    ...extra,
  }
}

function tableMeta(columns, typeName = 'PSCustomObject') {
  return { typeName, view: 'table', columns }
}

function textResult(text, typeName = 'String') {
  return {
    objects: [],
    meta: { typeName, view: 'text', text: String(text), columns: [] },
    effects: [],
    hostMessages: [],
    warnings: [],
    note: '',
    flags: {},
  }
}

function fileInfoNode(world, resolved, node) {
  return fsNodeToObject(node, resolved.displayPath)
}

function effect(type, data = {}) {
  return { type, ...data }
}

function getParamNames(entry) {
  return new Set((entry?.params ?? []).map((param) => param.name.toLowerCase()))
}

function bindArguments(tokens, entry, world) {
  const args = { named: {}, flags: new Set(), positional: [], missing: [], raw: [] }
  let index = 0

  while (index < tokens.length) {
    const token = tokens[index]
    if (token.type === 'param') {
      const name = token.value.toLowerCase()
      const catalogParam = (entry?.params ?? []).find((param) => param.name.toLowerCase() === name)
      let inline = token.inlineValue
      if (inline !== null && inline !== undefined) {
        args.named[name] = inline.toLowerCase() === '$true' ? true : inline.toLowerCase() === '$false' ? false : inline
        index += 1
        continue
      }
      if (isSwitchName(name) || catalogParam?.switch) {
        args.flags.add(name)
        index += 1
        continue
      }
      const next = tokens[index + 1]
      if (next && next.type !== 'param') {
        args.named[name] = resolveToken(next, world, {})
        args.raw.push(next.raw)
        index += 2
      } else {
        args.flags.add(name)
        args.missing.push(name)
        index += 1
      }
      continue
    }
    const value = resolveToken(token, world, {})
    args.positional.push(value)
    args.raw.push(token.raw)
    index += 1
  }

  return args
}

function resolveToken(token, world, locals) {
  if (!token) return undefined
  if (token.type === 'string') return token.quote === "'" ? token.value : interpolate(token.value, world, locals)
  if (token.type === 'variable') return resolveVariable(token.value, world, locals)
  if (token.type === 'number') return toNumber(token.value)
  if (token.type === 'scriptblock') return { __scriptblock: token.value }
  if (token.type === 'group') return token.value
  if (token.type === 'subexpr') {
    try {
      return evaluateExpression(token.value, world, locals)
    } catch {
      return token.value
    }
  }
  return token.value
}

function arg(args, names, positionalIndex = null, fallback = undefined) {
  for (const name of names) {
    const key = name.toLowerCase()
    if (args.named[key] !== undefined) return args.named[key]
  }
  if (positionalIndex !== null && args.positional[positionalIndex] !== undefined) return args.positional[positionalIndex]
  return fallback
}

function flag(args, name) {
  return args.flags.has(name.toLowerCase())
}

function splitList(value) {
  if (value === undefined || value === null || value === '') return []
  if (Array.isArray(value)) return value.flatMap((item) => splitList(item))
  return String(value).split(/[,;]/).map((item) => item.trim()).filter(Boolean)
}

function sortByProperty(objects, property, descending = false) {
  const valueOf = (object) => {
    const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === String(property).toLowerCase())
    return key ? object[key] : ''
  }
  return [...objects].sort((a, b) => {
    const left = valueOf(a)
    const right = valueOf(b)
    const bothNumeric = typeof left === 'number' && typeof right === 'number'
    const comparison = bothNumeric
      ? left - right
      : stringifyValue(left).localeCompare(stringifyValue(right), 'pt-BR', { numeric: true, sensitivity: 'base' })
    return descending ? -comparison : comparison
  })
}

function normalizeFilterExpression(filter) {
  return String(filter ?? '').trim().replace(/^\{/, '').replace(/\}$/, '').trim()
}

function findADUser(world, identity) {
  if (!identity) return null
  const needle = String(identity).toLowerCase()
  return world.ad.users.find((user) =>
    [user.SamAccountName, user.Name, user.UserPrincipalName, user.DistinguishedName, user.EmailAddress]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === needle || String(value).toLowerCase().includes(needle)),
  ) ?? null
}

function resolveADPath(world, path) {
  if (!path) return world.ad.ous.find((ou) => ou.Name === 'Usuários')
  const needle = String(path).toLowerCase()
  return world.ad.ous.find((ou) =>
    ou.Name.toLowerCase() === needle ||
    ou.DistinguishedName.toLowerCase() === needle ||
    ou.DistinguishedName.toLowerCase().includes(needle),
  ) ?? null
}

function adUserRow(user, extraProperties = []) {
  const row = {
    Name: user.Name,
    SamAccountName: user.SamAccountName,
    Department: user.Department,
    Enabled: user.Enabled,
    Title: user.Title,
    LockedOut: user.LockedOut,
    DistinguishedName: user.DistinguishedName,
    UserPrincipalName: user.UserPrincipalName,
    EmailAddress: user.EmailAddress,
    OU: user.OU,
    Groups: user.Groups,
    LastLogon: user.LastLogon,
    Created: user.Created,
  }
  for (const property of extraProperties) {
    const key = Object.keys(user).find((candidate) => candidate.toLowerCase() === String(property).toLowerCase())
    if (key) row[key] = user[key]
  }
  return row
}

function adUserColumns(extraProperties = []) {
  const columns = [
    { key: 'Name', label: 'Name' },
    { key: 'SamAccountName', label: 'SamAccountName' },
    { key: 'Department', label: 'Department' },
    { key: 'Enabled', label: 'Enabled', align: 'center' },
  ]
  for (const property of extraProperties) {
    if (!columns.some((column) => column.key.toLowerCase() === property.toLowerCase())) {
      columns.push({ key: property, label: property })
    }
  }
  return columns
}

function getMetaText(objects, meta, fallback = '') {
  if (meta?.text) return meta.text
  const rows = (objects ?? []).map((object) => stringifyValue(object))
  return rows.length ? rows.join('\n') : fallback
}

function findKnownObject(array, name, keys = ['Name']) {
  if (!name) return null
  return array.find((item) => keys.some((key) => String(item[key] ?? '').toLowerCase() === String(name).toLowerCase())) ?? null
}

function normalizeValue(value) {
  return String(value).toLowerCase() === 'true'
}

// ── Executor principal ─────────────────────────────────────────

export function previewLine(line, world) {
  return executeLine(line, cloneWorld(world), { preview: true })
}

export function executeLine(line, world, options = {}) {
  const original = String(line ?? '')
  const result = {
    ok: true,
    input: original,
    statements: [],
    stages: [],
    objects: [],
    meta: { typeName: 'None', view: 'none', columns: [] },
    effects: [],
    hostMessages: [],
    warnings: [],
    errors: [],
    notes: [],
    flags: {},
    historyId: world.commandHistory?.length ? world.commandHistory[world.commandHistory.length - 1].Id + 1 : 1,
  }

  if (!original.trim()) return result

  if (!world.commandHistory) world.commandHistory = []
  if (!world.variables) world.variables = {}

  const statements = splitStatements(original)
  if (statements.length === 0) return result

  let lastStatementHadOutput = false

  for (const statement of statements) {
    const statementResult = executeStatement(statement, world, options)
    result.statements.push(statement)
    result.stages.push(...statementResult.stages)
    result.effects.push(...statementResult.effects)
    result.hostMessages.push(...statementResult.hostMessages)
    result.warnings.push(...statementResult.warnings)
    result.errors.push(...statementResult.errors)
    if (statementResult.note) result.notes.push(statementResult.note)
    if (statementResult.notes) result.notes.push(...statementResult.notes)
    result.flags = { ...result.flags, ...statementResult.flags }

    if (statementResult.objects?.length || (statementResult.meta?.view !== 'none' && statementResult.meta?.view !== undefined)) {
      result.objects = statementResult.objects
      result.meta = statementResult.meta
      lastStatementHadOutput = true
    }
    if (statementResult.errors?.length) result.ok = false
    if (statementResult.ok === false) result.ok = false
  }

  if (!lastStatementHadOutput) {
    result.meta = { typeName: 'None', view: 'none', columns: [] }
  }

  if (result.errors.length) {
    result.ok = false
    for (const error of result.errors) {
      world.errors = [error, ...(world.errors ?? [])].slice(0, 20)
    }
  }

  if (!options.preview && original.trim()) {
    world.commandHistory.push({
      Id: result.historyId,
      CommandLine: original.trim(),
      ExecutionStatus: result.ok ? 'Completed' : 'Failed',
      StartExecutionTime: formatDate(),
    })
  }

  result.notes = [...new Set(result.notes.filter(Boolean))]
  return result
}

function executeStatement(statement, world, options) {
  const assignmentMatch = statement.match(/^\s*\$([A-Za-z_][\w:]*)\s*(\+|-)?=\s*([\s\S]+)$/)
  if (assignmentMatch) {
    const [, name, operator, expression] = assignmentMatch
    try {
      const firstWord = expression.trim().split(/\s+/)[0]
      const looksLikeCommand = /^[A-Za-z][\w-]*-[A-Za-z]/.test(expression.trim()) || Boolean(findCommand(firstWord))
      let value
      if (looksLikeCommand) {
        const pipelineResult = executePipeline(expression, world)
        if (pipelineResult.errors.length) {
          return {
            ok: false, stages: pipelineResult.stages, effects: pipelineResult.effects,
            hostMessages: [], warnings: [], errors: pipelineResult.errors,
            note: '', flags: {}, objects: [], meta: { typeName: 'None', view: 'none', columns: [] },
          }
        }
        value = pipelineResult.objects.length === 1 ? pipelineResult.objects[0] : pipelineResult.objects
      } else {
        value = evaluateExpression(expression, world)
      }
      if (operator === '+' && world.variables[name] !== undefined) {
        value = typeof world.variables[name] === 'string'
          ? String(world.variables[name]) + stringifyValue(value)
          : toNumber(world.variables[name]) + toNumber(value)
      }
      if (operator === '-' && world.variables[name] !== undefined) {
        value = toNumber(world.variables[name]) - toNumber(value)
      }
      world.variables[name] = value
      return {
        ok: true,
        stages: [],
        effects: [],
        hostMessages: [],
        warnings: [],
        errors: [],
        note: `$${name} agora guarda ${formatVariablePreview(value)}.`,
        flags: {},
        objects: [],
        meta: { typeName: 'None', view: 'none', columns: [] },
      }
    } catch (error) {
      return {
        ok: false,
        stages: [],
        effects: [],
        hostMessages: [],
        warnings: [],
        errors: [{ message: error.message, hint: error.hint ?? 'Verifique a expressão e tente novamente.' }],
        note: '',
        flags: {},
        objects: [],
        meta: { typeName: 'None', view: 'none', columns: [] },
      }
    }
  }

  if (/^\s*(\$|'|"|-?\d)/.test(statement)) {
    try {
      const value = evaluateExpression(statement, world)
      return expressionResult(value)
    } catch (error) {
      return {
        ok: false,
        stages: [],
        effects: [],
        hostMessages: [],
        warnings: [],
        errors: [{ message: error.message, hint: 'Verifique a expressão digitada.' }],
        note: '',
        flags: {},
        objects: [],
        meta: { typeName: 'None', view: 'none', columns: [] },
      }
    }
  }

  return executePipeline(statement, world)
}

function expressionResult(value) {
  if (value === undefined || value === null) {
    return {
      ok: true,
      stages: [],
      effects: [],
      hostMessages: [],
      warnings: [],
      errors: [],
      notes: ['A expressão resultou em $null; o PowerShell não mostra nada.'],
      note: 'A expressão resultou em $null; o PowerShell não mostra nada.',
      flags: {},
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
    }
  }
  if (Array.isArray(value)) {
    const rows = value.map((item) => (typeof item === 'object' && item !== null ? item : { Value: item }))
    return {
      ok: true,
      stages: [],
      effects: [],
      hostMessages: [],
      warnings: [],
      errors: [],
      notes: [],
      note: `${rows.length} item(ns) na expressão.`,
      flags: {},
      objects: rows,
      meta: inferMeta(rows, 'PSCustomObject'),
    }
  }
  if (typeof value === 'object') {
    return {
      ok: true,
      stages: [],
      effects: [],
      hostMessages: [],
      warnings: [],
      errors: [],
      notes: [],
      note: '',
      flags: {},
      objects: [value],
      meta: {
        typeName: 'PSCustomObject',
        view: 'list',
        columns: Object.keys(value).map((key) => ({ key, label: key, align: typeof value[key] === 'number' ? 'right' : 'left' })),
      },
    }
  }
  const isBoolean = typeof value === 'boolean'
  return {
    ok: true,
    stages: [],
    effects: [],
    hostMessages: [],
    warnings: [],
    errors: [],
    notes: [],
    note: '',
    flags: {},
    objects: [{ Value: value }],
    meta: {
      typeName: isBoolean ? 'Boolean' : typeof value === 'number' ? 'Number' : 'String',
      view: 'text',
      text: stringifyValue(value),
      columns: [],
    },
  }
}

function formatVariablePreview(value) {
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} objeto(s)`
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    return '{ ' + keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', … }' : ' }')
  }
  return stringifyValue(value)
}

function executePipeline(statement, world) {
  const stageTexts = splitPipeline(statement)
  const result = {
    ok: true,
    stages: [],
    objects: [],
    meta: { typeName: 'None', view: 'none', columns: [] },
    effects: [],
    hostMessages: [],
    warnings: [],
    errors: [],
    notes: [],
    flags: {},
  }
  let inputObjects = []
  let inputMeta = null

  for (let index = 0; index < stageTexts.length; index += 1) {
    const rawStage = stageTexts[index]
    const tokens = tokenizeStage(rawStage)
    const stage = {
      index,
      raw: rawStage,
      cmdlet: '',
      args: [],
      inputCount: inputObjects.length,
      outputCount: 0,
      objects: [],
      meta: null,
      error: null,
      effects: [],
    }

    if (stageTexts.length > 1 && !rawStage.trim()) {
      stage.error = { message: 'Há um pipe sem comando depois dele.', hint: 'Digite o próximo cmdlet depois do |.' }
      result.stages.push(stage)
      result.errors.push(stage.error)
      result.ok = false
      break
    }

    if (tokens.length === 0 || tokens[0].type === 'param') {
      stage.error = { message: 'Comando incompleto.', hint: 'Comece pelo nome de um cmdlet, como Get-Process.' }
      result.stages.push(stage)
      result.errors.push(stage.error)
      result.ok = false
      break
    }

    const commandToken = tokens[0]
    const commandName = String(commandToken.value ?? '')
    stage.cmdlet = commandName
    const command = findCommand(commandName)
    if (!command) {
      const suggestions = closestCommands(commandName)
      stage.error = {
        message: `O termo '${commandName}' não é reconhecido como nome de cmdlet no laboratório.`,
        hint: suggestions.length ? `Você quis dizer ${suggestions.map((item) => `'${item}'`).join(' ou ')}?` : 'Use Get-Command para descobrir comandos disponíveis.',
        suggestions,
      }
      result.stages.push(stage)
      result.errors.push(stage.error)
      result.ok = false
      break
    }

    stage.commandName = command.name
    stage.category = command.cat
    stage.risk = command.risk
    stage.summary = command.summary
    const argTokens = tokens.slice(1)
    const args = bindArguments(argTokens, command, world)
    stage.args = argTokens.map((token) => token.raw)
    stage.parsedArgs = Object.entries(args.named).map(([key, value]) => ({ name: key, value }))

    if (args.missing.length) {
      const paramName = args.missing[0]
      stage.error = {
        message: `O parâmetro -${paramName} espera um valor.`,
        hint: `Complete com algo como -${paramName} <valor>, ou remova o parâmetro.`,
      }
      result.stages.push(stage)
      result.errors.push(stage.error)
      result.ok = false
      break
    }

    const handler = COMMAND_HANDLERS[command.name]
    if (!handler) {
      stage.error = {
        message: `${command.name} existe no catálogo, mas ainda não está disponível no simulador.`,
        hint: 'Isso não acontece nas trilhas principais. Use Get-Command para ver o que já funciona.',
      }
      result.stages.push(stage)
      result.errors.push(stage.error)
      result.ok = false
      break
    }

    const context = {
      command,
      args,
      flags: args.flags,
      input: inputObjects,
      inputMeta,
      stage,
      world,
      history: world.commandHistory ?? [],
    }

    try {
      const output = handler(context) ?? {}
      const objects = output.objects ?? []
      const meta = output.meta ?? inferMeta(objects)
      const stageEffects = output.effects ?? []
      stage.outputCount = objects.length
      stage.objects = objects.slice(0, 8)
      stage.meta = meta
      stage.effects = stageEffects
      stage.hostMessages = output.hostMessages ?? []
      result.effects.push(...stageEffects)
      result.hostMessages.push(...(output.hostMessages ?? []))
      result.warnings.push(...(output.warnings ?? []))
      result.flags = { ...result.flags, ...(output.flags ?? {}) }
      if (output.note) result.notes.push(output.note)
      inputObjects = objects
      inputMeta = meta
      result.objects = objects
      result.meta = meta
    } catch (error) {
      const normalized = error instanceof ShellError
        ? { message: error.message, hint: error.hint, suggestions: [] }
        : { message: error?.message ?? 'Erro inesperado no simulador.', hint: 'Tente novamente.' }
      const errorAction = String(args.named.erroraction ?? '').toLowerCase()
      stage.error = normalized
      if (errorAction === 'silentlycontinue' || errorAction === 'ignore') {
        stage.suppressed = true
        result.stages.push(stage)
        result.notes.push('Erro suprimido por -ErrorAction. O comando não exibiu a mensagem.')
        break
      }
      result.stages.push(stage)
      result.errors.push(normalized)
      result.ok = false
      break
    }

    result.stages.push(stage)
  }

  if (!result.stages.some((stage) => stage.objects?.length) && result.meta.view !== 'text') {
    result.meta = result.meta.view === 'list' ? result.meta : { typeName: 'None', view: 'none', columns: [] }
  }

  return result
}

const COMMAND_HANDLERS = {}

export function implementedCommands() {
  return Object.keys(COMMAND_HANDLERS)
}

Object.assign(COMMAND_HANDLERS, {
  'Get-Help': ({ args, flags, world }) => {
    const target = arg(args, ['Name'], 0, '')
    const examplesOnly = flag(args, 'examples')
    const detailed = flag(args, 'detailed') || flag(args, 'full')

    if (!target) {
      return textResult(
        `TÓPICOS DE AJUDA DO POWERSHELL\n\n` +
        `Este laboratório entende os comandos do catálogo.\n\n` +
        `  Get-Help Get-ChildItem      → ajuda de um comando\n` +
        `  Get-Help Get-ADUser -Examples → exemplos prontos\n` +
        `  Get-Command -Noun User      → descubra comandos\n` +
        `  Get-Help about_Pipeline     → entenda o pipeline\n\n` +
        `Dica: peça ajuda por intenção também. Digite "criar usuário no AD" e veja as sugestões.`,
        'HelpInfo',
      )
    }

    if (target.toLowerCase().startsWith('about_')) {
      const topics = {
        about_pipeline: 'O pipeline (|) conecta a saída de um comando à entrada do próximo. Os objetos viajam pelo pipe sem virar texto.\n\nExemplo:\nGet-Process | Where-Object { $_.CPU -gt 10 } | Sort-Object CPU -Descending',
        about_try_catch_finally: 'try { ... } catch { ... } finally { ... } permite tratar erros. Use -ErrorAction Stop para transformar um erro não terminante em terminante.\n\nExemplo:\ntry { Get-Item C:\\nao-existe -ErrorAction Stop } catch { Write-Warning $_.Exception.Message }',
        about_objects: 'No PowerShell, quase tudo é um objeto com propriedades e métodos. Use Get-Member para inspecionar. O pipeline transporta objetos, não apenas texto.',
        about_variables: 'Variáveis começam com $. Ex.: $nome = "Ana". Use $env:NOME para variáveis de ambiente.\n\nExemplo:\n$processos = Get-Process\n$processos.Count',
      }
      const text = topics[target.toLowerCase()]
      if (text) return textResult(text, 'HelpInfo')
      throw new ShellError(`Não há tópico de ajuda '${target}' no laboratório.`, 'Tente about_Pipeline, about_Objects ou about_Variables.')
    }

    const command = findCommand(target)
    if (!command) {
      throw new ShellError(
        `Não encontrei ajuda para '${target}'.`,
        closestCommands(target).length ? `Você quis dizer '${closestCommands(target)[0]}'?` : 'Use Get-Command para descobrir os nomes disponíveis.',
      )
    }

    const examples = command.examples?.length ? command.examples : [command.example]
    const paramsText = command.params?.length
      ? command.params.map((param) => `  -${param.name}${param.switch ? '' : ' <valor>'}  ${param.desc}${param.values ? ` (${param.values.join(', ')})` : ''}`).join('\n')
      : '  Este comando não usa parâmetros importantes no laboratório.'
    const examplesText = examples.map((example, index) => `  ${index + 1}. ${example}`).join('\n\n')

    const text = examplesOnly
      ? `EXEMPLOS — ${command.name}\n\n${examplesText}`
      : [
        `NOME\n  ${command.name}`,
        `SINOPSE\n  ${command.summary}`,
        `SINTAXE\n  ${command.name}${command.params?.length ? ' ' + command.params.map((param) => `[-${param.name}${param.switch ? '' : ' <valor>'}${param.required ? '' : ' (opcional)'}]`).join(' ') : ''}`,
        `PARÂMETROS PRINCIPAIS\n${paramsText}`,
        `EXEMPLOS\n${examplesText}`,
        detailed ? `OBSERVAÇÃO\n  Simulação segura do laboratório. Nenhuma alteração real é feita no seu computador.` : null,
      ].filter(Boolean).join('\n\n')

    return textResult(text, 'HelpInfo')
  },

  'Get-Command': ({ args, world }) => {
    const name = arg(args, ['Name'], 0, '')
    const noun = arg(args, ['Noun'])
    const verb = arg(args, ['Verb'])
    const moduleName = arg(args, ['Module'])
    let matches = COMMANDS
    if (name) {
      let regex
      try {
        regex = wildcardToRegExp(name)
      } catch {
        throw new ShellError(`O padrão de nome '${name}' não é válido.`)
      }
      matches = matches.filter((command) => regex.test(command.name))
    }
    if (noun) {
      const nounRegex = wildcardToRegExp(noun)
      matches = matches.filter((command) => nounRegex.test(command.name.split('-')[1] ?? ''))
    }
    if (verb) {
      const verbRegex = wildcardToRegExp(verb)
      matches = matches.filter((command) => verbRegex.test(command.name.split('-')[0] ?? ''))
    }
    if (moduleName) matches = matches.filter((command) => commandModule(command).toLowerCase().includes(String(moduleName).toLowerCase()))
    const objects = matches
      .map((command) => ({
        Name: command.name,
        CommandType: 'Cmdlet',
        Module: commandModule(command),
        Category: command.cat,
        Summary: command.summary,
      }))
      .sort((a, b) => a.Name.localeCompare(b.Name, 'pt-BR'))
    return resultWith(objects, tableMeta([
      { key: 'Name', label: 'Name' },
      { key: 'CommandType', label: 'CommandType' },
      { key: 'Module', label: 'Module' },
    ], 'CommandInfo'), {
      note: objects.length === 0 ? 'Nenhum comando corresponde ao filtro.' : '',
    })
  },

  'Get-Date': ({ args, world }) => {
    const format = arg(args, ['Format'], 0)
    const date = now()
    const formatted = format
      ? String(format)
        .replace(/dd/g, pad(date.getDate()))
        .replace(/MM/g, pad(date.getMonth() + 1))
        .replace(/yyyy/g, String(date.getFullYear()))
        .replace(/HH/g, pad(date.getHours()))
        .replace(/mm/g, pad(date.getMinutes()))
        .replace(/ss/g, pad(date.getSeconds()))
      : formatDateTimeFull(date)
    const objects = [{ DateTime: formatted, DayOfWeek: date.toLocaleDateString('pt-BR', { weekday: 'long' }), Date: formatDate(date, false) }]
    return {
      objects,
      meta: { ...tableMeta([{ key: 'DateTime', label: 'DateTime' }], 'DateTime'), view: 'text', text: formatted },
    }
  },

  'Get-Random': ({ args, input, world }) => {
    const minimum = toNumber(arg(args, ['Minimum'], null, 0), 0)
    const maximum = toNumber(arg(args, ['Maximum'], null, 100), 100)
    const count = Math.max(1, toNumber(arg(args, ['Count'], null, 1), 1))
    if (input.length) {
      const shuffled = [...input].sort(() => Math.random() - 0.5)
      return resultWith(shuffled.slice(0, count), null, { note: `Sorteado(s) ${Math.min(count, input.length)} item(ns) do pipeline.` })
    }
    const objects = Array.from({ length: count }, () => ({ Value: Math.floor(Math.random() * (maximum - minimum)) + minimum }))
    return resultWith(objects, tableMeta([{ key: 'Value', label: 'Value', align: 'right' }], 'Int32'))
  },

  'Get-Member': ({ args, input }) => {
    if (!input.length) {
      throw new ShellError('Get-Member espera objetos pelo pipeline.', 'Experimente: Get-Process | Get-Member')
    }
    const sample = input[0]
    const nameFilter = arg(args, ['Name'], 0, '')
    const memberTypeFilter = arg(args, ['MemberType'], null, '')
    const members = []
    if (typeof sample === 'object' && sample !== null) {
      for (const [name, value] of Object.entries(sample)) {
        if (name.startsWith('__')) continue
        const type = Array.isArray(value) ? 'Object[]' : value === null ? 'Object' : typeof value === 'boolean' ? 'Boolean' : typeof value === 'number' ? 'Number' : typeof value === 'string' ? 'String' : 'Object'
        members.push({ Name: name, MemberType: 'Property', Definition: `${type} ${name} {get;set;}`, TypeName: type })
      }
      const methods = ['ToString', 'Equals', 'GetHashCode', 'GetType']
      for (const methodName of methods) {
        members.push({ Name: methodName, MemberType: 'Method', Definition: `string ${methodName}()`, TypeName: 'Method' })
      }
    } else {
      members.push({ Name: 'Length', MemberType: 'Property', Definition: 'int Length {get;}', TypeName: 'Int32' })
      members.push({ Name: 'ToString', MemberType: 'Method', Definition: 'string ToString()', TypeName: 'Method' })
    }
    let filtered = members
    if (nameFilter) {
      const regex = wildcardToRegExp(nameFilter)
      filtered = filtered.filter((member) => regex.test(member.Name))
    }
    if (memberTypeFilter) filtered = filtered.filter((member) => member.MemberType.toLowerCase() === String(memberTypeFilter).toLowerCase())
    return resultWith(filtered, tableMeta([
      { key: 'Name', label: 'Name' },
      { key: 'MemberType', label: 'MemberType' },
      { key: 'Definition', label: 'Definition' },
    ], 'MemberDefinition'))
  },

  'Write-Output': ({ args, input, world }) => {
    const named = arg(args, ['InputObject'])
    const values = args.positional.length ? args.positional : named !== undefined ? [named] : input
    const objects = values.map((value) => (typeof value === 'object' && value !== null ? value : { Value: value }))
    return resultWith(objects, inferMeta(objects, typeof values[0] === 'string' ? 'String' : 'PSCustomObject'), {
      note: values.length ? '' : '',
    })
  },

  'Write-Host': ({ args, input }) => {
    const value = args.positional.length ? args.positional.join(' ') : arg(args, ['Object'], null, '')
    const text = value !== '' ? interpolateSafe(value) : input.map((item) => stringifyValue(item)).join(' ')
    const color = arg(args, ['ForegroundColor'])
    return resultWith([], { typeName: 'None', view: 'none', columns: [] }, {
      hostMessages: [{ level: 'host', text, color: color ?? null }],
    })
  },

  'Write-Warning': ({ args }) => {
    const message = args.positional.length ? args.positional.join(' ') : arg(args, ['Message'], null, '')
    return resultWith([], { typeName: 'None', view: 'none', columns: [] }, {
      warnings: [`AVISO: ${message}`],
    })
  },

  'Write-Verbose': ({ args, flags }) => {
    const message = args.positional.length ? args.positional.join(' ') : arg(args, ['Message'], null, '')
    if (flag(args, 'verbose')) {
      return resultWith([], { typeName: 'None', view: 'none', columns: [] }, {
        hostMessages: [{ level: 'verbose', text: `VERBOSE: ${message}` }],
      })
    }
    return resultWith([], { typeName: 'None', view: 'none', columns: [] }, {
      note: 'Mensagem verbosa suprimida. Repita com -Verbose para exibi-la.',
    })
  },

  'Write-Error': ({ args }) => {
    const message = args.positional.length ? args.positional.join(' ') : arg(args, ['Message'], null, 'Erro simulado.')
    throw new ShellError(message, 'Este erro foi produzido propositalmente para você praticar tratamento de erros.')
  },

  'Clear-Host': () => ({
    objects: [],
    meta: { typeName: 'None', view: 'none', columns: [] },
    flags: { clearTerminal: true },
  }),

  'Get-Location': ({ world }) => ({
    objects: [{ Path: world.cwd }],
    meta: { ...tableMeta([{ key: 'Path', label: 'Path' }], 'PathInfo'), view: 'text', text: world.cwd },
  }),

  'Set-Location': ({ args, world }) => {
    const target = arg(args, ['Path'], 0, world.cwd)
    const resolved = resolveFsPath(world, String(target))
    if (resolved.provider !== 'fs') {
      throw new ShellError('Set-Location no laboratório aceita apenas caminhos do sistema de arquivos.', 'Tente C:\\Temp ou .\\Documentos.')
    }
    if (!resolved.exists && !resolved.node) {
      throw new ShellError(resolved.error ?? `O caminho '${target}' não existe.`, 'Use Get-ChildItem para ver as pastas disponíveis.')
    }
    if (resolved.node?.kind !== 'dir') {
      throw new ShellError(`O caminho '${target}' é um arquivo, não uma pasta.`, 'Informe o diretório pai ou apenas o nome da pasta.')
    }
    const from = world.cwd
    world.cwd = resolved.displayPath
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('cwd', { from, to: resolved.displayPath })],
      note: `Diretório atual: ${resolved.displayPath}`,
    }
  },

  'Get-ChildItem': ({ args, world, flags }) => {
    const target = arg(args, ['Path'], 0, world.cwd)
    const resolved = resolveFsPath(world, String(target))
    if (resolved.provider === 'registry') {
      if (!resolved.exists) throw new ShellError(resolved.error)
      const children = Object.entries(resolved.key.children ?? {}).map(([name, child]) => ({
        Name: name,
        Type: 'Key',
        Values: Object.keys(child.values ?? {}).length,
        Path: `${resolved.displayPath}\\${name}`,
      }))
      if (!children.length) return resultWith([], tableMeta([{ key: 'Name', label: 'Name' }], 'RegistryKey'), { note: 'Esta chave não tem subchaves. Use Get-ItemProperty para ver os valores.' })
      return resultWith(children, tableMeta([
        { key: 'Name', label: 'Name' },
        { key: 'Type', label: 'Type' },
        { key: 'Values', label: 'Values', align: 'right' },
      ], 'RegistryKey'))
    }
    if (resolved.provider === 'env') {
      return resultWith(enumerateEnvValues(world), tableMeta([
        { key: 'Name', label: 'Name' },
        { key: 'Value', label: 'Value' },
      ], 'EnvironmentVariable'))
    }
    const wildcardTarget = /[*?]/.test(String(target))
    if (!resolved.exists && !wildcardTarget) {
      throw new ShellError(resolved.error ?? `Não foi possível encontrar o caminho '${target}'.`, 'Confira o caminho com Get-Location e Get-ChildItem.')
    }

    const filter = arg(args, ['Filter'])
    const fileOnly = flag(args, 'file')
    const directoryOnly = flag(args, 'directory')
    const recurse = flag(args, 'recurse')
    const includeHidden = flag(args, 'force')

    let objects = []
    if (wildcardTarget) {
      const targetText = String(target)
      const hasDirectoryPart = /[\\/]/.test(targetText)
      const directoryPart = hasDirectoryPart ? parentPathOf(targetText) : '.'
      const pattern = baseNameOf(targetText)
      const directory = resolveFsPath(world, directoryPart)
      if (!directory.exists || directory.node?.kind !== 'dir') {
        throw new ShellError(`A pasta '${directoryPart}' não existe.`, 'Confira o caminho antes de usar curingas.')
      }
      const patternRegex = wildcardToRegExp(pattern)
      objects = collectChildren(directory.node, directory.displayPath, recurse, includeHidden)
        .filter((item) => patternRegex.test(item.Name))
    } else if (resolved.node.kind === 'file') {
      objects = [fileInfoNode(world, resolved, resolved.node)]
    } else {
      objects = collectChildren(resolved.node, resolved.displayPath, recurse, includeHidden)
    }

    if (filter) {
      const regex = wildcardToRegExp(filter)
      objects = objects.filter((object) => regex.test(object.Name))
    }
    if (fileOnly) objects = objects.filter((object) => !object.PSIsContainer)
    if (directoryOnly) objects = objects.filter((object) => object.PSIsContainer)
    objects.sort((a, b) => {
      if (a.PSIsContainer !== b.PSIsContainer) return a.PSIsContainer ? -1 : 1
      return a.Name.localeCompare(b.Name, 'pt-BR', { numeric: true, sensitivity: 'base' })
    })

    return resultWith(objects, tableMeta([
      { key: 'Mode', label: 'Mode' },
      { key: 'LastWriteTime', label: 'LastWriteTime' },
      { key: 'Length', label: 'Length', align: 'right', format: 'bytes' },
      { key: 'Name', label: 'Name' },
    ], 'FileSystemInfo'), {
      note: objects.length === 0 ? 'A pasta está vazia ou nenhum item corresponde ao filtro.' : '',
    })
  },

  'New-Item': ({ args, world }) => {
    let targetPath = arg(args, ['Path'], 0, '')
    const name = arg(args, ['Name'])
    const itemType = String(arg(args, ['ItemType'], null, '')).toLowerCase()
    const value = arg(args, ['Value'], 1, '')
    if (name) targetPath = targetPath ? `${targetPath}\\${name}` : name
    if (!targetPath) throw new ShellError('New-Item precisa de um caminho.', 'Exemplo: New-Item .\\estudos -ItemType Directory')

    const registryLooking = /^(hk(lm|cu)|hkey_)/i.test(String(targetPath))
    if (registryLooking) {
      const resolved = resolveRegistryPath(world, targetPath)
      if (resolved.exists) throw new ShellError(`A chave '${resolved.displayPath}' já existe.`, 'Escolha outro nome.')
      if (!resolved.parent) throw new ShellError('A chave pai não existe.', 'Crie a chave pai primeiro.')
      const keyName = resolved.name
      resolved.parent.children = resolved.parent.children ?? {}
      resolved.parent.children[keyName] = { kind: 'key', values: {}, children: {} }
      return {
        objects: [{ Name: keyName, Type: 'Key', Path: resolved.displayPath }],
        meta: tableMeta([{ key: 'Name', label: 'Name' }, { key: 'Type', label: 'Type' }], 'RegistryKey'),
        effects: [effect('registry:create-key', { path: resolved.displayPath })],
        note: `Chave criada em ${resolved.displayPath}.`,
      }
    }

    const resolved = resolveFsPath(world, String(targetPath))
    if (resolved.provider !== 'fs') throw new ShellError('Esse provedor de caminho não é suportado por New-Item no laboratório.')
    if (resolved.exists) {
      if (!flag(args, 'force')) throw new ShellError(`O item '${resolved.displayPath}' já existe.`, 'Use outro nome ou -Force quando fizer sentido.')
      return resultWith([fileInfoNode(world, resolved, resolved.node)], tableMeta([
        { key: 'Name', label: 'Name' }, { key: 'Mode', label: 'Mode' }, { key: 'Length', label: 'Length' },
      ], 'FileSystemInfo'), { note: 'O item já existia.' })
    }

    const makeDirectory = itemType === 'directory' || itemType === 'dir' || (itemType === '' && /[\\/]$/.test(String(targetPath)))
    let parent = resolved.parent
    if (!parent) {
      const force = flag(args, 'force')
      if (!force) {
        throw new ShellError(`A pasta pai de '${resolved.displayPath}' não existe.`, 'Crie o caminho com -Force ou use uma pasta existente.')
      }
      parent = ensureFsDirectories(world, resolved)
    }
    if (!parent) throw new ShellError('Não foi possível localizar a pasta pai.')

    const node = makeDirectory
      ? { kind: 'dir', id: `dir-user-${Date.now()}`, name: resolved.name, children: [], modified: formatDate() }
      : {
        kind: 'file',
        id: `file-user-${Date.now()}`,
        name: resolved.name,
        content: Array.isArray(value) ? value.join('\n') : String(value ?? ''),
        size: new TextEncoder().encode(Array.isArray(value) ? value.join('\n') : String(value ?? '')).length,
        modified: formatDate(),
      }
    parent.children.push(node)
    parent.modified = formatDate()

    const newResolved = { ...resolved, exists: true, node }
    return {
      objects: [fileInfoNode(world, newResolved, node)],
      meta: tableMeta([
        { key: 'Mode', label: 'Mode' },
        { key: 'LastWriteTime', label: 'LastWriteTime' },
        { key: 'Length', label: 'Length', align: 'right', format: 'bytes' },
        { key: 'Name', label: 'Name' },
      ], node.kind === 'dir' ? 'DirectoryInfo' : 'FileInfo'),
      effects: [effect(makeDirectory ? 'fs:create-dir' : 'fs:create-file', {
        path: resolved.displayPath,
        itemType: makeDirectory ? 'dir' : 'file',
        parent: parent.name,
      })],
      note: `${makeDirectory ? 'Pasta criada' : 'Arquivo criado'}: ${resolved.displayPath}`,
    }
  },

  'Remove-Item': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    if (!target) throw new ShellError('Remove-Item precisa de um caminho.', 'Exemplo: Remove-Item .\\arquivo-antigo.txt')
    const whatIf = flag(args, 'whatif')
    const registryLooking = /^(hk(lm|cu)|hkey_)/i.test(String(target))
    if (registryLooking) {
      const resolved = resolveRegistryPath(world, target)
      if (!resolved.exists) throw new ShellError(resolved.error)
      if (!resolved.parent) throw new ShellError('Não é possível remover uma raiz do registro.')
      if (whatIf) return resultWith([], { typeName: 'None', view: 'none', columns: [] }, { note: `WhatIf: removeria a chave ${resolved.displayPath}.` })
      for (const key of Object.keys(resolved.parent.children)) {
        if (key.toLowerCase() === resolved.name.toLowerCase()) delete resolved.parent.children[key]
      }
      return {
        objects: [],
        meta: { typeName: 'None', view: 'none', columns: [] },
        effects: [effect('registry:delete-key', { path: resolved.displayPath })],
        note: `Chave removida: ${resolved.displayPath}`,
      }
    }

    const resolved = resolveFsPath(world, target)
    if (resolved.provider !== 'fs' || !resolved.exists) {
      throw new ShellError(resolved.error ?? `Não foi possível encontrar '${target}'.`, 'Use Get-ChildItem para conferir o caminho.')
    }
    if (!resolved.parent) throw new ShellError('Não é possível remover a raiz da unidade.')
    if (resolved.node.kind === 'dir' && resolved.node.children.length > 0 && !flag(args, 'recurse')) {
      throw new ShellError(`A pasta '${resolved.displayPath}' não está vazia.`, 'Use -Recurse para remover a pasta e todo o conteúdo, ou -WhatIf para simular.')
    }
    if (whatIf) {
      return resultWith([], { typeName: 'None', view: 'none', columns: [] }, {
        note: `WhatIf: removeria ${resolved.displayPath}${resolved.node.kind === 'dir' ? ' e todo o conteúdo' : ''}.`,
        effects: [effect('fs:whatif-delete', { path: resolved.displayPath })],
      })
    }
    const snapshot = fsNodeToObject(resolved.node, resolved.displayPath)
    removeFsNode(resolved)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('fs:delete', { path: resolved.displayPath, itemType: resolved.node.kind === 'dir' ? 'dir' : 'file', name: snapshot.Name })],
      note: `Removido: ${resolved.displayPath}`,
    }
  },

  'Copy-Item': ({ args, world }) => {
    const sourceRaw = arg(args, ['Path'], 0)
    const destinationRaw = arg(args, ['Destination'], 1)
    if (!sourceRaw || !destinationRaw) throw new ShellError('Copy-Item precisa de origem e destino.', 'Exemplo: Copy-Item .\\notas.txt -Destination .\\backup\\notas.txt')
    const source = resolveFsPath(world, sourceRaw)
    if (!source.exists) throw new ShellError(source.error ?? `A origem '${sourceRaw}' não existe.`)
    if (source.node.kind === 'dir' && !flag(args, 'recurse')) {
      throw new ShellError('Para copiar uma pasta, use -Recurse.', 'Isso evita cópias incompletas sem querer.')
    }
    let destination = resolveFsPath(world, destinationRaw)
    let destParent = destination.parent
    let destName = destination.name
    if (destination.exists && destination.node.kind === 'dir') {
      destParent = destination.node
      destName = source.node.name
    }
    if (!destParent) {
      throw new ShellError(`A pasta de destino de '${destinationRaw}' não existe.`, 'Crie a pasta antes de copiar.')
    }
    if (destination.exists && !flag(args, 'force') && destination.node.kind !== 'dir') {
      throw new ShellError(`O destino '${destination.displayPath}' já existe.`, 'Use -Force para sobrescrever.')
    }
    const copy = copyFsNode(source.node)
    copy.name = destName
    copy.modified = formatDate()
    if (destination.exists && destination.node.kind !== 'dir' && destination.parent) {
      const index = destination.parent.children.findIndex((child) => child.name.toLowerCase() === destName.toLowerCase())
      if (index >= 0) destination.parent.children.splice(index, 1)
    }
    destParent.children.push(copy)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('fs:copy', { from: source.displayPath, to: joinWindowsPath(destination.exists && destination.node.kind === 'dir' ? destination.displayPath : parentPathOf(destination.displayPath), destName) })],
      note: `Copiado para ${joinWindowsPath(parentPathOf(destination.displayPath), destName)}.`,
    }
  },

  'Move-Item': ({ args, world }) => {
    const sourceRaw = arg(args, ['Path'], 0)
    const destinationRaw = arg(args, ['Destination'], 1)
    if (!sourceRaw || !destinationRaw) throw new ShellError('Move-Item precisa de origem e destino.', 'Exemplo: Move-Item .\\notas.txt -Destination .\\Documentos\\notas.txt')
    const source = resolveFsPath(world, sourceRaw)
    if (!source.exists) throw new ShellError(source.error ?? `A origem '${sourceRaw}' não existe.`)
    const destination = resolveFsPath(world, destinationRaw)
    let destParent = destination.parent
    let destName = destination.name
    if (destination.exists && destination.node.kind === 'dir') {
      destParent = destination.node
      destName = source.node.name
    }
    if (!destParent) throw new ShellError(`A pasta de destino de '${destinationRaw}' não existe.`)
    if (!source.parent) throw new ShellError('Não é possível mover a raiz da unidade.')
    const finalPath = joinWindowsPath(destination.exists && destination.node.kind === 'dir' ? destination.displayPath : parentPathOf(destination.displayPath), destName)
    removeFsNode(source)
    source.node.name = destName
    source.node.modified = formatDate()
    destParent.children.push(source.node)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('fs:move', { from: source.displayPath, to: finalPath, itemType: source.node.kind })],
      note: `Movido: ${source.displayPath} → ${finalPath}`,
    }
  },

  'Rename-Item': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    const newName = arg(args, ['NewName'], 1)
    if (!target || !newName) throw new ShellError('Rename-Item precisa do caminho e do novo nome.', 'Exemplo: Rename-Item .\\notas.txt -NewName notas-pessoais.txt')
    if (String(newName).includes('\\')) throw new ShellError('NewName deve conter apenas o nome, não um caminho.', 'Use Move-Item para mover entre pastas.')
    const resolved = resolveFsPath(world, target)
    if (!resolved.exists) throw new ShellError(resolved.error ?? `O item '${target}' não existe.`)
    if (findChildByName(resolved.parent, newName)) throw new ShellError(`Já existe um item chamado '${newName}' nesta pasta.`)
    const oldName = resolved.node.name
    resolved.node.name = String(newName)
    resolved.node.modified = formatDate()
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('fs:rename', { path: parentPathOf(resolved.displayPath), from: oldName, to: String(newName) })],
      note: `Renomeado: ${oldName} → ${newName}`,
    }
  },

  'Test-Path': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    if (!target) throw new ShellError('Test-Path precisa de um caminho.')
    const resolved = resolveFsPath(world, target)
    const exists = Boolean(resolved.exists)
    return {
      objects: [{ Value: exists }],
      meta: { ...tableMeta([{ key: 'Value', label: 'Value' }], 'Boolean'), view: 'text', text: exists ? 'True' : 'False' },
    }
  },

  'Resolve-Path': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    if (!target) throw new ShellError('Resolve-Path precisa de um caminho.')
    const resolved = resolveFsPath(world, target)
    if (!resolved.exists) throw new ShellError(resolved.error ?? `O caminho '${target}' não existe.`)
    return {
      objects: [{ Path: ensureAbsoluteFs(world, resolved) }],
      meta: { ...tableMeta([{ key: 'Path', label: 'Path' }], 'PathInfo'), view: 'text', text: ensureAbsoluteFs(world, resolved) },
    }
  },

  'Get-Content': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    if (!target) throw new ShellError('Get-Content precisa de um arquivo.', 'Exemplo: Get-Content .\\notas.txt')
    const resolved = resolveFsPath(world, target)
    if (!resolved.exists) throw new ShellError(resolved.error ?? `O arquivo '${target}' não existe.`, 'Confira o caminho com Get-ChildItem.')
    if (resolved.node.kind !== 'file') throw new ShellError(`'${resolved.displayPath}' é uma pasta, não um arquivo.`, 'Use Get-ChildItem para listar o conteúdo.')
    let content = resolved.node.content ?? ''
    let lines = content.split(/\r?\n/)
    if (flag(args, 'raw')) {
      return {
        objects: [content],
        meta: { ...tableMeta([{ key: 'Value', label: 'Value' }], 'String'), view: 'text', text: content },
        effects: [],
        hostMessages: [],
        warnings: [],
        note: '',
      }
    }
    const head = arg(args, ['Head'])
    const tail = arg(args, ['Tail'])
    if (head !== undefined) lines = lines.slice(0, Math.max(0, toNumber(head, 5)))
    if (tail !== undefined) lines = lines.slice(-Math.max(0, toNumber(tail, 5)))
    if (lines.length && lines[lines.length - 1] === '') lines = lines.slice(0, -1)
    const objects = lines.map((line) => ({ Line: line }))
    return {
      objects,
      meta: {
        typeName: 'String',
        view: 'text',
        text: lines.join('\n'),
        columns: [{ key: 'Line', label: 'Line' }],
      },
      effects: [],
      hostMessages: [],
      warnings: [],
      note: '',
    }
  },

  'Set-Content': ({ args, world }) => writeTextFile(args, world, 'set'),
  'Add-Content': ({ args, world }) => writeTextFile(args, world, 'add'),
  'Out-File': ({ args, input, world }) => {
    const path = arg(args, ['FilePath'], 0)
    if (!path) throw new ShellError('Out-File precisa de um caminho.', 'Exemplo: Get-Process | Out-File .\\processos.txt')
    const content = input.map((item) => stringifyValue(item)).join('\n')
    const resolved = resolveFsPath(world, path)
    if (!resolved.parent) throw new ShellError(`A pasta de destino '${parentPathOf(String(path))}' não existe.`)
    let node = resolved.node
    if (!node) {
      node = { kind: 'file', id: `file-out-${Date.now()}`, name: resolved.name, content: '', size: 0, modified: formatDate() }
      resolved.parent.children.push(node)
    }
    const append = flag(args, 'append')
    node.content = append ? `${node.content}${node.content.endsWith('\n') ? '' : '\n'}${content}\n` : `${content}\n`
    node.size = new TextEncoder().encode(node.content).length
    node.modified = formatDate()
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('fs:write', { path: resolved.displayPath, created: !resolved.exists })],
      note: `Saída gravada em ${resolved.displayPath}.`,
    }
  },

  'Select-String': ({ args, input, world }) => {
    const pattern = arg(args, ['Pattern'], 0)
    if (pattern === undefined) throw new ShellError('Select-String precisa de -Pattern.', 'Exemplo: Select-String -Pattern "ERROR" -Path C:\\Logs\\*.log')
    const target = arg(args, ['Path'])
    let files = []
    if (target) {
      const pathText = String(target)
      if (/[*?]/.test(pathText)) {
        const directoryPart = parentPathOf(pathText)
        const filePattern = baseNameOf(pathText)
        const dir = resolveFsPath(world, directoryPart)
        if (dir.exists && dir.node.kind === 'dir') {
          const regex = wildcardToRegExp(filePattern)
          const children = collectChildren(dir.node, dir.displayPath, false, true)
          for (const child of children.filter((item) => regex.test(item.Name) && !item.PSIsContainer)) {
            const fileNode = findFsNodeByPath(world, child.FullName)
            if (fileNode) files.push({ node: fileNode, path: child.FullName })
          }
        }
      } else {
        const resolved = resolveFsPath(world, pathText)
        if (resolved.exists && resolved.node.kind === 'file') files.push({ node: resolved.node, path: resolved.displayPath })
      }
    } else if (input.length) {
      return selectStringFromInput(pattern, input)
    }
    if (!files.length) throw new ShellError(`Nenhum arquivo encontrado em '${target ?? ''}'.`, 'Confira o padrão de caminho, como C:\\Logs\\*.log.')

    let regex
    try {
      regex = new RegExp(String(pattern), 'i')
    } catch {
      throw new ShellError(`A expressão regular '${pattern}' não é válida.`, 'Corrija os caracteres especiais ou use um texto simples.')
    }
    const matches = []
    for (const file of files) {
      const lines = String(file.node.content ?? '').split(/\r?\n/)
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          matches.push({
            Filename: file.path,
            LineNumber: index + 1,
            Line: line.trim(),
            Pattern: String(pattern),
          })
        }
      })
    }
    return resultWith(matches, tableMeta([
      { key: 'Filename', label: 'Filename' },
      { key: 'LineNumber', label: 'Line', align: 'right' },
      { key: 'Line', label: 'Text' },
    ], 'MatchInfo'), { note: matches.length ? '' : 'Nenhuma ocorrência encontrada.' })
  },

  'Get-FileHash': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    if (!target) throw new ShellError('Get-FileHash precisa de um arquivo.')
    const resolved = resolveFsPath(world, target)
    if (!resolved.exists || resolved.node.kind !== 'file') throw new ShellError(resolved.error ?? `O arquivo '${target}' não foi encontrado.`)
    const algorithm = String(arg(args, ['Algorithm'], null, 'SHA256')).toUpperCase()
    const hash = fakeHash(`${resolved.displayPath}:${resolved.node.size}:${algorithm}`)
    return resultWith([{
      Algorithm: algorithm,
      Hash: hash,
      Path: resolved.displayPath,
    }], tableMeta([
      { key: 'Algorithm', label: 'Algorithm' },
      { key: 'Hash', label: 'Hash' },
      { key: 'Path', label: 'Path' },
    ], 'FileHashInfo'))
  },
})

function interpolateSafe(value) {
  return String(value)
}

function copyFsNode(node) {
  return typeof structuredClone === 'function' ? structuredClone(node) : JSON.parse(JSON.stringify(node))
}

function ensureFsDirectories(world, resolved) {
  const target = resolved.displayPath
  const segments = normalizeSegments(target.replace(/^[A-Za-z]:/, ''))
  const root = getDriveRoot(world, resolved.rootLetter ?? 'C')
  let current = root
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]
    let child = findChildByName(current, segment)
    if (!child) {
      child = { kind: 'dir', id: `dir-created-${Date.now()}-${index}`, name: segment, children: [], modified: formatDate() }
      current.children.push(child)
    }
    if (child.kind !== 'dir') return null
    current = child
  }
  return current
}

function writeTextFile(args, world, mode) {
  const target = arg(args, ['Path'], 0)
  const value = args.named.value ?? args.positional[1] ?? ''
  if (!target) throw new ShellError(`${mode === 'add' ? 'Add-Content' : 'Set-Content'} precisa de um arquivo.`, 'Exemplo: Set-Content .\\nota.txt -Value "texto"')
  const resolved = resolveFsPath(world, target)
  if (!resolved.parent) throw new ShellError(`A pasta de destino de '${target}' não existe.`)
  let node = resolved.node
  const created = !node
  if (!node) {
    node = { kind: 'file', id: `file-created-${Date.now()}`, name: resolved.name, content: '', size: 0, modified: formatDate() }
    resolved.parent.children.push(node)
  }
  if (node.kind !== 'file') throw new ShellError(`'${resolved.displayPath}' é uma pasta.`, 'Escolha um arquivo.')
  const text = Array.isArray(value) ? value.join('\n') : stringifyValue(value)
  node.content = mode === 'add' ? `${node.content}${node.content && !node.content.endsWith('\n') ? '\n' : ''}${text}\n` : `${text}\n`
  node.size = new TextEncoder().encode(node.content).length
  node.modified = formatDate()
  return {
    objects: [],
    meta: { typeName: 'None', view: 'none', columns: [] },
    effects: [effect('fs:write', { path: resolved.displayPath, created, mode })],
    note: `${created ? 'Arquivo criado' : 'Conteúdo atualizado'}: ${resolved.displayPath}`,
  }
}

function selectStringFromInput(pattern, input) {
  let regex
  try {
    regex = new RegExp(String(pattern), 'i')
  } catch {
    throw new ShellError(`A expressão regular '${pattern}' não é válida.`)
  }
  const matches = []
  input.forEach((item) => {
    const text = typeof item === 'string' ? item : item.Line ?? stringifyValue(item)
    if (regex.test(text)) matches.push({ Line: text, Pattern: String(pattern) })
  })
  return resultWith(matches, tableMeta([{ key: 'Line', label: 'Line' }], 'MatchInfo'), {
    note: matches.length ? '' : 'Nenhuma ocorrência encontrada.',
  })
}

function fakeHash(text) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charCodeAt(index)
    h1 = Math.imul(h1 ^ char, 2654435761)
    h2 = Math.imul(h2 ^ char, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 >>> 0).toString(16).padStart(8, '0').repeat(4).slice(0, 64) + (h2 >>> 0).toString(16).padStart(8, '0').repeat(4).slice(0, 0)
}

Object.assign(COMMAND_HANDLERS, {
  'Where-Object': ({ args, input, world, inputMeta }) => {
    if (!input.length) {
      throw new ShellError('Where-Object espera objetos pelo pipeline.', 'Exemplo: Get-Process | Where-Object { $_.CPU -gt 10 }')
    }
    const block = args.named.filterscript ?? args.positional.find((value) => value && typeof value === 'object' && '__scriptblock' in value)
    const blockExpression = block && typeof block === 'object' ? block.__scriptblock : typeof block === 'string' ? block : null
    const property = arg(args, ['Property'], null, '')
    const positionalProperty = typeof args.positional[0] === 'string' ? args.positional[0] : ''
    const operatorEntry = Object.keys(args.named).find((key) => ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains', 'notcontains'].includes(key.toLowerCase()))

    const getValue = (object) => {
      if (typeof object !== 'object' || object === null) return object
      const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === String(property || positionalProperty).toLowerCase())
      return key ? object[key] : undefined
    }

    let filtered
    if (blockExpression !== null) {
      filtered = input.filter((object) => testPropertyFilter(object, blockExpression, world))
    } else if (property || positionalProperty) {
      const prop = property || positionalProperty
      if (operatorEntry) {
        const expected = args.named[operatorEntry]
        filtered = input.filter((object) => {
          const actual = typeof object === 'object' && object !== null
            ? Object.entries(object).find(([key]) => key.toLowerCase() === String(prop).toLowerCase())?.[1]
            : object
          return compareValues(actual, operatorEntry, expected)
        })
      } else {
        filtered = input.filter((object) => Boolean(typeof object === 'object' && object !== null
          ? Object.entries(object).find(([key]) => key.toLowerCase() === String(prop).toLowerCase())?.[1]
          : object))
      }
    } else {
      throw new ShellError('Where-Object precisa de uma condição.', 'Exemplo: Get-Process | Where-Object { $_.CPU -gt 10 }')
    }

    const meta = inputMeta ?? inferMeta(filtered)
    return resultWith(filtered, meta, {
      note: `${input.length} objeto(s) entraram, ${filtered.length} passaram pelo filtro.`,
    })
  },

  'Select-Object': ({ args, input, inputMeta }) => {
    if (!input.length) {
      throw new ShellError('Select-Object espera objetos pelo pipeline.', 'Exemplo: Get-Process | Select-Object ProcessName, CPU')
    }
    const expand = args.named.expandproperty
    const first = args.named.first !== undefined ? Math.max(0, toNumber(args.named.first, 0)) : null
    const last = args.named.last !== undefined ? Math.max(0, toNumber(args.named.last, 0)) : null
    const skip = args.named.skip !== undefined ? Math.max(0, toNumber(args.named.skip, 0)) : 0
    const unique = flag(args, 'unique')
    const rawProperties = []
    if (args.named.property !== undefined) rawProperties.push(String(args.named.property))
    for (const positional of args.positional) {
      if (positional !== undefined && positional !== null && typeof positional !== 'object') rawProperties.push(String(positional))
    }
    const properties = [...new Set(rawProperties.join(',').split(/[,\s]+/).filter((item) => item && item !== '*' && !item.startsWith('-')))]

    let selected = [...input]
    if (skip) selected = selected.slice(skip)
    if (first !== null) selected = selected.slice(0, first)
    if (last !== null) selected = selected.slice(-last)

    if (expand) {
      const values = selected.map((object) => {
        if (typeof object !== 'object' || object === null) return object
        const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === String(expand).toLowerCase())
        return key ? object[key] : null
      }).flat()
      if (unique) return resultWith([...new Set(values.map(stringifyValue))], { typeName: 'PSCustomObject', view: 'table', columns: [{ key: 'Value', label: String(expand) }] })
      const rows = values.map((value) => ({ Value: value }))
      return resultWith(rows, { typeName: 'PSCustomObject', view: 'table', columns: [{ key: 'Value', label: String(expand), align: typeof values[0] === 'number' ? 'right' : 'left' }] })
    }

    let outputObjects = selected
    if (properties.length) {
      outputObjects = selected.map((object) => {
        if (typeof object !== 'object' || object === null) return { Value: object }
        const row = {}
        for (const propertyName of properties) {
          const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === propertyName.toLowerCase())
          row[key ?? propertyName] = key ? object[key] : null
        }
        return row
      })
    }

    if (unique) {
      const seen = new Set()
      outputObjects = outputObjects.filter((object) => {
        const key = JSON.stringify(object)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    const columns = properties.length
      ? properties.map((property) => {
        const key = outputObjects[0] && typeof outputObjects[0] === 'object'
          ? Object.keys(outputObjects[0]).find((candidate) => candidate.toLowerCase() === property.toLowerCase()) ?? property
          : property
        return { key, label: property, align: typeof outputObjects[0]?.[key] === 'number' ? 'right' : 'left' }
      })
      : (inputMeta?.columns ?? inferColumns(outputObjects))

    return resultWith(outputObjects, {
      typeName: inputMeta?.typeName ? `${inputMeta.typeName} (seleção)` : 'PSCustomObject',
      view: 'table',
      columns,
    }, { note: properties.length ? `Mantendo ${properties.length} propriedade(s).` : '' })
  },

  'Sort-Object': ({ args, input, inputMeta }) => {
    if (!input.length) throw new ShellError('Sort-Object espera objetos pelo pipeline.', 'Exemplo: Get-Process | Sort-Object CPU -Descending')
    const raw = args.named.property ?? args.positional.filter((value) => typeof value === 'string').join(',')
    const properties = String(raw ?? '').split(/[,\s]+/).filter(Boolean)
    if (!properties.length) throw new ShellError('Sort-Object precisa de uma propriedade.', 'Exemplo: Sort-Object CPU -Descending')
    let output = [...input]
    for (let index = properties.length - 1; index >= 0; index -= 1) {
      output = sortByProperty(output, properties[index], flag(args, 'descending'))
    }
    if (flag(args, 'unique')) {
      const seen = new Set()
      output = output.filter((object) => {
        const key = JSON.stringify(object)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }
    return resultWith(output, inputMeta ?? inferMeta(output), {
      note: `Ordenado por ${properties.join(', ')}${flag(args, 'descending') ? ' (decrescente)' : ''}.`,
    })
  },

  'Measure-Object': ({ args, input }) => {
    if (!input.length) {
      const empty = [{ Count: 0, Average: null, Sum: null, Maximum: null, Minimum: null, Property: arg(args, ['Property'], 0, '') }]
      return resultWith(empty, { typeName: 'GenericMeasureInfo', view: 'list', columns: [
        { key: 'Count', label: 'Count', align: 'right' },
      ] })
    }
    const property = arg(args, ['Property'], 0, '')
    const getValue = (object) => {
      if (!property || typeof object !== 'object' || object === null) return null
      const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === String(property).toLowerCase())
      return key ? toNumber(object[key], NaN) : null
    }
    const numeric = property ? input.map(getValue).filter((value) => Number.isFinite(value)) : []
    const wantsAverage = flag(args, 'average')
    const wantsSum = flag(args, 'sum')
    const wantsMaximum = flag(args, 'maximum')
    const wantsMinimum = flag(args, 'minimum')
    const record = { Count: input.length }
    if (property) record.Property = property
    if (numeric.length) {
      if (wantsAverage) record.Average = Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(2))
      if (wantsSum) record.Sum = Number(numeric.reduce((sum, value) => sum + value, 0).toFixed(2))
      if (wantsMaximum) record.Maximum = Math.max(...numeric)
      if (wantsMinimum) record.Minimum = Math.min(...numeric)
    }
    const columns = Object.keys(record).map((key) => ({ key, label: key, align: typeof record[key] === 'number' ? 'right' : 'left' }))
    return resultWith([record], { typeName: 'GenericMeasureInfo', view: 'list', columns }, {
      note: property ? `Medindo a propriedade ${property}.` : 'Contando objetos do pipeline.',
    })
  },

  'ForEach-Object': ({ args, input, inputMeta, world }) => {
    if (!input.length) throw new ShellError('ForEach-Object espera objetos pelo pipeline.', 'Exemplo: Get-Process | ForEach-Object { $_.ProcessName }')
    const candidate = args.named.process ?? args.positional[0]
    const expression = candidate && typeof candidate === 'object' && '__scriptblock' in candidate ? candidate.__scriptblock : String(candidate ?? '')
    if (!expression) throw new ShellError('ForEach-Object precisa de um bloco de código.', 'Exemplo: Get-Process | ForEach-Object { $_.ProcessName }')
    const cleaned = expression.trim().replace(/^\{/, '').replace(/\}$/, '').trim()
    const values = []
    for (const object of input) {
      if (/^\$_[.\w]*$/.test(cleaned) || /^".*"$/.test(cleaned) || /^'.*'$/.test(cleaned) || /^[\w.]+\s*[-+*/]/.test(cleaned)) {
        try {
          values.push(evaluateExpression(cleaned, world, { _: object }))
        } catch {
          values.push(stringifyValue(object))
        }
      } else if (/^(Write-Output|write|echo)\s+/i.test(cleaned)) {
        values.push(cleaned.replace(/^(Write-Output|write|echo)\s+/i, '').replace(/^['"]|['"]$/g, ''))
      } else {
        values.push(stringifyValue(object))
      }
    }
    const flat = values.flat()
    const firstValue = flat.find((value) => value !== undefined)
    if (typeof firstValue === 'object' && firstValue !== null) {
      return resultWith(flat, inferMeta(flat), { note: `${input.length} objeto(s) transformado(s).` })
    }
    const rows = flat.map((value) => ({ Value: value }))
    return resultWith(rows, { typeName: 'PSCustomObject', view: 'table', columns: [{ key: 'Value', label: 'Value', align: typeof firstValue === 'number' ? 'right' : 'left' }] }, {
      note: `${input.length} objeto(s) processado(s).`,
    })
  },

  'Group-Object': ({ args, input }) => {
    if (!input.length) throw new ShellError('Group-Object espera objetos pelo pipeline.')
    const property = arg(args, ['Property'], 0)
    if (!property) throw new ShellError('Group-Object precisa de uma propriedade.', 'Exemplo: Get-ADUser -Filter * | Group-Object Department')
    const groups = new Map()
    for (const object of input) {
      const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === String(property).toLowerCase())
      const value = key ? stringifyValue(object[key]) : '(vazio)'
      const normalized = value.toLowerCase()
      if (!groups.has(normalized)) groups.set(normalized, { Name: value, Count: 0, Group: [] })
      const group = groups.get(normalized)
      group.Count += 1
      group.Group.push(object)
    }
    const objects = [...groups.values()].sort((a, b) => b.Count - a.Count || a.Name.localeCompare(b.Name, 'pt-BR'))
    const noElement = flag(args, 'noelement')
    if (noElement) objects.forEach((object) => delete object.Group)
    const columns = [
      { key: 'Count', label: 'Count', align: 'right' },
      { key: 'Name', label: 'Name' },
    ]
    if (!noElement) columns.push({ key: 'Group', label: 'Group' })
    return resultWith(objects, { typeName: 'GroupInfo', view: 'table', columns }, {
      note: `Agrupado por ${property}: ${objects.length} grupo(s).`,
    })
  },

  'Format-Table': ({ args, input, inputMeta }) => {
    if (!input.length) return resultWith([], { typeName: 'None', view: 'none', columns: [] })
    const raw = args.named.property !== undefined
      ? String(args.named.property)
      : args.positional.filter((value) => typeof value === 'string').join(',')
    const properties = raw.split(/[,\s]+/).filter(Boolean)
    let columns = inputMeta?.columns ?? inferColumns(input)
    if (properties.length) {
      columns = properties.map((property) => {
        const key = Object.keys(input[0]).find((candidate) => candidate.toLowerCase() === property.toLowerCase()) ?? property
        return { key, label: property, align: typeof input[0][key] === 'number' ? 'right' : 'left' }
      })
    }
    return resultWith(input, { ...(inputMeta ?? inferMeta(input)), view: 'table', columns }, {
      note: flag(args, 'autosize') ? 'Tabela com colunas ajustadas automaticamente.' : '',
    })
  },

  'Format-List': ({ args, input, inputMeta }) => {
    if (!input.length) return resultWith([], { typeName: 'None', view: 'none', columns: [] })
    const raw = args.named.property !== undefined
      ? String(args.named.property)
      : args.positional.filter((value) => typeof value === 'string').join(',')
    const properties = raw.split(/[,\s]+/).filter(Boolean)
    let columns = inputMeta?.columns ?? inferColumns(input)
    if (properties.length && properties[0] !== '*') {
      columns = properties.map((property) => {
        const key = Object.keys(input[0]).find((candidate) => candidate.toLowerCase() === property.toLowerCase()) ?? property
        return { key, label: property, align: 'left' }
      })
    }
    return resultWith(input, { ...(inputMeta ?? inferMeta(input)), view: 'list', columns })
  },

  'Out-String': ({ input }) => {
    const text = input.map((object) => stringifyValue(object)).join('\n')
    return {
      objects: input,
      meta: { typeName: 'String', view: 'text', text, columns: [] },
      effects: [],
      hostMessages: [],
      warnings: [],
      note: '',
    }
  },

  'Get-Process': ({ args, world }) => {
    const name = arg(args, ['Name'], 0, '')
    const idValue = arg(args, ['Id'])
    let processes = [...world.processes]
    if (name) {
      const names = splitList(name)
      const regexes = names.map((item) => wildcardToRegExp(String(item).replace(/\.exe$/i, '')))
      processes = processes.filter((process) => regexes.some((regex) => regex.test(process.ProcessName)))
      if (!processes.length) {
        throw new ShellError(`Não foi possível encontrar um processo com o nome '${names.join(', ')}'.`, 'Use Get-Process para ver os nomes exatos.')
      }
    }
    if (idValue !== undefined) {
      const ids = splitList(idValue).map((value) => toNumber(value))
      processes = processes.filter((process) => ids.includes(process.Id))
      if (!processes.length) throw new ShellError(`Não foi possível encontrar um processo com o Id '${idValue}'.`, 'Consulte os PIDs com Get-Process.')
    }
    const objects = processes
      .sort((a, b) => a.ProcessName.localeCompare(b.ProcessName) || a.Id - b.Id)
      .map((process) => ({
        ...process,
        UserName: flag(args, 'includeusername') ? 'LAB\\miguel' : undefined,
      }))
    const columns = [
      { key: 'ProcessName', label: 'ProcessName' },
      { key: 'Id', label: 'Id', align: 'right' },
      { key: 'CPU', label: 'CPU (s)', align: 'right' },
      { key: 'WorkingSet', label: 'WS (MB)', align: 'right' },
      { key: 'Status', label: 'Status' },
    ]
    if (flag(args, 'includeusername')) columns.push({ key: 'UserName', label: 'UserName' })
    return resultWith(objects, { typeName: 'ProcessInfo', view: 'table', columns })
  },

  'Stop-Process': ({ args, world }) => {
    const name = arg(args, ['Name'], 0, '')
    const idValue = arg(args, ['Id'])
    if (!name && idValue === undefined) throw new ShellError('Stop-Process precisa de -Name ou -Id.', 'Exemplo: Stop-Process -Name notepad')
    const targets = []
    if (idValue !== undefined) {
      for (const rawId of splitList(idValue)) {
        const process = world.processes.find((item) => item.Id === toNumber(rawId))
        if (process) targets.push(process)
      }
    }
    if (name) {
      const names = splitList(name)
      const regexes = names.map((item) => wildcardToRegExp(String(item).replace(/\.exe$/i, '')))
      targets.push(...world.processes.filter((process) => regexes.some((regex) => regex.test(process.ProcessName))))
    }
    if (!targets.length) throw new ShellError(`Não foi possível encontrar o processo '${name || idValue}' para encerrar.`, 'Confira o nome com Get-Process.')
    const unique = [...new Map(targets.map((process) => [process.Id, process])).values()]
    if (flag(args, 'whatif')) {
      return resultWith(unique, { typeName: 'ProcessInfo', view: 'table', columns: [
        { key: 'Id', label: 'Id', align: 'right' }, { key: 'ProcessName', label: 'ProcessName' },
      ] }, { note: `WhatIf: encerraria ${unique.length} processo(s), sem alterar nada.` })
    }
    for (const process of unique) {
      world.processes = world.processes.filter((item) => item.Id !== process.Id)
    }
    return {
      objects: flag(args, 'passthru') ? unique : [],
      meta: flag(args, 'passthru') ? { typeName: 'ProcessInfo', view: 'table', columns: [
        { key: 'Id', label: 'Id', align: 'right' }, { key: 'ProcessName', label: 'ProcessName' },
      ] } : { typeName: 'None', view: 'none', columns: [] },
      effects: unique.map((process) => effect('process:stop', { id: process.Id, name: process.ProcessName, cpu: process.CPU })),
      note: `${unique.length} processo(s) encerrado(s): ${unique.map((process) => process.ProcessName).join(', ')}.`,
    }
  },

  'Start-Process': ({ args, world }) => {
    const filePath = arg(args, ['FilePath'], 0)
    if (!filePath) throw new ShellError('Start-Process precisa de -FilePath.', 'Exemplo: Start-Process notepad.exe')
    const executable = baseNameOf(String(filePath).replace(/\//g, '\\')).replace(/\.exe$/i, '') || 'novo-processo'
    const processName = executable.charAt(0).toUpperCase() + executable.slice(1)
    const existing = [...world.processes].sort((a, b) => b.Id - a.Id)[0]
    const newProcess = {
      Id: (existing?.Id ?? 1000) + 4,
      ProcessName: processName,
      CPU: 0.1,
      WorkingSet: 24.8,
      Status: 'Running',
      StartTime: formatDate(),
      Responding: true,
      Path: String(filePath),
    }
    world.processes.push(newProcess)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('process:start', { id: newProcess.Id, name: newProcess.ProcessName, path: String(filePath) })],
      note: `Processo simulado iniciado: ${newProcess.ProcessName} (PID ${newProcess.Id}).`,
    }
  },

  'Get-Service': ({ args, world }) => {
    const name = arg(args, ['Name'], 0, '')
    const displayName = arg(args, ['DisplayName'])
    let services = [...world.services]
    if (name) {
      const regexes = splitList(name).map((item) => wildcardToRegExp(item))
      services = services.filter((service) => regexes.some((regex) => regex.test(service.Name) || regex.test(service.DisplayName)))
      if (!services.length) throw new ShellError(`Não foi possível encontrar o serviço '${name}'.`, 'Use Get-Service sem filtro para ver os nomes disponíveis.')
    }
    if (displayName) {
      const regex = wildcardToRegExp(displayName)
      services = services.filter((service) => regex.test(service.DisplayName))
    }
    services.sort((a, b) => a.Name.localeCompare(b.Name))
    return resultWith(services.map((service) => ({
      Status: service.Status,
      Name: service.Name,
      DisplayName: service.DisplayName,
      StartType: service.StartType,
    })), { typeName: 'ServiceController', view: 'table', columns: [
      { key: 'Status', label: 'Status' },
      { key: 'Name', label: 'Name' },
      { key: 'DisplayName', label: 'DisplayName' },
      { key: 'StartType', label: 'StartType' },
    ] })
  },

  'Start-Service': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Start-Service precisa do nome do serviço.', 'Exemplo: Start-Service -Name Spooler')
    const services = resolveServices(world, name)
    const effects = []
    for (const service of services) {
      if (service.Status === 'Running') continue
      const from = service.Status
      service.Status = 'Running'
      effects.push(effect('service:state', { name: service.Name, displayName: service.DisplayName, from, to: 'Running', action: 'start' }))
    }
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects,
      note: effects.length ? `${effects.length} serviço(s) iniciado(s).` : 'Os serviços já estavam em execução.',
    }
  },

  'Stop-Service': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Stop-Service precisa do nome do serviço.', 'Exemplo: Stop-Service -Name Spooler')
    const services = resolveServices(world, name)
    const effects = []
    for (const service of services) {
      if (!service.CanStop) throw new ShellError(`O serviço '${service.Name}' não pode ser interrompido no laboratório.`, 'Serviços essenciais do sistema são protegidos para evitar efeitos colaterais.')
      if (service.Status === 'Stopped') continue
      const from = service.Status
      service.Status = 'Stopped'
      effects.push(effect('service:state', { name: service.Name, displayName: service.DisplayName, from, to: 'Stopped', action: 'stop' }))
    }
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects,
      note: effects.length ? `${effects.length} serviço(s) parado(s).` : 'Os serviços já estavam parados.',
    }
  },

  'Restart-Service': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Restart-Service precisa do nome do serviço.', 'Exemplo: Restart-Service -Name Spooler')
    const services = resolveServices(world, name)
    const effects = []
    for (const service of services) {
      if (!service.CanStop) throw new ShellError(`O serviço '${service.Name}' não pode ser reiniciado no laboratório.`, 'Serviços essenciais são protegidos.')
      const from = service.Status
      service.Status = 'Running'
      effects.push(effect('service:state', { name: service.Name, displayName: service.DisplayName, from, to: 'Running', action: 'restart' }))
    }
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects,
      note: `${effects.length} serviço(s) reiniciado(s).`,
    }
  },

  'Set-Service': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    const startupType = arg(args, ['StartupType'])
    if (!name || !startupType) throw new ShellError('Set-Service precisa de -Name e -StartupType.', 'Exemplo: Set-Service -Name Spooler -StartupType Manual')
    const normalizedType = ['Automatic', 'Manual', 'Disabled'].find((value) => value.toLowerCase() === String(startupType).toLowerCase())
    if (!normalizedType) throw new ShellError(`StartupType '${startupType}' não é válido.`, 'Use Automatic, Manual ou Disabled.')
    const services = resolveServices(world, name)
    const effects = []
    for (const service of services) {
      const from = service.StartType
      service.StartType = normalizedType
      effects.push(effect('service:startup', { name: service.Name, displayName: service.DisplayName, from, to: normalizedType }))
    }
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects,
      note: `Tipo de inicialização alterado para ${normalizedType}.`,
    }
  },

  'Get-ComputerInfo': ({ world }) => {
    const record = {
      WindowsProductName: world.os,
      WindowsVersion: '24H2',
      OsBuildNumber: '26100.2314',
      CsName: world.hostname,
      CsManufacturer: 'Dell Inc.',
      CsModel: 'Latitude 7440',
      CsNumberOfLogicalProcessors: 16,
      CsTotalPhysicalMemory: 34359738368,
      OsArchitecture: '64 bits',
      WindowsInstallDate: '12/03/2025 14:22',
      TimeZone: '(UTC-03:00) Brasília',
      Domain: world.domain,
      UserName: 'LAB\\miguel',
      PowerShellVersion: world.psVersion,
    }
    const columns = Object.keys(record).map((key) => ({ key, label: key, align: typeof record[key] === 'number' ? 'right' : 'left' }))
    return resultWith([record], { typeName: 'ComputerInfo', view: 'list', columns })
  },

  'Get-CimInstance': ({ args, world }) => {
    const className = String(arg(args, ['ClassName'], 0, '') ?? '')
    if (!className) {
      throw new ShellError('Get-CimInstance precisa de -ClassName.', 'Exemplos: Win32_OperatingSystem, Win32_LogicalDisk, Win32_ComputerSystem.')
    }
    const normalized = className.toLowerCase()
    const bytesUsed = countFsEntries(getDriveRoot(world, 'C')).bytes
    const totalMemory = 34359738368
    const freeMemory = 12884901888

    if (normalized === 'win32_operatingsystem') {
      const record = {
        Caption: world.os,
        Version: '10.0.26100',
        BuildNumber: '26100',
        OSArchitecture: '64-bit',
        LastBootUpTime: '16/11/2026 08:00',
        FreePhysicalMemory: Math.round(freeMemory / 1024),
        TotalVisibleMemorySize: Math.round(totalMemory / 1024),
        SerialNumber: 'PF3X9A2C',
        SystemDirectory: 'C:\\Windows\\System32',
      }
      return resultWith([record], { typeName: 'Win32_OperatingSystem', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key })) })
    }
    if (normalized === 'win32_computersystem') {
      const record = {
        Name: world.hostname,
        Manufacturer: 'Dell Inc.',
        Model: 'Latitude 7440',
        Domain: world.domain,
        TotalPhysicalMemory: totalMemory,
        NumberOfLogicalProcessors: 16,
        UserName: 'LAB\\miguel',
      }
      return resultWith([record], { typeName: 'Win32_ComputerSystem', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key, align: typeof record[key] === 'number' ? 'right' : 'left' })) })
    }
    if (normalized === 'win32_logicaldisk') {
      const record = {
        DeviceID: 'C:',
        DriveType: 3,
        FileSystem: 'NTFS',
        VolumeName: 'Sistema',
        Size: 536870912000,
        FreeSpace: 536870912000 - bytesUsed - 398458880000,
      }
      return resultWith([record], { typeName: 'Win32_LogicalDisk', view: 'table', columns: [
        { key: 'DeviceID', label: 'DeviceID' },
        { key: 'DriveType', label: 'DriveType', align: 'right' },
        { key: 'FileSystem', label: 'FileSystem' },
        { key: 'Size', label: 'Size', align: 'right', format: 'bytes' },
        { key: 'FreeSpace', label: 'FreeSpace', align: 'right', format: 'bytes' },
      ] })
    }
    if (normalized === 'win32_bios') {
      const record = {
        Manufacturer: 'Dell Inc.',
        Name: '1.18.2',
        SerialNumber: 'PF3X9A2C',
        SMBIOSBIOSVersion: '1.18.2',
        ReleaseDate: '12/08/2025 00:00:00',
      }
      return resultWith([record], { typeName: 'Win32_BIOS', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key })) })
    }
    if (normalized === 'win32_processor') {
      const record = {
        Name: '13th Gen Intel(R) Core(TM) i7-1365U',
        NumberOfCores: 10,
        NumberOfLogicalProcessors: 12,
        MaxClockSpeed: 5200,
        Status: 'OK',
      }
      return resultWith([record], { typeName: 'Win32_Processor', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key, align: typeof record[key] === 'number' ? 'right' : 'left' })) })
    }
    if (normalized === 'win32_process') {
      const objects = world.processes.map((process) => ({
        ProcessId: process.Id,
        Name: `${process.ProcessName}.exe`,
        WorkingSetSize: Math.round(process.WorkingSet * 1024 * 1024),
        CreationDate: process.StartTime,
      }))
      return resultWith(objects, { typeName: 'Win32_Process', view: 'table', columns: [
        { key: 'ProcessId', label: 'ProcessId', align: 'right' },
        { key: 'Name', label: 'Name' },
        { key: 'WorkingSetSize', label: 'WorkingSetSize', align: 'right', format: 'bytes' },
      ] })
    }
    if (normalized === 'win32_networkadapterconfiguration') {
      const config = world.network.ipConfig
      const record = {
        Description: 'Intel(R) Ethernet Controller I225-V',
        IPAddress: [config.IPv4Address, config.IPv6Address],
        IPEnabled: true,
        MACAddress: config.MacAddress.replace(/-/g, ':'),
        DefaultIPGateway: [config.DefaultGateway],
        DNSServerSearchOrder: config.DNSServers,
      }
      return resultWith([record], { typeName: 'Win32_NetworkAdapterConfiguration', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key })) })
    }
    throw new ShellError(`A classe CIM '${className}' não está disponível no laboratório.`, 'Tente Win32_OperatingSystem, Win32_ComputerSystem, Win32_LogicalDisk, Win32_Processor, Win32_BIOS, Win32_Process ou Win32_NetworkAdapterConfiguration.')
  },

  'Get-Volume': ({ world }) => {
    const used = countFsEntries(getDriveRoot(world, 'C')).bytes
    const objects = [
      { DriveLetter: 'C', FileSystemLabel: 'Sistema', FileSystem: 'NTFS', SizeRemaining: 51539607552, Size: 536870912000, HealthStatus: 'Healthy', DriveType: 'Fixed' },
      { DriveLetter: 'D', FileSystemLabel: 'Dados', FileSystem: 'NTFS', SizeRemaining: 172067600384, Size: 536870912000, HealthStatus: 'Healthy', DriveType: 'Fixed' },
    ]
    return resultWith(objects, { typeName: 'Volume', view: 'table', columns: [
      { key: 'DriveLetter', label: 'DriveLetter' },
      { key: 'FileSystemLabel', label: 'FileSystemLabel' },
      { key: 'FileSystem', label: 'FileSystem' },
      { key: 'SizeRemaining', label: 'SizeRemaining', align: 'right', format: 'bytes' },
      { key: 'Size', label: 'Size', align: 'right', format: 'bytes' },
      { key: 'HealthStatus', label: 'HealthStatus' },
    ] })
  },

  'Get-HotFix': ({ args }) => {
    const id = arg(args, ['Id'], 0)
    const objects = [
      { Source: 'WS-MIGUEL', Description: 'Update', HotFixID: 'KB5066188', InstalledOn: '12/11/2026' },
      { Source: 'WS-MIGUEL', Description: 'Security Update', HotFixID: 'KB5065426', InstalledOn: '15/10/2026' },
      { Source: 'WS-MIGUEL', Description: 'Update', HotFixID: 'KB5053598', InstalledOn: '11/03/2026' },
    ]
    const filtered = id ? objects.filter((item) => item.HotFixID.toLowerCase() === String(id).toLowerCase()) : objects
    if (id && !filtered.length) throw new ShellError(`O hotfix '${id}' não foi encontrado.`, 'Use Get-HotFix sem filtro para listar todos.')
    return resultWith(filtered, { typeName: 'HotFix', view: 'table', columns: [
      { key: 'Source', label: 'Source' },
      { key: 'Description', label: 'Description' },
      { key: 'HotFixID', label: 'HotFixID' },
      { key: 'InstalledOn', label: 'InstalledOn' },
    ] })
  },

  'Get-TimeZone': () => {
    const record = {
      Id: 'E. South America Standard Time',
      DisplayName: '(UTC-03:00) Brasília',
      BaseUtcOffset: '-03:00:00',
      SupportsDaylightSavingTime: false,
    }
    return resultWith([record], { typeName: 'TimeZoneInfo', view: 'list', columns: [
      { key: 'Id', label: 'Id' },
      { key: 'DisplayName', label: 'DisplayName' },
      { key: 'BaseUtcOffset', label: 'BaseUtcOffset' },
      { key: 'SupportsDaylightSavingTime', label: 'SupportsDaylightSavingTime' },
    ] })
  },
})

function resolveServices(world, name) {
  const regexes = splitList(name).map((item) => wildcardToRegExp(item))
  const services = world.services.filter((service) => regexes.some((regex) => regex.test(service.Name) || regex.test(service.DisplayName)))
  if (!services.length) throw new ShellError(`Não foi possível encontrar o serviço '${name}'.`, 'Use Get-Service para ver os nomes disponíveis.')
  return services
}

Object.assign(COMMAND_HANDLERS, {
  'Get-ADDomain': ({ world }) => {
    const domain = world.ad.domain
    const record = {
      DNSRoot: domain.Name,
      NetBIOSName: domain.NetBIOSName,
      DistinguishedName: domain.DistinguishedName,
      DomainMode: domain.DomainMode,
      Forest: domain.Forest,
      PDCEmulator: domain.PDCEmulator,
      ChildDomains: [],
      ParentDomain: null,
    }
    return resultWith([record], { typeName: 'ADDomain', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key })) })
  },

  'Get-ADUser': ({ args, world }) => {
    const identity = arg(args, ['Identity'])
    const filterValue = arg(args, ['Filter'])
    const propertiesValue = arg(args, ['Properties'], null, '')
    const searchBase = arg(args, ['SearchBase'])
    if (!identity && filterValue === undefined) {
      throw new ShellError('Get-ADUser precisa de -Filter ou -Identity.', 'Comece com: Get-ADUser -Filter *')
    }
    let users = [...world.ad.users]
    if (identity) {
      const user = findADUser(world, identity)
      if (!user) throw new ShellError(`Não foi possível encontrar um usuário do AD com a identidade '${identity}'.`, 'Use Get-ADUser -Filter * para ver os logins disponíveis.')
      users = [user]
    } else {
      const filter = filterValue && typeof filterValue === 'object' ? filterValue.__scriptblock : filterValue
      users = users.filter((user) => matchesADFilter(user, filter, world))
    }
    if (searchBase) {
      const base = String(searchBase).toLowerCase()
      users = users.filter((user) => user.DistinguishedName.toLowerCase().includes(base) || user.OU.toLowerCase() === base)
    }
    const properties = String(propertiesValue ?? '').split(/[,\s]+/).filter(Boolean)
    const extraColumns = properties.includes('*')
      ? ['Title', 'EmailAddress', 'LastLogon']
      : properties.filter((property) => !['*'].includes(property))
        .map((property) => {
          const sample = users[0] ?? {}
          return Object.keys(sample).find((key) => key.toLowerCase() === property.toLowerCase()) ?? property
        })
    const objects = users.map((user) => adUserRow(user, extraColumns)).sort((a, b) => a.Name.localeCompare(b.Name, 'pt-BR'))
    return resultWith(objects, {
      typeName: 'ADUser',
      view: 'table',
      columns: adUserColumns(extraColumns),
    }, {
      note: objects.length === 0 ? 'Nenhum usuário corresponde ao filtro.' : `${objects.length} usuário(s) encontrado(s) em ${world.ad.domain.Name}.`,
    })
  },

  'New-ADUser': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    const sam = arg(args, ['SamAccountName'])
    if (!name) throw new ShellError('New-ADUser precisa de -Name.', 'Inclua também -SamAccountName e escolha uma -Path (OU).')
    if (!sam) throw new ShellError('New-ADUser precisa de -SamAccountName.', `Exemplo: -SamAccountName ${toSamAccountName(name)}`)
    if (!/^[\w.-]+$/.test(String(sam))) throw new ShellError(`O SamAccountName '${sam}' contém caracteres inválidos.`, 'Use letras, números, ponto ou hífen.')
    if (world.ad.users.some((user) => user.SamAccountName.toLowerCase() === String(sam).toLowerCase())) {
      throw new ShellError(`Já existe um usuário com o SamAccountName '${sam}'.`, 'Escolha outro login ou consulte o usuário com Get-ADUser -Filter *.')
    }
    const upn = arg(args, ['UserPrincipalName'], null, `${sam}@${world.ad.domain.Name}`)
    if (world.ad.users.some((user) => String(user.UserPrincipalName).toLowerCase() === String(upn).toLowerCase())) {
      throw new ShellError(`O UserPrincipalName '${upn}' já está em uso.`, 'Use um login diferente.')
    }
    const pathRaw = arg(args, ['Path'], null, 'OU=Usuários,DC=lab,DC=local')
    const ou = resolveADPath(world, pathRaw)
    if (!ou) {
      throw new ShellError(`A OU '${pathRaw}' não existe no domínio.`, `OUs disponíveis: ${world.ad.ous.map((item) => item.Name).join(', ')}.`)
    }
    const givenName = arg(args, ['GivenName'], null, String(name).trim().split(/\s+/)[0] ?? '')
    const surname = arg(args, ['Surname'], null, String(name).trim().split(/\s+/).slice(1).join(' '))
    const enabled = normalizeBoolean(arg(args, ['Enabled'], null, false))
    const title = arg(args, ['Title'], null, '')
    const department = arg(args, ['Department'], null, '')
    const email = arg(args, ['EmailAddress'], null, String(upn))
    const description = arg(args, ['Description'], null, 'Conta criada no laboratório')
    const user = {
      Name: String(name),
      SamAccountName: String(sam),
      UserPrincipalName: String(upn),
      Enabled: enabled,
      LockedOut: false,
      GivenName: givenName,
      Surname: surname,
      Department: department,
      Title: title,
      EmailAddress: email,
      DistinguishedName: `CN=${name},${ou.DistinguishedName}`,
      OU: ou.Name,
      Groups: [],
      Created: formatDate(),
      LastLogon: 'Nunca',
      Description: description,
    }
    world.ad.users.push(user)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('ad:user:create', {
        user: {
          name: user.Name,
          sam: user.SamAccountName,
          upn: user.UserPrincipalName,
          ou: user.OU,
          department: user.Department,
          title: user.Title,
          enabled: user.Enabled,
          distinguishedName: user.DistinguishedName,
        },
        groups: [],
      })],
      note: `Conta criada em ${ou.Name}: ${user.Name} (${user.SamAccountName}).`,
    }
  },

  'Set-ADUser': ({ args, world }) => {
    const identity = arg(args, ['Identity'], 0)
    if (!identity) throw new ShellError('Set-ADUser precisa de -Identity.', 'Exemplo: Set-ADUser -Identity ana.silva -Title "Gerente de TI"')
    const user = findADUser(world, identity)
    if (!user) throw new ShellError(`Usuário '${identity}' não encontrado no domínio.`, 'Confira o login com Get-ADUser -Filter *.')
    const candidates = {
      title: 'Title',
      department: 'Department',
      emailaddress: 'EmailAddress',
      description: 'Description',
      givenname: 'GivenName',
      surname: 'Surname',
      manager: 'Manager',
    }
    const changes = []
    for (const [parameter, property] of Object.entries(candidates)) {
      const value = args.named[parameter]
      if (value === undefined) continue
      let nextValue = value
      if (property === 'Manager') {
        const manager = findADUser(world, value)
        nextValue = manager ? manager.Name : String(value)
      }
      changes.push({ field: property, before: user[property] ?? '', after: String(nextValue ?? '') })
      user[property] = String(nextValue ?? '')
    }
    if (!changes.length) {
      throw new ShellError('Nenhuma propriedade foi informada para alterar.', 'Exemplo: Set-ADUser -Identity lara.martins -Title "Analista"')
    }
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('ad:user:update', {
        name: user.Name,
        sam: user.SamAccountName,
        changes,
      })],
      note: `${changes.length} propriedade(s) atualizada(s) em ${user.SamAccountName}.`,
    }
  },

  'Enable-ADAccount': ({ args, world }) => changeADAccount(args, world, 'enable'),
  'Disable-ADAccount': ({ args, world }) => changeADAccount(args, world, 'disable'),
  'Unlock-ADAccount': ({ args, world }) => changeADAccount(args, world, 'unlock'),

  'Get-ADGroup': ({ args, world }) => {
    const identity = arg(args, ['Identity'])
    const filterValue = arg(args, ['Filter'])
    if (!identity && filterValue === undefined) {
      throw new ShellError('Get-ADGroup precisa de -Filter ou -Identity.', 'Comece com: Get-ADGroup -Filter *')
    }
    let groups = [...world.ad.groups]
    if (identity) {
      const group = findADGroup(world, identity)
      if (!group) throw new ShellError(`Grupo '${identity}' não encontrado no AD.`, 'Use Get-ADGroup -Filter * para listar os grupos.')
      groups = [group]
    } else {
      const filter = filterValue && typeof filterValue === 'object' ? filterValue.__scriptblock : filterValue
      groups = groups.filter((group) => matchesADFilter(group, filter, world))
    }
    const objects = groups.map((group) => ({
      Name: group.Name,
      SamAccountName: group.SamAccountName,
      Scope: group.Scope,
      Category: group.Category,
      Description: group.Description,
      MemberCount: group.Members.length,
      Members: group.Members,
      DistinguishedName: group.DistinguishedName,
    })).sort((a, b) => a.Name.localeCompare(b.Name, 'pt-BR'))
    return resultWith(objects, { typeName: 'ADGroup', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Scope', label: 'Scope' },
      { key: 'MemberCount', label: 'Members', align: 'right' },
      { key: 'Description', label: 'Description' },
    ] }, {
      note: objects.length === 0 ? 'Nenhum grupo corresponde ao filtro.' : `${objects.length} grupo(s) encontrado(s).`,
    })
  },

  'Get-ADGroupMember': ({ args, world }) => {
    const identity = arg(args, ['Identity'], 0)
    if (!identity) throw new ShellError('Get-ADGroupMember precisa de -Identity.', 'Exemplo: Get-ADGroupMember -Identity TI-Suporte')
    const group = findADGroup(world, identity)
    if (!group) throw new ShellError(`Grupo '${identity}' não encontrado no AD.`, 'Confira o nome com Get-ADGroup -Filter *.')
    const objects = group.Members
      .map((member) => describeADMember(world, member))
      .filter(Boolean)
      .map((member) => ({ Name: member.name, SamAccountName: member.sam, ObjectClass: member.objectClass }))
    return resultWith(objects, { typeName: 'ADPrincipal', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'SamAccountName', label: 'SamAccountName' },
      { key: 'ObjectClass', label: 'ObjectClass' },
    ] }, {
      note: objects.length === 0 ? 'O grupo está vazio.' : `${objects.length} membro(s) em ${group.Name}.`,
    })
  },

  'Add-ADGroupMember': ({ args, world }) => {
    const identity = arg(args, ['Identity'], 0)
    const rawMembers = args.named.members ?? args.positional.slice(1).join(',')
    if (!identity) throw new ShellError('Add-ADGroupMember precisa do grupo em -Identity.', 'Exemplo: Add-ADGroupMember -Identity TI-Suporte -Members lara.martins')
    if (!rawMembers) throw new ShellError('Informe quem deve entrar no grupo com -Members.', 'Exemplo: -Members lara.martins')
    const group = findADGroup(world, identity)
    if (!group) throw new ShellError(`Grupo '${identity}' não encontrado no AD.`, 'Use Get-ADGroup -Filter * para conferir os grupos.')
    const members = []
    const missing = []
    for (const requested of splitList(rawMembers)) {
      const described = describeADMember(world, requested)
      if (!described) {
        missing.push(requested)
        continue
      }
      if (!group.Members.some((member) => member.toLowerCase() === described.sam.toLowerCase())) {
        group.Members.push(described.sam)
        members.push(described)
      }
    }
    if (missing.length) throw new ShellError(`Não encontrei a(s) identidade(s): ${missing.join(', ')}.`, 'Use o SamAccountName exato de um usuário, computador ou grupo do domínio.')
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: members.length ? [effect('ad:group:members', {
        action: 'add',
        group: group.Name,
        groupSam: group.SamAccountName,
        members,
      })] : [],
      note: members.length ? `${members.map((member) => member.name).join(', ')} agora participa de ${group.Name}.` : 'Os membros já participavam do grupo.',
    }
  },

  'Remove-ADGroupMember': ({ args, world }) => {
    const identity = arg(args, ['Identity'], 0)
    const rawMembers = args.named.members ?? args.positional.slice(1).join(',')
    if (!identity || !rawMembers) throw new ShellError('Informe o grupo e os membros a remover.', 'Exemplo: Remove-ADGroupMember -Identity TI-Suporte -Members bruno.costa')
    const group = findADGroup(world, identity)
    if (!group) throw new ShellError(`Grupo '${identity}' não encontrado.`)
    const removed = []
    for (const requested of splitList(rawMembers)) {
      const described = describeADMember(world, requested)
      const index = group.Members.findIndex((member) => member.toLowerCase() === (described?.sam ?? requested).toLowerCase())
      if (index >= 0) {
        removed.push(described ?? { name: requested, sam: requested, objectClass: 'Usuário' })
        group.Members.splice(index, 1)
      }
    }
    if (!removed.length) throw new ShellError('Nenhum dos membros informados pertence ao grupo.', 'Consulte os membros com Get-ADGroupMember.')
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('ad:group:members', {
        action: 'remove',
        group: group.Name,
        groupSam: group.SamAccountName,
        members: removed,
      })],
      note: `${removed.map((member) => member.name ?? member.Name).join(', ')} removido(s) de ${group.Name}.`,
    }
  },

  'Get-ADOrganizationalUnit': ({ args, world }) => {
    const filterValue = arg(args, ['Filter'], 0, '*')
    const filter = filterValue && typeof filterValue === 'object' ? filterValue.__scriptblock : filterValue
    const objects = world.ad.ous
      .filter((ou) => matchesADFilter({ Name: ou.Name, Description: ou.Description, DistinguishedName: ou.DistinguishedName }, filter, world))
      .map((ou) => ({ Name: ou.Name, Description: ou.Description, DistinguishedName: ou.DistinguishedName }))
      .sort((a, b) => a.Name.localeCompare(b.Name, 'pt-BR'))
    return resultWith(objects, { typeName: 'ADOrganizationalUnit', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Description', label: 'Description' },
      { key: 'DistinguishedName', label: 'DistinguishedName' },
    ] })
  },

  'New-ADOrganizationalUnit': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('New-ADOrganizationalUnit precisa de -Name.', 'Exemplo: New-ADOrganizationalUnit -Name Marketing -Path "OU=Usuários,DC=lab,DC=local"')
    if (world.ad.ous.some((ou) => ou.Name.toLowerCase() === String(name).toLowerCase())) {
      throw new ShellError(`Já existe uma OU chamada '${name}'.`, 'Escolha outro nome.')
    }
    const parentPath = arg(args, ['Path'], null, 'OU=Usuários,DC=lab,DC=local')
    const parent = resolveADPath(world, parentPath)
    if (!parent) throw new ShellError(`A OU pai '${parentPath}' não existe.`, `OUs existentes: ${world.ad.ous.map((ou) => ou.Name).join(', ')}.`)
    const ou = {
      Name: String(name),
      DistinguishedName: `OU=${name},${parent.DistinguishedName}`,
      Description: arg(args, ['Description'], null, 'Unidade organizacional criada no laboratório'),
    }
    world.ad.ous.push(ou)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('ad:ou:create', { name: ou.Name, path: ou.DistinguishedName, parent: parent.Name })],
      note: `OU criada: ${ou.Name} (${ou.DistinguishedName}).`,
    }
  },

  'Get-ADComputer': ({ args, world }) => {
    const identity = arg(args, ['Identity'])
    const filterValue = arg(args, ['Filter'])
    if (!identity && filterValue === undefined) {
      throw new ShellError('Get-ADComputer precisa de -Filter ou -Identity.', 'Comece com: Get-ADComputer -Filter *')
    }
    let computers = [...world.ad.computers]
    if (identity) {
      const needle = String(identity).toLowerCase()
      computers = computers.filter((computer) => computer.Name.toLowerCase() === needle || computer.DNSHostName.toLowerCase().includes(needle))
      if (!computers.length) throw new ShellError(`Computador '${identity}' não encontrado no domínio.`, 'Use Get-ADComputer -Filter * para listar as máquinas.')
    } else {
      const filter = filterValue && typeof filterValue === 'object' ? filterValue.__scriptblock : filterValue
      computers = computers.filter((computer) => matchesADFilter(computer, filter, world))
    }
    const objects = computers.map((computer) => ({
      Name: computer.Name,
      DNSHostName: computer.DNSHostName,
      OperatingSystem: computer.OperatingSystem,
      Enabled: computer.Enabled,
      OU: computer.OU,
      LastLogon: computer.LastLogon,
      DistinguishedName: computer.DistinguishedName,
    })).sort((a, b) => a.Name.localeCompare(b.Name))
    return resultWith(objects, { typeName: 'ADComputer', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'DNSHostName', label: 'DNSHostName' },
      { key: 'OperatingSystem', label: 'OperatingSystem' },
      { key: 'Enabled', label: 'Enabled', align: 'center' },
    ] })
  },

  'Search-ADAccount': ({ args, world }) => {
    const lockedOut = flag(args, 'lockedout')
    const disabled = flag(args, 'accountdisabled')
    const passwordNeverExpires = flag(args, 'passwordneverexpires')
    if (!lockedOut && !disabled && !passwordNeverExpires) {
      throw new ShellError('Search-ADAccount precisa de um critério.', 'Exemplos: -LockedOut ou -AccountDisabled -UsersOnly.')
    }
    let users = world.ad.users
    if (lockedOut) users = users.filter((user) => user.LockedOut)
    if (disabled) users = users.filter((user) => !user.Enabled)
    if (passwordNeverExpires) users = users.filter((user) => ['svc-backup', 'administrador'].includes(user.SamAccountName))
    const objects = users.map((user) => ({
      Name: user.Name,
      SamAccountName: user.SamAccountName,
      Enabled: user.Enabled,
      LockedOut: user.LockedOut,
      LastLogon: user.LastLogon,
    })).sort((a, b) => a.Name.localeCompare(b.Name))
    return resultWith(objects, { typeName: 'ADUser', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'SamAccountName', label: 'SamAccountName' },
      { key: 'Enabled', label: 'Enabled', align: 'center' },
      { key: 'LockedOut', label: 'LockedOut', align: 'center' },
      { key: 'LastLogon', label: 'LastLogon' },
    ] }, {
      note: objects.length ? `${objects.length} conta(s) encontrada(s).` : 'Nenhuma conta atende ao critério.',
    })
  },

  'Get-ADPrincipalGroupMembership': ({ args, world }) => {
    const identity = arg(args, ['Identity'], 0)
    if (!identity) throw new ShellError('Get-ADPrincipalGroupMembership precisa de -Identity.', 'Exemplo: Get-ADPrincipalGroupMembership -Identity ana.silva')
    const user = findADUser(world, identity)
    if (!user) throw new ShellError(`Usuário '${identity}' não encontrado.`, 'Confira o login com Get-ADUser -Filter *.')
    const groups = world.ad.groups.filter((group) => group.Members.some((member) => member.toLowerCase() === user.SamAccountName.toLowerCase()))
    const objects = groups.map((group) => ({
      Name: group.Name,
      Scope: group.Scope,
      Description: group.Description,
      DistinguishedName: group.DistinguishedName,
    }))
    return resultWith(objects, { typeName: 'ADGroup', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Scope', label: 'Scope' },
      { key: 'Description', label: 'Description' },
    ] }, {
      note: `${user.Name} participa de ${objects.length} grupo(s).`,
    })
  },
})

function toSamAccountName(name) {
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '.')
}

function matchesADFilter(object, filter, world) {
  if (filter === undefined || filter === null) return true
  const expression = normalizeFilterExpression(filter)
  if (!expression || expression === '*') return true
  let transformed = expression
    .replace(/(^|\(|\s(?:-and|-or)\s+)([A-Za-z_][\w]*)(?=\s+-(?:eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains))/gi, (match, prefix, property) => `${prefix}$_.${property}`)
    .replace(/(^|\(|\s(?:-and|-or)\s+)([A-Za-z_][\w]*)(?=\s*\))/gi, (match, prefix, property) => `${prefix}$_.${property}`)
  try {
    return Boolean(evaluateExpression(transformed, world, { _: object }))
  } catch {
    return false
  }
}

function findADGroup(world, identity) {
  if (!identity) return null
  const needle = String(identity).toLowerCase()
  return world.ad.groups.find((group) =>
    [group.Name, group.SamAccountName, group.DistinguishedName]
      .some((value) => String(value).toLowerCase() === needle || String(value).toLowerCase().includes(needle)),
  ) ?? null
}

function describeADMember(world, identity) {
  const needle = String(identity).toLowerCase()
  const user = world.ad.users.find((item) =>
    [item.SamAccountName, item.Name, item.UserPrincipalName, item.DistinguishedName]
      .some((value) => String(value).toLowerCase() === needle || String(value).toLowerCase().includes(needle)),
  )
  if (user) return { name: user.Name, sam: user.SamAccountName, objectClass: 'Usuário', type: 'user' }
  const group = world.ad.groups.find((item) => [item.Name, item.SamAccountName, item.DistinguishedName].some((value) => String(value).toLowerCase() === needle))
  if (group) return { name: group.Name, sam: group.SamAccountName, objectClass: 'Grupo', type: 'group' }
  const computer = world.ad.computers.find((item) => [item.Name, item.DNSHostName, item.DistinguishedName].some((value) => String(value).toLowerCase() === needle))
  if (computer) return { name: computer.Name, sam: computer.Name, objectClass: 'Computador', type: 'computer' }
  return null
}

function changeADAccount(args, world, action) {
  const identity = arg(args, ['Identity'], 0)
  if (!identity) throw new ShellError(`${action === 'unlock' ? 'Unlock-ADAccount' : action === 'enable' ? 'Enable-ADAccount' : 'Disable-ADAccount'} precisa de -Identity.`, 'Informe o SamAccountName do usuário.')
  const user = findADUser(world, identity)
  if (!user) throw new ShellError(`Usuário '${identity}' não encontrado no domínio.`, 'Confira o login com Get-ADUser -Filter *.')
  const before = { enabled: user.Enabled, lockedOut: user.LockedOut }
  if (action === 'enable') {
    if (user.Enabled) return { objects: [], meta: { typeName: 'None', view: 'none', columns: [] }, note: `${user.SamAccountName} já estava habilitado.` }
    user.Enabled = true
  }
  if (action === 'disable') {
    if (!user.Enabled) return { objects: [], meta: { typeName: 'None', view: 'none', columns: [] }, note: `${user.SamAccountName} já estava desativado.` }
    user.Enabled = false
  }
  if (action === 'unlock') {
    if (!user.LockedOut) return { objects: [], meta: { typeName: 'None', view: 'none', columns: [] }, note: `${user.SamAccountName} não estava bloqueado.` }
    user.LockedOut = false
  }
  return {
    objects: [],
    meta: { typeName: 'None', view: 'none', columns: [] },
    effects: [effect('ad:account', {
      action,
      name: user.Name,
      sam: user.SamAccountName,
      before,
      after: { enabled: user.Enabled, lockedOut: user.LockedOut },
      enabled: user.Enabled,
      lockedOut: user.LockedOut,
    })],
    note: action === 'enable'
      ? `Conta habilitada: ${user.SamAccountName}.`
      : action === 'disable'
        ? `Conta desativada: ${user.SamAccountName}.`
        : `Conta desbloqueada: ${user.SamAccountName}.`,
  }
}

Object.assign(COMMAND_HANDLERS, {
  'Get-NetIPConfiguration': ({ args, world }) => {
    const alias = arg(args, ['InterfaceAlias'], 0)
    if (alias && String(alias).toLowerCase() !== 'ethernet') {
      throw new ShellError(`Não há configuração de IP para a interface '${alias}'.`, 'Use Get-NetAdapter para ver os adaptadores disponíveis.')
    }
    const config = world.network.ipConfig
    const record = {
      InterfaceAlias: 'Ethernet',
      InterfaceDescription: 'Intel(R) Ethernet Controller I225-V',
      IPv4Address: config.IPv4Address,
      PrefixLength: config.PrefixLength,
      DefaultGateway: config.DefaultGateway,
      DNSServers: config.DNSServers,
      IPv6Address: config.IPv6Address,
      MacAddress: config.MacAddress,
      NetProfile: 'Rede da Empresa',
    }
    return resultWith([record], { typeName: 'NetIPConfiguration', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key })) })
  },

  'Get-NetAdapter': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    let adapters = [...world.network.adapters]
    if (name) {
      const regexes = splitList(name).map((item) => wildcardToRegExp(item))
      adapters = adapters.filter((adapter) => regexes.some((regex) => regex.test(adapter.Name)))
      if (!adapters.length) throw new ShellError(`Adaptador '${name}' não encontrado.`, 'Os adaptadores do laboratório são Ethernet e Wi-Fi.')
    }
    return resultWith(adapters, { typeName: 'NetAdapter', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'InterfaceDescription', label: 'InterfaceDescription' },
      { key: 'Status', label: 'Status' },
      { key: 'LinkSpeed', label: 'LinkSpeed' },
      { key: 'MacAddress', label: 'MacAddress' },
    ] })
  },

  'Get-NetIPAddress': ({ args, world }) => {
    const alias = arg(args, ['InterfaceAlias'])
    const family = arg(args, ['AddressFamily'])
    const config = world.network.ipConfig
    let objects = [
      { IPAddress: config.IPv4Address, PrefixLength: 24, AddressFamily: 'IPv4', InterfaceAlias: 'Ethernet', InterfaceIndex: 7 },
      { IPAddress: config.IPv6Address, PrefixLength: 64, AddressFamily: 'IPv6', InterfaceAlias: 'Ethernet', InterfaceIndex: 7 },
      { IPAddress: '127.0.0.1', PrefixLength: 8, AddressFamily: 'IPv4', InterfaceAlias: 'Loopback Pseudo-Interface 1', InterfaceIndex: 1 },
    ]
    if (alias) {
      const regexes = splitList(alias).map((item) => wildcardToRegExp(item))
      objects = objects.filter((item) => regexes.some((regex) => regex.test(item.InterfaceAlias)))
    }
    if (family) objects = objects.filter((item) => item.AddressFamily.toLowerCase() === String(family).toLowerCase())
    return resultWith(objects, { typeName: 'NetIPAddress', view: 'table', columns: [
      { key: 'IPAddress', label: 'IPAddress' },
      { key: 'PrefixLength', label: 'PrefixLength', align: 'right' },
      { key: 'AddressFamily', label: 'AddressFamily' },
      { key: 'InterfaceAlias', label: 'InterfaceAlias' },
    ] })
  },

  'Get-NetRoute': ({ args, world }) => {
    const alias = arg(args, ['InterfaceAlias'])
    let routes = [...world.network.routes]
    if (alias) routes = routes.filter((route) => route.InterfaceAlias.toLowerCase().includes(String(alias).toLowerCase()))
    return resultWith(routes, { typeName: 'NetRoute', view: 'table', columns: [
      { key: 'DestinationPrefix', label: 'DestinationPrefix' },
      { key: 'NextHop', label: 'NextHop' },
      { key: 'InterfaceAlias', label: 'InterfaceAlias' },
      { key: 'RouteMetric', label: 'RouteMetric', align: 'right' },
    ] })
  },

  'Get-DnsClientServerAddress': ({ args, world }) => {
    const alias = arg(args, ['InterfaceAlias'])
    if (alias && String(alias).toLowerCase() !== 'ethernet') {
      throw new ShellError(`Interface '${alias}' não encontrada.`)
    }
    const objects = [
      { InterfaceAlias: 'Ethernet', InterfaceIndex: 7, AddressFamily: 'IPv4', ServerAddresses: world.network.ipConfig.DNSServers },
      { InterfaceAlias: 'Ethernet', InterfaceIndex: 7, AddressFamily: 'IPv6', ServerAddresses: ['2606:4700:4700::1111'] },
    ]
    return resultWith(objects, { typeName: 'DnsClientServerAddress', view: 'table', columns: [
      { key: 'InterfaceAlias', label: 'InterfaceAlias' },
      { key: 'AddressFamily', label: 'AddressFamily' },
      { key: 'ServerAddresses', label: 'ServerAddresses' },
    ] })
  },

  'Resolve-DnsName': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Resolve-DnsName precisa de um nome.', 'Exemplo: Resolve-DnsName intranet.lab.local')
    const type = String(arg(args, ['Type'], null, 'A')).toUpperCase()
    const found = Object.entries(world.network.hosts).find(([host]) => host.toLowerCase() === String(name).toLowerCase())
    const ipLike = String(name).match(/^\d{1,3}(\.\d{1,3}){3}$/)
    if (!found && !ipLike) {
      throw new ShellError(`O nome '${name}' não pôde ser resolvido pelo DNS do laboratório.`, 'Tente SRV-DC01, SRV-FILE01, intranet.lab.local, github.com ou google.com.')
    }
    if (type !== 'A') {
      return resultWith([], { typeName: 'DnsRecord', view: 'none', columns: [] }, { note: `Nenhum registro ${type} encontrado para ${name} neste laboratório.` })
    }
    const record = {
      Name: found ? found[0] : String(name),
      Type: 'A',
      TTL: 1200,
      IPAddress: found ? found[1].address : String(name),
      Section: 'Answer',
    }
    return resultWith([record], { typeName: 'DnsRecord', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Type', label: 'Type' },
      { key: 'TTL', label: 'TTL', align: 'right' },
      { key: 'IPAddress', label: 'IPAddress' },
    ] })
  },

  'Test-Connection': ({ args, world }) => {
    const computerName = arg(args, ['ComputerName'], 0)
    if (!computerName) throw new ShellError('Test-Connection precisa de um destino.', 'Exemplo: Test-Connection SRV-DC01 -Count 2')
    const host = resolveHost(world, computerName)
    if (!host) throw new ShellError(`Não foi possível encontrar o host '${computerName}'.`, 'Tente SRV-DC01, SRV-FILE01, 192.168.1.1 ou github.com.')
    if (flag(args, 'quiet')) {
      return {
        objects: [{ Value: true }],
        meta: { typeName: 'Boolean', view: 'text', text: 'True', columns: [] },
        note: `${computerName} respondeu.`,
      }
    }
    const count = Math.min(10, Math.max(1, toNumber(arg(args, ['Count'], null, 4), 4)))
    const objects = Array.from({ length: count }, (_, index) => ({
      Source: world.hostname,
      Destination: computerName,
      IPV4Address: host.address,
      ResponseTime: 1 + ((host.address.split('.').reduce((sum, part) => sum + toNumber(part), index) + index) % 12),
      StatusCode: 'Success',
    }))
    return resultWith(objects, { typeName: 'PingReply', view: 'table', columns: [
      { key: 'Source', label: 'Source' },
      { key: 'Destination', label: 'Destination' },
      { key: 'IPV4Address', label: 'IPV4Address' },
      { key: 'ResponseTime', label: 'ResponseTime (ms)', align: 'right' },
      { key: 'StatusCode', label: 'StatusCode' },
    ] }, { note: `${count} resposta(s) de ${computerName}.` })
  },

  'Test-NetConnection': ({ args, world }) => {
    const computerName = arg(args, ['ComputerName'], 0)
    if (!computerName) throw new ShellError('Test-NetConnection precisa de um destino.', 'Exemplo: Test-NetConnection SRV-FILE01 -Port 445')
    const host = resolveHost(world, computerName)
    if (!host) throw new ShellError(`Não foi possível resolver '${computerName}'.`, 'Tente SRV-FILE01 ou SRV-DC01.')
    const port = arg(args, ['Port'])
    const commonOpenPorts = [445, 80, 443, 3389, 5985, 53, 135]
    const success = port === undefined ? true : commonOpenPorts.includes(toNumber(port))
    const record = {
      ComputerName: computerName,
      RemoteAddress: host.address,
      RemotePort: port === undefined ? null : toNumber(port),
      InterfaceAlias: 'Ethernet',
      PingSucceeded: true,
      TcpTestSucceeded: Boolean(success),
      Detailed: true,
    }
    return resultWith([record], { typeName: 'NetConnectionResult', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key, align: typeof record[key] === 'number' ? 'right' : 'left' })) }, {
      note: port === undefined ? 'Destino acessível.' : success ? `A porta ${port} está aberta.` : `A porta ${port} não respondeu.`,
    })
  },

  'Get-NetTCPConnection': ({ args, world }) => {
    const state = arg(args, ['State'])
    const localPort = arg(args, ['LocalPort'])
    const owningProcess = arg(args, ['OwningProcess'])
    let connections = [...world.network.connections]
    if (state) connections = connections.filter((connection) => connection.State.toLowerCase() === String(state).toLowerCase())
    if (localPort !== undefined) connections = connections.filter((connection) => connection.LocalPort === toNumber(localPort))
    if (owningProcess !== undefined) {
      const value = String(owningProcess).toLowerCase()
      connections = connections.filter((connection) => connection.OwningProcess.toLowerCase() === value || connection.OwningProcess === `PID ${owningProcess}`)
    }
    return resultWith(connections, { typeName: 'NetTCPConnection', view: 'table', columns: [
      { key: 'LocalAddress', label: 'LocalAddress' },
      { key: 'LocalPort', label: 'LocalPort', align: 'right' },
      { key: 'RemoteAddress', label: 'RemoteAddress' },
      { key: 'RemotePort', label: 'RemotePort', align: 'right' },
      { key: 'State', label: 'State' },
      { key: 'OwningProcess', label: 'OwningProcess' },
    ] })
  },

  'Get-SmbShare': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    let shares = [...world.network.shares]
    if (name) {
      shares = shares.filter((share) => share.Name.toLowerCase() === String(name).toLowerCase())
      if (!shares.length) throw new ShellError(`Compartilhamento '${name}' não encontrado.`, `Compartilhamentos disponíveis: ${world.network.shares.map((share) => share.Name).join(', ')}.`)
    }
    return resultWith(shares, { typeName: 'SmbShare', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Path', label: 'Path' },
      { key: 'Description', label: 'Description' },
      { key: 'CurrentUsers', label: 'Users', align: 'right' },
    ] })
  },

  'Get-SmbMapping': ({ args, world }) => {
    const localPath = arg(args, ['LocalPath'], 0)
    let mappings = [...world.network.mappings]
    if (localPath) {
      mappings = mappings.filter((mapping) => mapping.LocalPath.toLowerCase().startsWith(String(localPath).toLowerCase()))
      if (!mappings.length) throw new ShellError(`Não existe mapeamento em '${localPath}'.`, 'Use Get-SmbMapping sem filtro para listar os mapeamentos.')
    }
    return resultWith(mappings, { typeName: 'SmbMapping', view: 'table', columns: [
      { key: 'LocalPath', label: 'LocalPath' },
      { key: 'RemotePath', label: 'RemotePath' },
      { key: 'Status', label: 'Status' },
      { key: 'Persistent', label: 'Persistent', align: 'center' },
    ] }, {
      note: mappings.length === 0 ? 'Nenhuma unidade de rede mapeada.' : '',
    })
  },

  'New-SmbMapping': ({ args, world }) => {
    let remotePath = arg(args, ['RemotePath'], 0)
    if (!remotePath) throw new ShellError('New-SmbMapping precisa de -RemotePath.', 'Exemplo: New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true')
    remotePath = String(remotePath).replace(/\//g, '\\')
    if (!/^\\\\/.test(remotePath)) remotePath = `\\\\${remotePath}`
    const share = getShareByUnc(world, remotePath)
    if (!share) {
      throw new ShellError(`O compartilhamento '${remotePath}' não existe.`, `Compartilhamentos disponíveis: ${world.network.shares.map((item) => `\\\\SRV-FILE01\\${item.Name}`).join(', ')}.`)
    }
    const usedLetters = new Set([
      'C:', 'D:', 'A:', 'B:',
      ...world.network.mappings.map((mapping) => mapping.LocalPath.toUpperCase()),
    ])
    let localPath = String(arg(args, ['LocalPath'], 1, '')).trim()
    if (localPath) {
      const letterMatch = localPath.match(/^([A-Za-z]):?\\?$/)
      if (!letterMatch) throw new ShellError(`LocalPath '${localPath}' não é uma letra de unidade válida.`, 'Use algo como Z:.')
      localPath = `${letterMatch[1].toUpperCase()}:`
    } else {
      for (const letter of ['Z', 'Y', 'W', 'V', 'U', 'T']) {
        if (!usedLetters.has(`${letter}:`)) {
          localPath = `${letter}:`
          break
        }
      }
      if (!localPath) throw new ShellError('Não há letras de unidade livres para mapear.')
    }
    if (usedLetters.has(localPath)) throw new ShellError(`A unidade '${localPath}' já está em uso no laboratório.`, 'Use outra letra ou remova o mapeamento com Remove-SmbMapping (com cuidado).')
    const persistent = normalizeBoolean(arg(args, ['Persistent'], null, false))
    const mapping = {
      LocalPath: localPath,
      RemotePath: `\\\\SRV-FILE01\\${share.Name}`,
      Persistent: persistent,
      Status: 'OK',
      User: 'LAB\\miguel',
    }
    world.network.mappings.push(mapping)
    return {
      objects: [mapping],
      meta: { typeName: 'SmbMapping', view: 'table', columns: [
        { key: 'LocalPath', label: 'LocalPath' },
        { key: 'RemotePath', label: 'RemotePath' },
        { key: 'Status', label: 'Status' },
        { key: 'Persistent', label: 'Persistent', align: 'center' },
      ] },
      effects: [effect('smb:map', {
        localPath,
        remotePath: mapping.RemotePath,
        persistent,
        share: share.Name,
        server: 'SRV-FILE01',
        description: share.Description,
      })],
      note: `${mapping.RemotePath} mapeado em ${localPath}${persistent ? ' (persistente)' : ''}.`,
    }
  },

  'Remove-SmbMapping': ({ args, world }) => {
    const localPath = arg(args, ['LocalPath'], 0)
    if (!localPath) throw new ShellError('Remove-SmbMapping precisa de -LocalPath.', 'Exemplo: Remove-SmbMapping -LocalPath Z: -Force')
    const index = world.network.mappings.findIndex((mapping) => mapping.LocalPath.toLowerCase() === `${String(localPath).replace(/\\/g, '').toLowerCase()}` || mapping.LocalPath.toLowerCase() === `${String(localPath).toLowerCase()}:`)
    if (index === -1) throw new ShellError(`Não existe mapeamento em '${localPath}'.`, 'Use Get-SmbMapping para listar.')
    const [removed] = world.network.mappings.splice(index, 1)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('smb:unmap', { localPath: removed.LocalPath, remotePath: removed.RemotePath })],
      note: `Unidade ${removed.LocalPath} desconectada de ${removed.RemotePath}.`,
    }
  },

  'Get-PSDrive': ({ args, world }) => {
    const provider = arg(args, ['PSProvider'])
    const used = countFsEntries(getDriveRoot(world, 'C')).bytes
    const objects = [
      { Name: 'C', UsedGB: Number((used / 1024 ** 3).toFixed(2)), FreeGB: 48, Provider: 'FileSystem', Root: 'C:\\' },
      { Name: 'Env', UsedGB: null, FreeGB: null, Provider: 'Environment', Root: '' },
      { Name: 'HKCU', UsedGB: null, FreeGB: null, Provider: 'Registry', Root: 'HKEY_CURRENT_USER' },
      { Name: 'HKLM', UsedGB: null, FreeGB: null, Provider: 'Registry', Root: 'HKEY_LOCAL_MACHINE' },
      ...world.network.mappings.map((mapping) => ({
        Name: mapping.LocalPath.charAt(0),
        UsedGB: null,
        FreeGB: null,
        Provider: 'FileSystem',
        Root: mapping.RemotePath,
        DisplayRoot: mapping.RemotePath,
      })),
    ]
    const filtered = provider ? objects.filter((object) => object.Provider.toLowerCase() === String(provider).replace(/filesystem/i, 'filesystem').toLowerCase()) : objects
    return resultWith(filtered, { typeName: 'PSDriveInfo', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'UsedGB', label: 'Used (GB)', align: 'right' },
      { key: 'FreeGB', label: 'Free (GB)', align: 'right' },
      { key: 'Provider', label: 'Provider' },
      { key: 'Root', label: 'Root' },
    ] })
  },

  'Invoke-WebRequest': ({ args, world }) => {
    const uri = arg(args, ['Uri'], 0)
    if (!uri) throw new ShellError('Invoke-WebRequest precisa de -Uri.', 'Exemplo: Invoke-WebRequest https://intranet.lab.local')
    const parsed = parseUri(uri)
    if (!parsed) throw new ShellError(`A URI '${uri}' não é válida.`, 'Use um endereço completo, como https://intranet.lab.local.')
    const host = resolveHost(world, parsed.hostname)
    if (!host) throw new ShellError(`Não foi possível resolver '${parsed.hostname}'.`, 'No laboratório, teste intranet.lab.local, google.com ou github.com.')
    const method = String(arg(args, ['Method'], null, 'GET')).toUpperCase()
    const content = parsed.hostname.includes('intranet')
      ? '<html><head><title>Intranet LAB</title></head><body><h1>Bem-vindo à Intranet</h1><p>Atalhos, RH e chamados de TI.</p></body></html>'
      : `<html><head><title>${parsed.hostname}</title></head><body><h1>${parsed.hostname}</h1><p>Conteúdo simulado para o laboratório.</p></body></html>`
    const record = {
      StatusCode: method === 'POST' ? 201 : 200,
      StatusDescription: method === 'POST' ? 'Created' : 'OK',
      Uri: String(uri),
      Headers: { 'Content-Type': 'text/html; charset=utf-8', Server: 'PSLabSim' },
      Content: content,
      RawContentLength: content.length,
    }
    return resultWith([record], { typeName: 'HtmlWebResponseObject', view: 'list', columns: [
      { key: 'StatusCode', label: 'StatusCode', align: 'right' },
      { key: 'StatusDescription', label: 'StatusDescription' },
      { key: 'Uri', label: 'Uri' },
    ] }, { note: `Resposta HTTP ${record.StatusCode} de ${parsed.hostname}. Nenhum tráfego real foi enviado.` })
  },

  'Invoke-RestMethod': ({ args, world }) => {
    const uri = arg(args, ['Uri'], 0)
    if (!uri) throw new ShellError('Invoke-RestMethod precisa de -Uri.', 'Exemplo: Invoke-RestMethod https://api.lab.local/usuarios')
    const path = String(uri).toLowerCase()
    if (/\/usuarios|\/users/.test(path)) {
      const objects = world.ad.users.slice(0, 6).map((user) => ({
        id: user.SamAccountName,
        name: user.Name,
        email: user.EmailAddress,
        department: user.Department,
        active: user.Enabled,
      }))
      return resultWith(objects, { typeName: 'PSCustomObject', view: 'table', columns: [
        { key: 'name', label: 'name' },
        { key: 'email', label: 'email' },
        { key: 'department', label: 'department' },
        { key: 'active', label: 'active', align: 'center' },
      ] }, { note: 'API simulada: https://api.lab.local/usuarios' })
    }
    if (/\/processos|\/processes/.test(path)) {
      const objects = world.processes.slice(0, 8).map((process) => ({
        pid: process.Id,
        name: process.ProcessName,
        cpu: process.CPU,
        memoryMB: process.WorkingSet,
      }))
      return resultWith(objects, { typeName: 'PSCustomObject', view: 'table', columns: [
        { key: 'pid', label: 'pid', align: 'right' },
        { key: 'name', label: 'name' },
        { key: 'cpu', label: 'cpu', align: 'right' },
        { key: 'memoryMB', label: 'memoryMB', align: 'right' },
      ] }, { note: 'API simulada: https://api.lab.local/processos' })
    }
    throw new ShellError(`A API '${uri}' não existe neste laboratório.`, 'Endpoints simulados: https://api.lab.local/usuarios e https://api.lab.local/processos.')
  },
})

function resolveHost(world, name) {
  const needle = String(name).toLowerCase()
  const entry = Object.entries(world.network.hosts).find(([host]) => host.toLowerCase() === needle)
  if (entry) return { host: entry[0], ...entry[1] }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(needle)) return { host: String(name), address: String(name), type: 'IP' }
  return null
}

function parseUri(uri) {
  try {
    return new URL(String(uri))
  } catch {
    return null
  }
}

// ── Registro ─────────────────────────────────────────────────────

Object.assign(COMMAND_HANDLERS, {
  'Get-Item': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    if (!target) throw new ShellError('Get-Item precisa de um caminho.', 'Exemplo: Get-Item .\\Documentos\\notas-reuniao.txt')
    const resolved = resolveFsPath(world, target)
    if (resolved.provider === 'registry') {
      if (!resolved.exists) throw new ShellError(resolved.error)
      const key = resolved.key
      return resultWith([{
        Name: resolved.name,
        Property: Object.keys(key.values ?? {}),
        PSPath: `Microsoft.PowerShell.Core\\Registry::${resolved.displayPath}`,
      }], { typeName: 'RegistryKey', view: 'list', columns: [
        { key: 'Name', label: 'Name' },
        { key: 'Property', label: 'Property' },
      ] })
    }
    if (!resolved.exists) {
      throw new ShellError(resolved.error ?? `Não foi possível encontrar o caminho '${target}'.`, 'Confira o caminho com Get-ChildItem. Este é um erro comum em scripts: trate a ausência antes de usar o item.')
    }
    return resultWith([fileInfoNode(world, resolved, resolved.node)], { typeName: resolved.node.kind === 'dir' ? 'DirectoryInfo' : 'FileInfo', view: 'list', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'FullName', label: 'FullName' },
      { key: 'Length', label: 'Length', align: 'right', format: 'bytes' },
      { key: 'LastWriteTime', label: 'LastWriteTime' },
      { key: 'Mode', label: 'Mode' },
    ] })
  },

  'Get-ItemProperty': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    if (!target) throw new ShellError('Get-ItemProperty precisa de -Path.', 'Exemplo: Get-ItemProperty -Path HKCU:\\Software\\PowerShellLab')
    const resolved = resolveRegistryPath(world, target)
    if (!resolved.exists) throw new ShellError(resolved.error, 'Use Get-ChildItem HKCU:\\Software para explorar as chaves.')
    const requested = arg(args, ['Name'])
    const values = {}
    for (const [name, value] of Object.entries(resolved.key.values ?? {})) {
      if (requested) {
        const names = splitList(requested)
        if (!names.some((item) => wildcardToRegExp(item).test(name))) continue
      }
      values[name] = value
    }
    if (!Object.keys(values).length) {
      return resultWith([], { typeName: 'PSCustomObject', view: 'none', columns: [] }, { note: 'A chave não tem valores para o filtro informado.' })
    }
    const record = {
      ...values,
      PSChildName: resolved.name,
      PSPath: `Microsoft.PowerShell.Core\\Registry::${resolved.displayPath}`,
      PSProvider: 'Microsoft.PowerShell.Core\\Registry',
    }
    return resultWith([record], { typeName: 'PSCustomObject', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key })) })
  },

  'Set-ItemProperty': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    const name = arg(args, ['Name'])
    if (!target || !name) throw new ShellError('Set-ItemProperty precisa de -Path e -Name.', 'Exemplo: Set-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme -Value light')
    const value = args.named.value ?? args.positional[2] ?? ''
    const resolved = resolveRegistryPath(world, target)
    if (!resolved.exists) throw new ShellError(resolved.error, 'Use Get-ChildItem para encontrar a chave correta.')
    const before = resolved.key.values[name]
    const existed = Object.prototype.hasOwnProperty.call(resolved.key.values, name)
    resolved.key.values[name] = value
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('registry:set', {
        path: resolved.displayPath,
        name,
        before: existed ? String(before) : null,
        after: String(value),
        created: !existed,
      })],
      note: `${existed ? 'Valor alterado' : 'Valor criado'}: ${resolved.displayPath}\\${name} = ${value}`,
    }
  },

  'Remove-ItemProperty': ({ args, world }) => {
    const target = arg(args, ['Path'], 0)
    const name = arg(args, ['Name'])
    if (!target || !name) throw new ShellError('Remove-ItemProperty precisa de -Path e -Name.', 'Exemplo: Remove-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name AutoSave')
    const resolved = resolveRegistryPath(world, target)
    if (!resolved.exists) throw new ShellError(resolved.error)
    const key = Object.keys(resolved.key.values ?? {}).find((candidate) => candidate.toLowerCase() === String(name).toLowerCase())
    if (!key) throw new ShellError(`O valor '${name}' não existe em '${resolved.displayPath}'.`, 'Use Get-ItemProperty para ver os valores disponíveis.')
    const before = resolved.key.values[key]
    delete resolved.key.values[key]
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('registry:delete', { path: resolved.displayPath, name: key, before: String(before) })],
      note: `Valor removido: ${resolved.displayPath}\\${key}`,
    }
  },
})

// ── Módulos ──────────────────────────────────────────────────────

Object.assign(COMMAND_HANDLERS, {
  'Get-Module': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    const listAvailable = flag(args, 'listavailable')
    let modules = listAvailable ? [...world.modules] : world.modules.filter((module) => module.Imported)
    if (name) {
      const regex = wildcardToRegExp(name)
      modules = modules.filter((module) => regex.test(module.Name))
      if (!modules.length) throw new ShellError(`Nenhum módulo corresponde a '${name}'.`, 'Use Get-Module -ListAvailable para ver todos os módulos instalados.')
    }
    return resultWith(modules, { typeName: 'PSModuleInfo', view: 'table', columns: [
      { key: 'Name', label: 'ModuleType' },
      { key: 'Version', label: 'Version' },
      { key: 'Imported', label: 'Imported', align: 'center' },
      { key: 'Description', label: 'Description' },
    ] }, {
      note: listAvailable ? 'Módulos instalados no laboratório. Use Import-Module para carregar um deles.' : 'Módulos carregados na sessão atual.',
    })
  },

  'Import-Module': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Import-Module precisa do nome do módulo.', 'Exemplo: Import-Module ActiveDirectory')
    const module = world.modules.find((item) => item.Name.toLowerCase() === baseNameOf(String(name)).toLowerCase())
    if (!module) throw new ShellError(`O módulo '${name}' não está instalado.`, 'Use Get-Module -ListAvailable ou instale com Install-Module.')
    const wasImported = module.Imported
    module.Imported = true
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: wasImported ? [] : [effect('module:import', { name: module.Name, version: module.Version })],
      note: wasImported ? `O módulo ${module.Name} já estava importado.` : `Módulo ${module.Name} importado. Os cmdlets ficam disponíveis nesta sessão.`,
    }
  },

  'Get-InstalledModule': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    let modules = [...world.modules]
    if (name) {
      const regex = wildcardToRegExp(name)
      modules = modules.filter((module) => regex.test(module.Name))
    }
    return resultWith(modules, { typeName: 'PSRepositoryItemInfo', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Version', label: 'Version' },
      { key: 'Description', label: 'Description' },
    ] })
  },

  'Find-Module': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    let modules = [...world.gallery]
    if (name) {
      const regex = wildcardToRegExp(`*${name}*`)
      modules = modules.filter((module) => regex.test(module.Name) || regex.test(module.Description))
    }
    const objects = modules.map((module) => ({ ...module, DownloadsLabel: module.Downloads }))
    return resultWith(objects, { typeName: 'PSRepositoryItemInfo', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Version', label: 'Version' },
      { key: 'Downloads', label: 'Downloads', align: 'right' },
      { key: 'Description', label: 'Description' },
    ] }, {
      note: objects.length ? 'Resultados da galeria simulada PSGallery.' : 'Nenhum módulo encontrado na galeria.',
    })
  },

  'Install-Module': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Install-Module precisa de -Name.', 'Exemplo: Install-Module -Name ImportExcel -Scope CurrentUser')
    const existing = world.modules.find((module) => module.Name.toLowerCase() === String(name).toLowerCase())
    if (existing) throw new ShellError(`O módulo '${name}' já está instalado (versão ${existing.Version}).`, 'Use Update-Module para buscar uma versão mais nova.')
    const galleryModule = world.gallery.find((module) => module.Name.toLowerCase() === String(name).toLowerCase())
    if (!galleryModule) throw new ShellError(`O módulo '${name}' não foi encontrado na galeria.`, 'Use Find-Module para pesquisar.')
    const installed = {
      Name: galleryModule.Name,
      Version: galleryModule.Version,
      Imported: false,
      Description: galleryModule.Description,
    }
    world.modules.push(installed)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('module:install', { name: installed.Name, version: installed.Version, scope: arg(args, ['Scope'], null, 'CurrentUser') })],
      note: `${installed.Name} ${installed.Version} instalado. Use Import-Module ${installed.Name} para carregá-lo.`,
    }
  },

  'Update-Module': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Update-Module precisa de -Name.', 'Exemplo: Update-Module -Name Pester')
    const module = world.modules.find((item) => item.Name.toLowerCase() === String(name).toLowerCase())
    if (!module) throw new ShellError(`O módulo '${name}' não está instalado.`, 'Use Get-InstalledModule para listar.')
    const galleryModule = world.gallery.find((item) => item.Name.toLowerCase() === module.Name.toLowerCase())
    if (galleryModule && galleryModule.Version !== module.Version) {
      const from = module.Version
      module.Version = galleryModule.Version
      return {
        objects: [],
        meta: { typeName: 'None', view: 'none', columns: [] },
        effects: [effect('module:update', { name: module.Name, from, to: module.Version })],
        note: `${module.Name} atualizado de ${from} para ${module.Version}.`,
      }
    }
    return { objects: [], meta: { typeName: 'None', view: 'none', columns: [] }, note: `${module.Name} já está na versão mais recente (${module.Version}).` }
  },

  'Get-PSRepository': () => {
    const objects = [
      { Name: 'PSGallery', SourceLocation: 'https://www.powershellgallery.com/api/v2', InstallationPolicy: 'Trusted', PackageManagementProvider: 'NuGet' },
      { Name: 'PSLabInternal', SourceLocation: 'https://galeria.lab.local/api/v2', InstallationPolicy: 'Trusted', PackageManagementProvider: 'NuGet' },
    ]
    return resultWith(objects, { typeName: 'PSRepository', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'SourceLocation', label: 'SourceLocation' },
      { key: 'InstallationPolicy', label: 'InstallationPolicy' },
    ] })
  },
})

// ── Automação ────────────────────────────────────────────────────

Object.assign(COMMAND_HANDLERS, {
  'Get-ScheduledTask': ({ args, world }) => {
    const taskName = arg(args, ['TaskName'], 0)
    const taskPath = arg(args, ['TaskPath'])
    let tasks = [...world.scheduledTasks]
    if (taskName) {
      const regexes = splitList(taskName).map((item) => wildcardToRegExp(item))
      tasks = tasks.filter((task) => regexes.some((regex) => regex.test(task.TaskName)))
      if (!tasks.length) throw new ShellError(`A tarefa agendada '${taskName}' não foi encontrada.`, 'Use Get-ScheduledTask sem filtro para ver as tarefas.')
    }
    if (taskPath) tasks = tasks.filter((task) => task.TaskPath.toLowerCase() === String(taskPath).toLowerCase())
    return resultWith(tasks, { typeName: 'ScheduledTask', view: 'table', columns: [
      { key: 'TaskName', label: 'TaskName' },
      { key: 'State', label: 'State' },
      { key: 'Schedule', label: 'Schedule' },
      { key: 'TaskPath', label: 'TaskPath' },
    ] })
  },

  'Register-ScheduledTask': ({ args, world }) => {
    const taskName = arg(args, ['TaskName'])
    const action = arg(args, ['Action'])
    const trigger = arg(args, ['Trigger'])
    if (!taskName) throw new ShellError('Register-ScheduledTask precisa de -TaskName.', 'Informe também -Action e -Trigger.')
    if (!action) throw new ShellError('Informe o que a tarefa deve executar com -Action.', 'Exemplo: -Action "powershell.exe -File C:\\Temp\\scripts\\backup.ps1"')
    if (!trigger) throw new ShellError('Informe quando a tarefa deve rodar com -Trigger.', 'Exemplo: -Trigger Daily')
    if (world.scheduledTasks.some((task) => task.TaskName.toLowerCase() === String(taskName).toLowerCase())) {
      throw new ShellError(`Já existe uma tarefa chamada '${taskName}'.`, 'Use outro nome.')
    }
    const triggerText = String(trigger)
    const task = {
      TaskName: String(taskName),
      TaskPath: '\\PSLab\\',
      State: 'Ready',
      Schedule: /daily|diario|diário/i.test(triggerText) ? 'Diário' : /weekly|semanal/i.test(triggerText) ? 'Semanal' : triggerText,
      Action: typeof action === 'object' ? action.__scriptblock ?? String(action) : String(action),
      RunAs: arg(args, ['User'], null, 'LAB\\miguel'),
      LastRun: 'Nunca',
      NextRun: '17/11/2026 03:00',
      Description: 'Tarefa criada no laboratório',
    }
    world.scheduledTasks.push(task)
    return {
      objects: [task],
      meta: { typeName: 'ScheduledTask', view: 'table', columns: [
        { key: 'TaskName', label: 'TaskName' }, { key: 'State', label: 'State' }, { key: 'Schedule', label: 'Schedule' },
      ] },
      effects: [effect('task:create', { name: task.TaskName, action: task.Action, schedule: task.Schedule, runAs: task.RunAs })],
      note: `Tarefa "${task.TaskName}" registrada em ${task.TaskPath}.`,
    }
  },

  'Start-ScheduledTask': ({ args, world }) => {
    const taskName = arg(args, ['TaskName'], 0)
    if (!taskName) throw new ShellError('Start-ScheduledTask precisa de -TaskName.', 'Exemplo: Start-ScheduledTask -TaskName "Backup Financeiro"')
    const task = findScheduledTask(world, taskName)
    if (!task) throw new ShellError(`Tarefa '${taskName}' não encontrada.`, 'Use Get-ScheduledTask para ver os nomes.')
    const from = task.State
    task.State = 'Running'
    task.LastRun = formatDate()
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('task:state', { name: task.TaskName, from, to: 'Running', action: 'start' })],
      note: `Tarefa "${task.TaskName}" iniciada agora.`,
    }
  },

  'Stop-ScheduledTask': ({ args, world }) => {
    const taskName = arg(args, ['TaskName'], 0)
    if (!taskName) throw new ShellError('Stop-ScheduledTask precisa de -TaskName.')
    const task = findScheduledTask(world, taskName)
    if (!task) throw new ShellError(`Tarefa '${taskName}' não encontrada.`)
    const from = task.State
    task.State = 'Ready'
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('task:state', { name: task.TaskName, from, to: 'Ready', action: 'stop' })],
      note: `Tarefa "${task.TaskName}" interrompida.`,
    }
  },

  'Unregister-ScheduledTask': ({ args, world }) => {
    const taskName = arg(args, ['TaskName'], 0)
    if (!taskName) throw new ShellError('Unregister-ScheduledTask precisa de -TaskName.')
    const task = findScheduledTask(world, taskName)
    if (!task) throw new ShellError(`Tarefa '${taskName}' não encontrada.`)
    world.scheduledTasks = world.scheduledTasks.filter((item) => item !== task)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('task:delete', { name: task.TaskName, schedule: task.Schedule })],
      note: `Tarefa "${task.TaskName}" removida do agendador.`,
    }
  },

  'Get-ScheduledTaskInfo': ({ args, world }) => {
    const taskName = arg(args, ['TaskName'], 0)
    if (!taskName) throw new ShellError('Get-ScheduledTaskInfo precisa de -TaskName.')
    const task = findScheduledTask(world, taskName)
    if (!task) throw new ShellError(`Tarefa '${taskName}' não encontrada.`)
    const record = {
      TaskName: task.TaskName,
      LastRunTime: task.LastRun === 'Nunca' ? 'Nunca' : `${task.LastRun}`,
      NextRunTime: task.NextRun,
      LastTaskResult: '0x0',
      NumberOfMissedRuns: 0,
      State: task.State,
    }
    return resultWith([record], { typeName: 'ScheduledTaskInfo', view: 'list', columns: [
      { key: 'TaskName', label: 'TaskName' },
      { key: 'LastRunTime', label: 'LastRunTime' },
      { key: 'NextRunTime', label: 'NextRunTime' },
      { key: 'LastTaskResult', label: 'LastTaskResult' },
      { key: 'NumberOfMissedRuns', label: 'NumberOfMissedRuns', align: 'right' },
    ] })
  },
})

function findScheduledTask(world, name) {
  const regexes = splitList(name).map((item) => wildcardToRegExp(item))
  return world.scheduledTasks.find((task) => regexes.some((regex) => regex.test(task.TaskName))) ?? null
}

// ── Remoting ─────────────────────────────────────────────────────

Object.assign(COMMAND_HANDLERS, {
  'New-PSSession': ({ args, world }) => {
    const computerName = arg(args, ['ComputerName'], 0)
    if (!computerName) throw new ShellError('New-PSSession precisa de -ComputerName.', 'Exemplo: New-PSSession -ComputerName SRV-DC01')
    const host = resolveHost(world, String(computerName).split(',')[0].trim())
    if (!host || !['SRV-DC01', 'SRV-FILE01'].includes(host.host)) {
      throw new ShellError(`O computador '${computerName}' não aceita sessões remotas no laboratório.`, 'Tente SRV-DC01 ou SRV-FILE01.')
    }
    const id = world.sessions.length ? Math.max(...world.sessions.map((session) => session.Id)) + 1 : 1
    const session = {
      Id: id,
      ComputerName: host.host,
      State: 'Opened',
      Availability: 'Available',
      ConfigurationName: 'Microsoft.PowerShell',
      IdleTimeout: '02:00:00',
    }
    world.sessions.push(session)
    return {
      objects: [session],
      meta: { typeName: 'PSSession', view: 'table', columns: [
        { key: 'Id', label: 'Id', align: 'right' },
        { key: 'ComputerName', label: 'ComputerName' },
        { key: 'State', label: 'State' },
        { key: 'Availability', label: 'Availability' },
      ] },
      effects: [effect('session:create', { computer: host.host, id, state: 'Opened' })],
      note: `Sessão ${id} aberta com ${host.host}.`,
    }
  },

  'Get-PSSession': ({ args, world }) => {
    const computerName = arg(args, ['ComputerName'], 0)
    let sessions = [...world.sessions]
    if (computerName) sessions = sessions.filter((session) => session.ComputerName.toLowerCase() === String(computerName).toLowerCase())
    return resultWith(sessions, { typeName: 'PSSession', view: 'table', columns: [
      { key: 'Id', label: 'Id', align: 'right' },
      { key: 'ComputerName', label: 'ComputerName' },
      { key: 'State', label: 'State' },
      { key: 'Availability', label: 'Availability' },
    ] }, { note: sessions.length === 0 ? 'Nenhuma sessão remota aberta nesta janela.' : '' })
  },

  'Invoke-Command': ({ args, world }) => {
    let targets = []
    const computerName = arg(args, ['ComputerName'])
    const sessionId = arg(args, ['Session'])
    if (sessionId !== undefined) {
      const session = world.sessions.find((item) => item.Id === toNumber(sessionId))
      if (!session) throw new ShellError(`Sessão '${sessionId}' não encontrada.`, 'Abra uma com New-PSSession ou consulte Get-PSSession.')
      targets = [session.ComputerName]
    } else if (computerName) {
      targets = splitList(computerName)
    } else {
      throw new ShellError('Invoke-Command precisa de -ComputerName ou -Session.', 'Exemplo: Invoke-Command -ComputerName SRV-DC01 -ScriptBlock { Get-Date }')
    }
    for (const target of targets) {
      if (!resolveHost(world, target)) throw new ShellError(`Host remoto '${target}' não encontrado.`, 'Tente SRV-DC01 ou SRV-FILE01.')
    }
    const scriptValue = arg(args, ['ScriptBlock'], 0)
    if (!scriptValue) throw new ShellError('Informe o que será executado com -ScriptBlock.', 'Exemplo: -ScriptBlock { Get-Date }')
    const script = typeof scriptValue === 'object' && scriptValue !== null ? scriptValue.__scriptblock ?? String(scriptValue) : String(scriptValue)
    const output = []
    for (const target of targets) {
      if (/get-date/i.test(script)) {
        output.push({ PSComputerName: target, RunspaceId: 'simulado', DateTime: formatDateTimeFull() })
      } else if (/get-service/i.test(script)) {
        output.push({ PSComputerName: target, Status: 'Running', Name: 'Spooler', DisplayName: 'Print Spooler' })
      } else if (/get-computerinfo|get-ciminstance.*operatingsystem/i.test(script)) {
        output.push({ PSComputerName: target, Name: target, OperatingSystem: target.startsWith('SRV') ? 'Windows Server 2022' : 'Windows 11 Pro', Domain: world.ad.domain.Name })
      } else if (/hostname/i.test(script)) {
        output.push({ PSComputerName: target, Value: target })
      } else {
        output.push({ PSComputerName: target, ScriptBlock: script.trim(), Result: 'Executado com sucesso no laboratório' })
      }
    }
    return resultWith(output, inferMeta(output), {
      effects: [effect('remote:invoke', { computers: targets, command: script.trim().slice(0, 80), objects: output.length })],
      note: `${targets.length} computador(es) executaram o bloco remotamente (simulação segura).`,
    })
  },

  'Test-WSMan': ({ args, world }) => {
    const computerName = arg(args, ['ComputerName'], 0)
    if (!computerName) throw new ShellError('Test-WSMan precisa de -ComputerName.')
    const host = resolveHost(world, computerName)
    if (!host) throw new ShellError(`Não foi possível conectar ao WinRM de '${computerName}'.`, 'Use SRV-DC01 ou SRV-FILE01.')
    const record = {
      ComputerName: computerName,
      ProductVersion: 'OS: 10.0.26100',
      StackVersion: '3.0',
      ProductVendor: 'Microsoft Corporation',
      ProtocolVersion: '',
    }
    return resultWith([record], { typeName: 'WSMan', view: 'list', columns: Object.keys(record).map((key) => ({ key, label: key })) }, {
      note: 'WinRM respondeu. O remoting está habilitado neste host simulado.',
    })
  },

  'Enter-PSSession': ({ args, world }) => {
    const computerName = arg(args, ['ComputerName'], 0)
    if (!computerName) throw new ShellError('Enter-PSSession precisa de -ComputerName.')
    const host = resolveHost(world, computerName)
    if (!host) throw new ShellError(`Computador '${computerName}' não encontrado.`)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      hostMessages: [{ level: 'host', text: `[${computerName}]: PS C:\\Users\\Administrator>` }],
      note: `Sessão interativa simulada com ${computerName}. A interface não troca o prompt real; os conceitos são iguais.`,
    }
  },

  'Exit-PSSession': () => ({
    objects: [],
    meta: { typeName: 'None', view: 'none', columns: [] },
    note: 'Sessão interativa encerrada. De volta à sua estação.',
  }),

  'Remove-PSSession': ({ args, world }) => {
    const id = arg(args, ['Id'], 0)
    if (id === undefined) throw new ShellError('Remove-PSSession precisa de -Id.', 'Use Get-PSSession para descobrir o Id.')
    const session = world.sessions.find((item) => item.Id === toNumber(id))
    if (!session) throw new ShellError(`Sessão '${id}' não encontrada.`)
    world.sessions = world.sessions.filter((item) => item !== session)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('session:remove', { computer: session.ComputerName, id: session.Id })],
      note: `Sessão ${session.Id} com ${session.ComputerName} encerrada.`,
    }
  },
})

// ── Segurança e contas locais ─────────────────────────────────────

Object.assign(COMMAND_HANDLERS, {
  'Get-ExecutionPolicy': ({ args, world, flags }) => {
    if (flag(args, 'list')) {
      const effective = world.executionPolicy || 'RemoteSigned'
      const objects = [
        { Scope: 'MachinePolicy', ExecutionPolicy: 'Undefined' },
        { Scope: 'UserPolicy', ExecutionPolicy: 'Undefined' },
        { Scope: 'Process', ExecutionPolicy: 'Undefined' },
        { Scope: 'CurrentUser', ExecutionPolicy: world.lastExecutionPolicyByScope?.CurrentUser ?? 'Undefined' },
        { Scope: 'LocalMachine', ExecutionPolicy: effective },
      ]
      return resultWith(objects, { typeName: 'ExecutionPolicy', view: 'table', columns: [
        { key: 'Scope', label: 'Scope' },
        { key: 'ExecutionPolicy', label: 'ExecutionPolicy' },
      ] }, { note: 'A política efetiva é a mais restritiva entre os escopos.' })
    }
    return {
      objects: [{ Value: world.executionPolicy }],
      meta: { typeName: 'ExecutionPolicy', view: 'text', text: world.executionPolicy, columns: [] },
    }
  },

  'Set-ExecutionPolicy': ({ args, world }) => {
    const policyValue = arg(args, ['ExecutionPolicy'], 0)
    const allowed = ['Restricted', 'AllSigned', 'RemoteSigned', 'Unrestricted', 'Bypass', 'Undefined']
    const match = allowed.find((policy) => policy.toLowerCase() === String(policyValue).toLowerCase())
    if (!match) throw new ShellError(`A política '${policyValue}' não é válida.`, `Use: ${allowed.join(', ')}.`)
    const scope = String(arg(args, ['Scope'], null, 'LocalMachine'))
    const before = world.executionPolicy
    world.executionPolicy = match
    world.lastExecutionPolicyByScope = { ...(world.lastExecutionPolicyByScope ?? {}), [scope]: match }
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('execution:policy', { from: before, to: match, scope })],
      warnings: ['Alterar a política de execução afeta a segurança. No laboratório nada no seu PC é alterado.'],
      note: `Política de execução ${scope} definida como ${match}.`,
    }
  },

  'Get-AuthenticodeSignature': ({ args, world }) => {
    const target = arg(args, ['FilePath'], 0)
    if (!target) throw new ShellError('Get-AuthenticodeSignature precisa de -FilePath.', 'Exemplo: Get-AuthenticodeSignature C:\\Temp\\scripts\\backup.ps1')
    const resolved = resolveFsPath(world, target)
    if (!resolved.exists || resolved.node.kind !== 'file') throw new ShellError(resolved.error ?? `Arquivo '${target}' não encontrado.`)
    const record = {
      Status: 'NotSigned',
      StatusMessage: 'O arquivo não está assinado digitalmente.',
      Path: resolved.displayPath,
      SignerCertificate: null,
    }
    return resultWith([record], { typeName: 'Signature', view: 'list', columns: [
      { key: 'Status', label: 'Status' },
      { key: 'StatusMessage', label: 'StatusMessage' },
      { key: 'Path', label: 'Path' },
    ] })
  },

  'Get-LocalUser': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    let users = [...world.localUsers]
    if (name) {
      const regex = wildcardToRegExp(name)
      users = users.filter((user) => regex.test(user.Name))
      if (!users.length) throw new ShellError(`A conta local '${name}' não existe nesta máquina.`, `Contas disponíveis: ${world.localUsers.map((user) => user.Name).join(', ')}.`)
    }
    return resultWith(users, { typeName: 'LocalUser', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Enabled', label: 'Enabled', align: 'center' },
      { key: 'Description', label: 'Description' },
    ] })
  },

  'New-LocalUser': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('New-LocalUser precisa de -Name.', 'Exemplo: New-LocalUser -Name estagiario -FullName "Novo Estagiário" -Description "Conta de aprendizado"')
    if (/[\\/:*?"<>|]/.test(String(name))) throw new ShellError('O nome da conta contém caracteres inválidos.')
    if (world.localUsers.some((user) => user.Name.toLowerCase() === String(name).toLowerCase())) {
      throw new ShellError(`Já existe uma conta local chamada '${name}'.`, 'Escolha outro nome.')
    }
    const user = {
      Name: String(name),
      FullName: arg(args, ['FullName'], null, ''),
      Description: arg(args, ['Description'], null, 'Conta criada no laboratório'),
      Enabled: true,
      Groups: ['Usuários'],
      LastLogon: 'Nunca',
    }
    world.localUsers.push(user)
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('local:user:create', {
        name: user.Name,
        fullName: user.FullName,
        description: user.Description,
        enabled: true,
        groups: user.Groups,
      })],
      note: `Conta local criada: ${user.Name}.`,
    }
  },

  'Enable-LocalUser': ({ args, world }) => changeLocalAccount(args, world, 'enable'),
  'Disable-LocalUser': ({ args, world }) => changeLocalAccount(args, world, 'disable'),

  'Get-LocalGroup': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    let groups = [...world.localGroups]
    if (name) {
      const regex = wildcardToRegExp(name)
      groups = groups.filter((group) => regex.test(group.Name))
      if (!groups.length) throw new ShellError(`O grupo local '${name}' não existe.`, `Grupos disponíveis: ${world.localGroups.map((group) => group.Name).join(', ')}.`)
    }
    return resultWith(groups, { typeName: 'LocalGroup', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Description', label: 'Description' },
    ] })
  },

  'Get-LocalGroupMember': ({ args, world }) => {
    const groupName = arg(args, ['Group'], 0)
    if (!groupName) throw new ShellError('Get-LocalGroupMember precisa de -Group.', 'Exemplo: Get-LocalGroupMember -Group Administradores')
    const group = findKnownObject(world.localGroups, groupName, ['Name'])
    if (!group) throw new ShellError(`Grupo local '${groupName}' não encontrado.`, `Grupos: ${world.localGroups.map((item) => item.Name).join(', ')}.`)
    const objects = group.Members.map((member) => ({
      Name: `${world.hostname}\\${member}`,
      SamAccountName: member,
      ObjectClass: 'Usuário',
      PrincipalSource: 'Local',
    }))
    return resultWith(objects, { typeName: 'LocalPrincipal', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'ObjectClass', label: 'ObjectClass' },
      { key: 'PrincipalSource', label: 'PrincipalSource' },
    ] })
  },

  'Add-LocalGroupMember': ({ args, world }) => {
    const groupName = arg(args, ['Group'], 0)
    const memberValue = args.named.member ?? args.named.members ?? args.positional[1]
    if (!groupName || !memberValue) throw new ShellError('Add-LocalGroupMember precisa de -Group e -Member.', 'Exemplo: Add-LocalGroupMember -Group Usuários -Member estagiario')
    const group = findKnownObject(world.localGroups, groupName, ['Name'])
    if (!group) throw new ShellError(`Grupo local '${groupName}' não encontrado.`)
    const added = []
    for (const requested of splitList(memberValue)) {
      const user = findKnownObject(world.localUsers, requested, ['Name'])
      if (!user) throw new ShellError(`A conta local '${requested}' não existe.`, 'Use Get-LocalUser para ver as contas disponíveis.')
      if (group.Members.some((member) => member.toLowerCase() === user.Name.toLowerCase())) continue
      group.Members.push(user.Name)
      if (!user.Groups?.includes(group.Name)) user.Groups = [...(user.Groups ?? []), group.Name]
      added.push(user)
    }
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: added.length ? [effect('local:group:members', {
        action: 'add',
        group: group.Name,
        members: added.map((user) => ({ name: user.Name, description: user.Description })),
      })] : [],
      note: added.length ? `${added.map((user) => user.Name).join(', ')} entrou em ${group.Name}.` : 'Os membros já pertenciam ao grupo.',
    }
  },
})

function changeLocalAccount(args, world, action) {
  const name = arg(args, ['Name'], 0)
  if (!name) throw new ShellError(`${action === 'enable' ? 'Enable-LocalUser' : 'Disable-LocalUser'} precisa de -Name.`)
  const user = findKnownObject(world.localUsers, name, ['Name'])
  if (!user) throw new ShellError(`A conta local '${name}' não existe.`, 'Use Get-LocalUser para ver as contas.')
  const before = user.Enabled
  user.Enabled = action === 'enable'
  if (before === user.Enabled) {
    return { objects: [], meta: { typeName: 'None', view: 'none', columns: [] }, note: `A conta ${name} já estava ${user.Enabled ? 'habilitada' : 'desativada'}.` }
  }
  return {
    objects: [],
    meta: { typeName: 'None', view: 'none', columns: [] },
    effects: [effect('local:account', { action, name: user.Name, before, after: user.Enabled, enabled: user.Enabled })],
    note: action === 'enable' ? `Conta local habilitada: ${name}.` : `Conta local desativada: ${name}.`,
  }
}

// ── Dados e relatórios ───────────────────────────────────────────

Object.assign(COMMAND_HANDLERS, {
  'ConvertTo-Json': ({ args, input }) => {
    const explicit = args.named.inputobject
    const values = explicit !== undefined ? [explicit] : input
    if (!values.length) throw new ShellError('ConvertTo-Json espera objetos.', 'Experimente: Get-Process | Select-Object -First 2 | ConvertTo-Json')
    const data = values.length === 1 ? values[0] : values
    const text = JSON.stringify(data, (key, value) => (key === '__scriptblock' ? undefined : value), 2)
    return {
      objects: values,
      meta: { typeName: 'String', view: 'text', text, columns: [] },
      note: 'Objetos serializados em JSON.',
    }
  },

  'ConvertFrom-Json': ({ args, input }) => {
    let text
    const explicit = args.named.inputobject ?? args.positional[0]
    if (explicit !== undefined && typeof explicit === 'string') text = explicit
    else if (input.length) text = input.map((item) => item?.Line ?? (typeof item === 'string' ? item : stringifyValue(item))).join('\n')
    else throw new ShellError('ConvertFrom-Json espera texto JSON.', 'Exemplo: Get-Content .\\inventario.json -Raw | ConvertFrom-Json')
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      throw new ShellError(`O JSON é inválido: ${error.message}`, 'Verifique vírgulas, aspas e chaves do arquivo.')
    }
    const objects = Array.isArray(parsed) ? parsed : [parsed]
    const normalized = objects.map((item) => (typeof item === 'object' && item !== null ? item : { Value: item }))
    return resultWith(normalized, inferMeta(normalized, 'PSCustomObject'), {
      note: `${normalized.length} objeto(s) criado(s) a partir do JSON.`,
    })
  },

  'ConvertTo-Csv': ({ args, input, inputMeta }) => {
    if (!input.length) throw new ShellError('ConvertTo-Csv espera objetos.', 'Exemplo: Get-Process | Select-Object ProcessName, CPU | ConvertTo-Csv')
    const columns = (inputMeta?.columns ?? inferColumns(input)).map((column) => column.key)
    const lines = [columns.map(csvEscape).join(',')]
    for (const object of input) lines.push(columns.map((column) => csvEscape(object?.[column])).join(','))
    const text = lines.join('\n')
    return {
      objects: input,
      meta: { typeName: 'String', view: 'text', text, columns: [] },
      note: `CSV gerado com ${input.length} linha(s).`,
    }
  },

  'ConvertFrom-Csv': ({ args, input }) => {
    const explicit = args.named.inputobject ?? args.positional[0]
    let text
    if (typeof explicit === 'string') text = explicit
    else if (input.length) text = input.map((item) => item?.Line ?? (typeof item === 'string' ? item : stringifyValue(item))).join('\n')
    else throw new ShellError('ConvertFrom-Csv espera texto CSV.', 'Exemplo: Get-Content .\\relatorio-vendas.csv | ConvertFrom-Csv')
    const parsed = parseCsv(text)
    if (!parsed.length) throw new ShellError('O CSV não tem linhas de dados.', 'Confira o arquivo.')
    return resultWith(parsed, inferMeta(parsed, 'PSCustomObject'), { note: `${parsed.length} linha(s) convertida(s) em objetos.` })
  },

  'Export-Csv': ({ args, input, inputMeta, world }) => {
    const path = arg(args, ['Path'], 0)
    if (!path) throw new ShellError('Export-Csv precisa de um arquivo de destino.', 'Exemplo: Get-ADUser -Filter * | Export-Csv .\\usuarios.csv -NoTypeInformation')
    if (!input.length) throw new ShellError('Export-Csv espera objetos pelo pipeline.', 'Exemplo: Get-Process | Select-Object ProcessName, CPU | Export-Csv .\\processos.csv')
    const columns = (inputMeta?.columns ?? inferColumns(input)).map((column) => column.key)
    const lines = [columns.map(csvEscape).join(',')]
    for (const object of input) lines.push(columns.map((column) => csvEscape(object?.[column])).join(','))
    const content = `${lines.join('\n')}\n`
    const resolved = resolveFsPath(world, path)
    if (!resolved.parent) throw new ShellError(`A pasta de destino de '${path}' não existe.`)
    let node = resolved.node
    const created = !node
    if (!node) {
      node = { kind: 'file', id: `file-csv-${Date.now()}`, name: resolved.name, content: '', size: 0, modified: formatDate() }
      resolved.parent.children.push(node)
    }
    node.content = content
    node.size = new TextEncoder().encode(content).length
    node.modified = formatDate()
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      effects: [effect('fs:write', { path: resolved.displayPath, created, mode: 'export-csv' })],
      note: `${input.length} objeto(s) exportado(s) para ${resolved.displayPath}.`,
    }
  },

  'Import-Csv': ({ args, world }) => {
    const path = arg(args, ['Path'], 0)
    if (!path) throw new ShellError('Import-Csv precisa de um arquivo.', 'Exemplo: Import-Csv .\\relatorio-vendas.csv')
    const resolved = resolveFsPath(world, path)
    if (!resolved.exists || resolved.node.kind !== 'file') throw new ShellError(resolved.error ?? `Arquivo '${path}' não encontrado.`)
    const parsed = parseCsv(resolved.node.content ?? '')
    if (!parsed.length) return resultWith([], { typeName: 'PSCustomObject', view: 'none', columns: [] }, { note: 'O CSV não tem linhas de dados.' })
    return resultWith(parsed, inferMeta(parsed, 'PSCustomObject'), { note: `${parsed.length} linha(s) importada(s) de ${resolved.displayPath}.` })
  },
})

function csvEscape(value) {
  const text = stringifyValue(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function parseCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((line) => line.trim() !== '')
  if (!lines.length) return []
  const parseLine = (line) => {
    const values = []
    let value = ''
    let quoted = false
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          value += '"'
          index += 1
        } else {
          quoted = !quoted
        }
      } else if (char === ',' && !quoted) {
        values.push(value)
        value = ''
      } else {
        value += char
      }
    }
    values.push(value)
    return values
  }
  const header = parseLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseLine(line)
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? '']))
  })
}

// ── Variáveis, histórico e ambiente ──────────────────────────────

Object.assign(COMMAND_HANDLERS, {
  'Get-Variable': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    const automatic = {
      PWD: world.cwd,
      HOME: world.variables.HOME ?? 'C:\\Users\\miguel',
      PSVersionTable: world.variables.PSVersionTable,
      Error: world.errors ?? [],
      USERNAME: world.variables.USERNAME,
      COMPUTERNAME: world.hostname,
      ExecutionPolicy: world.executionPolicy,
    }
    const merged = { ...automatic, ...world.variables }
    let entries = Object.entries(merged)
    if (name) {
      const regex = wildcardToRegExp(name)
      entries = entries.filter(([variableName]) => regex.test(variableName) || `$${variableName}`.toLowerCase() === String(name).toLowerCase())
      if (!entries.length) throw new ShellError(`A variável '${name}' não existe nesta sessão.`, 'Use Get-Variable sem filtro para listar.')
    }
    const objects = entries.map(([variableName, value]) => ({
      Name: variableName,
      Value: Array.isArray(value) ? `[${value.length} itens]` : typeof value === 'object' && value !== null ? '{objeto}' : value,
      Type: Array.isArray(value) ? 'Object[]' : typeof value === 'number' ? 'Int32' : typeof value === 'boolean' ? 'Boolean' : 'String',
    })).sort((a, b) => a.Name.localeCompare(b.Name, 'pt-BR'))
    return resultWith(objects, { typeName: 'PSVariable', view: 'table', columns: [
      { key: 'Name', label: 'Name' },
      { key: 'Value', label: 'Value' },
      { key: 'Type', label: 'Type' },
    ] })
  },

  'Set-Variable': ({ args, world }) => {
    const name = arg(args, ['Name'], 0)
    if (!name) throw new ShellError('Set-Variable precisa de -Name.', 'Exemplo: Set-Variable -Name ambiente -Value produção')
    const value = args.named.value ?? args.positional[1] ?? ''
    world.variables[String(name)] = value
    return {
      objects: [],
      meta: { typeName: 'None', view: 'none', columns: [] },
      note: `$${name} definida com ${formatVariablePreview(value)}.`,
    }
  },

  'Get-History': ({ args, history }) => {
    const id = arg(args, ['Id'], 0)
    let entries = [...(history ?? [])]
    if (id !== undefined) entries = entries.filter((entry) => entry.Id === toNumber(id))
    return resultWith(entries, { typeName: 'HistoryInfo', view: 'table', columns: [
      { key: 'Id', label: 'Id', align: 'right' },
      { key: 'CommandLine', label: 'CommandLine' },
      { key: 'ExecutionStatus', label: 'ExecutionStatus' },
    ] }, { note: entries.length === 0 ? 'O histórico ainda está vazio. Execute um comando.' : '' })
  },
})
