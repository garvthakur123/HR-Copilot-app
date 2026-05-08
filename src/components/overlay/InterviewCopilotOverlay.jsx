import { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import './InterviewCopilotOverlay.css';

const INITIAL_POSITION = { x: window.innerWidth - 424, y: 80 };

const WELCOME = `Hi! I'm your **HR Copilot**. Ask me anything about your pipeline — candidates, interviews, departments, or hiring insights. I'm here to help you move fast.`;

const SUGGESTIONS = [
  'Pipeline summary',
  'Interviews today',
  'Who is shortlisted?',
  'Top departments',
  'Hiring progress',
];

function buildResponse(input, candidates, departments, user) {
  const q = input.toLowerCase();
  const now = new Date();

  const statusCount = (s) => candidates.filter(c => c.status === s).length;
  const todayList = candidates.filter(c => {
    if (!c.interviewDate) return false;
    return new Date(c.interviewDate).toDateString() === now.toDateString();
  });

  if (q.includes('summary') || q.includes('overview') || q.includes('pipeline')) {
    const hired = statusCount('hired');
    const shortlisted = statusCount('shortlisted');
    const pending = statusCount('pending');
    const rejected = statusCount('rejected');
    return `Here's your current pipeline overview:\n\n**Total candidates:** ${candidates.length}\n**Shortlisted:** ${shortlisted}\n**Hired:** ${hired}\n**Pending review:** ${pending}\n**Rejected:** ${rejected}\n\nYou have **${departments.length} departments** active. ${shortlisted > 0 ? `${shortlisted} candidate${shortlisted > 1 ? 's are' : ' is'} ready to move forward.` : 'No candidates shortlisted yet.'}`;
  }

  if (q.includes('today') || q.includes('interview today') || q.includes('schedule')) {
    if (todayList.length === 0) return `No interviews scheduled for today. Want me to help you find candidates ready to schedule?`;
    const names = todayList.map(c => `**${c.fullName}** — ${c.position}`).join('\n');
    return `You have **${todayList.length} interview${todayList.length > 1 ? 's' : ''}** today:\n\n${names}\n\nMake sure all links and confirmations are sent!`;
  }

  if (q.includes('shortlist') || q.includes('shortlisted')) {
    const list = candidates.filter(c => c.status === 'shortlisted');
    if (list.length === 0) return `No candidates are shortlisted yet. Review pending candidates and move strong profiles to shortlisted.`;
    const names = list.slice(0, 5).map(c => {
      const dept = departments.find(d => d.id === c.departmentId);
      return `**${c.fullName}** — ${c.position} (${dept?.name || 'Unknown'})`;
    }).join('\n');
    return `**${list.length} shortlisted candidate${list.length > 1 ? 's' : ''}:**\n\n${names}${list.length > 5 ? `\n\n...and ${list.length - 5} more.` : ''}`;
  }

  if (q.includes('hired') || q.includes('hire')) {
    const list = candidates.filter(c => c.status === 'hired');
    if (list.length === 0) return `No candidates marked as hired yet. Once interviews conclude, update their status to track your hiring success.`;
    return `**${list.length} candidate${list.length > 1 ? 's' : ''} hired** so far. Great progress! Keep the pipeline warm for upcoming roles.`;
  }

  if (q.includes('department') || q.includes('dept') || q.includes('top')) {
    if (departments.length === 0) return `No departments set up yet. Add departments first to organize your pipeline.`;
    const ranked = departments
      .map(d => ({ ...d, count: candidates.filter(c => c.departmentId === d.id).length }))
      .sort((a, b) => b.count - a.count);
    const list = ranked.slice(0, 4).map(d => `**${d.name}** — ${d.count} candidate${d.count !== 1 ? 's' : ''}`).join('\n');
    return `Candidate distribution across departments:\n\n${list}\n\n**${ranked[0]?.name}** has the most activity.`;
  }

  if (q.includes('pending') || q.includes('review')) {
    const list = candidates.filter(c => c.status === 'pending');
    if (list.length === 0) return `No pending candidates — your review queue is clear!`;
    return `**${list.length} candidate${list.length > 1 ? 's' : ''}** still pending review. Tip: review and shortlist strong profiles early to avoid losing them to competing offers.`;
  }

  if (q.includes('rejected') || q.includes('reject')) {
    const count = statusCount('rejected');
    return count === 0
      ? `No rejections recorded yet.`
      : `**${count} candidate${count > 1 ? 's' : ''}** have been rejected. Consider sending them a polite rejection email to maintain a positive employer brand.`;
  }

  if (q.includes('progress') || q.includes('hiring')) {
    const total = candidates.length;
    if (total === 0) return `Pipeline is empty. Start by adding candidates to track your hiring progress.`;
    const hired = statusCount('hired');
    const pct = total > 0 ? Math.round((hired / total) * 100) : 0;
    return `**Hiring progress:** ${hired} of ${total} candidates converted to hired (${pct}%).\n\nFunnel breakdown:\n**Pending** → **Shortlisted** → **Hired**\n${statusCount('pending')} → ${statusCount('shortlisted')} → ${hired}`;
  }

  if (q.includes('help') || q.includes('what can')) {
    return `Here's what I can help you with:\n\n• **Pipeline summary** — total counts by status\n• **Today's interviews** — who's scheduled\n• **Shortlisted candidates** — who's ready\n• **Department breakdown** — candidates per team\n• **Hiring progress** — funnel metrics\n• **Pending reviews** — what needs attention\n\nJust ask naturally — I'll figure it out!`;
  }

  if (q.includes('tip') || q.includes('suggest') || q.includes('advice') || q.includes('recommend')) {
    const tips = [
      `Tip: Follow up with shortlisted candidates within **48 hours** to keep their interest high.`,
      `Tip: Schedule interviews in the morning — candidates are sharper and decision-makers are more available.`,
      `Tip: Always send a confirmation email with the meeting link **24 hours before** the interview.`,
      `Tip: Structured interviews with consistent questions reduce unconscious bias and improve hire quality.`,
      `Tip: Track your offer acceptance rate — if it's low, compensation or experience might need adjustment.`,
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  // Default
  const defaults = [
    `I can help you analyze your hiring pipeline. Try asking: **"Who is shortlisted?"**, **"Any interviews today?"**, or **"Give me a pipeline summary"**.`,
    `Good question! For best results, ask me about your candidates, interview schedule, or department metrics.`,
    `I'm focused on your HR pipeline data. Ask me things like **"Show me pending reviews"**, **"Hiring progress"**, or **"Which departments have candidates?"**`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

export default function InterviewCopilotOverlay() {
  const { candidates, departments } = useData();
  const { user } = useAuth();

  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(INITIAL_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState([{ id: 0, role: 'ai', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const msgId = useRef(1);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    const handler = () => { setIsVisible(true); setIsMinimized(false); setTimeout(() => inputRef.current?.focus(), 100); };
    window.addEventListener('open-copilot', handler);
    return () => window.removeEventListener('open-copilot', handler);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y)),
    });
  }, [isDragging]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  const onHeaderMouseDown = (e) => {
    if (e.target.closest('.copilot-icon-btn')) return;
    const rect = overlayRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
    e.preventDefault();
  };

  function sendMessage(text) {
    const q = text.trim();
    if (!q || typing) return;
    setMessages(m => [...m, { id: msgId.current++, role: 'user', text: q }]);
    setInput('');
    setTyping(true);
    const delay = 600 + Math.random() * 700;
    setTimeout(() => {
      const reply = buildResponse(q, candidates, departments, user);
      setMessages(m => [...m, { id: msgId.current++, role: 'ai', text: reply }]);
      setTyping(false);
    }, delay);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const userInitials = user?.avatar || 'HR';

  function renderText(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p.split('\n').map((line, j) => j === 0 ? line : [<br key={j} />, line])
    );
  }

  if (!isVisible) {
    return (
      <button className="copilot-reopen-btn" onClick={() => setIsVisible(true)}>
        <span style={{ fontSize: 16 }}>🤖</span>
        HR Copilot
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        className="copilot-pill"
        style={{ left: position.x, top: position.y }}
        onClick={() => setIsMinimized(false)}
      >
        <span className="copilot-pill-dot" />
        <span className="copilot-pill-label">HR Copilot</span>
      </button>
    );
  }

  return (
    <div
      ref={overlayRef}
      className={`copilot-overlay${isDragging ? ' dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div className="copilot-header" onMouseDown={onHeaderMouseDown}>
        <div className="copilot-header-left">
          <div className="copilot-avatar">🤖</div>
          <div className="copilot-title-wrap">
            <span className="copilot-title">HR Copilot</span>
            <span className="copilot-subtitle">Interview Intelligence</span>
          </div>
          <span className="copilot-status-dot" />
        </div>
        <div className="copilot-header-actions">
          <button className="copilot-icon-btn" title="Minimize" onClick={() => setIsMinimized(true)}>
            <MinusIcon />
          </button>
          <button className="copilot-icon-btn" title="Close" onClick={() => setIsVisible(false)}>
            <XIcon />
          </button>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="copilot-suggestions">
        {SUGGESTIONS.map(s => (
          <button key={s} className="copilot-chip" onClick={() => sendMessage(s)}>{s}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="copilot-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`msg-row ${msg.role}`}>
            <div className={`msg-avatar ${msg.role === 'ai' ? 'ai-avatar' : 'user-avatar'}`}>
              {msg.role === 'ai' ? '🤖' : userInitials}
            </div>
            <div className={`msg-bubble ${msg.role}`}>
              {renderText(msg.text)}
            </div>
          </div>
        ))}
        {typing && (
          <div className="msg-row ai">
            <div className="msg-avatar ai-avatar">🤖</div>
            <div className="msg-bubble ai" style={{ padding: '12px 14px' }}>
              <div className="typing-indicator" style={{ padding: 0 }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="copilot-input-area">
        <textarea
          ref={inputRef}
          className="copilot-input"
          placeholder="Ask about candidates, interviews, pipeline..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="copilot-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || typing}
          title="Send"
        >
          <SendIcon />
        </button>
      </div>

      {/* Footer */}
      <div className="copilot-footer">
        <p className="copilot-footer-text">AI support only · Final decisions stay with HR</p>
      </div>
    </div>
  );
}

function MinusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function SendIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
