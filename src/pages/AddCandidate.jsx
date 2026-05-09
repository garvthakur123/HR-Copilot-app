import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import DateTimePicker from '../components/DateTimePicker'
import { EmailPreviewModal } from '../components/EmailModal'
import { buildEmailHTML, sendInterviewEmail } from '../utils/emailService'

// ── Field and Section defined OUTSIDE AddCandidate to prevent remount on re-render ──

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#818cf8', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1 }}>{title}</span>
        <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  )
}

function Field({ label, error, required, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: error ? 'var(--danger)' : 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><ErrIcon size={11} />{error}</div>}
    </div>
  )
}

function InputWithIcon({ icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>{icon}</span>
      <input {...props} style={{ ...(props.style || {}), paddingLeft: 38 }} />
    </div>
  )
}

// ─────────────────────────────────────────────

// Writes email → session_id to:
//   1. localStorage (instant, available at runtime for CandidateDetail)
//   2. src/data/sessionMap.json via Vite dev-server middleware (visible on disk for demos)
async function generateMapper(email, sessionId) {
  // 1. localStorage — always works in the browser
  localStorage.setItem(email, sessionId)
  console.log('[HR Copilot] localStorage saved:', email, '→', sessionId)

  // 2. JSON file on disk (Vite dev server only)
  try {
    const res = await fetch('/dev/write-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sessionId }),
    })
    const result = await res.json()
    if (result.ok) {
      console.log('[HR Copilot] sessionMap.json updated:', email, '→', sessionId)
    } else {
      console.warn('[HR Copilot] generateMapper (file write) failed:', result.error)
    }
  } catch (err) {
    console.warn('[HR Copilot] generateMapper (file write) error — is Vite running?', err.message)
  }
}

// ─────────────────────────────────────────────

const EMPTY = {
  fullName: '', email: '', phone: '', position: '', departmentId: '',
  experience: '', location: '', githubUrl: '', linkedinUrl: '',
  portfolioUrl: '', otherUrl: '', resumeFile: null, resumeName: '',
  status: 'pending', interviewDate: '', interviewMode: 'virtual',
  meetingLink: '', meetingPlatform: 'Google Meet',
  hrRemarks: '', skills: '', noticePeriod: '', expectedCTC: '',
}

