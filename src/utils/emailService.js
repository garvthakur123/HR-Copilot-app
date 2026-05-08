import emailjs from '@emailjs/browser'

export function getEmailConfig() {
  try {
    const c = localStorage.getItem('hr_email_config')
    return c ? JSON.parse(c) : null
  } catch { return null }
}

export function saveEmailConfig(cfg) {
  localStorage.setItem('hr_email_config', JSON.stringify(cfg))
}

export function buildEmailParams({ candidate, department, hrUser }) {
  const interviewDate = candidate.interviewDate
    ? new Date(candidate.interviewDate).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : 'To be confirmed'

  const modeLabel = { virtual: 'Virtual (Video Call)', 'in-person': 'In-Person', phone: 'Phone Screen' }

  return {
    to_name: candidate.fullName,
    to_email: candidate.email,
    position: candidate.position,
    department: department?.name || 'the team',
    interview_date: interviewDate,
    interview_mode: modeLabel[candidate.interviewMode] || candidate.interviewMode,
    meeting_link: candidate.meetingLink || 'Will be shared shortly',
    meeting_platform: candidate.meetingPlatform || 'Online',
    hr_name: hrUser?.name || 'HR Team',
    company_name: 'Our Company',
    candidate_email: candidate.email,
    candidate_phone: candidate.phone || '',
    job_description: department?.description || `${candidate.position} role`,
  }
}

export async function sendInterviewEmail({ candidate, department, hrUser }) {
  const config = getEmailConfig()
  const params = buildEmailParams({ candidate, department, hrUser })

  if (config?.serviceId && config?.templateId && config?.publicKey) {
    try {
      await emailjs.send(config.serviceId, config.templateId, params, config.publicKey)
      return { ok: true, method: 'emailjs', params }
    } catch (err) {
      // EmailJS failed — fall through to mailto
      console.warn('EmailJS error, falling back to mailto:', err)
    }
  }

  // Fallback: open mailto in browser
  openMailto({ candidate, department, hrUser })
  return { ok: true, method: 'mailto', params }
}

