import { useMemo, useRef, useState } from 'react'
import {
  BookmarkPlus,
  Braces,
  Check,
  Info,
  Monitor,
  Pencil,
  Pin,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import Modal from './Modal.jsx'
import {
  SHORTCUT_PROVIDER_OPTIONS,
  extractPlaceholders,
  parametersForCommand,
} from '../data/shortcuts.js'

const COMMON_PLACEHOLDERS = ['usuario', 'grupo', 'processo', 'servico', 'computador', 'ou']

export default function ShortcutEditorModal({ draft, mode, isReal, onClose, onSave }) {
  const [name, setName] = useState(draft?.name && draft.name !== 'Comando sem nome' ? draft.name : '')
  const [description, setDescription] = useState(draft?.description ?? '')
  const [command, setCommand] = useState(draft?.command ?? '')
  const [parameters, setParameters] = useState(() => parametersForCommand(draft?.command ?? '', draft?.parameters ?? []))
  const [pinned, setPinned] = useState(Boolean(draft?.pinned))
  const [attempted, setAttempted] = useState(false)
  const textareaRef = useRef(null)

  const placeholderNames = useMemo(() => extractPlaceholders(command), [command])
  const valid = name.trim().length > 0 && command.trim().length > 0

  function handleCommandChange(value) {
    setCommand(value)
    setParameters((previous) => parametersForCommand(value, previous))
  }

  function insertPlaceholder(nameToInsert) {
    const element = textareaRef.current
    const token = `{{${nameToInsert}}}`
    if (!element) {
      setCommand((previous) => `${previous}${previous.endsWith(' ') ? '' : ' '}${token}`)
      return
    }
    const start = element.selectionStart ?? command.length
    const end = element.selectionEnd ?? command.length
    const next = `${command.slice(0, start)}${token}${command.slice(end)}`
    handleCommandChange(next)
    window.requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(start + token.length, start + token.length)
    })
  }

  function updateParameter(paramName, provider) {
    setParameters((previous) => previous.map((parameter) => (
      parameter.name === paramName ? { ...parameter, provider } : parameter
    )))
  }

  function submit() {
    setAttempted(true)
    if (!valid) return
    onSave({
      ...draft,
      name: name.trim(),
      description: description.trim(),
      command: command.trim(),
      parameters,
      pinned,
      id: mode === 'edit' ? draft?.id : undefined,
    })
  }

  return (
    <Modal onClose={onClose} className="shortcut-editor-modal" labelledBy="shortcut-editor-title" size="large">
      <div className="modal-kicker"><BookmarkPlus size={13} /> {mode === 'edit' ? 'Editar atalho' : 'Novo atalho'}</div>
      <h2 id="shortcut-editor-title">{mode === 'edit' ? 'Ajuste o comando salvo.' : 'Transforme este comando em um atalho.'}</h2>
      <p className="modal-lead">
        Salve o comando que funcionou e use <code>{'{{parâmetro}}'}</code> para criar campos reutilizáveis.
        Um atalho pode ficar fixado na barra lateral.
      </p>

      <div className="shortcut-editor-body">
        <div className="shortcut-editor-form">
          <label className="shortcut-field">
            <span>Nome do atalho</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Desbloquear usuário do AD"
              autoFocus
            />
            {attempted && !name.trim() ? <small className="field-error">Dê um nome para encontrar o atalho depois.</small> : null}
          </label>

          <label className="shortcut-field">
            <span>Descrição <small>opcional</small></span>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Para que serve e quando você usa?"
            />
          </label>

          <label className="shortcut-field">
            <span>Comando ou modelo</span>
            <textarea
              ref={textareaRef}
              value={command}
              onChange={(event) => handleCommandChange(event.target.value)}
              rows={5}
              spellCheck={false}
              placeholder={'Ex.: Unlock-ADAccount -Identity {{usuario}}'}
            />
            {attempted && !command.trim() ? <small className="field-error">O atalho precisa de um comando.</small> : null}
          </label>

          <div className="shortcut-placeholder-helper">
            <span>Inserir campo:</span>
            {COMMON_PLACEHOLDERS.map((placeholder) => (
              <button type="button" key={placeholder} onClick={() => insertPlaceholder(placeholder)}>
                <Plus size={10} /> {'{{'}{placeholder}{'}}'}
              </button>
            ))}
          </div>

          {placeholderNames.length ? (
            <div className="shortcut-param-editor">
              <div className="shortcut-param-editor-head">
                <Braces size={13} />
                <span>Campos detectados</span>
                <small>{placeholderNames.length}</small>
              </div>
              {parameters.map((parameter) => (
                <div className="shortcut-param-row" key={parameter.name}>
                  <span className="shortcut-param-token">{'{{'}{parameter.name}{'}}'}</span>
                  <label>
                    <span>Sugerir opções</span>
                    <select
                      value={parameter.provider || ''}
                      onChange={(event) => updateParameter(parameter.name, event.target.value)}
                    >
                      {SHORTCUT_PROVIDER_OPTIONS.map((option) => (
                        <option value={option.value} key={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="shortcut-empty-params">
              <Info size={13} />
              Sem campos: o atalho será executado exatamente como está. Adicione <code>{'{{usuario}}'}</code> para pedir um valor.
            </div>
          )}

          <label className="shortcut-pin-option">
            <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
            <Pin size={13} />
            <span>Fixar na barra lateral para acesso rápido</span>
          </label>
        </div>

        <aside className="shortcut-editor-preview">
          <div className="shortcut-preview-head">
            <span>Prévia</span>
            <span className={`composer-sim-badge ${isReal ? 'is-real' : ''}`}>
              {isReal ? <Monitor size={10} /> : <ShieldCheck size={10} />}
              {isReal ? 'Meu PC' : 'simulador'}
            </span>
          </div>
          <pre>{command || 'O comando aparece aqui…'}</pre>
          <div className="shortcut-preview-note">
            <Info size={12} />
            {isReal
              ? 'Ao executar, os valores serão enviados ao PowerShell real. Confira sempre antes de continuar.'
              : 'Neste modo, o atalho roda no simulador e não altera seu computador.'}
          </div>
          {placeholderNames.length ? (
            <div className="shortcut-preview-params">
              {parameters.map((parameter) => (
                <div key={parameter.name}>
                  <span>{parameter.label}</span>
                  <small>{parameter.provider ? SHORTCUT_PROVIDER_OPTIONS.find((option) => option.value === parameter.provider)?.label : 'entrada manual'}</small>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      <div className="shortcut-editor-footer">
        <span className="shortcut-editor-note"><Pencil size={12} /> Você pode editar ou duplicar este atalho depois.</span>
        <div>
          <button type="button" className="button button-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="button button-primary" onClick={submit} disabled={!valid}>
            <Check size={14} />
            {mode === 'edit' ? 'Salvar alterações' : 'Salvar atalho'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
