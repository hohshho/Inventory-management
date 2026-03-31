"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type DashboardSummary } from "@/lib/api";

export function useOperationsDigest() {
  return useQuery({
    queryKey: ["operations-digest"],
    queryFn: () => apiGet<DashboardSummary>("/dashboard/summary"),
  });
}
