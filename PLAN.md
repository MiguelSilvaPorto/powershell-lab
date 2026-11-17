# Plano vivo — PS Lab

Este arquivo concentra as ideias e pedidos do projeto. A fase atual é de **coleta e organização**: as ideias são detalhadas aqui antes de virarem implementação, para evitar retrabalho e manter o escopo claro.

## Como cada pedido entra no plano

Cada item deve responder:

- **Desejo**: o que o usuário quer conseguir fazer.
- **Fluxo**: como isso aparece no console, no painel direito ou na biblioteca.
- **Exemplo real**: um comando ou situação concreta.
- **Dependências**: catálogo, simulador, modo real, atalhos, UI.
- **Critérios de aceite**: o que precisa funcionar para considerar pronto.
- **Risco**: apenas simulação, leitura real ou alteração real no PC.

## Backlog atual

### 1. Receitas e junções no catálogo

**Status:** planejado, não iniciado.

**Desejo:** ao combinar uma listagem com uma ação, o app mostrar uma junção explicando o encadeamento e sugerir comandos praticamente prontos.

**Exemplo:**

1. `Get-Process` → listar processos.
2. Escolher `chrome`.
3. Escolher uma ação: encerrar, aumentar prioridade, iniciar com o Windows, aguardar, monitorar ou exportar.
4. O app monta o comando final, mostra o impacto e permite executar ou salvar como atalho.

**Primeira entrega sugerida:**

- `Get-Process` + encerrar: `Get-Process -Name chrome | Stop-Process`.
- `Get-Process` + prioridade: `Get-Process -Name chrome | ForEach-Object { $_.PriorityClass = 'High' }`.
- `Get-Process` + monitorar: `Get-Process -Name chrome | Select-Object Name, CPU, WorkingSet, Responding`.
- `Get-Process` + inicialização automática: chave `Run` do usuário ou tarefa agendada.

**Critérios de aceite:**

- O painel mostra “primeiro listar, depois escolher, depois agir”.
- A lista de processos vem do simulador ou do PC real.
- O comando final é exibido antes de executar.
- Ações destrutivas têm confirmação e impacto visível.
- A receita pode ser salva como atalho.

### 2. Diretório atual no topo do console

**Status:** planejado, não iniciado.

**Desejo:** mostrar claramente o diretório atual na parte superior do console, como um diretório padrão de terminal, sem substituir o placeholder “Digite um comando ou descreva o que você quer fazer…”.

**Comportamento esperado:**

- Uma faixa acima do campo de entrada com ícone de pasta, caminho atual e indicação de modo (`simulado` ou `meu PC`).
- O caminho acompanha `Set-Location` no simulador e a pasta real no modo **Meu PC**.
- O placeholder do editor permanece intacto.
- Caminhos longos são encurtados com tooltip mostrando o caminho completo.

### 3. Busca semântica de comandos

**Status:** planejado, não iniciado.

**Desejo:** digitar uma intenção como “criar pasta” e receber não só um comando, mas todas as peças que podem fazer parte daquela tarefa.

**Exemplo para “criar pasta”:**

- `New-Item -Path .\Documentos\novo-projeto -ItemType Directory` — criar.
- `Set-Location .\Documentos\novo-projeto` — entrar.
- `Test-Path .\Documentos\novo-projeto` — verificar.
- `Get-ChildItem .\Documentos\novo-projeto` — listar o conteúdo.
- `Rename-Item`, `Copy-Item` e `Remove-Item` — etapas relacionadas.

**Critérios de aceite:**

- A busca entende ações e sinônimos em português (“criar”, “nova”, “pasta”, “diretório”, “mkdir”).
- As sugestões são agrupadas por papel: criar, entrar, conferir, listar, gerenciar.
- Cada cartão mostra o comando, uma explicação curta e o que será inserido no console.
- Uma sugestão pode ser aplicada diretamente ou usada como base para um atalho.
- A busca não depende de o comando já estar no histórico.

### 4. Auditoria de arquivos .bat e .ps1

**Status:** planejado, não iniciado. Requer uma etapa de análise estática antes de qualquer execução.

**Desejo:** carregar um arquivo `.bat`, `.cmd` ou `.ps1`, ler todas as linhas, explicar exatamente o que cada parte faz, montar o fluxo completo e destacar riscos críticos **antes** de executar. A execução, quando existir, deve acontecer em ambiente isolado.

**Exemplo de fluxo:**