export function openMailto({ candidate, department, hrUser }) {
  const p = buildEmailParams({ candidate, department, hrUser })
  const subject = `Interview Invitation – ${p.position} at ${p.company_name}`
  const body = buildPlainTextEmail(p)
  const link = `mailto:${p.to_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(link, '_blank')
}

export function buildPlainTextEmail(p) {
  return `Dear ${p.to_name},

Congratulations! We are pleased to invite you for an interview for the ${p.position} position with our ${p.department} team.

─── INTERVIEW DETAILS ───────────────────────
📅 Date & Time : ${p.interview_date}
💻 Mode        : ${p.interview_mode}
🎯 Role        : ${p.position}
🏢 Department  : ${p.department}
🔗 Meeting     : ${p.meeting_link}

─── DO'S ────────────────────────────────────
✅ Join 5 minutes early
✅ Keep your camera on (for virtual interviews)
✅ Have your resume and portfolio ready to share
✅ Research the company and role beforehand
✅ Dress professionally
✅ Prepare 2–3 questions for the interviewer
✅ Have a stable internet connection and quiet space

─── DON'TS ──────────────────────────────────
❌ Don't be late — notify in advance if needed
❌ Don't multitask or use your phone
❌ Don't speak negatively about past employers
❌ Don't come unprepared — know your resume
❌ Don't share the meeting link with others

─── WHAT TO PREPARE ─────────────────────────
• Updated resume (digital copy)
• GitHub profile or work portfolio samples
• 1–2 minute self-introduction
• Examples of relevant past projects
• Contact details of 2–3 references

Need to reschedule? Reply to this email at least 24 hours in advance.

Best regards,
${p.hr_name}
${p.company_name}

— Sent via HR Copilot`
}

export function buildEmailHTML({ candidate, department, hrUser }) {
  const p = buildEmailParams({ candidate, department, hrUser })
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
  .wrapper { max-width: 600px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px 16px 0 0; padding: 32px 36px; text-align: center; }
  .header h1 { color: #fff; font-size: 22px; margin: 0; font-weight: 800; }
  .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
  .body { background: #fff; padding: 36px; }
  .footer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 16px 16px; padding: 20px 36px; text-align: center; }
  .detail-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
  .detail-row { display: flex; gap: 10px; margin-bottom: 10px; font-size: 14px; }
  .detail-label { color: #64748b; min-width: 120px; font-weight: 600; }
  .detail-value { color: #1e293b; font-weight: 500; }
  .link-btn { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 16px 0; }
  .section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin: 24px 0 12px; border-left: 3px solid #6366f1; padding-left: 12px; }
  .list { margin: 0; padding-left: 20px; }
  .list li { margin-bottom: 6px; font-size: 14px; color: #475569; line-height: 1.6; }
  .dos { color: #16a34a; }
  .donts { color: #dc2626; }
  .tag { display: inline-block; background: #ede9fe; color: #6d28d9; border-radius: 6px; padding: 2px 10px; font-size: 12px; font-weight: 600; margin: 2px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Interview Confirmation</h1>
    <p>HR Copilot · Interview Management</p>
  </div>
  <div class="body">
    <p style="font-size:16px; font-weight:600; margin-bottom:4px">Dear ${p.to_name},</p>
    <p style="color:#475569; font-size:14px; margin-top:0; line-height:1.7">
      Congratulations! We are pleased to invite you for an interview for the
      <strong>${p.position}</strong> position with our <strong>${p.department}</strong> team.
    </p>

    <div class="detail-box">
      <div style="font-size:13px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:14px">Interview Details</div>
      <div class="detail-row"><span class="detail-label">📅 Date & Time</span><span class="detail-value">${p.interview_date}</span></div>
      <div class="detail-row"><span class="detail-label">💻 Mode</span><span class="detail-value">${p.interview_mode}</span></div>
      <div class="detail-row"><span class="detail-label">🎯 Role</span><span class="detail-value">${p.position}</span></div>
      <div class="detail-row"><span class="detail-label">🏢 Department</span><span class="detail-value">${p.department}</span></div>
      <div class="detail-row"><span class="detail-label">🔗 Meeting Link</span><span class="detail-value">${p.meeting_link !== 'Will be shared shortly' ? `<a href="${p.meeting_link}" style="color:#6366f1;font-weight:600">${p.meeting_platform} — Join Now</a>` : '<span style="color:#94a3b8;font-style:italic">Will be shared shortly</span>'}</span></div>
    </div>

    ${p.meeting_link !== 'Will be shared shortly' ? `<div style="text-align:center;margin:20px 0"><a href="${p.meeting_link}" class="link-btn">Join ${p.meeting_platform} Meeting</a></div>` : `<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:14px 18px;margin:16px 0;text-align:center;font-size:13px;color:#94a3b8">Meeting link will be shared before the interview</div>`}

    <div class="section-title">About the Role</div>
    <p style="font-size:14px; color:#475569; line-height:1.7">${p.job_description}</p>

    <div class="section-title" style="border-color:#16a34a">✅ Interview Do's</div>
    <ul class="list">
      <li>Join the interview <strong>5 minutes early</strong></li>
      <li>Keep your <strong>camera on</strong> throughout (for virtual interviews)</li>
      <li>Have your <strong>resume and portfolio</strong> ready to share</li>
      <li>Research the company and the role beforehand</li>
      <li>Dress <strong>professionally</strong> — business casual at minimum</li>
      <li>Prepare <strong>2–3 thoughtful questions</strong> to ask the interviewer</li>
      <li>Mute yourself when not speaking (virtual)</li>
      <li>Have a stable internet connection and a quiet environment</li>
    </ul>

    <div class="section-title" style="border-color:#dc2626">❌ Interview Don'ts</div>
    <ul class="list">
      <li>Don't be late — notify in advance if you cannot make it</li>
      <li>Don't multitask or use your phone during the interview</li>
      <li>Don't speak negatively about previous employers</li>
      <li>Don't be unprepared — know your resume inside out</li>
      <li>Don't share your screen / meeting link with others</li>
      <li>Don't use informal language or slang</li>
    </ul>

    <div class="section-title">📝 What to Prepare</div>
    <ul class="list">
      <li>Updated resume (have a digital copy ready)</li>
      <li>GitHub profile or work portfolio samples</li>
      <li>A brief introduction (1–2 minutes about yourself)</li>
      <li>Examples of past projects relevant to this role</li>
      <li>Contact details of 2–3 professional references</li>
    </ul>

    <div style="background:#ede9fe; border-radius:10px; padding:16px 18px; margin-top:24px; font-size:14px; color:#4c1d95; line-height:1.7">
      <strong>Need to reschedule?</strong> Please reply to this email or contact <strong>${p.hr_name}</strong> at least 24 hours in advance.
    </div>
  </div>
  <div class="footer">
    <p style="margin:0; font-size:13px; color:#64748b">Best regards,<br><strong style="color:#1e293b">${p.hr_name}</strong><br>${p.company_name}</p>
    <p style="font-size:11px; color:#94a3b8; margin-top:12px">Sent via HR Copilot · Interview Management Suite</p>
  </div>
</div>
</body>
</html>`
}
