import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Compass,
  Cpu,
  Eye,
  FolderTree,
  Info,
  Layers,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wand2,
  Workflow,
  X,
} from 'lucide-react'
import { findCommand, categoryFor } from '../data/catalog.js'
import { truncate, riskMeta } from '../utils/format.js'
import TrackIcon from './TrackIcon.jsx'
import EffectCard from './EffectCard.jsx'

const KIND_LABEL = {
  empty: 'pronto para começar',
  natural: 'intenção detectada',
  cmdlet: 'montando comando',
  params: 'completando comando',
  value: 'escolhendo valor',
  pipeline: 'construindo pipeline',
  command: 'comando completo',
  unknown: 'aguardando uma pista',
}

function countFiles(node) {
  if (!node) return 0
  let total = 0
  const visit = (current) => {
    total += 1
    current.children?.forEach(visit)
  }
  visit(node)
  return total
}

function sourceDescription(categoryId, world) {
  switch (categoryId) {
    case 'processos':
      return { label: 'Tabela de processos', detail: `${world.processes.length} processos em execução` }
    case 'ad':
      return { label: 'Domínio lab.local', detail: `${world.ad.users.length} usuários · ${world.ad.groups.length} grupos · ${world.ad.computers.length} computadores` }
    case 'arquivos':
      return { label: 'Sistema de arquivos', detail: `${countFiles(world.filesystem?.['C:'])} itens em C:` }
    case 'texto':
      return { label: 'Arquivos de texto', detail: 'conteúdo em C:\\Documentos, C:\\Logs e C:\\Temp' }
    case 'rede':
      return { label: 'Rede e compartilhamentos', detail: `${world.network.adapters.length} adaptadores · ${world.network.shares.length} compartilhamentos · ${world.network.mappings.length} ${world.network.mappings.length === 1 ? 'mapeamento' : 'mapeamentos'}` }
    case 'registro':
      return { label: 'Registro do Windows', detail: 'HKCU: e HKLM: disponíveis' }
    case 'modulos':
      return { label: 'Sessão do PowerShell', detail: `${world.modules.length} módulos instalados` }
    case 'automacao':
      return { label: 'Agendador de tarefas', detail: `${world.scheduledTasks.length} tarefas registradas` }
    case 'remoting':
      return { label: 'Sessão local', detail: `${world.sessions.length} sessões remotas abertas` }
    case 'seguranca':
      return { label: 'Configuração local', detail: `política ${world.executionPolicy} · ${world.localUsers.length} contas locais` }
    case 'sistema':
      return { label: 'Computador simulado', detail: `${world.hostname} · ${world.os}` }
    case 'relatorios':
      return { label: 'Objetos em memória', detail: 'prontos para virar CSV ou JSON' }
    default:
      return { label: 'Sessão do PowerShell', detail: `${world.cwd}` }
  }
}

function objectCountLabel(count) {
  return count === 1 ? '1 objeto' : `${count} objetos`
}

