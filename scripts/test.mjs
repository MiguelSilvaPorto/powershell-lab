import { CATEGORIES, COMMANDS } from '../src/data/catalog.js'
import { CURATED_INTENTS } from '../src/data/intents.js'
import { LESSONS } from '../src/data/lessons.js'
import {
  SHORTCUT_PROVIDERS,
  extractPlaceholders,
  inferProvider,
  normalizeShortcut,
  renderShortcutCommand,
} from '../src/data/shortcuts.js'
import { WORLD_VERSION, createInitialWorld } from '../src/data/seed.js'
import { executeLine, implementedCommands } from '../src/engine/simulator.js'
import { analyzeLine, applySuggestion } from '../src/engine/suggestions.js'
import { detectErrorLanguage, stripAnsi, translatePowerShellError } from '../src/engine/errorTranslator.js'

let checks = 0
const failures = []

function assert(condition, message) {
  checks += 1
  if (!condition) failures.push(message)
}

function run(command, world) {
  return executeLine(command, world)
}

// Catálogo e handlers
const implemented = new Set(implementedCommands())
const missingHandlers = COMMANDS.filter((command) => !implemented.has(command.name))
assert(missingHandlers.length === 0, `Comandos sem handler: ${missingHandlers.map((command) => command.name).join(', ')}`)
assert(COMMANDS.length >= 120, 'O catálogo deveria ter pelo menos 120 comandos.')
assert(CATEGORIES.length === 17, 'O catálogo deveria cobrir 17 categorias.')
assert(WORLD_VERSION > 0, 'O mundo precisa ter uma versão.')

// O seed não pode compartilhar a mesma árvore mutável entre mundos.
const isolationWorld = createInitialWorld()
run('New-Item -Path .\\Documentos\\isolamento -ItemType Directory', isolationWorld)
const freshWorld = createInitialWorld()
assert(!run('Test-Path .\\Documentos\\isolamento', freshWorld).meta.text.includes('True'), 'Cada mundo deve começar com um filesystem independente.')

// Pipeline, filtro, ordenação e projeção.
{
  const world = createInitialWorld()
  const result = run('Get-Process | Where-Object { $_.CPU -gt 10 } | Sort-Object CPU -Descending | Select-Object -First 3', world)
  assert(result.ok, 'Pipeline de processos deveria executar sem erro.')
  assert(result.objects.length === 3, 'Select-Object -First 3 deveria retornar três objetos.')
  assert(result.stages.length === 4, 'O pipeline deveria registrar quatro etapas.')
  assert(result.objects[0].CPU >= result.objects[1].CPU, 'A ordenação por CPU deveria ser decrescente.')
}

// Active Directory: criação, consulta, grupo e conta.
{
  const world = createInitialWorld()
  const create = run('New-ADUser -Name "Rita Teste" -SamAccountName rita.teste -UserPrincipalName rita.teste@lab.local -Path "OU=TI,OU=Usuários,DC=lab,DC=local" -Enabled $true -Department TI', world)
  assert(create.ok, 'New-ADUser deveria criar a conta.')
  assert(create.effects.some((item) => item.type === 'ad:user:create'), 'New-ADUser deveria produzir efeito ad:user:create.')
  assert(world.ad.users.some((user) => user.SamAccountName === 'rita.teste'), 'A conta criada deveria existir no domínio.')
  const filter = run('Get-ADUser -Filter "Department -eq \'TI\' -and Enabled -eq $true"', world)
  assert(filter.ok && filter.objects.some((user) => user.SamAccountName === 'rita.teste'), 'O filtro AD deveria encontrar a conta criada.')
  const group = run('Add-ADGroupMember -Identity VPN-Users -Members rita.teste', world)
  assert(group.ok, 'Add-ADGroupMember deveria funcionar para uma conta existente.')
  assert(world.ad.groups.find((item) => item.Name === 'VPN-Users').Members.includes('rita.teste'), 'A conta deveria entrar no grupo VPN-Users.')
  const unlock = run('Unlock-ADAccount -Identity felipe.lima', world)
  assert(unlock.ok && unlock.effects.some((item) => item.type === 'ad:account'), 'Unlock-ADAccount deveria gerar efeito de conta.')
}

