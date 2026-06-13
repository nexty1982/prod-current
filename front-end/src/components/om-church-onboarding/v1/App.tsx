import { useState } from "react";
import { Link } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/publicRoutes";
import { Landing } from "./components/views/Landing";
import { Onboarding } from "./components/views/Onboarding";
import "./styles/theme.css";

type View = "landing" | "onboarding" | "complete";

export default function App() {
  const [view, setView] = useState<View>("landing");

  return (
    <div className="om-cornerstone-scope flex flex-col flex-1 w-full">
      {view === "landing" && (
        <div className="flex-1 flex flex-col min-h-0">
          <Landing onStart={() => setView("onboarding")} />
        </div>
      )}

      {view === "onboarding" && (
        <div className="flex-1 flex flex-col min-h-0">
          <Onboarding
            onCancel={() => setView("landing")}
            onComplete={() => setView("complete")}
          />
        </div>
      )}

      {view === "complete" && (
        <div className="flex-1 flex items-center justify-center om-section-base px-6 py-16">
          <div className="max-w-xl text-center space-y-6 om-public-panel p-10">
            <h1 className="font-om-display text-3xl text-[var(--om-text-primary)]">
              Thank you — your enrollment request is in.
            </h1>
            <p className="font-om-body text-[16px] text-[var(--om-text-secondary)] leading-relaxed">
              Orthodox Metrics staff will review your submission and reach out
              within one business day to schedule onboarding.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={PUBLIC_ROUTES.HOME}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-[var(--om-gold)] hover:bg-[var(--om-gold-hover)] text-[var(--om-text-primary)] font-om-body font-medium no-underline transition-colors"
              >
                Back to homepage
              </Link>
              <Link
                to={PUBLIC_ROUTES.CONTACT}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-[var(--om-border)] text-[var(--om-text-primary)] font-om-body font-medium no-underline hover:bg-[var(--om-input-bg)] transition-colors"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
