<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Orthodox Metrics, LLC — Welcome</title>
  <style>
    :root{
      --bg0:#070A12;
      --bg1:#0B1020;
      --card:#0E1630;
      --stroke:rgba(255,255,255,.14);
      --muted:rgba(255,255,255,.72);
      --text:rgba(255,255,255,.92);
      --accent:#8B5CF6;  /* purple */
      --accent2:#F59E0B; /* gold */
      --shadow: 0 20px 60px rgba(0,0,0,.55);
      --shadow2: 0 10px 25px rgba(0,0,0,.35);
      --radius: 18px;
    }

    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
      color:var(--text);
      background:
        radial-gradient(1200px 700px at 20% 15%, rgba(139,92,246,.22), transparent 55%),
        radial-gradient(900px 550px at 80% 35%, rgba(245,158,11,.18), transparent 60%),
        linear-gradient(180deg, var(--bg0), var(--bg1));
      overflow-x:hidden;
    }

    .shell{
      min-height:100%;
      display:grid;
      place-items:center;
      padding:40px 18px;
    }

    .app-frame{
      width:min(980px, 100%);
      border:1px solid var(--stroke);
      background: rgba(14,22,48,.6);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      box-shadow: var(--shadow);
      overflow:hidden;
      position:relative;
    }

    .topbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:18px 20px;
      border-bottom:1px solid var(--stroke);
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
    }

    .brand{
      display:flex;
      gap:12px;
      align-items:center;
    }

    .mark{
      width:34px;height:34px;border-radius:12px;
      background:
        radial-gradient(14px 14px at 30% 30%, rgba(255,255,255,.35), transparent 65%),
        linear-gradient(135deg, rgba(139,92,246,.95), rgba(245,158,11,.9));
      box-shadow: 0 10px 25px rgba(139,92,246,.18);
      border:1px solid rgba(255,255,255,.18);
    }

    .brand h1{
      font-size:14px;
      letter-spacing:.35px;
      margin:0;
      font-weight:650;
    }
    .brand p{
      margin:2px 0 0;
      font-size:12px;
      color:var(--muted);
    }

    .actions{
      display:flex;
      gap:10px;
      align-items:center;
    }

    .ghost{
      border:1px solid var(--stroke);
      background: rgba(255,255,255,.04);
      color:var(--text);
      padding:10px 12px;
      border-radius: 14px;
      cursor:pointer;
      font-weight:600;
      font-size:12px;
      transition: transform .12s ease, background .12s ease, border-color .12s ease;
    }
    .ghost:hover{transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.22)}
    .ghost:active{transform: translateY(0px) scale(.99)}

    .content{
      padding:34px 22px 30px;
      display:grid;
      gap:22px;
    }

    .hero{
      display:grid;
      gap:10px;
      padding:22px;
      border:1px solid var(--stroke);
      border-radius: var(--radius);
      background: rgba(8,12,26,.55);
      box-shadow: var(--shadow2);
    }

    .hero h2{
      margin:0;
      font-size:22px;
      font-weight:750;
      letter-spacing:.2px;
    }

    .hero p{
      margin:0;
      color:var(--muted);
      line-height:1.5;
      font-size:14px;
      max-width: 78ch;
    }

    .hint{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      align-items:center;
      margin-top:8px;
    }

    .pill{
      display:inline-flex;
      gap:8px;
      align-items:center;
      padding:8px 10px;
      border:1px solid rgba(255,255,255,.14);
      border-radius: 999px;
      background: rgba(255,255,255,.03);
      font-size:12px;
      color:var(--muted);
    }
    .dot{
      width:8px;height:8px;border-radius:999px;
      background: rgba(139,92,246,.95);
      box-shadow: 0 0 0 4px rgba(139,92,246,.18);
    }

    /* Modal */
    .overlay{
      position:fixed;
      inset:0;
      background: rgba(0,0,0,.55);
      display:none;
      place-items:center;
      padding:22px;
      z-index:50;
    }
    .overlay[data-open="true"]{display:grid}

    .modal{
      width:min(720px, 100%);
      border:1px solid var(--stroke);
      background: linear-gradient(180deg, rgba(14,22,48,.92), rgba(12,18,40,.92));
      border-radius: 22px;
      box-shadow: var(--shadow);
      overflow:hidden;
      position:relative;
      transform: translateY(10px);
      opacity:0;
      transition: transform .18s ease, opacity .18s ease;
    }
    .overlay[data-open="true"] .modal{
      transform: translateY(0px);
      opacity:1;
    }

    .modal-header{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:14px;
      padding:18px 18px 12px;
      border-bottom:1px solid rgba(255,255,255,.12);
    }

    .modal-title{
      display:grid;
      gap:6px;
    }
    .modal-title h3{
      margin:0;
      font-size:18px;
      font-weight:800;
      letter-spacing:.2px;
    }
    .modal-title p{
      margin:0;
      font-size:13px;
      color:var(--muted);
      line-height:1.45;
    }

    .close{
      border:1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.04);
      color:var(--text);
      border-radius: 12px;
      padding:10px 12px;
      cursor:pointer;
      font-weight:700;
      font-size:12px;
    }

    .modal-body{
      padding:18px;
      display:grid;
      gap:14px;
    }

    .balloons{
      display:grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap:12px;
    }

    @media (max-width: 720px){
      .balloons{grid-template-columns: 1fr}
    }

    .balloon{
      position:relative;
      border:1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.03);
      border-radius: 18px;
      padding:16px 14px;
      cursor:pointer;
      text-align:left;
      transition: transform .14s ease, border-color .14s ease, background .14s ease;
      outline:none;
      min-height: 92px;
    }
    .balloon:hover{
      transform: translateY(-2px);
      border-color: rgba(255,255,255,.22);
      background: rgba(255,255,255,.05);
    }
    .balloon:active{transform: translateY(0px) scale(.995)}
    .balloon:focus-visible{
      box-shadow: 0 0 0 4px rgba(139,92,246,.25);
      border-color: rgba(139,92,246,.55);
    }

    .balloon::before{
      content:"";
      position:absolute;
      inset:0;
      border-radius:18px;
      pointer-events:none;
      background: radial-gradient(500px 120px at 20% 0%, rgba(139,92,246,.22), transparent 55%),
                  radial-gradient(500px 120px at 80% 10%, rgba(245,158,11,.18), transparent 60%);
      opacity:.75;
      mix-blend-mode: screen;
    }

    .balloon .kicker{
      font-size:11px;
      letter-spacing:.35px;
      text-transform:uppercase;
      color:rgba(255,255,255,.68);
      margin:0 0 6px;
      position:relative;
      z-index:1;
      display:flex;
      align-items:center;
      gap:8px;
    }

    .badge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:22px;height:22px;
      border-radius: 9px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(255,255,255,.04);
      font-weight:800;
      font-size:12px;
      color:rgba(255,255,255,.88);
    }

    .balloon h4{
      margin:0 0 6px;
      font-size:15px;
      font-weight:800;
      position:relative;
      z-index:1;
    }
    .balloon p{
      margin:0;
      font-size:13px;
      color:var(--muted);
      line-height:1.45;
      position:relative;
      z-index:1;
    }

    .modal-footer{
      padding:14px 18px 18px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
    }

    .tiny{
      font-size:12px;
      color:var(--muted);
    }

    .primary{
      border:1px solid rgba(255,255,255,.12);
      background: linear-gradient(135deg, rgba(139,92,246,.95), rgba(245,158,11,.82));
      color: rgba(10,10,10,.92);
      padding:10px 14px;
      border-radius: 14px;
      cursor:pointer;
      font-weight:900;
      letter-spacing:.1px;
      transition: transform .12s ease, filter .12s ease;
    }
    .primary:hover{transform: translateY(-1px); filter: brightness(1.05)}
    .primary:active{transform: translateY(0px) scale(.99)}

    /* Toast */
    .toast{
      position:fixed;
      left:50%;
      bottom:22px;
      transform: translateX(-50%) translateY(16px);
      width:min(680px, calc(100% - 36px));
      border:1px solid rgba(255,255,255,.14);
      background: rgba(14,22,48,.92);
      border-radius: 16px;
      box-shadow: var(--shadow2);
      padding:12px 14px;
      display:flex;
      gap:12px;
      align-items:flex-start;
      opacity:0;
      pointer-events:none;
      transition: opacity .18s ease, transform .18s ease;
      z-index:60;
    }
    .toast[data-show="true"]{
      opacity:1;
      transform: translateX(-50%) translateY(0px);
    }
    .toast .icon{
      width:28px;height:28px;border-radius: 12px;
      background: rgba(139,92,246,.22);
      border:1px solid rgba(139,92,246,.35);
      display:grid; place-items:center;
      font-weight:900;
    }
    .toast h5{
      margin:0;
      font-size:13px;
      font-weight:850;
    }
    .toast p{
      margin:2px 0 0;
      font-size:12px;
      color:var(--muted);
      line-height:1.4;
    }
  </style>
