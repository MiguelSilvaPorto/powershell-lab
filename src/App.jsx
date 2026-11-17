import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  CornerDownLeft,
  Eraser,
  History,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { CATEGORIES, categoryFor, findCommand } from './data/catalog.js'
import { CURATED_INTENTS } from './data/intents.js'
import { LESSONS, LESSON_MAP } from './data/lessons.js'
import { WORLD_VERSION, createInitialWorld } from './data/seed.js'
import { executeLine, previewLine } from './engine/simulator.js'
import { analyzeLine, applySuggestion, buildVerificationSuggestions, suggestionsForFailure } from './engine/suggestions.js'
import CommandEditor from './components/CommandEditor.jsx'
import SuggestionBar from './components/SuggestionBar.jsx'
import Terminal from './components/Terminal.jsx'
import FlowPanel from './components/FlowPanel.jsx'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import LessonStrip from './components/LessonStrip.jsx'
import LessonModal from './components/LessonModal.jsx'
import WorldModal from './components/WorldModal.jsx'
import HelpModal from './components/HelpModal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import ToastStack from './components/ToastStack.jsx'

const WORLD_KEY = 'pslab.world.v3'
const ACTIVE_LESSON_KEY = 'pslab.activeLesson.v1'
const COMPLETED_TASKS_KEY = 'pslab.completedTasks.v1'
const HISTORY_KEY = 'pslab.history.v1'
const COMMANDS_RUN_KEY = 'pslab.commandsRun.v1'

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // O laboratório continua funcionando em memória se o armazenamento estiver indisponível.
  }
}

function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => readStorage(key, fallback))
  useEffect(() => {
    writeStorage(key, value)
  }, [key, value])
  return [value, setValue]
}

function loadWorld() {
  try {
    const raw = window.localStorage.getItem(WORLD_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.version === WORLD_VERSION && parsed.filesystem?.['C:'] && parsed.ad?.users && parsed.network?.mappings) {
        return parsed
      }
    }
  } catch {
    // Um mundo corrompido não deve impedir o laboratório de abrir.
  }
  return createInitialWorld()
}

function cloneWorld(world) {
  return typeof structuredClone === 'function' ? structuredClone(world) : JSON.parse(JSON.stringify(world))
}

function shortPath(path) {
  const parts = String(path ?? '').replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.length <= 2) return path
  return `…\\${parts.slice(-1).join('\\')}`
}

