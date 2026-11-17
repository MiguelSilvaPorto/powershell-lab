export const WORLD_VERSION = 3

const modified = '16/11/2026 09:42'

let fileId = 0
let dirId = 0

function file(name, content = '', options = {}) {
  return {
    kind: 'file',
    id: `file-${++fileId}`,
    name,
    content,
    size: options.size ?? new TextEncoder().encode(content).length,
    modified: options.modified ?? modified,
    hidden: options.hidden ?? false,
  }
}

function dir(name, children = [], options = {}) {
  return {
    kind: 'dir',
    id: `dir-${++dirId}`,
    name,
    children,
    modified: options.modified ?? modified,
    hidden: options.hidden ?? false,
  }
}

function daysAgo(days) {
  const date = new Date('2026-11-16T12:00:00')
  date.setDate(date.getDate() - days)
  return date.toLocaleDateString('pt-BR')
}

const documentos = dir('Documentos', [
    file('notas-reuniao.txt', 'Reunião de segunda\n- Revisar inventário de TI\n- Validar backups do Financeiro\n- Publicar novo script de onboarding\n'),
    file('relatorio-vendas.csv', 'Mes,Vendedor,Valor\nSetembro,Diego Rocha,48200\nOutubro,Elisa Souza,51900\nNovembro,Diego Rocha,36750\n'),
    file('inventario.json', '{\n  "hostname": "WS-MIGUEL",\n  "os": "Windows 11 Pro",\n  "ramGB": 32\n}\n'),
    file('backlog.md', '# Backlog pessoal\n\n- [x] Aprender pipeline\n- [ ] Criar usuário no AD\n- [ ] Mapear unidade Z:\n- [ ] Automatizar backup\n'),
  ])

const projetos = dir('Projetos', [
    dir('lab-powershell', [
      file('README.md', '# Laboratório PowerShell\n\nPratique comandos sem medo.\n'),
      file('iniciar.ps1', 'Write-Host "Bem-vindo ao laboratório!"\nGet-Date\n'),
    ]),
    dir('site-pessoal', [
      file('index.html', '<!doctype html>\n<html><body><h1>Olá!</h1></body></html>\n'),
      file('estilo.css', 'body { font-family: sans-serif; }\n'),
    ]),
  ])

const sonhos = file('sonhos.txt', 'Aprender PowerShell de verdade.\nAutomatizar o trabalho repetitivo.\n')

const desktop = dir('Desktop', [
  file('atalhos.txt', 'VPN: vpn.lab.local\nArquivos: \\\\SRV-FILE01\\Financeiro\nWiki: intranet.lab.local\n'),
  file('ideias.txt', '1. Relatório de usuários inativos\n2. Backup automático das pastas\n3. Alerta de disco cheio\n'),
])

const downloads = dir('Downloads', [
  file('instalador.exe', '\u0000\u0000\u0000', { size: 48234496 }),
  file('planilha-clientes.csv', 'Nome,Email,Cidade\nAna Silva,ana@exemplo.com,São Paulo\nBruno Costa,bruno@exemplo.com,Curitiba\n'),
  file('foto-equipe.jpg', '\u0000', { size: 2411724 }),
])

const imagens = dir('Imagens', [
  file('logo-lab.png', '\u0000', { size: 184320 }),
])

const temp = dir('Temp', [
  file('logs-2026.log', '09:01 INFO  Inicialização concluída\n09:04 WARN  Disco C: com 78% de uso\n09:12 ERROR Falha ao conectar em SRV-FILE01\n'),
  dir('backup', [
    file('documentos.zip', '\u0000', { size: 7823360 }),
  ]),
  dir('scripts', [
    file('backup.ps1', 'Copy-Item C:\\Users\\miguel\\Documentos -Destination D:\\Backup -Recurse\n'),
    file('limpeza.ps1', 'Get-ChildItem C:\\Temp -Recurse -File | Remove-Item -Force\n'),
  ]),
])

const windows = dir('Windows', [
  dir('System32', [
    file('drivers', '', { size: 0 }),
  ], { hidden: true }),
  dir('Logs', [
    file('CBS.log', 'CBS started\nCBS session complete\n'),
  ]),
])

