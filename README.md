# PS Lab — PowerShell, por dentro

Um laboratório interativo para aprender PowerShell **vendo cada comando virar um fluxo**.

O PS Lab combina um console com sugestões em tempo real, um grafo no estilo N8N que mostra origem → etapas → destino, um mundo simulado com Active Directory e um mapa visual do impacto antes de qualquer alteração.

![PS Lab mostrando a intenção "get add user" virando um fluxo de criação de usuário no Active Directory](docs/pslab-overview.png)

## O que já funciona

- **Editor com sugestões contextuais** — comandos, parâmetros, valores, próximas etapas de pipeline e intenções em linguagem natural.
- **Ghost text** — complete o comando com `Tab` enquanto digita.
- **Intenções** — frases como `get add user`, `mapear unidade de rede` ou `contas bloqueadas` apontam para um cmdlet executável.
- **Radiografia do comando** — cada etapa do pipeline aparece como um bloco do grafo, com contagem de objetos, parâmetros e erros.
- **Impacto antes/depois** — cartões visuais para criação de usuários no AD, mapeamento de unidades, mudanças no registro, serviços, tarefas, arquivos e mais.
- **29 trilhas guiadas em 17 categorias** — 111 tarefas validadas por padrão de comando e, quando necessário, pelo estado real do mundo simulado.
- **Mundo simulado navegável** — domínio `lab.local`, pessoas, grupos, computadores, árvore de arquivos, compartilhamentos e unidades mapeadas.
- **Persistência local** — progresso, mundo e histórico ficam no navegador; nada vai para um servidor.
- **Sem execução real** — todos os comandos rodam em um simulador JavaScript. Nenhum arquivo, conta ou serviço do seu computador é alterado.

![Explorador do mundo simulado na aba de rede, com mapeamento A → B](docs/pslab-world.png)

## Rodar o laboratório

Requisito: **Node.js 20 ou superior**.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

O projeto é escrito em **JavaScript puro + JSX** e roda direto no servidor de desenvolvimento do Vite, com atualização instantânea (HMR). Não existe etapa manual de compilação para testar. O `npm run build` é opcional, apenas para gerar uma versão de produção.

### Testes

```bash
npm test     # 559 verificações das trilhas, simulador, intenções e sugestões
npm run build
```

Ou os dois de uma vez:

```bash
npm run check
```

## Categorias

| Categoria | O que você pratica |
| --- | --- |
| Primeiros passos | Orientação, ajuda e descoberta de comandos |
| Arquivos & pastas | Navegação, criação, cópia, movimentação e remoção segura |
| Texto & conteúdo | Leitura, escrita e busca com `Select-String` |
| Objetos & pipeline | `Where-Object`, `Select-Object`, `Sort-Object`, `Measure-Object`, `ForEach-Object`, `Group-Object` |
| Sistema & hardware | `Get-ComputerInfo`, CIM/WMI, volumes e atualizações |
| Processos & serviços | Inspeção, consumo, encerramento e controle de serviços |
| Active Directory | Domínio, usuários, grupos, computadores, OUs, filtros e ciclo de vida de contas |
| Rede & compartilhamentos | IP, DNS, rotas, ping, portas, SMB e mapeamento de unidades |
| Registro do Windows | HKCU, HKLM, leitura e alteração de valores |
| Módulos & galeria | Módulos carregados, galeria, instalação e importação |
| Automação agendada | Tarefas, gatilhos e execução imediata |
| Remoting | WinRM, sessões remotas e `Invoke-Command` |
| Segurança & contas | Política de execução, assinaturas e contas locais |
| Dados & relatórios | CSV, JSON e pipelines que geram relatórios |
| Erros & depuração | Mensagens, `$Error`, `-ErrorAction` e try/catch |
| Variáveis & operadores | Variáveis, interpolação, contas e objetos guardados |
| Ambiente & perfil | Variáveis de ambiente, versão, histórico e sessão |

## Active Directory no laboratório

