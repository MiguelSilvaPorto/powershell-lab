import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpLeft,
  Braces,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  Cpu,
  File,
  Folder,
  Info,
  KeyRound,
  LoaderCircle,
  Monitor,
  Network,
  Package,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  TriangleAlert,
  UserRound,
  UsersRound,
  Workflow,
} from 'lucide-react'
import { categoryFor } from '../data/catalog.js'
import ErrorTranslation from './ErrorTranslation.jsx'
import { compactNumber, formatBytes, formatNumber, truncate } from '../utils/format.js'

function isBoolColumn(column, value) {
  return typeof value === 'boolean'
}

function BoolValue({ value }) {
  return <span className={`bool-pill ${value ? 'is-true' : 'is-false'}`}>{value ? 'True' : 'False'}</span>
}

function ArrayValue({ value }) {
  const items = (value ?? []).map((item) => (typeof item === 'object' && item !== null ? item.Name ?? item.name ?? JSON.stringify(item) : String(item)))
  if (!items.length) return <span className="cell-empty">—</span>
  return (
    <span className="array-value" title={items.join(', ')}>
      {items.slice(0, 3).map((item, index) => (
        <span className="value-chip" key={`${item}-${index}`}>{item}</span>
      ))}
      {items.length > 3 ? <span className="value-chip chip-more">+{items.length - 3}</span> : null}
    </span>
  )
}

function ValueCell({ value, column, meta, row }) {
  if (value === null || value === undefined || value === '') return <span className="cell-empty">—</span>
  if (Array.isArray(value)) return <ArrayValue value={value} />
  if (typeof value === 'boolean') return <BoolValue value={value} />
  if (column.format === 'bytes') return <span title={`${formatNumber(value)} bytes`}>{formatBytes(value)}</span>
  if (column.key === 'Downloads') return <span title={formatNumber(value)}>{compactNumber(value)}</span>
  if (['Id', 'ProcessId', 'LocalPort', 'RemotePort', 'RouteMetric', 'PrefixLength', 'LineNumber', 'InterfaceIndex'].includes(column.key)) return <span>{String(value)}</span>
  if (typeof value === 'number') return <span>{formatNumber(value)}</span>
  if (column.key === 'Mode' || column.key === 'Hash' || column.key === 'SamAccountName' || column.key === 'IPV4Address' || column.key === 'RemoteAddress' || column.key === 'ServerAddresses') {
    return <span className="mono-cell">{String(value)}</span>
  }
  if (['Description', 'Definition', 'Line', 'DistinguishedName', 'RemotePath', 'FullName'].includes(column.key)) {
    return <span className="long-cell" title={String(value)}>{String(value)}</span>
  }
  if (column.key === 'Name') {
    const Icon = rowIcon(meta, row)
    return (
      <span className="name-cell">
        {Icon ? <Icon size={13} className="row-icon" /> : null}
        <span>{String(value)}</span>
      </span>
    )
  }
  return <span>{String(value)}</span>
}

function rowIcon(meta, row) {
  if (meta?.typeName === 'FileSystemInfo' || meta?.typeName === 'FileInfo' || meta?.typeName === 'DirectoryInfo') {
    return row?.PSIsContainer ? Folder : File
  }
  if (meta?.typeName === 'ADUser' || meta?.typeName === 'LocalUser') return UserRound
  if (meta?.typeName === 'ADGroup' || meta?.typeName === 'ADPrincipal' || meta?.typeName === 'LocalGroup' || meta?.typeName === 'LocalPrincipal') return UsersRound
  if (meta?.typeName === 'PSModuleInfo' || meta?.typeName === 'PSRepositoryItemInfo') return Package
  if (meta?.typeName === 'ScheduledTask') return CalendarClock
  if (meta?.typeName === 'NetTCPConnection' || meta?.typeName === 'SmbMapping') return Network
  if (meta?.typeName === 'RegistryKey' || meta?.typeName === 'PSCustomObject' && row?.PSPath?.includes('Registry')) return KeyRound
  return null
}

