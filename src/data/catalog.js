export const CATEGORIES = [
  { id: 'inicio', name: 'Primeiros passos', short: 'Início', icon: 'Sparkles', color: '#b9a7ff', blurb: 'O essencial para perder o medo do prompt.' },
  { id: 'arquivos', name: 'Arquivos & pastas', short: 'Arquivos', icon: 'FolderTree', color: '#ffc56b', blurb: 'Navegue, crie e organize qualquer coisa.' },
  { id: 'texto', name: 'Texto & conteúdo', short: 'Texto', icon: 'FileText', color: '#7fd7ff', blurb: 'Leia, pesquise e escreva dentro dos arquivos.' },
  { id: 'objetos', name: 'Objetos & pipeline', short: 'Pipeline', icon: 'Workflow', color: '#8aff80', blurb: 'O coração do PowerShell: dados em fluxo.' },
  { id: 'sistema', name: 'Sistema & hardware', short: 'Sistema', icon: 'Cpu', color: '#ffd479', blurb: 'Faça um raio-X da máquina.' },
  { id: 'processos', name: 'Processos & serviços', short: 'Processos', icon: 'Activity', color: '#ff8fa3', blurb: 'Veja e controle o que está rodando.' },
  { id: 'ad', name: 'Active Directory', short: 'Active Directory', icon: 'UsersRound', color: '#b8a1ff', blurb: 'Pessoas, grupos e computadores do domínio.' },
  { id: 'rede', name: 'Rede & compartilhamentos', short: 'Rede', icon: 'Network', color: '#68e0c4', blurb: 'IPs, DNS, conexões e unidades mapeadas.' },
  { id: 'registro', name: 'Registro do Windows', short: 'Registro', icon: 'KeyRound', color: '#f0a6ff', blurb: 'O banco de configurações do sistema.' },
  { id: 'modulos', name: 'Módulos & galeria', short: 'Módulos', icon: 'PackageOpen', color: '#93c5fd', blurb: 'Estenda o PowerShell com novos poderes.' },
  { id: 'automacao', name: 'Automação agendada', short: 'Automação', icon: 'CalendarClock', color: '#ffb37a', blurb: 'Deixe o computador trabalhando por você.' },
  { id: 'remoting', name: 'Remoting', short: 'Remoting', icon: 'RadioTower', color: '#7fd4ff', blurb: 'Execute comandos em outras máquinas.' },
  { id: 'seguranca', name: 'Segurança & contas', short: 'Segurança', icon: 'ShieldCheck', color: '#ffab91', blurb: 'Políticas, assinaturas e contas locais.' },
  { id: 'relatorios', name: 'Dados & relatórios', short: 'Relatórios', icon: 'FileSpreadsheet', color: '#9be37a', blurb: 'CSV, JSON e saídas que outros entendem.' },
  { id: 'erros', name: 'Erros & depuração', short: 'Erros', icon: 'Bug', color: '#ff8a8a', blurb: 'Falhe com segurança e investigue a causa.' },
  { id: 'variaveis', name: 'Variáveis & operadores', short: 'Variáveis', icon: 'Braces', color: '#c8b6ff', blurb: 'Guarde valores e faça contas.' },
  { id: 'ambiente', name: 'Ambiente & perfil', short: 'Ambiente', icon: 'TerminalSquare', color: '#8bd5ca', blurb: 'Sessão, histórico e variáveis de ambiente.' },
]

const C = (name, cat, summary, extra) => ({
  name,
  cat,
  summary,
  aliases: [],
  params: [],
  risk: 'leitura',
  output: 'objects',
  intents: [],
  example: name,
  ...extra,
})