O domínio é fictício, mas a mecânica é a mesma:

```powershell
Get-ADDomain
Get-ADUser -Filter *
Get-ADUser -Filter "Department -eq 'Vendas'"
Get-ADGroupMember -Identity TI-Suporte
Search-ADAccount -LockedOut
Unlock-ADAccount -Identity felipe.lima
New-ADUser -Name "Lara Martins" -SamAccountName lara.martins `
  -UserPrincipalName lara.martins@lab.local `
  -Path "OU=Vendas,OU=Usuários,DC=lab,DC=local" -Enabled $true
Add-ADGroupMember -Identity VPN-Users -Members lara.martins
```

Cada execução atualiza o explorador **Mundo** e o painel de impacto. As quatro trilhas de Active Directory vão de exploração e filtros até criação de conta, grupos e organização por OUs.

## Rede e mapeamentos

A trilha de rede mostra o fluxo A → B com clareza:

```powershell
Get-SmbShare
Get-SmbMapping
New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true
Get-ChildItem Z:\
Get-PSDrive
```

O foco é **criar, entender e auditar** mapeamentos. O laboratório também conhece `Remove-SmbMapping`, mas a trilha evita transformar desconexão em rotina e destaca o impacto no painel.

## Como as sugestões pensam

1. **Intenção** — normaliza português/inglês, sinônimos e verbos (`adicionar`, `add`, `criar`, `mapear`) e encontra um cmdlet executável.
2. **Comando** — busca fuzzy por nome, alias e substantivo.
3. **Parâmetro** — prioriza obrigatórios que ainda faltam e mostra a descrição.
4. **Valor** — usa dados do mundo simulado (usuários, grupos, processos, serviços, compartilhamentos, OUs).
5. **Próxima etapa** — sugere filtros, ordenação, projeção, medição e verificação de impacto.

O `Tab` aceita o texto fantasma. Clique em qualquer cartão de sugestão para inseri-lo no console. O comando continua no editor depois de executado, então você pode iterar e adicionar o próximo pipe.

## Atalhos

| Tecla | Ação |
| --- | --- |
| `Enter` | Executar o comando |
| `Tab` | Aceitar ghost text / sugestão inline |
| `↑` `↓` | Navegar no histórico da sessão |
| `Esc` | Sair do editor ou fechar um modal |

## Estrutura

```text
src/
  components/        interface: console, fluxo, modais, trilhas, mundo
  data/
    catalog.js       catálogo de 124 cmdlets simulados + metadados
    intents.js       intenções em linguagem natural
    lessons.js       29 aulas, 111 tarefas e verificações de estado
    seed.js          mundo inicial: filesystem, AD, rede, registro
  editor/            linguagem PowerShell para o CodeMirror
  engine/
    parser.js        pipelines, strings, parâmetros e scriptblocks
    simulator.js     executor simulado e efeitos visuais
    suggestions.js   intenções, completions, ghosts e próximos passos
  App.jsx            estado da sessão, progresso e integração
  styles.css         design system e layout responsivo
scripts/test.mjs     suíte de verificação sem compilação
docs/                capturas usadas neste README
```

## Limites e próximos passos

- A execução é **simulada e intencionalmente segura**. Ainda não há integração com um `pwsh` local.
- O catálogo cobre 124 cmdlets; novos módulos podem ser adicionados em `src/data/catalog.js` e no simulador.
- O mundo e o progresso ficam no `localStorage`; limpar os dados do site reinicia o laboratório.
- Roadmap natural: runner local opcional com PowerShell real e confirmação, mais objetos de AD, auditoria de eventos, certificados, jobs e Microsoft Graph.

## Repositório

[github.com/MiguelSilvaPorto/powershell-lab](https://github.com/MiguelSilvaPorto/powershell-lab)

Este projeto é um laboratório pessoal de aprendizagem construído em JavaScript, com foco em clareza visual do modelo de objetos e do pipeline do PowerShell.
