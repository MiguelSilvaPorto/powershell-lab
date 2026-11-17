import { useMemo, useState } from 'react'
import {
  BookMarked,
  BookmarkPlus,
  Braces,
  Copy,
  Monitor,
  Pencil,
  Pin,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import Modal from './Modal.jsx'
import {
  SHORTCUT_MODELS,
  formatShortcutDate,
  shortcutParameterSummary,
} from '../data/shortcuts.js'

export default function CommandLibraryModal({
  shortcuts,
  currentCommand,
  isReal,
  onClose,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePin,
  onSaveCurrent,
  onUseModel,
}) {
  const [query, setQuery] = useState('')

  const ordered = useMemo(() => {
    const normalized = String(query).trim().toLowerCase()
    return [...(shortcuts ?? [])]
      .filter((shortcut) => {
        if (!normalized) return true
        return `${shortcut.name} ${shortcut.description} ${shortcut.command}`.toLowerCase().includes(normalized)
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return String(b.lastRunAt || b.updatedAt).localeCompare(String(a.lastRunAt || a.updatedAt))
      })
  }, [shortcuts, query])

  const pinnedCount = (shortcuts ?? []).filter((shortcut) => shortcut.pinned).length

  return (
    <Modal onClose={onClose} className="library-modal" labelledBy="library-title" size="large">
      <header className="library-head">
        <div className="modal-kicker"><BookMarked size={13} /> Biblioteca de comandos</div>
        <div className="library-title-row">
          <div>
            <h2 id="library-title">Meus atalhos.</h2>
            <p className="modal-lead">
              Salve comandos que já funcionaram, transforme valores em campos e execute em um clique.
              {isReal ? ' O modo atual executa no seu PC.' : ' O modo atual é o simulador seguro.'}
            </p>
          </div>
          <div className="library-head-actions">
            <span className={`shortcut-mode-pill ${isReal ? 'is-real' : ''}`}>
              {isReal ? <><Monitor size={10} /> REAL</> : <><Sparkles size={10} /> SIM</>}
            </span>
            <button
              type="button"
              className="button button-primary"
              onClick={onSaveCurrent}
              disabled={!String(currentCommand || '').trim()}
              title={String(currentCommand || '').trim() ? 'Salvar o comando que está no console' : 'Digite um comando no console para salvar'}
            >
              <BookmarkPlus size={14} />
              Salvar comando atual
            </button>
          </div>
        </div>
        <div className="library-stats">
          <span><strong>{shortcuts?.length ?? 0}</strong> atalhos</span>
          <span><Pin size={10} /> <strong>{pinnedCount}</strong> fixados</span>
          <span><Braces size={10} /> parâmetros como <code>{'{{usuario}}'}</code></span>
        </div>
      </header>

      <div className="library-toolbar">
        <label className="library-search">
          <Search size={14} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, descrição ou comando"
          />
          {query ? <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={13} /></button> : null}
        </label>
      </div>

      <div className="library-body">
        {ordered.length ? (
          <div className="shortcut-library-list">
            {ordered.map((shortcut) => (
              <article className={`saved-shortcut ${shortcut.pinned ? 'is-pinned' : ''}`} key={shortcut.id}>
                <div className="saved-shortcut-main">
                  <div className="saved-shortcut-title-row">
                    <span className="saved-shortcut-icon"><Braces size={14} /></span>
                    <div>
                      <h3>{shortcut.name}{shortcut.pinned ? <Pin size={11} className="pinned-mark" /> : null}</h3>
                      <span>{shortcut.description || 'Atalho salvo'}</span>
                    </div>
                    <span className="saved-shortcut-version">v{shortcut.version}</span>
                  </div>
                  <code className="saved-shortcut-command">{shortcut.command}</code>
                  <div className="saved-shortcut-meta">
                    <span>{shortcut.parameters?.length ? `${shortcut.parameters.length} campo${shortcut.parameters.length === 1 ? '' : 's'} · ${shortcutParameterSummary(shortcut)}` : 'sem parâmetros'}</span>
                    <span>{shortcut.runCount ? `${shortcut.runCount}× usado · ${formatShortcutDate(shortcut.lastRunAt)}` : 'nunca executado'}</span>
                  </div>
                </div>
                <div className="saved-shortcut-actions">
                  <button type="button" className={`shortcut-icon-action ${shortcut.pinned ? 'is-pinned' : ''}`} onClick={() => onTogglePin(shortcut)} title={shortcut.pinned ? 'Desafixar da barra lateral' : 'Fixar na barra lateral'} aria-label={shortcut.pinned ? 'Desafixar atalho' : 'Fixar atalho'}>
                    <Pin size={14} />
                  </button>
                  <button type="button" className="shortcut-icon-action" onClick={() => onEdit(shortcut)} title="Editar atalho" aria-label="Editar atalho">
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="shortcut-icon-action" onClick={() => onDuplicate(shortcut)} title="Duplicar e criar uma variação" aria-label="Duplicar atalho">
                    <Copy size={14} />
                  </button>
                  <button type="button" className="shortcut-icon-action is-danger" onClick={() => onDelete(shortcut)} title="Excluir atalho" aria-label="Excluir atalho">
                    <Trash2 size={14} />
                  </button>
                  <button type="button" className="button button-primary button-small saved-shortcut-run" onClick={() => onRun(shortcut)}>
                    <Play size={12} fill="currentColor" /> Executar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <span className="library-empty-icon"><BookMarked size={22} /></span>
            <div>
              <h3>{query ? 'Nenhum atalho encontrado.' : 'Sua biblioteca está vazia.'}</h3>
              <p>
                {query
                  ? 'Tente outro termo ou limpe a busca.'
                  : 'Execute um comando no console, clique em “Salvar comando atual” e transforme os valores em campos com {{param}}.'}
              </p>
            </div>
          </div>
        )}

        <section className="shortcut-models">
          <div className="shortcut-models-head">
            <div><Sparkles size={14} /><h3>Modelos para começar</h3></div>
            <span>parametrizados</span>
          </div>
          <div className="shortcut-model-grid">
            {SHORTCUT_MODELS.map((model) => (
              <article className="shortcut-model-card" key={model.id}>
                <div className="shortcut-model-icon"><Plus size={13} /></div>
                <h4>{model.name}</h4>
                <p>{model.description}</p>
                <code>{model.command}</code>
                <button type="button" className="mini-button" onClick={() => onUseModel(model)}>
                  <BookmarkPlus size={12} /> Usar como base
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="library-footer">
        <span>Salvos apenas neste navegador. Nada é enviado automaticamente para a nuvem.</span>
        <button type="button" className="button button-ghost button-small" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  )
}
