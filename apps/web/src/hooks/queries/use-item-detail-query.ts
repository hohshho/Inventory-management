"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type ItemDetail } from "@/lib/api";

export function useItemDetailQuery(itemId: string) {
  return useQuery({
    queryKey: ["item-detail", itemId],
    queryFn: () => apiGet<ItemDetail>(`/items/${itemId}`),
    enabled: Boolean(itemId),
  });
}