export default function AddCandidate({ onNavigate, editId }) {
  const { departments, addCandidate, updateCandidate, getCandidate } = useData()
  const { user } = useAuth()
  const { sendMessage, addMessageHandler, removeMessageHandler } = useWS()

  const existing = editId ? getCandidate(editId) : null
  const [form, setForm] = useState(() => existing ? { ...EMPTY, ...existing } : { ...EMPTY })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailHTML, setEmailHTML] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSentMethod, setEmailSentMethod] = useState('')
  const [pendingData, setPendingData] = useState(null)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.fullName.trim()) errs.fullName = 'Full name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.position.trim()) errs.position = 'Position is required'
    if (!form.departmentId) errs.departmentId = 'Select a department'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const data = { ...form, addedBy: user?.name }

    console.log('data-------->>>>', data)

    if (editId) {
      setSaving(true)
      await new Promise(r => setTimeout(r, 400))
      updateCandidate(editId, data)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      return
    }

    // New candidate — show email preview first
    const dept = departments.find(d => d.id === form.departmentId)

    // Build job_description from available form fields (no dedicated JD field in this form)
    const jobDescription = [
      form.position,
      dept ? `Department: ${dept.name}` : '',
      form.experience ? `Experience: ${form.experience}` : '',
      form.skills ? `Required skills: ${form.skills}` : '',
      form.location ? `Location: ${form.location}` : '',
      form.noticePeriod ? `Notice period: ${form.noticePeriod}` : '',
      form.expectedCTC ? `Expected CTC: ${form.expectedCTC}` : '',
    ].filter(Boolean).join('. ')

    // cv_data: resumeFile is stored as a base64 data-URL ("data:...;base64,<data>")
    // Strip the prefix so the backend receives only the raw base64 binary string.
    const cvData = form.resumeFile
      ? (form.resumeFile.includes(',') ? form.resumeFile.split(',')[1] : form.resumeFile)
      : ''

    const wsPayload = { type: 'create_session', job_description: jobDescription, cv_data: cvData }
    console.log('[HR Copilot] WS payload:', wsPayload)

    // Register a one-time handler to capture the session_id from BE response
    const email = form.email
    function onCreateSessionResponse(data) {
      if (data.type === 'create_session' && data.session_id) {
        console.log('[HR Copilot] Session created, session_id:', data.session_id)
        generateMapper(email, data.session_id)
        removeMessageHandler(onCreateSessionResponse)
      }
    }
    addMessageHandler(onCreateSessionResponse)
    sendMessage(wsPayload)

    const html = buildEmailHTML({ candidate: data, department: dept, hrUser: user })
    setPendingData(data)
    setEmailHTML(html)
    setEmailSent(false)
    setEmailSentMethod('')
    setShowEmailModal(true)
  }

  async function handleEmailSend() {
    if (!pendingData) return
    setEmailSending(true)
    const dept = departments.find(d => d.id === pendingData.departmentId)
    const result = await sendInterviewEmail({ candidate: pendingData, department: dept, hrUser: user })
    setEmailSending(false)
    setEmailSent(true)
    setEmailSentMethod(result.method)
    const id = addCandidate(pendingData)
    setTimeout(() => { setShowEmailModal(false); onNavigate('candidate-' + id) }, 1800)
  }

  function handleSkipEmail() {
    if (!pendingData) return
    const id = addCandidate(pendingData)
    setShowEmailModal(false)
    onNavigate('candidate-' + id)
  }

  function handleResume(e) {
    const file = e.target.files[0]
    if (!file) return
    set('resumeName', file.name)
    const reader = new FileReader()
    reader.onload = ev => set('resumeFile', ev.target.result)
    reader.readAsDataURL(file)
  }

  const errStyle = (key) => errors[key] ? { borderColor: 'var(--danger)' } : {}

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button className="btn-ghost" onClick={() => onNavigate('candidates')} style={{ padding: '8px 12px', flexShrink: 0 }}>
          <BackIcon size={16} /> Back
        </button>
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{editId ? 'Edit Candidate' : 'Add New Candidate'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Fill in the details for the interview pipeline</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Personal Information ── */}
        <Section title="Personal Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Full Name" required error={errors.fullName}>
              <input
                placeholder="e.g. John Smith"
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                style={errStyle('fullName')}
                autoComplete="off"
              />
            </Field>
            <Field label="Email Address" required error={errors.email}>
              <InputWithIcon
                icon={<MailSvg />}
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                style={errStyle('email')}
                autoComplete="off"
              />
            </Field>
            <Field label="Phone Number">
              <InputWithIcon
                icon={<PhoneSvg />}
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </Field>
            <Field label="Current Location">
              <InputWithIcon
                icon={<PinSvg />}
                placeholder="e.g. Mumbai, India"
                value={form.location}
                onChange={e => set('location', e.target.value)}
              />
            </Field>
            <Field label="Years of Experience">
              <input
                placeholder="e.g. 3 years"
                value={form.experience}
                onChange={e => set('experience', e.target.value)}
              />
            </Field>
            <Field label="Notice Period">
              <input
                placeholder="e.g. 30 days / Immediate"
                value={form.noticePeriod}
                onChange={e => set('noticePeriod', e.target.value)}
              />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Key Skills" hint="Comma separated — e.g. React, Node.js, AWS">
              <input
                placeholder="React, TypeScript, Node.js, AWS..."
                value={form.skills}
                onChange={e => set('skills', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* ── Role Information ── */}
        <Section title="Role Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Position Applying For" required error={errors.position}>
              <InputWithIcon
                icon={<BriefSvg />}
                placeholder="e.g. Senior Frontend Engineer"
                value={form.position}
                onChange={e => set('position', e.target.value)}
                style={errStyle('position')}
              />
            </Field>
            <Field label="Department" required error={errors.departmentId}>
              <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)} style={errStyle('departmentId')}>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Expected CTC / Salary">
              <InputWithIcon
                icon={<MoneySvg />}
                placeholder="₹12 LPA or $80,000"
                value={form.expectedCTC}
                onChange={e => set('expectedCTC', e.target.value)}
              />
            </Field>
            <Field label="Application Status">
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="pending">Pending Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Resume & Links ── */}
        <Section title="Resume & Profile Links">
          {/* Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Resume / CV
            </label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
              border: `2px dashed ${form.resumeName ? 'var(--success)' : 'var(--border)'}`,
              borderRadius: 10, cursor: 'pointer',
              background: form.resumeName ? 'var(--success-bg)' : 'transparent',
              transition: 'all var(--transition)',
            }}>
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleResume} style={{ display: 'none' }} />
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: form.resumeName ? 'var(--success-bg)' : 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {form.resumeName
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                }
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: form.resumeName ? 'var(--success)' : 'var(--text-primary)' }}>
                  {form.resumeName || 'Upload Resume'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {form.resumeName ? 'Click to replace file' : 'PDF, DOC, DOCX — max 5MB'}
                </div>
              </div>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="GitHub Profile">
              <InputWithIcon icon={<GhSvg />} placeholder="https://github.com/username" value={form.githubUrl} onChange={e => set('githubUrl', e.target.value)} />
            </Field>
            <Field label="LinkedIn Profile">
              <InputWithIcon icon={<LiSvg />} placeholder="https://linkedin.com/in/username" value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} />
            </Field>
            <Field label="Portfolio / Website">
              <InputWithIcon icon={<GlobeSvg />} placeholder="https://myportfolio.dev" value={form.portfolioUrl} onChange={e => set('portfolioUrl', e.target.value)} />
            </Field>
            <Field label="Other Relevant Link">
              <InputWithIcon icon={<LinkSvg />} placeholder="Behance, Dribbble, etc." value={form.otherUrl} onChange={e => set('otherUrl', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ── Interview Schedule ── */}
        <Section title="Interview Schedule">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field label="Interview Date & Time" error={errors.interviewDate}>
              <DateTimePicker
                value={form.interviewDate}
                onChange={val => set('interviewDate', val)}
                placeholder="Pick date and time"
              />
            </Field>
            <Field label="Interview Mode">
              <select value={form.interviewMode} onChange={e => set('interviewMode', e.target.value)}>
                <option value="virtual">Virtual (Video Call)</option>
                <option value="in-person">In-Person</option>
                <option value="phone">Phone Screen</option>
              </select>
            </Field>
          </div>

          {/* Meeting link section */}
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 12, padding: '16px 18px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <VideoSvg size={14} /> Meeting Link
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Platform</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['Google Meet', 'Zoom', 'MS Teams', 'Other'].map(p => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="radio"
                        name="meetingPlatform"
                        value={p}
                        checked={form.meetingPlatform === p}
                        onChange={e => set('meetingPlatform', e.target.value)}
                        style={{ width: 'auto', accentColor: 'var(--accent)' }}
                      />
                      <span style={{ color: form.meetingPlatform === p ? 'var(--text-primary)' : 'var(--text-muted)' }}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Meeting URL</label>
                <InputWithIcon
                  icon={<LinkSvg />}
                  placeholder={form.meetingPlatform === 'Google Meet' ? 'https://meet.google.com/xxx-xxxx-xxx' : form.meetingPlatform === 'Zoom' ? 'https://zoom.us/j/xxxxxxxxxx' : 'Paste your meeting link'}
                  value={form.meetingLink}
                  onChange={e => set('meetingLink', e.target.value)}
                />
                {form.meetingPlatform === 'Google Meet' && (
                  <a href="https://meet.google.com/new" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#818cf8', marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create new Google Meet
                  </a>
                )}
                {form.meetingPlatform === 'Zoom' && (
                  <a href="https://zoom.us/meeting/schedule" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#818cf8', marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Schedule Zoom meeting
                  </a>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ── HR Remarks ── */}
        <Section title="HR Remarks">
          <textarea
            placeholder="Add observations, first impression, red flags, strengths, or any internal notes about this candidate..."
            value={form.hrRemarks}
            onChange={e => set('hrRemarks', e.target.value)}
            style={{ minHeight: 120 }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <LockSvg size={11} /> Visible only to HR team members — not included in candidate emails
          </div>
        </Section>

        {/* ── Action buttons ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end',
          flexWrap: 'wrap',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <button type="button" className="btn-ghost" onClick={() => onNavigate('candidates')} style={{ marginRight: 'auto' }}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ minWidth: 160, justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
          >
            {saving ? <><SpinSvg /> Saving...</>
              : saved ? <><CheckSvg size={14} /> Saved!</>
              : editId ? <><SaveSvg size={14} /> Save Changes</> : <><CheckSvg size={14} /> Submit Candidate</>
            }
          </button>
        </div>
      </form>

      {showEmailModal && (
        <EmailPreviewModal
          html={emailHTML}
          onClose={handleSkipEmail}
          onSend={handleEmailSend}
          sending={emailSending}
          sent={emailSent}
          sentMethod={emailSentMethod}
          onBack={() => setShowEmailModal(false)}
        />
      )}
    </div>
  )
}

// ── Inline SVG helpers ──
function ErrIcon({ size = 12 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function BackIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
function MailSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function MailSvgBtn({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.12-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function PinSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function BriefSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> }
function MoneySvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function GhSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> }
function LiSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg> }
function GlobeSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> }
function LinkSvg() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> }
function LockSvg({ size = 12 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function VideoSvg({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> }
function CheckSvg({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function SaveSvg({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> }
function SpinSvg() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> }
