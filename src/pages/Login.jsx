import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const [tab, setTab] = useState('login')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', top: -150, left: -150, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', bottom: -80, right: -80, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)', marginBottom: 18,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>HR Copilot</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Interview Management Suite</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(30,41,59,0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(99,102,241,0.18)',
          borderRadius: 22,
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
            {[['login', 'Sign In'], ['register', 'Register']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: '16px 0', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  color: tab === key ? '#a5b4fc' : 'var(--text-muted)',
                  borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all var(--transition)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '32px 36px' }}>
            {tab === 'login' ? <LoginForm login={login} /> : <RegisterForm register={register} onDone={() => setTab('login')} />}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          HR Copilot · Hackathon Edition 2024
        </p>
      </div>
    </div>
  )
}

// ── Login form ──
function LoginForm({ login }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    const result = login(form.email, form.password)
    if (!result.ok) setError(result.error)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Welcome back</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 0 }}>Sign in to your HR dashboard</p>
      </div>

      <Field label="Email address">
        <input type="email" required placeholder="hr@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ background: 'rgba(15,23,42,0.7)' }} />
      </Field>

      <Field label="Password">
        <PwInput value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} show={showPw} onToggle={() => setShowPw(s => !s)} />
      </Field>

      {error && <ErrorBanner msg={error} />}

      <SubmitBtn loading={loading} label="Sign In" loadingLabel="Signing in..." />

      <DemoCreds />
    </form>
  )
}

// ── Register form ──
function RegisterForm({ register, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'HR Recruiter', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const HR_ROLES = ['HR Manager', 'HR Recruiter', 'HR Admin', 'Talent Acquisition', 'People Operations']

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name required'
    if (!form.email.trim()) e.email = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    if (!form.confirm) e.confirm = 'Please confirm password'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    const result = register({ name: form.name, email: form.email, password: form.password, role: form.role })
    setLoading(false)
    if (!result.ok) setErrors({ email: result.error })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Create account</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Join your HR team</p>
      </div>

      <Field label="Full Name" error={errors.name}>
        <input placeholder="Jane Doe" value={form.name} onChange={e => set('name', e.target.value)} style={errors.name ? { borderColor: 'var(--danger)' } : { background: 'rgba(15,23,42,0.7)' }} autoComplete="off" />
      </Field>

      <Field label="Email Address" error={errors.email}>
        <input type="email" placeholder="jane@company.com" value={form.email} onChange={e => set('email', e.target.value)} style={errors.email ? { borderColor: 'var(--danger)' } : { background: 'rgba(15,23,42,0.7)' }} autoComplete="off" />
      </Field>

      <Field label="Role / Title">
        <select value={form.role} onChange={e => set('role', e.target.value)} style={{ background: 'rgba(15,23,42,0.7)' }}>
          {HR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Password" error={errors.password}>
          <PwInput value={form.password} onChange={v => set('password', v)} show={showPw} onToggle={() => setShowPw(s => !s)} placeholder="Min 6 chars" error={!!errors.password} />
        </Field>
        <Field label="Confirm Password" error={errors.confirm}>
          <PwInput value={form.confirm} onChange={v => set('confirm', v)} show={showConfirm} onToggle={() => setShowConfirm(s => !s)} placeholder="Repeat password" error={!!errors.confirm} />
        </Field>
      </div>

      <SubmitBtn loading={loading} label="Create Account" loadingLabel="Creating account..." />
    </form>
  )
}

// ── Shared sub-components ──

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: error ? 'var(--danger)' : 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
      {children}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {error}
      </div>}
    </div>
  )
}

function PwInput({ value, onChange, show, onToggle, placeholder = 'Enter password', error }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        required
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ background: 'rgba(15,23,42,0.7)', paddingRight: 42, ...(error ? { borderColor: 'var(--danger)' } : {}) }}
      />
      <button type="button" onClick={onToggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}>
        {show
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  )
}

function SubmitBtn({ loading, label, loadingLabel }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '13px 20px', borderRadius: 10,
      background: loading ? 'var(--accent-hover)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
      fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      boxShadow: '0 4px 16px rgba(99,102,241,0.35)', transition: 'all var(--transition)',
      marginTop: 4,
    }}>
      {loading ? <><Spinner /> {loadingLabel}</> : label}
    </button>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div style={{
      background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </div>
  )
}

function DemoCreds() {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'rgba(99,102,241,0.07)',
      border: '1px solid rgba(99,102,241,0.14)',
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Demo Credentials</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
        <span style={{ color: '#a5b4fc' }}>hr@company.com</span> · hr123<br />
        <span style={{ color: '#a5b4fc' }}>admin@company.com</span> · admin123
      </div>
    </div>
  )
}

function Spinner() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
}
