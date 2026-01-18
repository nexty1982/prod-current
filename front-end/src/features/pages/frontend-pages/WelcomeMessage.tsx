import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material';

const WelcomeMessage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const openWelcomeBtnRef = useRef<HTMLButtonElement>(null);
  const toggleAutoBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const primaryCtaRef = useRef<HTMLButtonElement>(null);
  const balloonsRef = useRef<NodeListOf<HTMLButtonElement> | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const toastTitleRef = useRef<HTMLHeadingElement>(null);
  const toastBodyRef = useRef<HTMLParagraphElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedChoiceRef = useRef<string>(
    localStorage.getItem('om_welcome_choice') || 'new_existing'
  );

  const STORAGE_KEYS = {
    auto: 'om_welcome_auto',
    choice: 'om_welcome_choice',
  };

  const setOverlay = (open: boolean) => {
    if (!overlayRef.current) return;
    overlayRef.current.dataset.open = open ? 'true' : 'false';
    overlayRef.current.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      setTimeout(() => {
        if (balloonsRef.current && selectedChoiceRef.current) {
          const btn = Array.from(balloonsRef.current).find(
            (b) => b.dataset.choice === selectedChoiceRef.current
          );
          if (btn) btn.focus();
        }
      }, 0);
      syncSelectionUI();
    } else {
      if (openWelcomeBtnRef.current) openWelcomeBtnRef.current.focus();
    }
  };

  const syncSelectionUI = useCallback(() => {
    if (!balloonsRef.current) return;
    const primaryColor = theme.palette.primary.main;
    const dividerColor = theme.palette.divider;
    balloonsRef.current.forEach((b) => {
      const isSelected = b.dataset.choice === selectedChoiceRef.current;
      b.style.borderColor = isSelected
        ? alpha(primaryColor, 0.65)
        : dividerColor;
      b.style.boxShadow = isSelected
        ? `0 0 0 4px ${alpha(primaryColor, 0.20)}`
        : 'none';
      b.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  }, [theme]);

  const showToast = (title: string, body: string) => {
    if (!toastRef.current || !toastTitleRef.current || !toastBodyRef.current)
      return;
    toastTitleRef.current.textContent = title;
    toastBodyRef.current.textContent = body;
    toastRef.current.dataset.show = 'true';
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      if (toastRef.current) toastRef.current.dataset.show = 'false';
    }, 2600);
  };

  const describeChoice = (choice: string) => {
    switch (choice) {
      case 'new_existing':
        return {
          title: 'Starting with account setup',
          body: "We'll take you to sign in / register and parish selection.",
        };
      case 'tour':
        return {
          title: 'Launching guided tour',
          body: "We'll walk through OCR, records, and analytics.",
        };
      case 'navigate':
        return {
          title: 'Going to dashboard',
          body: "You'll start in the main navigation with no tour overlays.",
        };
      default:
        return {
          title: 'Saved',
          body: 'Your choice has been recorded.',
        };
    }
  };

  const saveChoice = () => {
    localStorage.setItem(STORAGE_KEYS.choice, selectedChoiceRef.current);
    const msg = describeChoice(selectedChoiceRef.current);
    showToast(msg.title, msg.body);
  };

  const getAutoPopup = (): boolean => {
    const v = localStorage.getItem(STORAGE_KEYS.auto);
    return v === null ? true : v === 'true';
  };

  const setAutoPopup = (v: boolean) => {
    localStorage.setItem(STORAGE_KEYS.auto, String(v));
    if (toggleAutoBtnRef.current) {
      toggleAutoBtnRef.current.textContent = 'Auto-popup: ' + (v ? 'On' : 'Off');
      toggleAutoBtnRef.current.setAttribute('aria-pressed', v ? 'true' : 'false');
    }
    showToast(
      'Preference updated',
      'Auto-popup is now ' + (v ? 'enabled' : 'disabled') + '.'
    );
  };

  // Compute theme-aware CSS variables and style values
  const { cssVars, computedStyles } = useMemo(() => {
    const bg = theme.palette.background.default;
    const paper = theme.palette.background.paper || bg;
    const textPrimary = theme.palette.text.primary;
    const textSecondary = theme.palette.text.secondary;
    const primary = theme.palette.primary.main;
    const secondary = theme.palette.secondary.main;
    const divider = theme.palette.divider;
    const borderRadius = theme.shape?.borderRadius || 18;
    const white = theme.palette.common.white;
    const black = theme.palette.common.black;
    const primaryContrast = theme.palette.primary.contrastText || theme.palette.getContrastText(primary);

    // For dark mode, create gradient backgrounds; for light mode, use lighter variants
    const bg0 = isDark ? bg : alpha(bg, 0.98);
    const bg1 = isDark 
      ? alpha(bg, 0.95) 
      : alpha(bg, 0.96);
    const card = isDark 
      ? alpha(paper, 0.6) 
      : alpha(paper, 0.8);
    const shadow = isDark 
      ? '0 20px 60px rgba(0,0,0,.55)' 
      : '0 20px 60px rgba(0,0,0,.15)';
    const shadow2 = isDark 
      ? '0 10px 25px rgba(0,0,0,.35)' 
      : '0 10px 25px rgba(0,0,0,.1)';

    // Compute all style values for CSS template
    const styles = {
      primaryGrad1: alpha(primary, 0.22),
      secondaryGrad1: alpha(secondary, 0.18),
      appFrameBg: alpha(paper, 0.6),
      topbarGrad1: alpha(white, 0.06),
      topbarGrad2: alpha(white, 0.02),
      markGrad1: alpha(white, 0.35),
      markGrad2: alpha(primary, 0.95),
      markGrad3: alpha(secondary, 0.9),
      markShadow: alpha(primary, 0.18),
      markBorder: alpha(white, 0.18),
      ghostBg: alpha(white, 0.04),
      ghostHoverBg: alpha(white, 0.06),
      ghostHoverBorder: alpha(white, 0.22),
      heroBg: alpha(paper, 0.55),
      pillBorder: alpha(white, 0.14),
      pillBg: alpha(white, 0.03),
      dotBg: alpha(primary, 0.95),
      dotShadow: alpha(primary, 0.18),
      overlayBg: alpha(black, 0.55),
      modalBg: alpha(paper, 0.92),
      modalHeaderBorder: alpha(white, 0.12),
      closeBorder: alpha(white, 0.14),
      closeBg: alpha(white, 0.04),
      balloonBorder: alpha(white, 0.14),
      balloonBg: alpha(white, 0.03),
      balloonHoverBorder: alpha(white, 0.22),
      balloonHoverBg: alpha(white, 0.05),
      balloonFocusShadow: alpha(primary, 0.25),
      balloonFocusBorder: alpha(primary, 0.55),
      balloonGrad1: alpha(primary, 0.22),
      balloonGrad2: alpha(secondary, 0.18),
      kickerColor: alpha(white, 0.68),
      badgeBorder: alpha(white, 0.18),
      badgeBg: alpha(white, 0.04),
      badgeColor: alpha(white, 0.88),
      primaryBorder: alpha(white, 0.12),
      primaryBg1: alpha(primary, 0.95),
      primaryBg2: alpha(secondary, 0.82),
      primaryColor: primaryContrast,
      toastBorder: alpha(white, 0.14),
      toastBg: alpha(paper, 0.92),
      toastIconBg: alpha(primary, 0.22),
      toastIconBorder: alpha(primary, 0.35),
    };

    return {
      cssVars: {
        '--om-welcome-bg0': bg0,
        '--om-welcome-bg1': bg1,
        '--om-welcome-card': card,
        '--om-welcome-stroke': divider,
        '--om-welcome-muted': textSecondary,
        '--om-welcome-text': textPrimary,
        '--om-welcome-accent': primary,
        '--om-welcome-accent2': secondary,
        '--om-welcome-shadow': shadow,
        '--om-welcome-shadow2': shadow2,
        '--om-welcome-radius': `${borderRadius}px`,
      },
      computedStyles: styles,
    };
  }, [theme, isDark]);

  useEffect(() => {
    balloonsRef.current = document.querySelectorAll('.om-welcome .balloon');
    syncSelectionUI();
  }, [syncSelectionUI]);

  useEffect(() => {
    setAutoPopup(getAutoPopup());
    if (getAutoPopup()) setOverlay(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (e.target === overlayRef.current) setOverlay(false);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (!overlayRef.current) return;
      const open = overlayRef.current.dataset.open === 'true';
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOverlay(false);
      }
    };

    overlayRef.current?.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      overlayRef.current?.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className="om-welcome" style={cssVars}>
      <style>
        {`
          .om-welcome *{box-sizing:border-box}
          
          .om-welcome .welcome-message-body{
            margin:0;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
            color:var(--om-welcome-text);
            background:
              radial-gradient(1200px 700px at 20% 15%, ${computedStyles.primaryGrad1}, transparent 55%),
              radial-gradient(900px 550px at 80% 35%, ${computedStyles.secondaryGrad1}, transparent 60%),
              linear-gradient(180deg, var(--om-welcome-bg0), var(--om-welcome-bg1));
            overflow-x:hidden;
          }

          .om-welcome .shell{
            min-height:100vh;
            display:grid;
            place-items:center;
            padding:40px 18px;
          }

          .om-welcome .app-frame{
            width:min(980px, 100%);
            border:1px solid var(--om-welcome-stroke);
            background: ${computedStyles.appFrameBg};
            backdrop-filter: blur(10px);
            border-radius: var(--om-welcome-radius);
            box-shadow: var(--om-welcome-shadow);
            overflow:hidden;
            position:relative;
          }

          .om-welcome .topbar{
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding:18px 20px;
            border-bottom:1px solid var(--om-welcome-stroke);
            background: linear-gradient(180deg, ${computedStyles.topbarGrad1}, ${computedStyles.topbarGrad2});
          }

          .om-welcome .brand{
            display:flex;
            gap:12px;
            align-items:center;
          }

          .om-welcome .mark{
            width:34px;height:34px;border-radius:12px;
            background:
              radial-gradient(14px 14px at 30% 30%, ${computedStyles.markGrad1}, transparent 65%),
              linear-gradient(135deg, ${computedStyles.markGrad2}, ${computedStyles.markGrad3});
            box-shadow: 0 10px 25px ${computedStyles.markShadow};
            border:1px solid ${computedStyles.markBorder};
          }

          .om-welcome .brand h1{
            font-size:14px;
            letter-spacing:.35px;
            margin:0;
            font-weight:650;
          }
          .om-welcome .brand p{
            margin:2px 0 0;
            font-size:12px;
            color:var(--om-welcome-muted);
          }

          .om-welcome .actions{
            display:flex;
            gap:10px;
            align-items:center;
          }

          .om-welcome .ghost{
            border:1px solid var(--om-welcome-stroke);
            background: ${alpha(theme.palette.common.white, 0.04)};
            color:var(--om-welcome-text);
            padding:10px 12px;
            border-radius: 14px;
            cursor:pointer;
            font-weight:600;
            font-size:12px;
            transition: transform .12s ease, background .12s ease, border-color .12s ease;
          }
          .om-welcome .ghost:hover{transform: translateY(-1px); background: ${computedStyles.ghostHoverBg}; border-color: ${computedStyles.ghostHoverBorder}}
          .om-welcome .ghost:active{transform: translateY(0px) scale(.99)}

          .content{
            padding:34px 22px 30px;
            display:grid;
            gap:22px;
          }

          .om-welcome .hero{
            display:grid;
            gap:10px;
            padding:22px;
            border:1px solid var(--om-welcome-stroke);
            border-radius: var(--om-welcome-radius);
            background: ${computedStyles.heroBg};
            box-shadow: var(--om-welcome-shadow2);
          }

          .hero h2{
            margin:0;
            font-size:22px;
            font-weight:750;
            letter-spacing:.2px;
          }

          .om-welcome .hero p{
            margin:0;
            color:var(--om-welcome-muted);
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

          .om-welcome .pill{
            display:inline-flex;
            gap:8px;
            align-items:center;
            padding:8px 10px;
            border:1px solid ${computedStyles.pillBorder};
            border-radius: 999px;
            background: ${computedStyles.pillBg};
            font-size:12px;
            color:var(--om-welcome-muted);
          }
          .om-welcome .dot{
            width:8px;height:8px;border-radius:999px;
            background: ${computedStyles.dotBg};
            box-shadow: 0 0 0 4px ${computedStyles.dotShadow};
          }

          .om-welcome .overlay{
            position:fixed;
            inset:0;
            background: ${computedStyles.overlayBg};
            display:none;
            place-items:center;
            padding:22px;
            z-index:50;
          }
          .om-welcome .overlay[data-open="true"]{display:grid}

          .om-welcome .modal{
            width:min(720px, 100%);
            border:1px solid var(--om-welcome-stroke);
            background: ${computedStyles.modalBg};
            border-radius: 22px;
            box-shadow: var(--om-welcome-shadow);
            overflow:hidden;
            position:relative;
            transform: translateY(10px);
            opacity:0;
            transition: transform .18s ease, opacity .18s ease;
          }
          .om-welcome .overlay[data-open="true"] .modal{
            transform: translateY(0px);
            opacity:1;
          }

          .om-welcome .modal-header{
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:14px;
            padding:18px 18px 12px;
            border-bottom:1px solid ${computedStyles.modalHeaderBorder};
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
          .om-welcome .modal-title p{
            margin:0;
            font-size:13px;
            color:var(--om-welcome-muted);
            line-height:1.45;
          }

          .om-welcome .close{
            border:1px solid ${computedStyles.closeBorder};
            background: ${computedStyles.closeBg};
            color:var(--om-welcome-text);
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

          .om-welcome .balloons{
            display:grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap:12px;
          }

          @media (max-width: 720px){
            .om-welcome .balloons{grid-template-columns: 1fr}
          }

          .om-welcome .balloon{
            position:relative;
            border:1px solid ${computedStyles.balloonBorder};
            background: ${computedStyles.balloonBg};
            border-radius: var(--om-welcome-radius);
            padding:16px 14px;
            cursor:pointer;
            text-align:left;
            transition: transform .14s ease, border-color .14s ease, background .14s ease;
            outline:none;
            min-height: 92px;
          }
          .om-welcome .balloon:hover{
            transform: translateY(-2px);
            border-color: ${computedStyles.balloonHoverBorder};
            background: ${computedStyles.balloonHoverBg};
          }
          .om-welcome .balloon:active{transform: translateY(0px) scale(.995)}
          .om-welcome .balloon:focus-visible{
            box-shadow: 0 0 0 4px ${computedStyles.balloonFocusShadow};
            border-color: ${computedStyles.balloonFocusBorder};
          }

          .om-welcome .balloon::before{
            content:"";
            position:absolute;
            inset:0;
            border-radius:var(--om-welcome-radius);
            pointer-events:none;
            background: radial-gradient(500px 120px at 20% 0%, ${computedStyles.balloonGrad1}, transparent 55%),
                        radial-gradient(500px 120px at 80% 10%, ${computedStyles.balloonGrad2}, transparent 60%);
            opacity:.75;
            mix-blend-mode: screen;
          }

          .om-welcome .balloon .kicker{
            font-size:11px;
            letter-spacing:.35px;
            text-transform:uppercase;
            color:${computedStyles.kickerColor};
            margin:0 0 6px;
            position:relative;
            z-index:1;
            display:flex;
            align-items:center;
            gap:8px;
          }

          .om-welcome .badge{
            display:inline-flex;
            align-items:center;
            justify-content:center;
            width:22px;height:22px;
            border-radius: 9px;
            border:1px solid ${computedStyles.badgeBorder};
            background: ${computedStyles.badgeBg};
            font-weight:800;
            font-size:12px;
            color:${computedStyles.badgeColor};
          }

          .balloon h4{
            margin:0 0 6px;
            font-size:15px;
            font-weight:800;
            position:relative;
            z-index:1;
          }
          .om-welcome .balloon p{
            margin:0;
            font-size:13px;
            color:var(--om-welcome-muted);
            line-height:1.45;
            position:relative;
            z-index:1;
          }

          .om-welcome .modal-footer{
            padding:14px 18px 18px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
          }

          .om-welcome .tiny{
            font-size:12px;
            color:var(--om-welcome-muted);
          }

          .om-welcome .primary{
            border:1px solid ${computedStyles.primaryBorder};
            background: linear-gradient(135deg, ${computedStyles.primaryBg1}, ${computedStyles.primaryBg2});
            color: ${computedStyles.primaryColor};
            padding:10px 14px;
            border-radius: 14px;
            cursor:pointer;
            font-weight:900;
            letter-spacing:.1px;
            transition: transform .12s ease, filter .12s ease;
          }
          .om-welcome .primary:hover{transform: translateY(-1px); filter: brightness(1.05)}
          .om-welcome .primary:active{transform: translateY(0px) scale(.99)}

          .om-welcome .toast{
            position:fixed;
            left:50%;
            bottom:22px;
            transform: translateX(-50%) translateY(16px);
            width:min(680px, calc(100% - 36px));
            border:1px solid ${computedStyles.toastBorder};
            background: ${computedStyles.toastBg};
            border-radius: 16px;
            box-shadow: var(--om-welcome-shadow2);
            padding:12px 14px;
            display:flex;
            gap:12px;
            align-items:flex-start;
            opacity:0;
            pointer-events:none;
            transition: opacity .18s ease, transform .18s ease;
            z-index:60;
          }
          .om-welcome .toast[data-show="true"]{
            opacity:1;
            transform: translateX(-50%) translateY(0px);
          }
          .om-welcome .toast .icon{
            width:28px;height:28px;border-radius: 12px;
            background: ${computedStyles.toastIconBg};
            border:1px solid ${computedStyles.toastIconBorder};
            display:grid; place-items:center;
            font-weight:900;
          }
          .om-welcome .toast h5{
            margin:0;
            font-size:13px;
            font-weight:850;
          }
          .om-welcome .toast p{
            margin:2px 0 0;
            font-size:12px;
            color:var(--om-welcome-muted);
            line-height:1.4;
          }
        `}
      </style>
      <div className="welcome-message-body">
        <div className="shell">
          <div
            className="app-frame"
            role="application"
            aria-label="Orthodox Metrics Welcome"
          >
            <div className="topbar">
              <div className="brand">
                <div className="mark" aria-hidden="true"></div>
                <div>
                  <h1>Orthodox Metrics, LLC</h1>
                  <p>Records, workflows, and analytics — built for parishes.</p>
                </div>
              </div>
              <div className="actions">
                <button
                  className="ghost"
                  ref={openWelcomeBtnRef}
                  onClick={() => setOverlay(true)}
                  type="button"
                >
                  Open Welcome
                </button>
                <button
                  className="ghost"
                  ref={toggleAutoBtnRef}
                  onClick={() => setAutoPopup(!getAutoPopup())}
                  type="button"
                  aria-pressed="true"
                >
                  Auto-popup: On
                </button>
              </div>
            </div>

            <div className="content">
              <div className="hero">
                <h2>Dashboard Preview</h2>
                <p>
                  This page demonstrates a clean, production-style welcome flow.
                  The popup launches on load (unless disabled), and captures a
                  simple routing choice: onboarding, guided tour, or
                  self-navigation.
                </p>
                <div className="hint" aria-label="Hints">
                  <span className="pill">
                    <span className="dot"></span> Keyboard friendly (Tab /
                    Enter / Esc)
                  </span>
                  <span className="pill">No dependencies</span>
                  <span className="pill">Single-file drop-in</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="overlay"
          ref={overlayRef}
          id="overlay"
          aria-hidden="true"
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcomeTitle"
            aria-describedby="welcomeDesc"
          >
            <div className="modal-header">
              <div className="modal-title">
                <h3 id="welcomeTitle">Welcome to Orthodox Metrics, LLC</h3>
                <p id="welcomeDesc">
                  Choose how you'd like to begin. You can change this later from
                  the menu.
                </p>
              </div>
              <button
                className="close"
                ref={closeBtnRef}
                onClick={() => setOverlay(false)}
                type="button"
                aria-label="Close welcome dialog"
              >
                Close
              </button>
            </div>

            <div className="modal-body">
              <div className="balloons" role="list">
                <button
                  className="balloon"
                  type="button"
                  role="listitem"
                  data-choice="new_existing"
                  onClick={() => handleChoiceClick('new_existing')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleChoiceClick('new_existing');
                    }
                  }}
                >
                  <div className="kicker">
                    <span className="badge">1</span> balloon
                  </div>
                  <h4>New / Existing User</h4>
                  <p>Sign in, register, or connect your parish workspace.</p>
                </button>

                <button
                  className="balloon"
                  type="button"
                  role="listitem"
                  data-choice="tour"
                  onClick={() => handleChoiceClick('tour')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleChoiceClick('tour');
                    }
                  }}
                >
                  <div className="kicker">
                    <span className="badge">2</span> balloon2
                  </div>
                  <h4>Take the tour</h4>
                  <p>Get a guided walkthrough of records, OCR, and analytics.</p>
                </button>

                <button
                  className="balloon"
                  type="button"
                  role="listitem"
                  data-choice="navigate"
                  onClick={() => handleChoiceClick('navigate')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleChoiceClick('navigate');
                    }
                  }}
                >
                  <div className="kicker">
                    <span className="badge">3</span> balloon3
                  </div>
                  <h4>Navigate myself</h4>
                  <p>Skip guidance and go straight to the main dashboard.</p>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <div className="tiny">
                Tip: Press <strong>Esc</strong> to close.
              </div>
              <button
                className="primary"
                ref={primaryCtaRef}
                onClick={() => {
                  const choice = selectedChoiceRef.current;
                  saveChoice();
                  if (choice === 'new_existing') {
                    navigate('/auth/login2');
                  } else if (choice === 'tour') {
                    navigate('/tour');
                  }
                  setOverlay(false);
                }}
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        <div
          className="toast"
          ref={toastRef}
          id="toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="icon" aria-hidden="true">
            i
          </div>
          <div>
            <h5 ref={toastTitleRef} id="toastTitle">
              Saved
            </h5>
            <p ref={toastBodyRef} id="toastBody">
              Your choice has been recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeMessage;

