import { useState } from 'react'
import { getEmailConfig, saveEmailConfig } from '../utils/emailService'

export function EmailPreviewModal({ html, onClose, onSend, sending, sent, sentMethod, onConfigSave, onBack }) {
  const [tab, setTab] = useState('preview')
  const [config, setConfig] = useState(() => getEmailConfig() || { serviceId: '', templateId: '', publicKey: '' })
  const [configSaved, setConfigSaved] = useState(false)
  const isEmailJSConfigured = !!(config.serviceId && config.templateId && config.publicKey)

  function handleSaveConfig() {
    saveEmailConfig(config)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
    onConfigSave?.()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 740, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MailIcon size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Interview Invitation Email</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Review before sending to candidate</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Email method badge */}
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
              background: isEmailJSConfigured ? 'var(--success-bg)' : 'var(--info-bg)',
              color: isEmailJSConfigured ? 'var(--success)' : 'var(--info)',
            }}>
              {isEmailJSConfigured ? 'Via EmailJS' : 'Via Mail App'}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}>
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {[['preview', 'Email Preview'], ['settings', 'EmailJS Settings']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: tab === key ? '#818cf8' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
              transition: 'all var(--transition)',
            }}>{label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'preview' && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Info banner */}
              {!isEmailJSConfigured && !sent && (
                <div style={{
                  background: 'var(--info-bg)', border: '1px solid rgba(56,189,248,0.2)',
                  borderRadius: 10, padding: '10px 14px',
                  fontSize: 13, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <InfoIcon size={14} />
                  <span>Clicking "Send Email" will open your mail app with this email pre-filled. To send silently, configure EmailJS in the Settings tab.</span>
                </div>
              )}
              {sent && (
                <div style={{
                  background: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 10, padding: '12px 16px',
                  fontSize: 14, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <CheckIcon size={16} />
                  {sentMethod === 'emailjs'
                    ? 'Email sent successfully via EmailJS!'
                    : 'Mail app opened — complete sending from your email client.'}
                </div>
              )}
              {/* HTML preview */}
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <iframe
                  srcDoc={html}
                  style={{ width: '100%', height: 500, border: 'none', background: '#f1f5f9', display: 'block' }}
                  title="Email Preview"
                />
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div style={{ padding: 24 }}>
              <div style={{
                background: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 12, padding: '16px 18px', marginBottom: 24, fontSize: 13, color: '#c7d2fe', lineHeight: 1.8,
              }}>
                <strong style={{ color: '#a5b4fc' }}>Optional: EmailJS Setup</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
                  Without EmailJS, clicking Send will open your mail app (Gmail, Outlook etc.) with the email pre-filled — works great for demos! To enable silent background sending:
                </p>
                <ol style={{ paddingLeft: 18, marginTop: 8, color: 'var(--text-secondary)' }}>
                  <li>Sign up free at <strong style={{ color: '#818cf8' }}>emailjs.com</strong></li>
                  <li>Add a Gmail/Outlook service</li>
                  <li>Create a template (use <code>{'{{to_email}}'}</code>, <code>{'{{to_name}}'}</code>, <code>{'{{interview_date}}'}</code>, <code>{'{{meeting_link}}'}</code>, <code>{'{{position}}'}</code>)</li>
                  <li>Paste your credentials below</li>
                </ol>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <EField label="Service ID">
                  <input value={config.serviceId} onChange={e => setConfig(c => ({ ...c, serviceId: e.target.value }))} placeholder="service_xxxxxxx" />
                </EField>
                <EField label="Template ID">
                  <input value={config.templateId} onChange={e => setConfig(c => ({ ...c, templateId: e.target.value }))} placeholder="template_xxxxxxx" />
                </EField>
                <EField label="Public Key">
                  <input value={config.publicKey} onChange={e => setConfig(c => ({ ...c, publicKey: e.target.value }))} placeholder="xxxxxxxxxxxxxxxxxxxx" />
                </EField>
                <button className="btn-primary" onClick={handleSaveConfig} style={{ alignSelf: 'flex-start' }}>
                  {configSaved ? <><CheckIcon size={14} /> Saved!</> : 'Save & Activate'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'preview' && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(15,23,42,0.5)' }}>
            {onBack && (
              <button className="btn-ghost" onClick={onBack} style={{ gap: 6 }}>
                <BackArrow size={14} /> Back
              </button>
            )}
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>
              {isEmailJSConfigured ? 'Will send silently via EmailJS' : 'Will open your mail app'}
            </span>
            {!sent && <button className="btn-secondary" onClick={onClose}>Cancel</button>}
            <button
              className="btn-primary"
              onClick={sent ? onClose : onSend}
              disabled={sending}
              style={{
                minWidth: 148, justifyContent: 'center', opacity: sending ? 0.8 : 1,
                background: sent ? 'var(--success)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: sent ? '0 4px 14px rgba(34,197,94,0.3)' : '0 4px 14px rgba(99,102,241,0.3)',
              }}
            >
              {sending
                ? <><SpinIcon /> Sending...</>
                : sent
                  ? <><CheckIcon size={14} /> Done!</>
                  : <><SendIcon size={14} /> {isEmailJSConfigured ? 'Send Email' : 'Send via Mail App'}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function MailIcon({ size = 18, color = 'currentColor' }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function CloseIcon({ size = 18 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function CheckIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function SendIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> }
function SpinIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> }
function InfoIcon({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> }
function BackArrow({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