function stageChips(stage) {
  const raw = stage?.args ?? []
  const chips = []
  for (let index = 0; index < raw.length; index += 1) {
    const token = raw[index]
    if (token.startsWith('-')) {
      const next = raw[index + 1]
      if (next && !next.startsWith('-')) {
        chips.push(`${token} ${truncate(next.replace(/^['"]|['"]$/g, ''), 22)}`)
        index += 1
      } else {
        chips.push(token)
      }
    } else {
      chips.push(truncate(token.replace(/^['"]|['"]$/g, ''), 24))
    }
    if (chips.length >= 3) break
  }
  return { chips, more: Math.max(0, raw.length - 3) }
}

function FlowEdge({ label, tone = 'var(--accent)', dashed = false, muted = false, active = true }) {
  return (
    <div className={`flow-edge ${dashed ? 'is-dashed' : ''} ${muted ? 'is-muted' : ''}`} style={{ '--edge': tone }} aria-hidden="true">
      {label ? <span className="flow-edge-label">{label}</span> : null}
      <span className="flow-edge-line" />
      {active ? <span className="flow-edge-dot" /> : null}
    </div>
  )
}

function FlowSourceNode({ categoryId, world }) {
  const category = categoryFor(categoryId)
  const source = sourceDescription(categoryId, world)
  return (
    <div className="flow-node flow-source" style={{ '--cat': category.color }}>
      <span className="flow-node-icon"><TrackIcon category={category} size={15} /></span>
      <div className="flow-node-main">
        <span className="flow-node-kicker">ORIGEM · {category.name.toUpperCase()}</span>
        <strong className="flow-node-title">{source.label}</strong>
        <span className="flow-node-sub">{source.detail}</span>
      </div>
      <span className="flow-node-side-badge">sistema</span>
    </div>
  )
}

function FlowStageNode({ stage, index, suggested = false, draft = false }) {
  const command = findCommand(stage?.commandName ?? stage?.cmdlet)
  const category = categoryFor(command?.cat ?? stage?.category)
  const { chips, more } = stageChips(stage)
  const error = stage?.error
  const outputCount = stage?.outputCount
  const stageEffects = stage?.effects?.length ?? 0
  const badge = error
    ? 'erro'
    : outputCount === undefined || outputCount === null
      ? 'em edição'
      : outputCount === 0
        ? stageEffects ? `${stageEffects} ${stageEffects === 1 ? 'impacto' : 'impactos'}` : 'sem saída'
        : `${outputCount} ${outputCount === 1 ? 'item' : 'itens'}`
  return (
    <div className={`flow-node flow-stage ${suggested ? 'is-suggested' : ''} ${draft ? 'is-draft' : ''} ${error ? 'has-error' : ''}`} style={{ '--cat': category.color }}>
      <span className="flow-stage-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="flow-node-icon"><TrackIcon category={category} size={15} /></span>
      <div className="flow-node-main">
        <span className="flow-node-kicker">
          {suggested ? 'COMANDO SUGERIDO' : draft ? 'RASCUNHO' : `ETAPA ${String(index + 1).padStart(2, '0')}`} · {category.name.toUpperCase()}
        </span>
        <strong className="flow-node-title">{stage?.commandName ?? stage?.cmdlet ?? 'próxima etapa'}</strong>
        <span className="flow-node-sub">{command?.summary ?? stage?.summary}</span>
        {chips.length ? (
          <div className="flow-node-chips">
            {chips.map((chip, chipIndex) => <span className="flow-chip" key={`${chip}-${chipIndex}`}>{chip}</span>)}
            {more ? <span className="flow-chip more">+{more}</span> : null}
          </div>
        ) : null}
        {error ? (
          <div className="flow-node-error">
            <CircleAlert size={12} />
            <span>{error.message}</span>
          </div>
        ) : null}
      </div>
      <span className={`flow-node-count ${error ? 'is-error' : ''}`}>{badge}</span>
    </div>
  )
}

function FlowOutcomeNode({ preview, draft = false, suggested = false }) {
  const effects = preview?.effects ?? []
  const objects = preview?.objects ?? []
  const meta = preview?.meta
  const error = preview?.errors?.[0]
  const hasText = meta?.view === 'text'
  let title = 'Aguardando comando'
  let detail = 'Complete a linha para ver o resultado.'
  let badge = draft ? 'rascunho' : 'saída'
  if (error) {
    title = 'Execução interrompida'
    detail = error.message
    badge = 'erro'
  } else if (effects.length && !objects.length) {
    title = 'Impacto no sistema'
    detail = `${effects.length} ${effects.length === 1 ? 'alteração registrada' : 'alterações registradas'} no mundo simulado.`
    badge = 'impacto'
  } else if (objects.length) {
    title = `${objects.length} ${objects.length === 1 ? 'objeto' : 'objetos'}`
    detail = meta?.typeName ? `Objetos do tipo ${meta.typeName}` : 'Resultado do pipeline'
    badge = 'saída'
  } else if (hasText) {
    title = 'Texto formatado'
    detail = meta?.typeName === 'HelpInfo' ? 'Documentação pronta para leitura' : 'Saída textual do comando'
    badge = 'texto'
  } else if (preview && !error) {
    title = 'Sem saída'
    detail = 'O comando terminou sem devolver objetos.'
    badge = 'vazio'
  }
  if (draft) {
    title = suggested ? 'Prévia da sugestão' : 'Resultado previsto'
    detail = suggested ? 'Execute a sugestão para ver o impacto real.' : 'Assim que o comando estiver completo, a saída aparece aqui.'
    badge = 'prévia'
  }
  const columns = (meta?.columns ?? []).slice(0, 4).map((column) => column.key)
  return (
    <div className={`flow-node flow-outcome ${draft ? 'is-draft' : ''} ${error ? 'has-error' : ''}`}>
      <span className="flow-node-icon"><TerminalSquare size={15} /></span>
      <div className="flow-node-main">
        <span className="flow-node-kicker">DESTINO</span>
        <strong className="flow-node-title">{title}</strong>
        <span className="flow-node-sub">{detail}</span>
        {columns.length && !error && !draft ? (
          <div className="flow-node-chips">
            {columns.map((column) => <span className="flow-chip" key={column}>{column}</span>)}
          </div>
        ) : null}
      </div>
      <span className={`flow-node-count ${error ? 'is-error' : ''}`}>{badge}</span>
    </div>
  )
}

function IntentNode({ intent, query }) {
  const command = findCommand(intent.cmdlet)
  const category = categoryFor(intent.category ?? command?.cat)
  return (
    <div className="flow-node flow-intent" style={{ '--cat': category.color }}>
      <span className="flow-node-icon"><Sparkles size={15} /></span>
      <div className="flow-node-main">
        <span className="flow-node-kicker">VOCÊ DESCREVEU</span>
        <strong className="flow-node-title">“{truncate(query, 54)}”</strong>
        <span className="flow-node-sub">{intent.title}</span>
        <div className="flow-node-chips">
          <span className="flow-chip">{intent.cmdlet}</span>
          <span className="flow-chip">{intent.confidence ?? 'possível'}</span>
        </div>
      </div>
      <span className="flow-node-side-badge">intenção</span>
    </div>
  )
}

function DraftNextNode({ suggestion }) {
  return (
    <div className="flow-node flow-stage is-draft is-next">
      <span className="flow-node-icon"><Wand2 size={15} /></span>
      <div className="flow-node-main">
        <span className="flow-node-kicker">PRÓXIMA ALTERAÇÃO</span>
        <strong className="flow-node-title">Complete com a sugestão</strong>
        <span className="flow-node-sub">{suggestion ? truncate(suggestion.label, 70) : 'Digite mais algumas letras para ver o encaixe.'}</span>
      </div>
      <span className="flow-node-count">tab</span>
    </div>
  )
}

function EmptyGraph() {
  const nodes = [
    { icon: Compass, kicker: 'VOCÊ', title: 'Uma intenção ou um cmdlet', sub: '“criar usuário no AD”', tone: '#b9a7ff' },
    { icon: TerminalSquare, kicker: 'POWERSHELL', title: 'Verbo + nome', sub: 'New-ADUser', tone: '#8aff80' },
    { icon: Layers, kicker: 'PIPELINE', title: 'Objetos em movimento', sub: 'cada etapa recebe e devolve', tone: '#7fd7ff' },
    { icon: ShieldCheck, kicker: 'IMPACTO', title: 'O mundo simulado muda', sub: 'antes → depois', tone: '#ffc56b' },
  ]
  return (
    <div className="flow-canvas is-overview">
      {nodes.map((node, index) => {
        const Icon = node.icon
        return (
          <div key={node.title} className="flow-overview-row">
            <div className="flow-node flow-overview-node" style={{ '--cat': node.tone }}>
              <span className="flow-node-icon"><Icon size={15} /></span>
              <div className="flow-node-main">
                <span className="flow-node-kicker">{node.kicker}</span>
                <strong className="flow-node-title">{node.title}</strong>
                <span className="flow-node-sub">{node.sub}</span>
              </div>
            </div>
            {index < nodes.length - 1 ? <FlowEdge label="leva a" tone={node.tone} active={index === 1} /> : null}
          </div>
        )
      })}
      <div className="flow-overview-note">
        <Sparkles size={13} />
        A radiografia se atualiza a cada tecla digitada.
      </div>
    </div>
  )
}

function EmptyImpact() {
  return (
    <div className="readonly-note">
      <span className="readonly-icon"><Eye size={15} /></span>
      <div>
        <strong>Nenhum comando em foco</strong>
        <span>Assim que você começar, o painel mostra o que seria alterado antes de executar.</span>
      </div>
    </div>
  )
}

export default function FlowPanel({
  analysis,
  preview,
  executed = false,
  intentPreview,
  world,
  isOpen,
  onClose,
  onApplySuggestion,
  onUseIntent,
  onInsert,
  onOpenLesson,
  onOpenCategoryLesson,
  onBrowseLessons,
}) {
  const [referenceOpen, setReferenceOpen] = useState(false)
  const topIntent = analysis.intents?.[0] ?? null
  const effectivePreview = analysis.kind === 'natural' ? intentPreview : preview
  const referenceCommand = analysis.command ?? (topIntent ? findCommand(topIntent.cmdlet) : null)
  const isDraft = ['cmdlet', 'params', 'value'].includes(analysis.kind)
  const category = referenceCommand ? categoryFor(referenceCommand.cat) : topIntent ? categoryFor(topIntent.category) : null
  const risk = referenceCommand ? riskMeta(referenceCommand.risk) : null
  const effects = effectivePreview?.effects ?? []
  const rawErrors = effectivePreview?.errors ?? []
  const errors = isDraft
    ? []
    : analysis.kind === 'pipeline'
      ? rawErrors.filter((error) => !/pipe sem comando/i.test(error.message ?? ''))
      : rawErrors
  const stages = effectivePreview?.stages ?? []
  const completeStages = stages.filter((stage) => stage.cmdlet || stage.commandName)
  const lastStage = completeStages[completeStages.length - 1]
  const outputTone = category?.color ?? 'var(--accent)'
  const draftSuggestion = analysis.suggestions?.find((suggestion) => ['cmdlet', 'param', 'value'].includes(suggestion.kind))
  const title = analysis.kind === 'empty'
    ? 'Um mapa antes do Enter.'
    : analysis.kind === 'natural'
      ? topIntent?.title ?? 'Leitura de intenção'
      : referenceCommand?.name ?? 'Comando em construção'
  const subtitle = analysis.kind === 'empty'
    ? 'Escreva um comando ou descreva o que você quer fazer. O fluxo aparece aqui em tempo real.'
    : analysis.kind === 'natural'
      ? topIntent?.why ?? 'Encontrei uma intenção. Escolha o comando sugerido para ver o fluxo.'
      : referenceCommand?.summary ?? analysis.suggestions?.[0]?.description ?? 'Continue digitando para montar o fluxo.'
  const modeLabel = executed ? (errors.length ? 'executado com erro' : 'executado agora') : KIND_LABEL[analysis.kind] ?? 'radiografia'
  const executedChip = executed ? (errors.length ? { label: 'falhou', error: true } : effects.length ? { label: 'aplicado ao mundo' } : { label: 'sem alterações', neutral: true }) : null
  const steps = analysis.kind === 'natural' ? [] : (analysis.nextSteps ?? []).slice(0, 3)
  const emptyIntents = (analysis.suggestions ?? []).filter((item) => item.kind === 'intent').slice(0, 3)
  const starterSuggestions = (analysis.suggestions ?? []).filter((item) => item.kind === 'starter').slice(0, 3)

  return (
    <aside className={`flow-panel ${isOpen ? 'is-open' : ''}`} aria-label="Radiografia do comando">
      <header className="flow-panel-head">
        <div>
          <span className="flow-panel-eyebrow"><span className="live-dot" /> RADIOGRAFIA</span>
          <h2>O comando, por dentro</h2>
        </div>
        <button type="button" className="icon-button flow-close" onClick={onClose} aria-label="Fechar radiografia">
          <X size={17} />
        </button>
      </header>

      <div className="flow-scroll">
        <section className="flow-title-block" style={{ '--cat': category?.color ?? 'var(--accent)' }}>
          <div className="flow-title-kicker">
            <span className="flow-mode"><span className="live-dot" /> {modeLabel}</span>
            {executedChip ? <span className={`flow-executed-chip ${executedChip.error ? 'is-error' : executedChip.neutral ? 'is-neutral' : ''}`}>{executedChip.label}</span> : null}
            {topIntent?.confidence ? <span className="flow-confidence">confiança {topIntent.confidence}</span> : null}
            {risk ? <span className={`risk-pill tone-${risk.tone}`}>{risk.label}</span> : null}
          </div>
          <div className="flow-title-row">
            {category ? <span className="flow-title-icon"><TrackIcon category={category} size={18} /></span> : <span className="flow-title-icon"><Workflow size={18} /></span>}
            <h3>{title}</h3>
          </div>
          <p>{subtitle}</p>
          {referenceCommand ? (
            <div className="flow-title-command">
              <TerminalSquare size={12} />
              <code>{topIntent?.template ?? analysis.commandName ?? referenceCommand.example}</code>
            </div>
          ) : null}
        </section>

        <section className="flow-section">
          <header className="flow-section-head">
            <div><Workflow size={13} /><span>Fluxo do comando</span></div>
            <span className="flow-section-hint">{analysis.kind === 'empty' ? 'mapa conceitual' : executed ? 'resultado real' : 'prévia ao vivo'}</span>
          </header>

          {analysis.kind === 'empty' ? (
            <EmptyGraph />
          ) : analysis.kind === 'natural' && topIntent ? (
            <div className="flow-canvas">
              <IntentNode intent={topIntent} query={analysis.naturalQuery || analysis.line} />
              <FlowEdge label="sugere" tone={category?.color ?? 'var(--violet)'} dashed active />
              {intentPreview?.stages?.filter((stage) => stage.cmdlet || stage.commandName).map((stage, index, list) => (
                <div key={`${stage.cmdlet}-${index}`}>
                  <FlowStageNode stage={stage} index={index} suggested />
                  {index < list.length - 1 ? <FlowEdge label={stage.outputCount != null ? `${stage.outputCount} itens` : 'segue'} tone={outputTone} /> : null}
                </div>
              ))}
              {intentPreview?.stages?.length ? <FlowEdge label={intentPreview.objects?.length ? objectCountLabel(intentPreview.objects.length) : effects.length ? 'impacto' : 'resultado'} tone={outputTone} /> : null}
              <FlowOutcomeNode preview={intentPreview} suggested />
            </div>
          ) : analysis.kind === 'unknown' ? (
            <div className="flow-canvas">
              <div className="flow-node flow-intent is-unknown">
                <span className="flow-node-icon"><CircleAlert size={15} /></span>
                <div className="flow-node-main">
                  <span className="flow-node-kicker">SINAL NÃO RECONHECIDO</span>
                  <strong className="flow-node-title">Ainda não entendi esta linha</strong>
                  <span className="flow-node-sub">Tente um nome no padrão Verbo-Nome, uma intenção em português ou uma das sugestões abaixo.</span>
                </div>
              </div>
              <FlowEdge label="alternativas" tone="var(--amber)" dashed active={false} />
              <div className="flow-unknown-options">
                {(analysis.suggestions ?? []).slice(0, 3).map((suggestion) => (
                  <button type="button" className="flow-mini-option" key={suggestion.id} onClick={() => onApplySuggestion(suggestion)}>
                    <span>{suggestion.label}</span>
                    <ArrowRight size={12} />
                  </button>
                ))}
              </div>
            </div>
          ) : analysis.kind === 'pipeline' ? (
            <div className="flow-canvas">
              <FlowSourceNode categoryId={completeStages[0]?.category ?? referenceCommand?.cat ?? 'objetos'} world={world} />
              {completeStages.map((stage, index) => (
                <div key={`${stage.cmdlet}-${index}`}>
                  <FlowEdge label={index === 0 ? 'entrada' : objectCountLabel(completeStages[index - 1]?.outputCount ?? 0)} tone={outputTone} active={index === 0} />
                  <FlowStageNode stage={stage} index={index} />
                </div>
              ))}
              <FlowEdge label={lastStage?.outputCount != null ? `${lastStage.outputCount} objetos` : 'segue'} tone={outputTone} dashed />
              <button type="button" className="flow-next-stage" onClick={() => analysis.suggestions?.[0] && onApplySuggestion(analysis.suggestions[0])}>
                <span className="flow-node-icon"><Play size={14} /></span>
                <span>
                  <small>PRÓXIMA ETAPA</small>
                  <strong>{analysis.suggestions?.[0]?.label ?? 'Escolha uma sugestão'}</strong>
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : isDraft ? (
            <div className="flow-canvas">
              <FlowSourceNode categoryId={referenceCommand?.cat ?? 'objetos'} world={world} />
              <FlowEdge label="montando" tone={outputTone} dashed />
              <FlowStageNode
                stage={{
                  commandName: analysis.commandName,
                  cmdlet: analysis.commandName,
                  summary: referenceCommand?.summary,
                  args: analysis.tokens?.slice(1).map((token) => token.raw) ?? [],
                  outputCount: null,
                }}
                index={0}
                draft
              />
              <FlowEdge label="aguardando" tone="var(--border-strong)" dashed active={false} />
              <FlowOutcomeNode preview={null} draft suggested={Boolean(draftSuggestion)} />
              {draftSuggestion ? <DraftNextNode suggestion={draftSuggestion} /> : null}
            </div>
          ) : (
            <div className="flow-canvas">
              <FlowSourceNode categoryId={completeStages[0]?.category ?? referenceCommand?.cat ?? 'objetos'} world={world} />
              {completeStages.map((stage, index) => (
                <div key={`${stage.cmdlet}-${index}`}>
                  <FlowEdge label={index === 0 ? 'lê' : objectCountLabel(completeStages[index - 1]?.outputCount ?? 0)} tone={outputTone} active={index === 0} />
                  <FlowStageNode stage={stage} index={index} />
                </div>
              ))}
              <FlowEdge
                label={errors.length ? 'interrompido' : effectivePreview?.objects?.length ? objectCountLabel(effectivePreview.objects.length) : effects.length ? 'impacto' : 'saída'}
                tone={errors.length ? 'var(--danger)' : outputTone}
                dashed={Boolean(errors.length)}
                active={!errors.length}
              />
              <FlowOutcomeNode preview={effectivePreview} />
            </div>
          )}
        </section>

        <section className="flow-section">
          <header className="flow-section-head">
            <div><ShieldCheck size={13} /><span>Impacto</span></div>
            <span className="flow-section-hint">{effects.length ? `${effects.length} ${effects.length === 1 ? 'alteração' : 'alterações'} · ${executed ? 'aplicado' : 'prévia'}` : executed ? 'resultado da execução' : 'antes de executar'}</span>
          </header>
          {effects.length ? (
            <div className="effect-stack">
              {analysis.kind === 'natural' ? (
                <div className="effect-preview-note"><Sparkles size={12} /> Se você usar a sugestão, o mundo simulado mudaria assim:</div>
              ) : executed ? (
                <div className="effect-preview-note is-applied"><CheckCircle2 size={12} /> Executado: este é o antes e depois registrado no mundo simulado.</div>
              ) : null}
              {effects.slice(0, 4).map((effectItem, index) => <EffectCard effect={effectItem} key={`${effectItem.type}-${index}`} />)}
              {effects.length > 4 ? <div className="effect-more">+{effects.length - 4} alterações adicionais</div> : null}
            </div>
          ) : (
            <div className={`readonly-note ${errors.length ? 'has-error' : ''}`}>
              <span className="readonly-icon">{errors.length ? <CircleAlert size={15} /> : analysis.kind === 'pipeline' || isDraft ? <Info size={15} /> : <Eye size={15} />}</span>
              <div>
                <strong>{errors.length ? 'Nada foi alterado' : analysis.kind === 'pipeline' ? 'Pipeline em construção' : isDraft ? 'Impacto ainda desconhecido' : 'Somente leitura'}</strong>
                <span>{errors.length ? 'O comando parou antes de tocar no mundo simulado.' : analysis.kind === 'pipeline' ? 'Escolha a próxima etapa para ver o resultado e o impacto.' : isDraft ? 'Complete o comando para ver o antes e o depois.' : 'Este comando não altera arquivos, usuários, serviços ou configurações.'}</span>
              </div>
            </div>
          )}
        </section>

        <section className="flow-section">
          <header className="flow-section-head">
            <div><ArrowRight size={13} /><span>Próximos passos</span></div>
            {analysis.kind === 'natural' ? <span className="flow-section-hint">sugestão</span> : null}
          </header>

          {analysis.kind === 'empty' ? (
            <div className="flow-next-list">
              {emptyIntents.map((suggestion) => (
                <button type="button" className="flow-next-item" key={suggestion.id} onClick={() => onApplySuggestion(suggestion)}>
                  <span className="flow-next-icon"><Sparkles size={13} /></span>
                  <span><strong>{suggestion.title}</strong><small>{suggestion.description}</small></span>
                  <ArrowRight size={13} />
                </button>
              ))}
              {starterSuggestions.map((suggestion) => (
                <button type="button" className="flow-next-item is-command" key={suggestion.id} onClick={() => onApplySuggestion(suggestion)}>
                  <span className="flow-next-icon"><TerminalSquare size={13} /></span>
                  <span><strong>{suggestion.label}</strong><small>{suggestion.description}</small></span>
                  <ArrowRight size={13} />
                </button>
              ))}
              <button type="button" className="flow-browse-link" onClick={onBrowseLessons}>
                <BookOpen size={13} /> Explorar todas as trilhas
              </button>
            </div>
          ) : analysis.kind === 'natural' && topIntent ? (
            <div className="intent-cta">
              <div className="intent-cta-copy">
                <span className="intent-cta-kicker">COMANDO ESCOLHIDO</span>
                <strong>{topIntent.cmdlet}</strong>
                <p>{truncate(topIntent.template, 160)}</p>
              </div>
              <button type="button" className="button button-primary" onClick={() => onUseIntent(topIntent)}>
                Usar este comando
                <ArrowRight size={14} />
              </button>
              {referenceCommand ? (
                <button type="button" className="button button-ghost" onClick={() => onOpenCategoryLesson(referenceCommand.cat)}>
                  <BookOpen size={14} />
                  Ver aula relacionada
                </button>
              ) : null}
            </div>
          ) : steps.length ? (
            <div className="flow-next-list">
              {steps.map((suggestion) => (
                <button type="button" className={`flow-next-item kind-${suggestion.kind}`} key={suggestion.id} onClick={() => onApplySuggestion(suggestion)}>
                  <span className="flow-next-icon">{suggestion.kind === 'verify' ? <CheckCircle2 size={13} /> : suggestion.kind === 'pipeline' ? <Workflow size={13} /> : <ArrowRight size={13} />}</span>
                  <span>
                    <strong>{suggestion.label}</strong>
                    <small>{suggestion.kind === 'verify' ? `verificar · ${suggestion.description}` : suggestion.description}</small>
                  </span>
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          ) : (
            <div className="flow-empty-next">
              <Info size={13} />
              <span>Continue digitando para receber a próxima sugestão. Ou abra a aula para ver outros caminhos.</span>
              <button type="button" onClick={onOpenLesson}><BookOpen size={12} /> Abrir aula</button>
            </div>
          )}

          {isDraft && draftSuggestion ? (
            <button type="button" className="draft-suggestion" onClick={() => onApplySuggestion(draftSuggestion)}>
              <Wand2 size={13} />
              <span>Completar com <code>{draftSuggestion.label}</code></span>
              <ArrowRight size={12} />
            </button>
          ) : null}
        </section>

        {referenceCommand ? (
          <section className="flow-reference">
            <button type="button" className="flow-reference-head" onClick={() => setReferenceOpen((value) => !value)} aria-expanded={referenceOpen}>
              <span className="flow-reference-title"><TerminalSquare size={13} /> Referência · <code>{referenceCommand.name}</code></span>
              <ChevronDown size={14} className={referenceOpen ? 'is-open' : ''} />
            </button>
            {referenceOpen ? (
              <div className="flow-reference-body">
                <p>{referenceCommand.summary}</p>
                <div className="reference-params">
                  {(referenceCommand.params ?? []).slice(0, 5).map((param) => (
                    <div className="reference-param" key={param.name}>
                      <code>-{param.name}</code>
                      <span>{param.desc}</span>
                    </div>
                  ))}
                </div>
                <div className="reference-example">
                  <span>EXEMPLO</span>
                  <code>{referenceCommand.example}</code>
                  <button type="button" onClick={() => onInsert(referenceCommand.example)}>inserir</button>
                </div>
                {referenceCommand.aliases?.length ? <div className="reference-aliases">atalhos: {referenceCommand.aliases.map((alias) => <code key={alias}>{alias}</code>)}</div> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="flow-footnote">
          <ShieldCheck size={13} />
          <span>Simulação local. Nada aqui toca o seu Windows de verdade.</span>
        </div>
      </div>
    </aside>
  )
}
