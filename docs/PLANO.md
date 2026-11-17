# Plano grande — PS Lab

## 1. Visão

O PS Lab deve ser, ao mesmo tempo:

- um curso visual de PowerShell;
- um laboratório seguro de simulação;
- uma ferramenta profissional para escrever, analisar e executar scripts;
- um ambiente que entende o contexto do computador e avisa antes de causar problemas.

A experiência precisa funcionar para iniciantes e para usuários experientes, sem misturar os dois fluxos. O modo de aprendizagem continua guiado; o modo profissional oferece arquivos, abas, versões e análise de impacto.

## 2. Princípios

- **Segurança primeiro:** nada é executado sem ação explícita.
- **Simulador como padrão:** o modo real é opt-in.
- **Explicar antes de executar:** todo comando deve ter contexto, impacto e riscos.
- **Compatibilidade explícita:** o app deve saber em qual PowerShell o código roda.
- **Histórico confiável:** alterações em arquivos precisam ser reversíveis.
- **Acessibilidade:** animações e feedback visual não podem prejudicar leitura ou causar desconforto.
- **Evolução incremental:** cada frente deve funcionar sozinha e integrar com as demais.

## 3. Estado atual

- Aplicação em JavaScript + React/Vite.
- 124 comandos simulados, 17 categorias, 29 trilhas e 111 tarefas.
- Sugestões contextuais, ghost text, intenções e painel de fluxo.
- Modo real opcional conectado ao PowerShell local.
- Biblioteca de atalhos com parâmetros, edição, duplicação e execução.
- Versão 0.4.0 publicada.
- Ajuda contextual “?” com exemplos por comando.
- Tradução local de erros reais do PowerShell, preservando o texto original.
- Repositório público no GitHub.
- 587 verificações automatizadas e CI ativas.

### 3.1 Como continuar em outro computador

1. Clone o repositório:

```bash
git clone https://github.com/MiguelSilvaPorto/powershell-lab.git
cd powershell-lab
```

2. Instale as dependências e inicie o app:

```bash
npm install
npm run dev
```

3. Abra `http://localhost:5173`.

4. Leia este plano, escolha uma frente e registre as decisões nas perguntas finais.

5. Antes de publicar mudanças, rode:

```bash
npm test
npm run build
```

O modo real exige o servidor local do Vite e um PowerShell instalado. O simulador funciona sem instalar nada além do Node.js.

## 4. Frentes de trabalho

### 4.1 Console com diretório atual

**Objetivo:** mostrar claramente o diretório de trabalho na parte superior do console.

**Comportamento:**

- Faixa acima do editor com ícone de pasta, caminho atual e modo (`simulado` ou `meu PC`).
- O placeholder “Digite um comando ou descreva o que você quer fazer…” permanece intacto.
- O caminho acompanha `Set-Location` no simulador e a pasta real no modo Meu PC.
- Caminhos longos são encurtados, com tooltip exibindo o caminho completo.
- A faixa não desloca o editor nem interfere na digitação.

**Critérios de aceite:**

- O caminho aparece no topo do console.
- O valor muda ao trocar de diretório.
- O modo real e o simulado exibem caminhos coerentes.
- O layout permanece estável em telas compactas.

### 4.2 Busca semântica e tolerância a erros

**Objetivo:** transformar intenções e comandos incompletos em sugestões úteis.

**Casos obrigatórios:**

- `criar pasta` → `New-Item`, `Set-Location`, `Test-Path`, `Get-ChildItem` e etapas relacionadas.
- `getprocess` → `Get-Process`.
- `get process` → `Get-Process`.
- `get-proces` → `Get-Process`.
- `getproces` → `Get-Process`.
- `get-childitens` → `Get-ChildItem`.
- `remove item` → `Remove-Item`.

**Melhorias:**

- Comparação compacta sem espaços e hífens.
- Distância de edição para pequenos erros de digitação.
- Prefixos e subsequências com pontuação controlada.
- “Você quis dizer?” quando a confiança for média.
- Resultados agrupados por papel: criar, entrar, conferir, listar, gerenciar.
- Cada cartão mostra o comando, uma explicação curta e o texto que será inserido.
- A busca não depende do histórico.

**Critérios de aceite:**

- Consultas com espaços, hífens ausentes ou erros simples encontram o comando correto.
- Consultas sem relação não produzem sugestões aleatórias.
- Testes cobrem os casos acima.

### 4.3 Loops e top 10 de CPU

**Objetivo:** reconhecer intenção de repetição e sugerir loops seguros.

**Detecção:**

