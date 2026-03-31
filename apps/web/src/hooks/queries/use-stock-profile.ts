"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type ItemDetail } from "@/lib/api";

export function useStockProfile(itemId: string) {
  return useQuery({
    queryKey: ["stock-profile", itemId],
    queryFn: () => apiGet<ItemDetail>(`/items/${itemId}`),
    enabled: Boolean(itemId),
  });
}