```bat
git clone https://github.com/exemplo/projeto.git
cd projeto
del /s /q *
git push --force
```

O app deveria explicar:

1. Clona um repositório remoto.
2. Entra na pasta criada.
3. Apaga todo o conteúdo local do projeto de forma recursiva e sem confirmação.
4. Tenta sobrescrever o histórico remoto com um push forçado.

E destacar:

- **Perda de dados:** o `del /s /q` remove arquivos sem lixeira e sem confirmação.
- **Git destrutivo:** `push --force` pode reescrever o histórico remoto.
- **Ordem crítica:** a exclusão acontece depois do clone; o repositório local será apagado.
- **Incerteza:** se o clone falhar, o `cd` pode ocorrer na pasta errada; o app deve avisar que o efeito depende do estado anterior.

**Comportamento esperado na interface:**

- Área de importação por botão ou arrastar e soltar.
- Lista de linhas com número, comando original e explicação em português.
- Grafo do fluxo: etapas sequenciais, condicionais, loops, chamadas de outros scripts e comandos externos.
- Cartões de risco separados por severidade: informação, atenção, perigoso e crítico.
- Resumo executivo no topo: “o que este arquivo faz”, “o que ele altera”, “o que pode dar errado”.
- Botão **Executar no simulador** sempre disponível.
- Botão de execução real bloqueado até o usuário revisar os riscos e confirmar o ambiente isolado.

**Riscos que a análise deve detectar:**

- **Sistema de arquivos:** `del`, `rd`, `rmdir /s`, `Remove-Item -Recurse -Force`, `format`, `diskpart`, `cipher /w`, exclusão de pastas do usuário.
- **Git:** `reset --hard`, `clean -fdx`, `push --force`, remoção de branches, alteração de remotes.
- **Download e execução:** `curl | bash`, `iwr | iex`, `Invoke-Expression`, `-EncodedCommand`, `certutil -urlcache`, `bitsadmin`.
- **Persistência:** chaves `Run`, `schtasks`, serviços, pasta Startup, tarefas agendadas.
- **Contas e permissões:** criação ou remoção de usuários, alteração de senhas, elevação de privilégio, ACLs.
- **Rede:** uploads, conexões remotas, SMB, WinRM, alteração de firewall.
- **Ofuscação:** Base64, concatenação de strings, variáveis que escondem caminhos ou comandos.

**Limites que precisam ser explícitos:**

- Análise estática não consegue prever com certeza valores que só existem em tempo de execução (variáveis de ambiente, respostas de rede, conteúdo de arquivos).
- Comandos externos e binários chamados pelo script podem ter efeitos desconhecidos.
- `.bat` depende do `cmd.exe`; em Linux não existe execução nativa equivalente. A primeira versão deve simular a semântica das linhas e marcar o que não for interpretável.
- “Ambiente isolado” não é o mesmo que “seguro”: o app deve mostrar o nível de isolamento real usado.

**Estratégia de execução segura, em fases:**

1. **Análise estática e explicação** — sem executar nada.
2. **Simulação no mundo do PS Lab** — executa apenas os comandos suportados pelo simulador.
3. **Execução isolada de PowerShell** — contêiner descartável, sem rede e sem acesso à pasta pessoal, com timeout e saída limitada.
4. **Arquivos `.bat` reais** — somente em ambiente Windows isolado (Windows Sandbox ou VM descartável), nunca no host.

**Critérios de aceite:**

- O arquivo é lido por completo, incluindo comentários, labels, condicionais e blocos.
- Cada linha relevante tem explicação e nível de confiança.
- O resumo destaca a ação mais perigosa antes das ações secundárias.
- Nenhum arquivo é executado durante a análise.
- A execução simulada não toca no PC.
- A execução real exige confirmação explícita e ambiente isolado identificado.
- O relatório pode ser salvo ou exportado.

### 5. Detecção de loops e top 10 de CPU

**Status:** planejado, não iniciado. Corrige um caso concreto em que `"loop"` foi tratado como argumento e não gerou sugestão de repetição.

**Desejo:** quando o usuário escrever algo como:

```powershell
Get-Process | Where-Object { $_.CPU -gt 10 } "loop"
```

o app deve entender que `loop` é uma **intenção de repetição**, remover esse modificador da interpretação do comando e sugerir loops prontos, com aviso de consumo de CPU.

Também deve existir uma sugestão direta para os **10 processos que mais consomem CPU**:

```powershell
Get-Process |
  Sort-Object CPU -Descending |
  Select-Object -First 10 ProcessName, CPU, WorkingSet
```

