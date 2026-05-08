/**
 * HR Interview Copilot – Chrome Extension Content Script
 * Injects a floating AI overlay into Google Meet pages.
 *
 * ── How to load and test ────────────────────────────────
 * 1. Open chrome://extensions in your browser.
 * 2. Toggle "Developer mode" ON (top-right switch).
 * 3. Click "Load unpacked".
 * 4. Select the `extension/` folder inside this repo.
 * 5. Open https://meet.google.com (join or start any meeting).
 * 6. The HR Copilot overlay should appear in the top-right corner.
 *
 * Phase 2 – microphone recording:
 * - Click "Start Listening" to begin recording the candidate's answer.
 * - Click "Stop & Analyze" to send the audio to the FastAPI backend.
 * - Results (transcript, insight, follow-up, red flag) populate in real time.
 * - Analysis data is preserved when you minimize and re-expand the overlay.
 *
 * Backend must be running at http://localhost:8000
 * ────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  // ── Element IDs ──────────────────────────────────────────────────────────────
  const ROOT_ID     = "hr-copilot-overlay-root";
  const PILL_ID     = "hr-copilot-pill";
  const REOPEN_ID   = "hr-copilot-reopen";
  const STORAGE_KEY = "hr-copilot-prefs";
  const API_URL     = "http://localhost:8000/api/sessions/demo-session-1/audio/analyze";

  // Guard: prevent duplicate injection on SPA navigation.
  if (document.getElementById(ROOT_ID) || document.getElementById(PILL_ID)) return;

  // ── Layout defaults ──────────────────────────────────────────────────────────
  const DEFAULTS = {
    x:       window.innerWidth - 384,
    y:       80,
    width:   360,
    height:  0,       // 0 = auto
    uiState: "open",  // "open" | "minimized" | "closed"
  };

  // ── Persistence (layout only) ────────────────────────────────────────────────
  function loadPrefs() {
    try {
      const p  = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const vx = Number(p.x), vy = Number(p.y);
      const vw = Number(p.width), vh = Number(p.height);
      return {
        x:       (isFinite(vx) && vx >= 0 && vx < window.innerWidth)  ? vx : DEFAULTS.x,
        y:       (isFinite(vy) && vy >= 0 && vy < window.innerHeight)  ? vy : DEFAULTS.y,
        width:   (isFinite(vw) && vw >= 300 && vw <= 600)              ? vw : DEFAULTS.width,
        height:  (isFinite(vh) && vh >= 260)                           ? vh : DEFAULTS.height,
        uiState: ["open","minimized","closed"].includes(p.uiState)     ? p.uiState : DEFAULTS.uiState,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function savePrefs(patch) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
    } catch {}
  }

  let prefs = loadPrefs();

  // ── Recording state (survives minimize/expand) ───────────────────────────────
  // status: "idle" | "listening" | "processing" | "ready" | "error"
  let recState = {
    status:     "idle",
    errorMsg:   null,
    transcript: null,
    analysis:   null,
  };

  let mediaStream   = null;
  let mediaRecorder = null;
  let audioChunks   = [];

  // ── Cleanup for global mouse listeners ──────────────────────────────────────
  let activeCleanup = null;
  function runCleanup() {
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  }

  // ── Utility: escape HTML to prevent XSS from API responses ──────────────────
  function esc(str) {
    const d = document.createElement("div");
    d.textContent = String(str || "");
    return d.innerHTML;
  }

  // ── Status helpers ───────────────────────────────────────────────────────────
  const STATUS_LABELS = {
    idle:       "Idle",
    listening:  "🔴 Listening...",
    processing: "⏳ Processing...",
    ready:      "✅ Analysis ready",
    error:      null, // filled from recState.errorMsg
  };

  const BADGE_LABELS = {
    idle:       "● Listening soon",
    listening:  "● Listening",
    processing: "⏳ Processing",
    ready:      "✅ Ready",
    error:      "⚠ Error",
  };

  function getStatusLabel() {
    if (recState.status === "error") return recState.errorMsg || "Error";
    return STATUS_LABELS[recState.status] || "Idle";
  }

  function getScoreClass(score) {
    if (score >= 70) return "good";
    if (score >= 40) return "average";
    return "poor";
  }

  // ── Build the AI insight HTML block from analysis object ────────────────────
  function buildInsightHTML(analysis) {
    const scoreClass   = getScoreClass(analysis.score);
    const missingItems = (analysis.what_was_missing || [])
      .map(m => `<li>${esc(m)}</li>`).join("");
    const expectedItems = (analysis.expected_answer_should_include || [])
      .map(e => `<li>${esc(e)}</li>`).join("");

    return `
      <div class="hrc-insight-box">
        <div class="hrc-score-row">
          <span class="hrc-score-badge hrc-score--${scoreClass}">
            ${esc(analysis.quality_rating)} &middot; ${analysis.score}/100
          </span>
        </div>
        ${analysis.summary ? `<p class="hrc-insight-summary">${esc(analysis.summary)}</p>` : ""}
        ${missingItems  ? `<p class="hrc-insight-sublabel">Missing</p><ul class="hrc-insight-list">${missingItems}</ul>`  : ""}
        ${expectedItems ? `<p class="hrc-insight-sublabel">Expected</p><ul class="hrc-insight-list">${expectedItems}</ul>` : ""}
      </div>
    `;
  }

  // ── Update overlay DOM to reflect current recState ─────────────────────────
  // Called after every status change and after results arrive.
  function syncOverlayDOM() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    const { status, transcript, analysis, errorMsg } = recState;

    // Header badge
    const badge = root.querySelector(".hrc-status-badge");
    if (badge) badge.textContent = BADGE_LABELS[status] || BADGE_LABELS.idle;

    // Status text
    const statusEl = root.querySelector("#hrc-status-text");
    if (statusEl) {
      statusEl.textContent  = getStatusLabel();
      statusEl.className    = `hrc-status-text hrc-status--${status}`;
    }

    // Button states
    const startBtn = root.querySelector("#hrc-start-btn");
    const stopBtn  = root.querySelector("#hrc-stop-btn");
    if (startBtn) startBtn.disabled = (status === "listening" || status === "processing");
    if (stopBtn)  stopBtn.disabled  = (status !== "listening");

    // Transcript
    const transcriptEl = root.querySelector("#hrc-transcript-content");
    if (transcriptEl) {
      transcriptEl.innerHTML = transcript
        ? `<span class="hrc-speaker">Candidate: </span>${esc(transcript)}`
        : `<span class="hrc-placeholder">Transcript will appear here after recording.</span>`;
    }

    // AI Insight
    const insightEl = root.querySelector("#hrc-insight-content");
    if (insightEl) {
      insightEl.innerHTML = analysis
        ? buildInsightHTML(analysis)
        : `<p class="hrc-insight-box hrc-placeholder">Analysis will appear here after processing.</p>`;
    }

    // Suggested follow-up
    const followupEl = root.querySelector("#hrc-followup-content");
    if (followupEl) {
      followupEl.innerHTML = analysis
        ? esc(analysis.suggested_follow_up_question)
        : `<span class="hrc-placeholder">Follow-up question will appear here.</span>`;
    }

    // Red flag
    const redflagEl = root.querySelector("#hrc-redflag-content");
    if (redflagEl) {
      if (analysis && analysis.red_flag && analysis.red_flag.is_red_flag) {
        redflagEl.innerHTML = `
          <span class="hrc-redflag-icon">⚑</span>
          <p class="hrc-redflag-text">${esc(analysis.red_flag.reason)}</p>
        `;
      } else {
        redflagEl.innerHTML = `
          <span class="hrc-redflag-icon" style="color:#9ca3af">—</span>
          <p class="hrc-redflag-text hrc-placeholder">No red flags detected yet.</p>
        `;
      }
    }
  }

  // ── Recording: start microphone ──────────────────────────────────────────────
  async function startListening() {
    try {
      mediaStream  = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks  = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      mediaRecorder  = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start(250); // collect a chunk every 250 ms

      recState.status   = "listening";
      recState.errorMsg = null;
      syncOverlayDOM();
    } catch (err) {
      recState.status   = "error";
      recState.errorMsg = err.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone in browser settings."
        : `Microphone error: ${err.message}`;
      syncOverlayDOM();
    }
  }

  // ── Recording: stop microphone ───────────────────────────────────────────────
  function stopListening() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop(); // triggers onstop → handleRecordingStop
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
  }

  // ── Recording: send audio to backend ────────────────────────────────────────
  async function handleRecordingStop() {
    recState.status = "processing";
    syncOverlayDOM();

    try {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const form = new FormData();
      form.append("file",     blob, "answer.webm");
      form.append("question", "Explain how you improved backend API performance.");
      form.append("topic",    "Backend API Performance");

      const resp = await fetch(API_URL, { method: "POST", body: form });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Server responded ${resp.status}${text ? ": " + text : ""}`);
      }

      const data = await resp.json();
      recState.transcript = data.transcript   || null;
      recState.analysis   = data.analysis     || null;
      recState.status     = "ready";
      recState.errorMsg   = null;
    } catch (err) {
      recState.status   = "error";
      recState.errorMsg = `Request failed: ${err.message}`;
    }

    syncOverlayDOM();
  }

  // ── Build overlay HTML ───────────────────────────────────────────────────────
  // Sections are pre-populated from recState so state is preserved on re-open.
  function buildOverlay() {
    const el = document.createElement("div");
    el.id = ROOT_ID;
    el.style.left  = prefs.x     + "px";
    el.style.top   = prefs.y     + "px";
    el.style.width = prefs.width + "px";
    if (prefs.height) el.style.height = prefs.height + "px";

    const s = recState;
    const startDisabled = (s.status === "listening" || s.status === "processing") ? "disabled" : "";
    const stopDisabled  = (s.status !== "listening") ? "disabled" : "";

    const transcriptHTML = s.transcript
      ? `<span class="hrc-speaker">Candidate: </span>${esc(s.transcript)}`
      : `<span class="hrc-placeholder">Transcript will appear here after recording.</span>`;

    const insightHTML = s.analysis
      ? buildInsightHTML(s.analysis)
      : `<p class="hrc-insight-box hrc-placeholder">Analysis will appear here after processing.</p>`;

    const followupHTML = s.analysis
      ? esc(s.analysis.suggested_follow_up_question)
      : `<span class="hrc-placeholder">Follow-up question will appear here.</span>`;

    const redflagHTML = (s.analysis && s.analysis.red_flag && s.analysis.red_flag.is_red_flag)
      ? `<span class="hrc-redflag-icon">⚑</span><p class="hrc-redflag-text">${esc(s.analysis.red_flag.reason)}</p>`
      : `<span class="hrc-redflag-icon" style="color:#9ca3af">—</span><p class="hrc-redflag-text hrc-placeholder">No red flags detected yet.</p>`;

    el.innerHTML = `
      <div id="hr-copilot-header">
        <div class="hrc-header-left">
          <span style="font-size:16px;flex-shrink:0;">🤖</span>
          <span class="hrc-title">HR Copilot</span>
          <span class="hrc-status-badge">${BADGE_LABELS[s.status] || BADGE_LABELS.idle}</span>
        </div>
        <div class="hrc-header-actions">
          <button class="hrc-icon-btn" id="hrc-minimize-btn" title="Minimize">&#8722;</button>
          <button class="hrc-icon-btn" id="hrc-close-btn"    title="Close">&#10005;</button>
        </div>
      </div>

      <div id="hr-copilot-body">

        <!-- Recording controls -->
        <div class="hrc-section hrc-recording-section">
          <div class="hrc-rec-controls">
            <button id="hrc-start-btn" class="hrc-rec-btn hrc-rec-btn--start" ${startDisabled}>
              🎙 Start Listening
            </button>
            <button id="hrc-stop-btn" class="hrc-rec-btn hrc-rec-btn--stop" ${stopDisabled}>
              ⏹ Stop &amp; Analyze
            </button>
          </div>
          <p id="hrc-status-text" class="hrc-status-text hrc-status--${s.status}">
            ${getStatusLabel()}
          </p>
        </div>

        <!-- Current Focus -->
        <div class="hrc-section">
          <p class="hrc-label">Current Focus</p>
          <span class="hrc-focus-chip">
            <span class="hrc-focus-dot"></span>Backend API Performance
          </span>
        </div>

        <!-- Live Transcript -->
        <div class="hrc-section">
          <p class="hrc-label">Live Transcript</p>
          <p id="hrc-transcript-content" class="hrc-transcript-box">${transcriptHTML}</p>
        </div>

        <!-- AI Insight -->
        <div class="hrc-section">
          <p class="hrc-label">AI Insight</p>
          <div id="hrc-insight-content">${insightHTML}</div>
        </div>

        <!-- Suggested Follow-up -->
        <div class="hrc-section">
          <p class="hrc-label">Suggested Follow-up</p>
          <p id="hrc-followup-content" class="hrc-followup-box">${followupHTML}</p>
        </div>

        <!-- Red Flag -->
        <div class="hrc-section">
          <p class="hrc-label">Red Flag</p>
          <div id="hrc-redflag-content" class="hrc-redflag-box">${redflagHTML}</div>
        </div>

      </div>

      <div id="hr-copilot-footer">
        <p class="hrc-footer-text">🛡️ AI support only. Final decision stays with HR.</p>
      </div>

      <div id="hr-copilot-resize-handle" title="Drag to resize"></div>
    `;

    return el;
  }

  // ── Build minimized pill ──────────────────────────────────────────────────────
  function buildPill() {
    const el = document.createElement("div");
    el.id = PILL_ID;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.style.left = prefs.x + "px";
    el.style.top  = prefs.y + "px";
    el.innerHTML  = `<span class="hrc-pill-dot"></span><span>HR Copilot</span>`;
    return el;
  }

  // ── Build "Open Copilot" reopen button ───────────────────────────────────────
  function buildReopenBtn() {
    const el = document.createElement("button");
    el.id = REOPEN_ID;
    el.innerHTML = `<span style="font-size:16px;">🤖</span><span>Open Copilot</span>`;
    return el;
  }

  // ── Generic drag utility ─────────────────────────────────────────────────────
  function makeDraggable(targetEl, handleEl, opts) {
    opts = opts || {};
    let dragging = false, moved = false;
    let startMX, startMY, startLeft, startTop;

    function onMouseDown(e) {
      if (opts.exclude && e.target.closest(opts.exclude)) return;
      dragging  = true;
      moved     = false;
      startMX   = e.clientX;
      startMY   = e.clientY;
      startLeft = parseFloat(targetEl.style.left) || 0;
      startTop  = parseFloat(targetEl.style.top)  || 0;
      targetEl.classList.add("hrc-dragging");
      e.preventDefault();
    }

    function onMouseMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startMX;
      const dy = e.clientY - startMY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      const elW = targetEl.offsetWidth  || 160;
      const elH = targetEl.offsetHeight || 40;
      const nx  = Math.max(0, Math.min(window.innerWidth  - elW, startLeft + dx));
      const ny  = Math.max(0, Math.min(window.innerHeight - elH, startTop  + dy));
      targetEl.style.left = nx + "px";
      targetEl.style.top  = ny + "px";
    }

    function onMouseUp() {
      if (!dragging) return;
      dragging = false;
      targetEl.classList.remove("hrc-dragging");
      const nx = parseFloat(targetEl.style.left) || 0;
      const ny = parseFloat(targetEl.style.top)  || 0;
      if (opts.onEnd) opts.onEnd(nx, ny, moved);
    }

    handleEl.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup",   onMouseUp);

    return function cleanup() {
      handleEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",   onMouseUp);
    };
  }

  // ── Resize utility ───────────────────────────────────────────────────────────
  function makeResizable(targetEl, handleEl) {
    const MIN_W = 300, MAX_W = 600, MIN_H = 260;
    let resizing = false;
    let startMX, startMY, startW, startH;

    function onMouseDown(e) {
      resizing = true;
      startMX  = e.clientX;
      startMY  = e.clientY;
      startW   = targetEl.offsetWidth;
      startH   = targetEl.offsetHeight;
      targetEl.classList.add("hrc-resizing");
      e.preventDefault();
      e.stopPropagation();
    }

    function onMouseMove(e) {
      if (!resizing) return;
      const nw = Math.max(MIN_W, Math.min(MAX_W, startW + (e.clientX - startMX)));
      const nh = Math.max(MIN_H, Math.min(window.innerHeight * 0.9, startH + (e.clientY - startMY)));
      targetEl.style.width  = nw + "px";
      targetEl.style.height = nh + "px";
    }

    function onMouseUp() {
      if (!resizing) return;
      resizing = false;
      targetEl.classList.remove("hrc-resizing");
      savePrefs({
        width:  Math.round(parseFloat(targetEl.style.width)  || MIN_W),
        height: Math.round(parseFloat(targetEl.style.height) || MIN_H),
      });
    }

    handleEl.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup",   onMouseUp);

    return function cleanup() {
      handleEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",   onMouseUp);
    };
  }

  // ── UI state: show full overlay ──────────────────────────────────────────────
  function showOverlay() {
    runCleanup();
    removePill();
    removeReopenBtn();
    prefs = loadPrefs();
    savePrefs({ uiState: "open" });

    const overlay    = buildOverlay();
    document.body.appendChild(overlay);

    const header     = overlay.querySelector("#hr-copilot-header");
    const resizeGrip = overlay.querySelector("#hr-copilot-resize-handle");

    const cleanDrag   = makeDraggable(overlay, header, {
      exclude: ".hrc-icon-btn, .hrc-rec-btn",
      onEnd(x, y) { prefs.x = x; prefs.y = y; savePrefs({ x, y }); },
    });
    const cleanResize = makeResizable(overlay, resizeGrip);

    activeCleanup = () => { cleanDrag(); cleanResize(); };

    // Wire recording buttons (fresh listeners on each build — no duplicates
    // because the element itself is newly created each time).
    overlay.querySelector("#hrc-start-btn").addEventListener("click", startListening);
    overlay.querySelector("#hrc-stop-btn").addEventListener("click", stopListening);
    overlay.querySelector("#hrc-minimize-btn").addEventListener("click", showPill);
    overlay.querySelector("#hrc-close-btn").addEventListener("click", showReopenBtn);
  }

  // ── UI state: minimized pill ─────────────────────────────────────────────────
  function showPill() {
    runCleanup();
    removeOverlay();
    removeReopenBtn();
    prefs = loadPrefs();
    savePrefs({ uiState: "minimized" });

    const pill = buildPill();
    document.body.appendChild(pill);

    activeCleanup = makeDraggable(pill, pill, {
      onEnd(x, y, didMove) {
        prefs.x = x; prefs.y = y;
        savePrefs({ x, y });
        if (!didMove) showOverlay();
      },
    });
  }

  // ── UI state: "Open Copilot" reopen button ───────────────────────────────────
  function showReopenBtn() {
    runCleanup();
    removeOverlay();
    removePill();
    savePrefs({ uiState: "closed" });

    const btn = buildReopenBtn();
    document.body.appendChild(btn);
    btn.addEventListener("click", showOverlay);
    activeCleanup = null;
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────────
  function removeOverlay()   { document.getElementById(ROOT_ID)?.remove(); }
  function removePill()      { document.getElementById(PILL_ID)?.remove(); }
  function removeReopenBtn() { document.getElementById(REOPEN_ID)?.remove(); }

  // ── Init: restore last saved UI state ────────────────────────────────────────
  if      (prefs.uiState === "minimized") showPill();
  else if (prefs.uiState === "closed")    showReopenBtn();
  else                                    showOverlay();
})();
