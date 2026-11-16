import { createInitialWorld } from '../src/data/seed.js'
import { executeLine } from '../src/engine/simulator.js'
import { implementedCommands } from '../src/engine/simulator.js'
import { COMMANDS } from '../src/data/catalog.js'

const world = createInitialWorld()
const implemented = new Set(implementedCommands())
const missing = COMMANDS.filter((command) => !implemented.has(command.name))
console.log('Catálogo:', COMMANDS.length, '| Handlers:', implemented.size, '| Faltando:', missing.map((c) => c.name).join(', ') || 'nada')

const tests = [
  'Get-Process | Where-Object { $_.CPU -gt 10 } | Sort-Object CPU -Descending | Select-Object -First 3',
  'Get-ChildItem',
  'Get-ADUser -Filter *',
  'Get-ADUser -Filter "Department -eq \'Vendas\'"',
  'Get-ADGroupMember -Identity TI-Suporte',
  'Add-ADGroupMember -Identity TI-Suporte -Members felipe.lima',
  'Unlock-ADAccount -Identity felipe.lima',
  'New-ADUser -Name "Lara Martins" -SamAccountName lara.martins -UserPrincipalName lara.martins@lab.local -Path "OU=Vendas,OU=Usuários,DC=lab,DC=local" -Enabled $true -Department Vendas -Title "Analista de Vendas"',
  'Get-ADUser -Filter "Department -eq \'Vendas\'"',
  'Get-NetIPConfiguration',
  'New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true',
  'Get-PSDrive',
  'Get-Help Get-ChildItem',
  '$x = 10; $x * 2',
  '$nome = "Ana"; "Olá, $nome"',
  'Get-Content .\\notas-reuniao.txt',
  'Select-String -Pattern "ERROR" -Path C:\\Logs\\*.log',
  'New-Item -Path .\\teste -ItemType Directory',
  'Set-Content -Path .\\teste\\nota.txt -Value "Olá"',
  'Get-Content .\\teste\\nota.txt',
  'Get-Item C:\\nao-existe.txt -ErrorAction SilentlyContinue',
  'Get-Item C:\\nao-existe.txt',
  'Invoke-Command -ComputerName SRV-DC01 -ScriptBlock { Get-Date }',
  'Get-ADUser -Filter * | Select-Object Name, SamAccountName, Enabled',
  'Get-ChildItem Env:',
  'Get-Module',
  'Find-Module ImportExcel',
  'Install-Module ImportExcel -Scope CurrentUser',
  'Get-ScheduledTask',
  'Register-ScheduledTask -TaskName "Teste" -Action "powershell.exe -File teste.ps1" -Trigger Daily',
  'Get-LocalUser',
  'New-LocalUser -Name estagiario -FullName "Novo Estagiário"',
  'Get-LocalGroupMember -Group Usuários',
  'Get-ItemProperty -Path HKCU:\\Software\\PowerShellLab',
  'Set-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme -Value light',
  'Get-Process OIMetro',
]

for (const test of tests) {
  const result = executeLine(test, world, { preview: true })
  const stageSummary = result.stages.map((s) => `${s.cmdlet}${s.error ? '!' : `(${s.outputCount})`}`).join(' -> ')
  console.log('\n$', test)
  console.log('  ok:', result.ok, '|', stageSummary || result.meta.typeName)
  if (result.objects.length) console.log('  objects:', result.objects.length, JSON.stringify(result.objects[0]).slice(0, 220))
  if (result.errors.length) console.log('  error:', result.errors.map((e) => e.message + ' / ' + (e.hint || '')).join(' || '))
  if (result.notes.length) console.log('  note:', result.notes.join(' | '))
  if (result.effects.length) console.log('  effects:', result.effects.map((e) => e.type).join(', '))
  if (result.meta.view === 'text') console.log('  text:', String(result.meta.text).slice(0, 200).replace(/\n/g, ' / '))
}
