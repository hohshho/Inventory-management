"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type HistoryEntry } from "@/lib/api";

export function useLedgerFeed(enabled = true) {
  return useQuery({
    queryKey: ["ledger-feed"],
    queryFn: () => apiGet<HistoryEntry[]>("/history"),
    enabled,
  });
}
