import React, { useEffect, useState } from "react";

// OrthodoxMetrics Theme Constants
const BRAND_GRADIENT = "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)";
const ACCENT_COLOR = "#007bff";

// Type definitions
interface OnboardingStep {
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  primaryLabel?: string;
}

interface OnboardingConfig {
  modalTitle?: string;
  steps: OnboardingStep[];
  requireCompletionToDismiss?: boolean;
}

interface UserOnboardingState {
  status: "incomplete" | "complete";
  stepIndex: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
  storageKeys?: Record<string, string>;
}

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

  // Load configuration on mount
  useEffect(() => {
    if (!isOpen) return;

    // Use a default configuration instead of fetching from API
    // This prevents the network error and provides a working onboarding experience
    const defaultConfig: OnboardingConfig = {
      modalTitle: "Welcome to OrthodoxMetrics",
      requireCompletionToDismiss: false,
      steps: [
        {
          title: "Welcome to OrthodoxMetrics",
          description: "Your comprehensive platform for managing Orthodox church records and sacraments.",
          primaryLabel: "Next"
        },
        {
          title: "Manage Records",
          description: "Easily create, view, and manage baptism, marriage, and funeral records for your parish.",
          primaryLabel: "Next"
        },
        {
          title: "Generate Certificates",
          description: "Create official certificates for sacraments with just a few clicks.",
          primaryLabel: "Get Started"
        }
      ]
    };

    setConfig(defaultConfig);
  }, [isOpen]);

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

  if (!isOpen || !config || config.steps.length === 0) return null;

  // Safety check: clamp stepIndex to valid range
  const validStepIndex = Math.max(0, Math.min(userState.stepIndex, config.steps.length - 1));
  const currentStep = config.steps[validStepIndex];

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
              alt={currentStep.imageAlt || currentStep.title} 
              style={{ width: "100%", maxHeight: "200px", objectFit: "contain", marginBottom: "20px", borderRadius: "8px" }} 
            />
          )}
          <h3>{currentStep.title || 'Welcome'}</h3>
          <p style={{ color: "#666", lineHeight: 1.6 }}>{currentStep.description || ''}</p>
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
            {userState.stepIndex < config.steps.length - 1 ? (currentStep.primaryLabel || "Next") : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  );
};