**Sugestões de loop que o app deve oferecer:**

1. **Loop com intervalo — recomendado**

```powershell
while ($true) {
  Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
  Start-Sleep -Seconds 2
}
```

2. **Loop instantâneo — risco de alto consumo**

```powershell
while ($true) {
  Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
}
```

Aviso: sem `Start-Sleep`, o loop pode consumir um núcleo inteiro da CPU. Deve aparecer como ação de risco e sugerir intervalo em segundos.

3. **Loop controlado — repete algumas vezes e para**

```powershell
1..5 | ForEach-Object {
  Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
  Start-Sleep -Seconds 2
}
```

4. **Loop enquanto houver processo**

```powershell
while (Get-Process -Name chrome -ErrorAction SilentlyContinue) {
  Get-Process -Name chrome | Select-Object ProcessName, CPU, WorkingSet
  Start-Sleep -Seconds 5
}
```

**Comportamento esperado:**

- `loop`, `repetir`, `infinito`, `continuamente`, `monitorar` e `a cada X segundos` são reconhecidos como modificadores de repetição.
- O token de loop não aparece como argumento no comando final.
- O painel mostra a diferença entre loop instantâneo e loop com intervalo.
- O cartão do loop instantâneo exibe alerta de CPU.
- O cartão recomendado já inclui `Start-Sleep -Seconds 2`.
- A sugestão de top 10 por CPU aparece junto com os loops.
- A receita pode ser salva como atalho.
- O simulador deve executar uma quantidade limitada de ciclos e explicar que não é um loop infinito real; se isso não for possível na primeira versão, o app deve deixar claro que o loop só pode ser copiado ou executado no modo real.

**Critérios de aceite:**

- `"loop"` no fim da linha não vira parâmetro.
- O app mostra pelo menos as opções “com intervalo”, “instantâneo” e “controlado”.
- O aviso de CPU aparece antes do botão de executar.
- O comando de top 10 é gerado corretamente.
- Os testes cobrem detecção, remoção do modificador e geração do loop.

### 6. Pulso visual ao executar e durante loops

**Status:** planejado, não iniciado.

**Desejo:** sempre que o usuário clicar em **Executar**, o bloco inteiro do comando digitado deve pulsar visualmente. Se o comando estiver em um loop, o bloco deve continuar pulsando a cada ciclo, para dar a sensação de que o PC está processando aquela linha.

**Comportamento esperado:**

- O pulso acontece no **bloco do editor**, não na tela inteira.
- O efeito usa borda, brilho e fundo suave, sem esconder o texto.
- Em modo simulado, o pulso dura o tempo da execução simulada, com um mínimo de aproximadamente 500 ms para ser perceptível.
- Em modo real, o pulso acompanha o tempo real da execução (`realBusy`).
- Em loop, o pulso se repete em cada ciclo; o app deve mostrar um botão **Parar loop** e um contador de ciclos.
- Se o loop estiver rodando, o usuário não deve ficar preso: deve haver uma forma clara de interromper.
- O editor continua editável apenas quando não houver execução; durante o loop, o comando fica em modo somente leitura ou é bloqueado para edição.
- O efeito respeita `prefers-reduced-motion`: nesse caso, troca a animação por uma borda estática e pelo texto “executando…”.

**Cuidado de acessibilidade:**

Não usar piscadas rápidas ou repetitivas em alta frequência. O correto é um pulso lento, de aproximadamente 400–600 ms por ciclo, com no máximo duas repetições por execução. Para loops, o pulso acompanha o intervalo real entre ciclos, não uma animação de 10 Hz.

**Critérios de aceite:**

- Clicar em **Executar** inicia o pulso no bloco do comando.
- O pulso termina quando a execução termina.
- Um loop mantém o pulso enquanto estiver ativo e permite interromper.
- O texto do comando permanece legível durante o efeito.
- A interface não pisca a tela inteira.
- O efeito é desativado ou simplificado com `prefers-reduced-motion`.
- Testes visuais verificam que o bloco volta ao estado normal ao final.

### 7. Workspace profissional no estilo VS Code

**Status:** planejado, não iniciado. É uma evolução maior, separada do modo de aprendizagem.

**Desejo:** uma área para usuários experientes trabalharem com muitos arquivos PowerShell, sem a estrutura de curso. Um “modo trabalho” com árvore de arquivos, abas, editor, console, explicação por trecho, análise de impacto e versionamento automático a cada alteração.

