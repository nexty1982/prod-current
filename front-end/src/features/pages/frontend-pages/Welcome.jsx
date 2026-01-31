import React, { useEffect, useMemo, useRef, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  imageUrl?: string; // optional image URL
  imageAlt?: string;
  // Optional: lock this step from being skipped/auto-completed
  requiresAction?: boolean;
};

export type OnboardingConfig = {
  version: number; // bump when you want to reset/force refresh
  modalTitle?: string;
  steps: OnboardingStep[];
  // Optional rules
  requireCompletionToDismiss?: boolean; // default true
};

type UserOnboardingState = {
  status: "incomplete" | "complete";
  stepIndex: number; // 0-based
  completedAt?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void; // called only when allowed to close
  isSuperAdmin: boolean;

  // If you wire to backend, provide these:
  loadConfig?: () => Promise<OnboardingConfig | null>;
  saveConfig?: (cfg: OnboardingConfig) => Promise<void>;
  loadUserState?: () => Promise<UserOnboardingState | null>;
  saveUserState?: (st: UserOnboardingState) => Promise<void>;

  // If omitted, localStorage keys below are used.
  storageKeys?: {
    configKey?: string;
    userStateKey?: string;
  };

  // Optional: app-specific hooks for step actions
  onPrimaryAction?: (step: OnboardingStep, stepIndex: number) => Promise<void> | void;
  onSecondaryAction?: (step: OnboardingStep, stepIndex: number) => Promise<void> | void;

  // Theme
  theme?: ThemeMode;
};

