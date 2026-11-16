export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value !== 'number' || Number.isNaN(value)) return String(value)
  const maximumFractionDigits = options.maximumFractionDigits ?? (Number.isInteger(value) ? 0 : 1)
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value)
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || bytes === '') return ''
  const value = Number(bytes)
  if (Number.isNaN(value)) return String(bytes)
  if (value < 1024) return `${formatNumber(value)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value
  let index = -1
  do {
    size /= 1024
    index += 1
  } while (size >= 1024 && index < units.length - 1)
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: size >= 100 ? 0 : 1 }).format(size)} ${units[index]}`
}

export function compactNumber(value) {
  if (typeof value !== 'number') return String(value ?? '')
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function initials(name) {
  const parts = String(name ?? '').trim().split(/[\s._-]+/).filter(Boolean)
  if (!parts.length) return '?'
  return `${parts[0][0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

export function truncate(value, length = 64) {
  const text = String(value ?? '')
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

export function truncateMiddle(value, length = 50) {
  const text = String(value ?? '')
  if (text.length <= length) return text
  const half = Math.floor((length - 1) / 2)
  return `${text.slice(0, half)}…${text.slice(-half)}`
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export const RISK_META = {
  leitura: { label: 'Somente leitura', tone: 'safe' },
  altera: { label: 'Altera o sistema', tone: 'warn' },
  admin: { label: 'Administrativo', tone: 'accent' },
  cuidado: { label: 'Atenção', tone: 'danger' },
}

export function stripQuotes(value) {
  const text = String(value ?? '')
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1)
  }
  return text
}

export function formatFilterValue(value) {
  return stripQuotes(value)
}

export function isProbablyFilePath(value) {
  return /^[A-Za-z]:\\|^\\\\|^\.\\|^\//.test(String(value ?? ''))
}

export function riskMeta(risk) {
  return RISK_META[risk] ?? RISK_META.leitura
}

export function readableKind(kind) {
  const labels = {
    cmdlet: 'comando',
    intent: 'intenção',
    param: 'parâmetro',
    value: 'valor',
    pipeline: 'próxima etapa',
    verify: 'verificar',
    starter: 'começar',
  }
  return labels[kind] ?? kind
}
