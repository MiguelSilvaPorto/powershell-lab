import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  File,
  Folder,
  FolderOpen,
  Globe2,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Network,
  RotateCcw,
  Server,
  ShieldCheck,
  TerminalSquare,
  UserRound,
  UsersRound,
} from 'lucide-react'
import Modal from './Modal.jsx'
import { initials, formatBytes, plural } from '../utils/format.js'

function Avatar({ name, tone = 'violet' }) {
  return <span className={`avatar avatar-${tone} avatar-sm`}>{initials(name)}</span>
}

function quotePath(path) {
  return /\s/.test(path) ? `"${path}"` : path
}

function findFreeLetter(world) {
  const used = new Set(['C', 'D', 'A', 'B', ...world.network.mappings.map((mapping) => mapping.LocalPath.charAt(0))])
  for (const letter of ['Z', 'Y', 'X', 'W', 'V', 'U', 'T']) {
    if (!used.has(letter)) return letter
  }
  return null
}

function FileTreeNode({ node, parentPath, depth, expanded, onToggle, onInsert }) {
  const fullPath = parentPath ? `${parentPath}\\${node.name}` : node.name
  const isDir = node.kind === 'dir'
  const isExpanded = expanded.has(fullPath)
  const children = isDir ? [...(node.children ?? [])].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1)) : []
  return (
    <div className="tree-node">
      <div className={`tree-row ${isDir ? 'is-dir' : 'is-file'}`} style={{ paddingLeft: `${12 + depth * 17}px` }}>
        {isDir ? (
          <button type="button" className="tree-toggle" onClick={() => onToggle(fullPath)} aria-label={isExpanded ? `Recolher ${node.name}` : `Expandir ${node.name}`}>
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : <span className="tree-spacer" />}
        <span className="tree-icon">{isDir ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <File size={13} />}</span>
        <button type="button" className="tree-name" onClick={() => (isDir ? onToggle(fullPath) : onInsert(`Get-Content ${quotePath(fullPath)}`))}>
          {node.name}
        </button>
        {!isDir ? <span className="tree-meta">{formatBytes(node.size)}</span> : <span className="tree-meta">{plural(children.length, 'item', 'itens')}</span>}
        <button
          type="button"
          className="tree-insert"
          onClick={() => onInsert(isDir ? `Get-ChildItem ${quotePath(fullPath)}` : `Get-Content ${quotePath(fullPath)}`)}
          title={isDir ? `Listar ${fullPath}` : `Ler ${fullPath}`}
        >
          <TerminalSquare size={12} />
        </button>
      </div>
      {isDir && isExpanded ? (
        <div className="tree-children">
          {children.map((child) => (
            <FileTreeNode key={child.name} node={child} parentPath={fullPath} depth={depth + 1} expanded={expanded} onToggle={onToggle} onInsert={onInsert} />
          ))}
          {!children.length ? <div className="tree-empty" style={{ paddingLeft: `${34 + depth * 17}px` }}>pasta vazia</div> : null}
        </div>
      ) : null}
    </div>
  )
}

