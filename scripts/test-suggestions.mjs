import { createInitialWorld } from '../src/data/seed.js'
import { previewLine } from '../src/engine/simulator.js'
import { analyzeLine, applySuggestion } from '../src/engine/suggestions.js'

const world = createInitialWorld()
const inputs = [
  '',
  'get add user',
  'adicionar usuário no AD',
  'mapear unidade de rede',
  'Get-Chi',
  'Get-Process',
  'Get-Process ',
  'Get-Process -Na',
  'Get-Process -Name chr',
  'Get-Process -Name chrome ',
  'Get-Process | ',
  'Get-Process | Where-Object { $_.CPU -gt 10 } | ',
  'Get-ADUser',
  'Get-ADUser -Filter ',
  'New-ADUser ',
  'New-SmbMapping ',
  'New-SmbMapping -RemotePath ',
  'Get-Service -Name ',
  'contas bloqueadas',
  'queros criar uma pasta de projetos',
  'Get-Help Get-Process',
  'criar usuario local',
  'New-Item -Path .\\Documentos\\teste -ItemType Directory',
]
for (const input of inputs) {
  const preview = previewLine(input, world)
  const analysis = analyzeLine(input, world, preview)
  console.log('\n$', JSON.stringify(input), '→', analysis.kind, '| cmd:', analysis.commandName || '-', '| fragment:', JSON.stringify(analysis.fragment), '| mode:', analysis.mode || '-', '| ghost:', analysis.ghost?.suffix ?? '-')
  if (analysis.intents.length) console.log('  intents:', analysis.intents.map((i) => `${i.cmdlet}(${i.score})`).join(', '))
  for (const s of analysis.suggestions.slice(0, 6)) console.log('  ', s.kind.padEnd(8), '|', s.label, '| apply:', s.apply, '| ->', JSON.stringify(applySuggestion(input, s, analysis)))
  if ((analysis.nextSteps?.length ?? 0)) console.log('  next:', analysis.nextSteps.map((s) => s.label).join(' ;; ').slice(0, 250))
}
