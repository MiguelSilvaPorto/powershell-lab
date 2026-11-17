import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Cpu,
  LoaderCircle,
  Monitor,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react'
import Modal from './Modal.jsx'

function shortPath(path) {
  if (!path) return '—'
  return String(path).replace(/^\/home\/[^/]+/, '~').replace(/^C:\\Users\\[^\\]+/i, '~')
}

export default function EngineModal({
  health,
  mode,
  busy,
  realCwd,
  onClose,
  onChooseSimulator,
  onChooseReal,
  onRefreshHealth,
  onResetSession,
}) {
  const [consent, setConsent] = useState(false)
  const available = Boolean(health?.available)
  const realActive = mode === 'real'

  return (
    <Modal onClose={onClose} className="engine-modal" labelledBy="engine-title" size="default">
      <div className="modal-kicker"><TerminalSquare size={13} /> Modo de execução</div>
      <h2 id="engine-title">Onde este comando deve rodar?</h2>
      <p className="modal-lead">
        O modo padrão é um laboratório seguro. O modo real conecta o console ao PowerShell instalado
        neste computador e executa os comandos com as suas permissões.
      </p>

      <div className="engine-options">
        <section className={`engine-option simulator ${!realActive ? 'is-current' : ''}`}>
          <div className="engine-option-head">
            <span className="engine-option-icon"><ShieldCheck size={18} /></span>
            <div>
              <span className="engine-option-eyebrow">PADRÃO · SEGURO</span>
              <h3>Simulador</h3>
            </div>
            {!realActive ? <span className="engine-current-pill"><Check size={10} /> atual</span> : null}
          </div>
          <p>Um mundo fictício com arquivos, processos, Active Directory e rede. Nada toca o seu PC.</p>
          <ul className="engine-list">
            <li><Check size={12} /> Trilhas e tarefas validadas</li>
            <li><Check size={12} /> Impactos antes/depois no painel</li>
            <li><Check size={12} /> Ideal para aprender sem risco</li>
          </ul>
          <button type="button" className={`button ${realActive ? 'button-ghost' : 'button-primary'} engine-option-action`} onClick={onChooseSimulator} disabled={busy}>
            {realActive ? 'Voltar para o simulador' : 'Manter no simulador'}
          </button>
        </section>

        <section className={`engine-option real ${realActive ? 'is-current is-real' : ''}`}>
          <div className="engine-option-head">
            <span className="engine-option-icon"><Monitor size={18} /></span>
            <div>
              <span className="engine-option-eyebrow">OPCIONAL · AFETA O PC</span>
              <h3>Meu PC</h3>
            </div>
            {realActive ? <span className="engine-current-pill is-real"><span className="engine-light" /> ativo</span> : null}
          </div>
          <p>Envia o comando ao PowerShell real, sem areia e sem desfazer automático.</p>

          {health?.loading ? (
            <div className="engine-health loading"><LoaderCircle size={13} className="spin" /> Verificando o PowerShell deste computador…</div>
          ) : available ? (
            <div className="engine-health">
              <div><Cpu size={12} /><span>PowerShell {health.version}</span><span className="engine-health-ok">disponível</span></div>
              <div className="engine-health-path">{shortPath(health.shellPath)}</div>
              <div className="engine-health-path">início: {shortPath(realCwd || health.initialCwd)}</div>
            </div>
          ) : (
            <div className="engine-health unavailable">
              <AlertTriangle size={13} />
              <div>
                {health?.reason === 'server_unavailable' ? (
                  <>
                    <strong>Servidor local indisponível</strong>
                    <span>O modo real precisa do servidor do projeto. Abra o laboratório com <code>npm run dev</code> e verifique novamente.</span>
                  </>
                ) : (
                  <>
                    <strong>PowerShell não encontrado</strong>
                    <span>Instale o PowerShell 7 ou coloque o binário em <code>.tools/pwsh/pwsh</code>. Você também pode definir <code>PSLAB_PWSH</code> e reiniciar o servidor.</span>
                  </>
                )}
              </div>
              <button type="button" className="mini-button" onClick={onRefreshHealth}><RefreshCw size={12} /> Verificar</button>
            </div>
          )}

          <div className="engine-warning">
            <AlertTriangle size={14} />
            <div>
              <strong>Isto é uma sessão real.</strong>
              <span>Comandos podem criar, alterar ou apagar arquivos, processos e configurações. Use com consciência. As tarefas das trilhas continuam validadas apenas no simulador.</span>
            </div>
          </div>

          {realActive ? (
            <div className="engine-active-actions">
              <button type="button" className="button button-ghost" onClick={onResetSession} disabled={busy}>
                <RotateCcw size={13} /> Reiniciar shell real
              </button>
              <button type="button" className="button button-primary" onClick={onClose} disabled={busy}>
                Continuar no meu PC
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <>
              <label className={`engine-consent ${!available ? 'is-disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  disabled={!available || busy}
                />
                <span>Entendi que os comandos serão executados de verdade neste computador.</span>
              </label>
              <button
                type="button"
                className="button button-real engine-option-action"
                onClick={onChooseReal}
                disabled={!available || !consent || busy}
              >
                <TerminalSquare size={14} />
                Ativar modo real
              </button>
            </>
          )}
        </section>
      </div>

      <div className="engine-footnote">
        <TerminalSquare size={13} />
        Execução real disponível apenas com o servidor local do projeto (<code>npm run dev</code>). O modo real não é salvo: ao recarregar, você volta ao simulador.
      </div>
    </Modal>
  )
}
