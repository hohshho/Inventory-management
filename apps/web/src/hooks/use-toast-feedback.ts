"use client";

import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

export function useToastFeedback(successText: string, errorText: string) {
  const lastSuccessTextRef = useRef("");
  const lastErrorTextRef = useRef("");

  useEffect(() => {
    if (!successText) {
      lastSuccessTextRef.current = "";
      return;
    }

    if (lastSuccessTextRef.current === successText) {
      return;
    }

    lastSuccessTextRef.current = successText;
    toast.success(successText);
  }, [successText]);

  useEffect(() => {
    if (!errorText) {
      lastErrorTextRef.current = "";
      return;
    }

    if (lastErrorTextRef.current === errorText) {
      return;
    }

    lastErrorTextRef.current = errorText;
    toast.error(errorText);
  }, [errorText]);
}