// Rede: mapeamento A → B e leitura da unidade.
{
  const world = createInitialWorld()
  const mapping = run('New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true', world)
  assert(mapping.ok, 'New-SmbMapping deveria criar o mapeamento.')
  assert(mapping.effects.some((item) => item.type === 'smb:map'), 'O mapeamento deveria gerar efeito smb:map.')
  assert(world.network.mappings.some((item) => item.LocalPath === 'Z:'), 'A unidade Z: deveria existir no mundo.')
  const listing = run('Get-ChildItem Z:\\', world)
  assert(listing.ok && listing.objects.length > 0, 'Z: deveria apontar para o conteúdo do compartilhamento.')
  const removal = run('Remove-SmbMapping -LocalPath Z:', world)
  assert(removal.ok && removal.effects.some((item) => item.type === 'smb:unmap'), 'Remove-SmbMapping deveria funcionar quando o mapeamento existe.')
}

// Filesystem: criação aninhada com -Force e conteúdo.
{
  const world = createInitialWorld()
  const create = run('New-Item -Path .\\Documentos\\a\\b -ItemType Directory -Force', world)
  assert(create.ok, 'New-Item -Force deveria criar caminhos intermediários.')
  const exists = run('Test-Path .\\Documentos\\a\\b', world)
  assert(exists.meta.text === 'True', 'O diretório criado com -Force deveria existir.')
  const file = run('Set-Content .\\Documentos\\a\\b\\nota.txt -Value "teste"', world)
  assert(file.ok, 'Set-Content deveria criar o arquivo dentro do caminho.')
  const content = run('Get-Content .\\Documentos\\a\\b\\nota.txt', world)
  assert(content.meta.view === 'text' && content.meta.text.includes('teste'), 'Get-Content deveria devolver o texto gravado.')
}

// Erros, silenciamento e variáveis automáticas.
{
  const world = createInitialWorld()
  const failing = run('Get-Item C:\\nao-existe.txt', world)
  assert(!failing.ok && failing.errors.length === 1, 'Um caminho inexistente deveria produzir erro.')
  const suppressed = run('Get-Item C:\\nao-existe.txt -ErrorAction SilentlyContinue', world)
  assert(suppressed.ok, '-ErrorAction SilentlyContinue deveria suprimir a exibição do erro.')
  assert(world.errors.length >= 1, 'O erro suprimido deveria continuar registrado em $Error.')
  const expression = run('$a = 7; $b = 3; $a * $b', world)
  assert(expression.meta.view === 'text' && expression.meta.text === '21', 'A expressão aritmética deveria retornar 21.')
  run('$processos = Get-Process', world)
  const count = run('$processos.Count', world)
  assert(count.meta.text === '18', '$processos.Count deveria contar os processos guardados.')
}

// Registro e efeitos.
{
  const world = createInitialWorld()
  const update = run('Set-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme -Value light', world)
  assert(update.ok && update.effects.some((item) => item.type === 'registry:set'), 'Set-ItemProperty deveria gerar efeito de registro.')
  const read = run('Get-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme', world)
  assert(read.meta.view === 'list' && read.objects[0].Theme === 'light', 'O valor do registro deveria ser atualizado.')
}

// Trilhas: IDs únicos, regex válidos, soluções executáveis e verificações.
{
  const lessonIds = new Set()
  const taskIds = new Set()
  let taskTotal = 0
  for (const lesson of LESSONS) {
    assert(!lessonIds.has(lesson.id), `ID de trilha duplicado: ${lesson.id}`)
    lessonIds.add(lesson.id)
    assert(lesson.concepts?.length >= 2, `${lesson.id} deveria ter pelo menos dois conceitos.`)
    assert(lesson.examples?.length >= 2, `${lesson.id} deveria ter pelo menos dois exemplos.`)
    assert(lesson.tasks?.length > 0, `${lesson.id} deveria ter tarefas.`)
    const world = createInitialWorld()
    for (const task of lesson.tasks) {
      taskTotal += 1
      assert(!taskIds.has(task.id), `ID de tarefa duplicado: ${task.id}`)
      taskIds.add(task.id)
      let regex
      try {
        regex = new RegExp(task.pattern, 'i')
      } catch (error) {
        assert(false, `Regex inválido em ${task.id}: ${error.message}`)
        continue
      }
      assert(regex.test(task.solution), `O pattern de ${task.id} não corresponde à solução.`)
      const result = run(task.solution, world)
      assert(result.ok || task.allowFailure, `A solução de ${task.id} falhou: ${result.errors.map((item) => item.message).join(' / ')}`)
      if (task.verify) assert(task.verify(world), `A verificação de estado falhou em ${task.id}.`)
    }
  }
  assert(LESSONS.length === 29, 'O laboratório deveria ter 29 trilhas.')
  assert(taskTotal === 111, 'O laboratório deveria ter 111 tarefas.')
}

