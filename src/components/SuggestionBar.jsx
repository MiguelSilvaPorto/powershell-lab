import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CornerDownLeft,
  HelpCircle,
  Play,
  Sparkles,
  TerminalSquare,
  Workflow,
  SlidersHorizontal,
  Quote,
  TriangleAlert,
} from 'lucide-react'
import { categoryFor, findCommand } from '../data/catalog.js'
import TrackIcon from './TrackIcon.jsx'

const KIND_META = {
  intent: { label: 'intenção', icon: Sparkles },
  cmdlet: { label: 'comando', icon: TerminalSquare },
  param: { label: 'parâmetro', icon: SlidersHorizontal },
  value: { label: 'valor', icon: Quote },
  pipeline: { label: 'próxima etapa', icon: Workflow },
  verify: { label: 'verificar', icon: CheckCircle2 },
  starter: { label: 'começar', icon: Play },
}

function headerFor(analysis) {
  if (analysis.failed) return { title: 'Corrija e tente de novo', hint: 'Leia a mensagem e escolha um caminho' }
  if (analysis.kind === 'empty') return { title: 'Comece por aqui', hint: 'Ou descreva uma intenção no campo acima' }
  if (analysis.kind === 'natural') return { title: 'O que você quer fazer?', hint: 'A intenção vira um comando executável' }
  if (analysis.kind === 'cmdlet') return { title: 'Complete o comando', hint: 'Tab aceita a sugestão fantasma' }
  if (analysis.kind === 'pipeline') return { title: 'Continue o fluxo', hint: 'Escolha a próxima etapa do pipeline' }
  if (analysis.kind === 'params') return { title: 'Próximo parâmetro', hint: 'Continue montando o comando' }
  if (analysis.kind === 'value') return { title: 'Valores possíveis', hint: 'Escolha um valor do mundo simulado' }
  if (analysis.kind === 'unknown') return { title: 'Ainda não reconheci', hint: 'Tente outro nome ou uma intenção' }
  if (analysis.verification?.length && analysis.kind === 'command') return { title: 'Confirme o resultado', hint: 'Ou continue transformando a saída' }
  return { title: 'Próximas alterações', hint: 'Adicione uma etapa ou teste uma variação' }
}

export default function SuggestionBar({ analysis, ghost, onApply, onExplain, realMode = false }) {
  const header = headerFor(analysis)
  const suggestions = analysis.suggestions ?? []
  return (
    <section className="suggestion-bar" aria-label="Sugestões de comando">
      <div className="suggestion-head">
        <div className="suggestion-title">
          <Sparkles size={14} />
          <span>{header.title}</span>
          {realMode ? <span className="real-mode-chip">meu PC</span> : null}
          <small>{realMode ? 'execução real · revise antes de rodar' : header.hint}</small>
        </div>
        {ghost ? (
          <div className="ghost-hint">
            <CornerDownLeft size={12} />
            <kbd>Tab</kbd>
            <span>aceita</span>
          </div>
        ) : suggestions.length > 3 ? (
          <div className="rail-hint">
            <span>deslize para ver mais</span>
            <ChevronRight size={12} />
          </div>
        ) : null}
      </div>
      <div className="suggestion-rail">
        {suggestions.map((suggestion, index) => {
          const kind = KIND_META[suggestion.kind] ?? KIND_META.cmdlet
          const Icon = kind.icon
          const category = categoryFor(suggestion.category)
          const showTitle = suggestion.kind === 'intent' && suggestion.title
          const risky = suggestion.risk === 'cuidado'
          const firstToken = String(suggestion.insert ?? '').trim().split(/\s+/)[0]
          const helpCommand = suggestion.commandName ?? findCommand(firstToken)?.name
          return (
            <article
              className={`suggestion-card kind-${suggestion.kind} ${helpCommand ? 'has-help' : ''}`}
              key={suggestion.id ?? `${suggestion.kind}-${index}`}
              style={{ '--cat': category.color, '--delay': `${index * 28}ms` }}
            >
              <button
                type="button"
                className="suggestion-card-main"
                onClick={() => onApply(suggestion)}
                title={suggestion.insert}
              >
                <span className="suggestion-card-top">
                  <span className="suggestion-kind-icon"><Icon size={13} /></span>
                  <span className="suggestion-badge">{suggestion.badge ?? kind.label}</span>
                  {suggestion.required ? <span className="suggestion-required">obrigatório</span> : null}
                  <span className="suggestion-card-category" aria-hidden="true"><TrackIcon category={category} size={13} /></span>
                </span>
                {showTitle ? <span className="suggestion-card-title">{suggestion.title}</span> : null}
                <span className="suggestion-card-label">{suggestion.label}</span>
                <span className="suggestion-card-desc">{suggestion.description}</span>
                <span className="suggestion-card-cta">
                  {risky ? <TriangleAlert size={11} /> : <ArrowRight size={11} />}
                  {suggestion.kind === 'intent' ? 'usar este comando' : suggestion.kind === 'param' ? 'adicionar' : suggestion.kind === 'verify' ? 'verificar' : 'inserir'}
                </span>
              </button>
              {helpCommand ? (
                <button
                  type="button"
                  className="suggestion-card-help"
                  onClick={() => onExplain?.(helpCommand)}
                  title={`Explicar ${helpCommand} e ver exemplos`}
                  aria-label={`Explicar ${helpCommand} e ver exemplos`}
                >
                  <HelpCircle size={12} />
                </button>
              ) : null}
            </article>
          )
        })}
        {suggestions.length === 0 ? (
          <div className="suggestion-empty">
            Continue digitando para ver sugestões.
          </div>
        ) : null}
      </div>
    </section>
  )
}
