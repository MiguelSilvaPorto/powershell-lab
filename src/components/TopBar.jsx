import { Boxes, ChevronRight, Globe2, HelpCircle, Menu, PanelRight, ShieldCheck } from 'lucide-react'
import TrackIcon from './TrackIcon.jsx'

export default function TopBar({ world, activeLesson, activeCategory, onOpenWorld, onOpenHelp, onOpenSidebar, onOpenFlow, onOpenCategoryPicker }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-button mobile-only" onClick={onOpenSidebar} aria-label="Abrir trilhas">
          <Menu size={18} />
        </button>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-prompt">›</span>
            <span className="brand-cursor" />
          </div>
          <div className="brand-copy">
            <div className="brand-name">
              PS<span>//</span>LAB
            </div>
            <div className="brand-tagline">PowerShell, por dentro</div>
          </div>
        </div>
        <div className="topbar-divider" />
        <button type="button" className="breadcrumb" onClick={onOpenCategoryPicker} title="Trocar de trilha">
          {activeCategory ? <TrackIcon category={activeCategory} size={13} /> : <Boxes size={13} />}
          <span>{activeCategory?.name ?? 'Laboratório livre'}</span>
          <ChevronRight size={13} className="breadcrumb-separator" />
          <strong>{activeLesson?.title ?? 'Explorar'}</strong>
        </button>
      </div>

      <div className="topbar-center">
        <button type="button" className="domain-chip" onClick={onOpenWorld} title="Abrir o mundo simulado">
          <span className="live-dot" />
          <Globe2 size={14} />
          <span>{world.domain}</span>
          <span className="domain-mode">simulado</span>
        </button>
      </div>

      <div className="topbar-right">
        <div className="engine-pill" title="Todos os comandos são executados em um mundo simulado neste navegador.">
          <ShieldCheck size={14} />
          <span className="engine-pill-copy">Simulador seguro</span>
          <span className="engine-light" />
        </div>
        <button type="button" className="topbar-button" onClick={onOpenWorld} aria-label="Abrir mundo simulado" title="Abrir mundo simulado">
          <Boxes size={15} />
          <span>Mundo</span>
        </button>
        <button type="button" className="icon-button" onClick={onOpenHelp} aria-label="Como funciona o laboratório" title="Como funciona">
          <HelpCircle size={17} />
        </button>
        <button type="button" className="icon-button mobile-only" onClick={onOpenFlow} aria-label="Abrir radiografia" title="Radiografia do comando">
          <PanelRight size={17} />
        </button>
      </div>
    </header>
  )
}
