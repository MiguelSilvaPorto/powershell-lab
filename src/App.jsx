import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  CornerDownLeft,
  Eraser,
  History,
  LoaderCircle,
  Monitor,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { CATEGORIES, categoryFor, findCommand } from './data/catalog.js'
import { CURATED_INTENTS } from './data/intents.js'
import { LESSONS, LESSON_MAP } from './data/lessons.js'
import { WORLD_VERSION, createInitialWorld } from './data/seed.js'
import {
  SHORTCUT_PROVIDERS,
  createShortcutDraft,
  normalizeShortcut,
} from './data/shortcuts.js'
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
import EngineModal from './components/EngineModal.jsx'
import CommandLibraryModal from './components/CommandLibraryModal.jsx'
import CommandHelpModal from './components/CommandHelpModal.jsx'
import ShortcutEditorModal from './components/ShortcutEditorModal.jsx'
import ShortcutRunModal from './components/ShortcutRunModal.jsx'

const WORLD_KEY = 'pslab.world.v3'
const API_HEADERS = { 'x-pslab-real': '1' }
const ACTIVE_LESSON_KEY = 'pslab.activeLesson.v1'
const COMPLETED_TASKS_KEY = 'pslab.completedTasks.v1'
const HISTORY_KEY = 'pslab.history.v1'
const COMMANDS_RUN_KEY = 'pslab.commandsRun.v1'
const SHORTCUTS_KEY = 'pslab.shortcuts.v1'

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

function displayRealPath(path, home) {
  const value = String(path ?? '')
  if (!value) return '—'
  if (home && value.startsWith(home)) return `~${value.slice(home.length)}` || '~'
  return value
}

function newRealSessionId() {
  const raw = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `real-${raw.replace(/[^A-Za-z0-9-]/g, '').slice(0, 60)}`
}

