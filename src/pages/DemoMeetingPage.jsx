import React from 'react';
import './DemoMeetingPage.css';

const PARTICIPANTS = [
  {
    id: 'candidate',
    name: 'Alex Rivera',
    role: 'Candidate',
    initials: 'AR',
    avatarColor: '#4f46e5',
    isMuted: false,
  },
  {
    id: 'recruiter',
    name: 'Sarah Chen',
    role: 'HR Recruiter',
    initials: 'SC',
    avatarColor: '#0891b2',
    isMuted: true,
  },
];

const MEETING_CONTROLS = [
  { icon: '🎤', label: 'Mute', active: true },
  { icon: '📷', label: 'Camera', active: true },
  { icon: '🖥️', label: 'Share', active: false },
  { icon: '💬', label: 'Chat', active: false },
  { icon: '👥', label: 'People', active: false },
];

export default function DemoMeetingPage() {
  return (
    <div className="meeting-page">
      {/* Top bar */}
      <div className="meeting-topbar">
        <div className="meeting-topbar-left">
          <span className="meeting-rec-dot" />
          <span className="meeting-rec-label">REC</span>
          <span className="meeting-topbar-divider" />
          <span className="meeting-title">Senior Backend Engineer – Technical Interview</span>
        </div>
        <div className="meeting-topbar-right">
          <span className="meeting-duration">00:14:32</span>
          <div className="meeting-info-chip">Round 2 of 3</div>
        </div>
      </div>

      {/* Participant grid */}
      <div className="meeting-grid">
        {PARTICIPANTS.map((p) => (
          <div key={p.id} className="meeting-card">
            <div
              className="meeting-avatar"
              style={{ background: p.avatarColor }}
            >
              {p.initials}
            </div>
            <div className="meeting-card-info">
              <span className="meeting-card-name">{p.name}</span>
              <span className="meeting-card-role">{p.role}</span>
            </div>
            {p.isMuted && <span className="meeting-muted-badge">🔇</span>}
          </div>
        ))}
      </div>

      {/* Controls bar */}
      <div className="meeting-controls">
        {MEETING_CONTROLS.map((ctrl) => (
          <button
            key={ctrl.label}
            className={`meeting-ctrl-btn${ctrl.active ? ' active' : ''}`}
          >
            <span className="meeting-ctrl-icon">{ctrl.icon}</span>
            <span className="meeting-ctrl-label">{ctrl.label}</span>
          </button>
        ))}
        <button className="meeting-end-btn">End Interview</button>
      </div>
    </div>
  );
}
