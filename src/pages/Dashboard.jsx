import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth()
  const { candidates, departments } = useData()
  const now = useClock()

  const statusCount = (status) => candidates.filter(c => c.status === status).length

  const stats = [
    { label: 'Total Candidates', value: candidates.length, icon: UsersIcon, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Departments', value: departments.length, icon: FolderIcon, color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
    { label: 'Shortlisted', value: statusCount('shortlisted'), icon: StarIcon, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Hired', value: statusCount('hired'), icon: CheckIcon, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  ]

  const recent = [...candidates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)

  const getDept = (id) => departments.find(d => d.id === id)

  const statusBadge = {
    pending: { label: 'Pending', cls: 'badge-pending' },
    shortlisted: { label: 'Shortlisted', cls: 'badge-shortlisted' },
    hired: { label: 'Hired', cls: 'badge-hired' },
    rejected: { label: 'Rejected', cls: 'badge-rejected' },
  }

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greetIcon = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙'
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const [timePart, ampm] = timeStr.split(' ')
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Upcoming interviews today
  const todayInterviews = candidates.filter(c => {
    if (!c.interviewDate) return false
    const d = new Date(c.interviewDate)
    return d.toDateString() === now.toDateString()
  })

  return (
    <div className="page">
      {/* Header */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Greeting */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{greetIcon}</span> {greeting}
              <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {user?.name?.split(' ')[0]},
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 13 }}>
              Here's what's happening in your pipeline today.
            </p>
            <div style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={() => onNavigate('add-candidate')}>
                <PlusIcon size={15} /> Add Candidate
              </button>
            </div>
          </div>

          {/* Date + Time card */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
            minWidth: 260, gap: 4,
          }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live</span>
            </div>
            {/* Time */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-primary)', lineHeight: 1 }}>
                {timePart}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em' }}>
                {ampm}
              </span>
            </div>
            {/* Date */}
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500, textAlign: 'right' }}>
              {dateStr}
            </div>
            {/* Today interviews */}
            {todayInterviews.length > 0 && (
              <div style={{
                marginTop: 12, fontSize: 12, color: 'var(--warning)',
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--warning-bg)', padding: '5px 12px', borderRadius: 99, fontWeight: 600,
              }}>
                <ClockIcon size={11} /> {todayInterviews.length} interview{todayInterviews.length > 1 ? 's' : ''} today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all var(--transition)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '55'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Recent candidates */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>Recent Candidates</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Latest additions across all departments</p>
            </div>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => onNavigate('candidates')}>View all</button>
          </div>
          {recent.length === 0 ? (
            <EmptyState message="No candidates yet" sub="Add your first candidate to get started" onAction={() => onNavigate('add-candidate')} actionLabel="Add Candidate" />
          ) : (
            <div>
              {recent.map((c, i) => {
                const dept = getDept(c.departmentId)
                const sb = statusBadge[c.status] || { label: c.status, cls: 'badge-default' }
                return (
                  <div
                    key={c.id}
                    onClick={() => onNavigate('candidate-' + c.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 24px',
                      borderBottom: i < recent.length - 1 ? '1px solid var(--border-light)' : 'none',
                      cursor: 'pointer', transition: 'background var(--transition)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${dept?.color || '#6366f1'}aa, ${dept?.color || '#6366f1'})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#fff',
                    }}>
                      {c.fullName?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.position} · {dept?.name || 'Unknown'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span className={`badge ${sb.cls}`}>{sb.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Dept breakdown */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Departments</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>Candidates per department</p>
          {departments.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No departments yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {departments.map(dept => {
                const count = candidates.filter(c => c.departmentId === dept.id).length
                const max = Math.max(...departments.map(d => candidates.filter(c => c.departmentId === d.id).length), 1)
                const pct = Math.round((count / max) * 100)
                return (
                  <div key={dept.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate('dept-' + dept.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dept.color, display: 'inline-block' }} />
                        {dept.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: dept.color }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: pct + '%',
                        background: dept.color,
                        borderRadius: 99,
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message, sub, onAction, actionLabel }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <UsersIcon size={24} color="#818cf8" />
      </div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{message}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>{sub}</div>
      {onAction && <button className="btn-primary" onClick={onAction}><PlusIcon size={14} />{actionLabel}</button>}
    </div>
  )
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function UsersIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}
function FolderIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
}
function StarIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
}
function CheckIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function PlusIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function ClockIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}
