const task = (id, title, hint, solution, pattern, extra = {}) => ({
  id,
  title,
  hint,
  solution,
  pattern,
  ...extra,
})

const example = (label, code, note = '') => ({ label, code, note })
const concept = (title, body) => ({ title, body })

export const LESSONS = [
  {
    id: 'inicio-primeiro',
    cat: 'inicio',
    title: 'Seu primeiro contato',
    subtitle: 'O prompt não morde.',
    level: 'Essencial',
    minutes: 6,
    objective: 'Orientar-se na sessão, descobrir a data e aprender a pedir ajuda sem decorar tudo.',
    concepts: [
      concept('Uma conversa, não um formulário', 'No PowerShell você digita comandos de verdade. O prompt mostra a pasta atual; cada linha é interpretada quando você pressiona Enter. Se algo der errado, nada quebra: você recebe uma mensagem e pode tentar de novo.'),
      concept('Verbo-nome', 'Quase todo cmdlet segue o padrão Verbo-Nome: Get-Date (obter data), Get-Process (obter processos), New-Item (criar item). Isso torna o nome previsível e pesquisável.'),
    ],
    examples: [
      example('Onde estou', 'Get-Location', 'Mostra o diretório atual da sessão.'),
      example('Que horas são', 'Get-Date', 'Retorna a data e a hora atuais.'),
      example('Descobrir comandos', 'Get-Command -Verb Get', 'Lista os comandos que começam com o verbo Get.'),
      example('Abrir a ajuda', 'Get-Help Get-ChildItem -Examples', 'Aprende por exemplos prontos.'),
    ],
    tasks: [
      task('inicio-primeiro-1', 'Mostre a data e a hora', 'Use o cmdlet Date com o verbo Get.', 'Get-Date', 'get-date'),
      task('inicio-primeiro-2', 'Liste os comandos que começam com Get', 'Combine Get-Command com o parâmetro -Verb.', 'Get-Command -Verb Get', 'get-command[\\s\\S]*-verb[\\s\\S]*get'),
      task('inicio-primeiro-3', 'Peça exemplos da ajuda de Get-Process', 'Use Get-Help seguido do comando e de -Examples.', 'Get-Help Get-Process -Examples', 'get-help[\\s\\S]*get-process[\\s\\S]*examples'),
    ],
    tip: 'Você não precisa decorar. Get-Command encontra nomes e Get-Help explica o que eles fazem.',
  },
  {
    id: 'inicio-ajuda',
    cat: 'inicio',
    title: 'Ajuda e descoberta',
    subtitle: 'Aprender a pescar.',
    level: 'Essencial',
    minutes: 7,
    objective: 'Usar a documentação e explorar comandos por verbo, substantivo e tópicos conceituais.',
    concepts: [
      concept('Ajuda em camadas', 'Get-Help mostra a sinopse e a sintaxe. -Examples entrega casos prontos. -Detailed explica os parâmetros, e -Full abre tudo. Comece pelos exemplos: eles respondem a maioria das dúvidas iniciais.'),
      concept('Explore por partes', 'Get-Command -Noun *User encontra comandos cujo substantivo termina em User, mesmo com módulos diferentes. Get-Command -Verb New mostra tudo que cria algo. Isso funciona mesmo quando você não sabe o nome completo.'),
    ],
    examples: [
      example('Documentação detalhada', 'Get-Help Get-ADUser -Detailed'),
      example('Comandos que lidam com usuários', 'Get-Command -Noun *User'),
      example('Entender o pipeline', 'Get-Help about_Pipeline'),
    ],
    tasks: [
      task('inicio-ajuda-1', 'Abra a ajuda detalhada de Get-ADUser', 'Use -Detailed.', 'Get-Help Get-ADUser -Detailed', 'get-help[\\s\\S]*get-aduser[\\s\\S]*detailed'),
      task('inicio-ajuda-2', 'Descubra comandos relacionados a usuários', 'Use o curinga no substantivo: -Noun *User.', 'Get-Command -Noun *User', 'get-command[\\s\\S]*-noun[\\s\\S]*user'),
      task('inicio-ajuda-3', 'Leia o tópico sobre pipeline', 'Tópicos conceituais começam com about_.', 'Get-Help about_Pipeline', 'about_pipeline'),
    ],
    tip: 'Sempre que um parâmetro parecer estranho, peça exemplos específicos antes de procurar na internet.',
  },
  {
    id: 'arquivos-navegar',
    cat: 'arquivos',
    title: 'Navegar sem medo',
    subtitle: 'Pastas, arquivos e caminhos.',
    level: 'Essencial',
    minutes: 8,
    objective: 'Entender a pasta atual, listar conteúdo e se mover com caminhos relativos e absolutos.',
    concepts: [
      concept('Você está sempre em algum lugar', 'A sessão tem um diretório atual. Caminhos relativos como .\\Documentos partem dele; caminhos absolutos como C:\\Temp não dependem de onde você está. Set-Location muda o local da sessão.'),
      concept('Saída é feita de objetos', 'Get-ChildItem não devolve texto solto: devolve objetos DirectoryInfo e FileInfo. Cada linha da tabela esconde propriedades como Name, Length, LastWriteTime e FullName.'),
    ],
    examples: [
      example('Diretório atual', 'Get-Location'),
      example('Listar Documentos', 'Get-ChildItem .\\Documentos'),
      example('Entrar na pasta', 'Set-Location .\\Documentos'),
      example('Voltar um nível', 'Set-Location ..'),
      example('Listar somente arquivos', 'Get-ChildItem -File'),
    ],
    tasks: [
      task('arquivos-navegar-1', 'Mostre onde você está', 'Use o comando que retorna o diretório atual.', 'Get-Location', 'get-location'),
      task('arquivos-navegar-2', 'Liste o conteúdo da pasta Documentos', 'Passe o caminho relativo .\\Documentos.', 'Get-ChildItem .\\Documentos', 'get-childitem[\\s\\S]*documentos'),
      task('arquivos-navegar-3', 'Entre na pasta Documentos', 'Use Set-Location.', 'Set-Location .\\Documentos', 'set-location[\\s\\S]*documentos'),
      task('arquivos-navegar-4', 'Volte um nível com ..', 'O caminho .. representa a pasta pai.', 'Set-Location ..', 'set-location\\s+\\.\\.'),
    ],
    tip: 'Use Tab no console real para completar nomes de caminhos. No laboratório, as sugestões fazem esse papel.',
  },
  {
    id: 'arquivos-organizar',
    cat: 'arquivos',
    title: 'Criar, copiar e organizar',
    subtitle: 'Do caos ao projeto.',
    level: 'Essencial',
    minutes: 10,
    objective: 'Criar pastas e arquivos, copiar, mover e simular remoções com segurança.',
    concepts: [
      concept('Criar é dar um tipo', 'New-Item cria itens no provedor atual. -ItemType Directory cria uma pasta; -ItemType File cria um arquivo. Sem tipo, o PowerShell tenta inferir pela extensão e pelo caminho.'),
      concept('Ensaie antes de remover', 'Comandos destrutivos aceitam -WhatIf no PowerShell real. Nesse modo, o comando mostra o que faria e não altera nada. É uma boa forma de revisar um caminho antes de executar algo irreversível.'),
    ],
    examples: [
      example('Criar uma pasta', 'New-Item -Path .\\Documentos\\estudos -ItemType Directory'),
      example('Criar um arquivo com texto', 'Set-Content .\\Documentos\\estudos\\ideias.txt -Value "Aprender pipeline"'),
      example('Copiar um arquivo', 'Copy-Item .\\Documentos\\notas-reuniao.txt -Destination .\\Documentos\\estudos\\notas.txt'),
      example('Simular remoção', 'Remove-Item .\\Documentos\\estudos\\ideias.txt -WhatIf'),
    ],
    tasks: [
      task('arquivos-organizar-1', 'Crie a pasta estudos dentro de Documentos', 'Use New-Item com -ItemType Directory.', 'New-Item -Path .\\Documentos\\estudos -ItemType Directory', 'new-item[\\s\\S]*estudos[\\s\\S]*(directory|dir)', {
        verify: (world) => {
          const docs = findWorldNode(world, ['Users', 'miguel', 'Documentos'])
          return Boolean(docs?.children?.some((item) => item.name.toLowerCase() === 'estudos' && item.kind === 'dir'))
        },
      }),
      task('arquivos-organizar-2', 'Crie ideias.txt dentro de estudos', 'Set-Content cria o arquivo e grava o valor.', 'Set-Content .\\Documentos\\estudos\\ideias.txt -Value "Aprender pipeline"', 'set-content[\\s\\S]*estudos[\\s\\S]*ideias', {
        verify: (world) => Boolean(findWorldNode(world, ['Users', 'miguel', 'Documentos', 'estudos', 'ideias.txt'])),
      }),
      task('arquivos-organizar-3', 'Copie notas-reuniao.txt para estudos', 'Use Copy-Item com origem e -Destination.', 'Copy-Item .\\Documentos\\notas-reuniao.txt -Destination .\\Documentos\\estudos\\notas.txt', 'copy-item[\\s\\S]*notas-reuniao[\\s\\S]*estudos', {
        verify: (world) => Boolean(findWorldNode(world, ['Users', 'miguel', 'Documentos', 'estudos', 'notas.txt'])),
      }),
      task('arquivos-organizar-4', 'Simule a remoção de um arquivo', 'Use Remove-Item com -WhatIf para não apagar de verdade.', 'Remove-Item .\\Documentos\\estudos\\ideias.txt -WhatIf', 'remove-item[\\s\\S]*whatif'),
    ],
    warning: 'Remoção com -Recurse pode apagar uma árvore inteira. No laboratório é seguro, mas trate comandos destrutivos como cirurgia: confira o caminho e use -WhatIf.',
  },
  {
    id: 'texto-ler-escrever',
    cat: 'texto',
    title: 'Ler, procurar e escrever',
    subtitle: 'O conteúdo por dentro.',
    level: 'Essencial',
    minutes: 9,
    objective: 'Ler arquivos, procurar padrões com Select-String e criar ou acrescentar conteúdo.',
    concepts: [
      concept('Texto também é dado', 'Get-Content lê linhas. -Raw devolve o arquivo inteiro como uma string única, útil para JSON. Select-String procura padrões e informa arquivo, linha e trecho encontrado.'),
      concept('Substituir ou acrescentar', 'Set-Content substitui o conteúdo do arquivo. Add-Content adiciona ao final. Use um ou outro conscientemente: a diferença entre documentar e apagar o histórico está em uma palavra.'),
    ],
    examples: [
      example('Ler as anotações', 'Get-Content .\\Documentos\\notas-reuniao.txt'),
      example('Procurar “backup” nos textos', 'Select-String -Pattern "backup" -Path .\\Documentos\\*.txt'),
      example('Criar um diário', 'Set-Content .\\Documentos\\diario.txt -Value "Primeira entrada"'),
      example('Acrescentar uma linha', 'Add-Content .\\Documentos\\diario.txt -Value "Segunda entrada"'),
    ],
    tasks: [
      task('texto-ler-1', 'Leia o arquivo de anotações', 'Use Get-Content com o caminho .\\Documentos\\notas-reuniao.txt.', 'Get-Content .\\Documentos\\notas-reuniao.txt', 'get-content[\\s\\S]*notas-reuniao'),
      task('texto-ler-2', 'Procure “backup” nos arquivos .txt de Documentos', 'Use Select-String com -Pattern e -Path.', 'Select-String -Pattern "backup" -Path .\\Documentos\\*.txt', 'select-string[\\s\\S]*(backup|patr)'),
      task('texto-ler-3', 'Crie diario.txt com uma frase', 'Set-Content cria o arquivo quando ele não existe.', 'Set-Content .\\Documentos\\diario.txt -Value "Primeira entrada"', 'set-content[\\s\\S]*diario', {
        verify: (world) => Boolean(findWorldNode(world, ['Users', 'miguel', 'Documentos', 'diario.txt'])),
      }),
      task('texto-ler-4', 'Acrescente uma segunda linha ao diário', 'Use Add-Content, não Set-Content.', 'Add-Content .\\Documentos\\diario.txt -Value "Segunda entrada"', 'add-content[\\s\\S]*diario'),
    ],
    tip: 'Select-String entende expressões regulares. Comece com texto simples e evolua aos poucos.',
  },
  {
    id: 'objetos-tudo',
    cat: 'objetos',
    title: 'Tudo é objeto',
    subtitle: 'O pipeline começa aqui.',
    level: 'Essencial',
    minutes: 9,
    objective: 'Descobrir propriedades de objetos, selecionar colunas e entender por que o pipe não transporta texto.',
    concepts: [
      concept('Objetos, não linhas de texto', 'Cada processo é um objeto com Id, ProcessName, CPU, WorkingSet e muito mais. A tabela é só uma representação visual. O pipeline transporta o objeto inteiro, com todas as propriedades.'),
      concept('Inspecione antes de transformar', 'Get-Member mostra o tipo e os membros de um objeto. Select-Object escolhe propriedades e limita a quantidade. Sempre que um filtro falhar, inspecione os nomes reais das propriedades.'),
    ],
    examples: [
      example('Listar processos', 'Get-Process'),
      example('Ver o tipo e as propriedades', 'Get-Process | Get-Member'),
      example('Selecionar colunas', 'Get-Process | Select-Object ProcessName, CPU -First 5'),
      example('Formatar em tabela', 'Get-Process -Name chrome | Format-Table ProcessName, Id, CPU -AutoSize'),
    ],
    tasks: [
      task('objetos-tudo-1', 'Liste todos os processos', 'Use Get-Process sem filtro.', 'Get-Process', 'get-process\\s*$'),
      task('objetos-tudo-2', 'Veja os membros dos processos', 'Passe processos pelo pipe para Get-Member.', 'Get-Process | Get-Member', 'get-process[\\s\\S]*get-member'),
      task('objetos-tudo-3', 'Selecione nome e CPU de cinco processos', 'Use Select-Object com ProcessName, CPU e -First 5.', 'Get-Process | Select-Object ProcessName, CPU -First 5', 'select-object[\\s\\S]*processname[\\s\\S]*cpu'),
    ],
    tip: 'No PowerShell real, isso também funciona com objetos de APIs, arquivos, usuários e serviços. O padrão é sempre o mesmo.',
  },
  {
    id: 'objetos-filtrar',
    cat: 'objetos',
    title: 'Filtrar, ordenar e medir',
    subtitle: 'Faça as perguntas certas.',
    level: 'Prática',
    minutes: 10,
    objective: 'Filtrar objetos com Where-Object, ordenar com Sort-Object e resumir com Measure-Object.',
    concepts: [
      concept('O pipe conta uma história', 'Get-Process | Where-Object { $_.CPU -gt 10 } | Sort-Object CPU -Descending | Select-Object -First 3 cria uma sequência de perguntas: todos os processos, só os grandes, do maior para o menor, os três primeiros.'),
      concept('$_ é o objeto atual', 'Dentro de Where-Object, $_ representa o objeto que está passando naquele momento. Use $_.NomeDaPropriedade para acessar propriedades. Se não souber o nome, volte ao Get-Member.'),
    ],
    examples: [
      example('Processos acima de 10s de CPU', 'Get-Process | Where-Object { $_.CPU -gt 10 }'),
      example('Do maior para o menor', 'Get-Process | Sort-Object CPU -Descending'),
      example('Serviços em execução', 'Get-Service | Where-Object Status -eq "Running"'),
      example('Contar e somar', 'Get-Process | Measure-Object CPU -Sum -Average'),
    ],
    tasks: [
      task('objetos-filtrar-1', 'Mostre processos com CPU maior que 10', 'Use Where-Object com $_.CPU -gt 10.', 'Get-Process | Where-Object { $_.CPU -gt 10 }', 'where-object[\\s\\S]*cpu[\\s\\S]*gt[\\s\\S]*10'),
      task('objetos-filtrar-2', 'Ordene processos pela CPU, do maior para o menor', 'Use Sort-Object CPU -Descending.', 'Get-Process | Sort-Object CPU -Descending', 'sort-object[\\s\\S]*cpu[\\s\\S]*descending'),
      task('objetos-filtrar-3', 'Conte quantos serviços estão em execução', 'Filtre Status -eq "Running" e use Measure-Object.', 'Get-Service | Where-Object Status -eq "Running" | Measure-Object', 'get-service[\\s\\S]*where-object[\\s\\S]*running[\\s\\S]*measure-object'),
      task('objetos-filtrar-4', 'Some e tire a média de CPU dos processos', 'Measure-Object aceita -Sum e -Average.', 'Get-Process | Measure-Object CPU -Sum -Average', 'measure-object[\\s\\S]*cpu[\\s\\S]*(sum|average)'),
    ],
    tip: 'Erros de filtro quase sempre vêm de um nome de propriedade errado. Verifique com Select-Object * ou Get-Member.',
  },
  {
    id: 'objetos-transformar',
    cat: 'objetos',
    title: 'Transformar e agrupar',
    subtitle: 'Um comando, muitos objetos.',
    level: 'Prática',
    minutes: 10,
    objective: 'Iterar com ForEach-Object, agrupar com Group-Object e apresentar resultados com Format-Table.',
    concepts: [
      concept('Para cada objeto', 'ForEach-Object executa um bloco para cada item do pipeline. O bloco recebe $_ e devolve um novo valor. É o equivalente ao “para cada” das linguagens de programação.'),
      concept('Agrupar revela padrões', 'Group-Object conta quantos objetos compartilham o mesmo valor. É uma forma rápida de responder “quantas pessoas há em cada departamento?” sem montar uma tabela dinâmica.'),
    ],
    examples: [
      example('Extrair só os nomes', 'Get-Process | ForEach-Object { $_.ProcessName }'),
      example('Quantos usuários por departamento', 'Get-ADUser -Filter * | Group-Object Department'),
      example('Tabela sob medida', 'Get-ADUser -Filter * | Format-Table Name, SamAccountName, Department -AutoSize'),
      example('Tipo e membros', 'Get-ADUser -Filter * | Get-Member'),
    ],
    tasks: [
      task('objetos-transformar-1', 'Liste apenas os nomes dos processos com ForEach-Object', 'Use o bloco { $_.ProcessName }.', 'Get-Process | ForEach-Object { $_.ProcessName }', 'foreach-object[\\s\\S]*processname'),
      task('objetos-transformar-2', 'Agrupe usuários do AD por departamento', 'Use Group-Object Department.', 'Get-ADUser -Filter * | Group-Object Department', 'group-object[\\s\\S]*department'),
      task('objetos-transformar-3', 'Mostre uma tabela com nome, login e departamento', 'Use Format-Table com as três colunas.', 'Get-ADUser -Filter * | Format-Table Name, SamAccountName, Department -AutoSize', 'format-table[\\s\\S]*name[\\s\\S]*samaccountname'),
    ],
    tip: 'Format-* deve ser o último passo do pipeline. Ele é uma decisão de apresentação, não uma transformação de dados.',
  },
  {
    id: 'processos-controle',
    cat: 'processos',
    title: 'Processos sob controle',
    subtitle: 'Ver, escolher e encerrar.',
    level: 'Prática',
    minutes: 9,
    objective: 'Encontrar processos pelo nome, avaliar consumo e encerrar um processo com segurança.',
    concepts: [
      concept('Um retrato do agora', 'Get-Process mostra o que está rodando. As propriedades CPU e WorkingSet ajudam a identificar quem consome recursos. Elas podem mudar entre duas execuções do comando.'),
      concept('Encerrar é interromper', 'Stop-Process encerra o processo imediatamente. Sem salvar o trabalho, dados podem ser perdidos. Use -WhatIf quando disponível para confirmar o alvo antes.'),
    ],
    examples: [
      example('O bloco de notas está aberto?', 'Get-Process -Name notepad'),
      example('Ver o que seria encerrado', 'Stop-Process -Name notepad -WhatIf'),
      example('Encerrar de verdade', 'Stop-Process -Name notepad'),
      example('Abrir novamente', 'Start-Process notepad.exe'),
    ],
    tasks: [
      task('processos-controle-1', 'Verifique se o notepad está em execução', 'Use Get-Process -Name notepad.', 'Get-Process -Name notepad', 'get-process[\\s\\S]*notepad'),
      task('processos-controle-2', 'Simule o encerramento do notepad', 'Stop-Process aceita -WhatIf no laboratório.', 'Stop-Process -Name notepad -WhatIf', 'stop-process[\\s\\S]*notepad[\\s\\S]*whatif'),
      task('processos-controle-3', 'Encerre o notepad', 'Use Stop-Process -Name notepad.', 'Stop-Process -Name notepad', 'stop-process[\\s\\S]*notepad(?!.*whatif)', {
        verify: (world) => !world.processes.some((process) => process.ProcessName.toLowerCase() === 'notepad'),
      }),
      task('processos-controle-4', 'Inicie o notepad novamente', 'Use Start-Process notepad.exe.', 'Start-Process notepad.exe', 'start-process[\\s\\S]*notepad'),
    ],
    warning: 'Em produção, encerrar o processo errado pode derrubar um serviço ou perder dados. Confira nome e PID antes.',
  },
  {
    id: 'servicos-estado',
    cat: 'processos',
    title: 'Serviços e estados',
    subtitle: 'O que roda em segundo plano.',
    level: 'Prática',
    minutes: 9,
    objective: 'Consultar e alterar o estado de serviços do Windows, entendendo dependências e inicialização.',
    concepts: [
      concept('Processo é execução; serviço é papel', 'Um serviço é gerenciado pelo Windows e pode iniciar sozinho. Get-Service mostra Status e StartType. Start, Stop e Restart controlam o estado; Set-Service altera o tipo de inicialização.'),
      concept('Serviços essenciais são protegidos', 'Alguns serviços não podem ser interrompidos sem afetar o sistema. No laboratório, serviços essenciais são bloqueados para você experimentar sem risco.'),
    ],
    examples: [
      example('Status do spooler', 'Get-Service -Name Spooler'),
      example('Parar o spooler', 'Stop-Service -Name Spooler'),
      example('Iniciar de novo', 'Start-Service -Name Spooler'),
      example('Serviços em execução', 'Get-Service | Where-Object Status -eq "Running"'),
      example('Inicialização manual', 'Set-Service -Name Spooler -StartupType Manual'),
    ],
    tasks: [
      task('servicos-estado-1', 'Consulte o estado do Spooler', 'Use Get-Service -Name Spooler.', 'Get-Service -Name Spooler', 'get-service[\\s\\S]*spooler'),
      task('servicos-estado-2', 'Pare o serviço Spooler', 'Use Stop-Service -Name Spooler.', 'Stop-Service -Name Spooler', 'stop-service[\\s\\S]*spooler', {
        verify: (world) => world.services.find((service) => service.Name === 'Spooler')?.Status === 'Stopped',
      }),
      task('servicos-estado-3', 'Inicie o Spooler novamente', 'Use Start-Service -Name Spooler.', 'Start-Service -Name Spooler', 'start-service[\\s\\S]*spooler', {
        verify: (world) => world.services.find((service) => service.Name === 'Spooler')?.Status === 'Running',
      }),
      task('servicos-estado-4', 'Liste apenas os serviços em execução', 'Combine Get-Service com Where-Object.', 'Get-Service | Where-Object Status -eq "Running"', 'get-service[\\s\\S]*where-object[\\s\\S]*running'),
    ],
    warning: 'Interromper serviços em um Windows real pode exigir privilégios de administrador e impactar outros usuários.',
  },
  {
    id: 'ad-primeiro-contato',
    cat: 'ad',
    title: 'Entrar no domínio',
    subtitle: 'Pessoas, grupos e máquinas.',
    level: 'Essencial',
    minutes: 9,
    objective: 'Conhecer o domínio simulado e explorar os três tipos de objetos mais comuns do Active Directory.',
    concepts: [
      concept('Um diretório, não uma planilha', 'O Active Directory guarda identidades e relações: usuários, grupos, computadores e unidades organizacionais. Os cmdlets do módulo ActiveDirectory conversam com o controlador de domínio.'),
      concept('O domínio do laboratório', 'O domínio simulado é lab.local, com usuários como ana.silva e grupos como TI-Suporte. Nada aqui toca um domínio real. Em produção, esses comandos exigem RSAT, credenciais e permissões adequadas.'),
    ],
    examples: [
      example('Dados do domínio', 'Get-ADDomain'),
      example('Todos os usuários', 'Get-ADUser -Filter *'),
      example('Todos os grupos', 'Get-ADGroup -Filter *'),
      example('Todos os computadores', 'Get-ADComputer -Filter *'),
    ],
    tasks: [
      task('ad-primeiro-1', 'Mostre as informações do domínio', 'Use Get-ADDomain.', 'Get-ADDomain', 'get-addomain'),
      task('ad-primeiro-2', 'Liste todos os usuários do domínio', 'Get-ADUser exige -Filter.', 'Get-ADUser -Filter *', 'get-aduser[\\s\\S]*-filter[\\s\\S]*\\*'),
      task('ad-primeiro-3', 'Liste todos os grupos', 'Use Get-ADGroup -Filter *.', 'Get-ADGroup -Filter *', 'get-adgroup[\\s\\S]*-filter'),
      task('ad-primeiro-4', 'Liste os computadores do domínio', 'Use Get-ADComputer -Filter *.', 'Get-ADComputer -Filter *', 'get-adcomputer[\\s\\S]*-filter'),
    ],
    tip: 'Os nomes seguem o mesmo padrão dos outros cmdlets: Get-ADUser, Get-ADGroup, Get-ADComputer. O prefixo AD indica o módulo.',
  },
  {
    id: 'ad-consultas',
    cat: 'ad',
    title: 'Consultas que encontram pessoas',
    subtitle: 'Filtre, detalhe e relacione.',
    level: 'Prática',
    minutes: 11,
    objective: 'Buscar usuários por identidade ou filtro, auditar contas bloqueadas e investigar grupos e associações.',
    concepts: [
      concept('Identity versus Filter', '-Identity busca um único objeto por login, UPN, DN ou nome. -Filter faz uma consulta e pode devolver várias contas. Use Identity quando sabe exatamente quem procura; Filter quando quer uma lista.'),
      concept('Permissões vêm dos grupos', 'O acesso raramente é dado usuário a usuário. Get-ADGroupMember mostra quem está em um grupo; Get-ADPrincipalGroupMembership mostra todos os grupos de uma pessoa. São perguntas inversas e igualmente úteis.'),
    ],
    examples: [
      example('Detalhes de uma pessoa', 'Get-ADUser -Identity ana.silva -Properties Title, EmailAddress'),
      example('Pessoas de Vendas', 'Get-ADUser -Filter "Department -eq \'Vendas\'"'),
      example('Contas bloqueadas', 'Search-ADAccount -LockedOut'),
      example('Membros do suporte', 'Get-ADGroupMember -Identity TI-Suporte'),
      example('Grupos da Ana', 'Get-ADPrincipalGroupMembership -Identity ana.silva'),
    ],
    tasks: [
      task('ad-consultas-1', 'Consulte ana.silva com cargo e e-mail', 'Use -Identity e -Properties.', 'Get-ADUser -Identity ana.silva -Properties Title, EmailAddress', 'get-aduser[\\s\\S]*identity[\\s\\S]*ana\\.silva'),
      task('ad-consultas-2', 'Encontre usuários do departamento Vendas', 'Use um filtro de Department.', 'Get-ADUser -Filter "Department -eq \'Vendas\'"', 'get-aduser[\\s\\S]*filter[\\s\\S]*vendas'),
      task('ad-consultas-3', 'Liste as contas bloqueadas', 'Use Search-ADAccount -LockedOut.', 'Search-ADAccount -LockedOut', 'search-adaccount[\\s\\S]*lockedout'),
      task('ad-consultas-4', 'Veja os membros do grupo VPN-Users', 'Use Get-ADGroupMember -Identity VPN-Users.', 'Get-ADGroupMember -Identity VPN-Users', 'get-adgroupmember[\\s\\S]*vpn-users'),
      task('ad-consultas-5', 'Descubra todos os grupos da ana.silva', 'Use Get-ADPrincipalGroupMembership.', 'Get-ADPrincipalGroupMembership -Identity ana.silva', 'get-adprincipalgroupmembership[\\s\\S]*ana\\.silva'),
    ],
    tip: 'Em filtros, use aspas simples dentro das aspas duplas: -Filter "Name -like \'*Silva*\'".',
  },
  {
    id: 'ad-criar-conta',
    cat: 'ad',
    title: 'Criar e preparar uma conta',
    subtitle: 'Do zero ao primeiro acesso.',
    level: 'Prática',
    minutes: 12,
    objective: 'Criar uma conta de usuário no domínio, ajustar propriedades e conceder acesso por grupo.',
    concepts: [
      concept('A identidade tem várias partes', 'Name é o nome exibido, SamAccountName é o login curto e UserPrincipalName é o login no formato e-mail. Path define a OU onde a conta nasce. Enabled decide se ela já pode autenticar.'),
      concept('Acesso por grupo', 'A conta não deve receber permissões uma a uma. Crie a pessoa, ajuste as propriedades e adicione-a aos grupos certos. O laboratório mantém tudo simulado e reversível.'),
    ],
    examples: [
      example('Criar a conta', 'New-ADUser -Name "Lara Martins" -SamAccountName lara.martins -UserPrincipalName lara.martins@lab.local -Path "OU=Vendas,OU=Usuários,DC=lab,DC=local" -Enabled $true'),
      example('Definir cargo', 'Set-ADUser -Identity lara.martins -Title "Analista de Vendas"'),
      example('Adicionar à VPN', 'Add-ADGroupMember -Identity VPN-Users -Members lara.martins'),
      example('Conferir a conta', 'Get-ADUser -Identity lara.martins -Properties Title'),
    ],
    tasks: [
      task('ad-criar-1', 'Crie lara.martins na OU Vendas, habilitada', 'Use New-ADUser com Name, SamAccountName, UserPrincipalName, Path e -Enabled $true.', 'New-ADUser -Name "Lara Martins" -SamAccountName lara.martins -UserPrincipalName lara.martins@lab.local -Path "OU=Vendas,OU=Usuários,DC=lab,DC=local" -Enabled $true', 'new-aduser[\\s\\S]*lara\\.martins', {
        verify: (world) => world.ad.users.some((user) => user.SamAccountName === 'lara.martins' && user.OU === 'Vendas'),
      }),
      task('ad-criar-2', 'Defina o cargo de lara.martins', 'Use Set-ADUser com -Title.', 'Set-ADUser -Identity lara.martins -Title "Analista de Vendas"', 'set-aduser[\\s\\S]*lara\\.martins[\\s\\S]*(title|cargo)', {
        verify: (world) => world.ad.users.find((user) => user.SamAccountName === 'lara.martins')?.Title === 'Analista de Vendas',
      }),
      task('ad-criar-3', 'Adicione lara.martins ao grupo VPN-Users', 'Use Add-ADGroupMember com -Members.', 'Add-ADGroupMember -Identity VPN-Users -Members lara.martins', 'add-adgroupmember[\\s\\S]*vpn-users[\\s\\S]*lara\\.martins', {
        verify: (world) => world.ad.groups.find((group) => group.Name === 'VPN-Users')?.Members.includes('lara.martins'),
      }),
      task('ad-criar-4', 'Confirme a conta e o cargo criados', 'Use Get-ADUser -Identity lara.martins -Properties Title.', 'Get-ADUser -Identity lara.martins -Properties Title', 'get-aduser[\\s\\S]*lara\\.martins'),
    ],
    warning: 'Criar contas é uma operação administrativa. Em produção, senhas iniciais devem ser entregues de forma segura e o princípio do menor privilégio deve orientar os grupos.',
  },
  {
    id: 'ad-estrutura',
    cat: 'ad',
    title: 'A estrutura do domínio',
    subtitle: 'OUs, buscas e ciclo de vida.',
    level: 'Desafio',
    minutes: 11,
    objective: 'Organizar objetos em unidades organizacionais e praticar bloqueio, desbloqueio e desativação de contas.',
    concepts: [
      concept('OUs são pastas com semântica', 'Unidades organizacionais organizam objetos e podem receber políticas e delegações. O caminho DN (Distinguished Name) descreve a posição: CN=Lara Martins,OU=Vendas,OU=Usuários,DC=lab,DC=local.'),
      concept('Prefira desativar a apagar', 'Contas raramente devem ser excluídas. Desativar preserva histórico, grupos e auditoria. Desbloquear é diferente de ativar: o bloqueio vem de tentativas de senha; a desativação é uma decisão administrativa.'),
    ],
    examples: [
      example('Listar OUs', 'Get-ADOrganizationalUnit -Filter *'),
      example('Criar uma OU', 'New-ADOrganizationalUnit -Name Marketing -Path "OU=Usuários,DC=lab,DC=local"'),
      example('Buscar dentro de uma OU', 'Get-ADUser -Filter * -SearchBase "OU=TI,OU=Usuários,DC=lab,DC=local"'),
      example('Desbloquear uma conta', 'Unlock-ADAccount -Identity felipe.lima'),
    ],
    tasks: [
      task('ad-estrutura-1', 'Liste todas as unidades organizacionais', 'Use Get-ADOrganizationalUnit -Filter *.', 'Get-ADOrganizationalUnit -Filter *', 'get-adorganizationalunit[\\s\\S]*-filter'),
      task('ad-estrutura-2', 'Crie a OU Marketing dentro de Usuários', 'Passe -Name e -Path.', 'New-ADOrganizationalUnit -Name Marketing -Path "OU=Usuários,DC=lab,DC=local"', 'new-adorganizationalunit[\\s\\S]*marketing', {
        verify: (world) => world.ad.ous.some((ou) => ou.Name === 'Marketing'),
      }),
      task('ad-estrutura-3', 'Desbloqueie a conta de felipe.lima', 'Use Unlock-ADAccount.', 'Unlock-ADAccount -Identity felipe.lima', 'unlock-adaccount[\\s\\S]*felipe\\.lima', {
        verify: (world) => world.ad.users.find((user) => user.SamAccountName === 'felipe.lima')?.LockedOut === false,
      }),
      task('ad-estrutura-4', 'Liste somente os usuários da OU TI', 'Combine -Filter * com -SearchBase.', 'Get-ADUser -Filter * -SearchBase "OU=TI,OU=Usuários,DC=lab,DC=local"', 'get-aduser[\\s\\S]*searchbase[\\s\\S]*ti'),
    ],
    tip: 'Use Get-ADOrganizationalUnit -Filter * antes de criar uma OU para não duplicar estrutura.',
  },
  {
    id: 'rede-diagnostico',
    cat: 'rede',
    title: 'Onde estou na rede?',
    subtitle: 'IP, DNS, ping e portas.',
    level: 'Essencial',
    minutes: 10,
    objective: 'Ler a configuração de rede e diagnosticar conectividade em camadas diferentes.',
    concepts: [
      concept('Três perguntas diferentes', 'Ping testa se um host responde ICMP. Resolve-DnsName traduz nomes em endereços. Test-NetConnection testa uma porta TCP específica. Uma porta fechada pode coexistir com um ping funcionando.'),
      concept('Gateway e DNS', 'O IP da máquina, o gateway padrão e os servidores DNS formam o mapa básico. Sem gateway, você não sai da rede local; sem DNS, nomes não viram endereços.'),
    ],
    examples: [
      example('Configuração completa', 'Get-NetIPConfiguration'),
      example('Adaptadores', 'Get-NetAdapter'),
      example('Ping no controlador', 'Test-Connection SRV-DC01 -Count 2'),
      example('Resolver a intranet', 'Resolve-DnsName intranet.lab.local'),
      example('Testar a porta SMB', 'Test-NetConnection SRV-FILE01 -Port 445'),
    ],
    tasks: [
      task('rede-diag-1', 'Veja a configuração de IP', 'Use Get-NetIPConfiguration.', 'Get-NetIPConfiguration', 'get-netipconfiguration'),
      task('rede-diag-2', 'Faça ping no SRV-DC01', 'Use Test-Connection com -Count.', 'Test-Connection SRV-DC01 -Count 2', 'test-connection[\\s\\S]*srv-dc01'),
      task('rede-diag-3', 'Resolva o nome intranet.lab.local', 'Use Resolve-DnsName.', 'Resolve-DnsName intranet.lab.local', 'resolve-dnsname[\\s\\S]*intranet'),
      task('rede-diag-4', 'Teste a porta 445 do servidor de arquivos', 'Use Test-NetConnection com -Port 445.', 'Test-NetConnection SRV-FILE01 -Port 445', 'test-netconnection[\\s\\S]*srv-file01[\\s\\S]*445'),
    ],
    tip: 'Diagnostique de baixo para cima: cabo/adaptador, IP, gateway, DNS, porta. Cada comando responde uma pergunta diferente.',
  },
  {
    id: 'rede-mapear',
    cat: 'rede',
    title: 'Mapear compartilhamentos',
    subtitle: 'De \\\\servidor\\pasta para Z:.',
    level: 'Prática',
    minutes: 12,
    objective: 'Descobrir compartilhamentos, criar uma unidade de rede persistente e validar o acesso.',
    concepts: [
      concept('Um atalho, não uma cópia', 'Mapear uma unidade cria uma letra local que aponta para um compartilhamento remoto. Os arquivos continuam no servidor. A letra é só uma entrada no perfil do usuário.'),
      concept('Fluxo A → B', 'O caminho UNC \\\\SRV-FILE01\\Financeiro é a origem. Z: é o destino local. O mapeamento persistente sobrevive ao reinício; sem persistência, ele desaparece quando a sessão termina.'),
    ],
    examples: [
      example('Compartilhamentos do laboratório', 'Get-SmbShare'),
      example('Mapeamentos existentes', 'Get-SmbMapping'),
      example('Mapear Financeiro em Z:', 'New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true'),
      example('Validar a unidade', 'Get-ChildItem Z:\\'),
      example('Ver todas as unidades', 'Get-PSDrive'),
    ],
    tasks: [
      task('rede-mapear-1', 'Liste os compartilhamentos disponíveis', 'Use Get-SmbShare.', 'Get-SmbShare', 'get-smbshare'),
      task('rede-mapear-2', 'Veja os mapeamentos atuais', 'Use Get-SmbMapping.', 'Get-SmbMapping', 'get-smbmapping'),
      task('rede-mapear-3', 'Mapeie Financeiro em Z: de forma persistente', 'Use New-SmbMapping com RemotePath, LocalPath e -Persistent $true.', 'New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true', 'new-smbmapping[\\s\\S]*financeiro[\\s\\S]*z:', {
        verify: (world) => world.network.mappings.some((mapping) => mapping.LocalPath === 'Z:' && /financeiro/i.test(mapping.RemotePath)),
      }),
      task('rede-mapear-4', 'Liste o conteúdo de Z:\\', 'A letra mapeada se comporta como uma unidade comum.', 'Get-ChildItem Z:\\', 'get-childitem[\\s\\S]*z:', {
        verify: (world) => world.network.mappings.some((mapping) => mapping.LocalPath === 'Z:'),
      }),
      task('rede-mapear-5', 'Confirme o mapeamento de Z:', 'Use Get-SmbMapping -LocalPath Z:.', 'Get-SmbMapping -LocalPath Z:', 'get-smbmapping[\\s\\S]*z:'),
    ],
    warning: 'Esta trilha foca em criar e auditar mapeamentos. O laboratório também conhece Remove-SmbMapping, mas desconectar uma unidade pode interromper o acesso de quem depende dela. Em produção, confirme com o usuário antes.',
  },
  {
    id: 'sistema-inventario',
    cat: 'sistema',
    title: 'Raio-X do computador',
    subtitle: 'Hardware, sistema e atualizações.',
    level: 'Essencial',
    minutes: 9,
    objective: 'Coletar informações do sistema usando cmdlets de alto nível e CIM/WMI.',
    concepts: [
      concept('Visões prontas e visões cruas', 'Get-ComputerInfo entrega um resumo amigável. Get-CimInstance consulta classes do WMI/CIM e entrega dados mais específicos, como Win32_LogicalDisk. Ambos são objetos que podem ir para o pipeline.'),
      concept('Inventário é evidência', 'Em suporte, o primeiro passo é coletar versão, modelo, memória, discos e atualizações. Dados bem coletados reduzem chutes e tornam o diagnóstico reproduzível.'),
    ],
    examples: [
      example('Resumo do sistema', 'Get-ComputerInfo'),
      example('Informações do SO via CIM', 'Get-CimInstance Win32_OperatingSystem'),
      example('Discos lógicos', 'Get-CimInstance Win32_LogicalDisk'),
      example('Volumes e espaço livre', 'Get-Volume'),
      example('Atualizações instaladas', 'Get-HotFix'),
    ],
    tasks: [
      task('sistema-1', 'Mostre o resumo do computador', 'Use Get-ComputerInfo.', 'Get-ComputerInfo', 'get-computerinfo'),
      task('sistema-2', 'Consulte os discos lógicos com CIM', 'Use Get-CimInstance Win32_LogicalDisk.', 'Get-CimInstance Win32_LogicalDisk', 'get-ciminstance[\\s\\S]*win32_logicaldisk'),
      task('sistema-3', 'Veja o espaço dos volumes', 'Use Get-Volume.', 'Get-Volume', 'get-volume'),
      task('sistema-4', 'Liste as atualizações instaladas', 'Use Get-HotFix.', 'Get-HotFix', 'get-hotfix'),
    ],
    tip: 'CIM é o nome moderno do mundo WMI. As classes Win32_* ainda são muito usadas em inventário e diagnóstico.',
  },
  {
    id: 'registro-explorar',
    cat: 'registro',
    title: 'Explorar o registro',
    subtitle: 'HKCU, HKLM e valores.',
    level: 'Prática',
    minutes: 9,
    objective: 'Navegar pelo provedor de registro e ler valores com segurança.',
    concepts: [
      concept('Dois mundos', 'HKCU: guarda configurações do usuário atual. HKLM: guarda configurações da máquina inteira. Alterar HKLM normalmente exige privilégios administrativos.'),
      concept('Chaves e valores', 'Get-ChildItem lista subchaves. Get-ItemProperty lê os valores dentro de uma chave. Caminhos com espaços precisam de aspas, como "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion".'),
    ],
    examples: [
      example('Raiz do usuário', 'Get-ChildItem HKCU:\\'),
      example('Software do usuário', 'Get-ChildItem HKCU:\\Software'),
      example('Valores do laboratório', 'Get-ItemProperty HKCU:\\Software\\PowerShellLab'),
      example('Versão do Windows', 'Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion"'),
    ],
    tasks: [
      task('registro-explorar-1', 'Liste as chaves dentro de HKCU:\\Software', 'Use Get-ChildItem com esse caminho.', 'Get-ChildItem HKCU:\\Software', 'get-childitem[\\s\\S]*hkcu[\\s\\S]*software'),
      task('registro-explorar-2', 'Leia os valores da chave PowerShellLab', 'Use Get-ItemProperty.', 'Get-ItemProperty HKCU:\\Software\\PowerShellLab', 'get-itemproperty[\\s\\S]*powershelllab'),
      task('registro-explorar-3', 'Leia a versão do Windows em HKLM', 'Coloque o caminho entre aspas por causa do espaço em Windows NT.', 'Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion"', 'get-itemproperty[\\s\\S]*hklm[\\s\\S]*currentversion'),
    ],
    tip: 'Nunca altere chaves do registro sem saber como reverter. Faça backup ou anote o valor anterior — o laboratório mostra o antes e o depois.',
  },
  {
    id: 'registro-alterar',
    cat: 'registro',
    title: 'Alterar com responsabilidade',
    subtitle: 'Antes e depois.',
    level: 'Desafio',
    minutes: 9,
    objective: 'Gravar um valor existente, conferir a mudança e criar uma chave nova no registro.',
    concepts: [
      concept('Um valor de cada vez', 'Set-ItemProperty altera o valor de uma propriedade em uma chave existente. O painel de impacto do laboratório mostra exatamente o antes e o depois.'),
      concept('Criar estrutura', 'New-Item cria uma nova chave de registro quando o caminho usa HKCU: ou HKLM:. Isso é diferente de alterar um valor dentro de uma chave existente.'),
    ],
    examples: [
      example('Mudar o tema', 'Set-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme -Value light'),
      example('Confirmar', 'Get-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme'),
      example('Criar uma chave', 'New-Item -Path HKCU:\\Software\\MeuApp'),
    ],
    tasks: [
      task('registro-alterar-1', 'Mude o valor Theme para light', 'Use Set-ItemProperty com -Path, -Name e -Value.', 'Set-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme -Value light', 'set-itemproperty[\\s\\S]*powershelllab[\\s\\S]*theme[\\s\\S]*light', {
        verify: (world) => world.registry.HKCU.children.Software.children.PowerShellLab.values.Theme === 'light',
      }),
      task('registro-alterar-2', 'Confirme o novo valor de Theme', 'Use Get-ItemProperty com -Name Theme.', 'Get-ItemProperty -Path HKCU:\\Software\\PowerShellLab -Name Theme', 'get-itemproperty[\\s\\S]*powershelllab[\\s\\S]*theme'),
      task('registro-alterar-3', 'Crie a chave HKCU:\\Software\\MeuApp', 'Use New-Item no provedor de registro.', 'New-Item -Path HKCU:\\Software\\MeuApp', 'new-item[\\s\\S]*hkcu[\\s\\S]*meuapp', {
        verify: (world) => Boolean(world.registry.HKCU.children.Software.children.MeuApp),
      }),
    ],
    warning: 'O registro controla o Windows de verdade. Aqui tudo é simulado, mas aplique o mesmo cuidado em produção: saiba o valor anterior e prefira mudanças pequenas.',
  },
  {
    id: 'modulos-galeria',
    cat: 'modulos',
    title: 'Módulos e galeria',
    subtitle: 'Estenda o PowerShell.',
    level: 'Prática',
    minutes: 9,
    objective: 'Ver módulos carregados, pesquisar a galeria, instalar e importar um módulo.',
    concepts: [
      concept('Módulo é um pacote de comandos', 'Módulos agrupam cmdlets e funções. Get-Module mostra o que está carregado; Get-Module -ListAvailable mostra o que está instalado; Find-Module pesquisa a galeria.'),
      concept('Instalar não é importar', 'Install-Module coloca os arquivos no computador. Import-Module carrega os comandos na sessão atual. Em geral, instaladores modernos carregam automaticamente quando você usa um cmdlet.'),
    ],
    examples: [
      example('Módulos carregados', 'Get-Module'),
      example('Tudo instalado', 'Get-Module -ListAvailable'),
      example('Pesquisar na galeria', 'Find-Module ImportExcel'),
      example('Instalar na conta atual', 'Install-Module -Name ImportExcel -Scope CurrentUser'),
      example('Carregar na sessão', 'Import-Module ImportExcel'),
    ],
    tasks: [
      task('modulos-1', 'Liste os módulos carregados', 'Use Get-Module.', 'Get-Module', 'get-module\\s*$'),
      task('modulos-2', 'Pesquise o módulo ImportExcel na galeria', 'Use Find-Module ImportExcel.', 'Find-Module ImportExcel', 'find-module[\\s\\S]*importexcel'),
      task('modulos-3', 'Instale ImportExcel para o usuário atual', 'Use Install-Module com -Scope CurrentUser.', 'Install-Module -Name ImportExcel -Scope CurrentUser', 'install-module[\\s\\S]*importexcel', {
        verify: (world) => world.modules.some((module) => module.Name === 'ImportExcel'),
      }),
      task('modulos-4', 'Importe o módulo para a sessão', 'Use Import-Module ImportExcel.', 'Import-Module ImportExcel', 'import-module[\\s\\S]*importexcel'),
    ],
    tip: 'Prefira módulos assinados e mantenha a galeria oficial como fonte. Em empresas, versões e repositórios podem ser controlados por política.',
  },
  {
    id: 'automacao-tarefas',
    cat: 'automacao',
    title: 'Piloto automático',
    subtitle: 'Tarefas agendadas.',
    level: 'Prática',
    minutes: 10,
    objective: 'Consultar tarefas existentes, registrar uma nova tarefa e executá-la imediatamente.',
    concepts: [
      concept('Ação + gatilho', 'Toda tarefa tem uma ação (o que executar) e um gatilho (quando executar). Register-ScheduledTask reúne esses componentes e cria o objeto no Agendador de Tarefas.'),
      concept('Estado observável', 'Ready significa pronta para o próximo gatilho; Running significa executando agora. Get-ScheduledTaskInfo mostra a última execução e a próxima janela.'),
    ],
    examples: [
      example('Tarefas do laboratório', 'Get-ScheduledTask -TaskPath "\\PSLab\\"'),
      example('Detalhes de uma tarefa', 'Get-ScheduledTaskInfo -TaskName "Backup Financeiro"'),
      example('Criar uma tarefa', 'Register-ScheduledTask -TaskName "Backup Projetos" -Action "powershell.exe -File C:\\Temp\\scripts\\backup.ps1" -Trigger Daily'),
      example('Executar agora', 'Start-ScheduledTask -TaskName "Backup Financeiro"'),
    ],
    tasks: [
      task('automacao-1', 'Liste as tarefas da pasta \\PSLab\\', 'Use Get-ScheduledTask -TaskPath "\\PSLab\\".', 'Get-ScheduledTask -TaskPath "\\PSLab\\"', 'get-scheduledtask[\\s\\S]*pslab'),
      task('automacao-2', 'Veja os detalhes da tarefa Backup Financeiro', 'Use Get-ScheduledTaskInfo.', 'Get-ScheduledTaskInfo -TaskName "Backup Financeiro"', 'get-scheduledtaskinfo[\\s\\S]*backup financeiro'),
      task('automacao-3', 'Registre a tarefa Backup Projetos', 'Use Register-ScheduledTask com -Action e -Trigger.', 'Register-ScheduledTask -TaskName "Backup Projetos" -Action "powershell.exe -File C:\\Temp\\scripts\\backup.ps1" -Trigger Daily', 'register-scheduledtask[\\s\\S]*backup projetos', {
        verify: (world) => world.scheduledTasks.some((item) => item.TaskName === 'Backup Projetos'),
      }),
      task('automacao-4', 'Execute agora a tarefa Backup Financeiro', 'Use Start-ScheduledTask.', 'Start-ScheduledTask -TaskName "Backup Financeiro"', 'start-scheduledtask[\\s\\S]*backup financeiro'),
    ],
    warning: 'Tarefas agendadas persistem no Windows real. Confirme conta de execução, caminho do script e permissões antes de registrá-las.',
  },
  {
    id: 'remoting-sessoes',
    cat: 'remoting',
    title: 'Comandar outra máquina',
    subtitle: 'WinRM, sessões e blocos.',
    level: 'Desafio',
    minutes: 10,
    objective: 'Testar o WinRM, abrir uma sessão remota e executar comandos em outro computador.',
    concepts: [
      concept('A sessão viaja', 'New-PSSession abre uma conexão persistente com outro computador. Get-PSSession mostra o que está aberto. Invoke-Command executa um scriptblock no destino e devolve os objetos para você.'),
      concept('Pré-requisitos reais', 'Em produção, o remoting exige WinRM habilitado, rede, autenticação e permissões. Test-WSMan ajuda a confirmar a parte do serviço antes de culpar o firewall.'),
    ],
    examples: [
      example('Testar WinRM', 'Test-WSMan SRV-DC01'),
      example('Abrir uma sessão', 'New-PSSession -ComputerName SRV-DC01'),
      example('Ver sessões abertas', 'Get-PSSession'),
      example('Executar remoto', 'Invoke-Command -ComputerName SRV-DC01 -ScriptBlock { Get-Date }'),
    ],
    tasks: [
      task('remoting-1', 'Teste o WinRM do SRV-DC01', 'Use Test-WSMan SRV-DC01.', 'Test-WSMan SRV-DC01', 'test-wsman[\\s\\S]*srv-dc01'),
      task('remoting-2', 'Abra uma sessão com o SRV-DC01', 'Use New-PSSession.', 'New-PSSession -ComputerName SRV-DC01', 'new-pssession[\\s\\S]*srv-dc01', {
        verify: (world) => world.sessions.some((session) => session.ComputerName === 'SRV-DC01'),
      }),
      task('remoting-3', 'Liste as sessões abertas', 'Use Get-PSSession.', 'Get-PSSession', 'get-pssession'),
      task('remoting-4', 'Rode Get-Date no SRV-DC01', 'Use Invoke-Command com um scriptblock.', 'Invoke-Command -ComputerName SRV-DC01 -ScriptBlock { Get-Date }', 'invoke-command[\\s\\S]*srv-dc01[\\s\\S]*get-date'),
    ],
    tip: 'Trate remoting como qualquer acesso administrativo: mínimo necessário, credenciais protegidas e registro do que foi feito.',
  },
  {
    id: 'seguranca-politica',
    cat: 'seguranca',
    title: 'Política de execução',
    subtitle: 'Permissão para rodar scripts.',
    level: 'Prática',
    minutes: 8,
    objective: 'Entender os escopos da política, verificar assinaturas e interpretar o que bloqueia um script.',
    concepts: [
      concept('Uma decisão por escopo', 'A política pode ser definida em MachinePolicy, UserPolicy, Process, CurrentUser e LocalMachine. O PowerShell efetivo escolhe a mais restritiva. Ela controla scripts, não a digitação interativa.'),
      concept('Assinatura é proveniência', 'Get-AuthenticodeSignature mostra se um script tem assinatura válida. AllSigned exige que todo script seja assinado; RemoteSigned libera scripts locais, mas exige assinatura dos baixados da internet.'),
    ],
    examples: [
      example('Política por escopo', 'Get-ExecutionPolicy -List'),
      example('Política efetiva', 'Get-ExecutionPolicy'),
      example('Assinatura do script', 'Get-AuthenticodeSignature C:\\Temp\\scripts\\backup.ps1'),
    ],
    tasks: [
      task('seguranca-politica-1', 'Veja a política em todos os escopos', 'Use Get-ExecutionPolicy -List.', 'Get-ExecutionPolicy -List', 'get-executionpolicy[\\s\\S]*list'),
      task('seguranca-politica-2', 'Mostre a política efetiva', 'Use Get-ExecutionPolicy sem parâmetros.', 'Get-ExecutionPolicy', 'get-executionpolicy\\s*$'),
      task('seguranca-politica-3', 'Verifique a assinatura de backup.ps1', 'Use Get-AuthenticodeSignature com o caminho completo.', 'Get-AuthenticodeSignature C:\\Temp\\scripts\\backup.ps1', 'get-authenticodesignature[\\s\\S]*backup\\.ps1'),
    ],
    warning: 'Evite usar Bypass como solução permanente. Prefira RemoteSigned, assinatura confiável e escopo CurrentUser para scripts pessoais.',
  },
  {
    id: 'seguranca-contas-locais',
    cat: 'seguranca',
    title: 'Contas locais',
    subtitle: 'Fora do domínio, dentro da máquina.',
    level: 'Prática',
    minutes: 9,
    objective: 'Diferenciar contas locais de contas do AD, criar uma conta local e adicioná-la a um grupo.',
    concepts: [
      concept('AD x local', 'Uma conta do Active Directory autentica no domínio e pode acessar vários sistemas. Uma conta local vive só nesta máquina. O laboratório tem os dois modelos para você comparar.'),
      concept('Grupos definem poder', 'Adicionar uma conta ao grupo Usuários dá acesso padrão; Administradores dá controle da máquina. Sempre escolha o menor privilégio que resolve o problema.'),
    ],
    examples: [
      example('Contas locais', 'Get-LocalUser'),
      example('Grupos locais', 'Get-LocalGroup'),
      example('Criar uma conta', 'New-LocalUser -Name estagiario -FullName "Novo Estagiário" -Description "Conta de aprendizado"'),
      example('Adicionar ao grupo Usuários', 'Add-LocalGroupMember -Group Usuários -Member estagiario'),
      example('Conferir membros', 'Get-LocalGroupMember -Group Usuários'),
    ],
    tasks: [
      task('seguranca-local-1', 'Liste as contas locais da máquina', 'Use Get-LocalUser.', 'Get-LocalUser', 'get-localuser'),
      task('seguranca-local-2', 'Crie a conta local estagiario', 'Use New-LocalUser com nome e descrição.', 'New-LocalUser -Name estagiario -FullName "Novo Estagiário" -Description "Conta de aprendizado"', 'new-localuser[\\s\\S]*estagiario', {
        verify: (world) => world.localUsers.some((user) => user.Name === 'estagiario'),
      }),
      task('seguranca-local-3', 'Adicione estagiario ao grupo Usuários', 'Use Add-LocalGroupMember.', 'Add-LocalGroupMember -Group Usuários -Member estagiario', 'add-localgroupmember[\\s\\S]*estagiario', {
        verify: (world) => world.localGroups.find((group) => group.Name === 'Usuários')?.Members.includes('estagiario'),
      }),
      task('seguranca-local-4', 'Confirme os membros do grupo Usuários', 'Use Get-LocalGroupMember -Group Usuários.', 'Get-LocalGroupMember -Group Usuários', 'get-localgroupmember[\\s\\S]*usuários?' ),
    ],
    tip: 'Em um domínio, normalmente você gerencia identidades com os cmdlets AD, não com os cmdlets de contas locais.',
  },
  {
    id: 'relatorios-csv',
    cat: 'relatorios',
    title: 'CSV: planilhas na veia',
    subtitle: 'Objetos viram linhas.',
    level: 'Prática',
    minutes: 10,
    objective: 'Importar, transformar e exportar dados em CSV usando o pipeline.',
    concepts: [
      concept('CSV é uma tabela achatada', 'Cada linha vira um objeto; o cabeçalho define as propriedades. Import-Csv e Export-Csv fazem a ponte entre arquivos e objetos do PowerShell.'),
      concept('Um pipeline, três etapas', 'Consultar (Get-ADUser), escolher colunas (Select-Object) e salvar (Export-Csv). Se você exportar objetos complexos sem selecionar, o CSV pode ficar com colunas irrelevantes.'),
    ],
    examples: [
      example('Ler vendas', 'Import-Csv .\\Documentos\\relatorio-vendas.csv'),
      example('Exportar usuários do AD', 'Get-ADUser -Filter * | Select-Object Name, SamAccountName, Department, Enabled | Export-Csv .\\Documentos\\usuarios.csv -NoTypeInformation'),
      example('Reimportar o relatório', 'Import-Csv .\\Documentos\\usuarios.csv'),
      example('Medir linhas importadas', 'Import-Csv .\\Documentos\\relatorio-vendas.csv | Measure-Object'),
    ],
    tasks: [
      task('relatorios-csv-1', 'Leia o relatório de vendas em CSV', 'Use Import-Csv com o caminho.', 'Import-Csv .\\Documentos\\relatorio-vendas.csv', 'import-csv[\\s\\S]*relatorio-vendas'),
      task('relatorios-csv-2', 'Exporte nome, login, departamento e status dos usuários do AD', 'Selecione as colunas e use Export-Csv -NoTypeInformation.', 'Get-ADUser -Filter * | Select-Object Name, SamAccountName, Department, Enabled | Export-Csv .\\Documentos\\usuarios.csv -NoTypeInformation', 'export-csv[\\s\\S]*usuarios\\.csv', {
        verify: (world) => Boolean(findWorldNode(world, ['Users', 'miguel', 'Documentos', 'usuarios.csv'])),
      }),
      task('relatorios-csv-3', 'Reimporte o arquivo usuarios.csv', 'Import-Csv transforma cada linha em objeto.', 'Import-Csv .\\Documentos\\usuarios.csv', 'import-csv[\\s\\S]*usuarios\\.csv'),
      task('relatorios-csv-4', 'Conte os registros do relatório de vendas', 'Combine Import-Csv com Measure-Object.', 'Import-Csv .\\Documentos\\relatorio-vendas.csv | Measure-Object', 'import-csv[\\s\\S]*relatorio-vendas[\\s\\S]*measure-object'),
    ],
    tip: 'CSV não preserva tipos complexos nem relações. Para estruturas aninhadas, JSON costuma ser melhor.',
  },
  {
    id: 'relatorios-json',
    cat: 'relatorios',
    title: 'JSON e estruturas',
    subtitle: 'Dados que APIs entendem.',
    level: 'Prática',
    minutes: 8,
    objective: 'Converter objetos em JSON e JSON em objetos, incluindo leitura de arquivo bruto.',
    concepts: [
      concept('Serializar e desserializar', 'ConvertTo-Json transforma objetos em texto JSON. ConvertFrom-Json faz o caminho inverso. É o que você usa ao consumir APIs e salvar configurações.'),
      concept('Raw muda tudo', 'Get-Content sem -Raw devolve linhas; ConvertFrom-Json espera o documento completo. Use -Raw antes de converter um arquivo JSON.'),
    ],
    examples: [
      example('Ler o inventário JSON', 'Get-Content .\\Documentos\\inventario.json -Raw | ConvertFrom-Json'),
      example('Serializar processos', 'Get-Process | Select-Object -First 2 ProcessName, CPU | ConvertTo-Json'),
      example('Ver o texto JSON', 'Get-Content .\\Documentos\\inventario.json -Raw'),
    ],
    tasks: [
      task('relatorios-json-1', 'Leia inventario.json como objeto', 'Use Get-Content -Raw e ConvertFrom-Json.', 'Get-Content .\\Documentos\\inventario.json -Raw | ConvertFrom-Json', 'inventario[\\s\\S]*convertfrom-json'),
      task('relatorios-json-2', 'Converta os dois primeiros processos em JSON', 'Selecione ProcessName e CPU e use ConvertTo-Json.', 'Get-Process | Select-Object -First 2 ProcessName, CPU | ConvertTo-Json', 'get-process[\\s\\S]*convertto-json'),
      task('relatorios-json-3', 'Veja o JSON bruto do inventário', 'Use Get-Content com -Raw.', 'Get-Content .\\Documentos\\inventario.json -Raw', 'get-content[\\s\\S]*inventario[\\s\\S]*raw'),
    ],
    tip: 'Ao chamar APIs, Invoke-RestMethod já converte JSON automaticamente. ConvertFrom-Json é mais útil para arquivos e textos.',
  },
  {
    id: 'erros-entender',
    cat: 'erros',
    title: 'Erros que ensinam',
    subtitle: 'Ler, suprimir e investigar.',
    level: 'Prática',
    minutes: 9,
    objective: 'Provocar um erro, controlar a exibição com -ErrorAction e investigar o histórico de erros da sessão.',
    concepts: [
      concept('Erros são mensagens, não fracassos', 'O PowerShell registra erros em $Error. -ErrorAction altera o comportamento: SilentlyContinue esconde a exibição, Stop transforma em erro terminante, Continue mantém o padrão.'),
      concept('Trate o que pode falhar', 'Em scripts, use try/catch para ações que podem falhar e -ErrorAction Stop para garantir que o catch seja acionado. O laboratório mostra o erro para você aprender a reconhecer o formato.'),
    ],
    examples: [
      example('Provocar um erro de caminho', 'Get-Item C:\\nao-existe.txt'),
      example('Esconder a mensagem', 'Get-Item C:\\nao-existe.txt -ErrorAction SilentlyContinue'),
      example('Ver o último erro guardado', '$Error'),
      example('Ler o tópico de tratamento', 'Get-Help about_Try_Catch_Finally'),
    ],
    tasks: [
      task('erros-1', 'Tente acessar um caminho inexistente', 'Use Get-Item C:\\nao-existe.txt e observe a mensagem.', 'Get-Item C:\\nao-existe.txt', 'get-item[\\s\\S]*nao-existe', { allowFailure: true }),
      task('erros-2', 'Repita o comando suprimindo a mensagem', 'Use -ErrorAction SilentlyContinue.', 'Get-Item C:\\nao-existe.txt -ErrorAction SilentlyContinue', 'erroraction[\\s\\S]*silentlycontinue'),
      task('erros-3', 'Inspecione o array automático de erros', 'Digite a variável $Error.', '$Error', '\\$error'),
      task('erros-4', 'Leia a ajuda sobre try/catch/finally', 'Use o tópico about_Try_Catch_Finally.', 'Get-Help about_Try_Catch_Finally', 'about_try_catch_finally'),
    ],
    tip: 'Leia a mensagem de erro até o fim. O PowerShell costuma dizer exatamente qual caminho, comando ou propriedade não encontrou.',
  },
  {
    id: 'variaveis-guardar',
    cat: 'variaveis',
    title: 'Guardar valores',
    subtitle: 'Variáveis e contas.',
    level: 'Essencial',
    minutes: 9,
    objective: 'Criar variáveis, interpolar strings, fazer operações e guardar o resultado de um comando.',
    concepts: [
      concept('Uma caixa com nome', 'Variáveis começam com $. $nome = "Ana" guarda um texto; $a = 7 guarda um número. O sinal = atribui, não compara. Para comparar, use -eq.'),
      concept('Resultados também são valores', 'Você pode guardar objetos inteiros: $processos = Get-Process. Depois, use $processos.Count ou envie a variável pelo pipeline. Variáveis desaparecem quando a sessão termina.'),
    ],
    examples: [
      example('Criar uma string', '$nome = "Ana"'),
      example('Interpolar', '"Olá, $nome!"'),
      example('Fazer contas', '$a = 7; $b = 3; $a * $b'),
      example('Guardar objetos', '$processos = Get-Process'),
      example('Contar o que foi guardado', '$processos.Count'),
    ],
    tasks: [
      task('variaveis-1', 'Guarde o nome Ana na variável $nome', 'Use $nome = "Ana".', '$nome = "Ana"', '\\$nome\\s*=\\s*["\\\']ana', {
        verify: (world) => String(world.variables.nome ?? '').toLowerCase() === 'ana',
      }),
      task('variaveis-2', 'Mostre uma saudação interpolando $nome', 'Coloque a variável dentro de aspas duplas.', '"Olá, $nome!"', '"[^"]*\\$nome'),
      task('variaveis-3', 'Calcule 7 vezes 3 usando variáveis', 'Atribua $a e $b e multiplique.', '$a = 7; $b = 3; $a * $b', '\\$a\\s*\\*\\s*\\$b'),
      task('variaveis-4', 'Guarde todos os processos em $processos', 'Atribua o resultado de Get-Process.', '$processos = Get-Process', '\\$processos\\s*=\\s*get-process', {
        verify: (world) => Array.isArray(world.variables.processos) && world.variables.processos.length > 0,
      }),
      task('variaveis-5', 'Mostre quantos processos foram guardados', 'Use a propriedade Count da variável.', '$processos.Count', '\\$processos\\.count'),
    ],
    tip: 'Use nomes descritivos. $p pode ser qualquer coisa; $processosDoChrome diz exatamente o que está ali.',
  },
  {
    id: 'ambiente-sessao',
    cat: 'ambiente',
    title: 'Ambiente e histórico',
    subtitle: 'O contexto da sessão.',
    level: 'Essencial',
    minutes: 7,
    objective: 'Explorar variáveis de ambiente, a versão do PowerShell e o histórico da sessão.',
    concepts: [
      concept('O ambiente é um provedor', 'Env: expõe variáveis de ambiente como itens. $env:USERNAME lê uma delas diretamente. Alterações na sessão não mudam o sistema de forma permanente aqui.'),
      concept('A sessão tem memória', 'Get-History lista os comandos desta janela. $PSVersionTable informa a versão e a edição do PowerShell. Esses dados ajudam a reproduzir problemas.'),
    ],
    examples: [
      example('Listar o ambiente', 'Get-ChildItem Env:'),
      example('Usuário atual', '$env:USERNAME'),
      example('Versão do PowerShell', '$PSVersionTable'),
      example('Variáveis da sessão', 'Get-Variable'),
      example('Histórico', 'Get-History'),
    ],
    tasks: [
      task('ambiente-1', 'Liste as variáveis de ambiente', 'Use Get-ChildItem no provedor Env:.', 'Get-ChildItem Env:', 'get-childitem[\\s\\S]*env:'),
      task('ambiente-2', 'Mostre o usuário atual', 'Leia $env:USERNAME.', '$env:USERNAME', '\\$env:username'),
      task('ambiente-3', 'Descubra a versão do PowerShell', 'Use a variável automática $PSVersionTable.', '$PSVersionTable', 'psversiontable'),
      task('ambiente-4', 'Veja o histórico da sessão', 'Use Get-History.', 'Get-History', 'get-history'),
    ],
    tip: 'Perfis ($PROFILE) carregam configurações a cada sessão. Em produção, trate o perfil como código: versionado e revisado.',
  },
]

export const LESSON_MAP = new Map(LESSONS.map((lesson) => [lesson.id, lesson]))
export const LESSONS_BY_CATEGORY = LESSONS.reduce((accumulator, lesson) => {
  if (!accumulator[lesson.cat]) accumulator[lesson.cat] = []
  accumulator[lesson.cat].push(lesson)
  return accumulator
}, {})

function findWorldNode(world, segments) {
  let node = world.filesystem?.['C:']
  for (const segment of segments) {
    if (!node?.children) return null
    node = node.children.find((child) => child.name.toLowerCase() === segment.toLowerCase())
  }
  return node ?? null
}

export function lessonTaskCount(lesson) {
  return lesson?.tasks?.length ?? 0
}

export function lessonCompletedCount(lesson, completedTasks) {
  if (!lesson) return 0
  return lesson.tasks.filter((item) => completedTasks[item.id]).length
}
