import { useState, useEffect, useRef } from 'react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

export default function DateTimePicker({ value, onChange, placeholder = 'Select date & time' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const parsed = value ? new Date(value) : null
  const [view, setView] = useState(() => {
    const d = parsed || new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selDate, setSelDate] = useState(parsed ? {
    year: parsed.getFullYear(), month: parsed.getMonth(), day: parsed.getDate()
  } : null)
  const [time, setTime] = useState(parsed ? {
    hour: parsed.getHours(), minute: parsed.getMinutes()
  } : { hour: 10, minute: 0 })

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay()
  }

  function prevMonth() {
    setView(v => {
      if (v.month === 0) return { year: v.year - 1, month: 11 }
      return { ...v, month: v.month - 1 }
    })
  }

  function nextMonth() {
    setView(v => {
      if (v.month === 11) return { year: v.year + 1, month: 0 }
      return { ...v, month: v.month + 1 }
    })
  }

  function selectDay(day) {
    const nd = { year: view.year, month: view.month, day }
    setSelDate(nd)
    // Auto-confirm after picking day
    const iso = buildISO(nd, time)
    onChange(iso)
  }

  function buildISO(d, t) {
    if (!d) return ''
    const dt = new Date(d.year, d.month, d.day, t.hour, t.minute)
    return dt.toISOString()
  }

  function handleTimeChange(field, val) {
    const nt = { ...time, [field]: Number(val) }
    setTime(nt)
    if (selDate) onChange(buildISO(selDate, nt))
  }

  function confirm() {
    if (selDate) {
      onChange(buildISO(selDate, time))
      setOpen(false)
    }
  }

  function formatDisplay(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    })
  }

  const daysInMonth = getDaysInMonth(view.year, view.month)
  const firstDay = getFirstDayOfWeek(view.year, view.month)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isPast = (day) => {
    const d = new Date(view.year, view.month, day)
    d.setHours(0,0,0,0)
    const t = new Date(); t.setHours(0,0,0,0)
    return d < t
  }

  const isSelected = (day) => selDate && selDate.year === view.year && selDate.month === view.month && selDate.day === day

  const hourOptions = Array.from({length: 24}, (_, i) => i)
  const minuteOptions = [0, 15, 30, 45]

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: 'var(--bg-primary)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px var(--accent-glow)' : 'none',
          transition: 'all var(--transition)', textAlign: 'left',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        <CalIcon size={15} />
        <span style={{ flex: 1 }}>{value ? formatDisplay(value) : placeholder}</span>
        <ChevronIcon size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          width: 320, overflow: 'hidden',
          animation: 'fadeInDown 0.15s ease',
        }}>
          <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <button type="button" onClick={prevMonth} style={navBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{MONTHS[view.month]} {view.year}</span>
            <button type="button" onClick={nextMonth} style={navBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 12px 4px', gap: 2 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 12px 12px', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const past = isPast(day)
              const sel = isSelected(day)
              const isToday = `${view.year}-${view.month}-${day}` === todayKey
              return (
                <button
                  key={day}
                  type="button"
                  disabled={past}
                  onClick={() => selectDay(day)}
                  style={{
                    padding: '7px 0', borderRadius: 8, border: 'none', cursor: past ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: sel ? 700 : isToday ? 600 : 400,
                    background: sel ? 'var(--accent)' : isToday ? 'var(--accent-light)' : 'transparent',
                    color: sel ? '#fff' : past ? 'var(--text-muted)' : isToday ? '#a5b4fc' : 'var(--text-primary)',
                    transition: 'all 0.15s',
                    opacity: past ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (!sel && !past) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                  onMouseLeave={e => { if (!sel && !past) e.currentTarget.style.background = 'transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Time picker */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'rgba(15,23,42,0.5)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Time</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={time.hour}
                onChange={e => handleTimeChange('hour', e.target.value)}
                style={{ flex: 1, padding: '8px 10px', fontSize: 14, background: 'var(--bg-primary)' }}
              >
                {hourOptions.map(h => (
                  <option key={h} value={h}>{h.toString().padStart(2,'0')}:00 {h < 12 ? 'AM' : 'PM'}</option>
                ))}
              </select>
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>:</span>
              <select
                value={time.minute}
                onChange={e => handleTimeChange('minute', e.target.value)}
                style={{ flex: 1, padding: '8px 10px', fontSize: 14, background: 'var(--bg-primary)' }}
              >
                {minuteOptions.map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2,'0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Confirm */}
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setOpen(false)} style={{ ...navBtn, padding: '7px 14px', fontSize: 13 }}>Cancel</button>
            <button
              type="button"
              onClick={confirm}
              disabled={!selDate}
              style={{
                padding: '7px 18px', background: selDate ? 'var(--accent)' : 'var(--bg-primary)',
                color: selDate ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: 8, cursor: selDate ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 8px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
}

function CalIcon({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function ChevronIcon({ size = 14, style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="6 9 12 15 18 9"/></svg>
}
