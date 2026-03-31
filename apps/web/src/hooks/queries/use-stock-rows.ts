"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type InventoryItem } from "@/lib/api";

type StockBrowseParams = {
  keyword: string;
  zoneId: string;
};

export function useStockRows({ keyword, zoneId }: StockBrowseParams) {
  const queryParams = new URLSearchParams();

  if (keyword) {
    queryParams.set("search", keyword);
  }

  if (zoneId && zoneId !== "all") {
    queryParams.set("locationId", zoneId);
  }

  return useQuery({
    queryKey: ["stock-rows", keyword, zoneId],
    queryFn: () => apiGet<InventoryItem[]>(`/inventories?${queryParams.toString()}`),
  });
}
