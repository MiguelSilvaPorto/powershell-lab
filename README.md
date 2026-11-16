# PowerShell Lab

Um laboratório interativo para aprender PowerShell **vendo o que cada comando faz**.

A ideia central: enquanto você escreve, o laboratório sugere os próximos passos e transforma o pipeline em um fluxo visual — como um grafo de automação — mostrando a origem dos dados, cada etapa, o impacto no sistema e o resultado final.

## Em construção

- Editor de comandos com autocomplete, fantasma (ghost text) e sugestões de intenção.
- Painel de fluxo em tempo real no estilo N8N, com simulação de impacto.
- Trilhas guiadas por categorias: arquivos, objetos, processos, rede, Active Directory, registro, remoting e muito mais.
- Mundo simulado e seguro: filesystem, processos, serviços, domínio Active Directory e rede.
- Progresso persistente e execução local opcional.

## Decisões técnicas

- **JavaScript + Node.js**, sem etapa manual de compilação para testar.
- **React + Vite** para uma interface reativa com atualização instantânea (HMR).
- Nenhum backend compilado: o servidor de desenvolvimento também roda diretamente em Node.
- Simulador de PowerShell em JavaScript para uma experiência segura e previsível, com suporte futuro a `pwsh` real.

## Como rodar

```bash
npm install
npm run dev
```

O laboratório abre em `http://localhost:5173`.
