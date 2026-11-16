import {
  COMMANDS,
  findCommand,
  isSwitchName,
  categoryFor,
} from '../data/catalog.js'
import { CURATED_INTENTS, INTENT_STARTERS } from '../data/intents.js'
import {
  splitStatements,
  splitPipeline,
  tokenizeStage,
  endsWithWhitespace,
} from './parser.js'

const STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas',
  'em', 'para', 'pra', 'por', 'com', 'que', 'meu', 'minha', 'meus', 'minhas', 'quero', 'queria', 'preciso',
  'como', 'onde', 'qual', 'quais', 'e', 'ou', 'the', 'my', 'to', 'in', 'me', 'please', 'por favor', 'favor',
  'um', 'essa', 'esse', 'isso', 'esta', 'este', 'tem', 'ter', 'fazer', 'faco', 'usando', 'usar', 'aqui',
])

const SYNONYMS = {
  adicionar: 'add', adiciona: 'add', adicionar: 'add', adiciono: 'add', incluir: 'add', inclui: 'add',
  inserir: 'add', insere: 'add', cadastrar: 'add', cadastra: 'add', criar: 'add', cria: 'add', crie: 'add',
  criar: 'add', novo: 'add', nova: 'add', novos: 'add', novas: 'add', add: 'add', create: 'add', new: 'add',
  register: 'add',
  get: 'get', ver: 'get', veja: 'get', listar: 'get', lista: 'get', list: 'get', mostrar: 'get', mostra: 'get',
  exibir: 'get', exibe: 'get', consultar: 'get', consulta: 'get', buscar: 'get', busca: 'get', procurar: 'get',
  procura: 'get', encontrar: 'get', encontra: 'get', read: 'get', show: 'get', check: 'get', inspect: 'get',
  pesquisar: 'get', pesquisa: 'get',
  remover: 'remove', remove: 'remove', remover: 'remove', apagar: 'remove', apaga: 'remove', excluir: 'remove',
  exclui: 'remove', deletar: 'remove', deleta: 'remove', delete: 'remove', tirar: 'remove', tira: 'remove',
  desconectar: 'remove', desmapear: 'remove',
  alterar: 'set', altera: 'set', mudar: 'set', muda: 'set', atualizar: 'set', atualiza: 'set',
  configurar: 'set', configura: 'set', definir: 'set', define: 'set', set: 'set', update: 'set', change: 'set',
  editar: 'set', edita: 'set',
  usuario: 'user', usuarios: 'user', user: 'user', users: 'user', pessoa: 'user', pessoas: 'user',
  conta: 'user', contas: 'user', login: 'user', membro: 'user', membros: 'user', member: 'user', members: 'user',
  grupo: 'group', grupos: 'group', group: 'group', groups: 'group',
  processo: 'process', processos: 'process', process: 'process', programa: 'process', programas: 'process',
  app: 'process', aplicativo: 'process',
  servico: 'service', servicos: 'service', service: 'service', services: 'service',
  computador: 'computer', computadores: 'computer', computer: 'computer', maquina: 'computer', maquinas: 'computer',
  servidor: 'computer', servidores: 'computer', host: 'computer',
  rede: 'network', redes: 'network', network: 'network',
  mapear: 'map', mapeamento: 'map', mapeamentos: 'map', map: 'map', mapeado: 'map', montar: 'map',
  monta: 'map', conectar: 'map', conecta: 'map', drive: 'drive', drives: 'drive',
  unidade: 'drive', unidades: 'drive', letra: 'drive',
  pasta: 'folder', pastas: 'folder', diretorio: 'folder', diretorios: 'folder', folder: 'folder', directory: 'folder',
  arquivo: 'file', arquivos: 'file', file: 'file', files: 'file',
  compartilhamento: 'share', compartilhamentos: 'share', share: 'share', shares: 'share',
  ad: 'ad', active: 'ad', directory: 'ad', dominio: 'ad', domain: 'ad', dc: 'ad',
  local: 'local', locais: 'local',
  tarefa: 'task', tarefas: 'task', agendada: 'task', agendadas: 'task', agendamento: 'task', agendamentos: 'task',
  task: 'task', tasks: 'task', scheduled: 'task',
  modulo: 'module', modulos: 'module', module: 'module', modules: 'module', pacote: 'module',
  planilha: 'csv', planilhas: 'csv', csv: 'csv', spreadsheet: 'csv',
  json: 'json', registro: 'registry', registry: 'registry',
  politica: 'policy', politicas: 'policy', policy: 'policy', execucao: 'policy',
  bloqueado: 'blocked', bloqueada: 'blocked', bloqueados: 'blocked', bloqueadas: 'blocked', locked: 'blocked',
  bloquear: 'block', desbloquear: 'unlock', desbloqueia: 'unlock', liberar: 'unlock', unlock: 'unlock',
  desativar: 'disable', desativa: 'disable', desativado: 'disable', disabled: 'disable', disable: 'disable',
  ativar: 'enable', ativa: 'enable', habilitar: 'enable', habilita: 'enable', habilitado: 'enable', enable: 'enable',
  energia: 'power', espaco: 'space', disco: 'disk', volume: 'disk', volumes: 'disk',
  memoria: 'memory', cpu: 'cpu', processador: 'cpu', ip: 'ip', dns: 'dns', porta: 'port', portas: 'port',
  servicos: 'service', status: 'status', estado: 'status', informacoes: 'info', informacao: 'info',
  detalhes: 'info', detalhe: 'info', especificacoes: 'info',
  ss: 'info', versao: 'version', versao: 'version', version: 'version', powershell: 'powershell',
  ajuda: 'help', help: 'help', documentacao: 'help', docs: 'help', exemplos: 'example', exemplo: 'example',
  executar: 'invoke', execute: 'invoke', rodar: 'invoke', run: 'invoke', chamar: 'invoke', chamar: 'invoke',
  agendar: 'task', automacao: 'task', automacoes: 'task',
  relatorio: 'report', relatorios: 'report', report: 'report',
  historico: 'history', history: 'history', variaveis: 'env', variavel: 'env', ambiente: 'env', environment: 'env',
  propriedades: 'property', propriedade: 'property', campos: 'property', propriedades: 'property',
  filtrar: 'filter', filtro: 'filter', filter: 'filter', ordenar: 'sort', ordernar: 'sort', sort: 'sort',
  top: 'top', maiores: 'top', pesados: 'heavy', pesado: 'heavy', uso: 'usage', usando: 'usage',
  bloqueio: 'lock', senha: 'password', passwords: 'password', conta: 'user',
  computadores: 'computer', impressao: 'print', print: 'print', spooler: 'spooler',
  certo: 'right', errado: 'wrong', erro: 'error', erros: 'error', log: 'log', logs: 'log',
  texto: 'text', palavra: 'text', palavras: 'text', procurar: 'get',
  mapear: 'map', unidade: 'drive', dominio: 'ad', usuarios: 'user', contas: 'user',
}

const CATALOG_GENERATED_INTENTS = COMMANDS.flatMap((command) =>
  (command.intents ?? []).map((phrase, index) => ({
    id: `catalog-${command.name}-${index}`,
    phrases: [phrase],
    cmdlet: command.name,
    title: command.summary,
    template: command.example,
    why: command.summary,
    category: command.cat,
    weight: 0.72,
    generated: true,
  })),
)

const ALL_INTENTS = [...CURATED_INTENTS, ...CATALOG_GENERATED_INTENTS]

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function naturalTokens(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => SYNONYMS[token] ?? token)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

const INTENT_INDEX = ALL_INTENTS.map((intent) => ({
  ...intent,
  _phrases: intent.phrases.map((phrase) => ({
    text: normalizeText(phrase),
    tokens: [...new Set(naturalTokens(phrase))],
  })),
  _tokens: [...new Set(naturalTokens([...intent.phrases, intent.title, intent.cmdlet].join(' ')))],
}))

