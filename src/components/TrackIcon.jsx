import {
  Sparkles,
  FolderTree,
  FileText,
  Workflow,
  Cpu,
  Activity,
  UsersRound,
  Network,
  KeyRound,
  PackageOpen,
  CalendarClock,
  RadioTower,
  ShieldCheck,
  FileSpreadsheet,
  Bug,
  Braces,
  TerminalSquare,
  Terminal,
} from 'lucide-react'
import { categoryFor } from '../data/catalog.js'

const ICONS = {
  Sparkles,
  FolderTree,
  FileText,
  Workflow,
  Cpu,
  Activity,
  UsersRound,
  Network,
  KeyRound,
  PackageOpen,
  CalendarClock,
  RadioTower,
  ShieldCheck,
  FileSpreadsheet,
  Bug,
  Braces,
  TerminalSquare,
}

export default function TrackIcon({ category, size = 16, ...props }) {
  const resolved = typeof category === 'string' ? categoryFor(category) : category
  const Icon = ICONS[resolved?.icon] ?? Terminal
  return <Icon size={size} strokeWidth={1.8} {...props} />
}

export function categoryColor(category) {
  const resolved = typeof category === 'string' ? categoryFor(category) : category
  return resolved?.color ?? 'var(--accent)'
}
