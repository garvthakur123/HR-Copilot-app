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
 * To reload after editing: click the refresh icon on the
 * extension card in chrome://extensions, then refresh Meet.
 * ────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  const ROOT_ID = "hr-copilot-overlay-root";
  const PILL_ID = "hr-copilot-pill";
  const REOPEN_ID = "hr-copilot-reopen";

  // Guard against duplicate injection (e.g. SPA navigation events).
  if (document.getElementById(ROOT_ID)) return;

  // ── Initial position (top-right, with some breathing room) ──
  const INITIAL_X = window.innerWidth - 384;
  const INITIAL_Y = 80;

  // ── State ─────────────────────────────────────────────────
  let posX = INITIAL_X;
  let posY = INITIAL_Y;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // ── Build overlay HTML ─────────────────────────────────────
  function buildOverlay() {
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.left = posX + "px";
    root.style.top = posY + "px";

    root.innerHTML = `
      <!-- Header (drag handle) -->
      <div id="hr-copilot-header">
        <div class="hrc-header-left">
          <span style="font-size:16px;flex-shrink:0;">🤖</span>
          <span class="hrc-title">HR Copilot</span>
          <span class="hrc-status-badge">● Listening soon</span>
        </div>
        <div class="hrc-header-actions">
          <button class="hrc-icon-btn" id="hrc-minimize-btn" title="Minimize">&#8722;</button>
          <button class="hrc-icon-btn" id="hrc-close-btn"    title="Close">&#10005;</button>
        </div>
      </div>

      <!-- Scrollable body -->
      <div id="hr-copilot-body">

        <!-- Current Focus -->
        <div class="hrc-section">
          <p class="hrc-label">Current Focus</p>
          <span class="hrc-focus-chip">
            <span class="hrc-focus-dot"></span>
            Backend API Performance
          </span>
        </div>

        <!-- Live Transcript -->
        <div class="hrc-section">
          <p class="hrc-label">Live Transcript</p>
          <p class="hrc-transcript-box">
            <span class="hrc-speaker">Candidate: </span>
            I optimized the APIs and improved the backend logic to make them faster.
          </p>
        </div>

        <!-- AI Insight -->
        <div class="hrc-section">
          <p class="hrc-label">AI Insight</p>
          <p class="hrc-insight-box">
            This answer sounds generic. The candidate has not mentioned specific
            metrics, bottlenecks, caching, database optimization, or before/after impact.
          </p>
        </div>

        <!-- Suggested Follow-up -->
        <div class="hrc-section">
          <p class="hrc-label">Suggested Follow-up</p>
          <p class="hrc-followup-box">
            Can you describe one specific slow API, what caused the latency,
            and what exact change improved it?
          </p>
        </div>

        <!-- Red Flag -->
        <div class="hrc-section">
          <p class="hrc-label">Red Flag</p>
          <div class="hrc-redflag-box">
            <span class="hrc-redflag-icon">⚑</span>
            <p class="hrc-redflag-text">Vague claim without technical evidence.</p>
          </div>
        </div>

      </div><!-- /body -->

      <!-- Footer -->
      <div id="hr-copilot-footer">
        <p class="hrc-footer-text">🛡️ AI support only. Final decision stays with HR.</p>
      </div>
    `;

    return root;
  }

  // ── Build minimized pill ───────────────────────────────────
  function buildPill() {
    const pill = document.createElement("button");
    pill.id = PILL_ID;
    pill.style.left = posX + "px";
    pill.style.top = posY + "px";
    pill.innerHTML = `<span class="hrc-pill-dot"></span><span>HR Copilot</span>`;
    return pill;
  }

  // ── Build "Open Copilot" reopen button ─────────────────────
  function buildReopenBtn() {
    const btn = document.createElement("button");
    btn.id = REOPEN_ID;
    btn.innerHTML = `<span style="font-size:16px;">🤖</span><span>Open Copilot</span>`;
    return btn;
  }

  // ── Dragging ───────────────────────────────────────────────
  function attachDrag(overlayEl) {
    const header = overlayEl.querySelector("#hr-copilot-header");

    header.addEventListener("mousedown", (e) => {
      // Don't drag when clicking the action buttons.
      if (e.target.closest(".hrc-icon-btn")) return;

      isDragging = true;
      const rect = overlayEl.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      overlayEl.classList.add("hrc-dragging");
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      posX = Math.max(0, Math.min(window.innerWidth  - 360, e.clientX - dragOffsetX));
      posY = Math.max(0, Math.min(window.innerHeight -  80, e.clientY - dragOffsetY));
      overlayEl.style.left = posX + "px";
      overlayEl.style.top  = posY + "px";
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      overlayEl.classList.remove("hrc-dragging");
    });
  }

  // ── Show full overlay ──────────────────────────────────────
  function showOverlay() {
    removePill();
    removeReopenBtn();

    const overlay = buildOverlay();
    document.body.appendChild(overlay);
    attachDrag(overlay);

    overlay.querySelector("#hrc-minimize-btn").addEventListener("click", showPill);
    overlay.querySelector("#hrc-close-btn").addEventListener("click", showReopenBtn);
  }

  // ── Show minimized pill ────────────────────────────────────
  function showPill() {
    removeOverlay();
    const pill = buildPill();
    document.body.appendChild(pill);
    pill.addEventListener("click", showOverlay);
  }

  // ── Show reopen button ─────────────────────────────────────
  function showReopenBtn() {
    removeOverlay();
    const btn = buildReopenBtn();
    document.body.appendChild(btn);
    btn.addEventListener("click", showOverlay);
  }

  // ── Helpers ────────────────────────────────────────────────
  function removeOverlay()  { document.getElementById(ROOT_ID)?.remove(); }
  function removePill()     { document.getElementById(PILL_ID)?.remove(); }
  function removeReopenBtn(){ document.getElementById(REOPEN_ID)?.remove(); }

  // ── Init ───────────────────────────────────────────────────
  showOverlay();
})();