function rankIntents(query, limit = 3) {
  const queryText = normalizeText(query)
  const queryTokens = [...new Set(naturalTokens(query))]
  if (!queryTokens.length) return []
  if (queryTokens.length < 2 && queryText.length < 8) return []

  const ranked = INTENT_INDEX.map((intent) => {
    let best = 0
    for (const phrase of intent._phrases) {
      let score = 0
      if (phrase.text === queryText) {
        score = 12
      } else {
        let matched = 0
        let partial = 0
        const phraseTokenSet = new Set(phrase.tokens)
        for (const token of queryTokens) {
          if (phraseTokenSet.has(token)) matched += 1
          else if (phrase.tokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) partial += 1
        }
        if (matched === 0 && partial === 0) continue
        score = matched * 2.4 + partial * 0.9 - (queryTokens.length - matched - partial) * 0.6
        if (matched === queryTokens.length) score += 1.3
        if (phrase.tokens.length) score += (matched / phrase.tokens.length) * 1.4
        if (phrase.text.includes(queryText) && queryText.length >= 4) score += 2.4
        else if (queryText.includes(phrase.text) && phrase.text.length >= 4) score += 1
        if (matched === 0) score *= 0.35
      }
      best = Math.max(best, score)
    }
    return { ...intent, score: Number((best * (intent.weight ?? 1)).toFixed(2)) }
  })
    .filter((intent) => intent.score >= 3.4)
    .sort((a, b) => b.score - a.score)

  const deduped = []
  const seen = new Set()
  for (const intent of ranked) {
    const key = intent.cmdlet.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(intent)
    if (deduped.length >= limit) break
  }
  return deduped
}

function searchCommands(query, limit = 6) {
  const normalized = normalizeText(query)
  if (!normalized) return []
  const words = normalized.split(' ').filter(Boolean)
  const compactQuery = normalized.replace(/\s+/g, '')

  const scores = []
  for (const command of COMMANDS) {
    const name = command.name.toLowerCase()
    const compact = name.replace(/-/g, '')
    let score = 0
    if (name === normalized) score = 120
    else if (name.startsWith(normalized)) score = 92 - Math.min(30, name.length - normalized.length)
    else if (name.includes(normalized)) score = 62 - Math.min(20, name.length - normalized.length)
    else if (normalized.includes(name)) score = 45
    else if (words.length > 1 && words.every((word) => compact.includes(word))) score = 58 - words.length
    else if (compactQuery.length >= 3 && subsequence(compactQuery, compact)) score = 16

    if (!score) {
      for (const alias of command.aliases) {
        if (alias.toLowerCase() === normalized) {
          score = Math.max(score, 110)
        } else if (alias.toLowerCase().startsWith(normalized)) {
          score = Math.max(score, 70)
        }
      }
    }

    if (score) scores.push({ command, score })
  }

  return scores
    .filter((entry) => entry.score >= 18)
    .sort((a, b) => b.score - a.score || a.command.name.length - b.command.name.length || a.command.name.localeCompare(b.command.name))
    .slice(0, limit)
    .map((entry) => entry.command)
}

function subsequence(needle, haystack) {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index += 1
    if (index >= needle.length) return true
  }
  return needle.length === 0
}

function getParamDefinition(command, name) {
  if (!command) return null
  return (command.params ?? []).find((param) => param.name.toLowerCase() === String(name).toLowerCase()) ?? null
}

function takesValue(command, name) {
  const definition = getParamDefinition(command, name)
  if (definition) return !definition.switch
  return !isSwitchName(name)
}

function suggestionId(kind, label, index = 0) {
  return `${kind}-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-${index}`
}

function commandSuggestion(command, { apply = 'replaceLine', description = null, kind = 'cmdlet' } = {}) {
  return {
    id: suggestionId(kind, command.name),
    kind,
    label: command.name,
    title: command.name,
    description: description ?? command.summary,
    insert: command.name,
    apply,
    category: command.cat,
    commandName: command.name,
    badge: kind === 'starter' ? 'começar' : 'cmdlet',
    risk: command.risk,
    output: command.output,
  }
}

function intentSuggestion(intent) {
  const command = findCommand(intent.cmdlet)
  return {
    id: suggestionId('intent', intent.id),
    kind: 'intent',
    label: intent.cmdlet,
    title: intent.title,
    description: intent.why,
    insert: intent.template,
    apply: 'replaceLine',
    category: intent.category ?? command?.cat ?? 'inicio',
    commandName: intent.cmdlet,
    badge: 'intenção',
    intentId: intent.id,
    template: intent.template,
  }
}

const PIPELINE_LIBRARY = {
  processes: [
    { snippet: 'Where-Object { $_.CPU -gt 10 }', description: 'Manter apenas processos com mais de 10 segundos de CPU.' },
    { snippet: 'Sort-Object CPU -Descending', description: 'Colocar os maiores consumidores no topo.' },
    { snippet: 'Select-Object ProcessName, CPU, WorkingSet -First 5', description: 'Escolher colunas e limitar o resultado.' },
    { snippet: 'Measure-Object CPU -Sum -Average', description: 'Somar e calcular a média de CPU.' },
    { snippet: 'Get-Member', description: 'Ver todas as propriedades disponíveis em cada processo.' },
  ],
  files: [
    { snippet: 'Where-Object { $_.Length -gt 1MB }', description: 'Manter apenas arquivos maiores que 1 MB.' },
    { snippet: 'Sort-Object Length -Descending', description: 'Ordenar do maior para o menor.' },
    { snippet: 'Select-Object Name, Length, LastWriteTime', description: 'Escolher nome, tamanho e data de alteração.' },
    { snippet: 'Measure-Object Length -Sum', description: 'Somar o tamanho total dos itens.' },
    { snippet: 'Where-Object { $_.Name -like "*.txt" }', description: 'Filtrar pelo nome usando curinga.' },
  ],
  adUsers: [
    { snippet: 'Where-Object { $_.Enabled -eq $true }', description: 'Manter apenas contas habilitadas.' },
    { snippet: 'Select-Object Name, SamAccountName, Department, Enabled', description: 'Escolher colunas úteis para um relatório.' },
    { snippet: 'Sort-Object Name', description: 'Ordenar as pessoas por nome.' },
    { snippet: 'Group-Object Department', description: 'Contar quantas pessoas existem por departamento.' },
    { snippet: 'Export-Csv .\\Documentos\\usuarios.csv -NoTypeInformation', description: 'Salvar o resultado em uma planilha CSV.' },
  ],
  adGroups: [
    { snippet: 'Select-Object Name, Scope, MemberCount', description: 'Ver nome, escopo e quantidade de membros.' },
    { snippet: 'Where-Object { $_.MemberCount -gt 2 }', description: 'Manter grupos com mais de dois membros.' },
    { snippet: 'Sort-Object MemberCount -Descending', description: 'Colocar os grupos maiores no topo.' },
  ],
  adComputers: [
    { snippet: 'Select-Object Name, OperatingSystem, LastLogon', description: 'Escolher as colunas de inventário.' },
    { snippet: 'Where-Object { $_.OperatingSystem -like "*Server*" }', description: 'Manter apenas servidores.' },
    { snippet: 'Sort-Object Name', description: 'Ordenar as máquinas por nome.' },
  ],
  localUsers: [
    { snippet: 'Select-Object Name, Enabled, Description', description: 'Escolher as colunas da conta local.' },
    { snippet: 'Where-Object { $_.Enabled -eq $false }', description: 'Encontrar contas locais desativadas.' },
    { snippet: 'Format-Table -AutoSize', description: 'Ajustar a tabela automaticamente.' },
  ],
  services: [
    { snippet: 'Where-Object Status -eq "Running"', description: 'Manter apenas serviços em execução.' },
    { snippet: 'Sort-Object DisplayName', description: 'Ordenar pelo nome exibido.' },
    { snippet: 'Select-Object Name, DisplayName, Status, StartType', description: 'Montar uma visão limpa do estado.' },
  ],
  tasks: [
    { snippet: 'Select-Object TaskName, State, Schedule', description: 'Resumir nome, estado e agenda.' },
    { snippet: 'Where-Object { $_.State -eq "Ready" }', description: 'Ver apenas tarefas prontas para executar.' },
    { snippet: 'Format-Table -AutoSize', description: 'Ajustar as colunas da tabela.' },
  ],
  modules: [
    { snippet: 'Select-Object Name, Version, Description', description: 'Escolher as colunas do módulo.' },
    { snippet: 'Sort-Object Name', description: 'Ordenar os módulos por nome.' },
    { snippet: 'Where-Object { $_.Imported -eq $true }', description: 'Ver apenas o que já está carregado.' },
  ],
  smbMappings: [
    { snippet: 'Select-Object LocalPath, RemotePath, Status', description: 'Ver o par letra → compartilhamento.' },
    { snippet: 'Where-Object { $_.Status -eq "OK" }', description: 'Manter apenas mapeamentos saudáveis.' },
  ],
  shares: [
    { snippet: 'Select-Object Name, Path, Description', description: 'Escolher as colunas do compartilhamento.' },
    { snippet: 'Where-Object { $_.Name -like "*Fin*" }', description: 'Filtrar compartilhamentos pelo nome.' },
  ],
  network: [
    { snippet: 'Format-List', description: 'Ver todos os detalhes da configuração.' },
    { snippet: 'Select-Object InterfaceAlias, IPv4Address, DefaultGateway', description: 'Destacar IP e gateway.' },
  ],
  networkConnections: [
    { snippet: 'Where-Object { $_.State -eq "Listen" }', description: 'Ver apenas portas aguardando conexão.' },
    { snippet: 'Sort-Object LocalPort', description: 'Ordenar pelas portas locais.' },
    { snippet: 'Select-Object LocalAddress, LocalPort, State, OwningProcess', description: 'Escolher as colunas de diagnóstico.' },
  ],
  registry: [
    { snippet: 'Format-List', description: 'Ver o valor em formato vertical.' },
    { snippet: 'Select-Object Theme, AutoSave, User', description: 'Selecionar valores específicos da chave.' },
  ],
  text: [
    { snippet: 'Set-Content .\\Documentos\\saida.txt', description: 'Gravar a saída em um arquivo de texto.' },
    { snippet: 'Out-File -FilePath .\\Documentos\\saida.txt', description: 'Redirecionar a saída para um arquivo.' },
  ],
  objects: [
    { snippet: 'Select-Object -First 5', description: 'Manter apenas os primeiros cinco objetos.' },
    { snippet: 'Where-Object { $_.Name -like "*a*" }', description: 'Filtrar pelo nome, quando essa propriedade existir.' },
    { snippet: 'Sort-Object Name', description: 'Ordenar pelo nome.' },
    { snippet: 'Get-Member', description: 'Descobrir o tipo e as propriedades dos objetos.' },
    { snippet: 'Format-Table -AutoSize', description: 'Exibir tudo em uma tabela ajustada.' },
  ],
}

