const ANSI_PATTERN = /\u001b\[[0-9;]*m/g

const ENGLISH_MARKERS = /\b(The|Cannot|Could not|Unable|Missing|Unexpected|Invalid|Access|No such|not recognized|failed|error|denied|already exists|does not exist)\b/i
const PORTUGUESE_MARKERS = /\b(não|nao|erro|caminho|arquivo|pasta|conta|comando|permissão|permissao|serviço|servico|unidade|parâmetro|parametro|falhou|inexistente|negado|execução|execucao)\b/i

export const ERROR_CATEGORY_LABELS = {
  command: 'comando',
  parameter: 'parâmetro',
  path: 'caminho',
  permission: 'permissão',
  network: 'rede',
  ad: 'Active Directory',
  service: 'serviço',
  module: 'módulo',
  syntax: 'sintaxe',
  file: 'arquivo',
  runtime: 'execução',
  unknown: 'não reconhecido',
}

const HINTS = {
  command: 'Confira a grafia com Get-Command. No modo real, o comando também pode depender de um módulo que não está instalado.',
  parameter: 'Use Get-Help <comando> -Parameter <parâmetro> para ver o nome e o tipo corretos. Parâmetros nomeados podem ser informados em qualquer ordem.',
  path: 'Confira o diretório atual com Get-Location e teste o caminho com Test-Path. Caminhos relativos dependem da pasta em que a sessão está.',
  permission: 'Pode ser necessário executar como administrador, ajustar permissões ou fechar o programa que mantém o arquivo aberto.',
  network: 'Verifique conexão, DNS e firewall. Test-Connection e Resolve-DnsName ajudam a separar problema de rede de problema de nome.',
  ad: 'Confirme se o módulo ActiveDirectory/RSAT está instalado e se a conta usada tem permissão no domínio.',
  service: 'Liste o serviço com Get-Service e confira o nome exato e o estado atual antes de iniciar, parar ou reiniciar.',
  module: 'Veja os módulos disponíveis com Get-Module -ListAvailable e importe o módulo necessário com Import-Module.',
  syntax: 'Revise aspas, parênteses, chaves e operadores. O erro aponta a região, mas a causa pode estar na linha anterior.',
  file: 'Confira se o arquivo existe, se está em uso e se o caminho tem permissão de leitura ou escrita.',
  runtime: 'Leia a mensagem original com atenção: ela preserva os detalhes técnicos que a tradução pode resumir.',
  unknown: 'A mensagem original foi preservada. Se ela continuar difícil, copie o texto e pesquise pelo trecho entre aspas.',
}

function rule(id, category, pattern, translate) {
  return { id, category, pattern, translate }
}

const RULES = [
  rule(
    'command-not-found',
    'command',
    /The term ['"]([^'"]+)['"] is not recognized as (?:a|the) name of a cmdlet, function, script file, or (?:executable|operable) program/i,
    (match) => `O termo '${match[1]}' não é reconhecido como nome de cmdlet, função, arquivo de script ou programa executável. Verifique a grafia do nome ou, se um caminho foi incluído, confirme se o caminho está correto e tente novamente.`,
  ),
  rule(
    'command-not-found-cmd',
    'command',
    /['"]([^'"]+)['"] is not recognized as an internal or external command, operable program or batch file/i,
    (match) => `'${match[1]}' não é reconhecido como comando interno ou externo, programa executável ou arquivo em lote.`,
  ),
  rule(
    'parameter-not-found',
    'parameter',
    /A parameter cannot be found that matches parameter name ['"]([^'"]+)['"]/i,
    (match) => `Não foi encontrado nenhum parâmetro com o nome '${match[1]}'.`,
  ),
  rule(
    'positional-parameter-not-found',
    'parameter',
    /A positional parameter cannot be found that accepts argument ['"]([^'"]+)['"]/i,
    (match) => `Não foi encontrado um parâmetro posicional que aceite o argumento '${match[1]}'.`,
  ),
  rule(
    'missing-argument',
    'parameter',
    /Missing an argument for parameter ['"]([^'"]+)['"](?:\.\s*Specify a parameter of type ['"]([^'"]+)['"] and try again)?/i,
    (match) => `Falta um valor para o parâmetro '${match[1]}'.${match[2] ? ` Especifique um valor do tipo '${match[2]}'.` : ''}`,
  ),
  rule(
    'cannot-find-path',
    'path',
    /Cannot find path ['"]([^'"]+)['"] because it does not exist/i,
    (match) => `Não foi possível encontrar o caminho '${match[1]}' porque ele não existe.`,
  ),
  rule(
    'cannot-find-part-of-path',
    'path',
    /Could not find a part of the path ['"]([^'"]+)['"]/i,
    (match) => `Não foi possível encontrar uma parte do caminho '${match[1]}'.`,
  ),
  rule(
    'cannot-find-drive',
    'path',
    /Cannot find drive\.? A drive with the name ['"]([^'"]+)['"] does not exist/i,
    (match) => `Não foi possível encontrar a unidade '${match[1]}'. A unidade não existe ou não está conectada.`,
  ),
  rule(
    'access-denied',
    'permission',
    /Access to the path ['"]([^'"]+)['"] is denied/i,
    (match) => `O acesso ao caminho '${match[1]}' foi negado.`,
  ),
  rule(
    'file-in-use',
    'file',
    /The process cannot access the file ['"]([^'"]+)['"] because it is being used by another process/i,
    (match) => `O processo não consegue acessar o arquivo '${match[1]}' porque ele está sendo usado por outro processo.`,
  ),
  rule(
    'already-exists',
    'file',
    /(?:The )?(?:file|directory|item) ['"]([^'"]+)['"] already exists/i,
    (match) => `O item '${match[1]}' já existe.`,
  ),
  rule(
    'directory-not-empty',
    'file',
    /The directory is not empty/i,
    () => 'O diretório não está vazio. Remova ou mova o conteúdo antes de excluí-lo.',
  ),
  rule(
    'cannot-find-service',
    'service',
    /Cannot find (?:any service with service name|service) ['"]([^'"]+)['"]/i,
    (match) => `Não foi possível encontrar o serviço '${match[1]}'.`,
  ),
  rule(
    'service-not-running',
    'service',
    /The service ['"]([^'"]+)['"] cannot be (stopped|started|paused) because it is not running/i,
    (match) => `O serviço '${match[1]}' não pode ser ${match[2] === 'stopped' ? 'parado' : match[2] === 'started' ? 'iniciado' : 'pausado'} porque não está em execução.`,
  ),
  rule(
    'service-already-running',
    'service',
    /The service ['"]([^'"]+)['"] cannot be started because it is already running/i,
    (match) => `O serviço '${match[1]}' não pode ser iniciado porque já está em execução.`,
  ),
  rule(
    'ad-account-locked',
    'ad',
    /The account is locked out/i,
    () => 'A conta está bloqueada.',
  ),
  rule(
    'ad-bad-credentials',
    'ad',
    /The user name or password is incorrect/i,
    () => 'O nome de usuário ou a senha estão incorretos.',
  ),
  rule(
    'ad-account-missing',
    'ad',
    /The specified account does not exist/i,
    () => 'A conta especificada não existe.',
  ),
  rule(
    'ad-cannot-find-user',
    'ad',
    /Cannot find an object with identity ['"]([^'"]+)['"]/i,
    (match) => `Não foi possível encontrar um objeto com a identidade '${match[1]}'.`,
  ),
  rule(
    'module-not-loaded',
    'module',
    /The specified module ['"]([^'"]+)['"] was not loaded because no valid module file was found/i,
    (match) => `O módulo '${match[1]}' não foi carregado porque nenhum arquivo de módulo válido foi encontrado.`,
  ),
  rule(
    'module-could-not-load',
    'module',
    /The module ['"]([^'"]+)['"] could not be loaded/i,
    (match) => `O módulo '${match[1]}' não pôde ser carregado.`,
  ),
  rule(
    'dns-host-not-found',
    'network',
    /No such host is known/i,
    () => 'O host especificado não foi encontrado no DNS.',
  ),
  rule(
    'dns-name-not-resolved',
    'network',
    /The remote name could not be resolved:? ['"]?([^'"\r\n]+)['"]?/i,
    (match) => `O nome remoto '${match[1]}' não pôde ser resolvido pelo DNS.`,
  ),
  rule(
    'connection-closed',
    'network',
    /The underlying connection was closed:?\s*(.*)/i,
    (match) => `A conexão subjacente foi fechada${match[1] ? `: ${match[1]}` : '.'}`,
  ),
  rule(
    'cannot-validate-argument',
    'parameter',
    /Cannot validate argument on parameter ['"]([^'"]+)['"]/i,
    (match) => `Não foi possível validar o argumento do parâmetro '${match[1]}'.`,
  ),
  rule(
    'property-not-found',
    'runtime',
    /The property ['"]([^'"]+)['"] cannot be found on this object/i,
    (match) => `A propriedade '${match[1]}' não foi encontrada neste objeto.`,
  ),
  rule(
    'null-method',
    'runtime',
    /You cannot call a method on a null-valued expression/i,
    () => 'Não é possível chamar um método em uma expressão nula (o valor está vazio ou não existe).',
  ),
  rule(
    'unexpected-token',
    'syntax',
    /Unexpected token ['"]([^'"]+)['"] in expression or statement/i,
    (match) => `Token inesperado '${match[1]}' na expressão ou instrução.`,
  ),
  rule(
    'missing-closing',
    'syntax',
    /Missing closing ['"]([^'"]+)['"] in statement block or type definition/i,
    (match) => `Falta o fechamento '${match[1]}' em um bloco de instrução ou definição de tipo.`,
  ),
  rule(
    'variable-not-set',
    'runtime',
    /The variable ['"]([^'"]+)['"] cannot be retrieved because it has not been set/i,
    (match) => `A variável '${match[1]}' não pode ser lida porque ainda não foi definida.`,
  ),
  rule(
    'readonly-variable',
    'runtime',
    /Cannot overwrite variable ['"]([^'"]+)['"] because it is read-only or constant/i,
    (match) => `Não é possível sobrescrever a variável '${match[1]}' porque ela é somente leitura ou constante.`,
  ),
  rule(
    'cannot-convert-value',
    'parameter',
    /Cannot convert (?:the )?value ['"]?(.*?)['"]? to type ['"]([^'"]+)['"]/i,
    (match) => `Não é possível converter o valor '${match[1]}' para o tipo '${match[2]}'.`,
  ),
  rule(
    'filename-syntax',
    'path',
    /The filename, directory name, or volume label syntax is incorrect/i,
    () => 'A sintaxe do nome de arquivo, diretório ou rótulo de volume está incorreta.',
  ),
  rule(
    'exception-calling',
    'runtime',
    /Exception calling ['"]([^'"]+)['"] with ['"](\d+)['"] argument\(s\):\s*(.*)/i,
    (match) => `Ocorreu uma exceção ao chamar '${match[1]}' com ${match[2]} argumento(s): ${match[3]}`,
  ),
]

export function stripAnsi(value) {
  return String(value ?? '').replace(ANSI_PATTERN, '')
}

export function detectErrorLanguage(value) {
  const text = stripAnsi(value).trim()
  if (!text) return 'empty'
  if (PORTUGUESE_MARKERS.test(text) && !ENGLISH_MARKERS.test(text)) return 'pt'
  if (ENGLISH_MARKERS.test(text)) return 'en'
  return 'unknown'
}

export function translatePowerShellError(value) {
  const original = stripAnsi(value).trim()
  if (!original) return null
  const normalized = original.replace(/\s+/g, ' ').trim()

  for (const entry of RULES) {
    const match = normalized.match(entry.pattern)
    if (!match) continue
    return {
      id: entry.id,
      category: entry.category,
      categoryLabel: ERROR_CATEGORY_LABELS[entry.category] ?? ERROR_CATEGORY_LABELS.unknown,
      original,
      translation: entry.translate(match),
      hint: HINTS[entry.category] ?? HINTS.unknown,
      matched: true,
    }
  }

  if (detectErrorLanguage(original) !== 'en') return null

  return {
    id: 'unrecognized-english',
    category: 'unknown',
    categoryLabel: ERROR_CATEGORY_LABELS.unknown,
    original,
    translation: null,
    hint: HINTS.unknown,
    matched: false,
  }
}
