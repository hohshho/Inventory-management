"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type HistoryEntry } from "@/lib/api";

export function useHistoryQuery() {
  return useQuery({
    queryKey: ["history"],
    queryFn: () => apiGet<HistoryEntry[]>("/history"),
  });
}