- `loop`, `repetir`, `infinito`, `continuamente`, `monitorar` e `a cada X segundos`.
- O modificador não pode virar argumento do comando.
- O comando-base deve ser preservado.

**Sugestões:**

1. Loop com intervalo recomendado:

```powershell
while ($true) {
  Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
  Start-Sleep -Seconds 2
}
```

2. Loop instantâneo, com alerta de alto consumo de CPU:

```powershell
while ($true) {
  Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
}
```

3. Loop controlado:

```powershell
1..5 | ForEach-Object {
  Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
  Start-Sleep -Seconds 2
}
```

4. Top 10 CPU:

```powershell
Get-Process |
  Sort-Object CPU -Descending |
  Select-Object -First 10 ProcessName, CPU, WorkingSet
```

**Cuidados:**

- `Where-Object { $_.CPU -gt 10 }` filtra por tempo absoluto; não é top 10.
- `Start-Sleep` aceita milissegundos; intervalos muito baixos continuam consumindo CPU.
- O simulador deve executar ciclos limitados ou declarar que loops só podem ser copiados/executados no modo real.
- O aviso de CPU aparece antes da execução.

### 4.4 Pulso visual de execução

**Objetivo:** dar retorno visual imediato de que o comando entrou em execução.

**Comportamento:**

- O bloco do editor pulsa ao clicar em Executar.
- O pulso usa borda, brilho e fundo suave, mantendo o texto legível.
- No simulador, duração mínima de aproximadamente 500 ms.
- No modo real, acompanha o tempo da execução.
- Em loops, o pulso acompanha cada ciclo e existe um botão **Parar loop**.
- O editor é bloqueado durante o loop.
- `prefers-reduced-motion` troca a animação por borda estática e texto “executando…”.
- Não usar piscadas rápidas; pulso de 400–600 ms, no máximo duas repetições por execução.

### 4.5 Ajuda “?” por comando

**Objetivo:** cada comando sugerido deve ter uma explicação maior e exemplos prontos.

**Interface:**

- Botão “?” em cada cartão de comando.
- Modal com:
  - nome do comando, categoria e resumo;
  - nível de risco;
  - tipo de saída;
  - aliases;
  - exemplos prontos com botão **Inserir** e **Copiar**;
  - parâmetros principais com descrição e exemplo;
  - observação de que inserir não executa.
- O botão “?” não deve criar botão dentro de botão; o cartão precisa de uma área principal clicável e um botão de ajuda separado.
- O modal deve funcionar por teclado, Escape e clique fora.
- Comandos sem exemplos suficientes devem mostrar o exemplo principal e a sintaxe baseada nos parâmetros.

**Critérios de aceite:**

- Todo cartão que representa um cmdlet tem “?”.
- O modal abre com o comando correto.
- Inserir um exemplo leva o texto ao console sem executar.
- O layout não quebra em telas compactas.

### 4.6 Compatibilidade entre versões do PowerShell

**Objetivo:** detectar o motor em uso, permitir escolher um alvo e apontar código incompatível.

**Conceitos:**

- **Motor atual:** PowerShell instalado e em execução.
- **Alvo de compatibilidade:** versão em que o script deve rodar.
- **Perfil:** Windows PowerShell 3.0/4.0/5.1 ou PowerShell 7.0/7.2/7.4/7.7.

**Detecção no PC:**

- `pwsh` no PATH e em `.tools/pwsh`.
- `powershell.exe` no Windows.
- Versão via `$PSVersionTable.PSVersion`.
- Plataforma e módulos disponíveis.
- Distinção entre Windows PowerShell e PowerShell Core.

**Análise de código:**

- Diretivas `#requires`.
- `$PSVersionTable`.
- Sintaxe por versão:
  - `??`, `?.`, ternário, `&&`, `||`, `ForEach-Object -Parallel` — 7.0+.
  - `Get-WmiObject` — Windows PowerShell 5.1.
  - `Get-EventLog` — indisponível no PowerShell 7.
  - Parâmetros e comandos com metadados `minVersion`, `maxVersion`, `platforms`, `modules`, `replacedBy`.
- Mistura de versões: “declarado para 5.1, mas usa recurso de 7.0”.
- Resultado com níveis: compatível, incompatível e indeterminado.

**Interface:**

- Seletor de alvo: automático, 5.1, 7.x.
- Painel de compatibilidade no fluxo.
- Lista de ocorrências com linha, recurso e sugestão de correção.
- Comparação entre 5.1 e 7.x.
- Sugestões filtradas ou marcadas conforme o alvo.
- Integração com atalhos, workspace e auditoria de arquivos.

**Exemplo de relatório:**

