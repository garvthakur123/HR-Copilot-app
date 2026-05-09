import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: DashIcon },
  { id: 'departments', label: 'Departments', icon: FolderIcon },
  { id: 'candidates', label: 'All Candidates', icon: UsersIcon },
  { id: 'add-candidate', label: 'Add Candidate', icon: PlusIcon },
]

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuth()
  const { candidates, departments } = useData()
  const [showProfile, setShowProfile] = useState(false)

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-primary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>HR Copilot</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Interview Suite</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Copilot button */}
        <button
          onClick={() => {
            // Electron two-window mode: show overlay window via IPC
            if (window.copilotAPI?.openOverlay) {
              window.copilotAPI.openOverlay()
            } else {
              // Web / single-window fallback: dispatch custom event
              window.dispatchEvent(new CustomEvent('open-copilot'))
            }
          }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10, marginBottom: 8,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35))'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.25)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <span style={{ fontSize: 16 }}>🤖</span>
          HR Copilot
          <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(99,102,241,0.3)', padding: '2px 7px', borderRadius: 99, fontWeight: 600, letterSpacing: '0.05em' }}>AI</span>
        </button>

        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
          Navigation
        </div>
        {NAV.map(item => {
          const active = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? '#a5b4fc' : 'var(--text-secondary)',
                border: 'none',
                textAlign: 'left',
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all var(--transition)',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            >
              <item.icon size={16} />
              {item.label}
              {item.id === 'candidates' && candidates.length > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--accent-light)', color: '#a5b4fc',
                  borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>{candidates.length}</span>
              )}
            </button>
          )
        })}

        {/* Departments quick-nav */}
        {departments.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '16px 8px 8px' }}>
              Departments
            </div>
            {departments.slice(0, 6).map(dept => (
              <button
                key={dept.id}
                onClick={() => onNavigate('dept-' + dept.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: activePage === 'dept-' + dept.id ? 'var(--bg-card)' : 'transparent',
                  color: activePage === 'dept-' + dept.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => {
                  if (activePage !== 'dept-' + dept.id) {
                    e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dept.color, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <div
          onClick={() => setShowProfile(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>{user?.avatar}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
          <EditProfileIcon size={13} />
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '7px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <LogoutIcon size={14} /> Sign Out
        </button>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </aside>
  )
}

function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', role: user?.role || '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tab, setTab] = useState('info')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }
  function setPwField(k, v) { setPw(p => ({ ...p, [k]: v })); setError('') }

  function handleSave() {
    if (!form.name.trim()) return setError('Name is required')
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return setError('Valid email required')

    let currentPassword, newPassword
    if (tab === 'password') {
      if (!pw.current) return setError('Enter current password')
      if (pw.next.length < 6) return setError('New password must be at least 6 characters')
      if (pw.next !== pw.confirm) return setError('Passwords do not match')
      currentPassword = pw.current
      newPassword = pw.next
    }

    const res = updateProfile({ name: form.name, email: form.email, role: form.role, currentPassword, newPassword })
    if (!res.ok) return setError(res.error)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); onClose() }, 1400)
  }

  const ROLES = ['HR Manager', 'HR Recruiter', 'HR Admin', 'Talent Acquisition', 'People Operations']

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff',
            }}>{user?.avatar}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
            <XIcon size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[['info', 'Profile Info'], ['password', 'Change Password']].map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); setError('') }} style={{
              flex: 1, background: 'none', border: 'none', padding: '12px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: tab === k ? '#818cf8' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`,
              transition: 'all var(--transition)',
            }}>{label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tab === 'info' && (
            <>
              <PField label="Full Name">
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
              </PField>
              <PField label="Email Address">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
              </PField>
              <PField label="Role">
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </PField>
            </>
          )}
          {tab === 'password' && (
            <>
              <PField label="Current Password">
                <input type="password" value={pw.current} onChange={e => setPwField('current', e.target.value)} placeholder="Enter current password" />
              </PField>
              <PField label="New Password">
                <input type="password" value={pw.next} onChange={e => setPwField('next', e.target.value)} placeholder="At least 6 characters" />
              </PField>
              <PField label="Confirm New Password">
                <input type="password" value={pw.confirm} onChange={e => setPwField('confirm', e.target.value)} placeholder="Repeat new password" />
              </PField>
            </>
          )}

          {error && (
            <div style={{ background: 'var(--danger-bg, rgba(239,68,68,0.1))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            }}>Cancel</button>
            <button onClick={handleSave} style={{
              background: success ? 'var(--success)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', color: '#fff', cursor: 'pointer',
              padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: 7,
              transition: 'background 0.3s',
            }}>
              {success ? <><CheckIcon size={14} /> Saved!</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function DashIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function FolderIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
}
function UsersIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function PlusIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function LogoutIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
function EditProfileIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function XIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function CheckIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
