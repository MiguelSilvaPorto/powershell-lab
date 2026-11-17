import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Braces,
  Check,
  Copy,
  LoaderCircle,
  Monitor,
  Pencil,
  Pin,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Modal from './Modal.jsx'
import {
  SHORTCUT_PROVIDERS,
  formatShortcutDate,
  renderShortcutCommand,
  shortcutParameterSummary,
} from '../data/shortcuts.js'

export default function ShortcutRunModal({ shortcut, isReal, realBusy, loadOptions, onClose, onExecute, onEdit, onDuplicate }) {
  const [values, setValues] = useState(() => Object.fromEntries(
    (shortcut.parameters ?? []).map((parameter) => [parameter.name, shortcut.lastValues?.[parameter.name] ?? '']),
  ))
  const [providerOptions, setProviderOptions] = useState({})
  const [providerLoading, setProviderLoading] = useState({})
  const [providerErrors, setProviderErrors] = useState({})
  const [copied, setCopied] = useState(false)
  const loadOptionsRef = useRef(loadOptions)
  loadOptionsRef.current = loadOptions
  const cancellation = useRef(false)
  const loadedProviders = useRef(new Set())

  const providers = useMemo(
    () => [...new Set((shortcut.parameters ?? []).map((parameter) => parameter.provider).filter(Boolean))],
    [shortcut.parameters],
  )

  async function loadProvider(provider, force = false) {
    if (!provider) return
    if (!force && loadedProviders.current.has(provider)) return
    if (providerLoading[provider]) return
    loadedProviders.current.add(provider)
    setProviderLoading((previous) => ({ ...previous, [provider]: true }))
    setProviderErrors((previous) => ({ ...previous, [provider]: '' }))
    try {
      const options = await loadOptionsRef.current(provider)
      if (cancellation.current) return
      setProviderOptions((previous) => ({ ...previous, [provider]: options }))
    } catch (error) {
      if (cancellation.current) return
      setProviderOptions((previous) => ({ ...previous, [provider]: [] }))
      setProviderErrors((previous) => ({
        ...previous,
        [provider]: error?.message || 'Não foi possível carregar as opções.',
      }))
      loadedProviders.current.delete(provider)
    } finally {
      if (!cancellation.current) setProviderLoading((previous) => ({ ...previous, [provider]: false }))
    }
  }

  useEffect(() => {
    cancellation.current = false
    let cancelled = false
    const run = async () => {
      for (const provider of providers) {
        if (cancelled) break
        await loadProvider(provider)
      }
    }
    run()
    return () => {
      cancelled = true
      cancellation.current = true
    }
    // Providers are intentionally loaded once when the shortcut form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcut.id])

  function setValue(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  const finalCommand = renderShortcutCommand(shortcut.command, values)
  const allFilled = (shortcut.parameters ?? []).every((parameter) => String(values[parameter.name] ?? '').trim().length > 0)
  const providerLabel = (provider) => SHORTCUT_PROVIDERS[provider]?.label ?? 'Sugestões'

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(finalCommand)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal onClose={onClose} className="shortcut-run-modal" labelledBy="shortcut-run-title" size="default">
      <div className="shortcut-run-head">
        <div>
          <div className="modal-kicker">
            {isReal ? <Monitor size={13} /> : <ShieldCheck size={13} />}
            {isReal ? 'Executar no seu PC' : 'Executar no simulador'}
            {shortcut.pinned ? <span className="shortcut-pinned-badge"><Pin size={10} /> fixado</span> : null}
          </div>
          <h2 id="shortcut-run-title">{shortcut.name}</h2>
          <p>{shortcut.description || shortcutParameterSummary(shortcut)}</p>
        </div>
      </div>

      <div className="shortcut-run-body">
        {(shortcut.parameters ?? []).length ? (
          <div className="shortcut-run-fields">
            {(shortcut.parameters ?? []).map((parameter) => {
              const provider = parameter.provider
              const loading = providerLoading[provider]
              const error = providerErrors[provider]
              const options = providerOptions[provider] ?? []
              const optionsLoaded = Array.isArray(providerOptions[provider])
              const query = String(values[parameter.name] ?? '')
              const exactMatch = options.includes(query)
              const ordered = exactMatch ? [query, ...options.filter((option) => option !== query)] : options
              const filtered = ordered
                .filter((option) => !query || exactMatch || option.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 12)
              const showingAll = !query || exactMatch
              const providerInfo = provider ? SHORTCUT_PROVIDERS[provider] : null
              return (
                <div className={`shortcut-run-field ${error ? 'has-error' : ''}`} key={parameter.name}>
                  <div className="shortcut-run-field-head">
                    <label htmlFor={`shortcut-param-${parameter.name}`}>{parameter.label || parameter.name}</label>
                    <span>{'{'}{'{'}{parameter.name}{'}'}{'}'}</span>
                    {provider ? (
                      <button
                        type="button"
                        className="shortcut-refresh-options"
                        onClick={() => loadProvider(provider, true)}
                        disabled={loading || realBusy}
                        title="Recarregar opções"
                      >
                        {loading ? <LoaderCircle size={11} className="spin" /> : <RefreshCw size={11} />}
                        {providerInfo?.label ?? 'Opções'}
                      </button>
                    ) : null}
                  </div>
                  <input
                    id={`shortcut-param-${parameter.name}`}
                    type="text"
                    value={values[parameter.name] ?? ''}
                    onChange={(event) => setValue(parameter.name, event.target.value)}
                    placeholder={provider ? `Digite ou escolha ${providerInfo?.short.toLowerCase() ?? 'um valor'}…` : 'Digite o valor…'}
                    autoComplete="off"
                  />
                  {provider ? (
                    <div className="shortcut-field-hint">
                      {loading ? (
                        <span><LoaderCircle size={11} className="spin" /> lendo {providerInfo?.short} {isReal ? 'do seu PC' : 'do simulador'}…</span>
                      ) : error ? (
                        <span className="shortcut-provider-error"><AlertTriangle size={11} /> {error.split('\n')[0]}</span>
                      ) : optionsLoaded && !options.length ? (
                        <span>Nenhum valor encontrado. Digite manualmente ou atualize.</span>
                      ) : (
                        <span>{providerInfo?.hint} {isReal ? ' (lido do seu PC)' : ' (mundo simulado)'}</span>
                      )}
                    </div>
                  ) : null}
                  {error && provider ? (
                    <button type="button" className="shortcut-inline-retry" onClick={() => loadProvider(provider, true)}>
                      <RefreshCw size={11} /> Tentar de novo
                    </button>
                  ) : null}
                  {provider && options.length ? (
                    <div className="shortcut-option-list">
                      {filtered.map((option) => (
                        <button
                          type="button"
                          key={option}
                          className={`shortcut-option ${values[parameter.name] === option ? 'is-selected' : ''}`}
                          onClick={() => setValue(parameter.name, option)}
                          title={option}
                        >
                          {values[parameter.name] === option ? <Check size={11} /> : <span className="option-dot" />}
                          <span>{option}</span>
                        </button>
                      ))}
                      {!filtered.length ? <span className="shortcut-option-empty">Nenhuma opção para “{query}”. Digite o valor ou atualize.</span> : null}
                      {options.length > filtered.length && showingAll ? (
                        <span className="shortcut-option-more">+{options.length - filtered.length} opções. Digite para filtrar.</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="shortcut-no-params">
            <Sparkles size={14} />
            Este atalho não pede parâmetros. O comando abaixo está pronto.
          </div>
        )}

        <div className="shortcut-final">
          <div className="shortcut-final-head">
            <span><Braces size={13} /> Comando final</span>
            <button type="button" className="mini-button" onClick={copyCommand}>
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'copiado' : 'copiar'}
            </button>
          </div>
          <pre>{finalCommand}</pre>
          {shortcut.parameters?.length && !allFilled ? <span className="shortcut-final-warning">Preencha todos os campos para executar.</span> : null}
        </div>

        {isReal ? (
          <div className="shortcut-real-warning">
            <AlertTriangle size={14} />
            <div>
              <strong>Isto vai afetar o seu computador.</strong>
              <span>O comando será executado na sessão real do PowerShell. Confira os valores e o comando final antes de continuar.</span>
            </div>
          </div>
        ) : (
          <div className="shortcut-sim-note">
            <ShieldCheck size={13} />
            Execução simulada. As trilhas e tarefas continuam seguras.
          </div>
        )}
      </div>

      <div className="shortcut-run-footer">
        <div className="shortcut-run-meta">
          <span>v{shortcut.version}</span>
          <span>·</span>
          <span>{shortcut.runCount ? `usado ${shortcut.runCount}× · ${formatShortcutDate(shortcut.lastRunAt)}` : 'ainda não executado'}</span>
        </div>
        <div className="shortcut-run-actions">
          <button type="button" className="button button-ghost button-small" onClick={() => onEdit(shortcut)}>
            <Pencil size={12} /> Editar
          </button>
          <button type="button" className="button button-ghost button-small" onClick={() => onDuplicate(shortcut)}>
            <BookmarkPlus size={12} /> Duplicar
          </button>
          <button
            type="button"
            className={`button ${isReal ? 'button-real' : 'button-primary'}`}
            onClick={() => onExecute(finalCommand, values)}
            disabled={!allFilled || realBusy}
          >
            <Play size={13} fill="currentColor" />
            {realBusy ? 'Aguarde…' : isReal ? 'Executar no PC' : 'Executar no simulador'}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </Modal>
  )
}

