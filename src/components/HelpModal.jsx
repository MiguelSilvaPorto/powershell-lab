import { ArrowRight, BookOpen, Braces, CornerDownLeft, Lightbulb, Sparkles, TriangleAlert, Workflow } from 'lucide-react'
import Modal from './Modal.jsx'

const steps = [
  {
    icon: CornerDownLeft,
    title: 'Escreva como no console',
    text: 'Digite um cmdlet ou descreva uma intenção, como “adicionar usuário no AD”. Enter executa; o comando fica no editor para você continuar iterando.',
  },
  {
    icon: Sparkles,
    title: 'Siga as sugestões',
    text: 'A barra mostra parâmetros, valores, próximas etapas do pipeline e intenções. O texto fantasma completa o que você está digitando com Tab.',
  },
  {
    icon: Workflow,
    title: 'Veja o comando por dentro',
    text: 'A radiografia à direita desenha cada etapa como um grafo: origem dos dados, filtros, saída e o impacto no mundo simulado.',
  },
  {
    icon: BookOpen,
    title: 'Pratique em uma trilha',
    text: 'As aulas têm objetivos, exemplos e tarefas validadas. O progresso fica salvo neste navegador e você pode alternar com o laboratório livre.',
  },
]

export default function HelpModal({ onClose, onStartAd, onStartFirst }) {
  return (
    <Modal onClose={onClose} className="help-modal" labelledBy="help-title">
      <div className="modal-kicker"><Sparkles size={13} /> Como funciona</div>
      <h2 id="help-title">Um console que mostra o caminho.</h2>
      <p className="modal-lead">
        O PS Lab abre em um laboratório local seguro: por padrão, nada do que você digita altera o seu
        computador. O objetivo é aprender o raciocínio do PowerShell, não memorizar comandos. O modo
        <strong> Meu PC</strong> é opcional e executa comandos reais quando você o ativa com confirmação.
      </p>

      <div className="help-steps">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <div className="help-step" key={title}>
            <span className="help-step-index">0{index + 1}</span>
            <span className="help-step-icon"><Icon size={18} /></span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="help-shortcuts">
        <div><kbd>Enter</kbd><span>executar</span></div>
        <div><kbd>Tab</kbd><span>aceitar sugestão</span></div>
        <div><kbd>↑</kbd><kbd>↓</kbd><span>histórico</span></div>
        <div><kbd>Esc</kbd><span>sair do editor</span></div>
      </div>

      <div className="help-footer">
        <div className="help-footer-note">
          <Braces size={15} />
          Tudo é objeto — até o que você ainda não executou.
        </div>
        <div className="help-footer-actions">
          <button type="button" className="button button-ghost" onClick={onStartFirst}>Começar pelo básico</button>
          <button type="button" className="button button-primary" onClick={onStartAd}>
            Explorar Active Directory
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="help-tip">
        <Lightbulb size={14} />
        Use o bloco <strong>Mundo</strong> no topo para ver o domínio, os arquivos e a rede simulados. Para executar de verdade, clique em <strong>Simulador</strong> no topo e ative o modo <strong>Meu PC</strong>.
      </div>
      <div className="help-tip help-real-tip">
        <TriangleAlert size={14} />
        O modo real usa as suas permissões e pode alterar arquivos, configurações e processos. Ele não é salvo entre recarregamentos e as tarefas das trilhas continuam validadas apenas no simulador.
      </div>
    </Modal>
  )
}