export default function WorldModal({ world, onClose, onInsert, onResetWorld }) {
  const [tab, setTab] = useState('ad')
  const [expanded, setExpanded] = useState(new Set(['C:', 'C:\\Users', 'C:\\Users\\miguel', 'C:\\Users\\miguel\\Documentos']))
  const freeLetter = useMemo(() => findFreeLetter(world), [world])
  const root = world.filesystem?.['C:']

  function toggleNode(path) {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <Modal onClose={onClose} className="world-modal" labelledBy="world-title" size="large">
      <header className="world-head">
        <div className="world-kicker"><Globe2 size={14} /> MUNDO SIMULADO · {world.domain}</div>
        <h2 id="world-title">O que existe do outro lado.</h2>
        <p>
          Este é o estado vivo do laboratório. Cada comando executado altera estes dados — e nada sai do navegador.
        </p>
        <div className="world-stat-row">
          <span><UsersRound size={13} /> {world.ad.users.length} usuários AD</span>
          <span><Folder size={13} /> {world.ad.groups.length} grupos</span>
          <span><Server size={13} /> {world.ad.computers.length} computadores</span>
          <span><Network size={13} /> {world.network.mappings.length} {world.network.mappings.length === 1 ? 'mapeamento' : 'mapeamentos'}</span>
          <span><CalendarClock size={13} /> {world.scheduledTasks.length} tarefas</span>
        </div>
      </header>

      <div className="world-tabs" role="tablist" aria-label="Áreas do mundo simulado">
        <button type="button" role="tab" aria-selected={tab === 'ad'} className={tab === 'ad' ? 'is-active' : ''} onClick={() => setTab('ad')}>
          <UsersRound size={14} /> Active Directory
        </button>
        <button type="button" role="tab" aria-selected={tab === 'files'} className={tab === 'files' ? 'is-active' : ''} onClick={() => setTab('files')}>
          <Folder size={14} /> Arquivos
        </button>
        <button type="button" role="tab" aria-selected={tab === 'network'} className={tab === 'network' ? 'is-active' : ''} onClick={() => setTab('network')}>
          <Network size={14} /> Rede
        </button>
        <span className="world-tabs-hint">clique em um objeto para levar o comando ao console</span>
      </div>

      <div className="world-body">
        {tab === 'ad' ? (
          <div className="world-ad">
            <div className="world-ad-side">
              <section className="world-card domain-card">
                <div className="world-card-head"><span className="world-card-icon violet"><Globe2 size={15} /></span><span>Domínio</span></div>
                <strong className="domain-name">{world.ad.domain.Name}</strong>
                <div className="domain-grid">
                  <div><span>NetBIOS</span><strong>{world.ad.domain.NetBIOSName}</strong></div>
                  <div><span>Modo</span><strong>{world.ad.domain.DomainMode}</strong></div>
                  <div><span>PDC</span><strong>{world.ad.domain.PDCEmulator}</strong></div>
                  <div><span>DN</span><strong>{world.ad.domain.DistinguishedName}</strong></div>
                </div>
                <button type="button" className="world-insert" onClick={() => onInsert('Get-ADDomain')}>Get-ADDomain <ArrowRight size={12} /></button>
              </section>

              <section className="world-card">
                <div className="world-card-head"><span className="world-card-icon violet"><Folder size={14} /></span><span>Unidades organizacionais</span></div>
                <div className="ou-list">
                  {world.ad.ous.map((ou) => (
                    <button type="button" key={ou.DistinguishedName} onClick={() => onInsert(`Get-ADOrganizationalUnit -Filter *`)} title={ou.DistinguishedName}>
                      <Folder size={12} />
                      <span>{ou.Name}</span>
                      <small>{world.ad.users.filter((user) => user.OU === ou.Name).length}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="world-card">
                <div className="world-card-head"><span className="world-card-icon blue"><Server size={14} /></span><span>Computadores</span></div>
                <div className="compact-list">
                  {world.ad.computers.map((computer) => (
                    <button type="button" key={computer.Name} className="computer-row" onClick={() => onInsert(`Get-ADComputer -Identity ${computer.Name}`)}>
                      <span className={`status-dot ${computer.Enabled ? 'online' : 'offline'}`} />
                      <span><strong>{computer.Name}</strong><small>{computer.OperatingSystem}</small></span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="world-ad-main">
              <section className="world-card world-users-card">
                <div className="world-card-head">
                  <span className="world-card-icon violet"><UserRound size={14} /></span>
                  <span>Pessoas do domínio</span>
                  <small>{world.ad.users.length} contas</small>
                </div>
                <div className="world-user-list">
                  {world.ad.users.map((user) => (
                    <button type="button" className="world-user-row" key={user.SamAccountName} onClick={() => onInsert(`Get-ADUser -Identity ${user.SamAccountName} -Properties Title, Department, EmailAddress`)}>
                      <Avatar name={user.Name} tone="violet" />
                      <span className="world-user-main">
                        <strong>{user.Name}</strong>
                        <small>{user.SamAccountName} · {user.Department} · {user.OU}</small>
                      </span>
                      <span className="world-user-groups">{user.Groups.slice(0, 2).map((group) => <span className="value-chip" key={group}>{group}</span>)}</span>
                      {user.LockedOut ? <span className="mini-status danger"><LockKeyhole size={10} /> bloqueada</span> : !user.Enabled ? <span className="mini-status muted"><Circle size={9} /> desativada</span> : <span className="mini-status ok"><Check size={10} /> ativa</span>}
                    </button>
                  ))}
                </div>
              </section>

              <section className="world-card">
                <div className="world-card-head"><span className="world-card-icon accent"><UsersRound size={14} /></span><span>Grupos</span><small>{world.ad.groups.length}</small></div>
                <div className="world-group-grid">
                  {world.ad.groups.map((group) => (
                    <button type="button" className="world-group-row" key={group.Name} onClick={() => onInsert(`Get-ADGroupMember -Identity ${group.SamAccountName}`)}>
                      <span className="group-glyph"><UsersRound size={14} /></span>
                      <span><strong>{group.Name}</strong><small>{plural(group.Members.length, 'membro')} · {group.Scope}</small></span>
                      <div className="group-avatars">
                        {group.Members.slice(0, 3).map((member) => <span className="micro-avatar" key={member}>{initials(member)}</span>)}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {tab === 'files' ? (
          <div className="world-files">
            <div className="world-files-head">
              <div><FolderOpen size={15} /><strong>Árvore de arquivos</strong><span>C:\</span></div>
              <button type="button" className="world-insert" onClick={() => onInsert('Get-ChildItem C:\\')}>Get-ChildItem C:\ <ArrowRight size={12} /></button>
            </div>
            <div className="file-tree">
              {root ? (
                <div className="tree-root">
                  <div className="tree-row is-dir root-row" style={{ paddingLeft: '12px' }}>
                    <button type="button" className="tree-toggle" onClick={() => toggleNode('C:')} aria-label="Expandir C:">
                      {expanded.has('C:') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <span className="tree-icon"><HardDrive size={14} /></span>
                    <span className="tree-name is-root">C:\</span>
                    <span className="tree-meta">sistema</span>
                  </div>
                  {expanded.has('C:') ? (
                    [...(root.children ?? [])].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1)).map((child) => (
                      <FileTreeNode key={child.name} node={child} parentPath="C:" depth={1} expanded={expanded} onToggle={toggleNode} onInsert={onInsert} />
                    ))
                  ) : null}
                </div>
              ) : <div className="tree-empty">Nenhum arquivo no laboratório.</div>}
            </div>
            <div className="world-files-note"><TerminalSquare size={13} /> Clique no ícone de terminal para inserir um comando de leitura ou listagem.</div>
          </div>
        ) : null}

        {tab === 'network' ? (
          <div className="world-network">
            <div className="network-grid">
              <section className="world-card network-config-card">
                <div className="world-card-head"><span className="world-card-icon cyan"><Network size={14} /></span><span>Configuração atual</span><span className="mini-status ok"><span className="status-dot online" /> conectada</span></div>
                <div className="network-ip-hero">
                  <span className="ip-label">IPv4</span>
                  <strong>{world.network.ipConfig.IPv4Address}<small>/{world.network.ipConfig.PrefixLength}</small></strong>
                  <span className="network-alias">{world.network.ipConfig.InterfaceAlias}</span>
                </div>
                <div className="domain-grid">
                  <div><span>Gateway</span><strong>{world.network.ipConfig.DefaultGateway}</strong></div>
                  <div><span>DNS</span><strong>{world.network.ipConfig.DNSServers.join(' · ')}</strong></div>
                  <div><span>MAC</span><strong>{world.network.ipConfig.MacAddress}</strong></div>
                  <div><span>IPv6</span><strong>{world.network.ipConfig.IPv6Address}</strong></div>
                </div>
                <div className="world-inline-actions">
                  <button type="button" className="world-insert" onClick={() => onInsert('Get-NetIPConfiguration')}>Get-NetIPConfiguration <ArrowRight size={12} /></button>
                  <button type="button" className="world-insert" onClick={() => onInsert('Get-NetAdapter')}>Get-NetAdapter <ArrowRight size={12} /></button>
                </div>
              </section>

              <section className="world-card">
                <div className="world-card-head"><span className="world-card-icon cyan"><ShareIcon /></span><span>Mapeamentos de unidade</span><small>{world.network.mappings.length}</small></div>
                <div className="mapping-list">
                  {world.network.mappings.map((mapping) => (
                    <button type="button" key={mapping.LocalPath} className="world-mapping-row" onClick={() => onInsert(`Get-SmbMapping -LocalPath ${mapping.LocalPath}`)}>
                      <span className="drive-badge">{mapping.LocalPath.replace(':', '')}</span>
                      <span><strong>{mapping.LocalPath}</strong><small>{mapping.RemotePath}</small></span>
                      {mapping.Persistent ? <span className="mini-status ok">persistente</span> : <span className="mini-status muted">sessão</span>}
                    </button>
                  ))}
                  {!world.network.mappings.length ? <div className="world-empty-line">Nenhum compartilhamento mapeado.</div> : null}
                </div>
                <button type="button" className="world-insert wide" onClick={() => onInsert('Get-SmbMapping')}>Ver todos com Get-SmbMapping <ArrowRight size={12} /></button>
              </section>

              <section className="world-card network-shares">
                <div className="world-card-head"><span className="world-card-icon accent"><Globe2 size={14} /></span><span>Compartilhamentos disponíveis</span><small>{world.network.shares.length}</small></div>
                <div className="share-list">
                  {world.network.shares.map((share) => {
                    const remote = `\\\\SRV-FILE01\\${share.Name}`
                    const mapped = world.network.mappings.find((mapping) => mapping.RemotePath.toLowerCase() === remote.toLowerCase())
                    return (
                      <div className="share-row" key={share.Name}>
                        <span className="share-icon"><Folder size={14} /></span>
                        <span className="share-copy"><strong>{share.Name}</strong><small>{remote} · {share.Description}</small></span>
                        {mapped ? <span className="mini-status ok">{mapped.LocalPath}</span> : freeLetter ? (
                          <button type="button" className="world-insert" onClick={() => onInsert(`New-SmbMapping -RemotePath "${remote}" -LocalPath ${freeLetter}: -Persistent $true`)}>
                            mapear {freeLetter}: <ArrowRight size={12} />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
                <div className="world-files-note"><Network size={13} /> Mapear cria uma letra local apontando para o compartilhamento — o fluxo A → B que você vê na radiografia.</div>
              </section>

              <section className="world-card">
                <div className="world-card-head"><span className="world-card-icon blue"><Server size={14} /></span><span>Adaptadores</span></div>
                <div className="compact-list">
                  {world.network.adapters.map((adapter) => (
                    <button type="button" key={adapter.Name} className="adapter-row" onClick={() => onInsert(`Get-NetAdapter -Name ${adapter.Name}`)}>
                      <span className={`status-dot ${adapter.Status === 'Up' ? 'online' : 'offline'}`} />
                      <span><strong>{adapter.Name}</strong><small>{adapter.InterfaceDescription}</small></span>
                      <span className="adapter-speed">{adapter.LinkSpeed}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="world-footer">
        <div className="world-footer-note"><ShieldCheck size={13} /> Estado simulado, atualizado a cada comando.</div>
        <div className="world-footer-actions">
          <button type="button" className="button button-ghost button-small" onClick={onResetWorld}>
            <RotateCcw size={13} /> Reiniciar mundo
          </button>
          <button type="button" className="button button-primary button-small" onClick={onClose}>Voltar ao console</button>
        </div>
      </footer>
    </Modal>
  )
}

function ShareIcon() {
  return <Globe2 size={14} />
}
