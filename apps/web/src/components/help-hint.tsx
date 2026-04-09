"use client";

import { useEffect, useState } from "react";

type HelpHintProps = {
  description: string;
  label?: string;
};

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.4a2.8 2.8 0 1 1 4.8 1.9c-.7.7-1.5 1.2-1.8 2.2" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function HelpHint({ description, label = "도움말" }: HelpHintProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1100px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  return (
    <>
      <button
        className="help-hint"
        data-tooltip={!isMobileViewport ? description : undefined}
        aria-label={label}
        onClick={() => {
          if (isMobileViewport) {
            setMobileOpen(true);
          }
        }}
        type="button"
      >
        <HelpIcon />
      </button>

      {mobileOpen ? (
        <div className="help-modal-backdrop" onClick={() => setMobileOpen(false)}>
          <div
            className="help-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={label}
          >
            <div className="help-modal-head">
              <strong>{label}</strong>
              <button className="utility-button" onClick={() => setMobileOpen(false)} type="button">
                ×
              </button>
            </div>
            <p>{description}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