```text
Alvo declarado: Windows PowerShell 5.1
Motor atual: PowerShell 7.7.0

✖ Linha 4 — operador ?? exige PowerShell 7.0+
✖ Linha 8 — Get-WmiObject é exclusivo do Windows PowerShell 5.1
✓ Linhas 1–3 — compatíveis
```

### 4.7 Workspace profissional no estilo VS Code

**Objetivo:** oferecer um modo de trabalho para usuários experientes, separado do curso.

**Modos:**

- **Aprender:** experiência atual, com trilhas e tarefas.
- **Trabalhar:** workspace profissional.
- Troca de modo sem perder console, arquivos ou histórico.

**Layout:**

- Árvore de arquivos e pastas à esquerda.
- Abas de arquivos no centro.
- Editor com realce de sintaxe e indicador de alterações não salvas.
- Console integrado na parte inferior.
- Painel direito com explicação, fluxo, impacto, riscos e compatibilidade.
- Busca em todos os arquivos.
- Criação, renomeação, exclusão e organização de `.ps1`, `.psm1`, `.psd1` e `.bat`.

**Explicação por trecho:**

- Selecionar linha, bloco ou função.
- Perguntar o que faz, o que muda ao alterar, quais variáveis e arquivos são afetados.
- Mostrar diff entre versão atual e proposta.
- Simular as duas versões quando possível.

**Versionamento por alteração:**

- Snapshot automático antes de cada salvamento.
- Data, autor local, conteúdo e resumo.
- Diff visual e restauração.
- Marcos nomeados.
- Histórico em IndexedDB.
- Exportação/importação em JSON.
- Git como camada futura: status, diff, branches e commits.

**Escala:**

- Busca global.
- Análise em lote de comandos perigosos e erros.
- Formatação e análise de vários arquivos.
- Nada é executado automaticamente ao abrir ou salvar.

### 4.8 Auditoria de `.bat` e `.ps1`

**Objetivo:** ler arquivos, explicar linha por linha, montar o fluxo e destacar riscos antes de executar.

**Interface:**

- Importação por botão ou arrastar e soltar.
- Lista de linhas com número, comando e explicação.
- Grafo de fluxo com sequência, condições, loops, chamadas e comandos externos.
- Resumo executivo: o que faz, o que altera, o que pode dar errado.
- Cartões de risco: informação, atenção, perigoso e crítico.
- Relatório exportável.

**Riscos detectados:**

- Arquivos: `del`, `rd`, `rmdir /s`, `Remove-Item -Recurse -Force`, `format`, `diskpart`.
- Git: `reset --hard`, `clean -fdx`, `push --force`, remoção de branches.
- Download e execução: `curl | bash`, `iwr | iex`, `Invoke-Expression`, `-EncodedCommand`, `certutil`, `bitsadmin`.
- Persistência: `Run`, `schtasks`, serviços, Startup.
- Contas e permissões.
- Rede e firewall.
- Ofuscação: Base64, concatenação e variáveis.

**Limites:**

- Valores em tempo de execução não são totalmente previsíveis.
- Binários externos podem ter efeitos desconhecidos.
- `.bat` depende de `cmd.exe`; em Linux não há execução nativa.
- O relatório deve usar níveis de confiança: confirmado, provável e indeterminado.

**Execução segura em fases:**

1. Análise estática, sem executar.
2. Simulação no mundo do PS Lab.
3. Contêiner descartável para PowerShell, sem rede e sem acesso à pasta pessoal.
4. `.bat` real apenas em Windows Sandbox ou VM descartável.

### 4.9 Receitas e junções

**Objetivo:** transformar listagens em fluxos “listar → escolher → agir”.

**Exemplos:**

- `Get-Process` → escolher processo → encerrar, priorizar, monitorar, iniciar com o Windows ou exportar.
- `Get-Service` → iniciar, parar ou reiniciar.
- `Get-ADUser` → bloquear, desbloquear, mover ou consultar grupos.
- `Get-ChildItem` → copiar, mover, compactar ou excluir.
- `Get-SmbShare` → mapear, desconectar ou auditar.

**Interface:**

- Cartão de junção com comentário do tipo “primeiro listar, depois escolher, depois agir”.
- Lista de valores vinda do simulador ou do PC real.
- Prévia do comando final.
- Impacto e risco antes de executar.
- Salvar a receita como atalho.

### 4.10 Tradução de erros e mensagens bilíngues

**Status:** implementado na versão 0.4.0.

**Objetivo:** mostrar a mensagem original do PowerShell e uma tradução para português, com uma dica do que fazer, sem esconder o texto técnico.

**Comportamento:**

