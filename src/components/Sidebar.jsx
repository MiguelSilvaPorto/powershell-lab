import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BookMarked, BookOpen, Check, ChevronDown, ChevronRight, Compass, Play, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { CATEGORIES, categoryFor } from '../data/catalog.js'
import { LESSONS } from '../data/lessons.js'
import TrackIcon from './TrackIcon.jsx'

function lessonProgress(lesson, completedTasks) {
  const done = lesson.tasks.filter((task) => completedTasks[task.id]).length
  return { done, total: lesson.tasks.length, complete: done === lesson.tasks.length }
}

export default function Sidebar({
  activeLessonId,
  completedTasks,
  commandsRun,
  shortcuts = [],
  onOpenShortcutLibrary,
  onSelectLesson,
  onSelectFree,
  onOpenLesson,
  onRunShortcut,
  onResetWorld,
  onResetProgress,
  isOpen,
  onClose,
}) {
  const [query, setQuery] = useState('')
  const activeLesson = LESSONS.find((lesson) => lesson.id === activeLessonId) ?? null
  const [expanded, setExpanded] = useState(() => new Set([activeLesson?.cat ?? 'inicio']))

  useEffect(() => {
    if (activeLesson) {
      setExpanded((previous) => new Set(previous).add(activeLesson.cat))
    }
  }, [activeLesson])

  const normalizedQuery = query.trim().toLowerCase()
  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => {
      const lessons = LESSONS.filter((lesson) => lesson.cat === category.id)
      const categoryMatches = category.name.toLowerCase().includes(normalizedQuery) || category.blurb.toLowerCase().includes(normalizedQuery)
      const matchingLessons = normalizedQuery
        ? lessons.filter((lesson) =>
          categoryMatches ||
          lesson.title.toLowerCase().includes(normalizedQuery) ||
          lesson.subtitle.toLowerCase().includes(normalizedQuery) ||
          lesson.objective.toLowerCase().includes(normalizedQuery))
        : lessons
      return { category, lessons, matchingLessons }
    }).filter(({ category, matchingLessons }) => {
      if (!normalizedQuery) return true
      return matchingLessons.length > 0 || category.name.toLowerCase().includes(normalizedQuery) || category.blurb.toLowerCase().includes(normalizedQuery)
    })
  }, [normalizedQuery])

  const quickShortcuts = useMemo(() => [...shortcuts]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return String(b.lastRunAt || b.updatedAt).localeCompare(String(a.lastRunAt || a.updatedAt))
    })
    .slice(0, 3), [shortcuts])

  const totalTasks = LESSONS.reduce((sum, lesson) => sum + lesson.tasks.length, 0)
  const doneTasks = LESSONS.reduce((sum, lesson) => sum + lesson.tasks.filter((task) => completedTasks[task.id]).length, 0)
  const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  function toggleCategory(categoryId) {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function selectLesson(lesson) {
    onSelectLesson(lesson.id)
    onClose?.()
  }

  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-scroll">
        <div className="sidebar-head">
          <div className="sidebar-title-row">
            <div>
              <span className="sidebar-eyebrow">Aprender</span>
              <h2>Trilhas</h2>
            </div>
            <button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="Fechar trilhas">
              <X size={16} />
            </button>
          </div>
          <label className="sidebar-search">
            <Search size={15} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar aula ou assunto"
              aria-label="Buscar trilha"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
                <X size={13} />
              </button>
            ) : null}
          </label>
        </div>

        <button
          type="button"
          className={`free-mode ${!activeLesson ? 'is-active' : ''}`}
          onClick={() => {
            onSelectFree()
            onClose?.()
          }}
        >
          <span className="free-mode-icon"><Compass size={17} /></span>
          <span className="free-mode-copy">
            <strong>Laboratório livre</strong>
            <small>Sem roteiro. Só curiosidade.</small>
          </span>
          <ArrowUpRight size={14} />
        </button>

        <div className="progress-card">
          <div className="progress-ring" style={{ '--progress': `${percent}%` }} aria-hidden="true">
            <div className="progress-ring-inner">
              <strong>{percent}<span>%</span></strong>
            </div>
          </div>
          <div className="progress-copy">
            <span className="progress-eyebrow">Sua evolução</span>
            <strong>{doneTasks} de {totalTasks} tarefas</strong>
            <small>{commandsRun} {commandsRun === 1 ? 'comando executado' : 'comandos executados'}</small>
          </div>
        </div>

        <div className="sidebar-section-heading">
          <span>Meus atalhos</span>
          <span>{shortcuts.length}</span>
        </div>
        <button type="button" className="shortcut-library-entry" onClick={onOpenShortcutLibrary}>
          <span className="shortcut-library-icon"><BookMarked size={16} /></span>
          <span className="shortcut-library-copy">
            <strong>Biblioteca de comandos</strong>
            <small>{shortcuts.length ? 'Executar, editar e duplicar' : 'Salve comandos para reutilizar'}</small>
          </span>
          <ChevronRight size={14} />
        </button>
        {quickShortcuts.map((shortcut) => (
          <button type="button" className={`sidebar-shortcut ${shortcut.pinned ? 'is-pinned' : ''}`} key={shortcut.id} onClick={() => onRunShortcut(shortcut)} title={`Executar ${shortcut.name}`}>
            <span className="sidebar-shortcut-mark">{shortcut.parameters?.length ? '{{…}}' : '›_'}</span>
            <span className="sidebar-shortcut-copy">
              <strong>{shortcut.name}</strong>
              <small>{shortcut.pinned ? 'fixado · ' : ''}{shortcut.parameters?.length ? `${shortcut.parameters.length} campo${shortcut.parameters.length === 1 ? '' : 's'}` : 'comando direto'}</small>
            </span>
            <Play size={12} />
          </button>
        ))}

        <div className="sidebar-section-heading">
          <span>Categorias</span>
          <span>{CATEGORIES.length}</span>
        </div>

        <div className="category-list">
          {grouped.map(({ category, lessons, matchingLessons }) => {
            const categoryDone = lessons.reduce((sum, lesson) => sum + lesson.tasks.filter((task) => completedTasks[task.id]).length, 0)
            const categoryTotal = lessons.reduce((sum, lesson) => sum + lesson.tasks.length, 0)
            const isExpanded = normalizedQuery ? true : expanded.has(category.id)
            const visibleLessons = normalizedQuery
              ? (matchingLessons.length ? matchingLessons : lessons)
              : lessons
            return (
              <div className={`category ${isExpanded ? 'is-expanded' : ''}`} key={category.id}>
                <button type="button" className="category-head" onClick={() => toggleCategory(category.id)} aria-expanded={isExpanded}>
                  <span className="category-icon" style={{ '--cat': category.color }}>
                    <TrackIcon category={category} size={15} />
                  </span>
                  <span className="category-copy">
                    <strong>{category.name}</strong>
                    <small>{lessons.length} {lessons.length === 1 ? 'aula' : 'aulas'} · {categoryDone}/{categoryTotal}</small>
                  </span>
                  <span className="category-mini-bar" aria-hidden="true">
                    <span style={{ width: `${categoryTotal ? (categoryDone / categoryTotal) * 100 : 0}%`, background: category.color }} />
                  </span>
                  <ChevronDown size={14} className="category-chevron" />
                </button>
                {isExpanded ? (
                  <div className="lesson-list">
                    {visibleLessons.map((lesson) => {
                      const progress = lessonProgress(lesson, completedTasks)
                      const active = lesson.id === activeLessonId
                      return (
                        <div className={`lesson-row ${active ? 'is-active' : ''} ${progress.complete ? 'is-complete' : ''}`} key={lesson.id} style={{ '--cat': category.color }}>
                          <button type="button" className="lesson-select" onClick={() => selectLesson(lesson)}>
                            <span className={`lesson-status ${progress.complete ? 'complete' : ''}`}>
                              {progress.complete ? <Check size={10} strokeWidth={3} /> : null}
                            </span>
                            <span className="lesson-copy">
                              <span className="lesson-title">{lesson.title}</span>
                              <small>{lesson.level} · {lesson.minutes} min · {progress.done}/{progress.total}</small>
                            </span>
                          </button>
                          {active ? (
                            <button type="button" className="lesson-open" onClick={onOpenLesson} aria-label={`Abrir aula ${lesson.title}`} title="Abrir aula">
                              <BookOpen size={14} />
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
          {grouped.length === 0 ? (
            <div className="sidebar-empty">
              Nenhuma aula encontrada para <strong>“{query}”</strong>.
            </div>
          ) : null}
        </div>

        {activeLesson ? (
          <button type="button" className="sidebar-active-lesson" onClick={onOpenLesson}>
            <span style={{ color: categoryFor(activeLesson.cat).color }}><BookOpen size={15} /></span>
            <span>
              <small>Continuar a aula</small>
              <strong>{activeLesson.title}</strong>
            </span>
            <ArrowUpRight size={14} />
          </button>
        ) : null}
      </div>

      <footer className="sidebar-footer">
        <div className="sidebar-saved">
          <span className="live-dot" />
          <span>Progresso salvo neste navegador</span>
        </div>
        <div className="sidebar-footer-actions">
          <button type="button" className="icon-button" onClick={onResetWorld} title="Reiniciar o mundo simulado">
            <RotateCcw size={14} />
          </button>
          <button type="button" className="icon-button" onClick={onResetProgress} title="Zerar o progresso das trilhas">
            <Trash2 size={14} />
          </button>
        </div>
      </footer>
    </aside>
  )
}
