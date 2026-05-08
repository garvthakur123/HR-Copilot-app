import { useState } from 'react'
import { useData } from '../contexts/DataContext'

const STATUS_OPTS = ['all', 'pending', 'shortlisted', 'hired', 'rejected']

export default function Candidates({ onNavigate, deptFilter }) {
  const { candidates, departments, deleteCandidate } = useData()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dept, setDept] = useState(deptFilter || 'all')
  const [delId, setDelId] = useState(null)

  const deptObj = deptFilter ? departments.find(d => d.id === deptFilter) : null

  const filtered = candidates.filter(c => {
    const matchSearch = !search || c.fullName?.toLowerCase().includes(search.toLowerCase()) || c.position?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === 'all' || c.status === status
    const matchDept = dept === 'all' || c.departmentId === dept
    return matchSearch && matchStatus && matchDept
  })

  const getDept = (id) => departments.find(d => d.id === id)

  const STATUS_META = {
    pending: { label: 'Pending', cls: 'badge-pending' },
    shortlisted: { label: 'Shortlisted', cls: 'badge-shortlisted' },
    hired: { label: 'Hired', cls: 'badge-hired' },
    rejected: { label: 'Rejected', cls: 'badge-rejected' },
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          {deptObj
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: deptObj.color, display: 'inline-block' }} />
                <h1>{deptObj.name}</h1>
              </div>
            : <h1>All Candidates</h1>
          }
          <p>{filtered.length} candidate{filtered.length !== 1 ? 's' : ''} {deptObj ? `in ${deptObj.name}` : 'across all departments'}</p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate('add-candidate')}>
          <PlusIcon size={15} /> Add Candidate
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <SearchIcon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search name, position, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: '0 0 160px' }}>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {!deptFilter && (
          <select value={dept} onChange={e => setDept(e.target.value)} style={{ flex: '0 0 180px' }}>
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_OPTS.map(s => {
          const count = s === 'all' ? candidates.filter(c => !deptFilter || c.departmentId === deptFilter).length
            : candidates.filter(c => c.status === s && (!deptFilter || c.departmentId === deptFilter)).length
          const active = status === s
          return (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: active ? 'var(--accent)' : 'var(--bg-card)',
              color: active ? '#fff' : 'var(--text-secondary)',
              transition: 'all var(--transition)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)',
                borderRadius: 99, padding: '0 6px', fontSize: 11,
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>
            <SearchIcon size={40} style={{ color: 'var(--text-muted)', display: 'inline-block' }} />
          </div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No candidates found</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Try adjusting filters or add a new candidate</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 80px',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
          }}>
            <div>Candidate</div>
            <div>Position</div>
            <div>Department</div>
            <div>Status</div>
            <div>Added</div>
            <div></div>
          </div>
          {filtered.map((c, i) => {
            const d = getDept(c.departmentId)
            const sm = STATUS_META[c.status] || { label: c.status, cls: 'badge-default' }
            return (
              <div key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 80px',
                  padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                  cursor: 'pointer', transition: 'background var(--transition)', alignItems: 'center',
                }}
                onClick={() => onNavigate('candidate-' + c.id)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${d?.color || '#6366f1'}88, ${d?.color || '#6366f1'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                  }}>{c.fullName?.charAt(0) || '?'}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{c.position}</div>
                <div>
                  {d ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      {d.name}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
                </div>
                <div><span className={`badge ${sm.cls}`}>{sm.label}</span></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button
                    title="Edit"
                    onClick={() => onNavigate('edit-' + c.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <EditIcon size={14} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => setDelId(c.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      {delId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
        }} onClick={() => setDelId(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
            padding: 32, maxWidth: 380, width: '100%', textAlign: 'center',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--danger-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <TrashIcon size={22} color="var(--danger)" />
            </div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Remove Candidate?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => { deleteCandidate(delId); setDelId(null) }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function PlusIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon({ size = 16, style }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', ...style }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function TrashIcon({ size = 16, color = 'currentColor' }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function EditIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
