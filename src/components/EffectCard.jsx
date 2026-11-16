import {
  Activity,
  ArrowRight,
  CalendarClock,
  Check,
  Clock,
  Copy,
  File,
  FilePlus2,
  Folder,
  FolderPlus,
  HardDrive,
  KeyRound,
  Link2,
  LockKeyhole,
  MoveRight,
  Network,
  Package,
  Pencil,
  RadioTower,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  Unlock,
  UserMinus,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { initials, truncate } from '../utils/format.js'

function Avatar({ name, tone = 'violet', size = 'md' }) {
  return <span className={`avatar avatar-${tone} avatar-${size}`}>{initials(name)}</span>
}

function EffectHeader({ icon: Icon, kicker, badge, tone = 'violet' }) {
  return (
    <div className="effect-header">
      <span className={`effect-icon tone-${tone}`}><Icon size={14} /></span>
      <span className="effect-kicker">{kicker}</span>
      {badge ? <span className="effect-badge">{badge}</span> : null}
    </div>
  )
}

function StatePill({ children, state = 'neutral', icon: Icon }) {
  return (
    <span className={`state-pill state-${String(state).toLowerCase().replace(/\s+/g, '-')}`}>
      {Icon ? <Icon size={10} /> : null}
      {children}
    </span>
  )
}

function PathLine({ path }) {
  const parts = String(path ?? '').replace(/\\/g, '/').split('/').filter(Boolean)
  const last = parts.pop()
  const prefix = parts.join('\\')
  return (
    <div className="path-line">
      {prefix ? <span className="path-prefix">{prefix}\\</span> : null}
      <span className="path-last">{last ?? path}</span>
    </div>
  )
}

function UserCard({ user, local = false, kicker, badge }) {
  if (!user) return null
  return (
    <div className="effect-card effect-user">
      <EffectHeader icon={UserRound} kicker={kicker ?? (local ? 'Nova conta local' : 'Novo usuário no domínio')} badge={badge ?? (local ? 'LOCAL' : 'AD')} tone={local ? 'cyan' : 'violet'} />
      <div className="user-hero">
        <Avatar name={user.name ?? user.Name ?? user.sam ?? user.SamAccountName} tone={local ? 'cyan' : 'violet'} />
        <div className="user-identity">
          <strong>{user.name ?? user.Name}</strong>
          <span>{user.sam ?? user.SamAccountName}{user.upn ? ` · ${user.upn}` : ''}</span>
        </div>
        {(user.enabled ?? user.Enabled) !== undefined ? (
          <StatePill state={user.enabled ?? user.Enabled ? 'enabled' : 'disabled'} icon={user.enabled ?? user.Enabled ? Check : LockKeyhole}>
            {user.enabled ?? user.Enabled ? 'habilitada' : 'desativada'}
          </StatePill>
        ) : null}
      </div>
      <div className="effect-facts">
        {user.ou ? <div><span>OU</span><strong><Folder size={11} /> {user.ou}</strong></div> : null}
        {user.department ? <div><span>Departamento</span><strong>{user.department}</strong></div> : null}
        {user.title ? <div><span>Cargo</span><strong>{user.title}</strong></div> : null}
        {user.description && local ? <div><span>Descrição</span><strong>{user.description}</strong></div> : null}
      </div>
      {user.groups?.length ? (
        <div className="effect-chips">
          <span className="chips-label">Grupos</span>
          {user.groups.map((group) => <span className="value-chip" key={group}>{group}</span>)}
        </div>
      ) : null}
      {user.distinguishedName ? <div className="effect-dn">{user.distinguishedName}</div> : null}
    </div>
  )
}

function GroupMembersCard({ effect, local = false }) {
  const adding = effect.action === 'add'
  const members = effect.members ?? []
  return (
    <div className="effect-card">
      <EffectHeader
        icon={UsersRound}
        kicker={local ? 'Grupo local atualizado' : 'Associação de grupo no AD'}
        badge={adding ? 'MEMBRO ADICIONADO' : 'MEMBRO REMOVIDO'}
        tone={adding ? 'accent' : 'danger'}
      />
      <div className="group-hero">
        <span className={`effect-round-icon ${adding ? 'is-green' : 'is-red'}`}>
          {adding ? <UserPlus size={16} /> : <UserMinus size={16} />}
        </span>
        <div>
          <span className="muted-label">{local ? 'Grupo local' : 'Grupo do domínio'}</span>
          <strong>{effect.group}</strong>
        </div>
      </div>
      <div className="member-list">
        {members.map((member, index) => {
          const name = member.name ?? member.Name ?? member
          return (
            <div className="member-row" key={`${name}-${index}`}>
              <Avatar name={name} size="sm" tone={local ? 'cyan' : 'violet'} />
              <span className="member-name">{name}</span>
              <span className={`member-action ${adding ? 'add' : 'remove'}`}>{adding ? '+' : '−'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FileEffect({ effect }) {
  const type = effect.type
  if (type === 'fs:create-dir' || type === 'fs:create-file') {
    const isDir = type === 'fs:create-dir'
    return (
      <div className="effect-card">
        <EffectHeader icon={isDir ? FolderPlus : FilePlus2} kicker={isDir ? 'Nova pasta' : 'Novo arquivo'} badge={isDir ? 'DIRETÓRIO' : 'ARQUIVO'} tone="amber" />
        <PathLine path={effect.path} />
        {effect.parent ? <div className="effect-hint">Dentro de {effect.parent}</div> : null}
      </div>
    )
  }
  if (type === 'fs:copy' || type === 'fs:move' || type === 'fs:rename') {
    const isCopy = type === 'fs:copy'
    const isMove = type === 'fs:move'
    return (
      <div className="effect-card">
        <EffectHeader icon={isCopy ? Copy : isMove ? MoveRight : Pencil} kicker={isCopy ? 'Cópia de arquivo' : isMove ? 'Item movido' : 'Item renomeado'} badge={isCopy ? 'CÓPIA' : isMove ? 'MOVIDO' : 'RENOMEADO'} tone="amber" />
        <div className="path-transition">
          <div className="path-origin"><span>de</span><PathLine path={effect.from} /></div>
          <ArrowRight size={14} />
          <div className="path-destination"><span>para</span><PathLine path={effect.to} /></div>
        </div>
      </div>
    )
  }
  if (type === 'fs:write') {
    return (
      <div className="effect-card">
        <EffectHeader icon={FilePlus2} kicker="Conteúdo gravado" badge={effect.created ? 'ARQUIVO CRIADO' : 'ATUALIZADO'} tone="cyan" />
        <PathLine path={effect.path} />
        <div className="effect-hint">O arquivo agora contém o texto enviado pelo comando.</div>
      </div>
    )
  }
  if (type === 'fs:delete') {
    return (
      <div className="effect-card effect-danger">
        <EffectHeader icon={Trash2} kicker="Item removido" badge="REMOVIDO" tone="danger" />
        <PathLine path={effect.path} />
        <div className="effect-hint">O item deixou de existir no sistema de arquivos simulado.</div>
      </div>
    )
  }
  if (type === 'fs:whatif-delete') {
    return (
      <div className="effect-card">
        <EffectHeader icon={ShieldCheck} kicker="Simulação segura" badge="WHATIF" tone="accent" />
        <PathLine path={effect.path} />
        <div className="effect-hint">Nada foi removido. O comando só mostrou o que faria.</div>
      </div>
    )
  }
  return null
}

function MappingCard({ effect, removing = false }) {
  return (
    <div className="effect-card mapping-card">
      <EffectHeader icon={Network} kicker={removing ? 'Unidade desconectada' : 'Nova unidade de rede'} badge={removing ? 'DESMAPEADA' : effect.persistent ? 'PERSISTENTE' : 'TEMPORÁRIA'} tone={removing ? 'danger' : 'cyan'} />
      <div className="mapping-visual">
        <div className="mapping-side">
          <span className="mapping-icon share"><Folder size={16} /></span>
          <span className="mapping-label">Compartilhamento</span>
          <strong>{effect.remotePath}</strong>
          {effect.server ? <small>{effect.server}</small> : null}
        </div>
        <div className={`mapping-connector ${removing ? 'is-broken' : ''}`} aria-hidden="true">
          <span className="mapping-line" />
          <span className="mapping-arrow"><ArrowRight size={12} /></span>
        </div>
        <div className="mapping-side drive">
          <span className="mapping-icon drive-letter">{effect.localPath?.replace(':', '')}</span>
          <span className="mapping-label">Nova letra</span>
          <strong>{effect.localPath}</strong>
          <small>{removing ? 'desconectada' : effect.persistent ? 'persistente' : 'só nesta sessão'}</small>
        </div>
      </div>
      {effect.description ? <div className="effect-hint">{effect.description}</div> : null}
    </div>
  )
}

function RegistryCard({ effect }) {
  const action = effect.type
  return (
    <div className="effect-card">
      <EffectHeader icon={KeyRound} kicker={action === 'registry:create-key' ? 'Chave criada no registro' : action === 'registry:delete' ? 'Valor removido do registro' : effect.created ? 'Valor criado no registro' : 'Valor alterado no registro'} badge="REGISTRO" tone="pink" />
      <div className="registry-path">
        <span>{effect.path}</span>
        {effect.name ? <><span className="registry-slash">\\</span><strong>{effect.name}</strong></> : null}
      </div>
      {action === 'registry:set' ? (
        <div className="value-diff">
          <div className="value-before"><span>antes</span><code>{effect.before ?? 'não existia'}</code></div>
          <ArrowRight size={13} />
          <div className="value-after"><span>depois</span><code>{effect.after}</code></div>
        </div>
      ) : null}
      {action === 'registry:delete' ? <div className="effect-hint">Valor anterior: <code>{effect.before}</code></div> : null}
    </div>
  )
}

function ServiceCard({ effect }) {
  const isRestart = effect.action === 'restart'
  return (
    <div className="effect-card">
      <EffectHeader icon={Activity} kicker={isRestart ? 'Serviço reiniciado' : effect.to === 'Running' ? 'Serviço iniciado' : 'Serviço parado'} badge={effect.to === 'Running' ? 'EM EXECUÇÃO' : 'PARADO'} tone={effect.to === 'Running' ? 'accent' : 'danger'} />
      <div className="service-hero">
        <span className="effect-round-icon"><Server size={15} /></span>
        <div>
          <strong>{effect.displayName ?? effect.name}</strong>
          <span className="muted-label">{effect.name}</span>
        </div>
      </div>
      <div className="state-transition">
        <StatePill state={effect.from}>{effect.from}</StatePill>
        <ArrowRight size={13} />
        <StatePill state={effect.to}>{effect.to}</StatePill>
      </div>
    </div>
  )
}

function TaskCard({ effect, action }) {
  const state = effect.to ?? effect.state
  return (
    <div className="effect-card">
      <EffectHeader icon={CalendarClock} kicker={action === 'delete' ? 'Tarefa removida' : action === 'state' ? 'Tarefa executada' : 'Nova tarefa agendada'} badge={action === 'delete' ? 'REMOVIDA' : action === 'state' ? 'AGORA' : 'AGENDADA'} tone="amber" />
      <div className="task-hero">
        <span className="effect-round-icon"><CalendarClock size={15} /></span>
        <div>
          <strong>{effect.name}</strong>
          {effect.schedule ? <span className="muted-label">{effect.schedule}</span> : null}
        </div>
        {state ? <StatePill state={state}>{state}</StatePill> : null}
      </div>
      {effect.action && action === 'create' ? <div className="effect-hint task-action">{truncate(effect.action, 90)}</div> : null}
    </div>
  )
}

function ModuleCard({ effect, action }) {
  return (
    <div className="effect-card">
      <EffectHeader icon={Package} kicker={action === 'install' ? 'Módulo instalado' : action === 'update' ? 'Módulo atualizado' : 'Módulo carregado'} badge="MÓDULO" tone="blue" />
      <div className="module-hero">
        <span className="effect-round-icon"><Package size={15} /></span>
        <div>
          <strong>{effect.name}</strong>
          <span className="muted-label">{effect.version ? `versão ${effect.version}` : effect.from ? `${effect.from} → ${effect.to}` : 'sessão atual'}</span>
        </div>
      </div>
      {effect.scope ? <div className="effect-hint">Escopo: {effect.scope}</div> : null}
    </div>
  )
}

function AccountStateCard({ effect }) {
  const isEnable = effect.action === 'enable' || effect.action === 'unlock'
  return (
    <div className="effect-card">
      <EffectHeader icon={isEnable ? Unlock : LockKeyhole} kicker={effect.action === 'unlock' ? 'Conta desbloqueada' : isEnable ? 'Conta habilitada' : 'Conta desativada'} badge="CONTA" tone={isEnable ? 'accent' : 'danger'} />
      <div className="user-hero compact">
        <Avatar name={effect.name} tone="violet" size="sm" />
        <div className="user-identity">
          <strong>{effect.name}</strong>
          <span>{effect.sam}</span>
        </div>
      </div>
      <div className="state-transition stacked">
        <div className="state-line"><span>Habilitada</span><StatePill state={effect.before?.enabled}>{effect.before?.enabled ? 'sim' : 'não'}</StatePill><ArrowRight size={12} /><StatePill state={effect.after?.enabled}>{effect.after?.enabled ? 'sim' : 'não'}</StatePill></div>
        <div className="state-line"><span>Bloqueada</span><StatePill state={effect.before?.lockedOut}>{effect.before?.lockedOut ? 'sim' : 'não'}</StatePill><ArrowRight size={12} /><StatePill state={effect.after?.lockedOut}>{effect.after?.lockedOut ? 'sim' : 'não'}</StatePill></div>
      </div>
    </div>
  )
}

function UpdateCard({ effect }) {
  return (
    <div className="effect-card">
      <EffectHeader icon={Pencil} kicker="Propriedades atualizadas" badge="ADUSER" tone="violet" />
      <div className="user-hero compact">
        <Avatar name={effect.name} tone="violet" size="sm" />
        <div className="user-identity">
          <strong>{effect.name}</strong>
          <span>{effect.sam}</span>
        </div>
      </div>
      <div className="change-list">
        {effect.changes?.map((change) => (
          <div className="change-row" key={change.field}>
            <span className="change-field">{change.field}</span>
            <span className="change-before">{change.before || 'vazio'}</span>
            <ArrowRight size={11} />
            <span className="change-after">{change.after || 'vazio'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProcessCard({ effect, starting = false }) {
  return (
    <div className="effect-card">
      <EffectHeader icon={starting ? Terminal : Activity} kicker={starting ? 'Processo iniciado' : 'Processo encerrado'} badge={starting ? 'PID ' + effect.id : 'ENCERRADO'} tone={starting ? 'accent' : 'danger'} />
      <div className="process-hero">
        <span className={`process-dot ${starting ? '' : 'is-stopped'}`} />
        <strong className={starting ? '' : 'is-struck'}>{effect.name}</strong>
        <span className="muted-label">PID {effect.id}</span>
      </div>
      <div className="effect-hint">{starting ? 'O laboratório simula um novo processo.' : 'Ele não aparece mais em Get-Process.'}</div>
    </div>
  )
}

function ExecutionPolicyCard({ effect }) {
  return (
    <div className="effect-card">
      <EffectHeader icon={ShieldCheck} kicker="Política de execução alterada" badge={effect.scope ?? 'LOCALMACHINE'} tone="amber" />
      <div className="state-transition">
        <StatePill state="neutral">{effect.from}</StatePill>
        <ArrowRight size={13} />
        <StatePill state="warn">{effect.to}</StatePill>
      </div>
      <div className="effect-hint">A mudança vale para o escopo {effect.scope}.</div>
    </div>
  )
}

function SessionCard({ effect, removing = false }) {
  return (
    <div className="effect-card">
      <EffectHeader icon={RadioTower} kicker={removing ? 'Sessão encerrada' : 'Sessão remota aberta'} badge="REMOTING" tone={removing ? 'danger' : 'blue'} />
      <div className="service-hero">
        <span className="effect-round-icon"><Server size={15} /></span>
        <div>
          <strong>{effect.computer}</strong>
          <span className="muted-label">{effect.id ? `Sessão ${effect.id}` : effect.state}</span>
        </div>
        <StatePill state={removing ? 'closed' : 'enabled'}>{removing ? 'fechada' : 'aberta'}</StatePill>
      </div>
    </div>
  )
}

function RemoteCard({ effect }) {
  return (
    <div className="effect-card">
      <EffectHeader icon={RadioTower} kicker="Comando executado remotamente" badge="REMOTE" tone="blue" />
      <div className="remote-targets">
        {(effect.computers ?? []).map((computer) => (
          <span className="value-chip" key={computer}><Server size={10} /> {computer}</span>
        ))}
      </div>
      <div className="command-preview">{truncate(effect.command, 120)}</div>
      <div className="effect-hint">{effect.objects} objeto(s) voltaram para a sua sessão.</div>
    </div>
  )
}

export default function EffectCard({ effect }) {
  if (!effect) return null
  const type = effect.type
  if (type === 'ad:user:create') return <UserCard user={effect.user} />
  if (type === 'ad:user:update') return <UpdateCard effect={effect} />
  if (type === 'ad:account') return <AccountStateCard effect={effect} />
  if (type === 'ad:group:members') return <GroupMembersCard effect={effect} />
  if (type === 'ad:ou:create') {
    return (
      <div className="effect-card">
        <EffectHeader icon={FolderPlus} kicker="Nova unidade organizacional" badge="OU" tone="violet" />
        <div className="ou-hero">
          <span className="effect-round-icon"><FolderPlus size={15} /></span>
          <div><strong>{effect.name}</strong><span className="muted-label">em {effect.parent}</span></div>
        </div>
        <div className="effect-dn">{effect.path}</div>
      </div>
    )
  }
  if (type === 'local:user:create') return <UserCard user={{ name: effect.name, sam: effect.name, description: effect.description, enabled: effect.enabled, groups: effect.groups }} local kicker="Nova conta local" />
  if (type === 'local:account') {
    return (
      <div className="effect-card">
        <EffectHeader icon={effect.enabled ? Unlock : LockKeyhole} kicker={effect.enabled ? 'Conta local habilitada' : 'Conta local desativada'} badge="LOCAL" tone={effect.enabled ? 'cyan' : 'danger'} />
        <div className="user-hero compact">
          <Avatar name={effect.name} tone="cyan" size="sm" />
          <div className="user-identity"><strong>{effect.name}</strong><span>conta local</span></div>
          <StatePill state={effect.enabled ? 'enabled' : 'disabled'}>{effect.enabled ? 'habilitada' : 'desativada'}</StatePill>
        </div>
      </div>
    )
  }
  if (type === 'local:group:members') return <GroupMembersCard effect={effect} local />
  if (type === 'smb:map') return <MappingCard effect={effect} />
  if (type === 'smb:unmap') return <MappingCard effect={effect} removing />
  if (type.startsWith('fs:')) {
    const fileEffect = FileEffect({ effect })
    if (fileEffect) return fileEffect
  }
  if (type === 'process:stop') return <ProcessCard effect={effect} />
  if (type === 'process:start') return <ProcessCard effect={effect} starting />
  if (type === 'service:state') return <ServiceCard effect={effect} />
  if (type === 'service:startup') {
    return (
      <div className="effect-card">
        <EffectHeader icon={Activity} kicker="Inicialização do serviço alterada" badge="CONFIG" tone="amber" />
        <div className="service-hero">
          <span className="effect-round-icon"><Server size={15} /></span>
          <div><strong>{effect.displayName ?? effect.name}</strong><span className="muted-label">{effect.from} → {effect.to}</span></div>
        </div>
      </div>
    )
  }
  if (type === 'task:create') return <TaskCard effect={effect} action="create" />
  if (type === 'task:state') return <TaskCard effect={effect} action="state" />
  if (type === 'task:delete') return <TaskCard effect={effect} action="delete" />
  if (type === 'module:install') return <ModuleCard effect={effect} action="install" />
  if (type === 'module:import') return <ModuleCard effect={effect} action="import" />
  if (type === 'module:update') return <ModuleCard effect={effect} action="update" />
  if (type === 'registry:set' || type === 'registry:delete' || type === 'registry:create-key') return <RegistryCard effect={effect} />
  if (type === 'execution:policy') return <ExecutionPolicyCard effect={effect} />
  if (type === 'session:create') return <SessionCard effect={effect} />
  if (type === 'session:remove') return <SessionCard effect={effect} removing />
  if (type === 'remote:invoke') return <RemoteCard effect={effect} />
  if (type === 'cwd') {
    return (
      <div className="effect-card">
        <EffectHeader icon={Terminal} kicker="Diretório da sessão" badge="CONTEXTO" tone="neutral" />
        <div className="path-transition">
          <div className="path-origin"><span>de</span><PathLine path={effect.from} /></div>
          <ArrowRight size={14} />
          <div className="path-destination"><span>para</span><PathLine path={effect.to} /></div>
        </div>
      </div>
    )
  }
  if (type === 'ad:ou:create') return null
  if (type === 'ad:user:update') return null
  return (
    <div className="effect-card">
      <EffectHeader icon={HardDrive} kicker="Alteração no mundo simulado" badge="IMPACTO" tone="neutral" />
      <div className="effect-hint">{truncate(JSON.stringify(effect), 160)}</div>
    </div>
  )
}
