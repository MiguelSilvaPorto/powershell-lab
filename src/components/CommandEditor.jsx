import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react'
import { EditorState, StateEffect, StateField, Prec } from '@codemirror/state'
import { EditorView, keymap, placeholder, drawSelection, Decoration, ViewPlugin, WidgetType } from '@codemirror/view'
import { defaultKeymap, insertTab } from '@codemirror/commands'
import { powershellLanguage, powershellHighlighting } from '../editor/powershellLanguage.js'

const setGhost = StateEffect.define()

const ghostField = StateField.define({
  create: () => '',
  update(value, transaction) {
    if (transaction.docChanged) {
      let next = ''
      for (const effect of transaction.effects) {
        if (effect.is(setGhost)) next = effect.value
      }
      return next
    }
    for (const effect of transaction.effects) {
      if (effect.is(setGhost)) return effect.value
    }
    return value
  },
})

class GhostWidget extends WidgetType {
  constructor(text) {
    super()
    this.text = text
  }

  eq(other) {
    return other instanceof GhostWidget && other.text === this.text
  }

  toDOM() {
    const wrapper = document.createElement('span')
    wrapper.className = 'cm-ghost'
    wrapper.contentEditable = 'false'
    wrapper.setAttribute('aria-hidden', 'true')
    const text = document.createElement('span')
    text.className = 'cm-ghost-text'
    text.textContent = this.text
    const key = document.createElement('span')
    key.className = 'cm-ghost-key'
    key.textContent = 'Tab'
    wrapper.append(text, key)
    return wrapper
  }
}

const ghostPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.build(view)
    }

    update(update) {
      if (update.docChanged || update.selectionSet || update.transactions.some((transaction) => transaction.effects.length)) {
        this.decorations = this.build(update.view)
      }
    }

    build(view) {
      const ghost = view.state.field(ghostField)
      const selection = view.state.selection.main
      if (!ghost || !selection.empty || selection.head !== view.state.doc.length) return Decoration.none
      return Decoration.set([Decoration.widget({ widget: new GhostWidget(ghost), side: 1 }).range(selection.head)])
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)

const baseTheme = EditorView.theme({
  '&': {
    fontSize: '15px',
    backgroundColor: 'transparent',
    color: 'var(--text)',
    minHeight: '48px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.65',
    padding: '8px 0',
  },
  '.cm-content': {
    padding: '0',
    caretColor: 'var(--accent)',
  },
  '.cm-line': { padding: '0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(167, 255, 131, 0.18) !important',
  },
  '.cm-placeholder': {
    color: 'var(--dim)',
    fontStyle: 'normal',
  },
  '.cm-ghost': {
    color: 'var(--dim)',
    opacity: '0.85',
    pointerEvents: 'none',
    whiteSpace: 'pre',
  },
  '.cm-ghost-key': {
    display: 'inline-block',
    marginLeft: '8px',
    padding: '1px 5px',
    border: '1px solid var(--border-strong)',
    borderRadius: '5px',
    color: 'var(--muted)',
    fontSize: '9px',
    fontFamily: 'var(--font-sans)',
    fontWeight: '700',
    letterSpacing: '0.04em',
    verticalAlign: '2px',
    opacity: '0.7',
  },
})

const CommandEditor = forwardRef(function CommandEditor(
  { value, onChange, onRun, onHistory, onGhostAccept, canAcceptGhost, ghost, placeholderText = 'Digite um comando ou descreva o que você quer fazer…' },
  ref,
) {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const callbacks = useRef({ onChange, onRun, onHistory, onGhostAccept, canAcceptGhost })
  const syncing = useRef(false)

  callbacks.current = { onChange, onRun, onHistory, onGhostAccept, canAcceptGhost }

  const extensions = useMemo(
    () => [
      powershellLanguage,
      powershellHighlighting,
      baseTheme,
      drawSelection(),
      EditorView.lineWrapping,
      EditorState.tabSize.of(2),
      placeholder(placeholderText),
      ghostField,
      ghostPlugin,
      Prec.highest(
        keymap.of([
          {
            key: 'Enter',
            preventDefault: true,
            run: () => {
              callbacks.current.onRun()
              return true
            },
          },
          {
            key: 'Mod-Enter',
            preventDefault: true,
            run: () => {
              callbacks.current.onRun()
              return true
            },
          },
          {
            key: 'Tab',
            preventDefault: true,
            run: (view) => {
              if (callbacks.current.canAcceptGhost) {
                callbacks.current.onGhostAccept()
              } else {
                insertTab(view)
              }
              return true
            },
          },
          {
            key: 'ArrowUp',
            preventDefault: true,
            run: () => {
              callbacks.current.onHistory(-1)
              return true
            },
          },
          {
            key: 'ArrowDown',
            preventDefault: true,
            run: () => {
              callbacks.current.onHistory(1)
              return true
            },
          },
          {
            key: 'Escape',
            run: (view) => {
              view.contentDOM.blur()
              return true
            },
          },
        ]),
      ),
      keymap.of(defaultKeymap),
      EditorView.contentAttributes.of({ 'aria-label': 'Comando PowerShell', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !syncing.current) {
          callbacks.current.onChange(update.state.doc.toString())
        }
      }),
    ],
    // callbacks are read through a ref; extensions should exist once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (!hostRef.current) return undefined
    const view = new EditorView({
      state: EditorState.create({ doc: value ?? '', extensions }),
      parent: hostRef.current,
    })
    viewRef.current = view
    view.dispatch({ effects: setGhost.of(ghost ?? '') })
    view.focus()
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // create once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === (value ?? '')) return
    syncing.current = true
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value ?? '' },
      selection: { anchor: (value ?? '').length },
    })
    syncing.current = false
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setGhost.of(ghost ?? '') })
  }, [ghost])

  useImperativeHandle(ref, () => ({
    focus() {
      const view = viewRef.current
      if (!view) return
      view.focus()
      view.dispatch({ selection: { anchor: view.state.doc.length } })
    },
  }))

  return <div className="cm-host" ref={hostRef} />
})

export default CommandEditor
