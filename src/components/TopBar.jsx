import { BookMarked, Boxes, ChevronDown, ChevronRight, Globe2, HelpCircle, Menu, Monitor, PanelRight, ShieldCheck } from 'lucide-react'
import TrackIcon from './TrackIcon.jsx'

export default function TopBar({
  world,
  activeLesson,
  activeCategory,
  engineMode,
  onOpenEngine,
  shortcutCount = 0,
  onOpenLibrary,
  onOpenWorld,
  onOpenHelp,
  onOpenSidebar,
  onOpenFlow,
  onOpenCategoryPicker,
}) {
  const real = engineMode === 'real'
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
          <strong title={activeLesson?.title ?? 'Explorar'}>{activeLesson?.title ?? 'Explorar'}</strong>
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
        <button
          type="button"
          className={`engine-pill ${real ? 'is-real' : ''}`}
          onClick={onOpenEngine}
          title={real ? 'Executando no seu PC. Clique para trocar o modo.' : 'Simulador seguro. Clique para executar no seu PC.'}
          aria-label={real ? 'Modo real ativo. Abrir opções de execução.' : 'Modo simulador. Abrir opções de execução.'}
        >
          {real ? <Monitor size={14} /> : <ShieldCheck size={14} />}
          <span className="engine-pill-copy">{real ? 'Meu PC · real' : 'Simulador'}</span>
          <span className={`engine-light ${real ? 'is-real' : ''}`} />
          <ChevronDown size={11} className="engine-pill-caret" />
        </button>
        <button type="button" className="topbar-button" onClick={onOpenWorld} aria-label="Abrir mundo simulado" title="Abrir mundo simulado">
          <Boxes size={15} />
          <span>Mundo</span>
        </button>
        <button type="button" className="topbar-button library-topbar-button" onClick={onOpenLibrary} aria-label="Abrir meus atalhos" title="Meus atalhos e comandos salvos">
          <BookMarked size={15} />
          <span>Atalhos</span>
          {shortcutCount > 0 ? <strong className="topbar-count">{shortcutCount}</strong> : null}
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