const DEFAULT_CONFIG: OnboardingConfig = {
  version: 1,
  modalTitle: "Welcome Setup",
  requireCompletionToDismiss: true,
  steps: [
    {
      id: "welcome",
      title: "Welcome & Orientation",
      description: "Set up your workspace in a few minutes. We’ll configure essentials and complete your first action.",
      primaryLabel: "Begin Setup",
      imageUrl: "",
      imageAlt: "Welcome dashboard preview",
    },
    {
      id: "profile",
      title: "Confirm Your Account Details",
      description: "Verify your profile and preferences so your workspace reflects your organization correctly.",
      primaryLabel: "Review Profile Settings",
      secondaryLabel: "Use defaults (can edit later)",
      imageUrl: "",
      imageAlt: "Profile form preview",
    },
    {
      id: "core-config",
      title: "Configure Essential Settings",
      description: "Confirm timezone, notifications, and other core settings that affect how your data is displayed.",
      primaryLabel: "Configure Settings",
      secondaryLabel: "Use recommended defaults",
      imageUrl: "",
      imageAlt: "Settings panel preview",
      requiresAction: true,
    },
    {
      id: "features",
      title: "Enable Powerful Features",
      description: "Turn on optional capabilities like reports, API access, and collaboration tools.",
      primaryLabel: "Choose Features",
      secondaryLabel: "Enable all recommended",
      imageUrl: "",
      imageAlt: "Feature toggles preview",
    },
    {
      id: "first-action",
      title: "Complete Your First Action",
      description: "Create your first item so you can see the core workflow end-to-end.",
      primaryLabel: "Add First Item",
      secondaryLabel: "Import existing data instead",
      imageUrl: "",
      imageAlt: "Create entity preview",
      requiresAction: true,
    },
    {
      id: "done",
      title: "You’re All Set",
      description: "Your workspace is live. Next: review your dashboard or invite your team.",
      primaryLabel: "Go to Dashboard",
      secondaryLabel: "Invite team members first",
      imageUrl: "",
      imageAlt: "Success preview",
    },
  ],
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix = "step"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function OnboardingWelcomeModal(props: Props) {
  const {
    isOpen,
    onClose,
    isSuperAdmin,
    loadConfig,
    saveConfig,
    loadUserState,
    saveUserState,
    storageKeys,
    onPrimaryAction,
    onSecondaryAction,
    theme = "system",
  } = props;

  const keys = useMemo(
    () => ({
      configKey: storageKeys?.configKey ?? "om_onboarding_config",
      userStateKey: storageKeys?.userStateKey ?? "om_onboarding_user_state",
    }),
    [storageKeys]
  );

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(theme === "system" ? getSystemTheme() : theme);
  useEffect(() => {
    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;
    const handler = () => setResolvedTheme(getSystemTheme());
    handler();
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [theme]);

  const [config, setConfig] = useState<OnboardingConfig>(DEFAULT_CONFIG);
  const [userState, setUserState] = useState<UserOnboardingState>({
    status: "incomplete",
    stepIndex: 0,
  });

  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement | null>(null);

  const steps = config.steps ?? [];
  const stepIndex = Math.min(Math.max(userState.stepIndex, 0), Math.max(steps.length - 1, 0));
  const step = steps[stepIndex];

  const progressPct = steps.length ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;
  const canDismiss = config.requireCompletionToDismiss !== false ? userState.status === "complete" : true;

  // Load config + user state (API if provided; else localStorage)
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;
    (async () => {
      setErrorMsg(null);
      try {
        const cfgFromApi = loadConfig ? await loadConfig() : null;
        const stFromApi = loadUserState ? await loadUserState() : null;

        const cfgFromStorage = safeJsonParse<OnboardingConfig>(localStorage.getItem(keys.configKey));
        const stFromStorage = safeJsonParse<UserOnboardingState>(localStorage.getItem(keys.userStateKey));

        const cfg = cfgFromApi ?? cfgFromStorage ?? DEFAULT_CONFIG;
        const st = stFromApi ?? stFromStorage ?? { status: "incomplete", stepIndex: 0 };

        // If config version changed, keep user state but clamp step index safely
        const clampedSt: UserOnboardingState = {
          ...st,
          stepIndex: Math.min(Math.max(st.stepIndex ?? 0, 0), Math.max((cfg.steps?.length ?? 1) - 1, 0)),
        };

        if (!alive) return;
        setConfig(cfg);
        setUserState(clampedSt);
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message ?? "Failed to load onboarding data.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, keys.configKey, keys.userStateKey, loadConfig, loadUserState]);

  // Persist helpers
  const persistConfig = async (cfg: OnboardingConfig) => {
    localStorage.setItem(keys.configKey, JSON.stringify(cfg));
    if (saveConfig) await saveConfig(cfg);
  };
  const persistUserState = async (st: UserOnboardingState) => {
    localStorage.setItem(keys.userStateKey, JSON.stringify(st));
    if (saveUserState) await saveUserState(st);
  };

  const goTo = async (idx: number) => {
    const nextIdx = Math.min(Math.max(idx, 0), Math.max(steps.length - 1, 0));
    const nextState: UserOnboardingState = { ...userState, stepIndex: nextIdx };
    setUserState(nextState);
    await persistUserState(nextState);
  };

  const complete = async () => {
    const nextState: UserOnboardingState = {
      ...userState,
      status: "complete",
      completedAt: new Date().toISOString(),
    };
    setUserState(nextState);
    await persistUserState(nextState);
  };

  const handlePrimary = async () => {
    if (!step) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await onPrimaryAction?.(step, stepIndex);

      // If this is last step => complete
      if (stepIndex >= steps.length - 1) {
        await complete();
        onClose(); // allowed now
        return;
      }

      await goTo(stepIndex + 1);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Primary action failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSecondary = async () => {
    if (!step || !step.secondaryLabel) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await onSecondaryAction?.(step, stepIndex);

      // Secondary action still advances by default
      if (stepIndex >= steps.length - 1) {
        await complete();
        onClose();
        return;
      }
      await goTo(stepIndex + 1);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Secondary action failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleBack = async () => {
    if (stepIndex <= 0) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await goTo(stepIndex - 1);
    } finally {
      setBusy(false);
    }
  };

  const requestClose = () => {
    if (!canDismiss) return;
    onClose();
  };

  // Super admin editing
  const updateStep = (id: string, patch: Partial<OnboardingStep>) => {
    setConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const addStep = () => {
    const newStep: OnboardingStep = {
      id: uid("custom"),
      title: "New Step",
      description: "Describe what the user should do here.",
      primaryLabel: "Continue",
      secondaryLabel: "Optional action",
      imageUrl: "",
      imageAlt: "Step image",
    };
    setConfig((prev) => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const removeStep = (id: string) => {
    setConfig((prev) => {
      const nextSteps = prev.steps.filter((s) => s.id !== id);
      return { ...prev, steps: nextSteps.length ? nextSteps : prev.steps };
    });
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    setConfig((prev) => {
      const i = prev.steps.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.steps.length) return prev;
      const next = [...prev.steps];
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
      return { ...prev, steps: next };
    });
  };

  const saveEdits = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const nextCfg: OnboardingConfig = {
        ...config,
        version: config.version ?? 1,
        steps: config.steps.map((s) => ({
          ...s,
          title: (s.title ?? "").trim(),
          description: (s.description ?? "").trim(),
          primaryLabel: (s.primaryLabel ?? "Continue").trim(),
          secondaryLabel: s.secondaryLabel?.trim() || undefined,
          imageUrl: s.imageUrl?.trim() || undefined,
          imageAlt: s.imageAlt?.trim() || undefined,
        })),
      };

      await persistConfig(nextCfg);
      setConfig(nextCfg);

      // Clamp user step if steps changed
      const clampedIdx = Math.min(Math.max(userState.stepIndex, 0), Math.max(nextCfg.steps.length - 1, 0));
      if (clampedIdx !== userState.stepIndex) {
        const nextState = { ...userState, stepIndex: clampedIdx };
        setUserState(nextState);
        await persistUserState(nextState);
      }

      setEditing(false);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to save onboarding edits.");
    } finally {
      setBusy(false);
    }
  };

  const discardEdits = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const cfgFromStorage = safeJsonParse<OnboardingConfig>(localStorage.getItem(keys.configKey));
      const cfg = cfgFromStorage ?? DEFAULT_CONFIG;
      setConfig(cfg);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      data-theme={resolvedTheme}
      style={styles.overlay}
      aria-modal="true"
      role="dialog"
      aria-label={config.modalTitle ?? "Welcome"}
      onMouseDown={(e) => {
        // click outside closes only if allowed
        if (e.target === overlayRef.current && canDismiss) requestClose();
      }}
    >
      <style>{css}</style>

      <div style={styles.modal} role="document">
        <div style={styles.header}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={styles.titleRow}>
              <div style={styles.titleText}>{config.modalTitle ?? "Welcome Setup"}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isSuperAdmin && (
                  <button
                    type="button"
                    style={styles.smallBtn}
                    onClick={() => setEditing((v) => !v)}
                    disabled={busy}
                  >
                    {editing ? "Exit Admin Edit" : "Admin Edit"}
                  </button>
                )}

                <button
                  type="button"
                  style={{
                    ...styles.iconBtn,
                    opacity: canDismiss ? 1 : 0.35,
                    cursor: canDismiss ? "pointer" : "not-allowed",
                  }}
                  onClick={requestClose}
                  disabled={!canDismiss}
                  aria-label="Close"
                  title={canDismiss ? "Close" : "Complete onboarding to close"}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={styles.metaRow}>
              <div style={styles.stepPill}>
                Step {Math.min(stepIndex + 1, steps.length)} of {steps.length}
              </div>
              <div style={styles.progressWrap} aria-label={`Progress ${progressPct}%`}>
                <div style={{ ...styles.progressBar, width: `${progressPct}%` }} />
              </div>
              <div style={styles.pctText}>{progressPct}%</div>
            </div>
          </div>
        </div>

        <div style={styles.body}>
          {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

          {!editing ? (
            <>
              <div style={styles.stepTitle}>{step?.title ?? ""}</div>
              <div style={styles.stepDesc}>{step?.description ?? ""}</div>

              <div style={styles.imageBox} aria-label="Step image">
                {step?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={step.imageUrl}
                    alt={step.imageAlt ?? step.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                  />
                ) : (
                  <div style={styles.imagePlaceholder}>
                    <div style={styles.imagePlaceholderText}>[IMAGE_PLACEHOLDER]</div>
                    <div style={styles.imagePlaceholderSub}>Set an image URL in Admin Edit.</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={styles.adminPanel}>
              <div style={styles.adminHeader}>
                <div style={styles.adminTitle}>Onboarding Steps Editor</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={styles.smallBtn} onClick={addStep} disabled={busy}>
                    + Add Step
                  </button>
                  <button type="button" style={styles.primaryBtnSm} onClick={saveEdits} disabled={busy}>
                    Save
                  </button>
                  <button type="button" style={styles.smallBtn} onClick={discardEdits} disabled={busy}>
                    Discard
                  </button>
                </div>
              </div>

              <div style={styles.adminList}>
                {config.steps.map((s, idx) => (
                  <div key={s.id} style={styles.adminCard}>
                    <div style={styles.adminCardTop}>
                      <div style={{ fontWeight: 700 }}>
                        {idx + 1}. {s.title || "(Untitled)"}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          style={styles.smallBtn}
                          onClick={() => moveStep(s.id, -1)}
                          disabled={busy || idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          style={styles.smallBtn}
                          onClick={() => moveStep(s.id, 1)}
                          disabled={busy || idx === config.steps.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          style={styles.dangerBtnSm}
                          onClick={() => removeStep(s.id)}
                          disabled={busy || config.steps.length <= 1}
                          title={config.steps.length <= 1 ? "At least one step is required" : "Remove step"}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div style={styles.grid2}>
                      <label style={styles.label}>
                        Title
                        <input
                          style={styles.input}
                          value={s.title}
                          onChange={(e) => updateStep(s.id, { title: e.target.value })}
                        />
                      </label>

                      <label style={styles.label}>
                        Primary Button Label
                        <input
                          style={styles.input}
                          value={s.primaryLabel}
                          onChange={(e) => updateStep(s.id, { primaryLabel: e.target.value })}
                        />
                      </label>

                      <label style={styles.label}>
                        Secondary Label (optional)
                        <input
                          style={styles.input}
                          value={s.secondaryLabel ?? ""}
                          onChange={(e) => updateStep(s.id, { secondaryLabel: e.target.value || undefined })}
                        />
                      </label>

                      <label style={styles.label}>
                        Image URL (optional)
                        <input
                          style={styles.input}
                          value={s.imageUrl ?? ""}
                          onChange={(e) => updateStep(s.id, { imageUrl: e.target.value || undefined })}
                          placeholder="https://..."
                        />
                      </label>

                      <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                        Description
                        <textarea
                          style={styles.textarea}
                          value={s.description}
                          onChange={(e) => updateStep(s.id, { description: e.target.value })}
                          rows={3}
                        />
                      </label>
                    </div>
               
