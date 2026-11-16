import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Lightbulb,
  ListChecks,
  Play,
  Sparkles,
  Target,
  TerminalSquare,
  TriangleAlert,
} from 'lucide-react'
import Modal from './Modal.jsx'
import TrackIcon from './TrackIcon.jsx'

export default function LessonModal({ lesson, category, completedTasks, onClose, onInsert, nextLesson, onNextLesson }) {
  const [openHints, setOpenHints] = useState({})
  const [openSolutions, setOpenSolutions] = useState({})
  if (!lesson) return null
  const done = lesson.tasks.filter((task) => completedTasks[task.id]).length
  const total = lesson.tasks.length
  const complete = done === total
  const percent = total ? Math.round((done / total) * 100) : 0

  function toggle(mapSetter, id) {
    mapSetter((previous) => ({ ...previous, [id]: !previous[id] }))
  }

  return (
    <Modal onClose={onClose} className="lesson-modal" labelledBy="lesson-title" size="large">
      <header className="lesson-modal-head" style={{ '--cat': category?.color ?? 'var(--accent)' }}>
        <div className="lesson-modal-kicker">
          <span className="lesson-modal-icon"><TrackIcon category={category} size={18} /></span>
          <span>TRILHA · {category?.name?.toUpperCase()}</span>
          <span className="lesson-modal-level">{lesson.level}</span>
          <span className="lesson-modal-time"><Clock3 size={12} /> {lesson.minutes} min</span>
        </div>
        <h2 id="lesson-title">{lesson.title}</h2>
        <p>{lesson.subtitle}</p>
        <div className="lesson-modal-progress">
          <span className="lesson-modal-progress-bar"><span style={{ width: `${percent}%` }} /></span>
          <span>{done}/{total} tarefas</span>
          {complete ? <span className="lesson-complete-badge"><CheckCircle2 size={11} /> concluída</span> : null}
        </div>
      </header>

      <div className="lesson-modal-body">
        <div className="lesson-objective">
          <span className="lesson-objective-icon"><Target size={17} /></span>
          <div>
            <span>OBJETIVO DA AULA</span>
            <p>{lesson.objective}</p>
          </div>
        </div>

        <section className="lesson-section">
          <div className="lesson-section-title"><BookOpen size={15} /><h3>Antes de digitar</h3></div>
          <div className="concept-grid">
            {lesson.concepts.map((item) => (
              <article className="concept-card" key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lesson-section">
          <div className="lesson-section-title"><Code2 size={15} /><h3>Comandos para experimentar</h3><span>{lesson.examples.length}</span></div>
          <div className="example-list">
            {lesson.examples.map((item) => (
              <div className="example-row" key={`${item.label}-${item.code}`}>
                <div className="example-copy">
                  <strong>{item.label}</strong>
                  {item.note ? <span>{item.note}</span> : null}
                </div>
                <code>{item.code}</code>
                <button type="button" className="button button-ghost button-small" onClick={() => onInsert(item.code)}>
                  <TerminalSquare size={13} />
                  Inserir
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="lesson-section">
          <div className="lesson-section-title"><ListChecks size={15} /><h3>Tarefas</h3><span>{done}/{total}</span></div>
          <div className="task-list">
            {lesson.tasks.map((item, index) => {
              const completed = Boolean(completedTasks[item.id])
              return (
                <article className={`lesson-task ${completed ? 'is-complete' : ''}`} key={item.id}>
                  <span className={`task-check ${completed ? 'is-complete' : ''}`}>{completed ? <Check size={12} strokeWidth={3} /> : index + 1}</span>
                  <div className="task-content">
                    <div className="task-heading">
                      <h4>{item.title}</h4>
                      <div className="task-actions">
                        <button type="button" className="task-link" onClick={() => toggle(setOpenHints, item.id)}>
                          <Lightbulb size={12} /> {openHints[item.id] ? 'Ocultar dica' : 'Dica'}
                        </button>
                        <button type="button" className="task-link" onClick={() => toggle(setOpenSolutions, item.id)}>
                          {openSolutions[item.id] ? 'Ocultar solução' : 'Ver solução'}
                          <ChevronDown size={12} className={openSolutions[item.id] ? 'is-open' : ''} />
                        </button>
                      </div>
                    </div>
                    {openHints[item.id] ? <p className="task-hint"><Lightbulb size={12} /> {item.hint}</p> : null}
                    {openSolutions[item.id] ? (
                      <div className="task-solution">
                        <code>{item.solution}</code>
                        <button type="button" className="mini-button" onClick={() => onInsert(item.solution)}>
                          <Play size={12} /> Inserir solução
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {lesson.warning ? (
          <div className="lesson-callout warning">
            <TriangleAlert size={16} />
            <div><strong>Cuidado em produção</strong><p>{lesson.warning}</p></div>
          </div>
        ) : null}

        {lesson.tip ? (
          <div className="lesson-callout tip">
            <Sparkles size={16} />
            <div><strong>Anote no caderno mental</strong><p>{lesson.tip}</p></div>
          </div>
        ) : null}
      </div>

      <footer className="lesson-modal-footer">
        <div className="lesson-footer-note">
          {complete ? 'Tarefas concluídas. Você pode revisar quantas vezes quiser.' : 'O progresso é marcado quando você executa um comando que cumpre a tarefa.'}
        </div>
        <div className="lesson-footer-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>Continuar praticando</button>
          {complete && nextLesson ? (
            <button type="button" className="button button-primary" onClick={onNextLesson}>
              Próxima trilha
              <ArrowRight size={14} />
            </button>
          ) : null}
        </div>
      </footer>
    </Modal>
  )
}