const shares = dir('Shares', [
  dir('Financeiro', [
    file('fechamento-outubro.xlsx', '\u0000', { size: 942080 }),
    file('contas-a-pagar.csv', 'Fornecedor,Vencimento,Valor\nContoso,25/11/2026,4800\nFabrikam,30/11/2026,12250\n'),
    file('leia-me.txt', 'Compartilhamento do setor Financeiro.\nAcesso: LAB\\Financeiro\n'),
  ]),
  dir('Publico', [
    file('aviso-feriado.txt', 'Em 20/11 não haverá expediente.\n'),
    file('logo-empresa.png', '\u0000', { size: 65536 }),
  ]),
])

const logDir = dir('Logs', [
  file('sistema.log', '2026-11-16 08:00:01 Boot concluído\n2026-11-16 08:00:08 Serviço Spooler iniciado\n2026-11-16 08:12:44 Login de LAB\\miguel\n'),
  file('seguranca.log', '2026-11-16 08:13:02 Logon bem-sucedido LAB\\miguel\n2026-11-16 09:02:11 Logon com falha LAB\\felipe.lima\n'),
])

const users = dir('Users', [
  dir('miguel', [documentos, projetos, desktop, downloads, imagens, sonhos], { modified: '16/11/2026 08:12' }),
  dir('Publico', [
    file('Documentos compartilhados.txt', 'Arquivos acessíveis para todos os usuários.\n'),
  ]),
])

const drives = {
  'C:': dir('C:', [users, temp, shares, logDir, windows]),
}