// Todos os templates das intenções curadas precisam ser executáveis em um mundo limpo.
for (const intent of CURATED_INTENTS) {
  const world = createInitialWorld()
  const result = run(intent.template, world)
  assert(result.ok, `A intenção ${intent.id} falhou: ${result.errors.map((item) => item.message).join(' / ')}`)
}

// Sugestões e ghosts.
{
  const world = createInitialWorld()
  const empty = analyzeLine('', world)
  assert(empty.kind === 'empty' && empty.suggestions.length > 0, 'A linha vazia deveria mostrar sugestões iniciais.')
  const natural = analyzeLine('get add user', world, null)
  assert(natural.kind === 'natural', '"get add user" deveria ser reconhecido como intenção.')
  assert(natural.intents[0]?.cmdlet === 'New-ADUser', 'A principal intenção deveria apontar para New-ADUser.')
  const mapping = analyzeLine('mapear unidade de rede', world, null)
  assert(mapping.intents[0]?.cmdlet === 'New-SmbMapping', 'A intenção de mapeamento deveria apontar para New-SmbMapping.')
  const partial = analyzeLine('Get-Chi', world, null)
  assert(partial.ghost?.line === 'Get-ChildItem', 'O ghost de Get-Chi deveria completar Get-ChildItem.')
  const ghostApplied = applySuggestion('Get-Chi', partial.suggestions[0], partial)
  assert(ghostApplied === 'Get-ChildItem', 'Aceitar a sugestão deveria produzir Get-ChildItem.')
  const processLine = 'Get-Process'
  const processAnalysis = analyzeLine(processLine, world, run(processLine, createInitialWorld()))
  assert(processAnalysis.suggestions.some((item) => item.kind === 'pipeline'), 'Get-Process deveria oferecer próximas etapas.')
  const pipelineSuggestion = processAnalysis.suggestions.find((item) => item.kind === 'pipeline')
  assert(applySuggestion(processLine, pipelineSuggestion, processAnalysis).includes(' | '), 'A sugestão de pipeline deveria adicionar um pipe.')
  const param = analyzeLine('Get-Process -Na', world, null)
  assert(param.ghost?.suffix?.startsWith('me'), 'O ghost de -Na deveria completar -Name.')
}

// Atalhos: placeholders, sugestões, versões e comando final.
{
  const placeholders = extractPlaceholders('Unlock-ADAccount -Identity {{usuario}} -Verbose {{grupo}} {{usuario}}')
  assert(placeholders.length === 2 && placeholders[0] === 'usuario' && placeholders[1] === 'grupo', 'Placeholders deveriam ser únicos e preservar a ordem.')
  assert(inferProvider('usuario', 'Unlock-ADAccount -Identity {{usuario}}') === 'adUsers', 'Usuário de ADAccount deveria usar a lista de usuários do AD.')
  assert(inferProvider('processo', 'Stop-Process -Name {{processo}}') === 'processes', 'Processo deveria usar a lista de processos.')
  assert(inferProvider('servico', 'Restart-Service -Name {{servico}}') === 'services', 'Serviço deveria usar a lista de serviços.')
  const simple = renderShortcutCommand('Unlock-ADAccount -Identity {{usuario}}', { usuario: 'felipe.lima' })
  assert(simple === 'Unlock-ADAccount -Identity felipe.lima', 'O comando final deveria substituir o placeholder simples.')
  const quoted = renderShortcutCommand('Restart-Service -Name {{servico}}', { servico: 'Print Spooler' })
  assert(quoted.includes("'Print Spooler'"), 'Valores com espaço deveriam ser citados no comando final.')
  const preQuoted = renderShortcutCommand('Restart-Service -Name "{{servico}}"', { servico: 'Print Spooler' })
  assert(preQuoted === 'Restart-Service -Name "Print Spooler"', 'Placeholders já citados não deveriam receber novas aspas.')
  const escaped = renderShortcutCommand('Get-ADUser -Identity {{usuario}}', { usuario: "O'Brien" })
  assert(escaped === "Get-ADUser -Identity 'O''Brien'", 'Aspas simples deveriam ser escapadas no comando final.')
  const expression = renderShortcutCommand('Get-Process -Name {{processo}}', { processo: '$env:COMPUTERNAME' })
  assert(expression === 'Get-Process -Name $env:COMPUTERNAME', 'Expressões do PowerShell não deveriam receber aspas.')
  const leadingDash = renderShortcutCommand('Get-ADUser -Identity {{usuario}}', { usuario: '-Filter' })
  assert(leadingDash === "Get-ADUser -Identity '-Filter'", 'Valores que parecem parâmetros deveriam ser citados.')
  const caseInsensitive = renderShortcutCommand('Get-ADUser -Identity {{usuario}}; Get-ADUser -Identity {{Usuario}}', { usuario: 'ana.silva' })
  assert(caseInsensitive === 'Get-ADUser -Identity ana.silva; Get-ADUser -Identity ana.silva', 'O mesmo campo em maiúsculas e minúsculas deveria usar o mesmo valor.')
  const shortcut = normalizeShortcut({ name: 'Desbloquear', command: 'Unlock-ADAccount -Identity {{usuario}}' })
  assert(shortcut.parameters.length === 1 && shortcut.parameters[0].provider === 'adUsers', 'O atalho normalizado deveria inferir o provedor.')
  const simulatedUsers = SHORTCUT_PROVIDERS.adUsers.simulate(createInitialWorld())
  assert(simulatedUsers.includes('felipe.lima'), 'O provedor simulado deveria listar usuários do AD.')
  const simulatedProcesses = SHORTCUT_PROVIDERS.processes.simulate(createInitialWorld())
  assert(simulatedProcesses.includes('explorer') && simulatedProcesses.filter((name) => name === 'chrome').length === 1, 'O provedor simulado deveria listar processos únicos.')
  assert(SHORTCUT_PROVIDERS.processes.realQuery.includes('$IsWindows'), 'A consulta real de processos deveria preservar nomes com espaço no Windows.')
  const world = createInitialWorld()
  const executed = run(renderShortcutCommand(shortcut.command, { usuario: 'felipe.lima' }), world)
  assert(executed.ok && executed.effects.some((item) => item.type === 'ad:account'), 'Executar o atalho deveria desbloquear a conta no simulador.')
}