const TYPE_FALLBACK = {
  table: 'objects',
  list: 'objects',
  json: 'objects',
  session: 'sessions',
  cim: 'objects',
  volume: 'objects',
  text: 'text',
  none: 'objects',
}

function outputKindForCommand(command) {
  if (!command) return 'objects'
  return TYPE_FALLBACK[command.output] ?? command.output ?? 'objects'
}

function inferPipelineOutput(stageEntries) {
  for (let index = stageEntries.length - 1; index >= 0; index -= 1) {
    const command = stageEntries[index]
    if (!command) continue
    const kind = outputKindForCommand(command)
    if (!['objects', 'text', 'table', 'list', 'none'].includes(kind)) return kind
  }
  return stageEntries.length ? outputKindForCommand(stageEntries[stageEntries.length - 1]) : 'objects'
}

function usedStageCommands(stageTexts) {
  return stageTexts.map((text) => {
    const tokens = tokenizeStage(text)
    return tokens[0]?.type !== 'param' ? findCommand(tokens[0]?.value) : null
  }).filter(Boolean)
}

function pipelineSuggestions({ stageEntries, line, pipeOpen = false, outputKind = 'objects', verify = [] }) {
  const entries = PIPELINE_LIBRARY[outputKind] ?? PIPELINE_LIBRARY.objects
  const existing = usedStageCommands(splitPipeline(splitStatements(line).at(-1) ?? line)).map((command) => command.name.toLowerCase())
  const suggestions = []

  for (const verifySuggestion of verify) suggestions.push(verifySuggestion)

  for (const entry of entries) {
    const firstWord = entry.snippet.split(/\s+/)[0]
    const commandName = findCommand(firstWord)?.name?.toLowerCase() ?? firstWord.toLowerCase()
    if (existing.includes(commandName) && commandName !== 'select-object' && commandName !== 'sort-object') continue
    if (suggestions.some((item) => item.insert === entry.snippet)) continue
    const command = findCommand(firstWord)
    suggestions.push({
      id: suggestionId('pipeline', entry.snippet),
      kind: 'pipeline',
      label: entry.snippet,
      title: entry.snippet,
      description: entry.description,
      insert: entry.snippet,
      apply: 'appendPipeline',
      category: command?.cat ?? 'objetos',
      commandName: command?.name ?? firstWord,
      badge: 'próxima etapa',
    })
  }

  return suggestions
}

function buildVerification(preview) {
  if (!preview?.effects?.length) return []
  const suggestions = []
  const seen = new Set()
  for (const effectItem of preview.effects) {
    let suggestion = null
    if (effectItem.type === 'ad:user:create' && effectItem.user?.sam) {
      suggestion = {
        label: `Get-ADUser -Identity ${effectItem.user.sam}`,
        description: 'Ver a conta que acabou de ser criada no domínio.',
        commandName: 'Get-ADUser',
        category: 'ad',
      }
    } else if (effectItem.type === 'ad:group:members' && effectItem.groupSam) {
      suggestion = {
        label: `Get-ADGroupMember -Identity ${effectItem.groupSam}`,
        description: 'Conferir os membros atuais do grupo.',
        commandName: 'Get-ADGroupMember',
        category: 'ad',
      }
    } else if (effectItem.type === 'ad:account' && effectItem.sam) {
      suggestion = {
        label: `Get-ADUser -Identity ${effectItem.sam}`,
        description: 'Conferir o estado da conta depois da alteração.',
        commandName: 'Get-ADUser',
        category: 'ad',
      }
    } else if (effectItem.type === 'ad:user:update' && effectItem.sam) {
      suggestion = {
        label: `Get-ADUser -Identity ${effectItem.sam} -Properties Title, Department`,
        description: 'Ver as propriedades atualizadas no domínio.',
        commandName: 'Get-ADUser',
        category: 'ad',
      }
    } else if (effectItem.type === 'ad:ou:create' && effectItem.name) {
      suggestion = {
        label: 'Get-ADOrganizationalUnit -Filter *',
        description: `Confirmar a nova OU ${effectItem.name}.`,
        commandName: 'Get-ADOrganizationalUnit',
        category: 'ad',
      }
    } else if (effectItem.type === 'smb:map' && effectItem.localPath) {
      suggestion = {
        label: `Get-SmbMapping -LocalPath ${effectItem.localPath}`,
        description: 'Conferir o mapeamento recém-criado.',
        commandName: 'Get-SmbMapping',
        category: 'rede',
      }
    } else if (effectItem.type === 'smb:unmap') {
      suggestion = {
        label: 'Get-SmbMapping',
        description: 'Conferir os mapeamentos que restaram.',
        commandName: 'Get-SmbMapping',
        category: 'rede',
      }
    } else if (effectItem.type === 'service:state' && effectItem.name) {
      suggestion = {
        label: `Get-Service -Name ${effectItem.name}`,
        description: 'Verificar o novo estado do serviço.',
        commandName: 'Get-Service',
        category: 'processos',
      }
    } else if (effectItem.type === 'process:stop') {
      suggestion = {
        label: 'Get-Process',
        description: 'Atualizar a lista depois de encerrar o processo.',
        commandName: 'Get-Process',
        category: 'processos',
      }
    } else if (effectItem.type === 'task:create' && effectItem.name) {
      suggestion = {
        label: `Get-ScheduledTask -TaskName "${effectItem.name}"`,
        description: 'Conferir a tarefa recém-registrada.',
        commandName: 'Get-ScheduledTask',
        category: 'automacao',
      }
    } else if (effectItem.type === 'task:state') {
      suggestion = {
        label: 'Get-ScheduledTask',
        description: 'Verificar o estado das tarefas agendadas.',
        commandName: 'Get-ScheduledTask',
        category: 'automacao',
      }
    } else if (effectItem.type === 'module:install' && effectItem.name) {
      suggestion = {
        label: `Import-Module ${effectItem.name}`,
        description: 'Carregar o módulo que acabou de ser instalado.',
        commandName: 'Import-Module',
        category: 'modulos',
      }
    } else if (effectItem.type === 'local:user:create' && effectItem.name) {
      suggestion = {
        label: `Get-LocalUser -Name ${effectItem.name}`,
        description: 'Conferir a conta local criada.',
        commandName: 'Get-LocalUser',
        category: 'seguranca',
      }
    } else if (effectItem.type === 'local:account' && effectItem.name) {
      suggestion = {
        label: `Get-LocalUser -Name ${effectItem.name}`,
        description: 'Verificar o estado da conta local.',
        commandName: 'Get-LocalUser',
        category: 'seguranca',
      }
    } else if (effectItem.type === 'execution:policy') {
      suggestion = {
        label: 'Get-ExecutionPolicy -List',
        description: 'Ver a política por escopo depois da alteração.',
        commandName: 'Get-ExecutionPolicy',
        category: 'seguranca',
      }
    } else if (effectItem.type === 'registry:set' && effectItem.path) {
      suggestion = {
        label: `Get-ItemProperty -Path "${effectItem.path}" -Name ${effectItem.name ?? ''}`.trim(),
        description: 'Confirmar o valor gravado no registro.',
        commandName: 'Get-ItemProperty',
        category: 'registro',
      }
    } else if (['fs:create-dir', 'fs:create-file', 'fs:write'].includes(effectItem.type)) {
      const path = effectItem.path ?? ''
      suggestion = {
        label: effectItem.type === 'fs:create-dir' ? `Get-ChildItem "${parentWindowsPath(path)}"` : `Get-Content "${path}"`,
        description: 'Ver o resultado no sistema de arquivos simulado.',
        commandName: effectItem.type === 'fs:create-dir' ? 'Get-ChildItem' : 'Get-Content',
        category: 'arquivos',
      }
    }

    if (!suggestion || seen.has(suggestion.label)) continue
    seen.add(suggestion.label)
    suggestions.push({
      id: suggestionId('verify', suggestion.label),
      kind: 'verify',
      label: suggestion.label,
      title: suggestion.label,
      description: suggestion.description,
      insert: suggestion.label,
      apply: 'replaceLine',
      category: suggestion.category,
      commandName: suggestion.commandName,
      badge: 'verificar',
    })
    if (suggestions.length >= 2) break
  }
  return suggestions
}

