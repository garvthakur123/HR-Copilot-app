import React, { useState, useRef, useEffect, useCallback } from 'react';
import './InterviewCopilotOverlay.css';

const INITIAL_POSITION = { x: window.innerWidth - 384, y: 80 };

const PLACEHOLDER = {
  focus: 'Backend API Performance',
  transcript:
    'I optimized the APIs and improved the backend logic to make them faster.',
  insight:
    'This answer sounds generic. The candidate has not mentioned specific metrics, bottlenecks, caching, database optimization, or before/after impact.',
  followUp:
    'Can you describe one specific slow API, what caused the latency, and what exact change improved it?',
  redFlag: 'Vague claim without technical evidence.',
};

export default function InterviewCopilotOverlay() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(INITIAL_POSITION);
  const [isDragging, setIsDragging] = useState(false);

  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef(null);

  const onMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y)),
      });
    },
    [isDragging]
  );

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  if (!isVisible) {
    return (
      <button className="copilot-reopen-btn" onClick={() => setIsVisible(true)}>
        <span className="copilot-reopen-icon">🤖</span>
        Open Copilot
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
          <span className="copilot-icon">🤖</span>
          <span className="copilot-title">HR Copilot</span>
          <span className="copilot-status-badge">● Listening soon</span>
        </div>
        <div className="copilot-header-actions">
          <button
            className="copilot-icon-btn"
            title="Minimize"
            onClick={() => setIsMinimized(true)}
          >
            &#8722;
          </button>
          <button
            className="copilot-icon-btn"
            title="Close"
            onClick={() => setIsVisible(false)}
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="copilot-body">
        {/* Current Focus */}
        <div className="copilot-section">
          <div className="copilot-section-label">Current Focus</div>
          <span className="copilot-focus-chip">
            <span className="copilot-focus-dot" />
            {PLACEHOLDER.focus}
          </span>
        </div>

        {/* Live Transcript */}
        <div className="copilot-section">
          <div className="copilot-section-label">Live Transcript</div>
          <div className="copilot-transcript-box">
            <span className="copilot-transcript-speaker">Candidate: </span>
            {PLACEHOLDER.transcript}
          </div>
        </div>

        {/* AI Insight */}
        <div className="copilot-section">
          <div className="copilot-section-label">AI Insight</div>
          <div className="copilot-insight-box">{PLACEHOLDER.insight}</div>
        </div>

        {/* Suggested Follow-up */}
        <div className="copilot-section">
          <div className="copilot-section-label">Suggested Follow-up</div>
          <div className="copilot-followup-box">{PLACEHOLDER.followUp}</div>
        </div>

        {/* Red Flag */}
        <div className="copilot-section">
          <div className="copilot-section-label">Red Flag</div>
          <div className="copilot-redflag-box">
            <span className="copilot-redflag-icon">⚑</span>
            <span className="copilot-redflag-text">{PLACEHOLDER.redFlag}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="copilot-footer">
        <p className="copilot-footer-text">
          🛡️ AI support only. Final decision stays with HR.
        </p>
      </div>
    </div>
  );
}
