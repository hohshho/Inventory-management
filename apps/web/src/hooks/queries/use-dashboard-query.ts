"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type DashboardSummary } from "@/lib/api";

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet<DashboardSummary>("/dashboard/summary"),
  });
}