export default function App() {
  const [world, setWorld] = useState(loadWorld)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState([])
  const [history, setHistory] = usePersistentState(HISTORY_KEY, [])
  const [historyIndex, setHistoryIndex] = useState(null)
  const [activeLessonId, setActiveLessonId] = usePersistentState(ACTIVE_LESSON_KEY, null)
  const [completedTasks, setCompletedTasks] = usePersistentState(COMPLETED_TASKS_KEY, {})
  const [commandsRun, setCommandsRun] = usePersistentState(COMMANDS_RUN_KEY, 0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [worldOpen, setWorldOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [toasts, setToasts] = useState([])
  const editorRef = useRef(null)
  const entrySequence = useRef(0)
  const toastTimers = useRef(new Map())
  const toastSequence = useRef(0)

  const activeLesson = LESSON_MAP.get(activeLessonId) ?? null
  const activeCategory = activeLesson ? categoryFor(activeLesson.cat) : null
  const preview = useMemo(() => {
    if (!input.trim()) return null
    return previewLine(input, world)
  }, [input, world])

  const analysis = useMemo(() => analyzeLine(input, world, preview), [input, world, preview])
  const topIntent = analysis.intents?.[0] ?? null
  const intentPreview = useMemo(() => {
    if (!topIntent?.template) return null
    return previewLine(topIntent.template, world)
  }, [topIntent?.id, topIntent?.template, world])

  const ghost = analysis.line === input ? analysis.ghost?.suffix ?? '' : ''
  const lastEntry = entries[entries.length - 1] ?? null
  const executedMatch = Boolean(lastEntry && input.trim() && input.trim() === lastEntry.command)
  const executedVerification = useMemo(
    () => (executedMatch ? buildVerificationSuggestions(lastEntry.result) : []),
    [executedMatch, lastEntry],
  )
  const executedFailure = useMemo(
    () => (executedMatch && !lastEntry.result.ok ? suggestionsForFailure(lastEntry.result, analysis.command) : []),
    [executedMatch, lastEntry, analysis.command],
  )
  const displayPreview = executedMatch ? lastEntry.result : preview
  const displayAnalysis = useMemo(() => {
    if (!executedMatch) return analysis
    const failed = !lastEntry.result.ok
    return {
      ...analysis,
      kind: 'command',
      failed,
      requiredMissing: [],
      verification: executedVerification,
      suggestions: failed ? executedFailure : executedVerification.length ? executedVerification : analysis.suggestions,
      nextSteps: failed ? executedFailure : executedVerification.length ? executedVerification : analysis.nextSteps,
      ghost: null,
    }
  }, [analysis, executedMatch, executedVerification, executedFailure, lastEntry])

  const totals = useMemo(() => {
    const taskCount = LESSONS.reduce((sum, lesson) => sum + lesson.tasks.length, 0)
    const doneCount = LESSONS.reduce((sum, lesson) => sum + lesson.tasks.filter((task) => completedTasks[task.id]).length, 0)
    return { taskCount, doneCount }
  }, [completedTasks])

  useEffect(() => {
    writeStorage(WORLD_KEY, world)
  }, [world])

  useEffect(() => () => {
    toastTimers.current.forEach((timeout) => window.clearTimeout(timeout))
  }, [])

  function dismissToast(id) {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
    const timeout = toastTimers.current.get(id)
    if (timeout) {
      window.clearTimeout(timeout)
      toastTimers.current.delete(id)
    }
  }

  function pushToast({ title, message = '', tone = 'success' }) {
    const id = `toast-${Date.now()}-${++toastSequence.current}`
    setToasts((previous) => [...previous.slice(-2), { id, title, message, tone }])
    const timeout = window.setTimeout(() => dismissToast(id), 4200)
    toastTimers.current.set(id, timeout)
  }

  function focusEditor() {
    window.requestAnimationFrame(() => editorRef.current?.focus())
  }

  function insertIntoEditor(command, { closeWorld = false, closeLesson = false } = {}) {
    setInput(command)
    setHistoryIndex(null)
    if (closeWorld) setWorldOpen(false)
    if (closeLesson) setLessonOpen(false)
    focusEditor()
  }

  function useIntentById(id) {
    const intent = CURATED_INTENTS.find((item) => item.id === id)
    if (!intent) return
    setInput(intent.template)
    setHistoryIndex(null)
    focusEditor()
  }

  function handleChange(value) {
    setInput(value)
    setHistoryIndex(null)
  }

  function handleHistory(direction) {
    if (!history.length) return
    let index = historyIndex
    if (index === null) index = history.length
    let next = index + direction
    if (next < 0) next = 0
    if (next > history.length) next = history.length
    setHistoryIndex(next)
    setInput(next >= history.length ? '' : history[next])
    focusEditor()
  }

  function completeLessonTasks(command, result, nextWorld) {
    if (!activeLesson) return
    const nextCompleted = { ...completedTasks }
    const newlyCompleted = []
    for (const task of activeLesson.tasks) {
      if (nextCompleted[task.id]) continue
      let matches = false
      try {
        matches = new RegExp(task.pattern, 'i').test(command)
      } catch {
        matches = false
      }
      if (!matches) continue
      if (!result.ok && !task.allowFailure) continue
      if (task.verify) {
        try {
          if (!task.verify(nextWorld)) continue
        } catch {
          continue
        }
      }
      nextCompleted[task.id] = true
      newlyCompleted.push(task)
    }
    if (!newlyCompleted.length) return
    setCompletedTasks(nextCompleted)
    const doneNow = activeLesson.tasks.filter((task) => nextCompleted[task.id]).length
    if (newlyCompleted.length === 1) {
      pushToast({ title: 'Tarefa concluída', message: newlyCompleted[0].title, tone: 'success' })
    } else {
      pushToast({ title: `${newlyCompleted.length} tarefas concluídas`, message: newlyCompleted[0].title, tone: 'success' })
    }
    if (doneNow === activeLesson.tasks.length) {
      pushToast({ title: 'Trilha concluída!', message: `${activeLesson.title} foi fechada. Escolha a próxima quando quiser.`, tone: 'success' })
    }
  }

  function executeCommand(commandOverride = null) {
    const command = String(commandOverride ?? input).trim()
    if (!command || command.startsWith('#')) return
    const started = performance.now()
    const nextWorld = cloneWorld(world)
    let result
    try {
      result = executeLine(command, nextWorld)
    } catch (error) {
      pushToast({ title: 'Erro inesperado no simulador', message: error?.message ?? 'Tente novamente.', tone: 'danger' })
      return
    }
    const duration = Math.max(1, Math.round(performance.now() - started))

    setWorld(nextWorld)
    setHistory((previous) => [...previous.slice(-79), command])
    setHistoryIndex(null)
    setCommandsRun((previous) => previous + 1)

    if (result.flags?.clearTerminal) {
      setEntries([])
      setInput('')
      pushToast({ title: 'Console limpo', message: 'O histórico de comandos continua disponível com ↑.', tone: 'info' })
      focusEditor()
      return
    }

    const entry = {
      id: `entry-${Date.now()}-${++entrySequence.current}`,
      command,
      result,
      duration,
      timestamp: Date.now(),
    }
    setEntries((previous) => [...previous.slice(-59), entry])
    completeLessonTasks(command, result, nextWorld)
    if (!result.ok && analysis.kind === 'natural' && topIntent) {
      pushToast({
        title: 'Isso parece uma intenção',
        message: `Escolha uma sugestão para transformar em ${topIntent.cmdlet}.`,
        tone: 'info',
      })
    }
    focusEditor()
  }

  function handleApplySuggestion(suggestion) {
    const currentAnalysis = analysis.line === input ? analysis : analyzeLine(input, world, preview)
    const nextInput = applySuggestion(input, suggestion, currentAnalysis)
    setInput(nextInput)
    setHistoryIndex(null)
    focusEditor()
  }

  function handleUseIntent(intent) {
    if (!intent?.template) return
    setInput(intent.template)
    setHistoryIndex(null)
    focusEditor()
  }

  function openActiveLesson() {
    if (activeLesson) setLessonOpen(true)
    else browseLessons()
  }

  function browseLessons() {
    setSidebarOpen(true)
    if (window.innerWidth > 1100) {
      window.setTimeout(() => {
        document.querySelector('.sidebar-search input')?.focus()
      }, 80)
    }
  }

  function selectNextLesson({ keepModal = false } = {}) {
    const currentIndex = LESSONS.findIndex((lesson) => lesson.id === activeLessonId)
    const next = LESSONS[currentIndex === -1 ? 0 : (currentIndex + 1) % LESSONS.length]
    setActiveLessonId(next.id)
    if (!keepModal && lessonOpen) setLessonOpen(false)
    pushToast({ title: 'Nova trilha selecionada', message: next.title, tone: 'info' })
  }

  function openCategoryLesson(categoryId) {
    const lesson = LESSONS.find((item) => item.cat === categoryId) ?? LESSONS[0]
    setActiveLessonId(lesson.id)
    setLessonOpen(true)
    setSidebarOpen(false)
  }

  function requestResetWorld() {
    setConfirmState({
      title: 'Reiniciar o mundo simulado?',
      description: 'Arquivos criados, contas do AD, mapeamentos de rede e mudanças de serviço voltam ao estado inicial. O progresso das trilhas continua salvo.',
      confirmLabel: 'Reiniciar mundo',
      tone: 'danger',
      onConfirm: () => {
        setWorld(createInitialWorld())
        setEntries([])
        setInput('')
        setHistoryIndex(null)
        setConfirmState(null)
        pushToast({ title: 'Mundo reiniciado', message: 'Arquivos, AD e rede voltaram ao estado inicial.', tone: 'info' })
        focusEditor()
      },
    })
  }

  function requestResetProgress() {
    setConfirmState({
      title: 'Zerar o progresso das trilhas?',
      description: 'Todas as tarefas concluídas serão desmarcadas. O mundo simulado e o histórico de comandos não serão alterados.',
      confirmLabel: 'Zerar progresso',
      tone: 'danger',
      onConfirm: () => {
        setCompletedTasks({})
        setCommandsRun(0)
        setConfirmState(null)
        pushToast({ title: 'Progresso zerado', message: 'Você pode recomeçar qualquer trilha do zero.', tone: 'info' })
      },
    })
  }

  async function copyCommand(command) {
    try {
      await navigator.clipboard.writeText(command)
      pushToast({ title: 'Comando copiado', message: command, tone: 'info' })
    } catch {
      pushToast({ title: 'Não foi possível copiar', message: 'Selecione o texto manualmente.', tone: 'danger' })
    }
  }

  const nextLesson = LESSONS[(LESSONS.findIndex((lesson) => lesson.id === activeLessonId) + 1) % LESSONS.length] ?? LESSONS[0]

  return (
    <div className="app-shell">
      <TopBar
        world={world}
        activeLesson={activeLesson}
        activeCategory={activeCategory}
        onOpenWorld={() => setWorldOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenFlow={() => setFlowOpen(true)}
        onOpenCategoryPicker={browseLessons}
      />

      <div className="app-body">
        {sidebarOpen ? <button type="button" className="mobile-backdrop sidebar-backdrop" aria-label="Fechar trilhas" onClick={() => setSidebarOpen(false)} /> : null}
        <Sidebar
          activeLessonId={activeLessonId}
          completedTasks={completedTasks}
          commandsRun={commandsRun}
          onSelectLesson={(id) => {
            setActiveLessonId(id)
            setSidebarOpen(false)
          }}
          onSelectFree={() => {
            setActiveLessonId(null)
            setSidebarOpen(false)
          }}
          onOpenLesson={openActiveLesson}
          onResetWorld={requestResetWorld}
          onResetProgress={requestResetProgress}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="workspace">
          <LessonStrip
            lesson={activeLesson}
            category={activeCategory}
            completedTasks={completedTasks}
            onOpenLesson={openActiveLesson}
            onBrowseLessons={browseLessons}
            onUseIntent={useIntentById}
            onNextLesson={() => selectNextLesson()}
          />

          <section className="composer-card">
            <header className="composer-head">
              <div className="composer-title">
                <span className="composer-prompt-badge">PS</span>
                <div>
                  <span>Console interativo</span>
                  <small>{shortPath(world.cwd)}</small>
                </div>
                <span className="composer-sim-badge"><span className="engine-light" /> simulador</span>
              </div>
              <div className="composer-actions">
                <button type="button" className="icon-button" onClick={() => handleHistory(-1)} title="Recuperar comando anterior" aria-label="Recuperar comando anterior" disabled={!history.length}>
                  <History size={15} />
                </button>
                <button type="button" className="icon-button" onClick={() => { setInput(''); setHistoryIndex(null); focusEditor() }} title="Limpar o comando" aria-label="Limpar o comando" disabled={!input}>
                  <Eraser size={15} />
                </button>
                <button type="button" className="button button-primary run-button" onClick={() => executeCommand()} disabled={!input.trim()}>
                  <Play size={14} fill="currentColor" />
                  Executar
                </button>
              </div>
            </header>

            <div className="composer-input">
              <span className="composer-chevron" aria-hidden="true">❯</span>
              <CommandEditor
                ref={editorRef}
                value={input}
                onChange={handleChange}
                onRun={() => executeCommand()}
                onHistory={handleHistory}
                onGhostAccept={() => {
                  if (analysis.ghost?.line) {
                    setInput(analysis.ghost.line)
                    setHistoryIndex(null)
                    focusEditor()
                  }
                }}
                canAcceptGhost={Boolean(!executedMatch && ghost && analysis.ghost?.line)}
                ghost={ghost}
                placeholderText="Digite um comando ou descreva o que você quer fazer…"
              />
            </div>

            <div className="composer-foot">
              <div className="composer-hints">
                <span><kbd>Enter</kbd> executar</span>
                <span><kbd>Tab</kbd> completar</span>
                <span><kbd>↑</kbd><kbd>↓</kbd> histórico</span>
              </div>
              <span className="composer-mantra"><Sparkles size={11} /> objetos, não texto</span>
            </div>

            <SuggestionBar analysis={displayAnalysis} ghost={executedMatch ? '' : ghost} onApply={handleApplySuggestion} />
          </section>

          <Terminal
            entries={entries}
            onReuse={(command) => insertIntoEditor(command)}
            onCopy={copyCommand}
            onInsert={(value) => insertIntoEditor(value)}
            onClear={() => setEntries([])}
          />
        </main>

        {flowOpen ? <button type="button" className="mobile-backdrop flow-backdrop" aria-label="Fechar radiografia" onClick={() => setFlowOpen(false)} /> : null}
        <FlowPanel
          analysis={displayAnalysis}
          preview={displayPreview}
          executed={executedMatch}
          intentPreview={intentPreview}
          world={world}
          isOpen={flowOpen}
          onClose={() => setFlowOpen(false)}
          onApplySuggestion={handleApplySuggestion}
          onUseIntent={handleUseIntent}
          onInsert={(value) => insertIntoEditor(value)}
          onOpenLesson={openActiveLesson}
          onOpenCategoryLesson={openCategoryLesson}
          onBrowseLessons={browseLessons}
        />
      </div>

      <footer className="statusbar">
        <div className="statusbar-left">
          <span className="statusbar-live"><span className="live-dot" /> Simulador local</span>
          <span className="statusbar-sep" />
          <span className="statusbar-domain">{world.domain}</span>
          <span className="statusbar-sep desktop-only" />
          <span className="statusbar-note desktop-only">nenhum comando toca o seu PC</span>
        </div>
        <div className="statusbar-center desktop-only">
          <span>{LESSONS.length} trilhas</span>
          <span>·</span>
          <span>{totals.taskCount} tarefas</span>
          <span>·</span>
          <span>{CATEGORIES.length} categorias</span>
        </div>
        <div className="statusbar-right desktop-only">
          <span><kbd>Enter</kbd> executar</span>
          <span><kbd>Tab</kbd> completar</span>
          <span><kbd>↑↓</kbd> histórico</span>
        </div>
      </footer>

      {lessonOpen && activeLesson ? (
        <LessonModal
          lesson={activeLesson}
          category={activeCategory}
          completedTasks={completedTasks}
          onClose={() => setLessonOpen(false)}
          onInsert={(code) => insertIntoEditor(code, { closeLesson: true })}
          nextLesson={nextLesson}
          onNextLesson={() => selectNextLesson({ keepModal: true })}
        />
      ) : null}

      {worldOpen ? (
        <WorldModal
          world={world}
          onClose={() => setWorldOpen(false)}
          onInsert={(code) => insertIntoEditor(code, { closeWorld: true })}
          onResetWorld={requestResetWorld}
        />
      ) : null}

      {helpOpen ? (
        <HelpModal
          onClose={() => setHelpOpen(false)}
          onStartAd={() => {
            setHelpOpen(false)
            setActiveLessonId('ad-primeiro-contato')
            setLessonOpen(true)
          }}
          onStartFirst={() => {
            setHelpOpen(false)
            setActiveLessonId('inicio-primeiro')
            setLessonOpen(true)
          }}
        />
      ) : null}

      {confirmState ? (
        <ConfirmDialog
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          tone={confirmState.tone}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
