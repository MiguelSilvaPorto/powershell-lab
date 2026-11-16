import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Compass, Sparkles } from 'lucide-react'
import TrackIcon from './TrackIcon.jsx'

export default function LessonStrip({
  lesson,
  category,
  completedTasks,
  onOpenLesson,
  onBrowseLessons,
  onUseIntent,
  onNextLesson,
}) {
  if (!lesson) {
    return (
      <section className="lesson-strip free-strip">
        <div className="lesson-strip-icon free">
          <Compass size={20} />
        </div>
        <div className="lesson-strip-main">
          <div className="lesson-eyebrow">MODO LIVRE · SEM ROTEIRO</div>
          <h2>Comece pelo que você quer fazer.</h2>
          <p>Descreva uma intenção, escolha uma sugestão ou aprofunde um assunto em uma trilha.</p>
          <div className="free-intents">
            <button type="button" onClick={() => onUseIntent('ad-criar-usuario')}><Sparkles size={12} /> Adicionar usuário no AD</button>
            <button type="button" onClick={() => onUseIntent('rede-mapear')}><ArrowRight size={12} /> Mapear uma rede</button>
            <button type="button" onClick={() => onUseIntent('processos-pesados')}><ArrowRight size={12} /> Ver processos pesados</button>
          </div>
        </div>
        <button type="button" className="button button-ghost lesson-strip-action" onClick={onBrowseLessons}>
          Explorar trilhas
          <ArrowUpRight size={14} />
        </button>
      </section>
    )
  }

  const done = lesson.tasks.filter((task) => completedTasks[task.id]).length
  const total = lesson.tasks.length
  const percent = total ? Math.round((done / total) * 100) : 0
  const complete = done === total
  const currentTask = lesson.tasks.find((task) => !completedTasks[task.id])

  return (
    <section className="lesson-strip" style={{ '--cat': category?.color ?? 'var(--accent)' }}>
      <div className="lesson-strip-icon">
        <TrackIcon category={category} size={20} />
      </div>
      <div className="lesson-strip-main">
        <div className="lesson-eyebrow">
          TRILHA ATIVA · {category?.name?.toUpperCase()}
          {complete ? <span className="lesson-complete-badge"><CheckCircle2 size={11} /> concluída</span> : null}
        </div>
        <h2>{lesson.title}</h2>
        <p>{complete ? 'Você fechou esta etapa. Pode revisar os exemplos ou seguir para a próxima trilha.' : lesson.objective}</p>
        <div className="lesson-progress-row">
          <span className="lesson-progress-bar"><span style={{ width: `${percent}%` }} /></span>
          <span className="lesson-progress-count">{done}/{total} tarefas</span>
          {!complete && currentTask ? <span className="lesson-current-task">Próxima: {currentTask.title}</span> : null}
        </div>
      </div>
      <div className="lesson-strip-actions">
        <button type="button" className="button button-ghost" onClick={onOpenLesson}>
          <BookOpen size={14} />
          Abrir aula
        </button>
        {complete ? (
          <button type="button" className="button button-primary" onClick={onNextLesson}>
            Próxima trilha
            <ArrowRight size={14} />
          </button>
        ) : (
          <button type="button" className="icon-button lesson-strip-expand" onClick={onOpenLesson} aria-label="Ver detalhes da aula" title="Ver detalhes da aula">
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </section>
  )
}