function parentWindowsPath(path) {
  const normalized = String(path).replace(/\\+$/, '')
  const index = normalized.lastIndexOf('\\')
  return index <= 2 ? normalized.slice(0, 3) : normalized.slice(0, index)
}

const REQUIRED_GROUPS = {
  'New-ADUser': [['Name'], ['SamAccountName']],
  'Get-ADUser': [['Filter', 'Identity']],
  'Get-ADGroup': [['Filter', 'Identity']],
  'Get-ADComputer': [['Filter', 'Identity']],
  'Set-ADUser': [['Identity']],
  'Enable-ADAccount': [['Identity']],
  'Disable-ADAccount': [['Identity']],
  'Unlock-ADAccount': [['Identity']],
  'Get-ADGroupMember': [['Identity']],
  'Add-ADGroupMember': [['Identity'], ['Members']],
  'Get-ADPrincipalGroupMembership': [['Identity']],
  'New-ADOrganizationalUnit': [['Name']],
  'New-SmbMapping': [['RemotePath']],
  'New-LocalUser': [['Name']],
  'New-Item': [['Path']],
  'Get-Content': [['Path']],
  'Set-Content': [['Path', 'Value']],
  'Copy-Item': [['Path'], ['Destination']],
  'Move-Item': [['Path'], ['Destination']],
  'Register-ScheduledTask': [['TaskName'], ['Action']],
  'New-PSSession': [['ComputerName']],
  'Invoke-Command': [['ComputerName', 'Session'], ['ScriptBlock']],
  'Remove-PSSession': [['Id']],
  'Add-LocalGroupMember': [['Group'], ['Member']],
  'Get-LocalGroupMember': [['Group']],
  'Install-Module': [['Name']],
  'Find-Module': [['Name']],
  'Import-Module': [['Name']],
  'Export-Csv': [['Path']],
  'Import-Csv': [['Path']],
  'Set-ItemProperty': [['Path'], ['Name']],
  'Get-ItemProperty': [['Path']],
  'Get-AuthenticodeSignature': [['FilePath']],
  'Get-FileHash': [['Path']],
  'Select-String': [['Pattern']],
  'New-SmbMapping': [['RemotePath']],
  'Get-Random': [],
  'Set-ExecutionPolicy': [['ExecutionPolicy']],
  'Test-NetConnection': [['ComputerName']],
  'Test-Connection': [['ComputerName']],
  'Resolve-DnsName': [['Name']],
  'New-PSSession': [['ComputerName']],
  'Search-ADAccount': [],
}

const PROPERTY_HINTS = {
  processes: ['ProcessName', 'CPU', 'WorkingSet', 'Id', 'Status'],
  files: ['Name', 'Length', 'LastWriteTime', 'Mode', 'FullName'],
  adUsers: ['Name', 'SamAccountName', 'Department', 'Title', 'Enabled', 'LastLogon'],
  adGroups: ['Name', 'Scope', 'MemberCount', 'Description'],
  adComputers: ['Name', 'OperatingSystem', 'DNSHostName', 'Enabled'],
  services: ['Name', 'DisplayName', 'Status', 'StartType'],
  tasks: ['TaskName', 'State', 'Schedule', 'TaskPath'],
  modules: ['Name', 'Version', 'Description'],
  smbMappings: ['LocalPath', 'RemotePath', 'Status', 'Persistent'],
  network: ['InterfaceAlias', 'IPv4Address', 'DefaultGateway', 'DNSServers'],
  objects: ['Name', 'Value'],
}

function availableDriveLetters(world) {
  const used = new Set(['C:', 'D:', 'A:', 'B:', ...((world.network?.mappings ?? []).map((mapping) => mapping.LocalPath).map((letter) => `${letter.charAt(0).toUpperCase()}:`))])
  const letters = []
  for (let code = 90; code >= 84 && letters.length < 4; code -= 1) {
    const letter = `${String.fromCharCode(code)}:`
    if (!used.has(letter)) letters.push(letter)
  }
  return letters
}

