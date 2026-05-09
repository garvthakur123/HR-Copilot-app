import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useWS } from '../contexts/WSContext'
import DateTimePicker from '../components/DateTimePicker'
import { EmailPreviewModal } from '../components/EmailModal'
import { sendInterviewEmail, buildEmailHTML } from '../utils/emailService'

const STATUS_META = {
  pending: { label: 'Pending Review', cls: 'badge-pending', color: 'var(--warning)' },
  shortlisted: { label: 'Shortlisted', cls: 'badge-shortlisted', color: 'var(--info)' },
  hired: { label: 'Hired', cls: 'badge-hired', color: 'var(--success)' },
  rejected: { label: 'Rejected', cls: 'badge-rejected', color: 'var(--danger)' },
}

// ── Schedule + Email modal (2 steps) ──
function ScheduleModal({ candidate, department, hrUser, onClose, onSaved }) {
  const { updateCandidate } = useData()
  const [step, setStep] = useState(1) // 1=schedule, 2=email preview
  const [sched, setSched] = useState({
    interviewDate: candidate.interviewDate || '',
    interviewMode: candidate.interviewMode || 'virtual',
    meetingPlatform: candidate.meetingPlatform || 'Google Meet',
    meetingLink: candidate.meetingLink || '',
  })
  const [emailHTML, setEmailHTML] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [notConfigured, setNotConfigured] = useState(false)

  function set(k, v) { setSched(s => ({ ...s, [k]: v })) }

  function handleNext() {
    const merged = { ...candidate, ...sched }
    const html = buildEmailHTML({ candidate: merged, department, hrUser })
    setEmailHTML(html)
    setStep(2)
  }

  async function handleSend() {
    setSending(true)
    setEmailError('')
    // persist schedule first
    updateCandidate(candidate.id, { ...sched })
    const merged = { ...candidate, ...sched }
    const result = await sendInterviewEmail({ candidate: merged, department, hrUser })
    setSending(false)
    if (result.notConfigured) {
      setNotConfigured(true)
      setSent(true)
      updateCandidate(candidate.id, { emailSent: true, emailSentAt: new Date().toISOString() })
      setTimeout(() => { onSaved(); onClose() }, 1800)
    } else if (result.ok) {
      setSent(true)
      updateCandidate(candidate.id, { emailSent: true, emailSentAt: new Date().toISOString() })
      setTimeout(() => { onSaved(); onClose() }, 1500)
    } else {
      setEmailError(result.error)
    }
  }

  if (step === 2) {
    return (
      <EmailPreviewModal
        html={emailHTML}
        onClose={onClose}
        onSend={handleSend}
        sending={sending}
        sent={sent}
        error={emailError}
        notConfigured={notConfigured}
        onConfigSave={() => {}}
        onBack={() => setStep(1)}
      />
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalSvg size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Schedule Interview</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>for {candidate.fullName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
            <XSvg size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', padding: '12px 24px', gap: 8 }}>
          {[['1', 'Schedule'], ['2', 'Send Email']].map(([n, label]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: n === '1' ? 'var(--accent)' : 'var(--bg-primary)',
                color: n === '1' ? '#fff' : 'var(--text-muted)',
                border: n === '2' ? '1px solid var(--border)' : 'none',
              }}>{n}</span>
              <span style={{ fontSize: 12, color: n === '1' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: n === '1' ? 600 : 400 }}>{label}</span>
              {n === '1' && <span style={{ color: 'var(--border)', margin: '0 4px' }}>→</span>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SField label="Interview Date & Time">
            <DateTimePicker value={sched.interviewDate} onChange={v => set('interviewDate', v)} placeholder="Select date and time" />
          </SField>

          <SField label="Interview Mode">
            <div style={{ display: 'flex', gap: 8 }}>
              {[['virtual', 'Virtual'], ['in-person', 'In-Person'], ['phone', 'Phone']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => set('interviewMode', val)} style={{
                  flex: 1, padding: '9px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: sched.interviewMode === val ? 'var(--accent)' : 'var(--bg-primary)',
                  color: sched.interviewMode === val ? '#fff' : 'var(--text-secondary)',
                  transition: 'all var(--transition)',
                }}>{lbl}</button>
              ))}
            </div>
          </SField>

          <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <VideoSvgI size={13} /> Meeting Link
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {['Google Meet', 'Zoom', 'MS Teams', 'Other'].map(p => (
                <button key={p} type="button" onClick={() => set('meetingPlatform', p)} style={{
                  padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: sched.meetingPlatform === p ? 'var(--accent-light)' : 'var(--bg-card)',
                  color: sched.meetingPlatform === p ? '#a5b4fc' : 'var(--text-muted)',
                  transition: 'all var(--transition)',
                }}>{p}</button>
              ))}
            </div>
            <input
              placeholder={sched.meetingPlatform === 'Google Meet' ? 'https://meet.google.com/xxx-xxxx-xxx' : sched.meetingPlatform === 'Zoom' ? 'https://zoom.us/j/xxxxxxxxxx' : 'Paste meeting URL'}
              value={sched.meetingLink}
              onChange={e => set('meetingLink', e.target.value)}
              style={{ marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              {sched.meetingPlatform === 'Google Meet' && (
                <a href="https://meet.google.com/new" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create new Google Meet
                </a>
              )}
              {sched.meetingPlatform === 'Zoom' && (
                <a href="https://zoom.us/meeting/schedule" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Schedule Zoom
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={!sched.interviewDate}
            style={{ opacity: !sched.interviewDate ? 0.6 : 1 }}
          >
            Next: Preview Email →
          </button>
        </div>
      </div>
    </div>
  )
}

function SField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  )
}

export default function CandidateDetail({ candidateId, onNavigate }) {
  const { getCandidate, departments, updateCandidate, deleteCandidate } = useData()
  const { user } = useAuth()
  const { sendMessage, addMessageHandler, removeMessageHandler } = useWS()
  const [showSchedule, setShowSchedule] = useState(false)
  const [joinStatus, setJoinStatus] = useState('') // feedback under the button
  const c = getCandidate(candidateId)

  if (!c) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <h3>Candidate not found</h3>
      <button className="btn-primary" onClick={() => onNavigate('candidates')} style={{ marginTop: 16 }}>Back to Candidates</button>
    </div>
  )

  const dept = departments.find(d => d.id === c.departmentId)
  const sm = STATUS_META[c.status] || { label: c.status, cls: 'badge-default', color: '#818cf8' }

  function changeStatus(status) { updateCandidate(c.id, { status }) }

  function handleJoinMeeting() {
    // 1. Open the meeting link (or a new Google Meet if none is saved)
    const meetUrl = c.meetingLink || 'https://meet.google.com/new'
    window.open(meetUrl, '_blank')

    // 2. Look up session_id from localStorage (written there when candidate was added)
    const sessionId = localStorage.getItem(c.email)
    if (!sessionId) {
      console.warn('[HR Copilot] No session_id found for', c.email)
      setJoinStatus('⚠ No session found for this candidate')
      return
    }

    // 3. Tell BE to load this candidate's context
    const payload = { type: 'analyze_jd_cv', session_id: sessionId }
    console.log('[HR Copilot] Sending analyze_jd_cv:', payload)
    localStorage.setItem('hr_copilot_active_session_id', sessionId)
    setJoinStatus('Connecting...')


    function onAnalyzeResponse(data) {
      if (data.session_id === sessionId || data.type === 'analyze_jd_cv') {
        console.log('[HR Copilot] analyze_jd_cv response from BE:', data)
        setJoinStatus('✅ Interview context loaded')
        removeMessageHandler(onAnalyzeResponse)
      }
    }
    addMessageHandler(onAnalyzeResponse)
    const sent = sendMessage(payload)
    if (!sent) setJoinStatus('⚠ WS not connected — retrying...')
  }

  const skills = c.skills ? c.skills.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      {/* Back */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn-ghost" onClick={() => onNavigate('candidates')} style={{ padding: '6px 10px' }}>
          <BackIcon size={16} /> Back to Candidates
        </button>
      </div>

      {/* Hero card */}
      <div className="card" style={{ marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${dept?.color || '#6366f1'}, ${dept?.color ? dept.color + '88' : '#8b5cf688'})`,
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, flexShrink: 0,
            background: `linear-gradient(135deg, ${dept?.color || '#6366f1'}88, ${dept?.color || '#6366f1'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#fff',
          }}>{c.fullName?.charAt(0) || '?'}</div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{c.fullName}</h1>
              <span className={`badge ${sm.cls}`} style={{ fontSize: 12 }}>{sm.label}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 10 }}>
              {c.position}
              {dept && <> · <span style={{ color: dept.color }}>{dept.name}</span></>}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              {c.email && <a href={`mailto:${c.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}><MailIcon size={13} />{c.email}</a>}
              {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><PhoneIcon size={13} />{c.phone}</span>}
              {c.location && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><LocationIcon size={13} />{c.location}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {c.emailSent && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 99, padding: '3px 10px' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Email Sent
                </span>
              )}
              {c.interviewDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, background: 'var(--info-bg)', color: 'var(--info)', borderRadius: 99, padding: '3px 10px' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {new Date(c.interviewDate).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true })}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', flexDirection: 'column' }}>
            <button
              className="btn-primary"
              onClick={() => setShowSchedule(true)}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)', width: '100%', justifyContent: 'center' }}
            >
              <CalSvg size={14} color="#fff" /> {c.interviewDate ? 'Reschedule & Email' : 'Schedule Interview'}
            </button>

            {/* Join Interview button */}
            <button
              onClick={handleJoinMeeting}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '9px 16px', border: 'none', borderRadius: 10,
                cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                transition: 'all var(--transition)',
              }}
            >
              <VideoIcon size={14} color="#fff" /> Join Interview
            </button>
            {joinStatus && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', width: '100%', textAlign: 'center' }}>
                {joinStatus}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button className="btn-secondary" onClick={() => onNavigate('edit-' + c.id)} style={{ flex: 1, justifyContent: 'center' }}>
                <EditIcon size={14} /> Edit
              </button>
              <select
                value={c.status}
                onChange={e => changeStatus(e.target.value)}
                style={{
                  flex: 1, background: 'var(--bg-primary)', border: `1px solid ${sm.color}44`,
                  color: sm.color, borderRadius: 8, padding: '8px 10px', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}
              >
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule modal */}
      {showSchedule && (
        <ScheduleModal
          candidate={c}
          department={dept}
          hrUser={user}
          onClose={() => setShowSchedule(false)}
          onSaved={() => setShowSchedule(false)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info */}
          <div className="card">
            <h3 style={sectionTitle}>Candidate Details</h3>
            <div className="grid-2" style={{ gap: 16 }}>
              <InfoItem icon={<BriefcaseIcon size={14} />} label="Experience" value={c.experience || '—'} />
              <InfoItem icon={<CalendarIcon size={14} />} label="Notice Period" value={c.noticePeriod || '—'} />
              <InfoItem icon={<MoneyIcon size={14} />} label="Expected CTC" value={c.expectedCTC || '—'} />
              <InfoItem icon={<ClockIcon size={14} />} label="Interview Mode" value={c.interviewMode || '—'} />
              {c.interviewDate && <InfoItem icon={<CalendarIcon size={14} />} label="Interview Date" value={new Date(c.interviewDate).toLocaleString()} />}
              <InfoItem icon={<UserIcon size={14} />} label="Added By" value={c.addedBy || '—'} />
            </div>
            {skills.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {skills.map(s => (
                    <span key={s} style={{
                      background: 'var(--accent-light)', color: '#a5b4fc',
                      borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 500,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* HR Remarks */}
          {c.hrRemarks && (
            <div className="card" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
              <h3 style={sectionTitle}>HR Remarks</h3>
              <div style={{
                background: 'var(--bg-primary)', borderRadius: 10, padding: '16px 18px',
                fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
                borderLeft: '3px solid var(--accent)',
              }}>
                {c.hrRemarks}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <LockIcon size={11} /> Visible to HR team only · Added by {c.addedBy || user?.name}
              </div>
            </div>
          )}
        </div>

        {/* Links sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Resume */}
          {c.resumeFile && (
            <div className="card">
              <h3 style={sectionTitle}>Resume</h3>
              <a
                href={c.resumeFile}
                download={c.resumeName}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--bg-primary)', borderRadius: 10, textDecoration: 'none',
                  border: '1px solid var(--border)', transition: 'all var(--transition)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-primary)' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileIcon size={18} color="var(--danger)" />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{c.resumeName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click to download</div>
                </div>
              </a>
            </div>
          )}

          {/* Meeting link */}
          {c.meetingLink && (
            <div className="card" style={{ borderColor: 'rgba(56,189,248,0.2)' }}>
              <h3 style={{ ...sectionTitle, color: 'var(--info)' }}>Meeting Link</h3>
              <a href={c.meetingLink} target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: 'var(--info-bg)', borderRadius: 10, textDecoration: 'none',
                border: '1px solid rgba(56,189,248,0.2)', transition: 'all var(--transition)',
                color: 'var(--text-primary)',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.2)'; e.currentTarget.style.transform = 'scale(1.01)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--info-bg)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <VideoIcon size={18} color="var(--info)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--info)' }}>{c.meetingPlatform || 'Join Meeting'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{c.meetingLink}</div>
                </div>
                <ExternalIcon size={13} />
              </a>
            </div>
          )}

          {/* Profile links */}
          {(c.githubUrl || c.linkedinUrl || c.portfolioUrl || c.otherUrl) && (
            <div className="card">
              <h3 style={sectionTitle}>Profile Links</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.githubUrl && <LinkItem href={c.githubUrl} icon={<GithubIcon size={16} />} label="GitHub" color="#e2e8f0" />}
                {c.linkedinUrl && <LinkItem href={c.linkedinUrl} icon={<LinkedinIcon size={16} />} label="LinkedIn" color="#0a66c2" />}
                {c.portfolioUrl && <LinkItem href={c.portfolioUrl} icon={<GlobeIcon size={16} />} label="Portfolio" color="#818cf8" />}
                {c.otherUrl && <LinkItem href={c.otherUrl} icon={<LinkIcon size={16} />} label="Other" color="var(--text-secondary)" />}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="card">
            <h3 style={sectionTitle}>Record Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Added</span>
                <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</span>
              </div>
              {c.updatedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Updated</span>
                  <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Added by</span>
                <span>{c.addedBy || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon, label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function LinkItem({ href, icon, label, color }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: 'var(--bg-primary)', borderRadius: 8, textDecoration: 'none',
      border: '1px solid var(--border)', transition: 'all var(--transition)', color: 'var(--text-primary)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateX(3px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
    >
      <span style={{ color }}>{icon}</span>
      <span style={{ fontWeight: 500, fontSize: 13 }}>{label}</span>
      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}><ExternalIcon size={12} /></span>
    </a>
  )
}

const sectionTitle = { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#818cf8', marginBottom: 16 }

function BackIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
function EditIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function MailIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.12-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function LocationIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function BriefcaseIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> }
function CalendarIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function MoneyIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
function ClockIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function UserIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function LockIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function FileIcon({ size = 16, color = 'currentColor' }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function GithubIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg> }
function LinkedinIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg> }
function GlobeIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> }
function LinkIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> }
function ExternalIcon({ size = 12 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> }
function VideoIcon({ size = 18, color = 'currentColor' }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> }
function CalSvg({ size = 16, color = 'currentColor' }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function XSvg({ size = 18 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function VideoSvgI({ size = 13 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> }