export const COMMANDS = [
  // ── Primeiros passos ─────────────────────────────────────────────
  C('Get-Help', 'inicio', 'Abre a documentação de um comando, conceito ou módulo.', {
    aliases: ['help', 'man'],
    params: [
      { name: 'Name', desc: 'Comando ou tópico sobre o qual você quer ajuda.', positional: true, example: 'Get-ChildItem' },
      { name: 'Examples', desc: 'Mostra apenas exemplos de uso.', switch: true },
      { name: 'Detailed', desc: 'Inclui descrições completas dos parâmetros.', switch: true },
      { name: 'Full', desc: 'Documentação completa.', switch: true },
    ],
    example: 'Get-Help Get-ChildItem -Examples',
    examples: ['Get-Help Get-ADUser -Detailed', 'Get-Help about_Pipeline'],
    output: 'text',
    intents: ['ajuda', 'como usar', 'help', 'documentacao', 'exemplos de comando'],
  }),
  C('Get-Command', 'inicio', 'Descobre quais comandos existem e de onde eles vêm.', {
    aliases: ['gcm'],
    params: [
      { name: 'Name', desc: 'Filtro pelo nome do comando. Aceita curingas.', positional: true, example: 'Get-*' },
      { name: 'Noun', desc: 'Filtra pela parte depois do hífen (ex.: User).' },
      { name: 'Verb', desc: 'Filtra pela ação (ex.: Get, New, Set).' },
      { name: 'Module', desc: 'Mostra comandos de um módulo específico.' },
    ],
    example: 'Get-Command -Noun *User',
    examples: ['Get-Command Get-*', 'Get-Command -Verb New'],
    output: 'objects',
    intents: ['quais comandos existem', 'listar comandos', 'procurar comando', 'find command'],
  }),
  C('Get-Date', 'inicio', 'Retorna a data e a hora atuais.', {
    params: [
      { name: 'Format', desc: 'Formato de saída, como dd/MM/yyyy.' },
      { name: 'Date', desc: 'Data específica para formatar.' },
      { name: 'UFormat', desc: 'Formato no estilo Unix.' },
    ],
    example: 'Get-Date -Format "dd/MM/yyyy HH:mm"',
    output: 'text',
    intents: ['data e hora', 'que dia e hoje', 'date'],
  }),
  C('Get-Random', 'inicio', 'Sorteia números ou itens de uma coleção.', {
    params: [
      { name: 'Minimum', desc: 'Menor número possível.' },
      { name: 'Maximum', desc: 'Limite superior (não incluído).' },
      { name: 'Count', desc: 'Quantidade de resultados.' },
    ],
    example: 'Get-Random -Minimum 1 -Maximum 100',
    output: 'objects',
    intents: ['numero aleatorio', 'sortear', 'random'],
  }),
  C('Get-Member', 'inicio', 'Mostra o tipo e os membros (propriedades e métodos) dos objetos.', {
    aliases: ['gm'],
    params: [
      { name: 'Name', desc: 'Filtra membros pelo nome.', positional: true },
      { name: 'MemberType', desc: 'Filtra por propriedade, método, etc.' },
    ],
    example: 'Get-Process | Get-Member',
    examples: ['Get-Process | Get-Member -MemberType Property'],
    output: 'objects',
    intents: ['propriedades do objeto', 'que campos tem', 'tipos de objeto', 'members'],
  }),
  C('Write-Output', 'inicio', 'Envia objetos para o pipeline (ou para a saída).', {
    aliases: ['echo', 'write'],
    params: [{ name: 'InputObject', desc: 'Objeto ou texto a enviar.', positional: true }],
    example: 'Write-Output "Olá, PowerShell!"',
    output: 'objects',
    intents: ['mostrar texto', 'escrever na tela', 'output'],
  }),
  C('Write-Host', 'inicio', 'Escreve uma mensagem diretamente no console (não vai pelo pipeline).', {
    aliases: [],
    params: [
      { name: 'Object', desc: 'Mensagem a exibir.', positional: true },
      { name: 'ForegroundColor', desc: 'Cor do texto.' },
    ],
    example: 'Write-Host "Bem-vindo ao laboratório" -ForegroundColor Green',
    output: 'none',
    intents: ['mensagem na tela', 'imprimir colorido'],
  }),
  C('Clear-Host', 'inicio', 'Limpa a tela do console.', {
    aliases: ['cls', 'clear'],
    example: 'Clear-Host',
    output: 'none',
    intents: ['limpar tela', 'clear screen'],
  }),

  // ── Arquivos e pastas ───────────────────────────────────────────
  C('Get-Location', 'arquivos', 'Mostra o diretório atual da sessão.', {
    aliases: ['pwd', 'gl'],
    example: 'Get-Location',
    output: 'text',
    intents: ['onde estou', 'pasta atual', 'diretorio atual', 'current directory'],
  }),
  C('Set-Location', 'arquivos', 'Muda o diretório atual da sessão.', {
    aliases: ['cd', 'sl', 'chdir'],
    params: [
      { name: 'Path', desc: 'Destino: pasta, unidade ou .. para subir.', positional: true, example: '.\\Documentos' },
    ],
    example: 'Set-Location .\\Documentos',
    examples: ['Set-Location C:\\Temp', 'Set-Location ..'],
    output: 'none',
    intents: ['entrar na pasta', 'mudar de pasta', 'navegar', 'cd'],
  }),
  C('Get-ChildItem', 'arquivos', 'Lista arquivos e pastas de um local, como o ls.', {
    aliases: ['gci', 'ls', 'dir'],
    params: [
      { name: 'Path', desc: 'Caminho a listar. O padrão é a pasta atual.', positional: true, example: '.\\Documentos' },
      { name: 'Filter', desc: 'Filtro aplicado pelo provedor, ex.: *.txt.', example: '*.txt' },
      { name: 'Recurse', desc: 'Entra em todas as subpastas.', switch: true },
      { name: 'File', desc: 'Exibe apenas arquivos.', switch: true },
      { name: 'Directory', desc: 'Exibe apenas diretórios.', switch: true },
      { name: 'Force', desc: 'Inclui itens ocultos.', switch: true },
    ],
    example: 'Get-ChildItem -Path .\\Documentos',
    examples: ['Get-ChildItem -Filter *.txt', 'Get-ChildItem -Recurse -Directory', 'Get-ChildItem C:\\Temp -File'],
    output: 'files',
    intents: ['listar arquivos', 'ver pastas', 'o que tem na pasta', 'listar diretorio', 'ls', 'dir', 'ver arquivos'],
  }),
  C('New-Item', 'arquivos', 'Cria um arquivo, pasta, chave de registro ou outro item.', {
    aliases: ['ni'],
    params: [
      { name: 'Path', desc: 'Local onde o item será criado.', positional: true, example: '.\\Documentos\\nova-pasta' },
      { name: 'Name', desc: 'Nome do item quando o caminho indica a pasta.' },
      { name: 'ItemType', desc: 'Directory, File, SymbolicLink...', values: ['Directory', 'File'], example: 'Directory' },
      { name: 'Value', desc: 'Conteúdo inicial de um arquivo.' },
      { name: 'Force', desc: 'Sobrescreve regras e cria caminhos intermediários.', switch: true },
    ],
    example: 'New-Item -Path .\\Documentos\\estudos -ItemType Directory',
    examples: ['New-Item -Path .\\notas.txt -ItemType File -Value "Primeira linha"'],
    output: 'files',
    risk: 'altera',
    intents: ['criar pasta', 'criar arquivo', 'nova pasta', 'mkdir', 'touch', 'create directory'],
  }),
  C('Remove-Item', 'arquivos', 'Remove arquivos, pastas ou chaves.', {
    aliases: ['ri', 'rm', 'del', 'erase'],
    params: [
      { name: 'Path', desc: 'Item a remover.', positional: true, example: '.\\arquivo-antigo.txt' },
      { name: 'Recurse', desc: 'Remove subpastas e todo o conteúdo.', switch: true },
      { name: 'Force', desc: 'Remove itens ocultos ou somente leitura.', switch: true },
      { name: 'WhatIf', desc: 'Simula a remoção sem apagar nada.', switch: true },
    ],
    example: 'Remove-Item -Path .\\Downloads\\planilha-clientes.csv -WhatIf',
    output: 'none',
    risk: 'cuidado',
    intents: ['remover arquivo', 'apagar pasta', 'deletar', 'excluir arquivo', 'delete'],
  }),
  C('Copy-Item', 'arquivos', 'Copia arquivos ou pastas de um lugar para outro.', {
    aliases: ['cp', 'copy', 'cpi'],
    params: [
      { name: 'Path', desc: 'Origem da cópia.', positional: true, example: '.\\notas.txt' },
      { name: 'Destination', desc: 'Destino.', example: '.\\backup\\notas.txt' },
      { name: 'Recurse', desc: 'Copia pastas e todo o conteúdo.', switch: true },
      { name: 'Force', desc: 'Sobrescreve destinos existentes.', switch: true },
    ],
    example: 'Copy-Item .\\Documentos\\notas-reuniao.txt -Destination .\\Downloads\\notas-reuniao.txt',
    output: 'none',
    risk: 'altera',
    intents: ['copiar arquivo', 'copiar pasta', 'backup de arquivo', 'copy'],
  }),
  C('Move-Item', 'arquivos', 'Move ou renomeia arquivos e pastas.', {
    aliases: ['mv', 'move', 'mi'],
    params: [
      { name: 'Path', desc: 'Origem.', positional: true, example: '.\\notas.txt' },
      { name: 'Destination', desc: 'Novo caminho ou pasta de destino.', example: '.\\Documentos\\notas.txt' },
      { name: 'Force', desc: 'Sobrescreve o destino.', switch: true },
    ],
    example: 'Move-Item .\\Downloads\\planilha-clientes.csv -Destination .\\Documentos\\planilha-clientes.csv',
    output: 'none',
    risk: 'altera',
    intents: ['mover arquivo', 'mover pasta', 'move'],
  }),
  C('Rename-Item', 'arquivos', 'Renomeia um arquivo ou pasta sem movê-lo.', {
    aliases: ['ren', 'rni'],
    params: [
      { name: 'Path', desc: 'Item atual.', positional: true, example: '.\\notas.txt' },
      { name: 'NewName', desc: 'Novo nome, sem caminho.', example: 'notas-pessoais.txt' },
    ],
    example: 'Rename-Item .\\Downloads\\planilha-clientes.csv -NewName clientes.csv',
    output: 'none',
    risk: 'altera',
    intents: ['renomear arquivo', 'mudar nome', 'rename'],
  }),
  C('Test-Path', 'arquivos', 'Verifica se um caminho existe. Retorna True ou False.', {
    params: [
      { name: 'Path', desc: 'Caminho a testar.', positional: true, example: '.\\Documentos\\notas-reuniao.txt' },
      { name: 'PathType', desc: 'Leaf (arquivo), Container (pasta) ou Any.' },
    ],
    example: 'Test-Path .\\Documentos\\notas-reuniao.txt',
    output: 'objects',
    intents: ['verificar se existe', 'testar caminho', 'test path'],
  }),
  C('Resolve-Path', 'arquivos', 'Converte um caminho relativo em caminho absoluto.', {
    aliases: ['rvpa'],
    params: [{ name: 'Path', desc: 'Caminho relativo ou com curingas.', positional: true, example: '.\\Documentos' }],
    example: 'Resolve-Path .\\Documentos',
    output: 'text',
    intents: ['caminho absoluto', 'resolver caminho'],
  }),
  C('Get-Item', 'arquivos', 'Obtém um arquivo, pasta, chave de registro ou outro item pelo caminho.', {
    aliases: ['gi'],
    params: [
      { name: 'Path', desc: 'Caminho do item.', positional: true, example: '.\\Documentos\\notas-reuniao.txt' },
      { name: 'Force', desc: 'Inclui itens ocultos.', switch: true },
    ],
    example: 'Get-Item .\\Documentos\\notas-reuniao.txt',
    output: 'files',
    intents: ['ver item', 'informacoes do arquivo', 'get item', 'detalhes de arquivo'],
  }),
  C('Get-Content', 'arquivos', 'Lê o conteúdo de um arquivo linha por linha.', {
    aliases: ['gc', 'cat', 'type'],
    params: [
      { name: 'Path', desc: 'Arquivo a ler.', positional: true, example: '.\\notas-reuniao.txt' },
      { name: 'Raw', desc: 'Devolve o arquivo inteiro como uma única string.', switch: true },
      { name: 'Head', desc: 'Lê apenas as primeiras N linhas.' },
      { name: 'Tail', desc: 'Lê apenas as últimas N linhas.' },
    ],
    example: 'Get-Content .\\Documentos\\notas-reuniao.txt',
    examples: ['Get-Content C:\\Temp\\logs-2026.log -Tail 2', 'Get-Content .\\Documentos\\inventario.json -Raw'],
    output: 'text',
    intents: ['ler arquivo', 'abrir texto', 'conteudo do arquivo', 'cat'],
  }),
  C('Set-Content', 'arquivos', 'Grava texto em um arquivo, substituindo o conteúdo anterior.', {
    aliases: ['sc', 'set'],
    params: [
      { name: 'Path', desc: 'Arquivo de destino.', positional: true, example: '.\\novo.txt' },
      { name: 'Value', desc: 'Texto a gravar.', positional: true, example: '"Olá mundo"' },
    ],
    example: 'Set-Content .\\novo.txt -Value "Olá mundo"',
    output: 'none',
    risk: 'altera',
    intents: ['escrever arquivo', 'salvar texto', 'sobrescrever arquivo', 'write file'],
  }),
  C('Add-Content', 'arquivos', 'Adiciona texto ao final de um arquivo existente.', {
    aliases: ['ac'],
    params: [
      { name: 'Path', desc: 'Arquivo de destino.', positional: true, example: '.\\notas.txt' },
      { name: 'Value', desc: 'Texto que será adicionado.', positional: true },
    ],
    example: 'Add-Content .\\notas.txt -Value "Nova anotação"',
    output: 'none',
    risk: 'altera',
    intents: ['adicionar texto', 'acrescentar linha', 'append'],
  }),

  // ── Texto & conteúdo ───────────────────────────────────────────
  C('Select-String', 'texto', 'Procura texto ou padrões dentro de arquivos, como o grep.', {
    aliases: ['sls'],
    params: [
      { name: 'Pattern', desc: 'Texto ou expressão regular a procurar.', positional: true, example: 'ERROR' },
      { name: 'Path', desc: 'Arquivo(s) onde procurar.', example: '.\\logs\\*.log' },
      { name: 'CaseSensitive', desc: 'Diferencia maiúsculas de minúsculas.', switch: true },
      { name: 'Context', desc: 'Linhas de contexto antes e depois.' },
    ],
    example: 'Select-String -Pattern "ERROR" -Path C:\\Logs\\*.log',
    output: 'objects',
    intents: ['procurar texto', 'grep', 'encontrar no arquivo', 'buscar palavra'],
  }),
  C('Get-FileHash', 'texto', 'Calcula o hash de um arquivo para verificar integridade.', {
    params: [
      { name: 'Path', desc: 'Arquivo para calcular o hash.', positional: true, example: '.\\Downloads\\instalador.exe' },
      { name: 'Algorithm', desc: 'SHA256 (padrão), MD5, SHA1...', values: ['SHA256', 'SHA1', 'MD5'] },
    ],
    example: 'Get-FileHash .\\Downloads\\instalador.exe -Algorithm SHA256',
    output: 'objects',
    intents: ['hash do arquivo', 'integridade', 'verificar sha'],
  }),
  C('Out-File', 'texto', 'Envia a saída de um comando para um arquivo de texto.', {
    aliases: [],
    params: [
      { name: 'FilePath', desc: 'Arquivo de destino.', positional: true, example: '.\\processos.txt' },
      { name: 'Append', desc: 'Adiciona ao final em vez de sobrescrever.', switch: true },
    ],
    example: 'Get-Process | Out-File .\\processos.txt',
    output: 'none',
    risk: 'altera',
    intents: ['salvar saida em arquivo', 'redirecionar para arquivo', 'exportar texto'],
  }),

  // ── Objetos & pipeline ─────────────────────────────────────────
  C('Where-Object', 'objetos', 'Filtra objetos do pipeline usando uma condição.', {
    aliases: ['where', '?'],
    params: [
      { name: 'FilterScript', desc: 'Bloco de condição usando $_ para cada objeto.', positional: true, example: '{ $_.CPU -gt 10 }' },
      { name: 'Property', desc: 'Forma simplificada: nome da propriedade.' },
      { name: 'Value', desc: 'Valor comparado na forma simplificada.' },
    ],
    example: 'Get-Process | Where-Object { $_.CPU -gt 10 }',
    examples: ['Get-Service | Where-Object Status -eq "Running"', 'Get-ChildItem | Where-Object { $_.Length -gt 1MB }'],
    output: 'objects',
    intents: ['filtrar', 'somente onde', 'condicao', 'where'],
  }),
  C('Select-Object', 'objetos', 'Escolhe propriedades, posições ou os primeiros itens.', {
    aliases: ['select'],
    params: [
      { name: 'Property', desc: 'Propriedades que devem permanecer.', example: 'Name, CPU' },
      { name: 'First', desc: 'Mantém apenas os primeiros N objetos.' },
      { name: 'Last', desc: 'Mantém apenas os últimos N objetos.' },
      { name: 'Skip', desc: 'Pula os primeiros N objetos.' },
      { name: 'ExpandProperty', desc: 'Devolve apenas o valor da propriedade.' },
      { name: 'Unique', desc: 'Remove duplicados.', switch: true },
    ],
    example: 'Get-Process | Select-Object -Property ProcessName, CPU -First 5',
    output: 'objects',
    intents: ['selecionar colunas', 'primeiros resultados', 'top 5', 'escolher propriedades'],
  }),
  C('Sort-Object', 'objetos', 'Ordena objetos por uma ou mais propriedades.', {
    aliases: ['sort'],
    params: [
      { name: 'Property', desc: 'Propriedade usada para ordenar.', positional: true, example: 'CPU' },
      { name: 'Descending', desc: 'Do maior para o menor.', switch: true },
      { name: 'Unique', desc: 'Remove itens duplicados.', switch: true },
    ],
    example: 'Get-Process | Sort-Object CPU -Descending',
    output: 'objects',
    intents: ['ordenar', 'classificar', 'maior para menor', 'sort'],
  }),
  C('Measure-Object', 'objetos', 'Conta, soma ou calcula estatísticas de uma coleção.', {
    aliases: ['measure'],
    params: [
      { name: 'Property', desc: 'Propriedade numérica a medir.' },
      { name: 'Sum', desc: 'Calcula a soma.', switch: true },
      { name: 'Average', desc: 'Calcula a média.', switch: true },
      { name: 'Maximum', desc: 'Encontra o maior valor.', switch: true },
      { name: 'Minimum', desc: 'Encontra o menor valor.', switch: true },
    ],
    example: 'Get-Process | Measure-Object CPU -Sum -Average',
    examples: ['Get-ChildItem | Measure-Object'],
    output: 'objects',
    intents: ['contar', 'somar', 'media', 'estatisticas', 'quantos'],
  }),
  C('ForEach-Object', 'objetos', 'Executa um bloco para cada objeto do pipeline.', {
    aliases: ['foreach', '%'],
    params: [
      { name: 'Process', desc: 'Bloco executado para cada objeto ($_).', positional: true, example: '{ $_.ProcessName }' },
      { name: 'Begin', desc: 'Bloco executado uma vez antes.' },
      { name: 'End', desc: 'Bloco executado uma vez depois.' },
    ],
    example: 'Get-Process | ForEach-Object { $_.ProcessName }',
    output: 'objects',
    intents: ['para cada', 'iterar', 'loop', 'transformar cada item', 'foreach'],
  }),
  C('Group-Object', 'objetos', 'Agrupa objetos que têm o mesmo valor de propriedade.', {
    aliases: ['group'],
    params: [
      { name: 'Property', desc: 'Propriedade usada para agrupar.', positional: true, example: 'Department' },
      { name: 'NoElement', desc: 'Omite a lista de membros de cada grupo.', switch: true },
    ],
    example: 'Get-ADUser -Filter * | Group-Object Department',
    output: 'objects',
    intents: ['agrupar', 'quantos por categoria', 'group by'],
  }),
  C('Format-Table', 'objetos', 'Formata a saída como tabela, escolhendo colunas.', {
    aliases: ['ft'],
    params: [
      { name: 'Property', desc: 'Colunas e larguras desejadas.', example: 'Name, Status' },
      { name: 'AutoSize', desc: 'Ajusta automaticamente a largura.', switch: true },
      { name: 'Wrap', desc: 'Quebra conteúdo longo em várias linhas.', switch: true },
    ],
    example: 'Get-Service | Format-Table Name, Status -AutoSize',
    output: 'table',
    intents: ['formatar tabela', 'colunas', 'format table'],
  }),
  C('Format-List', 'objetos', 'Formata a saída como lista de propriedades.', {
    aliases: ['fl'],
    params: [{ name: 'Property', desc: 'Propriedades que devem aparecer.', example: '*' }],
    example: 'Get-ADUser -Identity ana.silva -Properties * | Format-List Name, Department, Title',
    output: 'list',
    intents: ['formatar lista', 'detalhes verticais', 'format list'],
  }),
  C('Out-String', 'objetos', 'Converte objetos formatados em uma única string.', {
    params: [{ name: 'Width', desc: 'Largura máxima da saída.' }],
    example: 'Get-Service | Out-String',
    output: 'text',
    intents: ['converter para texto', 'string da saida'],
  }),
  C('Get-Variable', 'variaveis', 'Lista variáveis existentes na sessão.', {
    aliases: ['gv'],
    params: [{ name: 'Name', desc: 'Nome da variável. Aceita curingas.', positional: true, example: 'PSVersionTable' }],
    example: 'Get-Variable',
    output: 'objects',
    intents: ['listar variaveis', 'ver valor de variavel'],
  }),
  C('Set-Variable', 'variaveis', 'Cria ou altera uma variável.', {
    aliases: ['sv', 'set'],
    params: [
      { name: 'Name', desc: 'Nome da variável, sem o $.', positional: true, example: 'ambiente' },
      { name: 'Value', desc: 'Valor armazenado.', positional: true },
    ],
    example: 'Set-Variable -Name ambiente -Value "produção"',
    output: 'none',
    intents: ['criar variavel', 'definir variavel'],
  }),

  // ── Processos e serviços ───────────────────────────────────────
  C('Get-Process', 'processos', 'Lista os processos em execução no computador.', {
    aliases: ['ps', 'gps'],
    params: [
      { name: 'Name', desc: 'Nome do processo, sem .exe. Aceita curingas.', positional: true, example: 'chrome' },
      { name: 'Id', desc: 'Filtra pelo PID.' },
      { name: 'IncludeUserName', desc: 'Inclui o usuário dono do processo.', switch: true },
    ],
    example: 'Get-Process -Name chrome',
    examples: ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 5'],
    output: 'processes',
    intents: ['listar processos', 'programas abertos', 'processos rodando', 'quem esta usando cpu', 'ps'],
  }),
  C('Stop-Process', 'processos', 'Encerra um processo pelo nome ou PID.', {
    aliases: ['kill', 'spps'],
    params: [
      { name: 'Name', desc: 'Nome do processo.', positional: true, example: 'notepad' },
      { name: 'Id', desc: 'PID do processo.' },
      { name: 'Force', desc: 'Força o encerramento.', switch: true },
      { name: 'WhatIf', desc: 'Mostra o que aconteceria.', switch: true },
    ],
    example: 'Stop-Process -Name notepad',
    output: 'none',
    risk: 'cuidado',
    intents: ['matar processo', 'encerrar programa', 'fechar processo', 'kill'],
  }),
  C('Start-Process', 'processos', 'Inicia um programa ou abre um arquivo.', {
    aliases: ['start', 'saps'],
    params: [
      { name: 'FilePath', desc: 'Programa ou arquivo a abrir.', positional: true, example: 'notepad.exe' },
      { name: 'ArgumentList', desc: 'Argumentos passados ao programa.' },
    ],
    example: 'Start-Process notepad.exe',
    output: 'none',
    risk: 'altera',
    intents: ['abrir programa', 'iniciar processo', 'start app'],
  }),
  C('Get-Service', 'processos', 'Lista serviços do Windows e seus estados.', {
    aliases: ['gsv'],
    params: [
      { name: 'Name', desc: 'Nome do serviço. Aceita curingas.', positional: true, example: 'Spooler' },
      { name: 'DisplayName', desc: 'Filtra pelo nome exibido.' },
      { name: 'DependentServices', desc: 'Mostra serviços dependentes.', switch: true },
    ],
    example: 'Get-Service -Name Spooler',
    examples: ['Get-Service | Where-Object Status -eq "Running"'],
    output: 'services',
    intents: ['listar servicos', 'servico rodando', 'status do servico', 'services'],
  }),
  C('Start-Service', 'processos', 'Inicia um serviço parado.', {
    aliases: ['sasv'],
    params: [{ name: 'Name', desc: 'Nome do serviço.', positional: true, example: 'Spooler' }],
    example: 'Start-Service -Name Spooler',
    output: 'none',
    risk: 'altera',
    intents: ['iniciar servico', 'ligar servico', 'start service'],
  }),
  C('Stop-Service', 'processos', 'Para um serviço em execução.', {
    aliases: ['spsv'],
    params: [
      { name: 'Name', desc: 'Nome do serviço.', positional: true, example: 'Spooler' },
      { name: 'Force', desc: 'Para mesmo com dependências.', switch: true },
    ],
    example: 'Stop-Service -Name Spooler',
    output: 'none',
    risk: 'cuidado',
    intents: ['parar servico', 'desligar servico', 'stop service'],
  }),
  C('Restart-Service', 'processos', 'Para e inicia um serviço novamente.', {
    aliases: ['rsv'],
    params: [{ name: 'Name', desc: 'Nome do serviço.', positional: true, example: 'Spooler' }],
    example: 'Restart-Service -Name Spooler',
    output: 'none',
    risk: 'altera',
    intents: ['reiniciar servico', 'restart service'],
  }),
  C('Set-Service', 'processos', 'Altera o tipo de inicialização de um serviço.', {
    aliases: [],
    params: [
      { name: 'Name', desc: 'Nome do serviço.', positional: true, example: 'Spooler' },
      { name: 'StartupType', desc: 'Automatic, Manual ou Disabled.', values: ['Automatic', 'Manual', 'Disabled'] },
    ],
    example: 'Set-Service -Name Spooler -StartupType Manual',
    output: 'none',
    risk: 'altera',
    intents: ['inicializacao automatica', 'configurar servico'],
  }),

  // ── Active Directory ──────────────────────────────────────────
  C('Get-ADDomain', 'ad', 'Mostra informações do domínio Active Directory.', {
    params: [{ name: 'Identity', desc: 'Domínio ou controlador.', positional: true }],
    example: 'Get-ADDomain',
    output: 'objects',
    intents: ['informacoes do dominio', 'qual dominio', 'active directory dominio', 'ad domain'],
  }),
  C('Get-ADUser', 'ad', 'Consulta usuários do Active Directory.', {
    aliases: ['gau'],
    params: [
      { name: 'Filter', desc: 'Filtro LDAP simplificado. Use * para todos.', positional: true, example: '"Name -like \'*Silva*\'"' },
      { name: 'Identity', desc: 'Identidade única: SamAccountName, UPN, DN ou nome.' },
      { name: 'Properties', desc: 'Propriedades extras a carregar.', example: 'Department, Title, LastLogonDate' },
      { name: 'SearchBase', desc: 'Limita a busca a uma OU.', example: 'OU=TI,OU=Usuários,DC=lab,DC=local' },
    ],
    example: 'Get-ADUser -Filter "Department -eq \'TI\'"',
    examples: ['Get-ADUser -Identity ana.silva -Properties *', 'Get-ADUser -Filter * -SearchBase "OU=Vendas,OU=Usuários,DC=lab,DC=local"'],
    output: 'adUsers',
    intents: ['usuarios do ad', 'listar usuarios do dominio', 'procurar usuario ad', 'quem existe no ad', 'contas de usuario', 'get ad user', 'get add user'],
  }),
  C('New-ADUser', 'ad', 'Cria uma nova conta de usuário no Active Directory.', {
    aliases: ['nau'],
    params: [
      { name: 'Name', desc: 'Nome de exibição da conta.', example: 'Lara Martins' },
      { name: 'SamAccountName', desc: 'Login usado no domínio.', example: 'lara.martins' },
      { name: 'UserPrincipalName', desc: 'Login no formato e-mail.', example: 'lara.martins@lab.local' },
      { name: 'Path', desc: 'OU onde a conta será criada.', example: 'OU=Vendas,OU=Usuários,DC=lab,DC=local' },
      { name: 'Enabled', desc: 'Cria a conta já habilitada (precisa de senha).', example: '$true' },
      { name: 'Department', desc: 'Departamento do usuário.' },
      { name: 'Title', desc: 'Cargo do usuário.' },
      { name: 'AccountPassword', desc: 'Senha inicial (SecureString).' },
    ],
    example: 'New-ADUser -Name "Lara Martins" -SamAccountName lara.martins -UserPrincipalName lara.martins@lab.local -Path "OU=Vendas,OU=Usuários,DC=lab,DC=local" -Enabled $true',
    output: 'none',
    risk: 'admin',
    intents: ['criar usuario no ad', 'adicionar usuario no dominio', 'novo usuario active directory', 'criar conta de rede', 'add user', 'new ad user', 'adicionar pessoa', 'get add user'],
  }),
  C('Set-ADUser', 'ad', 'Altera propriedades de um usuário do Active Directory.', {
    params: [
      { name: 'Identity', desc: 'Usuário alvo.', positional: true, example: 'lara.martins' },
      { name: 'Title', desc: 'Novo cargo.' },
      { name: 'Department', desc: 'Novo departamento.' },
      { name: 'EmailAddress', desc: 'Novo e-mail.' },
      { name: 'Manager', desc: 'Gestor da pessoa.' },
      { name: 'Description', desc: 'Observações da conta.' },
    ],
    example: 'Set-ADUser -Identity ana.silva -Title "Gerente de TI" -Department TI',
    output: 'none',
    risk: 'admin',
    intents: ['alterar usuario ad', 'mudar cargo', 'atualizar usuario dominio', 'set ad user'],
  }),
  C('Enable-ADAccount', 'ad', 'Habilita uma conta do Active Directory desativada.', {
    params: [{ name: 'Identity', desc: 'Conta a habilitar.', positional: true, example: 'joao.antigo' }],
    example: 'Enable-ADAccount -Identity joao.antigo',
    output: 'none',
    risk: 'admin',
    intents: ['ativar conta ad', 'habilitar usuario dominio'],
  }),
  C('Disable-ADAccount', 'ad', 'Desativa uma conta sem removê-la.', {
    params: [{ name: 'Identity', desc: 'Conta a desativar.', positional: true, example: 'joao.antigo' }],
    example: 'Disable-ADAccount -Identity joao.antigo',
    output: 'none',
    risk: 'cuidado',
    intents: ['desativar conta ad', 'bloquear usuario dominio'],
  }),
  C('Unlock-ADAccount', 'ad', 'Desbloqueia uma conta após tentativas de senha incorretas.', {
    params: [{ name: 'Identity', desc: 'Conta bloqueada.', positional: true, example: 'felipe.lima' }],
    example: 'Unlock-ADAccount -Identity felipe.lima',
    output: 'none',
    risk: 'admin',
    intents: ['desbloquear usuario', 'conta bloqueada ad', 'unlock ad'],
  }),
  C('Get-ADGroup', 'ad', 'Lista grupos do Active Directory.', {
    params: [
      { name: 'Filter', desc: 'Filtro por propriedades. Use * para todos.', positional: true },
      { name: 'Identity', desc: 'Nome do grupo.' },
      { name: 'Properties', desc: 'Propriedades extras.' },
    ],
    example: 'Get-ADGroup -Filter *',
    examples: ['Get-ADGroup -Identity TI-Suporte'],
    output: 'adGroups',
    intents: ['grupos do ad', 'listar grupos dominio', 'grupos de seguranca', 'ad groups'],
  }),
  C('Get-ADGroupMember', 'ad', 'Lista os membros de um grupo do AD.', {
    params: [
      { name: 'Identity', desc: 'Grupo consultado.', positional: true, example: 'TI-Suporte' },
      { name: 'Recursive', desc: 'Inclui grupos aninhados.', switch: true },
    ],
    example: 'Get-ADGroupMember -Identity TI-Suporte',
    output: 'adGroupMembers',
    intents: ['membros do grupo', 'quem esta no grupo', 'usuarios do grupo ad', 'group members'],
  }),
  C('Add-ADGroupMember', 'ad', 'Adiciona usuários ou computadores a um grupo do AD.', {
    aliases: ['aagm'],
    params: [
      { name: 'Identity', desc: 'Grupo que receberá os membros.', positional: true, example: 'TI-Suporte' },
      { name: 'Members', desc: 'Um ou mais logins separados por vírgula.', positional: true, example: 'lara.martins' },
    ],
    example: 'Add-ADGroupMember -Identity VPN-Users -Members bruno.costa',
    output: 'none',
    risk: 'admin',
    intents: ['adicionar membro ao grupo', 'colocar usuario no grupo ad', 'add ad group member'],
  }),
  C('Remove-ADGroupMember', 'ad', 'Remove um membro de um grupo do AD.', {
    params: [
      { name: 'Identity', desc: 'Grupo alvo.', positional: true },
      { name: 'Members', desc: 'Membros a remover.', positional: true },
      { name: 'Confirm', desc: 'Pede confirmação antes.', switch: true },
    ],
    example: 'Remove-ADGroupMember -Identity TI-Suporte -Members bruno.costa',
    output: 'none',
    risk: 'cuidado',
    intents: ['remover usuario do grupo', 'tirar do grupo ad'],
  }),
  C('Get-ADOrganizationalUnit', 'ad', 'Lista as unidades organizacionais (OUs) do domínio.', {
    params: [{ name: 'Filter', desc: 'Filtro de OUs. Use * para todas.', positional: true }],
    example: 'Get-ADOrganizationalUnit -Filter *',
    output: 'adOus',
    intents: ['ous do dominio', 'unidades organizacionais', 'estrutura do ad'],
  }),
  C('New-ADOrganizationalUnit', 'ad', 'Cria uma unidade organizacional no domínio.', {
    params: [
      { name: 'Name', desc: 'Nome da OU.', positional: true, example: 'Marketing' },
      { name: 'Path', desc: 'OU pai onde ela será criada.', example: 'OU=Usuários,DC=lab,DC=local' },
      { name: 'Description', desc: 'Descrição da OU.' },
    ],
    example: 'New-ADOrganizationalUnit -Name Marketing -Path "OU=Usuários,DC=lab,DC=local"',
    output: 'none',
    risk: 'admin',
    intents: ['criar ou', 'nova unidade organizacional', 'organizar ad'],
  }),
  C('Get-ADComputer', 'ad', 'Consulta computadores registrados no domínio.', {
    params: [
      { name: 'Filter', desc: 'Filtro por propriedades.', positional: true },
      { name: 'Identity', desc: 'Nome do computador.' },
      { name: 'Properties', desc: 'Propriedades extras.' },
    ],
    example: 'Get-ADComputer -Filter *',
    examples: ['Get-ADComputer -Filter "OperatingSystem -like \'*Server*\'"'],
    output: 'adComputers',
    intents: ['computadores do dominio', 'servidores ad', 'maquinas do ad', 'ad computers'],
  }),
  C('Search-ADAccount', 'ad', 'Encontra contas bloqueadas, desativadas ou com senha expirada.', {
    params: [
      { name: 'LockedOut', desc: 'Somente contas bloqueadas.', switch: true },
      { name: 'AccountDisabled', desc: 'Somente contas desativadas.', switch: true },
      { name: 'PasswordNeverExpires', desc: 'Contas com senha que nunca expira.', switch: true },
      { name: 'UsersOnly', desc: 'Limita a usuários.', switch: true },
    ],
    example: 'Search-ADAccount -LockedOut',
    examples: ['Search-ADAccount -AccountDisabled -UsersOnly'],
    output: 'adUsers',
    intents: ['contas bloqueadas', 'usuarios desativados', 'auditar contas ad', 'search ad account'],
  }),
  C('Get-ADPrincipalGroupMembership', 'ad', 'Lista todos os grupos dos quais um usuário participa.', {
    params: [{ name: 'Identity', desc: 'Usuário consultado.', positional: true, example: 'ana.silva' }],
    example: 'Get-ADPrincipalGroupMembership -Identity ana.silva',
    output: 'adGroups',
    intents: ['grupos do usuario', 'quais grupos a pessoa esta', 'membership ad'],
  }),

  // ── Rede ───────────────────────────────────────────────────────
  C('Get-NetIPConfiguration', 'rede', 'Resume a configuração de rede: IP, gateway e DNS.', {
    aliases: ['gip'],
    params: [{ name: 'InterfaceAlias', desc: 'Adaptador específico.', positional: true, example: 'Ethernet' }],
    example: 'Get-NetIPConfiguration',
    output: 'network',
    intents: ['ver ip', 'configuracao de rede', 'qual meu ip', 'gateway dns', 'meu ip', 'ipconfig'],
  }),
  C('Get-NetAdapter', 'rede', 'Lista os adaptadores de rede e seus estados.', {
    aliases: ['get-netadapter', 'gba'],
    params: [
      { name: 'Name', desc: 'Nome do adaptador.', positional: true, example: 'Ethernet' },
      { name: 'Physical', desc: 'Somente adaptadores físicos.', switch: true },
    ],
    example: 'Get-NetAdapter',
    output: 'network',
    intents: ['adaptadores de rede', 'placas de rede', 'status do cabo', 'ethernet wifi'],
  }),
  C('Get-NetIPAddress', 'rede', 'Mostra os endereços IP de todas as interfaces.', {
    aliases: ['gipa'],
    params: [
      { name: 'InterfaceAlias', desc: 'Filtra pelo adaptador.' },
      { name: 'AddressFamily', desc: 'IPv4 ou IPv6.', values: ['IPv4', 'IPv6'] },
    ],
    example: 'Get-NetIPAddress -AddressFamily IPv4',
    output: 'network',
    intents: ['enderecos ip', 'listar ips', 'ip da maquina'],
  }),
  C('Get-NetRoute', 'rede', 'Mostra a tabela de rotas do computador.', {
    aliases: ['gr'],
    params: [{ name: 'InterfaceAlias', desc: 'Filtra pelo adaptador.' }],
    example: 'Get-NetRoute -InterfaceAlias Ethernet',
    output: 'network',
    intents: ['tabela de rotas', 'rota padrao', 'gateway', 'rotas'],
  }),
  C('Get-DnsClientServerAddress', 'rede', 'Mostra os servidores DNS configurados.', {
    params: [{ name: 'InterfaceAlias', desc: 'Filtra pelo adaptador.' }],
    example: 'Get-DnsClientServerAddress -InterfaceAlias Ethernet',
    output: 'network',
    intents: ['servidores dns', 'dns configurado', 'qual dns'],
  }),
  C('Resolve-DnsName', 'rede', 'Resolve um nome para endereço IP, como o nslookup.', {
    aliases: ['rdns'],
    params: [
      { name: 'Name', desc: 'Nome ou IP a resolver.', positional: true, example: 'intranet.lab.local' },
      { name: 'Type', desc: 'Tipo de registro: A, AAAA, MX, CNAME...', values: ['A', 'AAAA', 'MX', 'CNAME'] },
    ],
    example: 'Resolve-DnsName intranet.lab.local',
    output: 'network',
    intents: ['resolver dns', 'nslookup', 'qual ip do site', 'nome para ip'],
  }),
  C('Test-Connection', 'rede', 'Faz ping em um ou mais computadores.', {
    aliases: ['ping', 'tcn'],
    params: [
      { name: 'ComputerName', desc: 'Destino do teste.', positional: true, example: 'SRV-DC01' },
      { name: 'Count', desc: 'Quantidade de tentativas.' },
      { name: 'Quiet', desc: 'Retorna apenas True/False.', switch: true },
    ],
    example: 'Test-Connection SRV-DC01 -Count 2',
    output: 'network',
    intents: ['ping', 'testar conexao', 'servidor responde', 'latencia', 'rede funciona'],
  }),
  C('Test-NetConnection', 'rede', 'Testa conectividade e portas TCP de um destino.', {
    aliases: ['tnc'],
    params: [
      { name: 'ComputerName', desc: 'Destino.', positional: true, example: 'SRV-FILE01' },
      { name: 'Port', desc: 'Porta TCP a testar.' },
      { name: 'InformationLevel', desc: 'Detalhamento do resultado.' },
    ],
    example: 'Test-NetConnection SRV-FILE01 -Port 445',
    output: 'network',
    intents: ['testar porta', 'porta aberta', 'conectar servidor', 'smb porta 445'],
  }),
  C('Get-NetTCPConnection', 'rede', 'Lista conexões TCP ativas e portas em escuta.', {
    aliases: ['gtc'],
    params: [
      { name: 'State', desc: 'Filtra por estado, como Established ou Listen.', values: ['Established', 'Listen', 'TimeWait'] },
      { name: 'LocalPort', desc: 'Filtra pela porta local.' },
      { name: 'OwningProcess', desc: 'PID do processo dono da conexão.' },
    ],
    example: 'Get-NetTCPConnection -State Established',
    output: 'networkConnections',
    intents: ['conexoes abertas', 'portas em escuta', 'quem esta conectado', 'netstat'],
  }),
  C('Get-SmbShare', 'rede', 'Lista os compartilhamentos SMB do computador ou servidor.', {
    aliases: ['gsh'],
    params: [{ name: 'Name', desc: 'Nome do compartilhamento.', positional: true, example: 'Financeiro' }],
    example: 'Get-SmbShare',
    output: 'shares',
    intents: ['compartilhamentos', 'pastas compartilhadas', 'smb shares', 'ver compartilhamento de rede'],
  }),
  C('Get-SmbMapping', 'rede', 'Lista as unidades de rede mapeadas.', {
    aliases: ['gsm'],
    params: [{ name: 'LocalPath', desc: 'Letra da unidade mapeada.', positional: true, example: 'X:' }],
    example: 'Get-SmbMapping',
    output: 'smbMappings',
    intents: ['unidades mapeadas', 'mapeamentos de rede', 'drives de rede', 'mapeamento de rede', 'unidade z'],
  }),
  C('New-SmbMapping', 'rede', 'Mapeia um compartilhamento de rede em uma letra de unidade.', {
    aliases: ['nsm'],
    params: [
      { name: 'RemotePath', desc: 'Caminho UNC do compartilhamento.', example: '\\\\SRV-FILE01\\Financeiro' },
      { name: 'LocalPath', desc: 'Letra da unidade, como Z:.', example: 'Z:' },
      { name: 'Persistent', desc: 'Mantém o mapeamento após reiniciar.', example: '$true' },
    ],
    example: 'New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true',
    output: 'smbMappings',
    risk: 'altera',
    intents: ['mapear rede', 'mapear unidade', 'conectar compartilhamento', 'criar drive de rede', 'montar pasta de rede', 'net use'],
  }),
  C('Remove-SmbMapping', 'rede', 'Desconecta uma unidade de rede mapeada.', {
    aliases: ['rsm'],
    params: [
      { name: 'LocalPath', desc: 'Letra da unidade a remover.', positional: true, example: 'Z:' },
      { name: 'Force', desc: 'Força a remoção.', switch: true },
    ],
    example: 'Remove-SmbMapping -LocalPath X: -Force',
    output: 'none',
    risk: 'cuidado',
    intents: ['desmapear rede', 'remover unidade de rede', 'desconectar compartilhamento'],
  }),
  C('Get-PSDrive', 'rede', 'Lista as unidades e unidades virtuais disponíveis no PowerShell.', {
    aliases: ['gdr'],
    params: [{ name: 'PSProvider', desc: 'Filtra por provedor: FileSystem, Registry...' }],
    example: 'Get-PSDrive',
    output: 'objects',
    intents: ['unidades disponiveis', 'drives', 'letras de unidade', 'mapeamentos'],
  }),
  C('Invoke-WebRequest', 'rede', 'Faz uma requisição HTTP e retorna status, links e conteúdo.', {
    aliases: ['iwr', 'curl', 'wget'],
    params: [
      { name: 'Uri', desc: 'Endereço completo.', positional: true, example: 'https://intranet.lab.local' },
      { name: 'Method', desc: 'GET, POST, PUT...', values: ['GET', 'POST', 'PUT', 'DELETE'] },
    ],
    example: 'Invoke-WebRequest -Uri https://intranet.lab.local',
    output: 'objects',
    intents: ['requisicao http', 'baixar pagina', 'web request', 'testar site'],
  }),
  C('Invoke-RestMethod', 'rede', 'Consome uma API REST e já converte o JSON em objetos.', {
    aliases: ['irm'],
    params: [
      { name: 'Uri', desc: 'Endpoint da API.', positional: true, example: 'https://api.lab.local/usuarios' },
      { name: 'Method', desc: 'GET, POST, PUT...', values: ['GET', 'POST'] },
    ],
    example: 'Invoke-RestMethod -Uri https://api.lab.local/usuarios',
    output: 'objects',
    intents: ['chamar api', 'consumir json', 'rest', 'api request'],
  }),

  // ── Sistema ───────────────────────────────────────────────────
  C('Get-ComputerInfo', 'sistema', 'Reúne informações detalhadas do sistema operacional.', {
    params: [{ name: 'Property', desc: 'Propriedades específicas.', example: 'WindowsProductName, CsTotalPhysicalMemory' }],
    example: 'Get-ComputerInfo',
    output: 'list',
    intents: ['informacoes do computador', 'versao do windows', 'memoria ram', 'inventario pc', 'sistema operacional'],
  }),
  C('Get-CimInstance', 'sistema', 'Consulta informações do sistema via WMI/CIM.', {
    aliases: ['gcim'],
    params: [
      { name: 'ClassName', desc: 'Classe CIM, como Win32_OperatingSystem.', positional: true, example: 'Win32_LogicalDisk' },
      { name: 'Filter', desc: 'Filtro WQL.' },
      { name: 'ComputerName', desc: 'Consulta uma máquina remota.' },
    ],
    example: 'Get-CimInstance -ClassName Win32_OperatingSystem',
    examples: ['Get-CimInstance Win32_LogicalDisk', 'Get-CimInstance Win32_ComputerSystem'],
    output: 'objects',
    intents: ['wmi', 'cim', 'disco livre', 'modelo do computador', 'hardware', 'memoria do sistema'],
  }),
  C('Get-Volume', 'sistema', 'Mostra volumes, tamanhos e espaço livre.', {
    aliases: ['gv'],
    params: [{ name: 'DriveLetter', desc: 'Letra do volume.', positional: true, example: 'C' }],
    example: 'Get-Volume',
    output: 'objects',
    intents: ['espaco em disco', 'volumes', 'disco cheio', 'armazenamento'],
  }),
  C('Get-HotFix', 'sistema', 'Lista atualizações instaladas no Windows.', {
    params: [{ name: 'Id', desc: 'Identificador do hotfix.', positional: true, example: 'KB5031445' }],
    example: 'Get-HotFix',
    output: 'objects',
    intents: ['atualizacoes instaladas', 'hotfix', 'kb do windows', 'patch'],
  }),
  C('Get-TimeZone', 'sistema', 'Mostra o fuso horário atual do sistema.', {
    params: [{ name: 'Name', desc: 'Nome do fuso horário.', positional: true }],
    example: 'Get-TimeZone',
    output: 'objects',
    intents: ['fuso horario', 'timezone'],
  }),

  // ── Registro ──────────────────────────────────────────────────
  C('Get-ItemProperty', 'registro', 'Lê valores de uma chave do registro ou de um arquivo.', {
    aliases: ['gp'],
    params: [
      { name: 'Path', desc: 'Caminho da chave, como HKCU:\\Software.', positional: true, example: 'HKCU:\\Software\\PowerShellLab' },
      { name: 'Name', desc: 'Nome(s) do(s) valor(es).' },
    ],
    example: 'Get-ItemProperty -Path HKCU:\\Software\\PowerShellLab',
    output: 'registry',
    intents: ['ler registro', 'valor do registro', 'configuracao windows', 'registro do windows'],
  }),
  C('Set-ItemProperty', 'registro', 'Altera um valor existente no registro.', {
    aliases: ['sp'],
    params: [
      { name: 'Path', desc: 'Chave do registro.', positional: true, example: 'HKCU:\\Software\\PowerShellLab' },
      { name: 'Name', desc: 'Nome do valor.', example: 'Theme' },
      { name: 'Value', desc: 'Novo valor.', example: 'light' },
    ],
    example: 'Set-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme -Value "light"',
    output: 'none',
    risk: 'altera',
    intents: ['alterar registro', 'mudar configuracao windows', 'set registry'],
  }),
  C('Remove-ItemProperty', 'registro', 'Remove um valor do registro.', {
    aliases: ['rp'],
    params: [
      { name: 'Path', desc: 'Chave do registro.', positional: true },
      { name: 'Name', desc: 'Valor a remover.' },
    ],
    example: 'Remove-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name AutoSave',
    output: 'none',
    risk: 'cuidado',
    intents: ['remover valor registro', 'apagar chave registro'],
  }),

  // ── Módulos ───────────────────────────────────────────────────
  C('Get-Module', 'modulos', 'Lista módulos carregados ou disponíveis na sessão.', {
    aliases: ['gm'],
    params: [
      { name: 'Name', desc: 'Filtra pelo nome do módulo.', positional: true, example: 'ActiveDirectory' },
      { name: 'ListAvailable', desc: 'Mostra todos os módulos que podem ser importados.', switch: true },
    ],
    example: 'Get-Module',
    examples: ['Get-Module -ListAvailable ActiveDirectory'],
    output: 'modules',
    intents: ['modulos instalados', 'modulos carregados', 'extensoes powershell', 'get module'],
  }),
  C('Import-Module', 'modulos', 'Carrega um módulo na sessão atual.', {
    aliases: ['ipmo'],
    params: [{ name: 'Name', desc: 'Nome ou caminho do módulo.', positional: true, example: 'ActiveDirectory' }],
    example: 'Import-Module ActiveDirectory',
    output: 'none',
    risk: 'altera',
    intents: ['importar modulo', 'carregar active directory', 'habilitar modulo', 'import module'],
  }),
  C('Get-InstalledModule', 'modulos', 'Lista módulos instalados pela galeria do PowerShell.', {
    aliases: ['gim'],
    params: [{ name: 'Name', desc: 'Filtra por nome.', positional: true }],
    example: 'Get-InstalledModule',
    output: 'modules',
    intents: ['modulos da galeria', 'pacotes instalados powershell'],
  }),
  C('Find-Module', 'modulos', 'Pesquisa módulos publicados na galeria do PowerShell.', {
    aliases: ['fdmo'],
    params: [{ name: 'Name', desc: 'Nome ou termo de busca.', positional: true, example: 'ImportExcel' }],
    example: 'Find-Module -Name ImportExcel',
    output: 'modules',
    intents: ['procurar modulo', 'baixar modulo', 'galeria powershell', 'find module'],
  }),
  C('Install-Module', 'modulos', 'Instala um módulo da galeria no computador.', {
    aliases: ['inmo'],
    params: [
      { name: 'Name', desc: 'Nome do módulo.', positional: true, example: 'ImportExcel' },
      { name: 'Scope', desc: 'CurrentUser ou AllUsers.', values: ['CurrentUser', 'AllUsers'] },
      { name: 'Force', desc: 'Instala sem pedir confirmação.', switch: true },
    ],
    example: 'Install-Module -Name ImportExcel -Scope CurrentUser',
    output: 'none',
    risk: 'admin',
    intents: ['instalar modulo', 'adicionar funcionalidade', 'install module'],
  }),
  C('Update-Module', 'modulos', 'Atualiza um módulo instalado para a versão mais recente.', {
    aliases: [],
    params: [{ name: 'Name', desc: 'Módulo a atualizar.', positional: true, example: 'ImportExcel' }],
    example: 'Update-Module -Name Pester',
    output: 'none',
    risk: 'altera',
    intents: ['atualizar modulo', 'update module'],
  }),
  C('Get-PSRepository', 'modulos', 'Mostra os repositórios de módulos configurados.', {
    params: [],
    example: 'Get-PSRepository',
    output: 'objects',
    intents: ['repositorios powershell', 'galeria configurada'],
  }),

  // ── Automação ─────────────────────────────────────────────────
  C('Get-ScheduledTask', 'automacao', 'Lista tarefas agendadas do Windows.', {
    aliases: ['gst'],
    params: [
      { name: 'TaskName', desc: 'Nome da tarefa.', positional: true, example: 'Backup Financeiro' },
      { name: 'TaskPath', desc: 'Pasta de tarefas, como \\PSLab\\.' },
    ],
    example: 'Get-ScheduledTask -TaskPath "\\PSLab\\"',
    output: 'tasks',
    intents: ['tarefas agendadas', 'agendamentos do windows', 'automacoes', 'scheduled tasks'],
  }),
  C('Register-ScheduledTask', 'automacao', 'Cria uma nova tarefa agendada.', {
    params: [
      { name: 'TaskName', desc: 'Nome da nova tarefa.', example: 'Backup Projetos' },
      { name: 'Action', desc: 'Comando ou programa executado.', example: 'powershell.exe -File C:\\Temp\\scripts\\backup.ps1' },
      { name: 'Trigger', desc: 'Quando a tarefa será executada.', example: 'Daily' },
      { name: 'User', desc: 'Usuário que executa a tarefa.' },
    ],
    example: 'Register-ScheduledTask -TaskName "Backup Projetos" -Action "powershell.exe -File C:\\Temp\\scripts\\backup.ps1" -Trigger Daily',
    output: 'none',
    risk: 'admin',
    intents: ['criar tarefa agendada', 'agendar script', 'automatizar diariamente', 'register task'],
  }),
  C('Start-ScheduledTask', 'automacao', 'Executa uma tarefa agendada agora.', {
    params: [{ name: 'TaskName', desc: 'Nome da tarefa.', positional: true, example: 'Backup Financeiro' }],
    example: 'Start-ScheduledTask -TaskName "Backup Financeiro"',
    output: 'none',
    risk: 'altera',
    intents: ['executar tarefa agora', 'rodar agendamento', 'start task'],
  }),
  C('Stop-ScheduledTask', 'automacao', 'Interrompe uma tarefa em execução.', {
    params: [{ name: 'TaskName', desc: 'Nome da tarefa.', positional: true }],
    example: 'Stop-ScheduledTask -TaskName "Sincronização de usuários"',
    output: 'none',
    risk: 'cuidado',
    intents: ['parar tarefa agendada', 'stop task'],
  }),
  C('Unregister-ScheduledTask', 'automacao', 'Remove uma tarefa agendada.', {
    params: [
      { name: 'TaskName', desc: 'Nome da tarefa.', positional: true },
      { name: 'Confirm', desc: 'Pede confirmação.', switch: true },
    ],
    example: 'Unregister-ScheduledTask -TaskName "Relatório semanal" -Confirm:$false',
    output: 'none',
    risk: 'cuidado',
    intents: ['remover tarefa agendada', 'apagar agendamento'],
  }),
  C('Get-ScheduledTaskInfo', 'automacao', 'Mostra a última execução e o próximo horário de uma tarefa.', {
    params: [{ name: 'TaskName', desc: 'Nome da tarefa.', positional: true, example: 'Backup Financeiro' }],
    example: 'Get-ScheduledTaskInfo -TaskName "Backup Financeiro"',
    output: 'objects',
    intents: ['status da tarefa', 'ultima execucao', 'proximo agendamento'],
  }),

  // ── Remoting ──────────────────────────────────────────────────
  C('New-PSSession', 'remoting', 'Cria uma sessão remota persistente com outro computador.', {
    aliases: ['nsn'],
    params: [
      { name: 'ComputerName', desc: 'Máquina de destino.', positional: true, example: 'SRV-DC01' },
      { name: 'Credential', desc: 'Credencial usada na conexão.' },
    ],
    example: 'New-PSSession -ComputerName SRV-DC01',
    output: 'sessions',
    risk: 'altera',
    intents: ['abrir sessao remota', 'conectar servidor', 'sessao powershell remota', 'pssession'],
  }),
  C('Get-PSSession', 'remoting', 'Lista as sessões remotas abertas na sessão atual.', {
    aliases: ['gsn'],
    params: [{ name: 'ComputerName', desc: 'Filtra pelo computador.', positional: true }],
    example: 'Get-PSSession',
    output: 'sessions',
    intents: ['sessoes abertas', 'conexoes remotas', 'get pssession'],
  }),
  C('Invoke-Command', 'remoting', 'Executa um comando em um ou mais computadores remotos.', {
    aliases: ['icm'],
    params: [
      { name: 'ComputerName', desc: 'Destino(s) da execução.', example: 'SRV-DC01' },
      { name: 'ScriptBlock', desc: 'Bloco de código executado remotamente.', example: '{ Get-Date }' },
      { name: 'Session', desc: 'Sessão criada por New-PSSession.' },
      { name: 'Credential', desc: 'Credencial da conexão.' },
    ],
    example: 'Invoke-Command -ComputerName SRV-DC01 -ScriptBlock { Get-Date }',
    output: 'objects',
    risk: 'altera',
    intents: ['executar comando remoto', 'rodar em outro servidor', 'invoke command', 'comando remoto'],
  }),
  C('Test-WSMan', 'remoting', 'Verifica se o serviço de remoting (WinRM) está respondendo.', {
    params: [{ name: 'ComputerName', desc: 'Máquina a testar.', positional: true, example: 'SRV-DC01' }],
    example: 'Test-WSMan SRV-DC01',
    output: 'list',
    intents: ['testar remoting', 'winrm funciona', 'test wsmam'],
  }),
  C('Enter-PSSession', 'remoting', 'Abre uma sessão interativa em outro computador.', {
    params: [{ name: 'ComputerName', desc: 'Máquina de destino.', positional: true, example: 'SRV-DC01' }],
    example: 'Enter-PSSession -ComputerName SRV-DC01',
    output: 'none',
    risk: 'altera',
    intents: ['entrar no servidor', 'sessao interativa remota', 'enter pssession'],
  }),
  C('Exit-PSSession', 'remoting', 'Encerra a sessão interativa remota.', {
    aliases: ['exit'],
    params: [],
    example: 'Exit-PSSession',
    output: 'none',
    intents: ['sair do servidor', 'encerrar sessao remota'],
  }),
  C('Remove-PSSession', 'remoting', 'Fecha e remove sessões remotas.', {
    params: [{ name: 'Id', desc: 'Identificador da sessão.', positional: true }],
    example: 'Remove-PSSession -Id 1',
    output: 'none',
    risk: 'cuidado',
    intents: ['fechar sessao remota', 'remover pssession'],
  }),

  // ── Segurança & contas locais ─────────────────────────────────
  C('Get-ExecutionPolicy', 'seguranca', 'Mostra a política de execução de scripts do PowerShell.', {
    params: [{ name: 'List', desc: 'Mostra a política por escopo.', switch: true }],
    example: 'Get-ExecutionPolicy -List',
    output: 'objects',
    intents: ['politica de execucao', 'scripts bloqueados', 'execution policy'],
  }),
  C('Set-ExecutionPolicy', 'seguranca', 'Altera a política de execução de scripts.', {
    params: [
      { name: 'ExecutionPolicy', desc: 'Restricted, RemoteSigned, AllSigned, Bypass...', positional: true, values: ['Restricted', 'RemoteSigned', 'AllSigned', 'Bypass', 'Undefined'] },
      { name: 'Scope', desc: 'Process, CurrentUser ou LocalMachine.', values: ['Process', 'CurrentUser', 'LocalMachine'] },
      { name: 'Force', desc: 'Não pede confirmação.', switch: true },
    ],
    example: 'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser',
    output: 'none',
    risk: 'cuidado',
    intents: ['liberar scripts', 'mudar execution policy', 'executar scripts powershell'],
  }),
  C('Get-AuthenticodeSignature', 'seguranca', 'Verifica a assinatura digital de um script.', {
    params: [{ name: 'FilePath', desc: 'Arquivo .ps1 a verificar.', positional: true, example: 'C:\\Temp\\scripts\\backup.ps1' }],
    example: 'Get-AuthenticodeSignature C:\\Temp\\scripts\\backup.ps1',
    output: 'list',
    intents: ['assinatura do script', 'script assinado', 'autenticidade'],
  }),
  C('Get-LocalUser', 'seguranca', 'Lista as contas de usuário locais da máquina.', {
    params: [{ name: 'Name', desc: 'Nome da conta. Aceita curingas.', positional: true, example: 'suporte' }],
    example: 'Get-LocalUser',
    output: 'localUsers',
    intents: ['usuarios locais', 'contas da maquina', 'quem tem conta local', 'local users'],
  }),
  C('New-LocalUser', 'seguranca', 'Cria uma conta de usuário local.', {
    params: [
      { name: 'Name', desc: 'Nome de login da nova conta.', positional: true, example: 'estagiario' },
      { name: 'FullName', desc: 'Nome completo da pessoa.' },
      { name: 'Description', desc: 'Descrição da conta.' },
      { name: 'Password', desc: 'Senha da conta.' },
      { name: 'AccountNeverExpires', desc: 'A conta não expira.', switch: true },
    ],
    example: 'New-LocalUser -Name estagiario -FullName "Novo Estagiário" -Description "Conta de aprendizado"',
    output: 'none',
    risk: 'admin',
    intents: ['criar usuario local', 'nova conta no pc', 'adicionar usuario local', 'new local user'],
  }),
  C('Enable-LocalUser', 'seguranca', 'Ativa uma conta local desativada.', {
    params: [{ name: 'Name', desc: 'Conta a ativar.', positional: true, example: 'visitante' }],
    example: 'Enable-LocalUser -Name visitante',
    output: 'none',
    risk: 'admin',
    intents: ['ativar conta local', 'habilitar usuario local'],
  }),
  C('Disable-LocalUser', 'seguranca', 'Desativa uma conta local sem removê-la.', {
    params: [{ name: 'Name', desc: 'Conta a desativar.', positional: true, example: 'visitante' }],
    example: 'Disable-LocalUser -Name visitante',
    output: 'none',
    risk: 'cuidado',
    intents: ['desativar conta local', 'bloquear usuario local'],
  }),
  C('Get-LocalGroup', 'seguranca', 'Lista os grupos locais do computador.', {
    params: [{ name: 'Name', desc: 'Nome do grupo.', positional: true, example: 'Administradores' }],
    example: 'Get-LocalGroup',
    output: 'localGroups',
    intents: ['grupos locais', 'grupos da maquina'],
  }),
  C('Get-LocalGroupMember', 'seguranca', 'Lista os membros de um grupo local.', {
    params: [{ name: 'Group', desc: 'Grupo consultado.', positional: true, example: 'Administradores' }],
    example: 'Get-LocalGroupMember -Group Administradores',
    output: 'localGroupMembers',
    intents: ['membros grupo local', 'quem e admin da maquina'],
  }),
  C('Add-LocalGroupMember', 'seguranca', 'Adiciona uma conta a um grupo local.', {
    params: [
      { name: 'Group', desc: 'Grupo local.', positional: true, example: 'Usuários' },
      { name: 'Member', desc: 'Conta a adicionar.', positional: true, example: 'estagiario' },
    ],
    example: 'Add-LocalGroupMember -Group Usuários -Member visitante',
    output: 'none',
    risk: 'admin',
    intents: ['adicionar ao grupo local', 'tornar administrador da maquina'],
  }),

  // ── Dados & relatórios ────────────────────────────────────────
  C('ConvertTo-Json', 'relatorios', 'Converte objetos em texto JSON.', {
    params: [
      { name: 'InputObject', desc: 'Objetos a converter.', positional: true },
      { name: 'Depth', desc: 'Profundidade máxima da conversão.' },
    ],
    example: 'Get-Process | Select-Object -First 3 | ConvertTo-Json',
    output: 'text',
    intents: ['converter para json', 'json', 'serializar'],
  }),
  C('ConvertFrom-Json', 'relatorios', 'Transforma texto JSON em objetos do PowerShell.', {
    params: [{ name: 'InputObject', desc: 'Texto ou arquivo JSON.', positional: true }],
    example: 'Get-Content .\\Documentos\\inventario.json -Raw | ConvertFrom-Json',
    output: 'objects',
    intents: ['ler json', 'json para objeto', 'parse json'],
  }),
  C('ConvertTo-Csv', 'relatorios', 'Converte objetos em linhas CSV.', {
    params: [
      { name: 'InputObject', desc: 'Objetos a converter.', positional: true },
      { name: 'NoTypeInformation', desc: 'Omite a linha #TYPE.', switch: true },
    ],
    example: 'Get-Process | Select-Object -First 3 ProcessName, CPU | ConvertTo-Csv -NoTypeInformation',
    output: 'text',
    intents: ['converter para csv', 'gerar csv'],
  }),
  C('ConvertFrom-Csv', 'relatorios', 'Converte texto CSV em objetos.', {
    params: [{ name: 'InputObject', desc: 'Linhas CSV.', positional: true }],
    example: 'Get-Content .\\Documentos\\relatorio-vendas.csv | ConvertFrom-Csv',
    output: 'objects',
    intents: ['ler csv', 'csv para objeto'],
  }),
  C('Export-Csv', 'relatorios', 'Salva objetos em um arquivo CSV.', {
    params: [
      { name: 'Path', desc: 'Arquivo de destino.', positional: true, example: '.\\usuarios.csv' },
      { name: 'NoTypeInformation', desc: 'Omite a linha #TYPE.', switch: true },
      { name: 'Delimiter', desc: 'Separador, como ; ou ,' },
    ],
    example: 'Get-ADUser -Filter * | Select-Object Name, SamAccountName, Department | Export-Csv .\\usuarios.csv -NoTypeInformation',
    output: 'none',
    risk: 'altera',
    intents: ['exportar csv', 'salvar planilha', 'relatorio csv', 'export users csv'],
  }),
  C('Import-Csv', 'relatorios', 'Lê um arquivo CSV e devolve objetos.', {
    params: [
      { name: 'Path', desc: 'Arquivo CSV.', positional: true, example: '.\\relatorio-vendas.csv' },
      { name: 'Delimiter', desc: 'Separador usado no arquivo.' },
    ],
    example: 'Import-Csv .\\Documentos\\relatorio-vendas.csv',
    output: 'objects',
    intents: ['importar csv', 'ler planilha csv', 'abrir csv'],
  }),

  // ── Erros & depuração ────────────────────────────────────────
  C('Write-Error', 'erros', 'Emite um erro não terminante no fluxo de saída.', {
    params: [{ name: 'Message', desc: 'Mensagem do erro.', positional: true }],
    example: 'Write-Error "Não foi possível conectar ao servidor"',
    output: 'none',
    risk: 'altera',
    intents: ['gerar erro', 'mensagem de erro'],
  }),
  C('Write-Warning', 'erros', 'Escreve um aviso amarelo no console.', {
    params: [{ name: 'Message', desc: 'Mensagem do aviso.', positional: true }],
    example: 'Write-Warning "O disco está com pouco espaço"',
    output: 'none',
    intents: ['aviso', 'warning', 'alerta'],
  }),
  C('Write-Verbose', 'erros', 'Escreve detalhes extras quando -Verbose está ativo.', {
    params: [{ name: 'Message', desc: 'Mensagem detalhada.', positional: true }],
    example: 'Write-Verbose "Conectando ao servidor..." -Verbose',
    output: 'none',
    intents: ['detalhes de execucao', 'verbose', 'depurar saida'],
  }),

  // ── Ambiente ─────────────────────────────────────────────────
  C('Get-History', 'ambiente', 'Mostra os comandos executados nesta sessão.', {
    aliases: ['h', 'history'],
    params: [{ name: 'Id', desc: 'Número do comando no histórico.', positional: true }],
    example: 'Get-History',
    output: 'objects',
    intents: ['historico de comandos', 'o que eu digitei', 'history'],
  }),
]

