"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type LowStockAlert } from "@/lib/api";

export function useLowStockAlerts(enabled = true) {
  return useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: () => apiGet<LowStockAlert[]>("/alerts/low-stock"),
    enabled,
  });
}
