import React, { useEffect, useMemo, useRef, useState } from "react";

// OrthodoxMetrics Theme Constants
const BRAND_GRADIENT = "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)";
const ACCENT_COLOR = "#007bff";

/* ... types remain same ... */

export const WelcomeMessage: React.FC<Props> = ({
  isOpen,
  onClose,
  isSuperAdmin,
  storageKeys = {}
}) => {
  // 1. Refactored logic to use the new /api/system/health context
  // This ensures the onboarding only shows if the MariaDB 'Sync' is green
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [userState, setUserState] = useState<UserOnboardingState>({
    status: "incomplete",
    stepIndex: 0
  });

  /* ... effect logic for loading ... */

  // 2. Flashy Gradient UI Fixes
  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)",
    },
    modal: {
      background: BRAND_GRADIENT, // Applied your preferred gradient
      width: "90%",
      maxWidth: "600px",
      maxHeight: "85vh",
      borderRadius: "16px",
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      border: "1px solid rgba(255,255,255,0.3)"
    },
    header: {
      padding: "20px",
      borderBottom: "1px solid rgba(0,0,0,0.05)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    buttonPrimary: {
      background: ACCENT_COLOR,
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: 600,
      transition: "transform 0.2s",
    }
  };

  if (!isOpen || !config) return null;

  const currentStep = config.steps[userState.stepIndex];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>{config.modalTitle || "Welcome to OrthodoxMetrics"}</h2>
          {(!config.requireCompletionToDismiss || isSuperAdmin) && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem" }}>×</button>
          )}
        </div>

        <div style={{ padding: "30px", overflowY: "auto", flex: 1, textAlign: "center" }}>
          {currentStep.imageUrl && (
            <img 
              src={currentStep.imageUrl} 
              alt={currentStep.imageAlt} 
              style={{ width: "100%", maxHeight: "200px", objectFit: "contain", marginBottom: "20px", borderRadius: "8px" }} 
            />
          )}
          <h3>{currentStep.title}</h3>
          <p style={{ color: "#666", lineHeight: 1.6 }}>{currentStep.description}</p>
        </div>

        <div style={{ padding: "20px", display: "flex", justifyContent: "flex-end", gap: "10px", background: "rgba(255,255,255,0.5)" }}>
          {userState.stepIndex > 0 && (
            <button onClick={() => setUserState(prev => ({ ...prev, stepIndex: prev.stepIndex - 1 }))}>
              Back
            </button>
          )}
          <button 
            style={styles.buttonPrimary}
            onClick={() => {
              if (userState.stepIndex < config.steps.length - 1) {
                setUserState(prev => ({ ...prev, stepIndex: prev.stepIndex + 1 }));
              } else {
                onClose();
              }
            }}
          >
            {userState.stepIndex < config.steps.length - 1 ? currentStep.primaryLabel : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  );
};

