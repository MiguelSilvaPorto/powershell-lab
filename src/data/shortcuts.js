const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-zÀ-ÿ_][\wÀ-ÿ.-]*)\s*\}\}/g

const PARAM_LABELS = {
  usuario: 'Usuário',
  user: 'Usuário',
  username: 'Usuário',
  identidade: 'Identidade',
  identity: 'Identidade',
  samaccountname: 'SamAccountName',
  grupo: 'Grupo',
  group: 'Grupo',
  servico: 'Serviço',
  service: 'Serviço',
  processo: 'Processo',
  process: 'Processo',
  computador: 'Computador',
  computer: 'Computador',
  tarefa: 'Tarefa',
  task: 'Tarefa',
  caminho: 'Caminho',
  path: 'Caminho',
  nome: 'Nome',
  name: 'Nome',
  filtro: 'Filtro',
  filter: 'Filtro',
  ou: 'Unidade organizacional',
  searchbase: 'Unidade organizacional',
  titulo: 'Título',
  title: 'Título',
  departamento: 'Departamento',
  department: 'Departamento',
  motivo: 'Motivo',
  reason: 'Motivo',
}

export const SHORTCUT_PROVIDERS = {
  adUsers: {
    label: 'Usuários do AD',
    short: 'usuários do AD',
    hint: 'Lê os logins do domínio e deixa você escolher um.',
    simulate: (world) => world.ad.users.map((user) => user.SamAccountName).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-ADUser -Filter * | Select-Object -ExpandProperty SamAccountName | Sort-Object -Unique',
  },
  localUsers: {
    label: 'Contas locais',
    short: 'contas locais',
    hint: 'Lê as contas locais desta máquina.',
    simulate: (world) => world.localUsers.map((user) => user.Name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-LocalUser | Select-Object -ExpandProperty Name | Sort-Object -Unique',
  },
  adGroups: {
    label: 'Grupos do AD',
    short: 'grupos do AD',
    hint: 'Lê os grupos do domínio.',
    simulate: (world) => world.ad.groups.map((group) => group.Name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-ADGroup -Filter * | Select-Object -ExpandProperty Name | Sort-Object -Unique',
  },
  localGroups: {
    label: 'Grupos locais',
    short: 'grupos locais',
    hint: 'Lê os grupos locais desta máquina.',
    simulate: (world) => world.localGroups.map((group) => group.Name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-LocalGroup | Select-Object -ExpandProperty Name | Sort-Object -Unique',
  },
  processes: {
    label: 'Processos',
    short: 'processos',
    hint: 'Lê os processos em execução.',
    simulate: (world) => [...new Set(world.processes.map((process) => process.ProcessName))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: "Get-Process | ForEach-Object { if ($IsWindows) { $_.Name } else { ($_.Name -split ' ')[0] } } | Sort-Object -Unique",
  },
  services: {
    label: 'Serviços',
    short: 'serviços',
    hint: 'Lê os serviços do sistema.',
    simulate: (world) => world.services.map((service) => service.Name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-Service | Select-Object -ExpandProperty Name | Sort-Object -Unique',
  },
  adComputers: {
    label: 'Computadores do AD',
    short: 'computadores',
    hint: 'Lê os computadores registrados no domínio.',
    simulate: (world) => world.ad.computers.map((computer) => computer.Name).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-ADComputer -Filter * | Select-Object -ExpandProperty Name | Sort-Object -Unique',
  },
  tasks: {
    label: 'Tarefas agendadas',
    short: 'tarefas',
    hint: 'Lê as tarefas agendadas do Windows.',
    simulate: (world) => world.scheduledTasks.map((task) => task.TaskName).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-ScheduledTask | Select-Object -ExpandProperty TaskName | Sort-Object -Unique',
  },
  ous: {
    label: 'OUs do AD',
    short: 'OUs',
    hint: 'Lê os caminhos (DNs) das unidades organizacionais.',
    simulate: (world) => world.ad.ous.map((ou) => ou.DistinguishedName).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    realQuery: 'Get-ADOrganizationalUnit -Filter * | Select-Object -ExpandProperty DistinguishedName | Sort-Object -Unique',
  },
}

export const SHORTCUT_PROVIDER_OPTIONS = [
  { value: '', label: 'Sem sugestões — digitar o valor' },
  { value: 'adUsers', label: SHORTCUT_PROVIDERS.adUsers.label },
  { value: 'localUsers', label: SHORTCUT_PROVIDERS.localUsers.label },
  { value: 'adGroups', label: SHORTCUT_PROVIDERS.adGroups.label },
  { value: 'localGroups', label: SHORTCUT_PROVIDERS.localGroups.label },
  { value: 'processes', label: SHORTCUT_PROVIDERS.processes.label },
  { value: 'services', label: SHORTCUT_PROVIDERS.services.label },
  { value: 'adComputers', label: SHORTCUT_PROVIDERS.adComputers.label },
  { value: 'tasks', label: SHORTCUT_PROVIDERS.tasks.label },
  { value: 'ous', label: SHORTCUT_PROVIDERS.ous.label },
]

export const SHORTCUT_MODELS = [
  {
    id: 'model-unlock-ad-user',
    name: 'Desbloquear usuário do AD',
    description: 'Escolhe uma conta do domínio e remove o bloqueio.',
    command: 'Unlock-ADAccount -Identity {{usuario}}',
  },
  {
    id: 'model-consult-ad-user',
    name: 'Consultar usuário do AD',
    description: 'Seleciona uma conta e mostra cargo, departamento e último logon.',
    command: 'Get-ADUser -Identity {{usuario}} -Properties Title, Department, LastLogon',
  },
  {
    id: 'model-restart-service',
    name: 'Reiniciar um serviço',
    description: 'Escolhe um serviço da máquina e o reinicia.',
    command: 'Restart-Service -Name {{servico}}',
  },
  {
    id: 'model-stop-process',
    name: 'Encerrar um processo',
    description: 'Escolhe um processo em execução e pede confirmação no formulário.',
    command: 'Stop-Process -Name {{processo}}',
  },
]

function normalizeToken(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function extractPlaceholders(command) {
  const seen = new Set()
  const result = []
  const text = String(command ?? '')
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1]
    const key = normalizeToken(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result
}

export function parameterLabel(name) {
  const normalized = normalizeToken(name)
  if (PARAM_LABELS[normalized]) return PARAM_LABELS[normalized]
  const text = String(name).replace(/[._-]+/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function inferProvider(name, command) {
  const param = normalizeToken(name)
  const text = String(command ?? '').toLowerCase()
  const has = (needle) => text.includes(needle)

  if (['usuario', 'user', 'username', 'identidade', 'identity', 'samaccountname'].includes(param)) {
    if (has('localuser') || has('local account')) return 'localUsers'
    if (has('aduser') || has('adaccount') || has('ad ')) return 'adUsers'
    return 'adUsers'
  }
  if (['grupo', 'group'].includes(param)) {
    if (has('localgroup') || has('local group')) return 'localGroups'
    if (has('adgroup') || has('add-adgroupmember') || has('remove-adgroupmember') || has('get-adgroupmember')) return 'adGroups'
    return 'adGroups'
  }
  if (['membro', 'membros', 'member', 'members'].includes(param)) {
    if (has('localgroup')) return 'localUsers'
    if (has('adgroup')) return 'adUsers'
  }
  if (['processo', 'process'].includes(param) || (param === 'nome' && (has('process') || has('processo')))) return 'processes'
  if (['servico', 'service'].includes(param)) return 'services'
  if (['computador', 'computer'].includes(param) || has('adcomputer')) return 'adComputers'
  if (['tarefa', 'task'].includes(param) || has('scheduledtask')) return 'tasks'
  if (['ou', 'searchbase'].includes(param) || has('adorganizationalunit')) return 'ous'
  return ''
}

export function parametersForCommand(command, existing = []) {
  const existingMap = new Map(
    (Array.isArray(existing) ? existing : []).map((parameter) => [normalizeToken(parameter.name), parameter]),
  )
  return extractPlaceholders(command).map((name) => {
    const prior = existingMap.get(normalizeToken(name))
    return {
      name,
      label: prior?.label || parameterLabel(name),
      provider: prior?.provider ?? inferProvider(name, command),
    }
  })
}

export function renderShortcutCommand(command, values = {}) {
  const text = String(command ?? '')
  const lookup = new Map()
  for (const [key, value] of Object.entries(values ?? {})) {
    const normalized = normalizeToken(key)
    if (!lookup.has(normalized)) lookup.set(normalized, value)
  }
  return text.replace(PLACEHOLDER_PATTERN, (match, name, offset) => {
    let value = values?.[name]
    if (value === undefined) value = lookup.get(normalizeToken(name))
    if (value === undefined || value === null || String(value).trim() === '') return match
    const raw = String(value)
    const before = text[offset - 1]
    const after = text[offset + match.length]
    const alreadyQuoted = (before === '"' && after === '"') || (before === "'" && after === "'")
    const safeToken = /^[\w.@:\\/-]+$/.test(raw) && !/\s/.test(raw) && !raw.startsWith('-')
    if (alreadyQuoted || safeToken) return raw
    if (/^\$|^\{|^\(/.test(raw)) return raw
    return `'${raw.replace(/'/g, "''")}'`
  })
}

export function shortcutRunCommand(shortcut, values) {
  return renderShortcutCommand(shortcut?.command, values)
}

export function normalizeShortcut(raw = {}) {
  const command = String(raw.command ?? '').trim()
  const parameters = parametersForCommand(command, raw.parameters)
  const now = new Date().toISOString()
  const values = raw.lastValues && typeof raw.lastValues === 'object' ? { ...raw.lastValues } : {}
  return {
    id: String(raw.id || `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: String(raw.name || 'Comando sem nome').trim(),
    description: String(raw.description || '').trim(),
    command,
    parameters,
    pinned: Boolean(raw.pinned),
    version: Math.max(1, Number(raw.version) || 1),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    lastRunAt: raw.lastRunAt || null,
    runCount: Math.max(0, Number(raw.runCount) || 0),
    lastValues: values,
  }
}

export function createShortcutDraft({ command = '', name = '', description = '' } = {}) {
  const base = normalizeShortcut({ command, name, description })
  return { ...base, id: '', version: 1, createdAt: null, updatedAt: null, runCount: 0, lastRunAt: null, lastValues: {} }
}

export function shortcutParameterSummary(shortcut) {
  if (!shortcut?.parameters?.length) return 'sem parâmetros'
  return shortcut.parameters.map((parameter) => parameter.label || parameter.name).join(', ')
}

export function formatShortcutDate(value) {
  if (!value) return 'nunca'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'nunca'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return 'nunca'
  }
}