export function createInitialWorld() {
  return {
    version: WORLD_VERSION,
    hostname: 'WS-MIGUEL',
    os: 'Windows 11 Pro 24H2',
    psVersion: '7.4.6',
    domain: 'lab.local',
    cwd: 'C:\\Users\\miguel',
    filesystem: typeof structuredClone === 'function' ? structuredClone(drives) : JSON.parse(JSON.stringify(drives)),
    variables: {
      HOME: 'C:\\Users\\miguel',
      USERNAME: 'miguel',
      USERDOMAIN: 'LAB',
      COMPUTERNAME: 'WS-MIGUEL',
      PSVersionTable: { PSVersion: '7.4.6', PSEdition: 'Core', OS: 'Windows 11 Pro 24H2', Platform: 'Win32NT' },
    },
    errors: [],
    processes: [
      { Id: 4312, ProcessName: 'chrome', CPU: 42.7, WorkingSet: 812.4, Status: 'Running', StartTime: '16/11/2026 08:14', Responding: true, Path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe' },
      { Id: 4488, ProcessName: 'chrome', CPU: 18.2, WorkingSet: 436.8, Status: 'Running', StartTime: '16/11/2026 08:15', Responding: true, Path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe' },
      { Id: 4520, ProcessName: 'chrome', CPU: 6.4, WorkingSet: 198.1, Status: 'Running', StartTime: '16/11/2026 08:15', Responding: true, Path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe' },
      { Id: 9824, ProcessName: 'Code', CPU: 27.5, WorkingSet: 624.3, Status: 'Running', StartTime: '16/11/2026 08:22', Responding: true, Path: 'C:\\Users\\miguel\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe' },
      { Id: 11840, ProcessName: 'pwsh', CPU: 3.1, WorkingSet: 142.9, Status: 'Running', StartTime: '16/11/2026 09:40', Responding: true, Path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe' },
      { Id: 7360, ProcessName: 'explorer', CPU: 2.8, WorkingSet: 186.2, Status: 'Running', StartTime: '16/11/2026 08:12', Responding: true, Path: 'C:\\Windows\\explorer.exe' },
      { Id: 10452, ProcessName: 'msedge', CPU: 12.3, WorkingSet: 354.7, Status: 'Running', StartTime: '16/11/2026 08:30', Responding: true, Path: 'C:\\Program Files\\Microsoft\\Edge\\msedge.exe' },
      { Id: 11892, ProcessName: 'Teams', CPU: 9.7, WorkingSet: 428.1, Status: 'Running', StartTime: '16/11/2026 08:20', Responding: true, Path: 'C:\\Users\\miguel\\AppData\\Local\\Microsoft\\Teams\\Teams.exe' },
      { Id: 12004, ProcessName: 'Spotify', CPU: 4.2, WorkingSet: 276.5, Status: 'Running', StartTime: '16/11/2026 08:31', Responding: true, Path: 'C:\\Users\\miguel\\AppData\\Local\\Spotify\\Spotify.exe' },
      { Id: 12320, ProcessName: 'notepad', CPU: 0.4, WorkingSet: 28.7, Status: 'Running', StartTime: '16/11/2026 09:31', Responding: true, Path: 'C:\\Windows\\notepad.exe' },
      { Id: 9104, ProcessName: 'OneDrive', CPU: 1.6, WorkingSet: 98.4, Status: 'Running', StartTime: '16/11/2026 08:13', Responding: true, Path: 'C:\\Users\\miguel\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe' },
      { Id: 6420, ProcessName: 'Docker Desktop', CPU: 14.8, WorkingSet: 582.0, Status: 'Running', StartTime: '16/11/2026 08:25', Responding: true, Path: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe' },
      { Id: 780, ProcessName: 'svchost', CPU: 3.9, WorkingSet: 84.2, Status: 'Running', StartTime: '16/11/2026 08:00', Responding: true, Path: 'C:\\Windows\\System32\\svchost.exe' },
      { Id: 892, ProcessName: 'svchost', CPU: 1.1, WorkingSet: 36.6, Status: 'Running', StartTime: '16/11/2026 08:00', Responding: true, Path: 'C:\\Windows\\System32\\svchost.exe' },
      { Id: 1208, ProcessName: 'SearchIndexer', CPU: 2.2, WorkingSet: 92.8, Status: 'Running', StartTime: '16/11/2026 08:02', Responding: true, Path: 'C:\\Windows\\System32\\SearchIndexer.exe' },
      { Id: 5344, ProcessName: 'node', CPU: 7.3, WorkingSet: 214.6, Status: 'Running', StartTime: '16/11/2026 09:12', Responding: true, Path: 'C:\\Program Files\\nodejs\\node.exe' },
      { Id: 6116, ProcessName: 'EXCEL', CPU: 0.9, WorkingSet: 318.4, Status: 'Running', StartTime: '16/11/2026 09:03', Responding: true, Path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE' },
      { Id: 2284, ProcessName: 'Dropbox', CPU: 0.3, WorkingSet: 74.1, Status: 'Running', StartTime: '16/11/2026 08:16', Responding: true, Path: 'C:\\Program Files\\Dropbox\\Client\\Dropbox.exe' },
    ],
    services: [
      { Name: 'Spooler', DisplayName: 'Print Spooler', Status: 'Running', StartType: 'Automatic', CanStop: true },
      { Name: 'BITS', DisplayName: 'Background Intelligent Transfer Service', Status: 'Running', StartType: 'Manual', CanStop: true },
      { Name: 'Dhcp', DisplayName: 'DHCP Client', Status: 'Running', StartType: 'Automatic', CanStop: true },
      { Name: 'Dnscache', DisplayName: 'DNS Client', Status: 'Running', StartType: 'Automatic', CanStop: false },
      { Name: 'LanmanServer', DisplayName: 'Server', Status: 'Running', StartType: 'Automatic', CanStop: true },
      { Name: 'LanmanWorkstation', DisplayName: 'Workstation', Status: 'Running', StartType: 'Automatic', CanStop: true },
      { Name: 'WinDefend', DisplayName: 'Microsoft Defender Antivirus Service', Status: 'Running', StartType: 'Automatic', CanStop: false },
      { Name: 'WinRM', DisplayName: 'Windows Remote Management (WS-Management)', Status: 'Running', StartType: 'Automatic', CanStop: true },
      { Name: 'W32Time', DisplayName: 'Windows Time', Status: 'Running', StartType: 'Manual', CanStop: true },
      { Name: 'TermService', DisplayName: 'Remote Desktop Services', Status: 'Stopped', StartType: 'Manual', CanStop: true },
      { Name: 'wuauserv', DisplayName: 'Windows Update', Status: 'Stopped', StartType: 'Manual', CanStop: true },
      { Name: 'ADWS', DisplayName: 'Active Directory Web Services', Status: 'Running', StartType: 'Automatic', CanStop: false },
      { Name: 'NTDS', DisplayName: 'Active Directory Domain Services', Status: 'Running', StartType: 'Automatic', CanStop: false },
      { Name: 'EventLog', DisplayName: 'Windows Event Log', Status: 'Running', StartType: 'Automatic', CanStop: false },
      { Name: 'Audiosrv', DisplayName: 'Windows Audio', Status: 'Running', StartType: 'Automatic', CanStop: true },
    ],
    ad: {
      domain: {
        Name: 'lab.local',
        NetBIOSName: 'LAB',
        DistinguishedName: 'DC=lab,DC=local',
        DomainMode: 'Windows2016Domain',
        Forest: 'lab.local',
        PDCEmulator: 'SRV-DC01.lab.local',
      },
      ous: [
        { Name: 'Usuários', DistinguishedName: 'OU=Usuários,DC=lab,DC=local', Description: 'Base de todas as contas de usuário' },
        { Name: 'TI', DistinguishedName: 'OU=TI,OU=Usuários,DC=lab,DC=local', Description: 'Equipe de Tecnologia da Informação' },
        { Name: 'Financeiro', DistinguishedName: 'OU=Financeiro,OU=Usuários,DC=lab,DC=local', Description: 'Equipe financeira' },
        { Name: 'Vendas', DistinguishedName: 'OU=Vendas,OU=Usuários,DC=lab,DC=local', Description: 'Equipe comercial' },
        { Name: 'Serviços', DistinguishedName: 'OU=Serviços,OU=Usuários,DC=lab,DC=local', Description: 'Contas de serviço' },
        { Name: 'Computadores', DistinguishedName: 'OU=Computadores,DC=lab,DC=local', Description: 'Estações e servidores do domínio' },
        { Name: 'Grupos', DistinguishedName: 'OU=Grupos,DC=lab,DC=local', Description: 'Grupos de segurança do domínio' },
      ],
      users: [
        { Name: 'Administrador', SamAccountName: 'administrador', UserPrincipalName: 'administrador@lab.local', Enabled: true, LockedOut: false, GivenName: 'Administrador', Surname: '', Department: 'TI', Title: 'Administrador do domínio', EmailAddress: 'admin@lab.local', DistinguishedName: 'CN=Administrador,OU=Usuários,DC=lab,DC=local', OU: 'Usuários', Groups: ['Administradores do Domínio'], Created: daysAgo(920), LastLogon: '16/11/2026 08:00', Description: 'Conta administrativa padrão' },
        { Name: 'Ana Silva', SamAccountName: 'ana.silva', UserPrincipalName: 'ana.silva@lab.local', Enabled: true, LockedOut: false, GivenName: 'Ana', Surname: 'Silva', Department: 'TI', Title: 'Gerente de TI', EmailAddress: 'ana.silva@lab.local', DistinguishedName: 'CN=Ana Silva,OU=TI,OU=Usuários,DC=lab,DC=local', OU: 'TI', Groups: ['TI-Suporte', 'Administradores do Domínio', 'VPN-Users'], Created: daysAgo(780), LastLogon: '16/11/2026 08:47', Description: 'Gerente de TI' },
        { Name: 'Bruno Costa', SamAccountName: 'bruno.costa', UserPrincipalName: 'bruno.costa@lab.local', Enabled: true, LockedOut: false, GivenName: 'Bruno', Surname: 'Costa', Department: 'TI', Title: 'Analista de Suporte', EmailAddress: 'bruno.costa@lab.local', DistinguishedName: 'CN=Bruno Costa,OU=TI,OU=Usuários,DC=lab,DC=local', OU: 'TI', Groups: ['TI-Suporte'], Created: daysAgo(410), LastLogon: '16/11/2026 08:31', Description: 'Suporte de TI' },
        { Name: 'Carla Mendes', SamAccountName: 'carla.mendes', UserPrincipalName: 'carla.mendes@lab.local', Enabled: true, LockedOut: false, GivenName: 'Carla', Surname: 'Mendes', Department: 'Financeiro', Title: 'Analista Financeiro', EmailAddress: 'carla.mendes@lab.local', DistinguishedName: 'CN=Carla Mendes,OU=Financeiro,OU=Usuários,DC=lab,DC=local', OU: 'Financeiro', Groups: ['Financeiro', 'VPN-Users'], Created: daysAgo(355), LastLogon: '16/11/2026 09:02', Description: 'Contas a pagar' },
        { Name: 'Diego Rocha', SamAccountName: 'diego.rocha', UserPrincipalName: 'diego.rocha@lab.local', Enabled: true, LockedOut: false, GivenName: 'Diego', Surname: 'Rocha', Department: 'Vendas', Title: 'Executivo de Vendas', EmailAddress: 'diego.rocha@lab.local', DistinguishedName: 'CN=Diego Rocha,OU=Vendas,OU=Usuários,DC=lab,DC=local', OU: 'Vendas', Groups: ['Vendas', 'VPN-Users'], Created: daysAgo(290), LastLogon: '15/11/2026 17:42', Description: 'Vendas corporativas' },
        { Name: 'Elisa Souza', SamAccountName: 'elisa.souza', UserPrincipalName: 'elisa.souza@lab.local', Enabled: true, LockedOut: false, GivenName: 'Elisa', Surname: 'Souza', Department: 'Vendas', Title: 'Coordenadora de Vendas', EmailAddress: 'elisa.souza@lab.local', DistinguishedName: 'CN=Elisa Souza,OU=Vendas,OU=Usuários,DC=lab,DC=local', OU: 'Vendas', Groups: ['Vendas', 'VPN-Users'], Created: daysAgo(530), LastLogon: '16/11/2026 08:55', Description: 'Coordenação comercial' },
        { Name: 'Felipe Lima', SamAccountName: 'felipe.lima', UserPrincipalName: 'felipe.lima@lab.local', Enabled: true, LockedOut: true, GivenName: 'Felipe', Surname: 'Lima', Department: 'Financeiro', Title: 'Assistente Financeiro', EmailAddress: 'felipe.lima@lab.local', DistinguishedName: 'CN=Felipe Lima,OU=Financeiro,OU=Usuários,DC=lab,DC=local', OU: 'Financeiro', Groups: ['Financeiro'], Created: daysAgo(180), LastLogon: '16/11/2026 09:02', Description: 'Conta bloqueada após tentativas incorretas' },
        { Name: 'João Antigo', SamAccountName: 'joao.antigo', UserPrincipalName: 'joao.antigo@lab.local', Enabled: false, LockedOut: false, GivenName: 'João', Surname: 'Antigo', Department: 'Vendas', Title: 'Ex-colaborador', EmailAddress: 'joao.antigo@lab.local', DistinguishedName: 'CN=João Antigo,OU=Vendas,OU=Usuários,DC=lab,DC=local', OU: 'Vendas', Groups: [], Created: daysAgo(1200), LastLogon: '12/08/2026 14:20', Description: 'Conta desativada' },
        { Name: 'Serviço de Backup', SamAccountName: 'svc-backup', UserPrincipalName: 'svc-backup@lab.local', Enabled: true, LockedOut: false, GivenName: 'Serviço', Surname: 'Backup', Department: 'TI', Title: 'Conta de serviço', EmailAddress: 'backup@lab.local', DistinguishedName: 'CN=Serviço de Backup,OU=Serviços,OU=Usuários,DC=lab,DC=local', OU: 'Serviços', Groups: [], Created: daysAgo(640), LastLogon: '16/11/2026 03:00', Description: 'Executa o backup noturno' },
      ],
      groups: [
        { Name: 'TI-Suporte', SamAccountName: 'TI-Suporte', Category: 'Security', Scope: 'Global', DistinguishedName: 'CN=TI-Suporte,OU=Grupos,DC=lab,DC=local', Members: ['ana.silva', 'bruno.costa'], Description: 'Equipe de suporte técnico' },
        { Name: 'Financeiro', SamAccountName: 'Financeiro', Category: 'Security', Scope: 'Global', DistinguishedName: 'CN=Financeiro,OU=Grupos,DC=lab,DC=local', Members: ['carla.mendes', 'felipe.lima'], Description: 'Acesso às pastas do Financeiro' },
        { Name: 'Vendas', SamAccountName: 'Vendas', Category: 'Security', Scope: 'Global', DistinguishedName: 'CN=Vendas,OU=Grupos,DC=lab,DC=local', Members: ['diego.rocha', 'elisa.souza'], Description: 'Equipe comercial' },
        { Name: 'VPN-Users', SamAccountName: 'VPN-Users', Category: 'Security', Scope: 'Global', DistinguishedName: 'CN=VPN-Users,OU=Grupos,DC=lab,DC=local', Members: ['ana.silva', 'carla.mendes', 'diego.rocha', 'elisa.souza'], Description: 'Permite acesso remoto via VPN' },
        { Name: 'Administradores do Domínio', SamAccountName: 'Administradores do Domínio', Category: 'Security', Scope: 'Global', DistinguishedName: 'CN=Administradores do Domínio,CN=Users,DC=lab,DC=local', Members: ['administrador', 'ana.silva'], Description: 'Controle total do domínio' },
      ],
      computers: [
        { Name: 'SRV-DC01', DNSHostName: 'SRV-DC01.lab.local', OperatingSystem: 'Windows Server 2022 Standard', Enabled: true, DistinguishedName: 'CN=SRV-DC01,OU=Computadores,DC=lab,DC=local', OU: 'Computadores', LastLogon: '16/11/2026 09:40', Description: 'Controlador de domínio principal' },
        { Name: 'SRV-FILE01', DNSHostName: 'SRV-FILE01.lab.local', OperatingSystem: 'Windows Server 2022 Standard', Enabled: true, DistinguishedName: 'CN=SRV-FILE01,OU=Computadores,DC=lab,DC=local', OU: 'Computadores', LastLogon: '16/11/2026 09:38', Description: 'Servidor de arquivos' },
        { Name: 'WS-ANA', DNSHostName: 'WS-ANA.lab.local', OperatingSystem: 'Windows 11 Pro 24H2', Enabled: true, DistinguishedName: 'CN=WS-ANA,OU=Computadores,DC=lab,DC=local', OU: 'Computadores', LastLogon: '16/11/2026 08:47', Description: 'Notebook da Ana' },
        { Name: 'WS-BRUNO', DNSHostName: 'WS-BRUNO.lab.local', OperatingSystem: 'Windows 11 Pro 24H2', Enabled: true, DistinguishedName: 'CN=WS-BRUNO,OU=Computadores,DC=lab,DC=local', OU: 'Computadores', LastLogon: '16/11/2026 08:31', Description: 'Notebook do Bruno' },
        { Name: 'WS-CARLA', DNSHostName: 'WS-CARLA.lab.local', OperatingSystem: 'Windows 11 Pro 24H2', Enabled: true, DistinguishedName: 'CN=WS-CARLA,OU=Computadores,DC=lab,DC=local', OU: 'Computadores', LastLogon: '16/11/2026 09:02', Description: 'Notebook da Carla' },
      ],
    },
    localUsers: [
      { Name: 'miguel', Enabled: true, Description: 'Administrador da estação', Groups: ['Administradores'], LastLogon: '16/11/2026 08:12' },
      { Name: 'suporte', Enabled: true, Description: 'Técnico local', Groups: ['Usuários'], LastLogon: '15/11/2026 16:20' },
      { Name: 'backup-svc', Enabled: true, Description: 'Serviço de backup local', Groups: ['Usuários'], LastLogon: '16/11/2026 03:00' },
      { Name: 'visitante', Enabled: false, Description: 'Conta de convidado desativada', Groups: ['Convidados'], LastLogon: '01/09/2026 10:00' },
    ],
    localGroups: [
      { Name: 'Administradores', Description: 'Administradores da estação', Members: ['miguel'] },
      { Name: 'Usuários', Description: 'Usuários padrão', Members: ['suporte', 'backup-svc'] },
      { Name: 'Convidados', Description: 'Acesso limitado', Members: ['visitante'] },
    ],
    network: {
      adapters: [
        { Name: 'Ethernet', InterfaceDescription: 'Intel(R) Ethernet Controller I225-V', Status: 'Up', LinkSpeed: '1 Gbps', MacAddress: 'A4-BB-6D-1C-92-08', ifIndex: 7 },
        { Name: 'Wi-Fi', InterfaceDescription: 'Intel(R) Wi-Fi 6E AX211', Status: 'Disconnected', LinkSpeed: '0 bps', MacAddress: '38-5C-76-AA-B2-44', ifIndex: 14 },
      ],
      ipConfig: {
        InterfaceAlias: 'Ethernet',
        IPv4Address: '192.168.1.42',
        PrefixLength: 24,
        DefaultGateway: '192.168.1.1',
        DNSServers: ['1.1.1.1', '192.168.1.1'],
        IPv6Address: 'fe80::b52f:8a11:91c2:4d7a',
        MacAddress: 'A4-BB-6D-1C-92-08',
      },
      routes: [
        { DestinationPrefix: '0.0.0.0/0', NextHop: '192.168.1.1', InterfaceAlias: 'Ethernet', RouteMetric: 0 },
        { DestinationPrefix: '192.168.1.0/24', NextHop: '0.0.0.0', InterfaceAlias: 'Ethernet', RouteMetric: 256 },
        { DestinationPrefix: '10.0.0.0/24', NextHop: '192.168.1.1', InterfaceAlias: 'Ethernet', RouteMetric: 32 },
        { DestinationPrefix: '127.0.0.0/8', NextHop: '0.0.0.0', InterfaceAlias: 'Loopback Pseudo-Interface 1', RouteMetric: 331 },
      ],
      connections: [
        { LocalAddress: '192.168.1.42', LocalPort: 52418, RemoteAddress: '142.250.79.14', RemotePort: 443, State: 'Established', OwningProcess: 'chrome' },
        { LocalAddress: '192.168.1.42', LocalPort: 52482, RemoteAddress: '140.82.112.3', RemotePort: 443, State: 'Established', OwningProcess: 'Code' },
        { LocalAddress: '192.168.1.42', LocalPort: 52502, RemoteAddress: '52.97.146.18', RemotePort: 443, State: 'Established', OwningProcess: 'Teams' },
        { LocalAddress: '192.168.1.42', LocalPort: 52544, RemoteAddress: '10.0.0.20', RemotePort: 445, State: 'Established', OwningProcess: 'System' },
        { LocalAddress: '0.0.0.0', LocalPort: 135, RemoteAddress: '0.0.0.0', RemotePort: 0, State: 'Listen', OwningProcess: 'svchost' },
        { LocalAddress: '0.0.0.0', LocalPort: 445, RemoteAddress: '0.0.0.0', RemotePort: 0, State: 'Listen', OwningProcess: 'System' },
        { LocalAddress: '192.168.1.42', LocalPort: 52810, RemoteAddress: '1.1.1.1', RemotePort: 53, State: 'Established', OwningProcess: 'svchost' },
      ],
      shares: [
        { Name: 'Financeiro', Path: 'C:\\Shares\\Financeiro', Description: 'Fechamento, contas e relatórios', ScopeName: '*', CurrentUsers: 4 },
        { Name: 'Publico', Path: 'C:\\Shares\\Publico', Description: 'Arquivos de acesso comum', ScopeName: '*', CurrentUsers: 2 },
        { Name: 'Backups', Path: 'D:\\Backups', Description: 'Backups diários — acesso restrito', ScopeName: '*', CurrentUsers: 0 },
      ],
      mappings: [
        { LocalPath: 'X:', RemotePath: '\\\\SRV-FILE01\\Publico', Persistent: true, Status: 'OK', User: 'LAB\\miguel' },
      ],
      hosts: {
        'SRV-DC01': { address: '10.0.0.10', type: 'servidor', os: 'Windows Server 2022' },
        'SRV-FILE01': { address: '10.0.0.20', type: 'servidor', os: 'Windows Server 2022' },
        'intranet.lab.local': { address: '10.0.0.10', type: 'A', os: 'servidor web' },
        'vpn.lab.local': { address: '10.0.0.30', type: 'A', os: 'gateway VPN' },
        'google.com': { address: '142.250.79.14', type: 'A', os: 'internet' },
        'github.com': { address: '140.82.112.3', type: 'A', os: 'internet' },
        'microsoft.com': { address: '20.112.250.133', type: 'A', os: 'internet' },
      },
    },
    registry: {
      HKLM: {
        kind: 'key',
        children: {
          SOFTWARE: {
            kind: 'key',
            children: {
              'Microsoft': {
                kind: 'key',
                children: {
                  'Windows NT': {
                    kind: 'key',
                    children: {
                      CurrentVersion: {
                        kind: 'key',
                        values: {
                          ProductName: 'Windows 11 Pro',
                          CurrentBuild: '26100',
                          DisplayVersion: '24H2',
                          RegisteredOwner: 'LAB\\miguel',
                        },
                        children: {},
                      },
                    },
                    values: {},
                  },
                },
                values: {},
              },
              PowerShellLab: {
                kind: 'key',
                values: { Version: '1.0.0', InstallPath: 'C:\\Program Files\\PowerShellLab' },
                children: {},
              },
            },
            values: {},
          },
          SYSTEM: {
            kind: 'key',
            children: {
              CurrentControlSet: {
                kind: 'key',
                children: {
                  Services: {
                    kind: 'key',
                    children: {
                      Spooler: { kind: 'key', values: { Start: 2, DisplayName: 'Print Spooler' }, children: {} },
                      WinRM: { kind: 'key', values: { Start: 2, DisplayName: 'Windows Remote Management' }, children: {} },
                    },
                    values: {},
                  },
                },
                values: {},
              },
            },
            values: {},
          },
        },
        values: {},
      },
      HKCU: {
        kind: 'key',
        children: {
          Software: {
            kind: 'key',
            children: {
              PowerShellLab: {
                kind: 'key',
                values: { Theme: 'dark', AutoSave: 'true', User: 'miguel' },
                children: {},
              },
              Microsoft: {
                kind: 'key',
                children: {
                  'Windows': {
                    kind: 'key',
                    children: {
                      CurrentVersion: {
                        kind: 'key',
                        children: {
                          Explorer: { kind: 'key', values: { ShellState: '1c000000', ShowHidden: '0' }, children: {} },
                        },
                        values: {},
                      },
                    },
                    values: {},
                  },
                },
                values: {},
              },
            },
            values: {},
          },
        },
        values: {},
      },
    },
    modules: [
      { Name: 'ActiveDirectory', Version: '1.0.1.0', Imported: true, Description: 'Cmdlets para gerenciar o Active Directory' },
      { Name: 'PSReadLine', Version: '2.3.4', Imported: true, Description: 'Melhorias no console e histórico' },
      { Name: 'PowerShellGet', Version: '2.2.5', Imported: true, Description: 'Galeria do PowerShell' },
      { Name: 'Pester', Version: '5.6.1', Imported: false, Description: 'Framework de testes' },
      { Name: 'Microsoft.Graph.Authentication', Version: '2.21.0', Imported: false, Description: 'Autenticação no Microsoft 365' },
      { Name: 'ThreadJob', Version: '2.0.3', Imported: false, Description: 'Trabalhos em segundo plano' },
    ],
    gallery: [
      { Name: 'ImportExcel', Version: '7.8.6', Downloads: 135200000, Description: 'Lê e escreve planilhas Excel sem Office' },
      { Name: 'PSScriptAnalyzer', Version: '1.22.0', Downloads: 98600000, Description: 'Analisa boas práticas em scripts' },
      { Name: 'PSWindowsUpdate', Version: '2.2.1', Downloads: 42100000, Description: 'Gerencia atualizações do Windows' },
      { Name: 'Az.Accounts', Version: '3.0.3', Downloads: 267000000, Description: 'Autenticação no Azure' },
      { Name: 'dbatools', Version: '2.1.18', Downloads: 18600000, Description: 'Automação para SQL Server' },
      { Name: 'Microsoft.Graph.Users', Version: '2.21.0', Downloads: 15200000, Description: 'Gerencia usuários no Microsoft 365' },
    ],
    scheduledTasks: [
      { TaskName: 'Backup Financeiro', TaskPath: '\\PSLab\\', State: 'Ready', Schedule: 'Diário 23:00', Action: 'robocopy C:\\Shares\\Financeiro D:\\Backups\\Financeiro', RunAs: 'LAB\\svc-backup', LastRun: '15/11/2026 23:00', NextRun: '16/11/2026 23:00', Description: 'Copia os arquivos financeiros' },
      { TaskName: 'Limpeza de logs', TaskPath: '\\PSLab\\', State: 'Ready', Schedule: 'Semanal domingo 02:00', Action: 'Remove-Item C:\\Logs\\*.log', RunAs: 'LAB\\miguel', LastRun: '15/11/2026 02:00', NextRun: '22/11/2026 02:00', Description: 'Remove logs com mais de 30 dias' },
      { TaskName: 'Relatório semanal', TaskPath: '\\PSLab\\', State: 'Disabled', Schedule: 'Segunda 07:00', Action: 'Export-Csv C:\\Relatorios\\semana.csv', RunAs: 'LAB\\ana.silva', LastRun: '09/11/2026 07:00', NextRun: '—', Description: 'Gera relatório de vendas' },
      { TaskName: 'Sincronização de usuários', TaskPath: '\\PSLab\\', State: 'Running', Schedule: 'A cada 4 horas', Action: 'Sync-ADUsers', RunAs: 'LAB\\svc-backup', LastRun: '16/11/2026 08:00', NextRun: '16/11/2026 12:00', Description: 'Sincroniza contas com o RH' },
    ],
    sessions: [],
    executionPolicy: 'RemoteSigned',
    lastExecutionPolicyByScope: {},
  }
}
