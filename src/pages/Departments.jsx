import { useState } from 'react'
import { useData } from '../contexts/DataContext'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#22c55e','#38bdf8','#f97316','#14b8a6','#e11d48','#84cc16']

export default function Departments({ onNavigate }) {
  const { departments, candidates, addDepartment, deleteDepartment } = useData()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] })
  const [delConfirm, setDelConfirm] = useState(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    addDepartment(form)
    setForm({ name: '', description: '', color: COLORS[0] })
    setShowForm(false)
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1>Departments</h1>
          <p>Organize job openings by department folders</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          <PlusIcon size={15} />{showForm ? 'Cancel' : 'New Department'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(99,102,241,0.3)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Create Department</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div>
                <label style={labelStyle}>Department Name *</label>
                <input placeholder="e.g. Engineering" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                        boxShadow: form.color === c ? `0 0 0 3px var(--bg-card), 0 0 0 5px ${c}` : 'none',
                        transition: 'box-shadow 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input placeholder="Brief description of this department" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary">Create Department</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {departments.length === 0 ? (
        <EmptyDepts onAdd={() => setShowForm(true)} />
      ) : (
        <div className="grid-auto">
          {departments.map(dept => {
            const count = candidates.filter(c => c.departmentId === dept.id).length
            const hired = candidates.filter(c => c.departmentId === dept.id && c.status === 'hired').length
            return (
              <div key={dept.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                  padding: 0, overflow: 'hidden',
                  borderTop: `3px solid ${dept.color}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${dept.color}33` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                onClick={() => onNavigate('dept-' + dept.id)}
              >
                <div style={{ padding: '20px 20px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: dept.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${dept.color}44`,
                    }}>
                      <FolderIcon size={20} color={dept.color} />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDelConfirm(dept.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{dept.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{dept.description || 'No description'}</div>
                </div>
                <div style={{
                  display: 'flex', borderTop: '1px solid var(--border)',
                  padding: '12px 20px', gap: 20,
                }}>
                  <Stat label="Candidates" value={count} color={dept.color} />
                  <Stat label="Hired" value={hired} color="#22c55e" />
                </div>
              </div>
            )
          })}

          {/* Add new card */}
          <div
            className="card"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 180, cursor: 'pointer', border: '2px dashed var(--border)',
              background: 'transparent', transition: 'all var(--transition)', gap: 10,
            }}
            onClick={() => setShowForm(true)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusIcon size={18} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>New Department</span>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {delConfirm && (
        <Modal onClose={() => setDelConfirm(null)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--danger-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <TrashIcon size={22} color="var(--danger)" />
            </div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Department?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              This will also remove all candidates in this department. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setDelConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => { deleteDepartment(delConfirm); setDelConfirm(null) }}>Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function EmptyDepts({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--accent-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <FolderIcon size={28} color="#818cf8" />
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>No departments yet</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Create departments to organize candidates by team</p>
      <button className="btn-primary" onClick={onAdd}><PlusIcon size={15} />Create First Department</button>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
        padding: 32, maxWidth: 400, width: '100%', boxShadow: 'var(--shadow-lg)',
      }}>
        {children}
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }

function FolderIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
}
function PlusIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function TrashIcon({ size = 16, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