function newEntryId(sequenceRef) {
  return `entry-${Date.now()}-${++sequenceRef.current}`
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
  const [storedShortcuts, setStoredShortcuts] = usePersistentState(SHORTCUTS_KEY, [])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [shortcutEditor, setShortcutEditor] = useState(null)
  const [shortcutRunner, setShortcutRunner] = useState(null)
  const [probeSessionId] = useState(newRealSessionId)
  const [engineMode, setEngineMode] = useState('sim')
  const [engineModalOpen, setEngineModalOpen] = useState(false)
  const [realHealth, setRealHealth] = useState({ loading: true, available: false })
  const [realCwd, setRealCwd] = useState('')
  const [realBusy, setRealBusy] = useState(false)
  const [realSessionId, setRealSessionId] = useState(newRealSessionId)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [worldOpen, setWorldOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [commandHelp, setCommandHelp] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const [toasts, setToasts] = useState([])
  const editorRef = useRef(null)
  const entrySequence = useRef(0)
  const toastTimers = useRef(new Map())
  const toastSequence = useRef(0)

  const activeLesson = LESSON_MAP.get(activeLessonId) ?? null
  const activeCategory = activeLesson ? categoryFor(activeLesson.cat) : null
  const shortcuts = useMemo(
    () => (Array.isArray(storedShortcuts) ? storedShortcuts.map(normalizeShortcut) : []),
    [storedShortcuts],
  )
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
  const isReal = engineMode === 'real'
  const lastEntry = entries[entries.length - 1] ?? null
  const executedMatch = Boolean(lastEntry && !lastEntry.result?.real && input.trim() && input.trim() === lastEntry.command)
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

  const effectiveAnalysis = useMemo(() => {
    if (!isReal) return displayAnalysis
    return {
      ...analysis,
      verification: [],
      failed: false,
      suggestions: (analysis.suggestions ?? []).filter((suggestion) => suggestion.kind !== 'verify'),
      nextSteps: (analysis.nextSteps ?? []).filter((suggestion) => suggestion.kind !== 'verify'),
      ghost: analysis.ghost,
    }
  }, [analysis, displayAnalysis, isReal])

  const ghostForInput = isReal ? ghost : executedMatch ? '' : ghost

  const totals = useMemo(() => {
    const taskCount = LESSONS.reduce((sum, lesson) => sum + lesson.tasks.length, 0)
    const doneCount = LESSONS.reduce((sum, lesson) => sum + lesson.tasks.filter((task) => completedTasks[task.id]).length, 0)
    return { taskCount, doneCount }
  }, [completedTasks])

  useEffect(() => {
    writeStorage(WORLD_KEY, world)
  }, [world])

  useEffect(() => {
    let active = true
    fetch('/api/pwsh/health', { headers: API_HEADERS })
      .then(async (response) => {
        const data = await response.json()
        if (!active) return
        setRealHealth({ ...data, loading: false })
        if (data.initialCwd) setRealCwd((previous) => previous || data.initialCwd)
      })
      .catch((error) => {
        if (!active) return
        setRealHealth((previous) => ({
          ...previous,
          loading: false,
          available: false,
          reason: 'server_unavailable',
          error: error.message,
        }))
      })
    return () => { active = false }
  }, [])

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

  async function refreshRealHealth() {
    setRealHealth((previous) => ({ ...previous, loading: true }))
    try {
      const response = await fetch('/api/pwsh/health', { headers: API_HEADERS })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Servidor local de PowerShell indisponível.')
      setRealHealth({ ...data, loading: false })
      if (data.initialCwd) setRealCwd((previous) => previous || data.initialCwd)
    } catch (error) {
      setRealHealth((previous) => ({
        ...previous,
        loading: false,
        available: false,
        reason: 'server_unavailable',
        error: error.message,
      }))
    }
  }

  function switchToSimulator() {
    if (realBusy) return
    setEngineMode('sim')
    setEngineModalOpen(false)
    setInput('')
    setHistoryIndex(null)
    pushToast({ title: 'Simulador ativo', message: 'Nada do que você executar agora toca o seu computador.', tone: 'info' })
    focusEditor()
  }

  function switchToReal() {
    if (realBusy) return
    if (!realHealth.available) {
      setEngineModalOpen(true)
      refreshRealHealth()
      pushToast({ title: 'PowerShell real indisponível', message: realHealth.error || 'Confira a instalação do PowerShell 7.', tone: 'danger' })
      return
    }
    setEngineMode('real')
    setEngineModalOpen(false)
    setInput('')
    setHistoryIndex(null)
    if (!realCwd) setRealCwd(realHealth.initialCwd || '')
    pushToast({
      title: 'Execução real ativada',
      message: 'Agora os comandos rodam no seu PC. As trilhas continuam validadas no simulador.',
      tone: 'danger',
    })
    focusEditor()
  }

  async function resetRealSession() {
    if (realBusy) return
    const previousSession = realSessionId
    const nextSession = newRealSessionId()
    setRealSessionId(nextSession)
    setRealCwd(realHealth.initialCwd || '')
    try {
      await fetch('/api/pwsh/reset', {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: previousSession }),
      })
      pushToast({ title: 'Nova sessão real', message: 'Variáveis e localização anteriores foram descartadas.', tone: 'info' })
    } catch (error) {
      pushToast({ title: 'Sessão reiniciada localmente', message: error.message, tone: 'info' })
    }
  }

  function pushRealEntry(command, result, duration) {
    const entry = {
      id: newEntryId(entrySequence),
      command,
      result,
      duration,
      timestamp: Date.now(),
      mode: 'real',
    }
    setEntries((previous) => [...previous.slice(-59), entry])
    setHistory((previous) => [...previous.slice(-79), command])
    setHistoryIndex(null)
    setCommandsRun((previous) => previous + 1)
  }

  async function executeRealCommand(command) {
    if (realBusy) return
    if (!realHealth.available) {
      setEngineModalOpen(true)
      refreshRealHealth()
      pushToast({ title: 'Modo real indisponível', message: 'O servidor local não encontrou o PowerShell.', tone: 'danger' })
      return
    }
    if (/^(clear|cls|clear-host)$/i.test(command)) {
      setEntries([])
      setInput('')
      focusEditor()
      return
    }

    setRealBusy(true)
    const started = performance.now()
    try {
      const response = await fetch('/api/pwsh/exec', {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, sessionId: realSessionId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(payload.error || `Falha na execução real (HTTP ${response.status}).`)
        error.payload = payload
        error.status = response.status
        throw error
      }
      const duration = payload.durationMs ?? Math.round(performance.now() - started)
      const output = String(payload.output ?? '')
      const stderr = String(payload.stderr ?? '')
      const text = [output, stderr ? `stderr:\n${stderr}` : ''].filter(Boolean).join('\n\n')
      const cwd = payload.cwd || realCwd || realHealth.initialCwd || ''
      const result = {
        ok: Boolean(payload.ok),
        real: true,
        input: command,
        statements: [command],
        stages: [],
        objects: [],
        effects: [],
        hostMessages: [],
        warnings: [],
        errors: [],
        meta: {
          typeName: `PowerShell real${realHealth.version ? ` ${realHealth.version}` : ''}`,
          view: text ? 'text' : 'none',
          text,
          columns: [],
        },
        notes: [
          `Executado no seu PC em ${displayRealPath(cwd, realHealth.home)} · exit ${payload.exitCode ?? 0}`,
        ],
        flags: { real: true },
      }
      setRealCwd(cwd)
      pushRealEntry(command, result, duration)
    } catch (error) {
      const payload = error.payload ?? {}
      const result = {
        ok: false,
        real: true,
        input: command,
        statements: [command],
        stages: [],
        objects: [],
        effects: [],
        hostMessages: [],
        warnings: [],
        errors: [{
          message: error.message,
          hint: payload.code === 'TIMEOUT'
            ? 'O processo foi encerrado para não travar o console. A próxima execução abre uma nova sessão real.'
            : 'Confira se o servidor do laboratório continua rodando e se o PowerShell está instalado.',
        }],
        meta: { typeName: 'PowerShell real', view: 'none', text: '', columns: [] },
        notes: [],
        flags: { real: true },
      }
      pushRealEntry(command, result, Math.round(performance.now() - started))
      if (payload.code === 'TIMEOUT') {
        setRealSessionId(newRealSessionId())
        pushToast({ title: 'Comando interrompido', message: 'A sessão real foi reiniciada após exceder o tempo limite.', tone: 'danger' })
      }
    } finally {
      setRealBusy(false)
      focusEditor()
    }
  }

  function executeCommand(commandOverride = null) {
    const command = String(commandOverride ?? input).trim()
    if (!command || command.startsWith('#')) return
    if (engineMode === 'real') {
      executeRealCommand(command)
      return
    }
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
      id: newEntryId(entrySequence),
      command,
      result,
      duration,
      timestamp: Date.now(),
      mode: 'sim',
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

  function openCommandHelp(commandName) {
    const command = typeof commandName === 'string' ? findCommand(commandName) : commandName
    if (command) setCommandHelp(command)
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

  function openShortcutLibrary() {
    setLibraryOpen(true)
    setShortcutEditor(null)
    setShortcutRunner(null)
  }

  function openShortcutEditorForCurrent() {
    const command = input.trim()
    if (!command) return
    const firstToken = command.split(/\s+/)[0]
    const commandInfo = findCommand(firstToken)
    const draft = createShortcutDraft({
      command,
      name: commandInfo?.name ?? firstToken,
      description: commandInfo?.summary ?? '',
    })
    const fromLibrary = libraryOpen
    setLibraryOpen(false)
    setShortcutRunner(null)
    setShortcutEditor({ mode: 'create', draft, fromLibrary })
  }

  function closeShortcutEditor() {
    if (shortcutEditor?.fromLibrary) setLibraryOpen(true)
    setShortcutEditor(null)
  }

  function editShortcut(shortcut) {
    const fromLibrary = libraryOpen
    setLibraryOpen(false)
    setShortcutRunner(null)
    setShortcutEditor({ mode: 'edit', draft: shortcut, fromLibrary })
  }

  function duplicateShortcut(shortcut) {
    const draft = normalizeShortcut({
      ...shortcut,
      id: '',
      name: `${shortcut.name} (variação)`,
      pinned: false,
      version: 1,
      runCount: 0,
      lastRunAt: null,
      lastValues: {},
      createdAt: null,
      updatedAt: null,
    })
    const fromLibrary = libraryOpen
    setLibraryOpen(false)
    setShortcutRunner(null)
    setShortcutEditor({ mode: 'create', draft, fromLibrary })
  }

  function useShortcutModel(model) {
    const draft = createShortcutDraft({
      command: model.command,
      name: model.name,
      description: model.description,
    })
    const fromLibrary = libraryOpen
    setLibraryOpen(false)
    setShortcutEditor({ mode: 'create', draft, fromLibrary })
  }

  function saveShortcut(data) {
    if (!shortcutEditor) return
    const clean = normalizeShortcut(data)
    const editing = shortcutEditor.mode === 'edit'
    setStoredShortcuts((previous) => {
      const list = Array.isArray(previous) ? previous.map(normalizeShortcut) : []
      if (editing) {
        return list.map((shortcut) => {
          if (shortcut.id !== clean.id) return shortcut
          return {
            ...clean,
            createdAt: shortcut.createdAt,
            updatedAt: new Date().toISOString(),
            version: Math.max(shortcut.version + 1, clean.version),
            runCount: shortcut.runCount,
            lastRunAt: shortcut.lastRunAt,
            lastValues: shortcut.lastValues,
            pinned: clean.pinned,
          }
        })
      }
      return [clean, ...list]
    })
    setShortcutEditor(null)
    setLibraryOpen(true)
    pushToast({
      title: editing ? 'Atalho atualizado' : 'Atalho salvo',
      message: clean.name,
      tone: 'success',
    })
  }

  function deleteShortcut(shortcut) {
    setConfirmState({
      title: 'Excluir este atalho?',
      description: `“${shortcut.name}” será removido da biblioteca. O comando e os valores salvos serão perdidos.`,
      confirmLabel: 'Excluir atalho',
      tone: 'danger',
      onConfirm: () => {
        setStoredShortcuts((previous) => (Array.isArray(previous) ? previous.map(normalizeShortcut) : []).filter((item) => item.id !== shortcut.id))
        setConfirmState(null)
        pushToast({ title: 'Atalho excluído', message: shortcut.name, tone: 'info' })
      },
    })
  }

  function toggleShortcutPin(shortcut) {
    setStoredShortcuts((previous) => (Array.isArray(previous) ? previous.map(normalizeShortcut) : []).map((item) => (
      item.id === shortcut.id ? { ...item, pinned: !item.pinned } : item
    )))
  }

  function openShortcutRunner(shortcut) {
    setLibraryOpen(false)
    setShortcutEditor(null)
    setShortcutRunner(shortcut)
  }

  function executeShortcut(shortcut, finalCommand, values) {
    const updated = normalizeShortcut({
      ...shortcut,
      runCount: shortcut.runCount + 1,
      lastRunAt: new Date().toISOString(),
      lastValues: { ...values },
    })
    setStoredShortcuts((previous) => (Array.isArray(previous) ? previous.map(normalizeShortcut) : []).map((item) => (
      item.id === shortcut.id ? updated : item
    )))
    setShortcutRunner(null)
    setInput(finalCommand)
    setHistoryIndex(null)
    executeCommand(finalCommand)
  }

  async function loadShortcutProvider(providerKey) {
    const provider = SHORTCUT_PROVIDERS[providerKey]
    if (!provider) return []
    if (!isReal) {
      const values = provider.simulate(world)
      return [...new Set(values.map(String).map((value) => value.trim()).filter(Boolean))].slice(0, 300)
    }
    if (!realHealth.available) {
      throw new Error('O modo real está indisponível. Não foi possível ler as opções do seu PC.')
    }
    const response = await fetch('/api/pwsh/exec', {
      method: 'POST',
      headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: provider.realQuery, sessionId: probeSessionId }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'Falha ao consultar o PowerShell real.')
    if (!payload.ok) {
      const message = String(payload.output || payload.error || 'A consulta não retornou resultados.')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 1)
        .join(' ')
      throw new Error(message || 'A consulta não retornou resultados.')
    }
    const values = String(payload.output || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 300)
    return [...new Set(values)]
  }

  const nextLesson = LESSONS[(LESSONS.findIndex((lesson) => lesson.id === activeLessonId) + 1) % LESSONS.length] ?? LESSONS[0]

  return (
    <div className="app-shell">
      <TopBar
        world={world}
        activeLesson={activeLesson}
        activeCategory={activeCategory}
        engineMode={engineMode}
        onOpenEngine={() => { setEngineModalOpen(true); refreshRealHealth() }}
        shortcutCount={shortcuts.length}
        onOpenLibrary={openShortcutLibrary}
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
          shortcuts={shortcuts}
          onOpenShortcutLibrary={openShortcutLibrary}
          onRunShortcut={openShortcutRunner}
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
            realMode={isReal}
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
                  <small title={isReal ? (realCwd || realHealth.initialCwd) : world.cwd}>
                    {isReal ? displayRealPath(realCwd || realHealth.initialCwd, realHealth.home) : shortPath(world.cwd)}
                  </small>
                </div>
                <button
                  type="button"
                  className={`composer-sim-badge ${isReal ? 'is-real' : ''}`}
                  onClick={() => { setEngineModalOpen(true); refreshRealHealth() }}
                  title="Trocar o modo de execução"
                  aria-label={isReal ? 'Modo real ativo. Trocar modo de execução.' : 'Modo simulador. Trocar modo de execução.'}
                >
                  <span className={`engine-light ${isReal ? 'is-real' : ''}`} />
                  {isReal ? 'meu PC' : 'simulador'}
                </button>
              </div>
              <div className="composer-actions">
                <button type="button" className="icon-button" onClick={() => handleHistory(-1)} title="Recuperar comando anterior" aria-label="Recuperar comando anterior" disabled={!history.length}>
                  <History size={15} />
                </button>
                <button type="button" className="icon-button" onClick={() => { setInput(''); setHistoryIndex(null); focusEditor() }} title="Limpar o comando" aria-label="Limpar o comando" disabled={!input}>
                  <Eraser size={15} />
                </button>
                <button type="button" className="icon-button" onClick={openShortcutEditorForCurrent} title="Salvar comando atual como atalho" aria-label="Salvar comando atual como atalho" disabled={!input.trim()}>
                  <BookmarkPlus size={15} />
                </button>
                <button
                  type="button"
                  className={`button ${isReal ? 'button-real' : 'button-primary'} run-button`}
                  onClick={() => executeCommand()}
                  disabled={!input.trim() || realBusy}
                >
                  {realBusy ? <LoaderCircle size={14} className="spin" /> : <Play size={14} fill="currentColor" />}
                  {realBusy ? 'Executando…' : isReal ? 'Executar no PC' : 'Executar'}
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
                canAcceptGhost={Boolean(ghostForInput && analysis.ghost?.line)}
                ghost={ghostForInput}
                placeholderText={isReal ? 'Comando real no seu PC. Enter executa de verdade…' : 'Digite um comando ou descreva o que você quer fazer…'}
              />
            </div>

            <div className="composer-foot">
              <div className="composer-hints">
                <span><kbd>Enter</kbd> executar</span>
                <span><kbd>Tab</kbd> completar</span>
                <span><kbd>↑</kbd><kbd>↓</kbd> histórico</span>
              </div>
              <span className={`composer-mantra ${isReal ? 'is-real' : ''}`}>
                {isReal ? <><Monitor size={11} /> comandos reais</> : <><Sparkles size={11} /> objetos, não texto</>}
              </span>
            </div>

            <SuggestionBar analysis={effectiveAnalysis} ghost={ghostForInput} onApply={handleApplySuggestion} onExplain={openCommandHelp} realMode={isReal} />
          </section>

          <Terminal
            entries={entries}
            realMode={isReal}
            realVersion={realHealth.version}
            realCwd={realCwd || realHealth.initialCwd}
            busy={realBusy}
            onResetReal={resetRealSession}
            onReuse={(command) => insertIntoEditor(command)}
            onCopy={copyCommand}
            onInsert={(value) => insertIntoEditor(value)}
            onClear={() => setEntries([])}
          />
        </main>

        {flowOpen ? <button type="button" className="mobile-backdrop flow-backdrop" aria-label="Fechar radiografia" onClick={() => setFlowOpen(false)} /> : null}
        <FlowPanel
          analysis={effectiveAnalysis}
          preview={isReal ? preview : displayPreview}
          executed={!isReal && executedMatch}
          realMode={isReal}
          realCwd={realCwd || realHealth.initialCwd}
          realVersion={realHealth.version}
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
          <span className={`statusbar-live ${isReal ? 'is-real' : ''}`}>
            <span className={`live-dot ${isReal ? 'is-real' : ''}`} /> {isReal ? 'Executando no seu PC' : 'Simulador local'}
          </span>
          <span className="statusbar-sep" />
          <span className="statusbar-domain">{isReal ? displayRealPath(realCwd || realHealth.initialCwd, realHealth.home) : world.domain}</span>
          <span className="statusbar-sep desktop-only" />
          <span className={`statusbar-note desktop-only ${isReal ? 'is-real' : ''}`}>{isReal ? 'comandos reais · use com cuidado' : 'nenhum comando toca o seu PC'}</span>
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

      {libraryOpen ? (
        <CommandLibraryModal
          shortcuts={shortcuts}
          currentCommand={input}
          isReal={isReal}
          onClose={() => setLibraryOpen(false)}
          onRun={openShortcutRunner}
          onEdit={editShortcut}
          onDuplicate={duplicateShortcut}
          onDelete={deleteShortcut}
          onTogglePin={toggleShortcutPin}
          onSaveCurrent={openShortcutEditorForCurrent}
          onUseModel={useShortcutModel}
        />
      ) : null}

      {shortcutEditor ? (
        <ShortcutEditorModal
          draft={shortcutEditor.draft}
          mode={shortcutEditor.mode}
          isReal={isReal}
          onClose={closeShortcutEditor}
          onSave={saveShortcut}
        />
      ) : null}

      {shortcutRunner ? (
        <ShortcutRunModal
          shortcut={shortcutRunner}
          isReal={isReal}
          realBusy={realBusy}
          loadOptions={loadShortcutProvider}
          onClose={() => setShortcutRunner(null)}
          onExecute={(finalCommand, values) => executeShortcut(shortcutRunner, finalCommand, values)}
          onEdit={editShortcut}
          onDuplicate={duplicateShortcut}
        />
      ) : null}

      {engineModalOpen ? (
        <EngineModal
          health={realHealth}
          mode={engineMode}
          busy={realBusy}
          realCwd={realCwd || realHealth.initialCwd}
          onClose={() => setEngineModalOpen(false)}
          onChooseSimulator={switchToSimulator}
          onChooseReal={switchToReal}
          onRefreshHealth={refreshRealHealth}
          onResetSession={resetRealSession}
        />
      ) : null}

      {helpOpen ? (
        <HelpModal
          onClose={() => setHelpOpen(false)}
          onStartAd={() => {
            setHelpOpen(false)
            setEngineMode('sim')
            setActiveLessonId('ad-primeiro-contato')
            setLessonOpen(true)
          }}
          onStartFirst={() => {
            setHelpOpen(false)
            setEngineMode('sim')
            setActiveLessonId('inicio-primeiro')
            setLessonOpen(true)
          }}
        />
      ) : null}

      {commandHelp ? (
        <CommandHelpModal
          command={commandHelp}
          onClose={() => setCommandHelp(null)}
          onInsert={(example) => {
            setCommandHelp(null)
            insertIntoEditor(example)
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