</head>

<body>
  <div class="shell">
    <div class="app-frame" role="application" aria-label="Orthodox Metrics Welcome">
      <div class="topbar">
        <div class="brand">
          <div class="mark" aria-hidden="true"></div>
          <div>
            <h1>Orthodox Metrics, LLC</h1>
            <p>Records, workflows, and analytics — built for parishes.</p>
          </div>
        </div>
        <div class="actions">
          <button class="ghost" id="openWelcomeBtn" type="button">Open Welcome</button>
          <button class="ghost" id="toggleAutoBtn" type="button" aria-pressed="true">Auto-popup: On</button>
        </div>
      </div>

      <div class="content">
        <div class="hero">
          <h2>Dashboard Preview</h2>
          <p>
            This page demonstrates a clean, production-style welcome flow. The popup launches on load (unless disabled),
            and captures a simple routing choice: onboarding, guided tour, or self-navigation.
          </p>
          <div class="hint" aria-label="Hints">
            <span class="pill"><span class="dot"></span> Keyboard friendly (Tab / Enter / Esc)</span>
            <span class="pill">No dependencies</span>
            <span class="pill">Single-file drop-in</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <div class="overlay" id="overlay" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle" aria-describedby="welcomeDesc">
      <div class="modal-header">
        <div class="modal-title">
          <h3 id="welcomeTitle">Welcome to Orthodox Metrics, LLC</h3>
          <p id="welcomeDesc">Choose how you’d like to begin. You can change this later from the menu.</p>
        </div>
        <button class="close" id="closeBtn" type="button" aria-label="Close welcome dialog">Close</button>
      </div>

      <div class="modal-body">
        <div class="balloons" role="list">
          <button class="balloon" type="button" role="listitem" data-choice="new_existing">
            <div class="kicker"><span class="badge">1</span> balloon</div>
            <h4>New / Existing User</h4>
            <p>Sign in, register, or connect your parish workspace.</p>
          </button>

          <button class="balloon" type="button" role="listitem" data-choice="tour">
            <div class="kicker"><span class="badge">2</span> balloon2</div>
            <h4>Take the tour</h4>
            <p>Get a guided walkthrough of records, OCR, and analytics.</p>
          </button>

          <button class="balloon" type="button" role="listitem" data-choice="navigate">
            <div class="kicker"><span class="badge">3</span> balloon3</div>
            <h4>Navigate myself</h4>
            <p>Skip guidance and go straight to the main dashboard.</p>
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <div class="tiny">Tip: Press <strong>Esc</strong> to close.</div>
        <button class="primary" id="primaryCta" type="button">Continue</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true">
    <div class="icon" aria-hidden="true">i</div>
    <div>
      <h5 id="toastTitle">Saved</h5>
      <p id="toastBody">Your choice has been recorded.</p>
    </div>
  </div>

  <script>
    (function(){
      const overlay = document.getElementById("overlay");
      const openWelcomeBtn = document.getElementById("openWelcomeBtn");
      const toggleAutoBtn = document.getElementById("toggleAutoBtn");
      const closeBtn = document.getElementById("closeBtn");
      const primaryCta = document.getElementById("primaryCta");
      const balloons = Array.from(document.querySelectorAll(".balloon"));
      const toast = document.getElementById("toast");
      const toastTitle = document.getElementById("toastTitle");
      const toastBody = document.getElementById("toastBody");

      const STORAGE_KEYS = {
        auto: "om_welcome_auto",
        choice: "om_welcome_choice"
      };

      let selectedChoice = localStorage.getItem(STORAGE_KEYS.choice) || "new_existing";
      let toastTimer = null;

      function setOverlay(open){
        overlay.dataset.open = open ? "true" : "false";
        overlay.setAttribute("aria-hidden", open ? "false" : "true");
        if(open){
          setTimeout(() => {
            const btn = balloons.find(b => b.dataset.choice === selectedChoice) || balloons[0];
            btn.focus();
          }, 0);
          syncSelectionUI();
        } else {
          openWelcomeBtn.focus();
        }
      }

      function syncSelectionUI(){
        balloons.forEach(b => {
          const isSelected = b.dataset.choice === selectedChoice;
          b.style.borderColor = isSelected ? "rgba(139,92,246,.65)" : "rgba(255,255,255,.14)";
          b.style.boxShadow = isSelected ? "0 0 0 4px rgba(139,92,246,.20)" : "none";
          b.setAttribute("aria-selected", isSelected ? "true" : "false");
        });
      }

      function showToast(title, body){
        toastTitle.textContent = title;
        toastBody.textContent = body;
        toast.dataset.show = "true";
        if(toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.dataset.show = "false"; }, 2600);
      }

      function describeChoice(choice){
        switch(choice){
          case "new_existing":
            return { title: "Starting with account setup", body: "We’ll take you to sign in / register and parish selection." };
          case "tour":
            return { title: "Launching guided tour", body: "We’ll walk through OCR, records, and analytics." };
          case "navigate":
            return { title: "Going to dashboard", body: "You’ll start in the main navigation with no tour overlays." };
          default:
            return { title: "Saved", body: "Your choice has been recorded." };
        }
      }

      function saveChoice(){
        localStorage.setItem(STORAGE_KEYS.choice, selectedChoice);
        const msg = describeChoice(selectedChoice);
        showToast(msg.title, msg.body);
      }

      // Auto-popup toggle
      function getAutoPopup(){
        const v = localStorage.getItem(STORAGE_KEYS.auto);
        return v === null ? true : v === "true";
      }
      function setAutoPopup(v){
        localStorage.setItem(STORAGE_KEYS.auto, String(v));
        toggleAutoBtn.textContent = "Auto-popup: " + (v ? "On" : "Off");
        toggleAutoBtn.setAttribute("aria-pressed", v ? "true" : "false");
        showToast("Preference updated", "Auto-popup is now " + (v ? "enabled" : "disabled") + ".");
      }

      // Click handlers
      openWelcomeBtn.addEventListener("click", () => setOverlay(true));
      closeBtn.addEventListener("click", () => setOverlay(false));
      overlay.addEventListener("click", (e) => {
        if(e.target === overlay) setOverlay(false);
      });

      toggleAutoBtn.addEventListener("click", () => setAutoPopup(!getAutoPopup()));

      balloons.forEach(btn => {
        btn.addEventListener("click", () => {
          selectedChoice = btn.dataset.choice;
          syncSelectionUI();
          saveChoice();
        });
        btn.addEventListener("keydown", (e) => {
          if(e.key === "Enter" || e.key === " "){
            e.preventDefault();
            btn.click();
          }
        });
      });

      primaryCta.addEventListener("click", () => {
        saveChoice();
        setOverlay(false);
      });

      // Keyboard shortcuts
      document.addEventListener("keydown", (e) => {
        const open = overlay.dataset.open === "true";
        if(!open) return;
        if(e.key === "Escape"){ e.preventDefault(); setOverlay(false); }
      });

      // Init
      setAutoPopup(getAutoPopup());
      if(getAutoPopup()) setOverlay(true);
    })();
  </script>
</body>
</html>