**Modos da interface:**

- **Aprender** — experiência atual, com trilhas, tarefas e sugestões guiadas.
- **Trabalhar** — workspace profissional, com projetos e arquivos.
- O usuário pode alternar entre os modos sem perder o estado do console nem os arquivos abertos.

**Layout proposto:**

- **Barra lateral esquerda:** árvore de pastas e arquivos, criação, renomeação, exclusão, busca e múltiplas raízes de projeto.
- **Centro:** editor com abas, indicador de alterações não salvas, realce de sintaxe, busca no arquivo e atalhos de edição.
- **Parte inferior:** console integrado, mostrando o diretório atual e permitindo executar o arquivo ou um trecho selecionado.
- **Painel direito:** resumo do script, fluxo, impacto, riscos, referências e a explicação do trecho selecionado.
- **Barra superior:** alternância Aprender/Trabalhar, status do workspace, arquivo ativo e ações de salvar/executar.

**Explicação por trecho e análise de alteração:**

O usuário seleciona uma linha, bloco ou função e pergunta:

- “O que esta parte faz?”
- “O que acontece se eu alterar esta condição?”
- “Quais comandos são afetados por esta variável?”
- “Este trecho pode apagar ou alterar algo?”

O painel mostraria:

- explicação em português;
- entradas e saídas esperadas;
- variáveis lidas e escritas;
- comandos e arquivos afetados;
- riscos do trecho;
- comparação entre a versão atual e a alteração proposta;
- resultado da simulação das duas versões, quando possível.

**Versionamento por alteração:**

- Um snapshot automático é criado antes de cada salvamento.
- Cada versão guarda data, autor local, arquivo, conteúdo e um resumo da alteração.
- O usuário pode ver um **diff** entre versões, restaurar uma versão anterior e nomear marcos importantes.
- O histórico fica no navegador em **IndexedDB**, adequado para muitos arquivos e conteúdos maiores que o `localStorage`.
- Exportação e importação do histórico em JSON.
- O histórico local não substitui o Git; uma integração futura com Git pode mostrar `status`, `diff`, branches e commits.

**Escala e confiança:**

- Busca em todos os arquivos do workspace.
- Análise em lote: listar comandos perigosos, arquivos com erro e scripts sem uso.
- Formatação e análise de vários arquivos de uma vez.
- Toda alteração precisa ser reversível pelo histórico.
- Antes de salvar, o app mostra o diff e um resumo do impacto.
- Nenhum arquivo é executado automaticamente ao abrir ou salvar.

**Critérios de aceite:**

- Criar, abrir, editar, renomear, excluir e salvar vários arquivos `.ps1`, `.psm1`, `.psd1` e `.bat`.
- Alternar entre Aprender e Trabalhar sem perder o console.
- Selecionar um trecho e receber explicação e riscos.
- Comparar duas versões de um arquivo e restaurar a anterior.
- Ver o histórico de alterações de cada arquivo.
- Buscar texto em todo o workspace.
- Executar apenas com ação explícita do usuário.
- O modo real continua exigindo consentimento e confirmação.
- O workspace não depende de um servidor externo para funcionar localmente.

## Já entregue

- Catálogo com 124 comandos simulados e 17 categorias.
- Sugestões contextuais, ghost text e intenções em linguagem natural.
- Painel visual de fluxo e impacto.
- 29 trilhas e 111 tarefas.
- Modo real opcional com PowerShell local.
- Biblioteca de atalhos com parâmetros, edição, duplicação, fixação e execução.

## Ordem sugerida

1. Diretório atual no console — menor e independente.
2. Busca semântica com peças relacionadas — base para o catálogo.
3. Detecção de loops e top 10 de CPU — corrige o caso do `"loop"` e entrega uma receita de repetição segura.
4. Pulso visual ao executar — retorno imediato de que o comando entrou em execução.
5. Workspace profissional — árvore de arquivos, abas, explicação por trecho, diff e versionamento.
6. Auditoria estática de `.bat` e `.ps1` — leitura, explicação, fluxo e riscos sem executar.
7. Receitas de processos — primeiro fluxo completo de “listar → escolher → agir”.
8. Receitas para serviços, AD, arquivos e rede.
9. Salvar receitas como atalhos.
10. Execução em ambiente isolado — contêiner/VM descartável, depois da análise estática estar confiável.

## Próximas ideias

Aguardando novos pedidos. Cada mensagem será registrada aqui com status, exemplo e critérios de aceite antes de começar a implementação.
