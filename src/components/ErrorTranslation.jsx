import { useMemo } from 'react'
import { Languages, Lightbulb, TriangleAlert } from 'lucide-react'
import { translatePowerShellError } from '../engine/errorTranslator.js'

export default function ErrorTranslation({ text, compact = false }) {
  const translated = useMemo(() => translatePowerShellError(text), [text])
  if (!translated) return null

  return (
    <section className={`error-translation ${compact ? 'is-compact' : ''}`} aria-label="Tradução da mensagem de erro">
      <div className="error-translation-head">
        <span className="error-translation-title"><Languages size={13} /> Tradução para português</span>
        <span className="error-translation-category">{translated.categoryLabel}</span>
      </div>
      {translated.translation ? (
        <p className="error-translation-text">{translated.translation}</p>
      ) : (
        <p className="error-translation-text is-unknown">
          <TriangleAlert size={12} /> Não foi possível traduzir esta mensagem automaticamente. O texto original foi preservado acima.
        </p>
      )}
      {translated.hint ? (
        <div className="error-translation-hint">
          <Lightbulb size={12} />
          <span>{translated.hint}</span>
        </div>
      ) : null}
    </section>
  )
}