function valueHints(commandName, paramName, world, outputKind = 'objects') {
  const cmd = String(commandName ?? '').toLowerCase()
  const param = String(paramName ?? '').toLowerCase()
  const paramDef = getParamDefinition(findCommand(commandName), paramName)
  const hints = []
  const add = (value, description = '') => {
    if (value === undefined || value === null || value === '') return
    const text = String(value)
    if (hints.some((hint) => hint.value === text)) return
    hints.push({ value: text, description })
  }

  const adUsers = world.ad.users.map((user) => user.SamAccountName)
  const adGroups = world.ad.groups.map((group) => group.Name)
  const localUsers = world.localUsers.map((user) => user.Name)
  const localGroups = world.localGroups.map((group) => group.Name)
  const processNames = [...new Set(world.processes.map((process) => process.ProcessName))].sort()
  const serviceNames = world.services.map((service) => service.Name).sort()
  const taskNames = world.scheduledTasks.map((task) => task.TaskName)
  const sharePaths = world.network.shares.map((share) => `\\\\SRV-FILE01\\${share.Name}`)
  const ouPaths = world.ad.ous.map((ou) => ou.DistinguishedName)

  if (param === 'itemtype') {
    add('Directory', 'Criar uma pasta.')
    add('File', 'Criar um arquivo.')
    return hints
  }
  if (param === 'executionpolicy') {
    for (const value of ['RemoteSigned', 'Restricted', 'AllSigned', 'Bypass', 'Unrestricted']) add(value)
    return hints
  }
  if (param === 'startuptype') {
    for (const value of ['Automatic', 'Manual', 'Disabled']) add(value)
    return hints
  }
  if (param === 'scope' && cmd.includes('executionpolicy')) {
    for (const value of ['CurrentUser', 'LocalMachine', 'Process']) add(value)
    return hints
  }
  if (param === 'scope' && cmd.includes('module')) {
    for (const value of ['CurrentUser', 'AllUsers']) add(value)
    return hints
  }
  if (param === 'erroraction') {
    for (const value of ['SilentlyContinue', 'Stop', 'Continue']) add(value)
    return hints
  }
  if (param === 'addressfamily') {
    for (const value of ['IPv4', 'IPv6']) add(value)
    return hints
  }
  if (param === 'method') {
    for (const value of ['GET', 'POST', 'PUT']) add(value)
    return hints
  }
  if (param === 'algorithm') {
    for (const value of ['SHA256', 'SHA1', 'MD5']) add(value)
    return hints
  }
  if (param === 'psprovider') {
    for (const value of ['FileSystem', 'Registry', 'Environment']) add(value)
    return hints
  }
  if (param === 'driveletter') {
    add('C', 'Disco do sistema.')
    return hints
  }
  if (param === 'state') {
    for (const value of ['Established', 'Listen']) add(value)
    return hints
  }
  if (param === 'classname') {
    for (const value of ['Win32_OperatingSystem', 'Win32_ComputerSystem', 'Win32_LogicalDisk', 'Win32_Processor', 'Win32_Process']) add(value)
    return hints
  }
  if (param === 'filter') {
    if (cmd.includes('aduser')) {
      add('*', 'Todos os usuários.')
      add('"Department -eq \'TI\'"', 'Filtrar pelo departamento.')
      add('"Enabled -eq $false"', 'Encontrar contas desativadas.')
      add('"Name -like \'*Silva*\'"', 'Procurar pelo nome.')
    } else if (cmd.includes('adgroup')) {
      add('*', 'Todos os grupos.')
      add('"Name -like \'*TI*\'"', 'Grupos com TI no nome.')
    } else if (cmd.includes('adcomputer')) {
      add('*', 'Todos os computadores.')
      add('"OperatingSystem -like \'*Server*\'"', 'Apenas servidores.')
    } else if (cmd.includes('childitem')) {
      add('*.txt', 'Somente arquivos de texto.')
      add('*.log', 'Somente arquivos de log.')
      add('*.ps1', 'Somente scripts PowerShell.')
    } else {
      add('*', 'Todos os objetos.')
    }
    return hints
  }
  if (param === 'properties' || param === 'property' && cmd.includes('aduser')) {
    for (const value of ['*', 'Title', 'Department', 'EmailAddress', 'LastLogon']) add(value)
    return hints
  }
  if (param === 'property') {
    for (const value of PROPERTY_HINTS[outputKind] ?? PROPERTY_HINTS.objects) add(value)
    return hints
  }
  if (param === 'searchbase') {
    for (const value of ouPaths.slice(0, 4)) add(value)
    return hints
  }
  if (param === 'path' || param === 'filepath') {
    if (cmd.includes('aduser') && param !== 'filepath') {
      for (const value of ouPaths.slice(0, 3)) add(value)
    } else if (cmd.includes('adorganizationalunit')) {
      for (const value of ouPaths.slice(0, 3)) add(value)
    } else if (cmd.includes('itemproperty') || cmd.includes('item') && cmd.includes('property') || cmd.includes('itemproperty') || cmd === 'set-itemproperty' || cmd === 'remove-itemproperty') {
      add('HKCU:\\Software\\PowerShellLab', 'Chave de configuração do laboratório.')
      add('HKCU:\\Software', 'Raiz de software do usuário.')
      add('HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'Versão do Windows.')
    } else if (cmd.includes('csv')) {
      add('.\\Documentos\\relatorio-vendas.csv', 'Planilha de vendas existente.')
      add('.\\Documentos\\usuarios.csv', 'Relatório exportado.')
    } else if (cmd.includes('content')) {
      add('.\\Documentos\\notas-reuniao.txt', 'Anotações existentes.')
      add('.\\Temp\\logs-2026.log', 'Arquivo de log.')
    } else if (cmd.includes('childitem') || cmd === 'get-item') {
      add('.\\Documentos', 'Pasta de documentos.')
      add('C:\\Temp', 'Pasta temporária.')
      add('C:\\Logs', 'Logs do sistema.')
    } else if (cmd.includes('new-item')) {
      add('.\\Documentos\\novo-projeto', 'Criar uma pasta de projeto.')
      add('.\\Documentos\\notas.txt', 'Criar um arquivo de anotações.')
    } else if (cmd.includes('copy') || cmd.includes('move')) {
      add('.\\Documentos\\notas-reuniao.txt', 'Origem existente.')
      add('.\\Downloads\\notas-copia.txt', 'Destino de exemplo.')
    } else if (cmd.includes('filehash') || cmd.includes('authenticode')) {
      add('C:\\Temp\\scripts\\backup.ps1', 'Script de exemplo.')
      add('.\\Downloads\\instalador.exe', 'Arquivo para verificar.')
    } else if (cmd.includes('out-file')) {
      add('.\\Documentos\\saida.txt', 'Arquivo de saída.')
    } else {
      add('.\\Documentos')
    }
    return hints
  }
  if (param === 'destination') {
    add('.\\Downloads\\copia.txt')
    add('.\\Documentos\\notas-movidas.txt')
    add('.\\Documentos')
    return hints
  }
  if (param === 'newname') {
    add('notas-pessoais.txt')
    add('relatorio-final.csv')
    return hints
  }
  if (param === 'name') {
    if (cmd.includes('new-aduser')) {
      add('"Marina Alves"', 'Nome de exibição da nova pessoa.')
      add('"Lara Martins"')
    } else if (cmd.includes('adgroup') || cmd.includes('adgroupmember')) {
      for (const value of adGroups.slice(0, 4)) add(value)
    } else if (cmd.includes('adorganizationalunit')) {
      add('Marketing', 'Nome de uma nova área.')
    } else if (cmd.includes('localuser')) {
      add('estagiario', 'Uma nova conta local.')
    } else if (cmd.includes('localgroup')) {
      for (const value of localGroups.slice(0, 3)) add(value)
    } else if (cmd.includes('process')) {
      for (const value of processNames.slice(0, 5)) add(value)
    } else if (cmd.includes('service')) {
      for (const value of serviceNames.slice(0, 4)) add(value)
    } else if (cmd.includes('modul')) {
      for (const value of ['ImportExcel', 'Pester', 'PSWindowsUpdate', 'Az.Accounts']) add(value)
    } else if (cmd.includes('new-item')) {
      add('nova-pasta')
      add('notas.txt')
    } else if (cmd.includes('scheduledtask')) {
      for (const value of taskNames.slice(0, 3)) add(value)
    } else if (cmd.includes('smbshare')) {
      add('Financeiro')
      add('Publico')
    } else if (cmd.includes('random')) {
      add('*')
    } else {
      add(paramDef?.example ?? 'exemplo')
    }
    return hints
  }
  if (param === 'samaccountname') {
    add('marina.alves', 'Login sugerido para a nova pessoa.')
    add('lara.martins')
    return hints
  }
  if (param === 'userprincipalname') {
    add('marina.alves@lab.local')
    add('lara.martins@lab.local')
    return hints
  }
  if (param === 'givenname') {
    add('Marina')
    add('Lara')
    return hints
  }
  if (param === 'surname') {
    add('Alves')
    add('Martins')
    return hints
  }
  if (param === 'title') {
    add('Analista de Vendas')
    add('Analista Financeiro')
    add('Coordenador de TI')
    return hints
  }
  if (param === 'department') {
    add('Vendas')
    add('Financeiro')
    add('TI')
    return hints
  }
  if (param === 'emailaddress') {
    add('marina.alves@lab.local')
    return hints
  }
  if (param === 'identity') {
    if (cmd.includes('adgroupmember') || cmd.includes('adgroup') || cmd.includes('adgroupmember')) {
      for (const value of adGroups.slice(0, 4)) add(value)
    } else if (cmd.includes('ad')) {
      for (const value of adUsers.slice(0, 4)) add(value)
    } else if (cmd.includes('localgroup')) {
      for (const value of localGroups.slice(0, 3)) add(value)
    } else if (cmd.includes('localuser')) {
      for (const value of localUsers.slice(0, 3)) add(value)
    } else {
      for (const value of adUsers.slice(0, 3)) add(value)
    }
    return hints
  }
  if (param === 'members' || param === 'member') {
    if (cmd.includes('localgroup')) {
      for (const value of localUsers.filter((name) => !world.localGroups.find((group) => group.Name === 'Usuários')?.Members.includes(name)).slice(0, 3)) add(value)
      for (const value of localUsers.slice(0, 2)) add(value)
    } else {
      for (const value of adUsers.filter((sam) => !world.ad.groups.find((group) => group.Name === 'TI-Suporte')?.Members.includes(sam)).slice(0, 3)) add(value)
      for (const value of adUsers.slice(0, 2)) add(value)
    }
    return hints
  }
  if (param === 'group') {
    for (const value of localGroups.slice(0, 4)) add(value)
    return hints
  }
  if (param === 'remotepath') {
    for (const value of sharePaths) add(value, 'Compartilhamento SMB do laboratório.')
    return hints
  }
  if (param === 'localpath') {
    for (const value of availableDriveLetters(world)) add(value, 'Letra de unidade livre.')
    return hints
  }
  if (param === 'computername') {
    for (const value of ['SRV-DC01', 'SRV-FILE01']) add(value)
    return hints
  }
  if (param === 'taskname') {
    for (const value of taskNames.slice(0, 4)) add(value)
    add('"Backup Projetos"', 'Nome de uma nova tarefa.')
    return hints
  }
  if (param === 'taskpath') {
    add('\\PSLab\\', 'Pasta de tarefas do laboratório.')
    return hints
  }
  if (param === 'trigger') {
    for (const value of ['Daily', 'Weekly', 'Once']) add(value)
    return hints
  }
  if (param === 'action') {
    add('"powershell.exe -File C:\\Temp\\scripts\\backup.ps1"', 'Executar um script de backup.')
    return hints
  }
  if (param === 'user') {
    add('LAB\\miguel')
    add('LAB\\svc-backup')
    return hints
  }
  if (param === 'scriptblock') {
    add('{ Get-Date }', 'Executar Get-Date no computador remoto.')
    add('{ Get-Service }', 'Listar serviços do host remoto.')
    return hints
  }
  if (param === 'uri') {
    add('https://intranet.lab.local')
    add('https://api.lab.local/usuarios')
    return hints
  }
  if (param === 'pattern') {
    add('ERROR', 'Encontrar linhas de erro.')
    add('miguel', 'Encontrar menções ao usuário.')
    return hints
  }
  if (param === 'count' || param === 'first' || param === 'last' || param === 'head' || param === 'tail' || param === 'depth') {
    for (const value of ['2', '5', '10']) add(value)
    return hints
  }
  if (param === 'id') {
    for (const value of world.processes.slice(0, 3).map((process) => String(process.Id))) add(value, 'PID de um processo em execução.')
    return hints
  }
  if (param === 'name' && cmd.includes('variable')) {
    add('PSVersionTable')
    add('HOME')
    return hints
  }
  if (param === 'format') {
    add('"dd/MM/yyyy HH:mm"')
    add('"yyyy-MM-dd"')
    return hints
  }
  if (param === 'value') {
    if (cmd.includes('itemproperty')) add('light')
    else if (cmd.includes('set-content') || cmd.includes('add-content')) add('"Olá, PowerShell!"')
    else add('exemplo')
    return hints
  }
  if (param === 'startupType') {
    for (const value of ['Automatic', 'Manual', 'Disabled']) add(value)
    return hints
  }
  if (param === 'port') {
    for (const value of ['445', '443', '80', '3389', '5985']) add(value)
    return hints
  }
  if (param === 'localport') {
    for (const value of ['445', '443', '53']) add(value)
    return hints
  }
  if (param === 'type') {
    if (cmd.includes('resolve')) for (const value of ['A', 'AAAA', 'MX', 'CNAME']) add(value)
  }
  if (param === 'newname') {
    add('notas-pessoais.txt')
  }
  if (param === 'password' || param === 'accountpassword') {
    add('"SenhaForte123!"')
    return hints
  }
  if (param === 'enabled') {
    add('$true', 'Criar já habilitado.')
    add('$false', 'Criar desativado.')
    return hints
  }
  if (param === 'persistent') {
    add('$true', 'Manter o mapeamento após reiniciar.')
    add('$false')
    return hints
  }
  if (param === 'confirm' || param === 'whatif' || param === 'force' || param === 'recurse' || param === 'raw') {
    return hints
  }

  if (paramDef?.example) add(paramDef.example)
  if (!hints.length) {
    if (paramDef?.values?.length) for (const value of paramDef.values) add(value)
  }
  return hints.slice(0, 5)
}

function formatValueInsert(value) {
  const text = String(value)
  if (/^[{$"']/.test(text) || /^-[A-Za-z]/.test(text)) return text
  if (/\s/.test(text)) return `"${text.replace(/"/g, '`"')}"`
  return text
}

function paramSuggestions({ command, args, fragment, trailingSpace, requiredMissing, limit = 5 }) {
  if (!command) return []
  const used = new Set(Object.keys(args.named))
  args.flags.forEach((value) => used.add(value))
  const required = new Set(requiredMissing.map((name) => name.toLowerCase()))
  const partial = fragment.startsWith('-') ? fragment.slice(1).toLowerCase() : ''
  const params = [...(command.params ?? [])]
    .filter((param) => !used.has(param.name.toLowerCase()))
    .filter((param) => !partial || param.name.toLowerCase().startsWith(partial))
    .sort((a, b) => {
      const aRequired = required.has(a.name.toLowerCase()) ? 1 : 0
      const bRequired = required.has(b.name.toLowerCase()) ? 1 : 0
      if (aRequired !== bRequired) return bRequired - aRequired
      if (Boolean(a.switch) !== Boolean(b.switch)) return a.switch ? 1 : -1
      return 0
    })

  return params.slice(0, limit).map((param, index) => {
    const insert = `-${param.name} `
    const exact = fragment.toLowerCase() === `-${param.name.toLowerCase()}`
    const partialParam = fragment.startsWith('-') && !trailingSpace && !exact
    return {
      id: suggestionId('param', `${command.name}-${param.name}`, index),
      kind: 'param',
      label: `-${param.name}`,
      title: `-${param.name}`,
      description: param.desc ?? `Parâmetro de ${command.name}.`,
      insert,
      apply: partialParam ? 'replaceFragment' : 'appendTokens',
      category: command.cat,
      commandName: command.name,
      badge: required.has(param.name.toLowerCase()) ? 'obrigatório' : 'parâmetro',
      required: required.has(param.name.toLowerCase()),
      values: param.values ?? null,
      switch: Boolean(param.switch),
    }
  })
}

function valueSuggestions({ command, paramName, partial, trailingSpace, applyMode = 'replaceFragment', world, outputKind }) {
  if (!command || !paramName) return []
  const hints = valueHints(command.name, paramName, world, outputKind)
  const requiredMissing = REQUIRED_GROUPS[command.name]?.flat() ?? []
  const used = new Set()
  const items = []
  for (const hint of hints) {
    const formatted = formatValueInsert(hint.value)
    if (partial && !formatted.toLowerCase().startsWith(partial.toLowerCase())) continue
    used.add(formatted)
    items.push({
      id: suggestionId('value', `${command.name}-${paramName}-${formatted}`, items.length),
      kind: 'value',
      label: hint.value,
      title: hint.value,
      description: hint.description || `${partial ? 'Completar' : 'Valor sugerido para'} -${paramName}.`,
      insert: `${formatted} `,
      apply: applyMode === 'appendTokens' ? 'appendTokens' : !trailingSpace && partial ? 'replaceFragment' : 'appendTokens',
      category: command.cat,
      commandName: command.name,
      badge: 'valor',
      paramName,
      required: requiredMissing.some((name) => name.toLowerCase() === String(paramName).toLowerCase()),
    })
    if (items.length >= 5) break
  }
  if (!items.length) {
    const example = getParamDefinition(command, paramName)?.example
    if (example) {
      const formatted = formatValueInsert(example)
      items.push({
        id: suggestionId('value', `${command.name}-${paramName}-exemplo`),
        kind: 'value',
        label: example,
        title: example,
        description: `Exemplo de valor para -${paramName}.`,
        insert: `${formatted} `,
        apply: applyMode === 'appendTokens' ? 'appendTokens' : !trailingSpace && partial ? 'replaceFragment' : 'appendTokens',
        category: command.cat,
        commandName: command.name,
        badge: 'exemplo',
        paramName,
      })
    }
  }
  return items
}

function requiredMissingFor(command, tokens) {
  if (!command) return []
  const groups = REQUIRED_GROUPS[command.name] ?? []
  const used = new Set(tokens.filter((token) => token.type === 'param').map((token) => token.value.toLowerCase()))
  const missing = []
  for (const group of groups) {
    if (!group.some((name) => used.has(name.toLowerCase()))) {
      for (const name of group) missing.push(name)
    }
  }
  return missing
}

function usedParamSet(tokens) {
  return new Set(tokens.filter((token) => token.type === 'param').map((token) => token.value.toLowerCase()))
}

function tokenIsParam(command, token) {
  return token?.type === 'param' && Boolean(getParamDefinition(command, token.value))
}

function ghostFor(line, suggestions, analysis) {
  if (!analysis.fragment) return null
  const candidate = suggestions.find((suggestion) =>
    ['cmdlet', 'param', 'value'].includes(suggestion.kind) &&
    ['replaceFragment', 'replaceStage', 'replaceLine'].includes(suggestion.apply) &&
    suggestion.insert.toLowerCase().startsWith(analysis.fragment.toLowerCase()),
  )
  if (!candidate) return null
  if (candidate.kind === 'cmdlet' && analysis.hasCommand) return null
  const completion = applySuggestion(line, candidate, analysis)
  if (!completion.toLowerCase().startsWith(line.toLowerCase()) || completion.length <= line.length) return null
  return {
    suffix: completion.slice(line.length),
    line: completion,
    suggestionId: candidate.id,
  }
}

function emptySuggestions(world) {
  const starterCommands = ['Get-Process', 'Get-ChildItem', 'Get-ADUser', 'Get-Help']
    .map((name) => findCommand(name))
    .filter(Boolean)
  const suggestions = starterCommands.map((command) => {
    let insert = command.example
    if (command.name === 'Get-ADUser') insert = 'Get-ADUser -Filter *'
    if (command.name === 'Get-Process') insert = 'Get-Process'
    if (command.name === 'Get-ChildItem') insert = 'Get-ChildItem'
    if (command.name === 'Get-Help') insert = 'Get-Help Get-ChildItem -Examples'
    return {
      ...commandSuggestion(command, { kind: 'starter' }),
      id: suggestionId('starter', command.name),
      insert,
      apply: 'replaceLine',
      description: command.name === 'Get-ADUser' ? 'Veja todas as contas do domínio simulado.' : command.summary,
    }
  })

  const intents = INTENT_STARTERS
    .map((id) => CURATED_INTENTS.find((intent) => intent.id === id))
    .filter(Boolean)
    .map(intentSuggestion)

  return [...suggestions, ...intents]
}

export function analyzeLine(line, world, preview = null) {
  const raw = String(line ?? '')
  const trimmed = raw.trim()
  const base = {
    line: raw,
    trimmed,
    kind: 'empty',
    command: null,
    cmdlet: null,
    commandName: '',
    stageIndex: 0,
    stageText: '',
    tokens: [],
    fragment: '',
    trailingSpace: false,
    pipeOpen: false,
    hasCommand: false,
    suggestions: [],
    pipelineSuggestions: [],
    intents: [],
    ghost: null,
    requiredMissing: [],
    usedParams: new Set(),
    outputKind: 'objects',
    naturalQuery: '',
    intentConfidence: null,
    nextSteps: [],
    verification: [],
    previewEffects: [],
    mode: null,
    valueParam: null,
  }

  if (!trimmed) {
    return {
      ...base,
      suggestions: emptySuggestions(world),
      intents: [],
    }
  }

  const statements = splitStatements(raw)
  const lastStatement = statements[statements.length - 1] ?? raw
  const stages = splitPipeline(lastStatement)
  const stageIndex = Math.max(0, stages.length - 1)
  const stageText = stages[stageIndex] ?? ''
  const tokens = tokenizeStage(stageText)
  const trailingSpace = endsWithWhitespace(raw)
  const pipeOpen = stages.length > 1 && !stageText.trim()
  const fragment = trailingSpace ? '' : (stageText.match(/\S+$/) ?? [''])[0]
  const firstToken = tokens[0]
  const commandName = firstToken && firstToken.type !== 'param' ? String(firstToken.value) : ''
  let command = commandName ? findCommand(commandName) : null
  const stageEntries = stages.map((text) => {
    const first = tokenizeStage(text)[0]
    return first && first.type !== 'param' ? findCommand(first.value) : null
  })
  const outputKind = inferPipelineOutput(stageEntries)
  const previewEffects = preview?.effects ?? []
  const verification = buildVerification(preview)

  let analysis = {
    ...base,
    stageIndex,
    stageText,
    tokens,
    fragment,
    trailingSpace,
    pipeOpen,
    hasCommand: Boolean(command),
    command,
    cmdlet: command,
    commandName: command?.name ?? commandName,
    outputKind,
    requiredMissing: [],
    usedParams: usedParamSet(tokens),
    verification,
  }

  // Última etapa depois de um pipe, ainda sem comando.
  if (pipeOpen) {
    const nextStageSuggestions = pipelineSuggestions({
      stageEntries,
      line: raw,
      pipeOpen: true,
      outputKind,
      verify: [],
    })
    const previousCommand = [...stageEntries].reverse().find(Boolean) ?? null
    analysis = {
      ...analysis,
      kind: 'pipeline',
      command: previousCommand,
      cmdlet: previousCommand,
      commandName: previousCommand?.name ?? '',
      hasCommand: Boolean(previousCommand),
      suggestions: nextStageSuggestions.slice(0, 6),
      pipelineSuggestions: nextStageSuggestions,
      nextSteps: nextStageSuggestions,
    }
    return analysis
  }

  // Sem comando reconhecido: pode ser intenção em linguagem natural ou cmdlet incompleto.
  if (!command) {
    const naturalEligible = stageIndex === 0 && !/[a-zA-Z]+-[a-zA-Z]+/.test(trimmed) && (trimmed.includes(' ') || trimmed.length >= 8)
    const rankedIntents = naturalEligible ? rankIntents(trimmed) : []
    const foundCommands = searchCommands(trimmed, 6)
    const commandCards = foundCommands.map((candidate) => {
      const apply = stageIndex > 0 ? 'replaceStage' : 'replaceLine'
      return commandSuggestion(candidate, {
        apply,
        kind: rankedIntents.length ? 'cmdlet' : 'cmdlet',
        description: rankedIntents.length ? `Ou use diretamente ${candidate.name}.` : candidate.summary,
      })
    })

    if (rankedIntents.length) {
      const intentCards = rankedIntents.slice(0, 2).map(intentSuggestion)
      const filteredCommandCards = commandCards.filter((card) =>
        !rankedIntents.some((intent) => intent.cmdlet.toLowerCase() === card.commandName.toLowerCase()),
      )
      analysis = {
        ...analysis,
        kind: 'natural',
        commandName: '',
        naturalQuery: trimmed,
        intents: rankedIntents.map((intent) => ({ ...intent, confidence: intent.score >= 8 ? 'alta' : intent.score >= 5 ? 'boa' : 'possível' })),
        intentConfidence: rankedIntents[0].score >= 8 ? 'alta' : 'boa',
        suggestions: [...intentCards, ...filteredCommandCards].slice(0, 6),
      }
      analysis.ghost = null
      return analysis
    }

    if (commandCards.length) {
      const best = commandCards[0]
      const apply = stageIndex > 0 ? 'replaceStage' : 'replaceLine'
      analysis = {
        ...analysis,
        kind: 'cmdlet',
        suggestions: commandCards.map((card) => ({ ...card, apply })),
      }
      analysis.command = findCommand(foundCommands[0].name)
      analysis.cmdlet = analysis.command
      const onlySingleWord = !trimmed.includes(' ') && trimmed.length >= 2
      if (onlySingleWord && analysis.command) {
        const ghostSuggestion = { ...best, apply: 'replaceStage' }
        const ghostLine = applySuggestion(raw, ghostSuggestion, analysis).replace(/\s+$/, '')
        if (ghostLine.toLowerCase().startsWith(raw.toLowerCase()) && ghostLine.length > raw.length) {
          analysis.ghost = { suffix: ghostLine.slice(raw.length), line: ghostLine, suggestionId: best.id }
        }
      }
      return analysis
    }

    const fallback = ['Get-Help', 'Get-Command', 'Get-ChildItem']
      .map((name) => findCommand(name))
      .filter(Boolean)
      .map((candidate) => commandSuggestion(candidate, { kind: 'starter' }))
    analysis = {
      ...analysis,
      kind: 'unknown',
      suggestions: fallback,
    }
    return analysis
  }

  // Comando conhecido na etapa atual.
  const usedParams = usedParamSet(tokens)
  const requiredMissing = requiredMissingFor(command, tokens)
  const nonParamTokens = tokens.filter((token, index) => index > 0 && token.type !== 'param')
  const lastToken = tokens[tokens.length - 1]
  const previousToken = tokens[tokens.length - 2]
  let mode = 'complete'
  let valueParam = null
  let valuePartial = ''
  let valueApply = 'replaceFragment'

  if (lastToken?.type === 'param' && lastToken.inlineValue === null) {
    if (trailingSpace && takesValue(command, lastToken.value)) {
      mode = 'value'
      valueParam = lastToken.value
      valueApply = 'appendTokens'
    } else if (!trailingSpace) {
      const definition = getParamDefinition(command, lastToken.value)
      if (definition && takesValue(command, lastToken.value)) {
        mode = 'value'
        valueParam = lastToken.value
        valuePartial = ''
        valueApply = 'appendTokens'
      } else {
        mode = 'params'
      }
    } else if (!takesValue(command, lastToken.value)) {
      mode = 'params'
    }
  } else if (!trailingSpace && previousToken?.type === 'param' && takesValue(command, previousToken.value)) {
    const lastTokenIsClosedString = lastToken?.type === 'string' && lastToken.closed
    const lastTokenIsLiteral = ['number', 'variable', 'scriptblock', 'group', 'subexpr'].includes(lastToken?.type)
    if (previousToken.inlineValue === null && lastToken?.type !== 'param' && !lastTokenIsClosedString && !lastTokenIsLiteral) {
      mode = 'value'
      valueParam = previousToken.value
      valuePartial = lastToken?.type === 'string' ? lastToken.value : fragment
      valueApply = 'replaceFragment'
    }
  } else if (trailingSpace) {
    mode = 'params'
  } else if (lastToken?.type === 'param' && lastToken.inlineValue !== null) {
    mode = 'params'
  }

  if (tokens.length === 1 && nonParamTokens.length === 0 && !trailingSpace) {
    mode = 'complete'
  }

  let pipeline = []
  const canPipe = !requiredMissing.length
    && command.output !== 'none'
    && command.name !== 'Get-Help'
    && !(preview && preview.objects?.length === 0 && preview.meta?.typeName === 'HelpInfo')

  if (canPipe) {
    pipeline = pipelineSuggestions({
      stageEntries,
      line: raw,
      pipeOpen: false,
      outputKind,
      verify: verification,
    })
  } else if (verification.length) {
    pipeline = verification
  }

  let primary = []
  if (mode === 'value' && valueParam) {
    primary = valueSuggestions({
      command,
      paramName: valueParam,
      partial: valuePartial,
      trailingSpace,
      applyMode: valueApply,
      world,
      outputKind,
    })
    if (!primary.length) {
      primary = paramSuggestions({ command, args: { named: {}, flags: usedParams }, fragment, trailingSpace, requiredMissing })
    } else if (!trailingSpace && primary.length === 1 && valuePartial && primary[0].label.toLowerCase() === valuePartial.toLowerCase()) {
      primary = []
      mode = 'complete'
    }
  } else if (mode === 'params') {
    primary = paramSuggestions({ command, args: { named: {}, flags: usedParams }, fragment, trailingSpace, requiredMissing })
    if (!primary.length) {
      primary = paramSuggestions({ command, args: { named: {}, flags: new Set() }, fragment: '', trailingSpace: true, requiredMissing })
    }
  }

  if (mode === 'complete') {
    primary = [
      ...(verification ?? []),
      ...pipeline,
      ...paramSuggestions({ command, args: { named: {}, flags: usedParams }, fragment, trailingSpace, requiredMissing }).slice(0, 3),
    ]
  }

  if (requiredMissing.length) {
    const paramSuggestionsForMissing = paramSuggestions({
      command,
      args: { named: {}, flags: usedParams },
      fragment: fragment.startsWith('-') ? fragment : '',
      trailingSpace: false,
      requiredMissing,
    }).filter((suggestion) => suggestion.required)
    primary = [...paramSuggestionsForMissing]
  }

  const uniqueSuggestions = []
  const seen = new Set()
  for (const suggestion of primary) {
    const key = `${suggestion.kind}-${suggestion.insert}`
    if (seen.has(key)) continue
    seen.add(key)
    uniqueSuggestions.push(suggestion)
    if (uniqueSuggestions.length >= 6) break
  }

  const nextSteps = []
  const nextSeen = new Set()
  for (const item of [...verification, ...pipeline]) {
    const key = `${item.kind}-${item.insert}`
    if (nextSeen.has(key)) continue
    nextSeen.add(key)
    nextSteps.push(item)
  }
  analysis = {
    ...analysis,
    kind: mode === 'value' ? 'value' : mode === 'params' ? 'params' : 'command',
    command,
    cmdlet: command,
    commandName: command.name,
    suggestions: uniqueSuggestions,
    pipelineSuggestions: pipeline,
    requiredMissing,
    usedParams,
    nextSteps,
    verification,
    previewEffects,
    mode,
    valueParam,
  }
  analysis.ghost = ghostFor(raw, uniqueSuggestions, analysis)
  return analysis
}

export function applySuggestion(line, suggestion, analysis) {
  const raw = String(line ?? '')
  const insert = String(suggestion.insert ?? '')
  if (!insert) return raw

  if (suggestion.apply === 'replaceLine') {
    return insert
  }

  if (suggestion.apply === 'replaceStage') {
    const statements = splitStatements(raw)
    if (!statements.length) return insert
    const lastStatement = statements[statements.length - 1]
    const stages = splitPipeline(lastStatement)
    stages[stages.length - 1] = insert
    const rebuilt = stages.join(' | ')
    statements[statements.length - 1] = rebuilt
    return statements.join('; ')
  }

  if (suggestion.apply === 'replaceFragment') {
    const fragment = analysis.fragment ?? ''
    if (fragment && raw.endsWith(fragment)) return `${raw.slice(0, raw.length - fragment.length)}${insert}`
    const base = raw.replace(/\s+$/, '')
    return `${base} ${insert}`.replace(/\s{2,}$/, ' ')
  }

  if (suggestion.apply === 'appendTokens') {
    const base = raw.replace(/\s+$/, '')
    return `${base} ${insert}`.replace(/\s{2,}$/, ' ')
  }

  if (suggestion.apply === 'appendPipeline') {
    const base = raw.replace(/\s+$/, '')
    if (!base) return insert
    if (base.endsWith('|')) return `${base} ${insert}`.replace(/\s+$/, '')
    return `${base} | ${insert}`.replace(/\s+$/, '')
  }

  return raw
}

export function describeCategory(categoryId) {
  return categoryFor(categoryId)
}

export function buildVerificationSuggestions(preview) {
  return buildVerification(preview)
}

export function suggestionsForFailure(result, command = null) {
  const cards = []
  const seen = new Set()
  const push = (card) => {
    const key = `${card.kind}-${card.insert}`
    if (seen.has(key)) return
    seen.add(key)
    cards.push(card)
  }

  for (const error of result?.errors ?? []) {
    for (const suggestion of error.suggestions ?? []) {
      const suggestedCommand = findCommand(suggestion)
      push({
        id: suggestionId('cmdlet', suggestion),
        kind: 'cmdlet',
        label: suggestion,
        title: suggestion,
        description: suggestedCommand?.summary ?? 'Tente este comando para substituir o que falhou.',
        insert: suggestion,
        apply: 'replaceLine',
        category: suggestedCommand?.cat ?? 'inicio',
        commandName: suggestion,
        badge: 'corrigir',
      })
    }
    if (/não existe|nao existe|não foi possível encontrar|nao foi possivel encontrar/i.test(error.message ?? '')) {
      push({
        id: suggestionId('cmdlet', 'Get-ChildItem-C'),
        kind: 'cmdlet',
        label: 'Get-ChildItem C:\\',
        title: 'Conferir o caminho',
        description: 'Liste os itens e confirme o caminho antes de repetir o comando.',
        insert: 'Get-ChildItem C:\\',
        apply: 'replaceLine',
        category: 'arquivos',
        commandName: 'Get-ChildItem',
        badge: 'diagnosticar',
      })
    }
  }

  if (command?.name) {
    push({
      id: suggestionId('starter', `help-${command.name}`),
      kind: 'starter',
      label: `Get-Help ${command.name} -Examples`,
      title: 'Rever exemplos',
      description: `Abra exemplos de uso de ${command.name} e confira a sintaxe esperada.`,
      insert: `Get-Help ${command.name} -Examples`,
      apply: 'replaceLine',
      category: 'inicio',
      commandName: 'Get-Help',
      badge: 'ajuda',
    })
  }

  return cards.slice(0, 4)
}
