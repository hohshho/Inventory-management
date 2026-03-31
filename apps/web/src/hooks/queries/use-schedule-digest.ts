"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type PlannerSummary } from "@/lib/api";

export function useScheduleDigest(month: string) {
  return useQuery({
    queryKey: ["schedule-digest", month],
    queryFn: () => apiGet<PlannerSummary>(`/planner/summary?month=${month}`),
  });
}