// Tradução de erros do PowerShell.
{
  const commandNotFound = translatePowerShellError(
    "The term 'Get-ADDomain' is not recognized as a name of a cmdlet, function, script file, or executable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.",
  )
  assert(commandNotFound?.translation.includes("'Get-ADDomain'"), 'A tradução deveria preservar o nome do comando.')
  assert(commandNotFound?.translation.includes('não é reconhecido'), 'O erro de comando não encontrado deveria ser traduzido.')
  assert(commandNotFound?.original.startsWith('The term'), 'A mensagem original deveria ser preservada.')

  const pathError = translatePowerShellError("Cannot find path 'C:\\Temp\\sumiu.txt' because it does not exist.")
  assert(pathError?.translation.includes("'C:\\Temp\\sumiu.txt'"), 'A tradução deveria preservar o caminho.')

  const accessError = translatePowerShellError("Access to the path 'C:\\Windows\\System32\\config' is denied.")
  assert(accessError?.translation.includes('acesso') && accessError.category === 'permission', 'O erro de permissão deveria ser traduzido e categorizado.')

  const parameterError = translatePowerShellError("A parameter cannot be found that matches parameter name 'Cor'.")
  assert(parameterError?.translation.includes("'Cor'"), 'O erro de parâmetro deveria preservar o nome recebido.')

  const ansiError = translatePowerShellError("\u001b[31mThe term 'Get-ADDomain' is not recognized as a name of a cmdlet, function, script file, or executable program.\u001b[0m")
  assert(ansiError?.translation && !ansiError.translation.includes('\u001b'), 'A tradução deveria remover os códigos ANSI.')
  assert(stripAnsi('\u001b[31mteste\u001b[0m') === 'teste', 'O stripAnsi deveria remover cores do terminal.')

  const portuguese = translatePowerShellError('Não foi possível encontrar o caminho informado.')
  assert(portuguese === null, 'Mensagens já em português não deveriam receber uma tradução duplicada.')
  assert(detectErrorLanguage('The term is not recognized.') === 'en', 'O detector deveria reconhecer inglês.')
  assert(detectErrorLanguage('O caminho não existe.') === 'pt', 'O detector deveria reconhecer português.')

  const unknown = translatePowerShellError('Something completely unexpected happened in the provider.')
  assert(unknown?.matched === false && unknown.translation === null, 'Mensagens em inglês sem regra deveriam ser marcadas como não traduzidas.')
}

if (failures.length) {
  console.error(`\n✖ ${failures.length} de ${checks} verificações falharam:\n`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`✔ ${checks} verificações passaram`)
console.log(`  ${COMMANDS.length} comandos simulados · ${CATEGORIES.length} categorias · ${LESSONS.length} trilhas · 111 tarefas`)