- O erro original em inglês é preservado exatamente como veio.
- Abaixo dele aparece a tradução para português.
- Um bloco “O que fazer” explica a causa provável e o próximo passo.
- Mensagens já em português não recebem tradução duplicada.
- A tradução é local e não envia caminhos, usuários ou dados do PC para serviços externos.
- A mesma camada pode ser usada no terminal, no workspace e na auditoria de arquivos.
- Mensagens desconhecidas são marcadas como “não traduzidas”, mantendo o original.

**Exemplo:**

```text
Original (en)
The term 'Get-ADDomain' is not recognized as a name of a cmdlet...

Tradução (pt-BR)
O termo 'Get-ADDomain' não é reconhecido como nome de cmdlet...
```

**Categorias cobertas:**

- comando não encontrado;
- parâmetro inválido ou ausente;
- caminho e unidade inexistentes;
- permissão negada;
- arquivo em uso ou já existente;
- serviços;
- Active Directory;
- módulos;
- rede e DNS;
- sintaxe;
- erros de execução.

**Critérios de aceite:**

- O original permanece visível.
- A tradução preserva nomes de comandos, caminhos e identificadores.
- O texto traduzido não contém códigos ANSI.
- A interface funciona com erros de uma ou várias linhas.
- Testes cobrem comando, caminho, permissão, parâmetro e mensagens já em português.

### 4.11 Repositório público e governança

**Estado:** o repositório já está público.

**Pendências:**

- Escolher licença.
- README público com instalação, capturas, limites e roadmap.
- `SECURITY.md` e guia de contribuição.
- Templates de issue.
- Auditoria de segredos e caminhos pessoais no histórico.
- Definir o que é documentação pública e o que é rascunho interno.

## 5. Ordem recomendada

1. Diretório atual no console.
2. Busca semântica com tolerância a erros.
3. Detecção de loops e top 10 de CPU.
4. Pulso visual de execução.
5. Compatibilidade entre versões do PowerShell.
6. Workspace profissional e versionamento.
7. Auditoria de `.bat` e `.ps1`.
8. Receitas e junções.
9. Execução em ambiente isolado.
10. Governança do repositório público.

Ajuda por comando e tradução de erros já estão implementadas na versão 0.4.0.

## 6. Critérios de qualidade

- Testes para cada nova regra de busca, loop, compatibilidade e versão.
- Testes de layout em 1440 px, 1024 px, 870 px e 390 px.
- Nenhum comando é executado sem ação explícita.
- O modo real continua exigindo consentimento.
- O simulador permanece seguro.
- Animações respeitam `prefers-reduced-motion`.
- O histórico de arquivos é reversível.
- O app funciona localmente, sem depender de serviços externos.

## 7. Perguntas para decidir

1. Qual frente vem primeiro: melhorias rápidas do console ou o workspace profissional?
2. A compatibilidade deve começar apenas com 5.1 × 7.x ou já cobrir 3.0, 4.0, 5.1, 7.0, 7.2, 7.4 e 7.7?
3. O alvo de compatibilidade deve ser automático pelo motor atual, manual pelo usuário, ou os dois com prioridade para `#requires`?
4. O botão “?” deve aparecer apenas em cartões de cmdlet ou também em parâmetros e valores?
5. Os exemplos do modal devem vir somente do catálogo atual ou podem ser complementados manualmente com novos casos?
6. O workspace profissional deve usar toggles na mesma tela ou uma área separada com rota própria?
7. O histórico de versões deve ficar só no IndexedDB ou também permitir exportação automática para uma pasta do projeto?
8. A integração com Git deve ser apenas leitura (`status`/`diff`) ou também permitir commit e branch?
9. Loops no simulador devem rodar alguns ciclos limitados ou ser apenas copiáveis/executáveis no modo real?
10. A execução isolada de `.ps1` deve usar contêiner Docker, processo restrito ou apenas simulação na primeira versão?
11. Para `.bat`, a meta é Windows Sandbox/VM desde o início ou análise estática primeiro?
12. Qual licença usar no repositório público: MIT, Apache-2.0 ou outra?
13. O repositório deve incluir capturas de tela e dados simulados no histórico público?
14. O modo profissional deve ter tema/layout visual distinto ou manter a mesma identidade do laboratório?
15. Qual o nível de detalhe desejado no relatório de compatibilidade: apenas erros ou também avisos e sugestões de correção?
16. A tradução de erros deve aparecer automaticamente ou apenas quando o usuário clicar em “Traduzir”?
17. A tradução deve continuar 100% local ou pode existir um botão opcional de IA, com consentimento explícito?
18. O plano deve ser mantido apenas em `docs/PLANO.md` ou também acompanhado por issues no GitHub?
