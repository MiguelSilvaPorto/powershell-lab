import { useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  CornerDownLeft,
  Info,
  ListChecks,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react'
import Modal from './Modal.jsx'
import { categoryFor } from '../data/catalog.js'
import { riskMeta } from '../utils/format.js'

const OUTPUT_LABELS = {
  objects: 'objetos',
  text: 'texto',
  none: 'sem saída',
  pipeline: 'objetos no pipeline',
  files: 'arquivos e pastas',
  processes: 'processos',
  services: 'serviços',
  users: 'contas de usuário',
  groups: 'grupos',
  computers: 'computadores',
  modules: 'módulos',
  tasks: 'tarefas agendadas',
  smbMappings: 'mapeamentos SMB',
  network: 'objetos de rede',
  registry: 'chaves e valores',
  csv: 'linhas CSV',
  json: 'dados JSON',
  help: 'texto de ajuda',
}

export default function CommandHelpModal({ command, onClose, onInsert }) {
  const [copied, setCopied] = useState('')

  const examples = useMemo(() => {
    const source = [command?.example, ...(command?.examples ?? [])]
      .map((example) => String(example ?? '').trim())
      .filter(Boolean)
    return [...new Set(source)]
  }, [command])

  if (!command) return null

  const category = categoryFor(command.cat) ?? { name: 'Geral', color: 'var(--accent)' }
  const risk = riskMeta(command.risk)
  const primaryExample = examples[0] ?? command.name

  async function copyExample(example) {
    try {
      await navigator.clipboard.writeText(example)
      setCopied(example)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('')
    }
  }

  return (
    <Modal onClose={onClose} className="command-help-modal" labelledBy="command-help-title" size="large">
      <header className="command-help-head">
        <div className="modal-kicker"><BookOpen size={13} /> Referência do catálogo</div>
        <div className="command-help-title-row">
          <div>
            <h2 id="command-help-title">{command.name}</h2>
            <p>{command.summary}</p>
          </div>
          <div className="command-help-badges">
            <span className={`risk-pill tone-${risk.tone}`}>{risk.label}</span>
            <span className="command-help-category" style={{ '--cat': category.color }}>
              {category.name}
            </span>
          </div>
        </div>
        <div className="command-help-meta">
          <span><TerminalSquare size={11} /> devolve <strong>{OUTPUT_LABELS[command.output] ?? command.output ?? 'objetos'}</strong></span>
          {command.aliases?.length ? <span>aliases: <code>{command.aliases.join(', ')}</code></span> : null}
          <span>{examples.length} {examples.length === 1 ? 'exemplo pronto' : 'exemplos prontos'}</span>
        </div>
      </header>

      <div className="command-help-body">
        <section className="command-help-section command-help-examples-section">
          <div className="command-help-section-head">
            <div><ListChecks size={14} /> <h3>Exemplos para testar</h3></div>
            <span>clique em inserir para levar ao console</span>
          </div>
          <div className="command-help-examples">
            {examples.map((example, index) => (
              <article className={`command-help-example ${index === 0 ? 'is-primary' : ''}`} key={example}>
                <div className="command-help-example-code">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <code>{example}</code>
                </div>
                <div className="command-help-example-actions">
                  <button type="button" className="mini-button" onClick={() => copyExample(example)}>
                    {copied === example ? <Check size={11} /> : <TerminalSquare size={11} />}
                    {copied === example ? 'copiado' : 'copiar'}
                  </button>
                  <button type="button" className="button button-primary button-small" onClick={() => onInsert(example)}>
                    <CornerDownLeft size={11} /> Inserir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="command-help-section">
          <div className="command-help-section-head">
            <div><Info size={14} /> <h3>Parâmetros principais</h3></div>
            <span>{command.params?.length ? `${command.params.length} documentados` : 'sem parâmetros obrigatórios'}</span>
          </div>
          {command.params?.length ? (
            <div className="command-help-params">
              {command.params.map((parameter) => (
                <div className="command-help-param" key={parameter.name}>
                  <code>-{parameter.name}</code>
                  <span>{parameter.desc}</span>
                  {parameter.example ? <small>ex.: {parameter.example}</small> : null}
                  {parameter.switch ? <small className="command-help-switch">switch</small> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="command-help-empty">Este comando não precisa de parâmetros para o uso básico.</p>
          )}
        </section>

        <aside className="command-help-notes">
          <div className="command-help-note">
            <ShieldCheck size={14} />
            <div>
              <strong>Nível de risco: {risk.label.toLowerCase()}</strong>
              <span>{risk.description ?? 'Confira o impacto antes de executar comandos que alteram o sistema.'}</span>
            </div>
          </div>
          <div className="command-help-note">
            <TerminalSquare size={14} />
            <div>
              <strong>Somente leitura não altera nada</strong>
              <span>Inserir um exemplo não executa o comando. Revise o texto e clique em Executar quando estiver pronto.</span>
            </div>
          </div>
        </aside>
      </div>

      <footer className="command-help-footer">
        <span>Use os exemplos como ponto de partida e ajuste os valores ao seu ambiente.</span>
        <div>
          <button type="button" className="button button-ghost" onClick={onClose}>Fechar</button>
          <button type="button" className="button button-primary" onClick={() => onInsert(primaryExample)}>
            <CornerDownLeft size={13} /> Usar exemplo principal
          </button>
        </div>
      </footer>
    </Modal>
  )
}