function ResultTable({ objects, meta }) {
  const columns = meta.columns?.length ? meta.columns : inferColumns(objects)
  return (
    <div className="result-table-wrap">
      <table className="result-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`align-${column.align ?? 'left'}`} scope="col">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {objects.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column.key} className={`align-${column.align ?? 'left'}`}>
                  <ValueCell value={row?.[column.key]} column={column} meta={meta} row={row} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function inferColumns(objects) {
  if (!objects?.length) return []
  const first = objects[0]
  if (typeof first !== 'object' || first === null) return [{ key: 'Value', label: 'Value' }]
  return Object.keys(first).filter((key) => !key.startsWith('__')).slice(0, 7).map((key) => ({ key, label: key, align: typeof first[key] === 'number' ? 'right' : 'left' }))
}

function ResultList({ objects, meta }) {
  const columns = meta.columns?.length ? meta.columns : inferColumns(objects)
  if (!objects.length) return null
  return (
    <div className="result-list">
      {objects.map((object, index) => (
        <div className="result-list-item" key={index}>
          {objects.length > 1 ? <div className="result-list-index">#{index + 1}</div> : null}
          <dl>
            {columns.map((column) => {
              const value = object?.[column.key]
              if (value === undefined) return null
              return (
                <div className="result-list-row" key={column.key}>
                  <dt>{column.label}</dt>
                  <dd><ValueCell value={value} column={column} meta={meta} row={object} /></dd>
                </div>
              )
            })}
          </dl>
        </div>
      ))}
    </div>
  )
}

function TextOutput({ text }) {
  return <pre className="result-text">{text}</pre>
}

function TerminalEntry({ entry, onReuse, onCopy, onInsert }) {
  const [showJson, setShowJson] = useState(false)
  const result = entry.result
  const view = result.meta?.view ?? 'none'
  const objects = result.objects ?? []
  const effectCount = result.effects?.length ?? 0
  const isRealEntry = Boolean(result.real)
  const status = !result.ok ? 'error' : effectCount ? 'changed' : 'ok'
  const hasStructured = objects.length > 0 && view !== 'text'
  const notes = [...(result.notes ?? [])]
  if (!notes.length && effectCount) notes.push(`${effectCount} ${effectCount === 1 ? 'alteração registrada' : 'alterações registradas'} no mundo simulado.`)

  return (
    <article className="terminal-entry">
      <div className="entry-command">
        <span className="entry-prompt">❯</span>
        <span className={`entry-env ${isRealEntry ? 'is-real' : ''}`}>{isRealEntry ? 'REAL' : 'SIM'}</span>
        <code>{entry.command}</code>
        <span className={`entry-status is-${status}`}>
          {status === 'error' ? 'erro' : status === 'changed' ? `${effectCount} ${effectCount === 1 ? 'alteração' : 'alterações'}` : 'ok'}
        </span>
        <span className="entry-time">{entry.duration ? `${entry.duration} ms` : ''}</span>
        <div className="entry-actions">
          <button type="button" className="icon-button" onClick={() => onCopy(entry.command)} title="Copiar comando" aria-label="Copiar comando">
            <Copy size={13} />
          </button>
          <button type="button" className="icon-button" onClick={() => onReuse(entry.command)} title="Trazer de volta ao editor" aria-label="Reutilizar comando">
            <ArrowUpLeft size={13} />
          </button>
        </div>
      </div>

      <div className="entry-body">
        {(result.hostMessages ?? []).map((message, index) => (
          <div className={`host-message host-${message.level}`} key={`host-${index}`}>
            {message.text}
          </div>
        ))}

        {hasStructured ? (
          <div className="result-block">
            <div className="result-toolbar">
              <div className="result-meta">
                <span className="result-count">{objects.length} {objects.length === 1 ? 'objeto' : 'objetos'}</span>
                <span className="result-separator">·</span>
                <span className="result-type">{result.meta?.typeName}</span>
              </div>
              <div className="result-actions">
                <button type="button" className={`mini-toggle ${showJson ? 'is-active' : ''}`} onClick={() => setShowJson((value) => !value)}>
                  <Braces size={12} />
                  JSON
                </button>
              </div>
            </div>
            {showJson ? (
              <pre className="result-json">{JSON.stringify(objects, null, 2)}</pre>
            ) : view === 'list' ? (
              <ResultList objects={objects} meta={result.meta} />
            ) : (
              <ResultTable objects={objects} meta={result.meta} />
            )}
          </div>
        ) : null}

        {view === 'text' && result.meta?.text ? (
          <div className={`result-block text-block ${result.meta.typeName === 'HelpInfo' ? 'is-help' : ''} ${isRealEntry ? 'is-real' : ''} ${isRealEntry && !result.ok ? 'is-real-error' : ''}`}>
            <TextOutput text={result.meta.text} />
            {isRealEntry && !result.ok ? <ErrorTranslation text={result.meta.text} /> : null}
            {objects.length ? (
              <div className="result-toolbar text-toolbar">
                <span className="result-type">{result.meta.typeName}</span>
                <button type="button" className={`mini-toggle ${showJson ? 'is-active' : ''}`} onClick={() => setShowJson((value) => !value)}>
                  <Braces size={12} /> objetos
                </button>
              </div>
            ) : null}
            {showJson && objects.length ? <pre className="result-json">{JSON.stringify(objects, null, 2)}</pre> : null}
          </div>
        ) : null}

        {!hasStructured && view !== 'text' && objects.length ? (
          <div className="result-block">
            <ResultTable objects={objects} meta={result.meta} />
          </div>
        ) : null}

        {(result.warnings ?? []).length ? (
          <div className="output-warnings">
            {result.warnings.map((warning, index) => (
              <div className="output-warning" key={index}><TriangleAlert size={13} /> {warning}</div>
            ))}
          </div>
        ) : null}

        {(result.errors ?? []).length ? (
          <div className="output-errors">
            {result.errors.map((error, index) => (
              <div className="output-error" key={index}>
                <div className="output-error-head">
                  <CircleAlert size={14} />
                  <span>O comando encontrou um problema</span>
                </div>
                <p>{error.message}</p>
                <ErrorTranslation text={error.message} compact />
                {error.hint ? <p className="output-error-hint">{error.hint}</p> : null}
                {error.suggestions?.length ? (
                  <div className="error-suggestions">
                    {error.suggestions.map((suggestion) => (
                      <button type="button" key={suggestion} className="code-chip" onClick={() => onInsert(suggestion)}>{suggestion}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {notes.length ? (
          <div className="output-notes">
            {notes.map((note, index) => (
              <div className="output-note" key={index}>
                {isRealEntry && !result.ok ? <CircleAlert size={13} /> : <CheckCircle2 size={13} />}
                <span>{note}</span>
              </div>
            ))}
          </div>
        ) : null}

        {!hasStructured && view !== 'text' && !objects.length && !(result.errors ?? []).length && !notes.length ? (
          <div className="output-note muted"><Info size={13} /> Comando concluído sem saída.</div>
        ) : null}
      </div>
    </article>
  )
}

function DemoFlow({ onInsert, realMode = false, realCwd = '', realVersion = '' }) {
  if (realMode) {
    return (
      <div className="terminal-empty real-empty">
        <div className="empty-visual real-empty-visual">
          <span className="real-empty-icon"><Monitor size={22} /></span>
          <div className="real-empty-copy">
            <span className="empty-visual-label">CONECTADO AO SEU PC</span>
            <strong>PowerShell real{realVersion ? ` ${realVersion}` : ''}</strong>
            <code>{realCwd || 'localização atual'}</code>
          </div>
          <span className="real-empty-pulse" />
        </div>
        <div className="empty-copy">
          <div className="empty-kicker"><AlertTriangleIcon /> Modo real ativo</div>
          <h3>O console é seu.</h3>
          <p>
            Os comandos agora rodam no PowerShell do seu computador. A saída é real e as mudanças
            também. Revise o comando antes de apertar Enter.
          </p>
        </div>
        <div className="empty-actions">
          <button type="button" className="empty-command" onClick={() => onInsert('Get-Process')}>
            <Cpu size={14} />
            <span>Get-Process</span>
            <small>processos reais</small>
          </button>
          <button type="button" className="empty-command" onClick={() => onInsert('Get-Location')}>
            <Folder size={14} />
            <span>Get-Location</span>
            <small>onde estou</small>
          </button>
          <button type="button" className="empty-command" onClick={() => onInsert('$PSVersionTable')}>
            <TerminalSquare size={14} />
            <span>$PSVersionTable</span>
            <small>versão real</small>
          </button>
          <button type="button" className="empty-command" onClick={() => onInsert('Get-ChildItem')}>
            <File size={14} />
            <span>Get-ChildItem</span>
            <small>arquivos reais</small>
          </button>
        </div>
        <div className="empty-footnote">
          <Monitor size={12} />
          Sessão persistente no seu PC. Use <code>Clear-Host</code> para limpar e alterne para o simulador quando quiser.
        </div>
      </div>
    )
  }
  return (
    <div className="terminal-empty">
      <div className="empty-visual" aria-hidden="true">
        <div className="empty-visual-label">UM COMANDO VIROU FLUXO</div>
        <div className="empty-flow">
          <div className="empty-node node-source">
            <span className="empty-node-icon"><Cpu size={14} /></span>
            <span>Get-Process</span>
            <small>18 objetos</small>
          </div>
          <span className="empty-connector"><span className="dot" /></span>
          <div className="empty-node node-filter">
            <span className="empty-node-icon"><Workflow size={14} /></span>
            <span>Where-Object</span>
            <small>CPU &gt; 10</small>
          </div>
          <span className="empty-connector"><span className="dot" /></span>
          <div className="empty-node node-output">
            <span className="empty-node-icon"><TerminalSquare size={14} /></span>
            <span>Select-Object</span>
            <small>top 3</small>
          </div>
        </div>
      </div>
      <div className="empty-copy">
        <div className="empty-kicker"><Sparkles size={13} /> O laboratório está pronto</div>
        <h3>Comandos viram fluxo.</h3>
        <p>
          Escreva um cmdlet, uma expressão ou uma intenção. A radiografia ao lado mostra de onde os dados vêm,
          o que cada etapa faz e o impacto antes de você executar.
        </p>
      </div>
      <div className="empty-actions">
        <button type="button" className="empty-command" onClick={() => onInsert('Get-Process')}>
          <Cpu size={14} />
          <span>Get-Process</span>
          <small>ver os processos</small>
        </button>
        <button type="button" className="empty-command" onClick={() => onInsert('Get-ADUser -Filter *')}>
          <UsersRound size={14} />
          <span>Get-ADUser -Filter *</span>
          <small>entrar no domínio</small>
        </button>
        <button type="button" className="empty-command" onClick={() => onInsert('New-SmbMapping -RemotePath "\\\\SRV-FILE01\\Financeiro" -LocalPath Z: -Persistent $true')}>
          <Network size={14} />
          <span>Mapear Z:</span>
          <small>conectar uma rede</small>
        </button>
        <button type="button" className="empty-command" onClick={() => onInsert('get add user')}>
          <Sparkles size={14} />
          <span>“get add user”</span>
          <small>testar uma intenção</small>
        </button>
      </div>
      <div className="empty-footnote">
        <Play size={12} />
        Comece pequeno: um objeto, um filtro, uma descoberta. Use <kbd>Enter</kbd> para executar e <kbd>Tab</kbd> para aceitar sugestões.
      </div>
    </div>
  )
}

function AlertTriangleIcon() {
  return <TriangleAlert size={13} />
}

export default function Terminal({ entries, realMode = false, realVersion = '', realCwd = '', busy = false, onResetReal, onReuse, onCopy, onInsert, onClear }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const lastEntry = node.querySelector('.terminal-entry:last-child')
    if (!lastEntry) {
      node.scrollTop = 0
      return
    }
    const top = lastEntry.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop - 6
    node.scrollTo({ top: Math.max(0, top), behavior: entries.length > 1 ? 'smooth' : 'auto' })
  }, [entries.length])

  return (
    <section className="terminal-card">
      <header className="terminal-head">
        <div className="terminal-head-title">
          <span className="terminal-head-icon"><TerminalSquare size={15} /></span>
          <span>Saída</span>
          {entries.length ? <span className="terminal-counter">{entries.length}</span> : null}
          <span className={`terminal-env-chip ${realMode ? 'is-real' : ''}`}>
            {realMode ? <><Monitor size={10} /> REAL</> : <><ShieldCheck size={10} /> SIM</>}
          </span>
        </div>
        <div className="terminal-head-actions">
          <span className={`terminal-live ${realMode ? 'is-real' : ''} ${busy ? 'is-busy' : ''}`}>
            {busy ? <LoaderCircle size={11} className="spin" /> : <span className={`live-dot ${realMode ? 'is-real' : ''}`} />}
            {busy ? 'executando…' : realMode ? 'execução real' : 'simulação local'}
          </span>
          {realMode ? (
            <button type="button" className="mini-button" onClick={onResetReal} disabled={busy} title="Reiniciar a sessão real do PowerShell">
              <RotateCcw size={12} /> Nova sessão
            </button>
          ) : null}
          <button type="button" className="mini-button" onClick={onClear} disabled={!entries.length}>
            <Trash2 size={13} />
            Limpar
          </button>
        </div>
      </header>
      <div className="terminal-scroll" ref={scrollRef}>
        {!entries.length ? (
          <DemoFlow onInsert={onInsert} realMode={realMode} realCwd={realCwd} realVersion={realVersion} />
        ) : (
          <div className="terminal-entries">
            {entries.map((entry) => (
              <TerminalEntry key={entry.id} entry={entry} onReuse={onReuse} onCopy={onCopy} onInsert={onInsert} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
