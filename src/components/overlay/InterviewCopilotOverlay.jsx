import { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import './InterviewCopilotOverlay.css';

const INIT_POS = { x: window.innerWidth - 444, y: 80 };
const DG_KEY_STORAGE = 'copilot_deepgram_key';  // Deepgram — audio transcription

const SUGGESTIONS = ['Pipeline summary', 'Interviews today', 'Who is shortlisted?', 'Hiring funnel', 'HR tips'];

const IS_OVERLAY_WINDOW = typeof window !== 'undefined' && !!window.overlayAPI;
const IS_ELECTRON = typeof window !== 'undefined' && (!!window.copilotAPI || !!window.overlayAPI);

// Deepgram transcription — POST raw audio bytes, no multipart needed
// Uses Electron IPC (main process) when in overlay window → no CORS issues
async function transcribeAudio(blob, dgKey) {
  const contentType = blob.type.split(';')[0]; // strip codec params
  if (IS_OVERLAY_WINDOW && window.overlayAPI?.transcribe) {
    const arrayBuf = await blob.arrayBuffer();
    return window.overlayAPI.transcribe(new Uint8Array(arrayBuf), contentType, dgKey);
  }
  // Web / dev-mode direct fetch
  const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en&diarize=true', {
    method: 'POST',
    headers: { Authorization: `Token ${dgKey}`, 'Content-Type': contentType },
    body: blob,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.err_msg || `Deepgram HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.results?.channels?.[0]?.alternatives?.[0]?.words || [];
}
// Stop a MediaRecorder and return a Blob using the recorder's actual MIME type
function stopRecorder(recorder, chunks) {
  const mimeType = recorder.mimeType || 'audio/webm';
  return new Promise(resolve => {
    recorder.addEventListener('stop', () => {
      resolve(new Blob(chunks, { type: mimeType }));
    }, { once: true });
    if (recorder.state !== 'inactive') recorder.stop();
    else resolve(new Blob(chunks, { type: mimeType }));
  });
}

// Get mic stream
async function getMicStream() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}
// Get speaker/system audio stream.
// In Electron overlay window: use desktopCapturer → getUserMedia (chromeMediaSource).
// Fallback: getDisplayMedia (shows a picker; user must enable "Share audio").
async function getSpeakerStream() {
  if (IS_OVERLAY_WINDOW && window.overlayAPI?.getDesktopSources) {
    // 1. Check permissions first (on macOS)
    if (window.overlayAPI.checkPermissions) {
      const { screen } = await window.overlayAPI.checkPermissions();
      if (screen === 'denied') {
        throw new Error('Screen recording permission denied. Please enable it in System Settings > Security & Privacy.');
      }
    }

    const sources = await window.overlayAPI.getDesktopSources();
    // Pick the first screen source (Entire Screen / Screen 1)
    const screenSource = sources.find(s =>
      /screen|display|entire/i.test(s.name)
    ) || sources[0];

    if (!screenSource) throw new Error('No screen source found for audio capture.');

    try {
      // Electron's chromeMediaSource approach — captures system audio on the screen
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSource.id,
          },
        },
        // We MUST request video to get audio from desktop sources in many Electron versions
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSource.id,
            maxWidth: 1,
            maxHeight: 1,
          },
        },
      });
      // Discard video immediately — we only need audio
      stream.getVideoTracks().forEach(t => t.stop());
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('System audio capture failed. Ensure "Share audio" is enabled if a picker appeared.');
      }
      return new MediaStream(audioTracks);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        throw new Error('Permission denied by system. Please grant "Screen Recording" access to this app in System Settings.');
      }
      throw err;
    }
  }

  // Web fallback: show screen picker with audio option
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: { width: 1, height: 1 },
    });
    stream.getVideoTracks().forEach(t => t.stop());
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      stream.getTracks().forEach(t => t.stop());
      throw new Error('No audio shared. You must tick "Share audio" in the screen picker.');
    }
    return new MediaStream(audioTracks);
  } catch (err) {
    if (err.name === 'NotAllowedError') throw new Error('Capture cancelled or permission denied.');
    throw err;
  }
}




export default function InterviewCopilotOverlay({ overlayWindowMode = false }) {
  const { user } = useAuth();

  const [isVisible, setIsVisible] = useState(overlayWindowMode || IS_OVERLAY_WINDOW);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pos, setPos] = useState(INIT_POS);
  const [isDragging, setIsDragging] = useState(false);

  const [dgKey, setDgKey] = useState(() => localStorage.getItem(DG_KEY_STORAGE) || '');
  const [dgInput, setDgInput] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [shortcuts, setShortcuts] = useState(null);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your **HR Copilot**. Ask me anything — or tap the mic to speak.' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isRecordingSys, setIsRecordingSys] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('hr_copilot_active_session_id'));

  // Keep a ref to latest messages so async callbacks don't use stale closure
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleMessage = (data) => {
      // Assuming backend replies with type: 'chat_reply' or something similar
      if (data.type === 'chat_reply' || data.reply) {
        const replyContent = data.reply || data.content || '*(No content received)*';
        setMessages(h => [...h, { role: 'assistant', content: replyContent }]);
        setTyping(false);
      }
      // Capture sessionId if backend sends it
      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem('hr_copilot_active_session_id', data.session_id);
      }
      if (data.type === 'analyze_jd_cv' && data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem('hr_copilot_active_session_id', data.session_id);
      }
    };
    addMessageHandler(handleMessage);
    return () => removeMessageHandler(handleMessage);
  }, [addMessageHandler, removeMessageHandler]);

  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const micRecorderRef = useRef(null);
  const sysRecorderRef = useRef(null);
  const micChunks = useRef([]);
  const sysChunks = useRef([]);
  const activeStreams = useRef([]);

  // Web mode: listen for open-copilot event
  useEffect(() => {
    if (IS_OVERLAY_WINDOW) return;
    const h = () => {
      setIsVisible(true);
      setIsMinimized(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener('open-copilot', h);
    return () => window.removeEventListener('open-copilot', h);
  }, []);

  // Electron overlay window: receive shortcut info
  useEffect(() => {
    if (IS_OVERLAY_WINDOW) window.overlayAPI?.onShortcutsInfo?.((d) => setShortcuts(d));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  // ── Dragging ────────────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 420, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y)),
    });
  }, [isDragging]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  const onHeaderMouseDown = (e) => {
    if (e.target.closest('.cly-icon-btn')) return;
    const rect = overlayRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
    e.preventDefault();
  };

  // Click-through: disable when hovering card, restore on leave
  const onCardMouseEnter = () => { if (IS_OVERLAY_WINDOW) window.overlayAPI.setClickThrough(false); };
  const onCardMouseLeave = () => { if (IS_OVERLAY_WINDOW) window.overlayAPI.setClickThrough(true); };

  function hideOverlay() {
    if (IS_OVERLAY_WINDOW) window.overlayAPI.hide();
    else setIsVisible(false);
  }

  // ── Send message (uses messagesRef to avoid stale closure) ──
  async function sendMessage(text) {
    const q = (text || '').trim();
    if (!q || typing) return;

    const newHistory = [...messagesRef.current, { role: 'user', content: q }];
    setMessages(newHistory);
    setInput('');
    setTyping(true);

    try {
      // Real backend integration
      const sent = wsSendMessage({
        type: 'chat',
        content: q,
        session_id: sessionId,
        history: messagesRef.current.slice(-10) // Send recent context
      });
      if (!sent) {
        throw new Error('WebSocket not connected');
      }
      // Reply will come through the message handler
    } catch (err) {
      setMessages(h => [...h, { role: 'assistant', content: `Error: ${err.message}` }]);
    }
    setTyping(false);
  }

  // ── Shared: stop recorder → transcribe → auto-send ──────────
  async function stopAndSend(recorderRef, chunksRef, setRecording, isMic) {
    if (!recorderRef.current) return;
    setRecording(false);
    setTranscribing(true);
    try {
      const streamToStop = recorderRef.current.stream;
      const blob = await stopRecorder(recorderRef.current, chunksRef.current);
      if (streamToStop) streamToStop.getTracks().forEach(t => t.stop());

      chunksRef.current = [];
      recorderRef.current = null;

      if (blob && blob.size > 500) {
        const words = await transcribeAudio(blob, dgKey);

        let newMsgs = [];
        if (Array.isArray(words) && words.length > 0) {
          if (isMic) {
            // Group words by speaker
            let currentSpeaker = words[0].speaker;
            let currentText = [];

            const getSpeakerLabel = (spk) => spk === 0 ? 'Speaker A' : 'Speaker B';

            words.forEach(w => {
              if (w.speaker !== currentSpeaker) {
                newMsgs.push({
                  role: 'user',
                  content: `**${getSpeakerLabel(currentSpeaker)}:** ${currentText.join(' ')}`
                });
                currentSpeaker = w.speaker;
                currentText = [];
              }
              currentText.push(w.punctuated_word || w.word);
            });

            if (currentText.length > 0) {
              newMsgs.push({
                role: 'user',
                content: `**${getSpeakerLabel(currentSpeaker)}:** ${currentText.join(' ')}`
              });
            }
          } else {
            const sysText = words.map(w => w.punctuated_word || w.word).join(' ');
            newMsgs.push({ role: 'user', content: `**Speaker:** ${sysText}` });
          }
        } else if (typeof words === 'string' && words.trim().length > 0) {
          // Fallback if main.cjs hasn't been restarted and returned a string
          newMsgs.push({ role: 'user', content: `**${isMic ? 'You (Mic)' : 'Speaker'}:** ${words}` });
        }

        if (newMsgs.length > 0) {
          setMessages(h => [...h, ...newMsgs]);

          setTyping(true);
          await new Promise(r => setTimeout(r, 800)); // Simulate latency
          const reply = '*(Backend integration pending...)*';
          setMessages(h => [...h, { role: 'assistant', content: reply }]);
          setTyping(false);
        }
      }
    } catch (err) {
      setMessages(h => [...h, { role: 'assistant', content: `Audio error: ${err.message}` }]);
      setTyping(false);
    }
    setTranscribing(false);
  }

  // ── Recording Toggles ────────────────────────
  async function toggleMicRecording() {
    if (isRecordingMic) {
      await stopAndSend(micRecorderRef, micChunks, setIsRecordingMic, true);
      return;
    }
    if (!dgKey) { setShowSetup(true); return; }

    try {
      // 1. Check/Request permission on macOS
      if (IS_OVERLAY_WINDOW && window.overlayAPI?.requestMicAccess) {
        const granted = await window.overlayAPI.requestMicAccess();
        if (!granted) throw new Error('Microphone access denied by system.');
      }

      const micStream = await getMicStream();
      activeStreams.current.push(micStream);
      micChunks.current = [];

      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(micStream, { mimeType });
      micRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) micChunks.current.push(e.data); };
      mr.start(250);
      setIsRecordingMic(true);
    } catch (err) {
      setMessages(h => [...h, { role: 'assistant', content: `Mic error: ${err.message}` }]);
    }
  }

  async function toggleSysRecording() {
    if (isRecordingSys) {
      await stopAndSend(sysRecorderRef, sysChunks, setIsRecordingSys, false);
      return;
    }
    if (!dgKey) { setShowSetup(true); return; }

    try {
      const sysStream = await getSpeakerStream();
      activeStreams.current.push(sysStream);
      sysChunks.current = [];

      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(sysStream, { mimeType });
      sysRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) sysChunks.current.push(e.data); };
      mr.start(250);
      setIsRecordingSys(true);
    } catch (err) {
      setMessages(h => [...h, { role: 'assistant', content: `Speaker error: ${err.message}` }]);
    }
  }

  function saveKeys() {
    const dg = dgInput.trim();
    if (dg) { localStorage.setItem(DG_KEY_STORAGE, dg); setDgKey(dg); }
    if (dg) { setShowSetup(false); setDgInput(''); }
  }

  function renderText(text) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p.split('\n').reduce(
          (acc, line, j) => j === 0 ? [...acc, line] : [...acc, <br key={j} />, line],
          []
        )
    );
  }

  const userInitials = user?.avatar || 'HR';
  const isRecording = isRecordingMic || isRecordingSys;
  const recording = isRecording;

  if (!IS_OVERLAY_WINDOW && !isVisible) {
    return (
      <button className="copilot-reopen-btn" onClick={() => setIsVisible(true)}>
        <span style={{ fontSize: 14 }}>🤖</span> HR Copilot
      </button>
    );
  }

  if (!IS_OVERLAY_WINDOW && isMinimized) {
    return (
      <button
        className="copilot-pill"
        style={{ left: pos.x, top: pos.y }}
        onClick={() => setIsMinimized(false)}
      >
        <span className="copilot-pill-dot" />
        <span className="copilot-pill-label">HR Copilot</span>
      </button>
    );
  }

  const statusText = isRecording
    ? 'Recording… click to stop & send'
    : transcribing
      ? 'Transcribing & sending…'
      : 'Ready';

  return (
    <div
      ref={overlayRef}
      className={`copilot-overlay${isDragging ? ' dragging' : ''}`}
      style={IS_OVERLAY_WINDOW ? {} : { left: pos.x, top: pos.y }}
      onMouseEnter={onCardMouseEnter}
      onMouseLeave={onCardMouseLeave}
    >
      {/* Header */}
      <div className="cly-header" onMouseDown={onHeaderMouseDown}>
        <div className="cly-logo">🤖</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="cly-header-title">HR Copilot</span>
            {IS_ELECTRON && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                background: 'rgba(99,102,241,0.25)', color: '#818cf8', letterSpacing: '0.4px',
              }}>
                {IS_OVERLAY_WINDOW ? 'OVERLAY' : 'ELECTRON'}
              </span>
            )}
          </div>
          <span className="cly-status">
            <span className={`cly-dot${isRecording ? ' recording' : ''}`} />
            {statusText}
          </span>
        </div>
        <div className="cly-header-actions">
          <button className="cly-icon-btn" title="Keyboard shortcuts" onClick={() => setShowKeys(k => !k)}>
            <KeyIcon />
          </button>
          {!IS_OVERLAY_WINDOW && (
            <button className="cly-icon-btn" title="Minimize" onClick={() => setIsMinimized(true)}>
              <MinusIcon />
            </button>
          )}
          <button
            className="cly-icon-btn"
            title="Close"
            onClick={hideOverlay}
            style={{ color: 'rgba(239,68,68,0.45)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.45)'}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts panel */}
      {showKeys && (
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2,
          }}>
            {IS_ELECTRON ? 'Global Shortcuts' : 'Shortcuts'}
          </div>
          {IS_ELECTRON ? [
            ['Toggle overlay', shortcuts?.toggle || 'Ctrl+Shift+H'],
            ['Move window', shortcuts?.move || 'Ctrl + Arrow Keys'],
            ['Opacity +/-', shortcuts?.opacity || 'Ctrl+] / Ctrl+['],
            ['Quit', 'Ctrl+Shift+Q'],
          ].map(([label, key]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              <kbd style={{
                fontSize: 10, fontFamily: 'monospace',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 5, padding: '2px 7px', color: 'rgba(255,255,255,0.65)',
              }}>{key}</kbd>
            </div>
          )) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              Run <kbd style={{
                fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)',
                padding: '1px 5px', borderRadius: 4, fontSize: 10,
              }}>npm run electron:dev</kbd> for global shortcuts
            </span>
          )}
        </div>
      )}

      {/* API Key Setup */}
      {showSetup ? (
        <div className="cly-setup">
          <div className="cly-setup-icon">🔑</div>
          <div className="cly-setup-title">API Keys</div>
          <div className="cly-setup-sub">
            <strong style={{ color: '#6ee7b7' }}>Deepgram</strong> for voice → text
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deepgram key {dgKey && <span style={{ color: '#6ee7b7' }}>✓ set</span>}
            </label>
            <input
              className="cly-setup-input"
              placeholder="paste Deepgram API key..."
              type="password"
              value={dgInput}
              onChange={e => setDgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKeys()}
              autoFocus
            />
          </div>

          <button className="cly-setup-btn" onClick={saveKeys}>Save Key</button>
          {dgKey && (
            <button
              onClick={() => setShowSetup(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Suggestion chips */}
          <div className="cly-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="cly-chip" onClick={() => sendMessage(s)}>{s}</button>
            ))}
          </div>

          {/* Messages */}
          <div className="cly-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`cly-msg-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <div className={`cly-msg-av ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  {msg.role === 'user' ? userInitials : '🤖'}
                </div>
                <div className={`cly-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  {renderText(msg.content)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="cly-msg-row ai">
                <div className="cly-msg-av ai">🤖</div>
                <div className="cly-bubble ai">
                  <div className="cly-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>



          {/* Input row */}
          <div className="cly-input-row">
            <textarea
              ref={inputRef}
              className="cly-textarea"
              placeholder={
                transcribing
                  ? 'Transcribing & sending…'
                  : isRecording
                    ? 'Listening… click button to stop & send'
                    : 'Ask anything — or record audio to auto-send'
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              }}
              rows={1}
              disabled={transcribing}
            />

            {/* Mic button */}
            <button
              className={`cly-mic-btn${isRecordingMic ? ' active' : ''}`}
              onClick={toggleMicRecording}
              title={isRecordingMic ? 'Stop Mic' : 'Record Mic'}
              disabled={!dgKey || transcribing}
            >
              <MicIcon recording={isRecordingMic} />
            </button>

            {/* Speaker button */}
            <button
              className={`cly-mic-btn${isRecordingSys ? ' active' : ''}`}
              onClick={toggleSysRecording}
              title={isRecordingSys ? 'Stop Speaker' : 'Record Speaker'}
              disabled={!dgKey || transcribing}
            >
              <SpeakerIcon recording={isRecordingSys} />
            </button>

            <button
              className="cly-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || typing}
              title="Send"
            >
              <SendIcon />
            </button>
          </div>

          {/* Footer */}
          <div className="cly-footer">
            <span className="cly-footer-text">Deepgram · Backend pending · stop = auto-send</span>
            <button className="cly-footer-key" onClick={() => setShowSetup(true)}>
              {dgKey ? '🔑 Key set' : '⚠ Add API key'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────

// Pick a supported audio MIME type — Whisper accepts webm/ogg/mp4
function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

// ── Icons ─────────────────────────────────────────────────────
function KeyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function MicIcon({ recording }) {
  return recording
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
    : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
}
function SpeakerIcon({ recording }) {
  return recording
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
    : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );
}

