"use client";

import { useEffect } from "react";

export function useAutoClearingText(text: string, setText: (nextValue: string) => void, delayMs = 5000) {
  useEffect(() => {
    if (!text) {
      return;
    }

    const timer = window.setTimeout(() => {
      setText("");
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, setText, text]);
}