const aliasMap = new Map()
for (const command of COMMANDS) {
  aliasMap.set(command.name.toLowerCase(), command)
  for (const alias of command.aliases) {
    if (!aliasMap.has(alias.toLowerCase())) aliasMap.set(alias.toLowerCase(), command)
  }
}

export const COMMAND_MAP = aliasMap
export const CATEGORY_MAP = new Map(CATEGORIES.map((category) => [category.id, category]))

export function findCommand(name) {
  if (!name) return null
  return aliasMap.get(String(name).toLowerCase().replace(/^\s+|\s+$/g, '')) ?? null
}

export function categoryFor(id) {
  return CATEGORY_MAP.get(id) ?? CATEGORY_MAP.get('inicio')
}

export function commandsInCategory(categoryId) {
  return COMMANDS.filter((command) => command.cat === categoryId)
}

export function allSwitchParams(command) {
  const fromCatalog = new Set((command?.params ?? []).filter((param) => param.switch).map((param) => param.name.toLowerCase()))
  return fromCatalog
}

export const COMMON_SWITCHES = new Set([
  'whatif', 'confirm', 'force', 'recurse', 'raw', 'file', 'directory', 'hidden', 'autosize', 'wrap',
  'descending', 'ascending', 'unique', 'examples', 'detailed', 'full', 'list', 'quiet',
  'recursive', 'physical', 'noninteractive', 'noenumerate', 'append', 'notypeinformation', 'verbose',
  'debug', 'passthru', 'noclobber', 'accountneverexpires', 'passwordneverexpires', 'lockedout',
  'accountdisabled', 'usersonly', 'listavailable', 'includeusername', 'dependentservices', 'force',
])

export function isSwitchName(name) {
  return COMMON_SWITCHES.has(String(name).toLowerCase())
}

export const VERBS = [...new Set(COMMANDS.map((command) => command.name.split('-')[0]))].sort()
export const NOUNS = [...new Set(COMMANDS.map((command) => command.name.split('-')[1]).filter(Boolean))].sort()
